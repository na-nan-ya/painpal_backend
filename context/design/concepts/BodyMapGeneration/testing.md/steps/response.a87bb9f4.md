---
timestamp: 'Fri Oct 17 2025 13:31:52 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_133152.0039e4b1.md]]'
content_id: a87bb9f4a9a55e9093a8d6b9655985d3dec6e222048c0d703b06439de607e741
---

# response:

To test the `BodyMapGenerationConcept` implementation, we'll create a Deno test file (`src/concepts/BodyMapGeneration/BodyMapGeneration.test.ts`). This test file will connect to a MongoDB instance, initialize the concept, and run a series of tests for each method, ensuring proper state transitions and error handling.

**1. Prepare `deno.jsonc` and utility files:**

Ensure you have a `deno.jsonc` file at the project root configured to resolve `npm:mongodb` and local utility paths:

```json
// deno.jsonc
{
  "imports": {
    "npm:mongodb": "npm:mongodb@^6.5.0",
    "@utils/types.ts": "./src/utils/types.ts",
    "@utils/database.ts": "./src/utils/database.ts"
  }
}
```

Create the necessary utility files:

**`src/utils/types.ts`**

```typescript
export type ID = string;
export type Empty = Record<string, never>;
```

**`src/utils/database.ts`**

```typescript
let idCounter = 0;
export function freshID(): string {
  // A simple unique ID generator for testing purposes.
  // In a real application, consider using libraries like `uuid` or database-specific ID generation.
  return `test-id-${Date.now()}-${idCounter++}`;
}
```

**2. Create the test file:**

**`src/concepts/BodyMapGeneration/BodyMapGeneration.test.ts`**

```typescript
import { assertEquals, assertExists, assertNotEquals, assertNull, assertObjectMatch, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { Collection, Db, MongoClient } from "npm:mongodb";
import BodyMapGenerationConcept from "./BodyMapGeneration.ts";
import { ID } from "@utils/types.ts";

// Collection prefix used in the concept
const PREFIX = "BodyMapGeneration" + ".";

// Define test database and collections names
const TEST_DB_NAME = `test-bodymapgen-${Date.now()}`;
const USERS_COLLECTION = PREFIX + "users";
const MAPS_COLLECTION = PREFIX + "maps";
const SYSTEM_COLLECTION = PREFIX + "system";

let client: MongoClient;
let db: Db;
let concept: BodyMapGenerationConcept;

// Utility to create a test user ID
function createTestUser(): ID {
  return `user-${crypto.randomUUID()}`;
}

Deno.test("BodyMapGenerationConcept", async (test) => {
  // --- Setup MongoDB connection before all tests ---
  Deno.test("setup", async () => {
    client = new MongoClient("mongodb://localhost:27017"); // Assumes MongoDB is running locally
    await client.connect();
    db = client.db(TEST_DB_NAME);
    concept = new BodyMapGenerationConcept(db);
    console.log(`Connected to MongoDB for test database: ${TEST_DB_NAME}`);
  });

  // --- Clean up collections after each test ---
  test.afterEach(async () => {
    await db.collection(USERS_COLLECTION).deleteMany({});
    await db.collection(MAPS_COLLECTION).deleteMany({});
    await db.collection(SYSTEM_COLLECTION).deleteMany({});
  });

  // --- generateMap tests ---
  await test.step("generateMap", async (t) => {
    await t.step("should generate a new map for a new user", async () => {
      const userId = createTestUser();
      const result = await concept.generateMap({ user: userId });

      assertExists(result);
      assert("mapId" in result, "Result should contain mapId");

      const { mapId } = result;
      const userState = await db.collection(USERS_COLLECTION).findOne({
        _id: userId,
      });
      const mapState = await db.collection(MAPS_COLLECTION).findOne({
        _id: mapId,
      });

      assertExists(userState);
      assertEquals(userState._id, userId);
      assertEquals(userState.currentMapId, mapId);

      assertExists(mapState);
      assertEquals(mapState._id, mapId);
      assertEquals(mapState.ownerId, userId);
      assertExists(mapState.creationDate);
      assertEquals(mapState.imageUrl, "default_map_image.png");
      assertEquals(mapState.isSaved, false); // New map should not be saved
    });

    await t.step(
      "should generate a new map and save the previous one for an existing user",
      async () => {
        const userId = createTestUser();
        // First map generation
        const firstResult = await concept.generateMap({ user: userId });
        assert("mapId" in firstResult);
        const firstMapId = firstResult.mapId;

        // Verify first map state
        const firstMap = await db.collection(MAPS_COLLECTION).findOne({
          _id: firstMapId,
        });
        assertEquals(firstMap?.isSaved, false);

        // Second map generation
        const secondResult = await concept.generateMap({ user: userId });
        assert("mapId" in secondResult);
        const secondMapId = secondResult.mapId;
        assertNotEquals(firstMapId, secondMapId); // Should be a new map

        // Verify user's current map is the second one
        const userState = await db.collection(USERS_COLLECTION).findOne({
          _id: userId,
        });
        assertEquals(userState?.currentMapId, secondMapId);

        // Verify first map is now saved
        const updatedFirstMap = await db.collection(MAPS_COLLECTION).findOne({
          _id: firstMapId,
        });
        assertEquals(updatedFirstMap?.isSaved, true);

        // Verify second map is not saved
        const secondMap = await db.collection(MAPS_COLLECTION).findOne({
          _id: secondMapId,
        });
        assertEquals(secondMap?.isSaved, false);
      },
    );

    await t.step(
      "should handle error during map insertion (simulated)",
      async () => {
        // Temporarily break the maps collection insertion for this test
        const originalInsertOne = concept.maps.insertOne;
        concept.maps.insertOne = () => {
          throw new Error("Simulated insert error");
        };

        const userId = createTestUser();
        const result = await concept.generateMap({ user: userId });
        assert("error" in result);
        assertEquals(result.error, "Failed to generate map: Simulated insert error");

        // Restore original method
        concept.maps.insertOne = originalInsertOne;
      },
    );
  });

  // --- saveMap tests ---
  await test.step("saveMap", async (t) => {
    await t.step("should save the current map", async () => {
      const userId = createTestUser();
      const genResult = await concept.generateMap({ user: userId });
      assert("mapId" in genResult);
      const { mapId } = genResult;

      const saveResult = await concept.saveMap({ user: userId });
      assert("error" in saveResult === false);

      const mapState = await db.collection(MAPS_COLLECTION).findOne({
        _id: mapId,
      });
      assertEquals(mapState?.isSaved, true);
    });

    await t.step("should return error if user has no current map", async () => {
      const userId = createTestUser();
      const result = await concept.saveMap({ user: userId });
      assert("error" in result);
      assertEquals(result.error, `User ${userId} does not have a current map to save.`);
    });

    await t.step("should gracefully handle saving an already saved map", async () => {
      const userId = createTestUser();
      const genResult = await concept.generateMap({ user: userId });
      assert("mapId" in genResult);
      const { mapId } = genResult;

      await concept.saveMap({ user: userId }); // First save
      const result = await concept.saveMap({ user: userId }); // Second save
      assert("error" in result === false); // Should not be an error

      const mapState = await db.collection(MAPS_COLLECTION).findOne({ _id: mapId });
      assertEquals(mapState?.isSaved, true);
    });
  });

  // --- clearMap tests ---
  await test.step("clearMap", async (t) => {
    await t.step("should clear the current map", async () => {
      const userId = createTestUser();
      const genResult = await concept.generateMap({ user: userId });
      assert("mapId" in genResult);
      const { mapId } = genResult;

      const clearResult = await concept.clearMap({ user: userId });
      assert("error" in clearResult === false);

      const userState = await db.collection(USERS_COLLECTION).findOne({
        _id: userId,
      });
      assertNull(userState?.currentMapId); // currentMapId should be null

      const mapState = await db.collection(MAPS_COLLECTION).findOne({
        _id: mapId,
      });
      assertNull(mapState); // Map should be deleted
    });

    await t.step("should return error if user has no current map", async () => {
      const userId = createTestUser();
      const result = await concept.clearMap({ user: userId });
      assert("error" in result);
      assertEquals(result.error, `User ${userId} does not have a current map to clear.`);
    });

    await t.step("should handle map not found during deletion gracefully", async () => {
      const userId = createTestUser();
      const genResult = await concept.generateMap({ user: userId });
      assert("mapId" in genResult);
      const { mapId } = genResult;

      // Manually delete the map to simulate it being absent
      await db.collection(MAPS_COLLECTION).deleteOne({ _id: mapId });

      const clearResult = await concept.clearMap({ user: userId });
      assert("error" in clearResult === false); // Should still succeed in clearing user's reference

      const userState = await db.collection(USERS_COLLECTION).findOne({ _id: userId });
      assertNull(userState?.currentMapId);
    });
  });

  // --- triggerDailyMapGeneration tests ---
  await test.step("triggerDailyMapGeneration", async (t) => {
    await t.step("should generate maps for all users on first run", async () => {
      const user1 = createTestUser();
      const user2 = createTestUser();

      // User 1 has no map initially
      // User 2 has an existing map
      const genResult2 = await concept.generateMap({ user: user2 });
      assert("mapId" in genResult2);
      const user2_oldMapId = genResult2.mapId;

      const result = await concept.triggerDailyMapGeneration();
      assert("error" in result === false);

      // Verify status updated
      const status = await db.collection(SYSTEM_COLLECTION).findOne({
        _id: "dailyGeneration",
      });
      assertExists(status);
      assertExists(status.lastRunDate);
      assertEquals(
        new Date(status.lastRunDate).toDateString(),
        new Date().toDateString(),
      );

      // Verify user1 now has a current map
      const user1State = await db.collection(USERS_COLLECTION).findOne({
        _id: user1,
      });
      assertExists(user1State?.currentMapId);
      const user1_newMap = await db.collection(MAPS_COLLECTION).findOne({
        _id: user1State?.currentMapId,
      });
      assertExists(user1_newMap);
      assertEquals(user1_newMap.ownerId, user1);
      assertEquals(user1_newMap.isSaved, false);

      // Verify user2's old map is saved and a new one is generated
      const user2State = await db.collection(USERS_COLLECTION).findOne({
        _id: user2,
      });
      assertExists(user2State?.currentMapId);
      assertNotEquals(user2State.currentMapId, user2_oldMapId);

      const user2_oldMap = await db.collection(MAPS_COLLECTION).findOne({
        _id: user2_oldMapId,
      });
      assertEquals(user2_oldMap?.isSaved, true); // Old map should be saved

      const user2_newMap = await db.collection(MAPS_COLLECTION).findOne({
        _id: user2State?.currentMapId,
      });
      assertExists(user2_newMap);
      assertEquals(user2_newMap.ownerId, user2);
      assertEquals(user2_newMap.isSaved, false); // New map should not be saved
    });

    await t.step("should not run if already executed today", async () => {
      // Manually set the lastRunDate to today
      const now = new Date();
      await db.collection(SYSTEM_COLLECTION).insertOne({
        _id: "dailyGeneration",
        lastRunDate: now,
      });

      const result = await concept.triggerDailyMapGeneration();
      assert("error" in result);
      assertEquals(result.error, "Daily map generation has already run for today.");
    });

    await t.step("should run if last execution was on a previous day", async () => {
      const user3 = createTestUser();
      await concept.generateMap({ user: user3 });
      const user3_map1 = (await concept._getCurrentMap({ user: user3 })).map;
      assertExists(user3_map1);
      assertEquals(user3_map1.isSaved, false);

      // Manually set the lastRunDate to yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      await db.collection(SYSTEM_COLLECTION).insertOne({
        _id: "dailyGeneration",
        lastRunDate: yesterday,
      });

      const result = await concept.triggerDailyMapGeneration();
      assert("error" in result === false);

      // Verify user3's map was updated
      const user3_map2 = (await concept._getCurrentMap({ user: user3 })).map;
      assertExists(user3_map2);
      assertNotEquals(user3_map1._id, user3_map2._id);
      assertEquals(user3_map2.isSaved, false);

      // Verify user3's original map is now saved
      const savedMap1 = await db.collection(MAPS_COLLECTION).findOne({
        _id: user3_map1._id,
      });
      assertEquals(savedMap1?.isSaved, true);
    });

    await t.step("should handle no users gracefully", async () => {
      const result = await concept.triggerDailyMapGeneration();
      assert("error" in result === false);

      // Verify status updated even with no users
      const status = await db.collection(SYSTEM_COLLECTION).findOne({
        _id: "dailyGeneration",
      });
      assertExists(status);
    });
  });

  // --- Query methods tests ---
  await test.step("_getCurrentMap", async (t) => {
    await t.step("should return the current map if it exists", async () => {
      const userId = createTestUser();
      const genResult = await concept.generateMap({ user: userId });
      assert("mapId" in genResult);
      const { mapId } = genResult;

      const queryResult = await concept._getCurrentMap({ user: userId });
      assert("map" in queryResult);
      assertExists(queryResult.map);
      assertEquals(queryResult.map._id, mapId);
      assertEquals(queryResult.map.ownerId, userId);
      assertEquals(queryResult.map.isSaved, false);
    });

    await t.step("should return null if no current map exists for the user", async () => {
      const userId = createTestUser();
      const queryResult = await concept._getCurrentMap({ user: userId });
      assert("map" in queryResult);
      assertNull(queryResult.map);
    });
  });

  await test.step("_getSavedMaps", async (t) => {
    await t.step("should return all saved maps for a user", async () => {
      const userId = createTestUser();
      // Generate and save first map
      await concept.generateMap({ user: userId });
      await concept.saveMap({ user: userId });

      // Generate second map (this implicitly saves the first one)
      await concept.generateMap({ user: userId });
      const currentMapId = (await concept._getCurrentMap({ user: userId })).map
        ?._id;

      // Saved maps should be the first map
      const queryResult = await concept._getSavedMaps({ user: userId });
      assert("maps" in queryResult);
      assertEquals(queryResult.maps.length, 1);
      assertEquals(queryResult.maps[0].ownerId, userId);
      assertEquals(queryResult.maps[0].isSaved, true);
      assertNotEquals(queryResult.maps[0]._id, currentMapId);
    });

    await t.step("should return empty array if no saved maps exist", async () => {
      const userId = createTestUser();
      // Generate a map but don't save it
      await concept.generateMap({ user: userId });

      const queryResult = await concept._getSavedMaps({ user: userId });
      assert("maps" in queryResult);
      assertEquals(queryResult.maps.length, 0);
    });

    await t.step("should return empty array for a user with no maps at all", async () => {
      const userId = createTestUser();
      const queryResult = await concept._getSavedMaps({ user: userId });
      assert("maps" in queryResult);
      assertEquals(queryResult.maps.length, 0);
    });
  });

  // --- Teardown MongoDB connection after all tests ---
  Deno.test("teardown", async () => {
    if (db) {
      await db.dropDatabase();
      console.log(`Dropped test database: ${TEST_DB_NAME}`);
    }
    if (client) {
      await client.close();
      console.log("MongoDB client closed.");
    }
  });
});
```

**3. Run the tests:**

Make sure your MongoDB instance is running (e.g., via Docker: `docker run --name mongo -p 27017:27017 -d mongo`).

Then, navigate to your project root and run the tests using Deno:

```bash
deno test --allow-net --allow-read --allow-env src/concepts/BodyMapGeneration/BodyMapGeneration.test.ts
```

* `--allow-net`: Required for connecting to MongoDB.
* `--allow-read`: Might be needed if your Deno setup requires reading local files for imports (like `deno.jsonc`).
* `--allow-env`: Not strictly needed for this specific test, but good practice if MongoDB connection string or other settings might come from environment variables.

You should see output indicating that all tests passed successfully.
