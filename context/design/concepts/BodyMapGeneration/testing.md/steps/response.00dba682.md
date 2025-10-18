---
timestamp: 'Fri Oct 17 2025 22:50:50 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_225050.440a1640.md]]'
content_id: 00dba6826f19f7a64578a9cda867e0e56374786401e3719c9f98f3fb31506207
---

# response:

The problem statement clarifies that `generateMap` is intended to be a *system-only* action, meaning users shouldn't call it directly, and crucially, a user should not be able to generate more than one map per day. The existing `generateMap` method, however, allows multiple generations on the same day by implicitly saving the previous one.

To align the implementation with this new requirement, the `generateMap` method in `BodyMapGeneration.ts` needs a precondition check to ensure a map hasn't already been generated for the user on the current day.

Here's the corrected `BodyMapGeneration.ts` first, followed by the revised test suite.

***

### **Updated `src/concepts/BodyMapGeneration/BodyMapGeneration.ts`**

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Collection prefix to ensure isolation within the database
const PREFIX = "BodyMapGeneration" + ".";

// Generic type parameter for users
type User = ID;
// Internal ID for Maps
type Map = ID;

/**
 * @interface UserState
 * Represents the state of a user within the BodyMapGeneration concept.
 *
 * users: a set of Users with
 *   currentMapId: Map | null
 */
interface UserState {
  _id: User;
  currentMapId: Map | null;
}

/**
 * @interface MapState
 * Represents a single generated body map.
 *
 * maps: a set of Maps with
 *   _id: Map
 *   ownerId: User
 *   creationDate: Date
 *   imageUrl: String
 *   isSaved: Boolean
 */
interface MapState {
  _id: Map;
  ownerId: User;
  creationDate: Date;
  imageUrl: string;
  isSaved: boolean;
}

/**
 * @interface DailyGenerationStatus
 * A single record to track the last time the daily generation system action ran.
 *
 * dailyGenerationStatus:
 *   _id: String = "dailyGeneration"
 *   lastRunDate: Date
 */
interface DailyGenerationStatus {
  _id: "dailyGeneration"; // Unique identifier for this system status record
  lastRunDate: Date;
}

/**
 * @concept BodyMapGeneration
 * @purpose provide a daily visual representation of the body for users to track changes over time,
 *          without including any notion of body measurements.
 * @principle after a map is generated, it becomes the user's current map. At midnight, the user's current map
 *             is automatically saved to a historical archive and a new one is automatically generated for the next day for all users.
 */
export default class BodyMapGenerationConcept {
  // MongoDB collections for the concept's state
  users: Collection<UserState>;
  maps: Collection<MapState>;
  dailyGenerationStatus: Collection<DailyGenerationStatus>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
    this.maps = this.db.collection(PREFIX + "maps");
    this.dailyGenerationStatus = this.db.collection(PREFIX + "system");
  }

  /**
   * generateMap (user: User): (mapId: Map)
   *
   * requires: The user does not already have a current map generated today.
   * effects:
   *   If user has an existing currentMapId: That map's isSaved property is set to true.
   *   A new Map is created with ownerId, current Date, placeholder imageUrl, and isSaved: false.
   *   The user's currentMapId is updated to this new Map's ID.
   *   Returns the _id of the newly generated Map.
   */
  async generateMap(
    { user }: { user: User },
  ): Promise<{ mapId: Map } | { error: string }> {
    try {
      const now = new Date();
      // Calculate midnight of the current day for comparison
      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Find the user's current state
      const existingUser = await this.users.findOne({ _id: user });

      // If the user has an existing current map, check its creation date.
      if (existingUser && existingUser.currentMapId) {
        const currentMap = await this.maps.findOne({ _id: existingUser.currentMapId });
        if (currentMap) {
          const currentMapCreationMidnight = new Date(
            currentMap.creationDate.getFullYear(),
            currentMap.creationDate.getMonth(),
            currentMap.creationDate.getDate(),
          );

          if (currentMapCreationMidnight.getTime() === todayMidnight.getTime()) {
            // A map has already been generated for this user today.
            return { error: `Map generation already occurred for user ${user} today.` };
          }

          // If it's a map from a previous day, mark it as saved (archived).
          await this.maps.updateOne(
            { _id: existingUser.currentMapId },
            { $set: { isSaved: true } },
          );
        }
      }

      // Generate a new unique ID for the new map
      const newMapId = freshID() as Map;
      const newMap: MapState = {
        _id: newMapId,
        ownerId: user,
        creationDate: now, // Use 'now' for precise timestamp
        imageUrl: "default_map_image.png", // Placeholder image URL, no body measurements implied
        isSaved: false, // New maps are not saved yet
      };

      // Insert the new map into the maps collection
      await this.maps.insertOne(newMap);

      // Update or create the user record with the new currentMapId
      await this.users.updateOne(
        { _id: user },
        { $set: { currentMapId: newMapId } },
        { upsert: true }, // Create the user record if it doesn't exist
      );

      return { mapId: newMapId };
    } catch (e) {
      if (e instanceof Error) {
        console.error(`Error generating map for user ${user}:`, e);
        return { error: `Failed to generate map: ${e.message}` };
      } else {
        console.error(`Unknown error generating map for user ${user}:`, e);
        return { error: "Failed to generate map due to an unknown error" };
      }
    }
  }

  /**
   * saveMap (user: User): Empty
   *
   * requires: user has a currentMapId.
   * effects: The Map referenced by user's currentMapId has its isSaved property set to true.
   *          This action allows a user to manually archive their current map at any time.
   */
  async saveMap({ user }: { user: User }): Promise<Empty | { error: string }> {
    try {
      const userState = await this.users.findOne({ _id: user });

      // Precondition check: user must have a currentMapId
      if (!userState || !userState.currentMapId) {
        return { error: `User ${user} does not have a current map to save.` };
      }

      // Mark the current map as saved
      const result = await this.maps.updateOne(
        { _id: userState.currentMapId },
        { $set: { isSaved: true } },
      );

      if (result.modifiedCount === 0) {
        console.warn(
          `Map ${userState.currentMapId} for user ${user} was not modified (might be already saved or not found).`,
        );
      }

      return {};
    } catch (e) {
      if (e instanceof Error) {
        console.error(`Error saving map for user ${user}:`, e);
        return { error: `Failed to save map: ${e.message}` };
      } else {
        console.error(`Unknown error saving map for user ${user}:`, e);
        return { error: "Failed to save map due to an unknown error" };
      }
    }
  }

  /**
   * clearMap (user: User): Empty
   *
   * requires: user has a currentMapId.
   * effects:
   *   The Map referenced by user's currentMapId is deleted from the maps collection.
   *   The user's currentMapId is set to null.
   */
  async clearMap({ user }: { user: User }): Promise<Empty | { error: string }> {
    try {
      const userState = await this.users.findOne({ _id: user });

      // Precondition check: user must have a currentMapId
      if (!userState || !userState.currentMapId) {
        return { error: `User ${user} does not have a current map to clear.` };
      }

      // Delete the associated map document from the maps collection
      const deleteResult = await this.maps.deleteOne({
        _id: userState.currentMapId,
      });
      if (deleteResult.deletedCount === 0) {
        console.warn(
          `Map ${userState.currentMapId} for user ${user} was not found for deletion.`,
        );
      }

      // Set user's current map reference to null
      await this.users.updateOne(
        { _id: user },
        { $set: { currentMapId: null } },
      );

      return {};
    } catch (e) {
      if (e instanceof Error) {
        console.error(`Error clearing map for user ${user}:`, e);
        return { error: `Failed to clear map: ${e.message}` };
      } else {
        console.error(`Unknown error clearing map for user ${user}:`, e);
        return { error: "Failed to clear map due to an unknown error" };
      }
    }
  }

  /**
   * system triggerDailyMapGeneration (): Empty
   *
   * requires: The current time is 00:00:00 (midnight) of a new day, AND dailyGenerationStatus.lastRunDate is not today's date.
   * effects:
   *   For each user in the users collection:
   *     Call generateMap(user). (This will implicitly save the previous currentMap if one exists, then create a new one).
   *   Update dailyGenerationStatus.lastRunDate to the current date.
   */
  async triggerDailyMapGeneration(): Promise<Empty | { error: string }> {
    const now = new Date();
    // Calculate midnight of the current day for comparison
    const todayMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    try {
      const status = await this.dailyGenerationStatus.findOne({
        _id: "dailyGeneration",
      });
      const lastRunDate = status ? new Date(status.lastRunDate) : null;
      // Calculate midnight of the last run date for comparison
      const lastRunMidnight = lastRunDate
        ? new Date(
          lastRunDate.getFullYear(),
          lastRunDate.getMonth(),
          lastRunDate.getDate(),
        )
        : null;

      // Precondition check: Ensure this action hasn't already run today
      if (
        lastRunMidnight && lastRunMidnight.getTime() === todayMidnight.getTime()
      ) {
        return { error: "Daily map generation has already run for today." };
      }

      console.log(
        `Starting daily map generation for date: ${todayMidnight.toISOString()}`,
      );

      // Retrieve all existing users to process their maps
      const allUsers = await this.users.find({}).toArray();

      // For each user, call generateMap. This now handles the 'one map per day' check.
      // If a user gets an error (e.g., they already had a map for today), it will be logged.
      // For system-wide tasks, usually continue with a log for other users.
      for (const userState of allUsers) {
        console.log(
          `Processing daily map generation for user: ${userState._id}`,
        );
        const generateResult = await this.generateMap({ user: userState._id });
        if ("error" in generateResult) {
          console.error(
            `Failed to generate daily map for user ${userState._id}: ${generateResult.error}`,
          );
        }
      }

      // Update the system status to mark that daily generation has run for today
      await this.dailyGenerationStatus.updateOne(
        { _id: "dailyGeneration" },
        { $set: { lastRunDate: now } }, // Store the exact time of completion
        { upsert: true }, // Create the status record if it doesn't exist
      );

      console.log(
        `Daily map generation completed for date: ${todayMidnight.toISOString()}`,
      );
      return {};
    } catch (e) {
      if (e instanceof Error) {
        console.error("Critical error during daily map generation:", e);
        return { error: `Daily map generation failed: ${e.message}` };
      } else {
        console.error("Unknown critical error during daily map generation:", e);
        return { error: "Daily map generation failed due to an unknown error" };
      }
    }
  }

  // --- Query methods (not explicitly requested but good for testing/observability) ---

  /**
   * _getCurrentMap (user: User): (map: MapState | null)
   *
   * effects: Returns the current map for a given user, or null if none exists.
   */
  async _getCurrentMap(
    { user }: { user: User },
  ): Promise<{ map: MapState | null } | { error: string }> {
    try {
      const userState = await this.users.findOne({ _id: user });
      if (!userState || !userState.currentMapId) {
        return { map: null };
      }
      const map = await this.maps.findOne({ _id: userState.currentMapId });
      return { map };
    } catch (e) {
      if (e instanceof Error) {
        console.error(`Error fetching current map for user ${user}:`, e);
        return { error: `Failed to fetch current map: ${e.message}` };
      } else {
        console.error(
          `Unknown error fetching current map for user ${user}:`,
          e,
        );
        return { error: "Failed to fetch current map due to an unknown error" };
      }
    }
  }

  /**
   * _getSavedMaps (user: User): (maps: MapState[])
   *
   * effects: Returns all saved maps for a given user.
   */
  async _getSavedMaps(
    { user }: { user: User },
  ): Promise<{ maps: MapState[] } | { error: string }> {
    try {
      const maps = await this.maps.find({ ownerId: user, isSaved: true })
        .toArray();
      return { maps };
    } catch (e) {
      if (e instanceof Error) {
        console.error(`Error fetching saved maps for user ${user}:`, e);
        return { error: `Failed to fetch saved maps: ${e.message}` };
      } else {
        console.error(`Unknown error fetching saved maps for user ${user}:`, e);
        return { error: "Failed to fetch saved maps due to an unknown error" };
      }
    }
  }
}
```

***

### **Revised `src/concepts/BodyMapGeneration/BodyMapGeneration.test.ts`**

This revised test suite now reflects the correct behavior: `generateMap` is primarily called by the `triggerDailyMapGeneration` system action, and attempting to generate more than one map per user per day (even via `generateMap` directly) will result in an error.

```typescript
import {
  assert,
  assertEquals,
  assertExists,
  assertNotEquals,
} from "jsr:@std/assert";
import { Db, MongoClient } from "npm:mongodb";
import { testDb } from "@utils/database.ts";
import BodyMapGenerationConcept from "../../../src/concepts/BodyMapGeneration/BodyMapGeneration.ts";
import { ID } from "@utils/types.ts";

// Helper function to get a Date object representing midnight of a given date.
// This is useful for testing `triggerDailyMapGeneration` which compares dates without time.
function getMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

Deno.test("BodyMapGeneration", async (test) => {
  let client: MongoClient | null = null; // Initialize client to null for safety in finally block
  let db: Db;

  await test.step("Principle: BodyMapGeneration Lifecycle", async () => {
    try {
      // Connect to the test database
      [db, client] = await testDb();
      const concept = new BodyMapGenerationConcept(db);

      const testUser1Id = "user123_principle" as ID;
      const testUser2Id = "user456_principle" as ID;

      let user1_firstMapId: ID;
      let user2_firstMapId: ID;
      let user1_secondMapId: ID; // Map created on Day 2 for User 1
      let user2_secondMapId: ID; // Map created on Day 2 for User 2

      console.log(
        "\n--- START: BodyMapGeneration Lifecycle Principle Test ---",
      );
      console.log(
        "This test walks through the complete lifecycle for two users, demonstrating daily system generation, manual saving, retrieval, and clearing.\n",
      );

      // Setup for initial daily generation: Set last run date to yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1); // Set to yesterday's date
      await concept.dailyGenerationStatus.insertOne({
        _id: "dailyGeneration",
        lastRunDate: yesterday,
      });
      console.log(
        `[Principle Setup] Manually set dailyGenerationStatus to yesterday: ${
          yesterday.toISOString().split("T")[0]
        }`,
      );

      // Action: Initial Daily Map Generation (Day 1 for all users)
      // This will create both testUser1 and testUser2 and their first maps.
      console.log(
        "\n[Principle Step 1] Triggering Daily Map Generation (Day 1):",
      );
      console.log("  Simulating midnight system trigger to generate maps for all users (including new ones).");
      const initialTriggerResult = await concept.triggerDailyMapGeneration();
      assertExists(initialTriggerResult, "Expected a result from initial daily trigger.");
      assert(
        !("error" in initialTriggerResult),
        `Error during initial daily generation: ${JSON.stringify(initialTriggerResult)}`,
      );
      console.log("  -> Daily map generation for Day 1 triggered successfully.");

      // Verify User 1's first map and state
      let user1State = await concept.users.findOne({ _id: testUser1Id });
      assertExists(user1State, "User 1 state should exist after initial generation.");
      user1_firstMapId = user1State.currentMapId!;
      assertExists(user1_firstMapId, "User 1 should have a current map ID.");
      console.log(`  -> User ${testUser1Id} created with currentMapId: ${user1_firstMapId}`);

      let map1State = await concept.maps.findOne({ _id: user1_firstMapId });
      assertExists(map1State, "User 1's first map state document should exist.");
      assertEquals(map1State.ownerId, testUser1Id, "User 1's first map ownerId should match.");
      assertEquals(map1State.isSaved, false, "User 1's first map should not be saved initially.");
      console.log(`  -> Map ${user1_firstMapId} details: ownerId=${map1State.ownerId}, isSaved=${map1State.isSaved}`);

      // Verify User 2's first map and state
      let user2State = await concept.users.findOne({ _id: testUser2Id });
      assertExists(user2State, "User 2 state should exist after initial generation.");
      user2_firstMapId = user2State.currentMapId!;
      assertExists(user2_firstMapId, "User 2 should have a current map ID.");
      console.log(`  -> User ${testUser2Id} created with currentMapId: ${user2_firstMapId}`);

      let mapUser2State = await concept.maps.findOne({ _id: user2_firstMapId });
      assertExists(mapUser2State, "User 2's first map state document should exist.");
      assertEquals(mapUser2State.ownerId, testUser2Id, "User 2's first map ownerId should match.");
      assertEquals(mapUser2State.isSaved, false, "User 2's first map should not be saved initially.");
      console.log(`  -> Map ${user2_firstMapId} details: ownerId=${mapUser2State.ownerId}, isSaved=${mapUser2State.isSaved}`);

      // Verify dailyGenerationStatus is updated to today
      let statusAfterInitialRun = await concept.dailyGenerationStatus.findOne({ _id: "dailyGeneration" });
      assertExists(statusAfterInitialRun, "Daily generation status should exist.");
      assertEquals(getMidnight(statusAfterInitialRun.lastRunDate).getTime(), getMidnight(new Date()).getTime(), "Daily generation lastRunDate should be today's midnight after first run.");
      console.log(`  -> Daily generation status updated to: ${statusAfterInitialRun.lastRunDate.toISOString().split('T')[0]}`);

      // Action: Query Current Map for User 1
      console.log("\n[Principle Step 2] Querying Current Map for User 1:");
      console.log(`  Fetching current map for user: ${testUser1Id}`);
      const currentMapResult1 = await concept._getCurrentMap({ user: testUser1Id });
      assertExists(currentMapResult1, "Expected a result from _getCurrentMap.");
      assert("map" in currentMapResult1, `Error getting current map: ${JSON.stringify(currentMapResult1)}`);
      assertExists(currentMapResult1.map, "Expected to find a current map for User 1.");
      assertEquals(currentMapResult1.map._id, user1_firstMapId, "Queried current map ID should match User 1's first map ID.");
      assertEquals(currentMapResult1.map.isSaved, false, "Queried current map should still not be saved.");
      console.log(`  -> Found current map: ${currentMapResult1.map._id}, isSaved=${currentMapResult1.map.isSaved}`);

      // Action: User 1 Manually Saves Current Map
      console.log("\n[Principle Step 3] User 1 Manually Saving Current Map:");
      console.log(`  Attempting to save map ${user1_firstMapId} for user: ${testUser1Id}`);
      const saveResult1 = await concept.saveMap({ user: testUser1Id });
      assertExists(saveResult1, "Expected a result from saveMap.");
      assert(!("error" in saveResult1), `Error saving map: ${JSON.stringify(saveResult1)}`);
      console.log(`  -> Map ${user1_firstMapId} explicitly saved by User 1.`);

      map1State = await concept.maps.findOne({ _id: user1_firstMapId });
      assertExists(map1State, "User 1's first map state should still exist after saving.");
      assertEquals(map1State.isSaved, true, "User 1's first map should now be marked as saved.");
      console.log(`  -> Verified Map ${user1_firstMapId} isSaved status: ${map1State.isSaved}`);
      user1State = await concept.users.findOne({ _id: testUser1Id });
      assertEquals(user1State?.currentMapId, user1_firstMapId, "User 1's currentMapId should still point to the first map after manual save.");

      // Setup for next daily generation: Set last run date to yesterday (simulating a new day)
      yesterday.setDate(yesterday.getDate()); // Reset 'yesterday' to today before setting it to actual yesterday for the NEXT trigger
      yesterday.setDate(yesterday.getDate() - 1);
      await concept.dailyGenerationStatus.updateOne(
        { _id: "dailyGeneration" },
        { $set: { lastRunDate: yesterday } },
      );
      console.log(
        `\n[Principle Setup] Manually set dailyGenerationStatus to yesterday for Day 2 trigger: ${
          yesterday.toISOString().split("T")[0]
        }`,
      );

      // Action: Trigger Daily Map Generation (Day 2 for all users)
      // This will implicitly save current maps for all users (unless already saved), and generate new ones.
      console.log(
        "\n[Principle Step 4] Triggering Daily Map Generation (Day 2):",
      );
      console.log("  Simulating midnight system trigger for the next day.");
      const secondDailyTriggerResult = await concept.triggerDailyMapGeneration();
      assertExists(secondDailyTriggerResult, "Expected a result from second daily trigger.");
      assert(!("error" in secondDailyTriggerResult), `Error during second daily generation: ${JSON.stringify(secondDailyTriggerResult)}`);
      console.log("  -> Daily map generation for Day 2 triggered successfully.");

      // Verify User 1's maps after Day 2 generation
      console.log("\n[Principle Step 5] Verifying User 1's State After Day 2 Generation:");
      // User 1's first map was already saved manually.
      map1State = await concept.maps.findOne({ _id: user1_firstMapId });
      assertExists(map1State, "User 1's first map state should still exist.");
      assertEquals(map1State.isSaved, true, "User 1's first map should remain saved.");

      // User 1 should have a NEW current map for Day 2
      user1State = await concept.users.findOne({ _id: testUser1Id });
      assertExists(user1State, "User 1 state should exist after Day 2 generation.");
      user1_secondMapId = user1State.currentMapId!;
      assertExists(user1_secondMapId, "User 1 should have a new second map ID.");
      assertNotEquals(user1_secondMapId, user1_firstMapId, "User 1's second map ID should be different from first map ID.");
      console.log(`  -> User 1 now has new current map: ${user1_secondMapId}`);

      const map2User1State = await concept.maps.findOne({ _id: user1_secondMapId });
      assertExists(map2User1State, "User 1's second map state document should exist.");
      assertEquals(map2User1State.ownerId, testUser1Id, "User 1's second map ownerId should match User 1.");
      assertEquals(map2User1State.isSaved, false, "User 1's second map should not be saved initially.");
      console.log(`  -> User 1's new map ${user1_secondMapId} isSaved: ${map2User1State.isSaved}`);

      // Verify User 2's maps after Day 2 generation
      console.log("\n[Principle Step 6] Verifying User 2's State After Day 2 Generation:");
      // User 2's first map should now be saved implicitly
      mapUser2State = await concept.maps.findOne({ _id: user2_firstMapId });
      assertExists(mapUser2State, "User 2's first map state should still exist.");
      assertEquals(mapUser2State.isSaved, true, "User 2's first map should be saved after daily generation.");
      console.log(`  -> User 2's previous current map (${user2_firstMapId}) is now saved: ${mapUser2State.isSaved}`);

      // User 2 should have a NEW current map for Day 2
      user2State = await concept.users.findOne({ _id: testUser2Id });
      assertExists(user2State, "User 2 state should exist after Day 2 generation.");
      user2_secondMapId = user2State.currentMapId!;
      assertExists(user2_secondMapId, "User 2 should have a new second map ID.");
      assertNotEquals(user2_secondMapId, user2_firstMapId, "User 2's second map ID should be different from first map ID.");
      console.log(`  -> User 2 now has new current map: ${user2_secondMapId}`);

      const map2User2State = await concept.maps.findOne({ _id: user2_secondMapId });
      assertExists(map2User2State, "User 2's second map state document should exist.");
      assertEquals(map2User2State.ownerId, testUser2Id, "User 2's second map ownerId should match User 2.");
      assertEquals(map2User2State.isSaved, false, "User 2's second map should not be saved initially.");
      console.log(`  -> User 2's new map ${user2_secondMapId} isSaved: ${map2User2State.isSaved}`);

      // Query Saved Maps for User 1
      console.log("\n[Principle Step 7] Querying Saved Maps for User 1:");
      console.log(`  Fetching all saved maps for user: ${testUser1Id}`);
      const savedMapsResult1 = await concept._getSavedMaps({ user: testUser1Id });
      assertExists(savedMapsResult1, "Expected a result from _getSavedMaps.");
      assert("maps" in savedMapsResult1);
      assertEquals(savedMapsResult1.maps.length, 1, "Expected one saved map for User 1 (the first one).");
      assertEquals(savedMapsResult1.maps[0]._id, user1_firstMapId, "Saved map ID should be User 1's first map ID.");
      console.log(`  -> User 1 has ${savedMapsResult1.maps.length} saved map(s): ${savedMapsResult1.maps.map(m => m._id).join(', ')}`);

      // Query Saved Maps for User 2
      console.log("\n[Principle Step 8] Querying Saved Maps for User 2:");
      console.log(`  Fetching all saved maps for user: ${testUser2Id}`);
      const savedMapsResult2 = await concept._getSavedMaps({ user: testUser2Id });
      assertExists(savedMapsResult2, "Expected a result from _getSavedMaps.");
      assert("maps" in savedMapsResult2);
      assertEquals(savedMapsResult2.maps.length, 1, "Expected one saved map for User 2 (the first one).");
      assertEquals(savedMapsResult2.maps[0]._id, user2_firstMapId, "Saved map ID should be User 2's first map ID.");
      console.log(`  -> User 2 has ${savedMapsResult2.maps.length} saved map(s): ${savedMapsResult2.maps.map(m => m._id).join(', ')}`);


      // Action: Clear Current Map for User 1
      console.log("\n[Principle Step 9] Clearing Current Map for User 1:");
      console.log(`  Attempting to clear current map ${user1_secondMapId} for user: ${testUser1Id}`);
      const clearResult1 = await concept.clearMap({ user: testUser1Id });
      assertExists(clearResult1, "Expected a result from clearMap.");
      assert(!("error" in clearResult1), `Error clearing map: ${JSON.stringify(clearResult1)}`);
      console.log(`  -> Current map for User 1 cleared.`);

      user1State = await concept.users.findOne({ _id: testUser1Id });
      assertExists(user1State, "User 1 state should still exist after clearing map.");
      assertEquals(user1State.currentMapId, null, "User 1's currentMapId should be null after clearing.");
      console.log(`  -> User ${testUser1Id} currentMapId is now: ${user1State.currentMapId}`);

      const mapUser1AfterClear = await concept.maps.findOne({ _id: user1_secondMapId });
      assertEquals(mapUser1AfterClear, null, "User 1's second map should be deleted after clearing.");
      console.log(`  -> Verified map ${user1_secondMapId} is deleted from the maps collection.`);

      // Querying current map should now return null
      const currentMapResultAfterClear = await concept._getCurrentMap({ user: testUser1Id });
      assertExists(currentMapResultAfterClear);
      assert("map" in currentMapResultAfterClear);
      assertEquals(currentMapResultAfterClear.map, null, "No current map should be found for User 1 after clearing.");
      console.log("  -> Verified no current map for User 1 after clearing.");

      console.log("\n--- END: BodyMapGeneration Lifecycle Principle Test ---");

    } finally {
      await client?.close();
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  });

  await test.step("Action: System generates a map for a new user correctly initializes their state", async () => {
    try {
      [db, client] = await testDb();
      const concept = new BodyMapGenerationConcept(db);
      const newUser = "newUser1_action" as ID;

      console.log(`\n[Action Test] System generates map for new user ${newUser}:`);

      // Setup for initial daily generation: Set last run date to yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      await concept.dailyGenerationStatus.insertOne({ _id: "dailyGeneration", lastRunDate: yesterday });
      console.log(`  Simulated daily generation run for yesterday: ${yesterday.toISOString().split('T')[0]}`);

      console.log(`  Triggering daily map generation to create the first map for new user.`);
      const triggerResult = await concept.triggerDailyMapGeneration();
      assert(!("error" in triggerResult), `Trigger failed: ${JSON.stringify(triggerResult)}`);

      const userState = await concept.users.findOne({ _id: newUser });
      assertExists(userState, "User state should be created for the new user.");
      const newMapId = userState.currentMapId!;
      assertExists(newMapId, "Expected a new map ID for the new user.");
      console.log(`  -> User ${newUser} record created, currentMapId set to: ${userState.currentMapId}`);

      const mapState = await concept.maps.findOne({ _id: newMapId });
      assertExists(mapState, "Map state document should be created for the new map.");
      assertEquals(mapState.ownerId, newUser, "New map's ownerId should be the new user.");
      assertEquals(mapState.isSaved, false, "New map should not be saved initially.");
      console.log(`  -> New map ${newMapId} created with ownerId: ${mapState.ownerId}, isSaved: ${mapState.isSaved}`);
    } finally {
      await client?.close();
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  });

  await test.step("Action: Generating a map twice for the same user on the same calendar day fails", async () => {
    try {
      [db, client] = await testDb();
      const concept = new BodyMapGenerationConcept(db);
      const testUser = "testUserGenerateTwice_action" as ID;

      console.log(`\n[Action Test] Generating map twice for user ${testUser} on the same calendar day:`);

      // First generation (via system trigger)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      await concept.dailyGenerationStatus.insertOne({ _id: "dailyGeneration", lastRunDate: yesterday });
      await concept.triggerDailyMapGeneration(); // This creates the user and their first map

      const userState = await concept.users.findOne({ _id: testUser });
      assertExists(userState, "User state should exist after initial generation.");
      const mapId1 = userState.currentMapId!;
      assertExists(mapId1, "User should have a first current map.");
      console.log(`  -> First map generated for ${testUser} with ID: ${mapId1}`);

      // Attempt second generation on the same calendar day
      console.log(`  Attempting to generate a second map for user ${testUser} on the SAME day.`);
      const genResult2 = await concept.generateMap({ user: testUser });
      assert("error" in genResult2, "Expected an error when generating a second map on the same day.");
      assertExists(genResult2.error);
      assert(genResult2.error.includes("Map generation already occurred for user"), "Error message should indicate map already generated today.");
      console.log(`  -> Error received (as expected): "${genResult2.error}"`);

      // Verify user's current map and saved maps remain unchanged
      const userStateAfterAttempt = await concept.users.findOne({ _id: testUser });
      assertEquals(userStateAfterAttempt?.currentMapId, mapId1, "User's current map should still be the first map.");

      const savedMaps = await concept._getSavedMaps({ user: testUser });
      assert("maps" in savedMaps);
      assertEquals(savedMaps.maps.length, 0, "No maps should be saved yet if only one was generated and it's current.");
      console.log(`  -> Verified user's state remains consistent: current map is still ${mapId1}, no saved maps.`);

    } finally {
      await client?.close();
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  });


  await test.step("Action: Saving a map fails if user has no current map", async () => {
    try {
      [db, client] = await testDb();
      const concept = new BodyMapGenerationConcept(db);
      const userWithoutMap = "noCurrentMapUser_action" as ID;

      console.log(
        `\n[Action Test] Saving a map for user ${userWithoutMap} without a current map:`,
      );

      // Attempt to save map for user with no existing record
      console.log(
        "  Attempting to save a map for a user that does not yet exist.",
      );
      const saveResult1 = await concept.saveMap({ user: userWithoutMap });
      assert(
        "error" in saveResult1,
        "Expected an error when saving for a non-existent user.",
      );
      assertExists(saveResult1.error);
      assert(
        saveResult1.error.includes("does not have a current map to save"),
        "Error message should indicate no current map.",
      );
      console.log(`  -> Error received (as expected): "${saveResult1.error}"`);

      // Create user (via system trigger), clear map (currentMapId becomes null)
      console.log(
        "  Creating user via daily trigger, then clearing its map to set currentMapId to null.",
      );
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      await concept.dailyGenerationStatus.insertOne({ _id: "dailyGeneration", lastRunDate: yesterday });
      await concept.triggerDailyMapGeneration(); // This creates userWithoutMap and its map
      await concept.clearMap({ user: userWithoutMap }); // Clears the map, setting currentMapId to null

      const userStateAfterClear = await concept.users.findOne({
        _id: userWithoutMap,
      });
      assertEquals(
        userStateAfterClear?.currentMapId,
        null,
        "User's currentMapId should be null after clearing.",
      );
      console.log(
        `  -> User ${userWithoutMap} now exists, but currentMapId is: ${userStateAfterClear?.currentMapId}`,
      );

      // Attempt to save map for user with null currentMapId
      console.log(
        "  Attempting to save a map for a user with an explicitly null currentMapId.",
      );
      const saveResult2 = await concept.saveMap({ user: userWithoutMap });
      assert(
        "error" in saveResult2,
        "Expected an error when saving for a user with null currentMapId.",
      );
      assertExists(saveResult2.error);
      assert(
        saveResult2.error.includes("does not have a current map to save"),
        "Error message should indicate no current map.",
      );
      console.log(`  -> Error received (as expected): "${saveResult2.error}"`);
    } finally {
      await client?.close();
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  });

  await test.step("Action: Clearing a map fails if user has no current map", async () => {
    try {
      [db, client] = await testDb();
      const concept = new BodyMapGenerationConcept(db);
      const userWithoutMap = "noCurrentMapClearUser_action" as ID;

      console.log(
        `\n[Action Test] Clearing a map for user ${userWithoutMap} without a current map:`,
      );

      // Attempt to clear map for user with no existing record
      console.log(
        "  Attempting to clear a map for a user that does not yet exist.",
      );
      const clearResult1 = await concept.clearMap({ user: userWithoutMap });
      assert(
        "error" in clearResult1,
        "Expected an error when clearing for a non-existent user.",
      );
      assertExists(clearResult1.error);
      assert(
        clearResult1.error.includes("does not have a current map to clear"),
        "Error message should indicate no current map.",
      );
      console.log(`  -> Error received (as expected): "${clearResult1.error}"`);

      // Create user (via system trigger), then clear it (currentMapId becomes null)
      console.log(
        "  Creating user via daily trigger, then performing a valid clear operation.",
      );
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      await concept.dailyGenerationStatus.insertOne({ _id: "dailyGeneration", lastRunDate: yesterday });
      await concept.triggerDailyMapGeneration(); // This creates userWithoutMap and its map
      const clearResult2 = await concept.clearMap({ user: userWithoutMap }); // This call makes currentMapId null
      assert(
        !("error" in clearResult2),
        "Initial clear operation should succeed to set currentMapId to null.",
      );
      const userStateAfterClear = await concept.users.findOne({
        _id: userWithoutMap,
      });
      assertEquals(
        userStateAfterClear?.currentMapId,
        null,
        "User's currentMapId should be null after initial clear.",
      );
      console.log(
        `  -> User ${userWithoutMap} now exists, currentMapId is null.`,
      );

      // Attempt to clear map again for user with null currentMapId
      console.log(
        "  Attempting to clear a map again for a user with null currentMapId.",
      );
      const clearResult3 = await concept.clearMap({ user: userWithoutMap });
      assert(
        "error" in clearResult3,
        "Expected an error when clearing for a user with null currentMapId.",
      );
      assertExists(clearResult3.error);
      assert(
        clearResult3.error.includes("does not have a current map to clear"),
        "Error message should indicate no current map.",
      );
      console.log(`  -> Error received (as expected): "${clearResult3.error}"`);
    } finally {
      await client?.close();
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  });

  await test.step("Action: Daily map generation fails if run twice on the same calendar day", async () => {
    try {
      [db, client] = await testDb();
      const concept = new BodyMapGenerationConcept(db);
      const testUser = "userForDailyGenCheck_action" as ID;

      console.log(
        `\n[Action Test] Daily map generation cannot run twice on the same calendar day:`,
      );

      // Ensure a user exists so the trigger has something to do
      // This is the first map for the user, done via system trigger
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      await concept.dailyGenerationStatus.insertOne({ _id: "dailyGeneration", lastRunDate: yesterday });
      await concept.triggerDailyMapGeneration();
      console.log(`  User ${testUser} created with an initial map via system trigger.`);


      // First run on "today" - this was handled above with the initial setup
      // Simulate setting the status as if it ran today
      await concept.dailyGenerationStatus.updateOne(
        { _id: "dailyGeneration" },
        { $set: { lastRunDate: new Date() } }
      );
      const statusAfterFirstRun = await concept.dailyGenerationStatus.findOne({ _id: "dailyGeneration" });
      assertExists(statusAfterFirstRun);
      assertEquals(
        getMidnight(statusAfterFirstRun.lastRunDate).getTime(),
        getMidnight(new Date()).getTime(),
        "Daily generation status should be updated to today's midnight after first (simulated) run.",
      );
      console.log(`  Simulated first daily trigger for 'today', status updated to: ${statusAfterFirstRun.lastRunDate.toISOString().split('T')[0]}`);

      // Second run on the "same today"
      console.log(
        "  Attempting second daily trigger for 'today'. (Expected to fail)",
      );
      const secondTriggerResult = await concept.triggerDailyMapGeneration();
      assertExists(secondTriggerResult);
      assert(
        "error" in secondTriggerResult,
        "Expected an error for running daily generation twice on the same day.",
      );
      assert(
        secondTriggerResult.error.includes("already run for today"),
        "Error message should indicate 'already run for today'.",
      );
      console.log(
        `  -> Error received on second trigger (as expected): "${secondTriggerResult.error}"`,
      );
    } finally {
      await client?.close();
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  });

  await test.step("Action: Daily map generation runs successfully when no users exist", async () => {
    try {
      [db, client] = await testDb();
      const concept = new BodyMapGenerationConcept(db);

      console.log(
        `\n[Action Test] Daily map generation when no users are registered:`,
      );

      // Manually set dailyGenerationStatus.lastRunDate to *yesterday* to simulate a new day
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      await concept.dailyGenerationStatus.insertOne({
        _id: "dailyGeneration",
        lastRunDate: yesterday,
      });
      console.log(
        `  Simulated daily generation run for yesterday: ${
          yesterday.toISOString().split("T")[0]
        }`,
      );

      // Trigger daily generation
      console.log(
        "  Triggering daily map generation (no users exist in the collection).",
      );
      const triggerResult = await concept.triggerDailyMapGeneration();
      assertExists(triggerResult);
      assert(
        !("error" in triggerResult),
        `Trigger failed unexpectedly even with no users: ${
          JSON.stringify(triggerResult)
        }`,
      );
      console.log("  -> Daily trigger succeeded without errors.");

      // Verify dailyGenerationStatus is updated to today
      const statusAfterDaily = await concept.dailyGenerationStatus.findOne({
        _id: "dailyGeneration",
      });
      assertExists(
        statusAfterDaily,
        "Daily generation status document should exist after running.",
      );
      assertEquals(
        getMidnight(statusAfterDaily.lastRunDate).getTime(),
        getMidnight(new Date()).getTime(),
        "Daily generation lastRunDate should be updated to today's midnight.",
      );
      console.log(
        `  -> Daily generation status updated to: ${
          statusAfterDaily.lastRunDate.toISOString().split("T")[0]
        }`,
      );

      // Verify no users or maps were created/modified because there were no users to begin with
      const allUsers = await concept.users.find({}).toArray();
      assertEquals(
        allUsers.length,
        0,
        "No users should be created if none existed.",
      );
      const allMaps = await concept.maps.find({}).toArray();
      assertEquals(
        allMaps.length,
        0,
        "No maps should be created if no users existed.",
      );
      console.log(
        `  -> Verified no new users (${allUsers.length}) or maps (${allMaps.length}) were created as none existed initially.`,
      );
    } finally {
      await client?.close();
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  });
});
```
