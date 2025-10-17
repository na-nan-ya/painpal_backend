---
timestamp: 'Fri Oct 17 2025 18:42:11 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_184211.082a0269.md]]'
content_id: 89579a23455b037bfa3647af2da8756d0df750901d3fc5d7e8c2941383af9c76
---

# response:

To test the `BodyMapGenerationConcept` implementation based on the provided instructions, we'll create a Deno test file using the `bdd` style, connect to a MongoDB test database, and clean up after each test. We will strictly adhere to the import guidelines, using `ObjectId` from `npm:mongodb` for test ID generation and importing `freshID`, `Empty`, and `ID` from the `utils` directory as implied by the `LikertSurveyTesting-Example`'s pattern for utility imports.

Here's the Deno test file:

**`src/concepts/BodyMapGeneration/BodyMapGeneration.test.ts`**

```typescript
import {
  assert,
  assertEquals,
  assertExists,
  assertNotEquals,
  assertObjectMatch,
  assertStringIncludes,
  assertThrowsAsync,
} from "https://deno.land/std@0.210.0/assert/mod.ts";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  it,
} from "https://deno.land/std@0.210.0/testing/bdd.ts";
import { MongoClient, Db, Collection, ObjectId } from "npm:mongodb"; // ObjectId is part of mongodb package
import { freshID } from "../../utils/database.ts"; // Concept uses this, assuming path resolution for @utils
import { Empty, ID } from "../../utils/types.ts"; // Concept uses these types, assuming path resolution for @utils

import BodyMapGenerationConcept from "./BodyMapGeneration.ts";

// Global variables for the test suite
let client: MongoClient;
let db: Db;
let concept: BodyMapGenerationConcept;

const DB_NAME = "test-body-map-generation";
const MONGO_URI = "mongodb://localhost:27017";

describe("BodyMapGenerationConcept", () => {
  beforeAll(async () => {
    client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db(DB_NAME);
    concept = new BodyMapGenerationConcept(db);
  });

  afterEach(async () => {
    // Clean up collections after each test
    await concept.users.deleteMany({});
    await concept.maps.deleteMany({});
    await concept.dailyGenerationStatus.deleteMany({});
  });

  afterAll(async () => {
    // Clean up the database itself after all tests are done
    await db.dropDatabase();
    await client.close();
  });

  it("should initialize collections with the correct prefix", () => {
    assertEquals(concept.users.collectionName, "BodyMapGeneration.users");
    assertEquals(concept.maps.collectionName, "BodyMapGeneration.maps");
    assertEquals(
      concept.dailyGenerationStatus.collectionName,
      "BodyMapGeneration.system",
    );
  });

  describe("generateMap", () => {
    it("should create a new user and map if user does not exist", async () => {
      const userId = freshID();
      const result = await concept.generateMap({ user: userId });

      assertExists(result);
      assert("mapId" in result);

      const mapId = result.mapId;
      assertExists(mapId);

      const userState = await concept.users.findOne({ _id: userId });
      assertExists(userState);
      assertEquals(userState._id, userId);
      assertEquals(userState.currentMapId, mapId);

      const mapState = await concept.maps.findOne({ _id: mapId });
      assertExists(mapState);
      assertEquals(mapState._id, mapId);
      assertEquals(mapState.ownerId, userId);
      assertEquals(mapState.isSaved, false);
      assertExists(mapState.creationDate);
      assertEquals(mapState.imageUrl, "default_map_image.png");
    });

    it("should create a new map and mark previous as saved for existing user", async () => {
      const userId = freshID();

      // First generation
      const result1 = await concept.generateMap({ user: userId });
      assert("mapId" in result1);
      const firstMapId = result1.mapId;

      let firstMapState = await concept.maps.findOne({ _id: firstMapId });
      assertExists(firstMapState);
      assertEquals(firstMapState.isSaved, false);

      // Second generation
      const result2 = await concept.generateMap({ user: userId });
      assert("mapId" in result2);
      const secondMapId = result2.mapId;

      assertNotEquals(firstMapId, secondMapId); // Ensure a new map was created

      const userState = await concept.users.findOne({ _id: userId });
      assertExists(userState);
      assertEquals(userState.currentMapId, secondMapId); // User points to the new map

      const updatedFirstMapState = await concept.maps.findOne({
        _id: firstMapId,
      });
      assertExists(updatedFirstMapState);
      assertEquals(updatedFirstMapState.isSaved, true); // Old map should be saved

      const secondMapState = await concept.maps.findOne({ _id: secondMapId });
      assertExists(secondMapState);
      assertEquals(secondMapState.ownerId, userId);
      assertEquals(secondMapState.isSaved, false); // New map should be unsaved
    });
  });

  describe("saveMap", () => {
    it("should mark the current map as saved", async () => {
      const userId = freshID();
      const genResult = await concept.generateMap({ user: userId });
      assert("mapId" in genResult);
      const mapId = genResult.mapId;

      let mapState = await concept.maps.findOne({ _id: mapId });
      assertExists(mapState);
      assertEquals(mapState.isSaved, false);

      const saveResult = await concept.saveMap({ user: userId });
      assert("error" in saveResult === false); // Ensure no error

      mapState = await concept.maps.findOne({ _id: mapId });
      assertExists(mapState);
      assertEquals(mapState.isSaved, true);
    });

    it("should return an error if user has no current map", async () => {
      const userId = freshID();
      // User exists but without a current map
      await concept.users.insertOne({ _id: userId, currentMapId: null });

      const result = await concept.saveMap({ user: userId });
      assert("error" in result);
      assertStringIncludes(result.error, "does not have a current map to save");

      // Non-existent user
      const nonExistentUser = freshID();
      const result2 = await concept.saveMap({ user: nonExistentUser });
      assert("error" in result2);
      assertStringIncludes(
        result2.error,
        "does not have a current map to save",
      );
    });

    it("should not change currentMapId of user", async () => {
      const userId = freshID();
      const genResult = await concept.generateMap({ user: userId });
      assert("mapId" in genResult);
      const mapId = genResult.mapId;

      await concept.saveMap({ user: userId });

      const userState = await concept.users.findOne({ _id: userId });
      assertExists(userState);
      assertEquals(userState.currentMapId, mapId); // currentMapId should remain the same
    });
  });

  describe("clearMap", () => {
    it("should delete the current map and set currentMapId to null", async () => {
      const userId = freshID();
      const genResult = await concept.generateMap({ user: userId });
      assert("mapId" in genResult);
      const mapId = genResult.mapId;

      let mapState = await concept.maps.findOne({ _id: mapId });
      assertExists(mapState);

      let userState = await concept.users.findOne({ _id: userId });
      assertExists(userState);
      assertEquals(userState.currentMapId, mapId);

      const clearResult = await concept.clearMap({ user: userId });
      assert("error" in clearResult === false); // Ensure no error

      mapState = await concept.maps.findOne({ _id: mapId });
      assertEquals(mapState, null); // Map should be deleted

      userState = await concept.users.findOne({ _id: userId });
      assertExists(userState);
      assertEquals(userState.currentMapId, null); // currentMapId should be null
    });

    it("should return an error if user has no current map", async () => {
      const userId = freshID();
      // User exists but without a current map
      await concept.users.insertOne({ _id: userId, currentMapId: null });

      const result = await concept.clearMap({ user: userId });
      assert("error" in result);
      assertStringIncludes(result.error, "does not have a current map to clear");

      // Non-existent user
      const nonExistentUser = freshID();
      const result2 = await concept.clearMap({ user: nonExistentUser });
      assert("error" in result2);
      assertStringIncludes(
        result2.error,
        "does not have a current map to clear",
      );
    });
  });

  describe("triggerDailyMapGeneration", () => {
    it("should generate new maps for all existing users and save previous ones on first run", async () => {
      const user1 = freshID();
      const user2 = freshID();
      const user3 = freshID(); // This user will not be inserted into `users` collection

      // User1: has a current map
      const genResult1 = await concept.generateMap({ user: user1 });
      assert("mapId" in genResult1);
      const user1_map1 = genResult1.mapId;

      // User2: has no current map (just create the user record)
      await concept.users.insertOne({ _id: user2, currentMapId: null });

      // Ensure initial states
      let map1_state = await concept.maps.findOne({ _id: user1_map1 });
      assertExists(map1_state);
      assertEquals(map1_state.isSaved, false);

      let user1State = await concept.users.findOne({ _id: user1 });
      assertExists(user1State);
      assertEquals(user1State.currentMapId, user1_map1);

      let user2State = await concept.users.findOne({ _id: user2 });
      assertExists(user2State);
      assertEquals(user2State.currentMapId, null);

      // Trigger daily generation
      const triggerResult = await concept.triggerDailyMapGeneration();
      assert("error" in triggerResult === false); // Ensure no error

      // Verify dailyGenerationStatus
      const status = await concept.dailyGenerationStatus.findOne({
        _id: "dailyGeneration",
      });
      assertExists(status);
      assertExists(status.lastRunDate);
      const todayMidnight = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        new Date().getDate(),
      );
      assertEquals(
        new Date(status.lastRunDate).toDateString(),
        todayMidnight.toDateString(),
      );

      // Verify User1 state
      user1State = await concept.users.findOne({ _id: user1 });
      assertExists(user1State);
      assertNotEquals(user1State.currentMapId, user1_map1); // Should have a new map
      const user1_map2 = user1State.currentMapId;

      map1_state = await concept.maps.findOne({ _id: user1_map1 });
      assertExists(map1_state);
      assertEquals(map1_state.isSaved, true); // Old map is saved

      const map2_state = await concept.maps.findOne({ _id: user1_map2 });
      assertExists(map2_state);
      assertEquals(map2_state.ownerId, user1);
      assertEquals(map2_state.isSaved, false); // New map is unsaved

      // Verify User2 state
      user2State = await concept.users.findOne({ _id: user2 });
      assertExists(user2State);
      assertExists(user2State.currentMapId); // Should now have a current map
      const user2_map1 = user2State.currentMapId;

      const map3_state = await concept.maps.findOne({ _id: user2_map1 });
      assertExists(map3_state);
      assertEquals(map3_state.ownerId, user2);
      assertEquals(map3_state.isSaved, false); // New map is unsaved

      // User3 (non-existent in `users` collection) should NOT have a map generated.
      const user3State = await concept.users.findOne({ _id: user3 });
      assertEquals(user3State, null); // User3 should not be created.

      const allMaps = await concept.maps.find({}).toArray();
      assertEquals(allMaps.length, 3); // user1_map1 (saved), user1_map2 (current), user2_map1 (current)
    });

    it("should return an error if run twice on the same day", async () => {
      const user = freshID();
      await concept.users.insertOne({ _id: user, currentMapId: null });

      const result1 = await concept.triggerDailyMapGeneration();
      assert("error" in result1 === false);

      const result2 = await concept.triggerDailyMapGeneration();
      assert("error" in result2);
      assertStringIncludes(
        result2.error,
        "Daily map generation has already run for today",
      );
    });

    it("should run successfully on a new day (simulated)", async () => {
      const user = freshID();
      await concept.generateMap({ user: user }); // User has a map

      // First run
      const result1 = await concept.triggerDailyMapGeneration();
      assert("error" in result1 === false);

      const firstStatus = await concept.dailyGenerationStatus.findOne({
        _id: "dailyGeneration",
      });
      assertExists(firstStatus);
      const firstRunDate = new Date(firstStatus.lastRunDate);

      // Simulate a new day by manually updating lastRunDate to yesterday
      const yesterday = new Date(firstRunDate);
      yesterday.setDate(firstRunDate.getDate() - 1); // Set to previous day
      await concept.dailyGenerationStatus.updateOne(
        { _id: "dailyGeneration" },
        { $set: { lastRunDate: yesterday } },
      );

      // Second run (should succeed)
      const result2 = await concept.triggerDailyMapGeneration();
      assert("error" in result2 === false);

      const secondStatus = await concept.dailyGenerationStatus.findOne({
        _id: "dailyGeneration",
      });
      assertExists(secondStatus);
      const secondRunDate = new Date(secondStatus.lastRunDate);

      assertNotEquals(firstRunDate.toDateString(), secondRunDate.toDateString());
      assertEquals(secondRunDate.toDateString(), new Date().toDateString());

      // Verify maps for the user
      const userMaps = await concept.maps.find({ ownerId: user }).toArray();
      // Should have 3 maps now: original (saved), first run's new map (saved), second run's new map (current)
      assertEquals(userMaps.length, 3);
      assertEquals(userMaps.filter((m) => m.isSaved === true).length, 2);
      assertEquals(userMaps.filter((m) => m.isSaved === false).length, 1);

      const userState = await concept.users.findOne({ _id: user });
      assertExists(userState);
      const currentMap = userMaps.find((m) => m._id === userState.currentMapId);
      assertExists(currentMap);
      assertEquals(currentMap.isSaved, false);
    });

    it("should handle users with no maps correctly", async () => {
      const user = freshID();
      await concept.users.insertOne({ _id: user, currentMapId: null }); // User exists, no map

      const triggerResult = await concept.triggerDailyMapGeneration();
      assert("error" in triggerResult === false);

      const userState = await concept.users.findOne({ _id: user });
      assertExists(userState);
      assertExists(userState.currentMapId); // Should now have a map

      const currentMap = await concept.maps.findOne({
        _id: userState.currentMapId,
      });
      assertExists(currentMap);
      assertEquals(currentMap.ownerId, user);
      assertEquals(currentMap.isSaved, false);
    });

    it("should succeed even if no users exist", async () => {
      // Ensure no users are in the collection
      const userCount = await concept.users.countDocuments({});
      assertEquals(userCount, 0);

      const triggerResult = await concept.triggerDailyMapGeneration();
      assert("error" in triggerResult === false);

      const status = await concept.dailyGenerationStatus.findOne({
        _id: "dailyGeneration",
      });
      assertExists(status);
      assertExists(status.lastRunDate);
    });
  });

  describe("Query Methods", () => {
    describe("_getCurrentMap", () => {
      it("should return the current map for a user with one", async () => {
        const userId = freshID();
        const genResult = await concept.generateMap({ user: userId });
        assert("mapId" in genResult);
        const mapId = genResult.mapId;

        const queryResult = await concept._getCurrentMap({ user: userId });
        assert("map" in queryResult);
        assertExists(queryResult.map);
        assertEquals(queryResult.map._id, mapId);
        assertEquals(queryResult.map.isSaved, false);
      });

      it("should return null for a user without a current map", async () => {
        const userId = freshID();
        await concept.users.insertOne({ _id: userId, currentMapId: null });

        const queryResult = await concept._getCurrentMap({ user: userId });
        assert("map" in queryResult);
        assertEquals(queryResult.map, null);
      });

      it("should return null for a non-existent user", async () => {
        const userId = freshID();
        const queryResult = await concept._getCurrentMap({ user: userId });
        assert("map" in queryResult);
        assertEquals(queryResult.map, null);
      });
    });

    describe("_getSavedMaps", () => {
      it("should return an array of saved maps for a user", async () => {
        const userId = freshID();

        // 1. Generate first map (mapA)
        const gen1 = await concept.generateMap({ user: userId });
        assert("mapId" in gen1);
        const mapAId = gen1.mapId; // Current map, isSaved: false

        // 2. Generate second map (mapB). mapA should now be saved.
        const gen2 = await concept.generateMap({ user: userId });
        assert("mapId" in gen2);
        const mapBId = gen2.mapId; // Current map, isSaved: false

        // Check mapA state: should be saved
        const mapAState = await concept.maps.findOne({ _id: mapAId });
        assertExists(mapAState);
        assertEquals(mapAState.isSaved, true);

        // Check mapB state: should be unsaved
        const mapBState = await concept.maps.findOne({ _id: mapBId });
        assertExists(mapBState);
        assertEquals(mapBState.isSaved, false);

        // Check user state: currentMapId should point to mapB
        const userState = await concept.users.findOne({ _id: userId });
        assertExists(userState);
        assertEquals(userState.currentMapId, mapBId);

        // Query for saved maps
        const queryResultSaved = await concept._getSavedMaps({
          user: userId,
        });
        assert("maps" in queryResultSaved);
        assertEquals(queryResultSaved.maps.length, 1);
        assertEquals(queryResultSaved.maps[0]._id, mapAId);
        assertEquals(queryResultSaved.maps[0].isSaved, true);
      });

      it("should return an empty array if user has no saved maps", async () => {
        const userId = freshID();
        // User has a current, unsaved map
        await concept.generateMap({ user: userId });

        const queryResult = await concept._getSavedMaps({ user: userId });
        assert("maps" in queryResult);
        assertEquals(queryResult.maps.length, 0);
      });

      it("should return an empty array for a non-existent user", async () => {
        const userId = freshID();
        const queryResult = await concept._getSavedMaps({ user: userId });
        assert("maps" in queryResult);
        assertEquals(queryResult.maps.length, 0);
      });
    });
  });
});
```

To run this test:

1. **Ensure MongoDB is running** on `mongodb://localhost:27017`.
2. **Save the test file** as `src/concepts/BodyMapGeneration/BodyMapGeneration.test.ts`.
3. **Ensure the utility files exist** at `src/utils/database.ts` and `src/utils/types.ts` as referenced by the relative imports. If not, you might need to adjust paths or create placeholder files that export `freshID`, `Empty`, and `ID`.
4. **Run the test** from your project root using Deno:

   ```bash
   deno test --allow-net --allow-env --import-map=./import_map.json src/concepts/BodyMapGeneration/BodyMapGeneration.test.ts
   ```

   (Note: `--import-map=./import_map.json` is typically needed if you have `@utils` mappings in your `import_map.json`. If your Deno setup uses direct relative paths without an import map for `utils`, you might not need that flag or the relative paths need to be adjusted.)

This test suite covers the primary functionalities (`generateMap`, `saveMap`, `clearMap`, `triggerDailyMapGeneration`) and the internal query helpers, including success paths, precondition failures, and state changes as described in the concept's documentation.
