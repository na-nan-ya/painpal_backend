---
timestamp: 'Fri Oct 17 2025 13:38:34 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_133834.f8d23760.md]]'
content_id: 42d14869e9ad8642a3d6c786220e29d9662bd6361f11fcf5de8f260209f521c7
---

# response:

To test the `BodyMapGenerationConcept` implementation with Deno, we'll create a test file that connects to a MongoDB instance, uses Deno's built-in testing utilities, and follows the principles of good concept testing. This includes setting up and tearing down the database state for each test, asserting preconditions and postconditions for each method, and covering various scenarios (e.g., first-time use, repeated actions, error conditions).

We'll simulate the structure and thoroughness of a typical test file, similar to how a `LikertSurvey` test example might be structured.

### Prerequisites:

1. **Deno**: Ensure Deno is installed on your system.
2. **MongoDB Instance**: You need a running MongoDB instance, accessible at `mongodb://localhost:27017` (or modify the connection string in the test file).
3. **Project Structure**: Assume your project structure looks something like this:

   ```
   .
   ├── src
   │   └── concepts
   │       └── BodyMapGeneration
   │           └── BodyMapGeneration.ts
   │   └── utils
   │       ├── database.ts
   │       └── types.ts
   └── test
       └── concepts
           └── BodyMapGeneration
               └── BodyMapGeneration.test.ts
   ```

   Where `src/utils/database.ts` exports `freshID` and `src/utils/types.ts` exports `ID` and `Empty`.

### `src/utils/database.ts` (Example for `freshID`)

If you don't have this, here's a minimal example:

```typescript
// src/utils/database.ts
import { ObjectId } from "npm:mongodb";

export type ID = string; // Using string as ID for simplicity, ObjectId compatible

export function freshID(): ID {
  return new ObjectId().toHexString();
}
```

### `src/utils/types.ts` (Example for `Empty` and `ID`)

If you don't have this, here's a minimal example:

```typescript
// src/utils/types.ts
export type Empty = Record<string, never>; // Represents an empty object {}
export type ID = string; // Example, could be ObjectId, string, number depending on context
```

***

### `test/concepts/BodyMapGeneration/BodyMapGeneration.test.ts`

```typescript
import {
  assert,
  assertEquals,
  assertExists,
  assertNotEquals,
  assertArrayIncludes,
} from "https://deno.land/std@0.210.0/assert/mod.ts";
import {
  beforeEach,
  afterEach,
  describe,
  it,
} from "https://deno.land/std@0.210.0/testing/bdd.ts";
import { MongoClient, Db } from "npm:mongodb";
import BodyMapGenerationConcept from "../../../src/concepts/BodyMapGeneration/BodyMapGeneration.ts"; // Adjust path as needed
import { freshID } from "../../../src/utils/database.ts"; // Import freshID

// MongoDB client and database instance for the entire test suite
let client: MongoClient;
let db: Db;
let concept: BodyMapGenerationConcept;

const TEST_DB_NAME = "test_bodymap_generation_db";
const COLLECTION_PREFIX = "BodyMapGeneration."; // Matches the PREFIX in the concept file

// Helper function to clear all concept-related collections
async function clearConceptCollections(database: Db) {
  await database.collection(COLLECTION_PREFIX + "users").deleteMany({});
  await database.collection(COLLECTION_PREFIX + "maps").deleteMany({});
  await database.collection(COLLECTION_PREFIX + "system").deleteMany({});
}

// Custom beforeAll/afterAll for Deno's BDD style, as it's not built-in
function beforeAll(fn: () => Promise<void>) {
  let executed = false;
  beforeEach(async () => {
    if (!executed) {
      await fn();
      executed = true;
    }
  });
}

function afterAll(fn: () => Promise<void>) {
  let executed = false;
  afterEach(async () => {
    if (!executed) {
      await fn();
      executed = true;
    }
  });
}

describe("BodyMapGenerationConcept", () => {
  // Connect to MongoDB once before all tests
  beforeAll(async () => {
    client = new MongoClient("mongodb://localhost:27017");
    await client.connect();
    db = client.db(TEST_DB_NAME);
  });

  // Close MongoDB connection once after all tests
  afterAll(async () => {
    await client.close();
  });

  // Clear collections and re-instantiate concept before each test
  beforeEach(async () => {
    await clearConceptCollections(db);
    concept = new BodyMapGenerationConcept(db);
  });

  it("should initialize collections with correct names", () => {
    assertExists(concept.users);
    assertExists(concept.maps);
    assertExists(concept.dailyGenerationStatus);
    assertEquals(concept.users.collectionName, COLLECTION_PREFIX + "users");
    assertEquals(concept.maps.collectionName, COLLECTION_PREFIX + "maps");
    assertEquals(
      concept.dailyGenerationStatus.collectionName,
      COLLECTION_PREFIX + "system",
    );
  });

  describe("generateMap", () => {
    it("should create a new user and map if user does not exist", async () => {
      const userId = freshID();
      const result = await concept.generateMap({ user: userId });

      assertExists(result);
      assert("mapId" in result); // Check for success
      const mapId = result.mapId;
      assertExists(mapId);

      // Verify user state
      const userState = await concept.users.findOne({ _id: userId });
      assertExists(userState);
      assertEquals(userState.currentMapId, mapId);

      // Verify map state
      const mapState = await concept.maps.findOne({ _id: mapId });
      assertExists(mapState);
      assertEquals(mapState._id, mapId);
      assertEquals(mapState.ownerId, userId);
      assertEquals(mapState.isSaved, false); // New map should not be saved
      assertEquals(mapState.imageUrl, "default_map_image.png");
      assert(mapState.creationDate instanceof Date);
    });

    it("should save the previous map and generate a new one for an existing user", async () => {
      const userId = freshID();

      // First generation
      const firstGenResult = await concept.generateMap({ user: userId });
      assert("mapId" in firstGenResult);
      const firstMapId = firstGenResult.mapId;
      let firstMapState = await concept.maps.findOne({ _id: firstMapId });
      assertEquals(firstMapState?.isSaved, false);

      // Second generation
      const secondGenResult = await concept.generateMap({ user: userId });
      assert("mapId" in secondGenResult);
      const secondMapId = secondGenResult.mapId;

      assertNotEquals(firstMapId, secondMapId); // Should be a new map ID

      // Verify user state points to the new map
      const userState = await concept.users.findOne({ _id: userId });
      assertExists(userState);
      assertEquals(userState.currentMapId, secondMapId);

      // Verify the first map is now saved
      firstMapState = await concept.maps.findOne({ _id: firstMapId });
      assertEquals(firstMapState?.isSaved, true);

      // Verify the second map is not saved
      const secondMapState = await concept.maps.findOne({ _id: secondMapId });
      assertEquals(secondMapState?.isSaved, false);
      assertEquals(secondMapState?.ownerId, userId);
    });
  });

  describe("saveMap", () => {
    it("should set isSaved to true for the user's current map", async () => {
      const userId = freshID();
      const genResult = await concept.generateMap({ user: userId });
      assert("mapId" in genResult);
      const mapId = genResult.mapId;

      let mapState = await concept.maps.findOne({ _id: mapId });
      assertEquals(mapState?.isSaved, false);

      const saveResult = await concept.saveMap({ user: userId });
      assert(!("error" in saveResult)); // Check for success

      mapState = await concept.maps.findOne({ _id: mapId });
      assertEquals(mapState?.isSaved, true);

      // Ensure user's currentMapId remains unchanged
      const userState = await concept.users.findOne({ _id: userId });
      assertEquals(userState?.currentMapId, mapId);
    });

    it("should return an error if the user has no current map", async () => {
      const userId = freshID(); // User without any maps
      const saveResult = await concept.saveMap({ user: userId });
      assert("error" in saveResult);
      assertEquals(
        saveResult.error,
        `User ${userId} does not have a current map to save.`,
      );
    });

    it("should return an error if user exists but currentMapId is null", async () => {
      const userId = freshID();
      await concept.users.insertOne({ _id: userId, currentMapId: null });

      const saveResult = await concept.saveMap({ user: userId });
      assert("error" in saveResult);
      assertEquals(
        saveResult.error,
        `User ${userId} does not have a current map to save.`,
      );
    });
  });

  describe("clearMap", () => {
    it("should delete the current map and set user's currentMapId to null", async () => {
      const userId = freshID();
      const genResult = await concept.generateMap({ user: userId });
      assert("mapId" in genResult);
      const mapId = genResult.mapId;

      // Verify map and user state before clearing
      assertExists(await concept.maps.findOne({ _id: mapId }));
      const userStateBefore = await concept.users.findOne({ _id: userId });
      assertEquals(userStateBefore?.currentMapId, mapId);

      const clearResult = await concept.clearMap({ user: userId });
      assert(!("error" in clearResult)); // Check for success

      // Verify map is deleted
      assertEquals(await concept.maps.findOne({ _id: mapId }), null);

      // Verify user's currentMapId is null
      const userStateAfter = await concept.users.findOne({ _id: userId });
      assertEquals(userStateAfter?.currentMapId, null);
    });

    it("should return an error if the user has no current map to clear", async () => {
      const userId = freshID(); // User without any maps
      const clearResult = await concept.clearMap({ user: userId });
      assert("error" in clearResult);
      assertEquals(
        clearResult.error,
        `User ${userId} does not have a current map to clear.`,
      );
    });

    it("should return an error if user exists but currentMapId is null", async () => {
      const userId = freshID();
      await concept.users.insertOne({ _id: userId, currentMapId: null });

      const clearResult = await concept.clearMap({ user: userId });
      assert("error" in clearResult);
      assertEquals(
        clearResult.error,
        `User ${userId} does not have a current map to clear.`,
      );
    });
  });

  describe("_getCurrentMap", () => {
    it("should return the current map for a user", async () => {
      const userId = freshID();
      const genResult = await concept.generateMap({ user: userId });
      assert("mapId" in genResult);
      const mapId = genResult.mapId;

      const currentMapResult = await concept._getCurrentMap({ user: userId });
      assert("map" in currentMapResult);
      assertExists(currentMapResult.map);
      assertEquals(currentMapResult.map._id, mapId);
      assertEquals(currentMapResult.map.ownerId, userId);
      assertEquals(currentMapResult.map.isSaved, false);
    });

    it("should return null if user has no current map", async () => {
      const userId = freshID();
      const currentMapResult = await concept._getCurrentMap({ user: userId });
      assert("map" in currentMapResult);
      assertEquals(currentMapResult.map, null);
    });
  });

  describe("_getSavedMaps", () => {
    it("should return an empty array if no saved maps exist for a user", async () => {
      const userId = freshID();
      // Generate a map but don't save it
      await concept.generateMap({ user: userId });

      const savedMapsResult = await concept._getSavedMaps({ user: userId });
      assert("maps" in savedMapsResult);
      assertEquals(savedMapsResult.maps.length, 0);
    });

    it("should return all saved maps for a user and not the current one", async () => {
      const userId = freshID();
      const mapIds = [];

      // Generate and save first map
      const gen1 = await concept.generateMap({ user: userId });
      assert("mapId" in gen1);
      mapIds.push(gen1.mapId);
      await concept.saveMap({ user: userId });

      // Generate and save second map
      const gen2 = await concept.generateMap({ user: userId });
      assert("mapId" in gen2);
      mapIds.push(gen2.mapId);
      await concept.saveMap({ user: userId });

      // Generate third map, which remains current (not saved)
      const gen3 = await concept.generateMap({ user: userId });
      assert("mapId" in gen3);
      const currentMapId = gen3.mapId;

      const savedMapsResult = await concept._getSavedMaps({ user: userId });
      assert("maps" in savedMapsResult);
      assertEquals(savedMapsResult.maps.length, 2);

      const savedMapIds = savedMapsResult.maps.map((m) => m._id);
      assertArrayIncludes(savedMapIds, [mapIds[0], mapIds[1]]);
      assert(!savedMapIds.includes(currentMapId)); // Current map should not be returned as 'saved'
    });
  });

  describe("triggerDailyMapGeneration", () => {
    let originalDate: Date; // To restore Date if we mocked it, or just for reference.

    beforeEach(() => {
      originalDate = new Date();
    });

    it("should run for the first time and generate maps for all users, saving existing ones", async () => {
      const user1 = freshID();
      const user2 = freshID();

      // Setup user1 with no map
      await concept.users.insertOne({ _id: user1, currentMapId: null });
      // Setup user2 with an existing current map
      const genResult2 = await concept.generateMap({ user: user2 });
      assert("mapId" in genResult2);
      const user2InitialMapId = genResult2.mapId;

      const triggerResult = await concept.triggerDailyMapGeneration();
      assert(!("error" in triggerResult));

      // Verify daily generation status is updated
      const status = await concept.dailyGenerationStatus.findOne({
        _id: "dailyGeneration",
      });
      assertExists(status);
      const lastRunDateMidnight = new Date(
        status.lastRunDate.getFullYear(),
        status.lastRunDate.getMonth(),
        status.lastRunDate.getDate(),
      );
      const todayMidnight = new Date(
        originalDate.getFullYear(),
        originalDate.getMonth(),
        originalDate.getDate(),
      );
      assertEquals(lastRunDateMidnight.getTime(), todayMidnight.getTime());

      // Verify user1 now has a new current map
      const user1State = await concept.users.findOne({ _id: user1 });
      assertExists(user1State?.currentMapId);
      const user1NewMap = await concept.maps.findOne({
        _id: user1State!.currentMapId,
      });
      assertExists(user1NewMap);
      assertEquals(user1NewMap.isSaved, false);

      // Verify user2's old map is saved and a new one is current
      const user2State = await concept.users.findOne({ _id: user2 });
      assertExists(user2State?.currentMapId);
      assertNotEquals(user2State!.currentMapId, user2InitialMapId);

      const user2OldMap = await concept.maps.findOne({
        _id: user2InitialMapId,
      });
      assertExists(user2OldMap);
      assertEquals(user2OldMap.isSaved, true);

      const user2NewMap = await concept.maps.findOne({
        _id: user2State!.currentMapId,
      });
      assertExists(user2NewMap);
      assertEquals(user2NewMap.isSaved, false);
    });

    it("should not run if already executed today", async () => {
      // Manually set lastRunDate to "today"
      const now = new Date();
      await concept.dailyGenerationStatus.insertOne({
        _id: "dailyGeneration",
        lastRunDate: now,
      });

      const user1 = freshID();
      await concept.generateMap({ user: user1 });
      const user1InitialMapId = (await concept.users.findOne({ _id: user1 }))!
        .currentMapId;

      const triggerResult = await concept.triggerDailyMapGeneration();
      assert("error" in triggerResult);
      assertEquals(
        triggerResult.error,
        "Daily map generation has already run for today.",
      );

      // Verify no new maps were generated for user1
      const user1State = await concept.users.findOne({ _id: user1 });
      assertEquals(user1State?.currentMapId, user1InitialMapId);

      const mapsCount = await concept.maps.countDocuments({});
      assertEquals(mapsCount, 1); // Only the initial map should exist
    });

    it("should run successfully on a new day", async () => {
      const user1 = freshID();
      await concept.generateMap({ user: user1 });
      const user1Day1MapId = (await concept.users.findOne({ _id: user1 }))!
        .currentMapId;

      // Simulate running "yesterday"
      const yesterday = new Date(originalDate);
      yesterday.setDate(originalDate.getDate() - 1);
      await concept.dailyGenerationStatus.insertOne({
        _id: "dailyGeneration",
        lastRunDate: yesterday,
      });

      const triggerResult = await concept.triggerDailyMapGeneration();
      assert(!("error" in triggerResult));

      // Verify daily generation status is updated to today
      const status = await concept.dailyGenerationStatus.findOne({
        _id: "dailyGeneration",
      });
      assertExists(status);
      const lastRunDateMidnight = new Date(
        status.lastRunDate.getFullYear(),
        status.lastRunDate.getMonth(),
        status.lastRunDate.getDate(),
      );
      const todayMidnight = new Date(
        originalDate.getFullYear(),
        originalDate.getMonth(),
        originalDate.getDate(),
      );
      assertEquals(lastRunDateMidnight.getTime(), todayMidnight.getTime());

      // Verify user1's old map is saved and a new one is current
      const user1State = await concept.users.findOne({ _id: user1 });
      assertExists(user1State?.currentMapId);
      assertNotEquals(user1State!.currentMapId, user1Day1MapId); // New map generated

      const user1OldMap = await concept.maps.findOne({ _id: user1Day1MapId });
      assertExists(user1OldMap);
      assertEquals(user1OldMap.isSaved, true);

      const user1NewMap = await concept.maps.findOne({
        _id: user1State!.currentMapId,
      });
      assertExists(user1NewMap);
      assertEquals(user1NewMap.isSaved, false);

      const mapsCount = await concept.maps.countDocuments({});
      assertEquals(mapsCount, 2); // One saved, one current
    });

    it("should successfully run even if no users exist", async () => {
      const triggerResult = await concept.triggerDailyMapGeneration();
      assert(!("error" in triggerResult));

      // Verify daily generation status is updated
      const status = await concept.dailyGenerationStatus.findOne({
        _id: "dailyGeneration",
      });
      assertExists(status);

      const usersCount = await concept.users.countDocuments({});
      assertEquals(usersCount, 0);
      const mapsCount = await concept.maps.countDocuments({});
      assertEquals(mapsCount, 0);
    });

    it("should log errors for individual users but complete the daily generation process", async () => {
      const user1 = freshID();
      const user2 = freshID();

      // User1 exists with a map
      await concept.generateMap({ user: user1 });
      const user1InitialMapId = (await concept.users.findOne({ _id: user1 }))!
        .currentMapId;

      // User2 has no map
      await concept.users.insertOne({ _id: user2, currentMapId: null });

      // In a real scenario, we might mock `generateMap` to fail for a specific user.
      // Here, we verify that both users *attempt* to get maps, and the overall system status is updated.
      // The `generateMap` method itself has error handling for internal issues.
      // This test ensures the loop completes and system status updates.

      const triggerResult = await concept.triggerDailyMapGeneration();
      assert(!("error" in triggerResult)); // Overall result should be success

      // Verify daily generation status is updated
      const status = await concept.dailyGenerationStatus.findOne({
        _id: "dailyGeneration",
      });
      assertExists(status);

      // Verify user1's old map is saved and new one is current
      const user1State = await concept.users.findOne({ _id: user1 });
      assertExists(user1State?.currentMapId);
      assertNotEquals(user1State!.currentMapId, user1InitialMapId);
      const user1OldMap = await concept.maps.findOne({ _id: user1InitialMapId });
      assertEquals(user1OldMap?.isSaved, true);

      // Verify user2 also got a new current map
      const user2State = await concept.users.findOne({ _id: user2 });
      assertExists(user2State?.currentMapId);
      const user2NewMap = await concept.maps.findOne({
        _id: user2State!.currentMapId,
      });
      assertExists(user2NewMap);
      assertEquals(user2NewMap.isSaved, false);
    });
  });
});
```

### How to Run the Tests:

1. **Save the files**: Save the `BodyMapGeneration.ts`, `database.ts`, `types.ts`, and `BodyMapGeneration.test.ts` files in their respective paths as shown above.
2. **Start MongoDB**: Ensure your MongoDB server is running (e.g., `mongod` command).
3. **Run with Deno**: Navigate to your project's root directory in the terminal and run:
   ```bash
   deno test --allow-net --allow-read --allow-env test/concepts/BodyMapGeneration/BodyMapGeneration.test.ts
   ```
   * `--allow-net`: Required for network access to MongoDB.
   * `--allow-read`: Might be needed if `npm:mongodb` or other modules implicitly read files.
   * `--allow-env`: Might be needed if `npm:mongodb` or Deno internally read environment variables (e.g., `HOME` for caching).

This will execute all the tests, connecting to your local MongoDB instance and performing assertions based on the concept's behavior.
