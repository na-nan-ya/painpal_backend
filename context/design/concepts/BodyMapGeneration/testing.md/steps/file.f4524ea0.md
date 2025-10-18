---
timestamp: 'Fri Oct 17 2025 23:20:31 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_232031.038b37e1.md]]'
content_id: f4524ea072ab2a3a24f266f93dfa5c18a373959897605c975acdad6916b1793f
---

# file: src/concepts/BodyMapGeneration/BodyMapGeneration.test.ts

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
        "This test walks through the complete lifecycle for two users, demonstrating system-triggered daily map generation, manual saving, retrieval, and clearing. It also confirms that users cannot generate more than one map per day.\n",
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
      console.log(
        "  Simulating midnight system trigger to generate maps for all users (including new ones).",
      );
      const initialTriggerResult = await concept.triggerDailyMapGeneration();
      assertExists(
        initialTriggerResult,
        "Expected a result from initial daily trigger.",
      );
      assert(
        !("error" in initialTriggerResult),
        `Error during initial daily generation: ${
          JSON.stringify(initialTriggerResult)
        }`,
      );
      console.log(
        "  -> Daily map generation for Day 1 triggered successfully.",
      );

      // Verify User 1's first map and state
      let user1State = await concept.users.findOne({ _id: testUser1Id });
      assertExists(
        user1State,
        "User 1 state should exist after initial generation.",
      );
      user1_firstMapId = user1State.currentMapId!;
      assertExists(user1_firstMapId, "User 1 should have a current map ID.");
      console.log(
        `  -> User ${testUser1Id} created with currentMapId: ${user1_firstMapId}`,
      );

      let map1State = await concept.maps.findOne({ _id: user1_firstMapId });
      assertExists(
        map1State,
        "User 1's first map state document should exist.",
      );
      assertEquals(
        map1State.ownerId,
        testUser1Id,
        "User 1's first map ownerId should match.",
      );
      assertEquals(
        map1State.isSaved,
        false,
        "User 1's first map should not be saved initially.",
      );
      console.log(
        `  -> Map ${user1_firstMapId} details: ownerId=${map1State.ownerId}, isSaved=${map1State.isSaved}`,
      );

      // Verify User 2's first map and state
      let user2State = await concept.users.findOne({ _id: testUser2Id });
      assertExists(
        user2State,
        "User 2 state should exist after initial generation.",
      );
      user2_firstMapId = user2State.currentMapId!;
      assertExists(user2_firstMapId, "User 2 should have a current map ID.");
      console.log(
        `  -> User ${testUser2Id} created with currentMapId: ${user2_firstMapId}`,
      );

      let mapUser2State = await concept.maps.findOne({ _id: user2_firstMapId });
      assertExists(
        mapUser2State,
        "User 2's first map state document should exist.",
      );
      assertEquals(
        mapUser2State.ownerId,
        testUser2Id,
        "User 2's first map ownerId should match.",
      );
      assertEquals(
        mapUser2State.isSaved,
        false,
        "User 2's first map should not be saved initially.",
      );
      console.log(
        `  -> Map ${user2_firstMapId} details: ownerId=${mapUser2State.ownerId}, isSaved=${mapUser2State.isSaved}`,
      );

      // Verify dailyGenerationStatus is updated to today
      let statusAfterInitialRun = await concept.dailyGenerationStatus.findOne({
        _id: "dailyGeneration",
      });
      assertExists(
        statusAfterInitialRun,
        "Daily generation status should exist.",
      );
      assertEquals(
        getMidnight(statusAfterInitialRun.lastRunDate).getTime(),
        getMidnight(new Date()).getTime(),
        "Daily generation lastRunDate should be today's midnight after first run.",
      );
      console.log(
        `  -> Daily generation status updated to: ${
          statusAfterInitialRun.lastRunDate.toISOString().split("T")[0]
        }`,
      );

      // Action: Query Current Map for User 1
      console.log("\n[Principle Step 2] Querying Current Map for User 1:");
      console.log(`  Fetching current map for user: ${testUser1Id}`);
      const currentMapResult1 = await concept._getCurrentMap({
        user: testUser1Id,
      });
      assertExists(currentMapResult1, "Expected a result from _getCurrentMap.");
      assert(
        "map" in currentMapResult1,
        `Error getting current map: ${JSON.stringify(currentMapResult1)}`,
      );
      assertExists(
        currentMapResult1.map,
        "Expected to find a current map for User 1.",
      );
      assertEquals(
        currentMapResult1.map._id,
        user1_firstMapId,
        "Queried current map ID should match User 1's first map ID.",
      );
      assertEquals(
        currentMapResult1.map.isSaved,
        false,
        "Queried current map should still not be saved.",
      );
      console.log(
        `  -> Found current map: ${currentMapResult1.map._id}, isSaved=${currentMapResult1.map.isSaved}`,
      );

      // Action: User 1 Attempts Second Map Generation on Same Day (Fails)
      console.log(
        "\n[Principle Step 3] User 1 Attempts Second Map Generation on Same Day:",
      );
      console.log(
        `  Attempting to generate a second map for user ${testUser1Id} directly (should fail as one was generated today).`,
      );
      const generateAttemptResult = await concept.generateMap({
        user: testUser1Id,
      });
      assert(
        "error" in generateAttemptResult,
        "Expected an error when generating a second map on the same day.",
      );
      assertExists(generateAttemptResult.error);
      assert(
        generateAttemptResult.error.includes(
          "Map generation already occurred for user",
        ),
        "Error message should indicate map already generated today.",
      );
      console.log(
        `  -> Error received (as expected): "${generateAttemptResult.error}"`,
      );

      // Verify User 1's current map remains the same after failed attempt
      user1State = await concept.users.findOne({ _id: testUser1Id });
      assertEquals(
        user1State?.currentMapId,
        user1_firstMapId,
        "User 1's currentMapId should still be the first map after failed generation attempt.",
      );
      map1State = await concept.maps.findOne({ _id: user1_firstMapId });
      assertEquals(
        map1State?.isSaved,
        false,
        "User 1's first map should still not be saved after failed generation attempt.",
      );
      console.log(
        `  -> Verified User 1's current map is still ${user1_firstMapId} and unsaved.`,
      );

      // Action: User 1 Manually Saves Current Map
      console.log("\n[Principle Step 4] User 1 Manually Saving Current Map:");
      console.log(
        `  Attempting to save map ${user1_firstMapId} for user: ${testUser1Id}`,
      );
      const saveResult1 = await concept.saveMap({ user: testUser1Id });
      assertExists(saveResult1, "Expected a result from saveMap.");
      assert(
        !("error" in saveResult1),
        `Error saving map: ${JSON.stringify(saveResult1)}`,
      );
      console.log(`  -> Map ${user1_firstMapId} explicitly saved by User 1.`);

      map1State = await concept.maps.findOne({ _id: user1_firstMapId });
      assertExists(
        map1State,
        "User 1's first map state should still exist after saving.",
      );
      assertEquals(
        map1State.isSaved,
        true,
        "User 1's first map should now be marked as saved.",
      );
      console.log(
        `  -> Verified Map ${user1_firstMapId} isSaved status: ${map1State.isSaved}`,
      );
      user1State = await concept.users.findOne({ _id: testUser1Id });
      assertEquals(
        user1State?.currentMapId,
        user1_firstMapId,
        "User 1's currentMapId should still point to the first map after manual save.",
      );

      // --- Introduce a small delay to help ensure freshID generates a distinct ID ---
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Setup for next daily generation: Set last run date to yesterday (simulating a new day)
      // We need to fetch the current status and update its date.
      const now = new Date();
      const nextYesterday = new Date(now);
      nextYesterday.setDate(now.getDate() - 1); // Set to yesterday's date relative to 'now'
      await concept.dailyGenerationStatus.updateOne(
        { _id: "dailyGeneration" },
        { $set: { lastRunDate: nextYesterday } },
      );
      console.log(
        `\n[Principle Setup] Manually set dailyGenerationStatus to yesterday for Day 2 trigger: ${
          nextYesterday.toISOString().split("T")[0]
        }`,
      );

      // Action: Trigger Daily Map Generation (Day 2 for all users)
      // This will implicitly save current maps for all users (unless already saved), and generate new ones.
      console.log(
        "\n[Principle Step 5] Triggering Daily Map Generation (Day 2):",
      );
      console.log("  Simulating midnight system trigger for the next day.");
      const secondDailyTriggerResult = await concept
        .triggerDailyMapGeneration();
      assertExists(
        secondDailyTriggerResult,
        "Expected a result from second daily trigger.",
      );
      assert(
        !("error" in secondDailyTriggerResult),
        `Error during second daily generation: ${
          JSON.stringify(secondDailyTriggerResult)
        }`,
      );
      console.log(
        "  -> Daily map generation for Day 2 triggered successfully.",
      );

      // Verify User 1's maps after Day 2 generation
      console.log(
        "\n[Principle Step 6] Verifying User 1's State After Day 2 Generation:",
      );
      // User 1's first map was already saved manually.
      map1State = await concept.maps.findOne({ _id: user1_firstMapId });
      assertExists(map1State, "User 1's first map state should still exist.");
      assertEquals(
        map1State.isSaved,
        true,
        "User 1's first map should remain saved.",
      );
      console.log(
        `  -> User 1's Day 1 map (${user1_firstMapId}) remains saved: ${map1State.isSaved}`,
      );

      // User 1 should have a NEW current map for Day 2
      user1State = await concept.users.findOne({ _id: testUser1Id });
      assertExists(
        user1State,
        "User 1 state should exist after Day 2 generation.",
      );
      user1_secondMapId = user1State.currentMapId!;
      assertExists(
        user1_secondMapId,
        "User 1 should have a new second map ID.",
      );
      // Diagnostic logs for failing assertion
      console.log(`[DEBUG] Comparing IDs for User 1:`);
      console.log(`[DEBUG]   user1_firstMapId (Day 1):  ${user1_firstMapId}`);
      console.log(`[DEBUG]   user1_secondMapId (Day 2): ${user1_secondMapId}`);
      assertNotEquals(
        user1_secondMapId,
        user1_firstMapId,
        "User 1's second map ID should be different from first map ID.",
      );
      console.log(`  -> User 1 now has new current map: ${user1_secondMapId}`);

      const map2User1State = await concept.maps.findOne({
        _id: user1_secondMapId,
      });
      assertExists(
        map2User1State,
        "User 1's second map state document should exist.",
      );
      assertEquals(
        map2User1State.ownerId,
        testUser1Id,
        "User 1's second map ownerId should match User 1.",
      );
      assertEquals(
        map2User1State.isSaved,
        false,
        "User 1's second map should not be saved initially.",
      );
      console.log(
        `  -> User 1's new map ${user1_secondMapId} isSaved: ${map2User1State.isSaved}`,
      );

      // Verify User 2's maps after Day 2 generation
      console.log(
        "\n[Principle Step 7] Verifying User 2's State After Day 2 Generation:",
      );
      // User 2's first map should now be saved implicitly
      mapUser2State = await concept.maps.findOne({ _id: user2_firstMapId });
      assertExists(
        mapUser2State,
        "User 2's first map state should still exist.",
      );
      assertEquals(
        mapUser2State.isSaved,
        true,
        "User 2's first map should be saved after daily generation.",
      );
      console.log(
        `  -> User 2's previous current map (${user2_firstMapId}) is now saved: ${mapUser2State.isSaved}`,
      );

      // User 2 should have a NEW current map for Day 2
      user2State = await concept.users.findOne({ _id: testUser2Id });
      assertExists(
        user2State,
        "User 2 state should exist after Day 2 generation.",
      );
      user2_secondMapId = user2State.currentMapId!;
      assertExists(
        user2_secondMapId,
        "User 2 should have a new second map ID.",
      );
      assertNotEquals(
        user2_secondMapId,
        user2_firstMapId,
        "User 2's second map ID should be different from first map ID.",
      );
      console.log(`  -> User 2 now has new current map: ${user2_secondMapId}`);

      const map2User2State = await concept.maps.findOne({
        _id: user2_secondMapId,
      });
      assertExists(
        map2User2State,
        "User 2's second map state document should exist.",
      );
      assertEquals(
        map2User2State.ownerId,
        testUser2Id,
        "User 2's second map ownerId should match User 2.",
      );
      assertEquals(
        map2User2State.isSaved,
        false,
        "User 2's second map should not be saved initially.",
      );
      console.log(
        `  -> User 2's new map ${user2_secondMapId} isSaved: ${map2User2State.isSaved}`,
      );

      // Query Saved Maps for User 1
      console.log("\n[Principle Step 8] Querying Saved Maps for User 1:");
      console.log(`  Fetching all saved maps for user: ${testUser1Id}`);
      const savedMapsResult1 = await concept._getSavedMaps({
        user: testUser1Id,
      });
      assertExists(savedMapsResult1, "Expected a result from _getSavedMaps.");
      assert("maps" in savedMapsResult1);
      assertEquals(
        savedMapsResult1.maps.length,
        1, // User 1 manually saved their Day 1 map. Day 2 trigger didn't save it again.
        "Expected one saved map for User 1 (the first one, manually saved).",
      );
      assertEquals(
        savedMapsResult1.maps[0]._id,
        user1_firstMapId,
        "Saved map ID should be User 1's first map ID.",
      );
      console.log(
        `  -> User 1 has ${savedMapsResult1.maps.length} saved map(s): ${
          savedMapsResult1.maps.map((m) => m._id).join(", ")
        }`,
      );

      // Query Saved Maps for User 2
      console.log("\n[Principle Step 9] Querying Saved Maps for User 2:");
      console.log(`  Fetching all saved maps for user: ${testUser2Id}`);
      const savedMapsResult2 = await concept._getSavedMaps({
        user: testUser2Id,
      });
      assertExists(savedMapsResult2, "Expected a result from _getSavedMaps.");
      assert("maps" in savedMapsResult2);
      assertEquals(
        savedMapsResult2.maps.length,
        1,
        "Expected one saved map for User 2 (the first one, implicitly saved by Day 2 trigger).",
      );
      assertEquals(
        savedMapsResult2.maps[0]._id,
        user2_firstMapId,
        "Saved map ID should be User 2's first map ID.",
      );
      console.log(
        `  -> User 2 has ${savedMapsResult2.maps.length} saved map(s): ${
          savedMapsResult2.maps.map((m) => m._id).join(", ")
        }`,
      );

      // Verify dailyGenerationStatus is updated to today
      console.log(
        "\n[Principle Step 10] Verifying Daily Generation Status Update:",
      );
      const statusAfterDaily = await concept.dailyGenerationStatus.findOne({
        _id: "dailyGeneration",
      });
      assertExists(
        statusAfterDaily,
        "Daily generation status document should exist.",
      );
      assertEquals(
        getMidnight(statusAfterDaily.lastRunDate).getTime(),
        getMidnight(new Date()).getTime(),
        "Daily generation lastRunDate should be today's midnight.",
      );
      console.log(
        `  -> Daily generation last run date updated to: ${
          statusAfterDaily.lastRunDate.toISOString().split("T")[0]
        }`,
      );

      // Action: Clear Current Map for User 1
      console.log("\n[Principle Step 11] Clearing Current Map for User 1:");
      console.log(
        `  Attempting to clear current map ${user1_secondMapId} for user: ${testUser1Id}`,
      );
      const clearResult1 = await concept.clearMap({ user: testUser1Id });
      assertExists(clearResult1, "Expected a result from clearMap.");
      assert(
        !("error" in clearResult1),
        `Error clearing map: ${JSON.stringify(clearResult1)}`,
      );
      console.log(`  -> Current map for User 1 cleared.`);

      user1State = await concept.users.findOne({ _id: testUser1Id });
      assertExists(
        user1State,
        "User 1 state should still exist after clearing map.",
      );
      assertEquals(
        user1State.currentMapId,
        null,
        "User 1's currentMapId should be null after clearing.",
      );
      console.log(
        `  -> User ${testUser1Id} currentMapId is now: ${user1State.currentMapId}`,
      );

      const mapUser1AfterClear = await concept.maps.findOne({
        _id: user1_secondMapId,
      });
      assertEquals(
        mapUser1AfterClear,
        null,
        "User 1's second map should be deleted after clearing.",
      );
      console.log(
        `  -> Verified map ${user1_secondMapId} is deleted from the maps collection.`,
      );

      // Querying current map should now return null
      const currentMapResultAfterClear = await concept._getCurrentMap({
        user: testUser1Id,
      });
      assertExists(currentMapResultAfterClear);
      assert("map" in currentMapResultAfterClear);
      assertEquals(
        currentMapResultAfterClear.map,
        null,
        "No current map should be found for User 1 after clearing.",
      );
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

      console.log(
        `\n[Action Test] System generates map for new user ${newUser}:`,
      );

      // Setup for initial daily generation: Set last run date to yesterday
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

      console.log(
        `  Triggering daily map generation to create the first map for new user.`,
      );
      const triggerResult = await concept.triggerDailyMapGeneration();
      assert(
        !("error" in triggerResult),
        `Trigger failed: ${JSON.stringify(triggerResult)}`,
      );

      const userState = await concept.users.findOne({ _id: newUser });
      assertExists(userState, "User state should be created for the new user.");
      const newMapId = userState.currentMapId!;
      assertExists(newMapId, "Expected a new map ID for the new user.");
      console.log(
        `  -> User ${newUser} record created, currentMapId set to: ${userState.currentMapId}`,
      );

      const mapState = await concept.maps.findOne({ _id: newMapId });
      assertExists(
        mapState,
        "Map state document should be created for the new map.",
      );
      assertEquals(
        mapState.ownerId,
        newUser,
        "New map's ownerId should be the new user.",
      );
      assertEquals(
        mapState.isSaved,
        false,
        "New map should not be saved initially.",
      );
      console.log(
        `  -> New map ${newMapId} created with ownerId: ${mapState.ownerId}, isSaved: ${mapState.isSaved}`,
      );
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

      console.log(
        `\n[Action Test] Generating map twice for user ${testUser} on the same calendar day:`,
      );

      // A user must be added to the 'users' collection for triggerDailyMapGeneration to find and process them.
      await concept.users.insertOne({ _id: testUser, currentMapId: null });
      console.log(
        `  Initialized user ${testUser} with no current map for initial daily generation.`,
      );

      // First generation (via system trigger)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      await concept.dailyGenerationStatus.insertOne({
        _id: "dailyGeneration",
        lastRunDate: yesterday,
      });
      await concept.triggerDailyMapGeneration(); // This creates the user's first map
      console.log(
        `  User ${testUser} received an initial map via system trigger.`,
      );

      const userState = await concept.users.findOne({ _id: testUser });
      assertExists(
        userState,
        "User state should exist after initial generation.",
      );
      const mapId1 = userState.currentMapId!;
      assertExists(mapId1, "User should have a first current map.");
      console.log(
        `  -> First map generated for ${testUser} with ID: ${mapId1}`,
      );

      // Attempt second generation on the same calendar day
      console.log(
        `  Attempting to generate a second map for user ${testUser} on the SAME day.`,
      );
      const genResult2 = await concept.generateMap({ user: testUser });
      assert(
        "error" in genResult2,
        "Expected an error when generating a second map on the same day.",
      );
      assertExists(genResult2.error);
      assert(
        genResult2.error.includes("Map generation already occurred for user"),
        "Error message should indicate map already generated today.",
      );
      console.log(`  -> Error received (as expected): "${genResult2.error}"`);

      // Verify user's current map and saved maps remain unchanged
      const userStateAfterAttempt = await concept.users.findOne({
        _id: testUser,
      });
      assertEquals(
        userStateAfterAttempt?.currentMapId,
        mapId1,
        "User's current map should still be the first map.",
      );

      const savedMaps = await concept._getSavedMaps({ user: testUser });
      assert("maps" in savedMaps);
      assertEquals(
        savedMaps.maps.length,
        0,
        "No maps should be saved yet if only one was generated and it's current.",
      );
      console.log(
        `  -> Verified user's state remains consistent: current map is still ${mapId1}, no saved maps.`,
      );
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

      // Create user (via system trigger), then clear map (currentMapId becomes null)
      console.log(
        "  Creating user via daily trigger, then clearing its map to set currentMapId to null.",
      );
      // User must exist for triggerDailyMapGeneration to process them
      await concept.users.insertOne({
        _id: userWithoutMap,
        currentMapId: null,
      });
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      await concept.dailyGenerationStatus.insertOne({
        _id: "dailyGeneration",
        lastRunDate: yesterday,
      });
      await concept.triggerDailyMapGeneration(); // This creates userWithoutMap's map
      await concept.clearMap({ user: userWithoutMap }); // Clears the map, setting currentMapId to null

      const userStateAfterClear = await concept.users.findOne({
        _id: userWithoutMap,
      });
      assertExists(
        userStateAfterClear,
        "User state should exist and not be deleted after clearing map.",
      ); // Ensure user record still exists
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
      // User must exist for triggerDailyMapGeneration to process them
      await concept.users.insertOne({
        _id: userWithoutMap,
        currentMapId: null,
      });
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      await concept.dailyGenerationStatus.insertOne({
        _id: "dailyGeneration",
        lastRunDate: yesterday,
      });
      await concept.triggerDailyMapGeneration(); // This creates userWithoutMap's map
      const clearResult2 = await concept.clearMap({ user: userWithoutMap }); // This call makes currentMapId null
      assert(
        !("error" in clearResult2),
        `Initial clear operation should succeed to set currentMapId to null. Error: ${
          JSON.stringify(clearResult2)
        }`,
      );
      const userStateAfterClear = await concept.users.findOne({
        _id: userWithoutMap,
      });
      assertExists(
        userStateAfterClear,
        "User state should exist and not be deleted after clearing map.",
      ); // Ensure user record still exists
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
      await concept.users.insertOne({ _id: testUser, currentMapId: null });
      console.log(
        `  Initialized user ${testUser} with no current map for initial daily generation.`,
      );

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      await concept.dailyGenerationStatus.insertOne({
        _id: "dailyGeneration",
        lastRunDate: yesterday,
      });
      await concept.triggerDailyMapGeneration();
      console.log(
        `  User ${testUser} created with an initial map via system trigger.`,
      );

      // First run on "today" - this was handled above with the initial setup
      // Simulate setting the status as if it ran today
      await concept.dailyGenerationStatus.updateOne(
        { _id: "dailyGeneration" },
        { $set: { lastRunDate: new Date() } },
      );
      const statusAfterFirstRun = await concept.dailyGenerationStatus.findOne({
        _id: "dailyGeneration",
      });
      assertExists(statusAfterFirstRun);
      assertEquals(
        getMidnight(statusAfterFirstRun.lastRunDate).getTime(),
        getMidnight(new Date()).getTime(),
        "Daily generation status should be updated to today's midnight after first (simulated) run.",
      );
      console.log(
        `  Simulated first daily trigger for 'today', status updated to: ${
          statusAfterFirstRun.lastRunDate.toISOString().split("T")[0]
        }`,
      );

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
