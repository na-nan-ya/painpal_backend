---
timestamp: 'Fri Oct 17 2025 21:25:38 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_212538.8c626296.md]]'
content_id: 247640dc668db3ea17e0af8c184689ee173f2e39e8dee6a0d6bca72cfd8ef3d2
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
      [db, client] = await testDb();
      const concept = new BodyMapGenerationConcept(db);

      const testUser1Id = "user123_principle" as ID;
      const testUser2Id = "user456_principle" as ID;

      let firstMapId: ID;
      let secondMapId: ID;
      let user1_thirdMapId: ID;
      let user2_firstMapId: ID;
      let user2_secondMapId: ID;

      // Action: Initial Map Generation for User 1
      console.log("Principle: Generating first map for User 1");
      const generateResult1 = await concept.generateMap({ user: testUser1Id });
      assertExists(generateResult1, "Expected a result from first generateMap");
      assert(
        "mapId" in generateResult1,
        `Error generating map: ${JSON.stringify(generateResult1)}`,
      );
      firstMapId = generateResult1.mapId;
      assertExists(firstMapId, "Expected firstMapId to be defined");

      let user1State = await concept.users.findOne({ _id: testUser1Id });
      assertExists(
        user1State,
        "User 1 state should exist after first generation",
      );
      assertEquals(
        user1State.currentMapId,
        firstMapId,
        "User 1's currentMapId should be the first generated map",
      );

      let map1State = await concept.maps.findOne({ _id: firstMapId });
      assertExists(map1State, "First map state should exist");
      assertEquals(
        map1State.ownerId,
        testUser1Id,
        "First map ownerId should match User 1",
      );
      assertEquals(
        map1State.isSaved,
        false,
        "First map should not be saved initially",
      );

      // Action: Query Current Map for User 1
      console.log("Principle: Querying current map for User 1");
      const currentMapResult1 = await concept._getCurrentMap({
        user: testUser1Id,
      });
      assertExists(currentMapResult1);
      assert(
        "map" in currentMapResult1,
        `Error getting current map: ${JSON.stringify(currentMapResult1)}`,
      );
      assertExists(
        currentMapResult1.map,
        "Expected to find a current map for User 1",
      );
      assertEquals(
        currentMapResult1.map._id,
        firstMapId,
        "Queried current map ID should match first map ID",
      );
      assertEquals(
        currentMapResult1.map.isSaved,
        false,
        "Queried current map should not be saved",
      );

      // Action: Save Current Map for User 1
      console.log("Principle: Saving current map for User 1");
      const saveResult1 = await concept.saveMap({ user: testUser1Id });
      assertExists(saveResult1);
      assert(
        !("error" in saveResult1),
        `Error saving map: ${JSON.stringify(saveResult1)}`,
      );

      map1State = await concept.maps.findOne({ _id: firstMapId });
      assertExists(
        map1State,
        "First map state should still exist after saving",
      );
      assertEquals(map1State.isSaved, true, "First map should now be saved");
      user1State = await concept.users.findOne({ _id: testUser1Id });
      assertEquals(
        user1State?.currentMapId,
        firstMapId,
        "User 1's currentMapId should still point to the first map after manual save",
      );

      // Action: Generate Second Map for User 1 (same day, implicitly saves the previous)
      console.log("Principle: Generating second map for User 1");
      const generateResult2 = await concept.generateMap({ user: testUser1Id });
      assertExists(generateResult2);
      assert(
        "mapId" in generateResult2,
        `Error generating second map: ${JSON.stringify(generateResult2)}`,
      );
      secondMapId = generateResult2.mapId;
      assertExists(secondMapId, "Expected secondMapId to be defined");
      assertNotEquals(
        secondMapId,
        firstMapId,
        "Second map ID should be different from first map ID",
      );

      user1State = await concept.users.findOne({ _id: testUser1Id });
      assertExists(
        user1State,
        "User 1 state should exist after second generation",
      );
      assertEquals(
        user1State.currentMapId,
        secondMapId,
        "User 1's currentMapId should be the second generated map",
      );

      const map2State = await concept.maps.findOne({ _id: secondMapId });
      assertExists(map2State, "Second map state should exist");
      assertEquals(
        map2State.ownerId,
        testUser1Id,
        "Second map ownerId should match User 1",
      );
      assertEquals(
        map2State.isSaved,
        false,
        "Second map should not be saved initially",
      );

      // Verify that the first map is now saved because a new one was generated
      map1State = await concept.maps.findOne({ _id: firstMapId });
      assertExists(map1State, "First map state should still exist");
      assertEquals(
        map1State.isSaved,
        true,
        "First map should implicitly be saved after second generation",
      );

      // Action: Query Saved Maps for User 1
      console.log("Principle: Querying saved maps for User 1");
      const savedMapsResult1 = await concept._getSavedMaps({
        user: testUser1Id,
      });
      assertExists(savedMapsResult1);
      assert("maps" in savedMapsResult1);
      assertEquals(
        savedMapsResult1.maps.length,
        1,
        "Expected only one map saved for User 1 (the first one)",
      );
      assertEquals(
        savedMapsResult1.maps[0]._id,
        firstMapId,
        "Saved map ID should be the first map ID",
      );
      assertEquals(
        savedMapsResult1.maps[0].isSaved,
        true,
        "Saved map should be marked as saved",
      );

      // Setup for Daily Generation: Generate a map for User 2
      console.log("Principle: Generating map for User 2 for daily gen setup");
      const generateResultUser2 = await concept.generateMap({
        user: testUser2Id,
      });
      assertExists(generateResultUser2);
      assert(
        "mapId" in generateResultUser2,
        `Error generating map for User 2: ${
          JSON.stringify(generateResultUser2)
        }`,
      );
      user2_firstMapId = generateResultUser2.mapId;
      assertExists(user2_firstMapId, "Expected user2_firstMapId to be defined");

      const user2State = await concept.users.findOne({ _id: testUser2Id });
      assertExists(user2State, "User 2 state should exist");
      assertEquals(
        user2State.currentMapId,
        user2_firstMapId,
        "User 2's currentMapId should be its first map",
      );
      const user2MapState = await concept.maps.findOne({
        _id: user2_firstMapId,
      });
      assertExists(user2MapState, "User 2's first map state should exist");
      assertEquals(
        user2MapState.isSaved,
        false,
        "User 2's first map should not be saved initially",
      );

      // Manually set dailyGenerationStatus.lastRunDate to *yesterday* to simulate a new day for the trigger
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1); // Set to yesterday's date
      await concept.dailyGenerationStatus.insertOne({
        _id: "dailyGeneration",
        lastRunDate: yesterday,
      });
      console.log(
        `Principle: Manually set dailyGenerationStatus to yesterday: ${yesterday.toISOString()}`,
      );

      // Action: Trigger Daily Map Generation
      console.log("Principle: Triggering daily map generation");
      const triggerResult = await concept.triggerDailyMapGeneration();
      assertExists(triggerResult);
      assert(
        !("error" in triggerResult),
        `Error triggering daily generation: ${JSON.stringify(triggerResult)}`,
      );
      console.log("Principle: Daily map generation triggered successfully.");

      // Verify User 1's maps after daily generation
      console.log("Principle: Verifying User 1's state after daily generation");
      // User 1's second map should now be saved (due to daily generation creating a new one)
      const map2StateAfterDaily = await concept.maps.findOne({
        _id: secondMapId,
      });
      assertExists(map2StateAfterDaily, "Second map state should still exist");
      assertEquals(
        map2StateAfterDaily.isSaved,
        true,
        "User 1's second map should be saved after daily generation",
      );

      // User 1 should have a NEW current map
      user1State = await concept.users.findOne({ _id: testUser1Id });
      assertExists(
        user1State,
        "User 1 state should exist after daily generation",
      );
      user1_thirdMapId = user1State.currentMapId!;
      assertExists(user1_thirdMapId, "User 1 should have a new third map ID");
      assertNotEquals(
        user1_thirdMapId,
        secondMapId,
        "User 1's third map ID should be different from second map ID",
      );

      const map3User1State = await concept.maps.findOne({
        _id: user1_thirdMapId,
      });
      assertExists(map3User1State, "User 1's third map state should exist");
      assertEquals(
        map3User1State.ownerId,
        testUser1Id,
        "User 1's third map ownerId should match User 1",
      );
      assertEquals(
        map3User1State.isSaved,
        false,
        "User 1's third map should not be saved initially",
      );

      // Query saved maps for User 1 again
      const savedMapsUser1AfterDaily = await concept._getSavedMaps({
        user: testUser1Id,
      });
      assertExists(savedMapsUser1AfterDaily);
      assert("maps" in savedMapsUser1AfterDaily);
      assertEquals(
        savedMapsUser1AfterDaily.maps.length,
        2,
        "User 1 should now have two saved maps",
      );
      assert(
        savedMapsUser1AfterDaily.maps.some((m) => m._id === firstMapId),
        "First map should be in saved list",
      );
      assert(
        savedMapsUser1AfterDaily.maps.some((m) => m._id === secondMapId),
        "Second map should be in saved list",
      );

      // Verify User 2's maps after daily generation
      console.log("Principle: Verifying User 2's state after daily generation");
      // User 2's first map should now be saved
      const user2MapStateAfterDaily = await concept.maps.findOne({
        _id: user2_firstMapId,
      });
      assertExists(
        user2MapStateAfterDaily,
        "User 2's first map state should still exist",
      );
      assertEquals(
        user2MapStateAfterDaily.isSaved,
        true,
        "User 2's first map should be saved after daily generation",
      );

      // User 2 should have a NEW current map
      const user2StateAfterDaily = await concept.users.findOne({
        _id: testUser2Id,
      });
      assertExists(
        user2StateAfterDaily,
        "User 2 state should exist after daily generation",
      );
      user2_secondMapId = user2StateAfterDaily.currentMapId!;
      assertExists(user2_secondMapId, "User 2 should have a new second map ID");
      assertNotEquals(
        user2_secondMapId,
        user2_firstMapId,
        "User 2's second map ID should be different from first map ID",
      );

      const map2User2State = await concept.maps.findOne({
        _id: user2_secondMapId,
      });
      assertExists(map2User2State, "User 2's second map state should exist");
      assertEquals(
        map2User2State.ownerId,
        testUser2Id,
        "User 2's second map ownerId should match User 2",
      );
      assertEquals(
        map2User2State.isSaved,
        false,
        "User 2's second map should not be saved initially",
      );

      // Query saved maps for User 2 again
      const savedMapsUser2AfterDaily = await concept._getSavedMaps({
        user: testUser2Id,
      });
      assertExists(savedMapsUser2AfterDaily);
      assert("maps" in savedMapsUser2AfterDaily);
      assertEquals(
        savedMapsUser2AfterDaily.maps.length,
        1,
        "User 2 should now have one saved map",
      );
      assert(
        savedMapsUser2AfterDaily.maps.some((m) => m._id === user2_firstMapId),
        "User 2's first map should be in saved list",
      );

      // Verify dailyGenerationStatus is updated to today
      const statusAfterDaily = await concept.dailyGenerationStatus.findOne({
        _id: "dailyGeneration",
      });
      assertExists(statusAfterDaily, "Daily generation status should exist");
      assertEquals(
        getMidnight(statusAfterDaily.lastRunDate).getTime(),
        getMidnight(new Date()).getTime(),
        "Daily generation lastRunDate should be today's midnight",
      );

      // Action: Clear Current Map for User 1
      console.log("Principle: Clearing current map for User 1");
      const clearResult1 = await concept.clearMap({ user: testUser1Id });
      assertExists(clearResult1);
      assert(
        !("error" in clearResult1),
        `Error clearing map: ${JSON.stringify(clearResult1)}`,
      );

      user1State = await concept.users.findOne({ _id: testUser1Id });
      assertExists(
        user1State,
        "User 1 state should still exist after clearing map",
      );
      assertEquals(
        user1State.currentMapId,
        null,
        "User 1's currentMapId should be null after clearing",
      );

      const map3User1StateAfterClear = await concept.maps.findOne({
        _id: user1_thirdMapId,
      });
      assertEquals(
        map3User1StateAfterClear,
        null,
        "User 1's third map should be deleted after clearing",
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
        "No current map should be found for User 1 after clearing",
      );
    } finally {
      await client?.close();
    }
  });

  await test.step("Action: Generating a map for a new user correctly initializes their state", async () => {
    try {
      [db, client] = await testDb();
      const concept = new BodyMapGenerationConcept(db);
      const newUser = "newUser1_action" as ID;

      const generateResult = await concept.generateMap({ user: newUser });
      assert(
        "mapId" in generateResult,
        `Error generating map: ${JSON.stringify(generateResult)}`,
      );
      const newMapId = generateResult.mapId;
      assertExists(newMapId, "Expected a new map ID for the new user");

      const userState = await concept.users.findOne({ _id: newUser });
      assertExists(userState, "User state should be created for the new user");
      assertEquals(
        userState.currentMapId,
        newMapId,
        "New user's currentMapId should point to the generated map",
      );

      const mapState = await concept.maps.findOne({ _id: newMapId });
      assertExists(mapState, "Map state should be created for the new map");
      assertEquals(
        mapState.ownerId,
        newUser,
        "New map's ownerId should be the new user",
      );
      assertEquals(
        mapState.isSaved,
        false,
        "New map should not be saved initially",
      );
    } finally {
      await client?.close();
    }
  });

  await test.step("Action: Generating a map twice for the same user on the same day updates current and saves previous", async () => {
    try {
      [db, client] = await testDb();
      const concept = new BodyMapGenerationConcept(db);
      const testUser = "testUserGenerateTwice_action" as ID;

      // First generation
      const genResult1 = await concept.generateMap({ user: testUser });
      assert(
        "mapId" in genResult1,
        `Error generating first map: ${JSON.stringify(genResult1)}`,
      );
      const mapId1 = genResult1.mapId;

      let userState = await concept.users.findOne({ _id: testUser });
      assertEquals(
        userState?.currentMapId,
        mapId1,
        "User's current map should be the first generated map",
      );
      let mapState1 = await concept.maps.findOne({ _id: mapId1 });
      assertEquals(
        mapState1?.isSaved,
        false,
        "First map should not be saved initially",
      );

      // Second generation immediately after (same day)
      const genResult2 = await concept.generateMap({ user: testUser });
      assert(
        "mapId" in genResult2,
        `Error generating second map: ${JSON.stringify(genResult2)}`,
      );
      const mapId2 = genResult2.mapId;
      assertNotEquals(
        mapId1,
        mapId2,
        "Second generated map ID should be different from the first",
      );

      userState = await concept.users.findOne({ _id: testUser });
      assertEquals(
        userState?.currentMapId,
        mapId2,
        "User's current map should be updated to the second generated map",
      );

      mapState1 = await concept.maps.findOne({ _id: mapId1 });
      assertEquals(
        mapState1?.isSaved,
        true,
        "Previous map (mapId1) should be saved after new map generation",
      );

      const mapState2 = await concept.maps.findOne({ _id: mapId2 });
      assertEquals(
        mapState2?.isSaved,
        false,
        "Newly generated map (mapId2) should not be saved",
      );

      const savedMaps = await concept._getSavedMaps({ user: testUser });
      assert("maps" in savedMaps);
      assertEquals(
        savedMaps.maps.length,
        1,
        "Expected only the first map to be in the saved list",
      );
      assertEquals(
        savedMaps.maps[0]._id,
        mapId1,
        "The saved map should be the first generated map",
      );
    } finally {
      await client?.close();
    }
  });

  await test.step("Action: Saving a map fails if user has no current map", async () => {
    try {
      [db, client] = await testDb();
      const concept = new BodyMapGenerationConcept(db);
      const userWithoutMap = "noCurrentMapUser_action" as ID;

      // Attempt to save map for user with no existing record
      const saveResult1 = await concept.saveMap({ user: userWithoutMap });
      assert(
        "error" in saveResult1,
        "Expected an error when saving for a non-existent user",
      );
      assertExists(saveResult1.error);
      assert(
        saveResult1.error.includes("does not have a current map to save"),
        "Error message should indicate no current map",
      );

      // Create user, generate map, then clear it (currentMapId becomes null)
      const genResult = await concept.generateMap({ user: userWithoutMap });
      assert("mapId" in genResult);
      const clearResult = await concept.clearMap({ user: userWithoutMap });
      assert(!("error" in clearResult));

      // Attempt to save map for user with null currentMapId
      const saveResult2 = await concept.saveMap({ user: userWithoutMap });
      assert(
        "error" in saveResult2,
        "Expected an error when saving for a user with null currentMapId",
      );
      assertExists(saveResult2.error);
      assert(
        saveResult2.error.includes("does not have a current map to save"),
        "Error message should indicate no current map",
      );
    } finally {
      await client?.close();
    }
  });

  await test.step("Action: Clearing a map fails if user has no current map", async () => {
    try {
      [db, client] = await testDb();
      const concept = new BodyMapGenerationConcept(db);
      const userWithoutMap = "noCurrentMapClearUser_action" as ID;

      // Attempt to clear map for user with no existing record
      const clearResult1 = await concept.clearMap({ user: userWithoutMap });
      assert(
        "error" in clearResult1,
        "Expected an error when clearing for a non-existent user",
      );
      assertExists(clearResult1.error);
      assert(
        clearResult1.error.includes("does not have a current map to clear"),
        "Error message should indicate no current map",
      );

      // Create user, generate map, then clear it (currentMapId becomes null)
      const genResult = await concept.generateMap({ user: userWithoutMap });
      assert("mapId" in genResult);
      const clearResult2 = await concept.clearMap({ user: userWithoutMap }); // This call makes currentMapId null
      assert(!("error" in clearResult2)); // The first clear operation should succeed

      // Attempt to clear map again for user with null currentMapId
      const clearResult3 = await concept.clearMap({ user: userWithoutMap });
      assert(
        "error" in clearResult3,
        "Expected an error when clearing for a user with null currentMapId",
      );
      assertExists(clearResult3.error);
      assert(
        clearResult3.error.includes("does not have a current map to clear"),
        "Error message should indicate no current map",
      );
    } finally {
      await client?.close();
    }
  });

  await test.step("Action: Daily map generation fails if run twice on the same calendar day", async () => {
    try {
      [db, client] = await testDb();
      const concept = new BodyMapGenerationConcept(db);
      const testUser = "userForDailyGenCheck_action" as ID;

      // Ensure a user exists so the trigger has something to do
      await concept.generateMap({ user: testUser });

      // Simulate a previous day's run so the first trigger call is valid for "today"
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      await concept.dailyGenerationStatus.insertOne({
        _id: "dailyGeneration",
        lastRunDate: yesterday,
      });

      // First run on "today"
      const firstTriggerResult = await concept.triggerDailyMapGeneration();
      assertExists(firstTriggerResult);
      assert(
        !("error" in firstTriggerResult),
        `First daily trigger failed: ${JSON.stringify(firstTriggerResult)}`,
      );

      const statusAfterFirstRun = await concept.dailyGenerationStatus.findOne({
        _id: "dailyGeneration",
      });
      assertExists(statusAfterFirstRun);
      assertEquals(
        getMidnight(statusAfterFirstRun.lastRunDate).getTime(),
        getMidnight(new Date()).getTime(),
        "Daily generation status should be updated to today's midnight after first run",
      );

      // Second run on the "same today"
      const secondTriggerResult = await concept.triggerDailyMapGeneration();
      assertExists(secondTriggerResult);
      assert(
        "error" in secondTriggerResult,
        "Expected an error for running daily generation twice on the same day",
      );
      assert(
        secondTriggerResult.error.includes("already run for today"),
        "Error message should indicate already run for today",
      );
    } finally {
      await client?.close();
    }
  });

  await test.step("Action: Daily map generation runs successfully when no users exist", async () => {
    try {
      [db, client] = await testDb();
      const concept = new BodyMapGenerationConcept(db);

      // Manually set dailyGenerationStatus.lastRunDate to *yesterday* to simulate a new day
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      await concept.dailyGenerationStatus.insertOne({
        _id: "dailyGeneration",
        lastRunDate: yesterday,
      });

      // Trigger daily generation
      const triggerResult = await concept.triggerDailyMapGeneration();
      assertExists(triggerResult);
      assert(
        !("error" in triggerResult),
        `Trigger failed even with no users: ${JSON.stringify(triggerResult)}`,
      );

      // Verify dailyGenerationStatus is updated to today
      const statusAfterDaily = await concept.dailyGenerationStatus.findOne({
        _id: "dailyGeneration",
      });
      assertExists(
        statusAfterDaily,
        "Daily generation status should exist after running",
      );
      assertEquals(
        getMidnight(statusAfterDaily.lastRunDate).getTime(),
        getMidnight(new Date()).getTime(),
        "Daily generation lastRunDate should be updated to today's midnight",
      );

      // Verify no users or maps were created/modified because there were no users to begin with
      const allUsers = await concept.users.find({}).toArray();
      assertEquals(
        allUsers.length,
        0,
        "No users should be created if none existed",
      );
      const allMaps = await concept.maps.find({}).toArray();
      assertEquals(
        allMaps.length,
        0,
        "No maps should be created if no users existed",
      );
    } finally {
      await client?.close();
    }
  });
});

```

<!-- # prompt: You are given an example Deno test suite for a LikertSurvey concept implementation. Use it as a model for how to structure and phrase tests — including the principles, action requirements, use of testDb(), assertions (assertEquals, assertNotEquals, etc.), and clean test isolation via client.close(). Now, write a complete Deno test suite for the given PainLocationScoring implementation. Explicitly call generateMap() from BodyMapGeneration and use the result to test PainLocationScoring. Do NOT internally create any maps as a part of PainLocationScoring. 

[@PainLocationScoringTesting](../../background/PainLocationScoringTesting.md)

[@testing-concepts](../../background/testing-concepts.md)

[@LikertSurveyTesting-Example](../LikertSurvey/testing.md)

[@PainLocationScoringImplementation](../../../src/concepts/PainLocationScoring/PainLocationScoringConcept.ts)

[@BodyMapGeneration](../../../src/concepts/BodyMapGeneration/BodyMapGeneration.ts)

# response:

# file: src/painlocationscoring/PainLocationScoringConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import PainLocationScoringConcept from "./PainLocationScoringConcept.ts";
import BodyMapGenerationConcept from "../BodyMapGeneration/BodyMapGeneration.ts";

// Define generic user IDs for testing
const userA = "user:Alice" as ID;
const userB = "user:Bob" as ID;

/**
 * Helper function to simulate the integrated process of generating a map via
 * BodyMapGeneration and then making PainLocationScoringConcept aware of it
 * for its internal ownership validation.
 * This simulates the effect of a synchronization rule where PainLocationScoring
 * becomes aware of maps generated by BodyMapGeneration.
 *
 * @param bodyMapGen The BodyMapGenerationConcept instance.
 * @param painScoreConcept The PainLocationScoringConcept instance.
 * @param user The user ID for whom the map is generated.
 * @returns The ID of the generated map.
 */
async function setupMap(
  bodyMapGen: BodyMapGenerationConcept,
  painScoreConcept: PainLocationScoringConcept,
  user: ID,
): Promise<ID> {
  // 1. Generate map via BodyMapGeneration
  console.log(`\n[SETUP] Generating map for user: ${user}`);
  const generateMapResult = await bodyMapGen.generateMap({ user });
  assertNotEquals("error" in generateMapResult, true, `Map generation for ${user} should succeed.`);
  const { mapId } = generateMapResult as { mapId: ID };
  console.log(`[SETUP] Generated map ID: ${mapId} by BodyMapGeneration.`);

  // 2. Register this map with PainLocationScoring for its internal validation.
  // This uses the _addMapForTesting helper, acting as a mock for a cross-concept sync.
  const registerMapResult = await painScoreConcept._addMapForTesting({ user, map: mapId });
  assertEquals("error" in registerMapResult, false, `[SETUP] Registering map ${mapId} with PainLocationScoring for user ${user} should succeed.`);
  console.log(`[SETUP] Registered map ID: ${mapId} with PainLocationScoring for user: ${user}.`);
  return mapId;
}

Deno.test("Principle: Generate map → add region → score region → delete region → verify state at each step", async () => {
  const [db, client] = await testDb();
  const bodyMapGen = new BodyMapGenerationConcept(db);
  const painScoreConcept = new PainLocationScoringConcept(db);

  try {
    console.log("\n--- Principle Test Start ---");

    // 1. Generate map for User A using BodyMapGeneration
    const mapA = await setupMap(bodyMapGen, painScoreConcept, userA);
    assertExists(mapA, "A map ID should be returned for user A.");
    console.log(`Principle Step 1: Map ${mapA} generated and registered for ${userA}.`);

    // 2. Add a region to User A's map
    const regionName = "Left Knee";
    console.log(`\nPrinciple Step 2: Adding region '${regionName}' to map ${mapA} for user ${userA}.`);
    const addRegionResult = await painScoreConcept.addRegion({ user: userA, map: mapA, regionName });
    assertNotEquals("error" in addRegionResult, true, "addRegion should not fail.");
    const { region: regionA } = addRegionResult as { region: ID };
    assertExists(regionA, "A region ID should be returned.");
    console.log(`Output: New Region ID: ${regionA}`);

    // Verify the region was added
    const regionsAfterAdd = await painScoreConcept._getRegionsForMap({ user: userA, map: mapA });
    assertNotEquals("error" in regionsAfterAdd, true, "_getRegionsForMap should not fail.");
    assertEquals((regionsAfterAdd as Array<any>).length, 1, "There should be exactly one region after adding.");
    assertEquals((regionsAfterAdd as Array<any>)[0]._id, regionA, "The added region's ID should match.");
    assertEquals((regionsAfterAdd as Array<any>)[0].name, regionName, "The added region's name should match.");
    console.log(`Verification: Region ${regionA} successfully added to map ${mapA}.`);

    // 3. Score the region for User A
    const scoreValue = 7;
    console.log(`\nPrinciple Step 3: Scoring region ${regionA} with value ${scoreValue} for user ${userA}.`);
    const scoreRegionResult = await painScoreConcept.scoreRegion({ user: userA, region: regionA, score: scoreValue });
    assertEquals("error" in scoreRegionResult, false, "scoreRegion should succeed.");
    console.log(`Output: Region ${regionA} scored with ${scoreValue}.`);

    // Verify the score
    const scoredRegion = await painScoreConcept._getRegion({ user: userA, region: regionA });
    assertNotEquals("error" in scoredRegion, true, "_getRegion should not fail after scoring.");
    assertEquals((scoredRegion as Array<any>).length, 1, "The scored region should be found.");
    assertEquals((scoredRegion as Array<any>)[0].score, scoreValue, `The region's score should be ${scoreValue}.`);
    console.log(`Verification: Region ${regionA} now has score ${scoreValue}.`);

    // 4. Delete the region for User A
    console.log(`\nPrinciple Step 4: Deleting region ${regionA} for user ${userA}.`);
    const deleteRegionResult = await painScoreConcept.deleteRegion({ user: userA, region: regionA });
    assertEquals("error" in deleteRegionResult, false, "deleteRegion should succeed.");
    console.log(`Output: Region ${regionA} deleted.`);

    // Verify the region is deleted
    const regionsAfterDelete = await painScoreConcept._getRegionsForMap({ user: userA, map: mapA });
    assertNotEquals("error" in regionsAfterDelete, true, "_getRegionsForMap should not fail after deletion attempt.");
    assertEquals((regionsAfterDelete as Array<any>).length, 0, "There should be no regions after deletion.");
    console.log(`Verification: Region ${regionA} successfully deleted from map ${mapA}.`);

    console.log("\n--- Principle Test End ---");
  } finally {
    await client.close();
  }
});

Deno.test("Action: addRegion requirements and effects", async () => {
  const [db, client] = await testDb();
  const bodyMapGen = new BodyMapGenerationConcept(db);
  const painScoreConcept = new PainLocationScoringConcept(db);

  try {
    console.log("\n--- addRegion Action Tests Start ---");

    // Setup: Generate a map for userA and register it with PainLocationScoring
    const mapA = await setupMap(bodyMapGen, painScoreConcept, userA);
    assertExists(mapA, "mapA should be available.");

    // Setup: Generate a map for userB and register it with PainLocationScoring
    const mapB = await setupMap(bodyMapGen, painScoreConcept, userB);
    assertExists(mapB, "mapB should be available.");

    // Test Case 1: Add region to a non-existent map ID
    const nonExistentMap = "map:nonexistent" as ID;
    console.log(`\nAction: Attempting to add region to non-existent map ID: ${nonExistentMap}`);
    const result1 = await painScoreConcept.addRegion({ user: userA, map: nonExistentMap, regionName: "Phantom Limb" });
    assertEquals("error" in result1, true, "Adding a region to a non-existent map should return an error.");
    assertEquals((result1 as { error: string }).error, `Map '${nonExistentMap}' not found for user '${userA}' or user does not own it.`, "Error message for non-existent map mismatch.");
    console.log(`Output: ${JSON.stringify(result1)} (Expected Error)`);

    // Test Case 2: Add region to a map not owned by the specified user
    console.log(`\nAction: User ${userA} attempting to add region to map ${mapB} owned by ${userB}.`);
    const result2 = await painScoreConcept.addRegion({ user: userA, map: mapB, regionName: "Stolen Map Region" });
    assertEquals("error" in result2, true, "Adding a region to another user's map should return an error.");
    assertEquals((result2 as { error: string }).error, `Map '${mapB}' not found for user '${userA}' or user does not own it.`, "Error message for unowned map mismatch.");
    console.log(`Output: ${JSON.stringify(result2)} (Expected Error)`);

    // Test Case 3: Successfully add a region to an owned map
    const regionNameSuccess = "Right Shoulder";
    console.log(`\nAction: User ${userA} successfully adding region '${regionNameSuccess}' to their map ${mapA}.`);
    const successResult = await painScoreConcept.addRegion({ user: userA, map: mapA, regionName: regionNameSuccess });
    assertEquals("error" in successResult, false, "Adding a region to an owned map should succeed.");
    const { region: newRegionId } = successResult as { region: ID };
    assertExists(newRegionId, "A new region ID should be returned on success.");
    console.log(`Output: New Region ID: ${newRegionId}`);

    // Verify effect: The new region exists in the user's map
    const regions = await painScoreConcept._getRegionsForMap({ user: userA, map: mapA });
    assertNotEquals("error" in regions, true, "_getRegionsForMap should not fail.");
    const foundRegion = (regions as Array<any>).find((r) => r._id === newRegionId);
    assertExists(foundRegion, "The newly added region should be found in the map.");
    assertEquals(foundRegion.name, regionNameSuccess, "The name of the added region should match.");
    console.log(`Verification: Region ${newRegionId} found in map ${mapA} for user ${userA}.`);

    console.log("\n--- addRegion Action Tests End ---");
  } finally {
    await client.close();
  }
});

Deno.test("Action: scoreRegion requirements and effects", async () => {
  const [db, client] = await testDb();
  const bodyMapGen = new BodyMapGenerationConcept(db);
  const painScoreConcept = new PainLocationScoringConcept(db);

  try {
    console.log("\n--- scoreRegion Action Tests Start ---");

    // Setup: Generate maps and add regions for userA and userB
    const mapA = await setupMap(bodyMapGen, painScoreConcept, userA);
    const mapB = await setupMap(bodyMapGen, painScoreConcept, userB);

    const addRegionA1Result = await painScoreConcept.addRegion({ user: userA, map: mapA, regionName: "Forehead" });
    const { region: regionA1 } = addRegionA1Result as { region: ID };
    assertExists(regionA1);
    console.log(`Setup: Added region ${regionA1} to map ${mapA} for user ${userA}.`);

    const addRegionB1Result = await painScoreConcept.addRegion({ user: userB, map: mapB, regionName: "Left Ankle" });
    const { region: regionB1 } = addRegionB1Result as { region: ID };
    assertExists(regionB1);
    console.log(`Setup: Added region ${regionB1} to map ${mapB} for user ${userB}.`);

    // Test Case 1: Score a non-existent region ID
    const nonExistentRegion = "region:ghost" as ID;
    console.log(`\nAction: Attempting to score non-existent region ID: ${nonExistentRegion}`);
    const result1 = await painScoreConcept.scoreRegion({ user: userA, region: nonExistentRegion, score: 5 });
    assertEquals("error" in result1, true, "Scoring a non-existent region should return an error.");
    assertEquals((result1 as { error: string }).error, `Region '${nonExistentRegion}' not found or not owned by user '${userA}'.`, "Error message for non-existent region mismatch.");
    console.log(`Output: ${JSON.stringify(result1)} (Expected Error)`);

    // Test Case 2: Score a region not owned by the specified user
    console.log(`\nAction: User ${userA} attempting to score region ${regionB1} owned by ${userB}.`);
    const result2 = await painScoreConcept.scoreRegion({ user: userA, region: regionB1, score: 8 });
    assertEquals("error" in result2, true, "Scoring another user's region should return an error.");
    assertEquals((result2 as { error: string }).error, `Region '${regionB1}' not found or not owned by user '${userA}'.`, "Error message for unowned region mismatch.");
    console.log(`Output: ${JSON.stringify(result2)} (Expected Error)`);

    // Test Case 3: Score with a value less than 1
    console.log(`\nAction: Scoring region ${regionA1} with value 0 (below min).`);
    const result3 = await painScoreConcept.scoreRegion({ user: userA, region: regionA1, score: 0 });
    assertEquals("error" in result3, true, "Scoring with value less than 1 should return an error.");
    assertEquals((result3 as { error: string }).error, "Score must be a number between 1 and 10.", "Error message for score below min mismatch.");
    console.log(`Output: ${JSON.stringify(result3)} (Expected Error)`);

    // Test Case 4: Score with a value greater than 10
    console.log(`\nAction: Scoring region ${regionA1} with value 11 (above max).`);
    const result4 = await painScoreConcept.scoreRegion({ user: userA, region: regionA1, score: 11 });
    assertEquals("error" in result4, true, "Scoring with value greater than 10 should return an error.");
    assertEquals((result4 as { error: string }).error, "Score must be a number between 1 and 10.", "Error message for score above max mismatch.");
    console.log(`Output: ${JSON.stringify(result4)} (Expected Error)`);

    // Test Case 5: Successfully score a region
    const successScore = 6;
    console.log(`\nAction: User ${userA} successfully scoring region ${regionA1} with value ${successScore}.`);
    const successResult = await painScoreConcept.scoreRegion({ user: userA, region: regionA1, score: successScore });
    assertEquals("error" in successResult, false, "Scoring with a valid value on an owned region should succeed.");
    console.log(`Output: ${JSON.stringify(successResult)} (Expected Success)`);

    // Verify effect: The region now has the assigned score
    const scoredRegion = await painScoreConcept._getRegion({ user: userA, region: regionA1 });
    assertNotEquals("error" in scoredRegion, true, "_getRegion should not fail after successful scoring.");
    assertEquals((scoredRegion as Array<any>).length, 1, "The scored region should be found.");
    assertEquals((scoredRegion as Array<any>)[0].score, successScore, `Region ${regionA1}'s score should be ${successScore}.`);
    console.log(`Verification: Region ${regionA1} confirmed with score ${successScore}.`);

    // Test Case 6: Update an existing score
    const updatedScore = 9;
    console.log(`\nAction: User ${userA} updating score for region ${regionA1} to ${updatedScore}.`);
    const updateResult = await painScoreConcept.scoreRegion({ user: userA, region: regionA1, score: updatedScore });
    assertEquals("error" in updateResult, false, "Updating an existing score should succeed.");
    console.log(`Output: ${JSON.stringify(updateResult)} (Expected Success)`);

    // Verify updated score
    const updatedScoredRegion = await painScoreConcept._getRegion({ user: userA, region: regionA1 });
    assertNotEquals("error" in updatedScoredRegion, true, "_getRegion should not fail after updating score.");
    assertEquals((updatedScoredRegion as Array<any>)[0].score, updatedScore, `Region ${regionA1}'s score should be updated to ${updatedScore}.`);
    console.log(`Verification: Region ${regionA1} confirmed updated to score ${updatedScore}.`);

    console.log("\n--- scoreRegion Action Tests End ---");
  } finally {
    await client.close();
  }
});

Deno.test("Action: deleteRegion requirements and effects", async () => {
  const [db, client] = await testDb();
  const bodyMapGen = new BodyMapGenerationConcept(db);
  const painScoreConcept = new PainLocationScoringConcept(db);

  try {
    console.log("\n--- deleteRegion Action Tests Start ---");

    // Setup: Generate maps and add regions for userA and userB
    const mapA = await setupMap(bodyMapGen, painScoreConcept, userA);
    const mapB = await setupMap(bodyMapGen, painScoreConcept, userB);

    const addRegionA1Result = await painScoreConcept.addRegion({ user: userA, map: mapA, regionName: "Right Elbow" });
    const { region: regionA1 } = addRegionA1Result as { region: ID };
    assertExists(regionA1);
    console.log(`Setup: Added region ${regionA1} to map ${mapA} for user ${userA}.`);

    const addRegionA2Result = await painScoreConcept.addRegion({ user: userA, map: mapA, regionName: "Left Wrist" });
    const { region: regionA2 } = addRegionA2Result as { region: ID };
    assertExists(regionA2);
    console.log(`Setup: Added region ${regionA2} to map ${mapA} for user ${userA}.`);


    const addRegionB1Result = await painScoreConcept.addRegion({ user: userB, map: mapB, regionName: "Nose" });
    const { region: regionB1 } = addRegionB1Result as { region: ID };
    assertExists(regionB1);
    console.log(`Setup: Added region ${regionB1} to map ${mapB} for user ${userB}.`);

    // Test Case 1: Delete a non-existent region ID
    const nonExistentRegion = "region:imaginary" as ID;
    console.log(`\nAction: Attempting to delete non-existent region ID: ${nonExistentRegion}`);
    const result1 = await painScoreConcept.deleteRegion({ user: userA, region: nonExistentRegion });
    assertEquals("error" in result1, true, "Deleting a non-existent region should return an error.");
    assertEquals((result1 as { error: string }).error, `Region '${nonExistentRegion}' not found or not owned by user '${userA}'.`, "Error message for non-existent region mismatch.");
    console.log(`Output: ${JSON.stringify(result1)} (Expected Error)`);

    // Test Case 2: Delete a region not owned by the specified user
    console.log(`\nAction: User ${userA} attempting to delete region ${regionB1} owned by ${userB}.`);
    const result2 = await painScoreConcept.deleteRegion({ user: userA, region: regionB1 });
    assertEquals("error" in result2, true, "Deleting another user's region should return an error.");
    assertEquals((result2 as { error: string }).error, `Region '${regionB1}' not found or not owned by user '${userA}'.`, "Error message for unowned region mismatch.");
    console.log(`Output: ${JSON.stringify(result2)} (Expected Error)`);

    // Test Case 3: Successfully delete an owned region
    console.log(`\nAction: User ${userA} successfully deleting region ${regionA1} from their map ${mapA}.`);
    const successResult = await painScoreConcept.deleteRegion({ user: userA, region: regionA1 });
    assertEquals("error" in successResult, false, "Deleting an owned region should succeed.");
    console.log(`Output: ${JSON.stringify(successResult)} (Expected Success)`);

    // Verify effect: The region no longer exists in the user's map
    const regionsAfterDelete = await painScoreConcept._getRegionsForMap({ user: userA, map: mapA });
    assertNotEquals("error" in regionsAfterDelete, true, "_getRegionsForMap should not fail after deletion.");
    assertEquals((regionsAfterDelete as Array<any>).length, 1, "There should be one region left after deleting one.");
    assertEquals((regionsAfterDelete as Array<any>)[0]._id, regionA2, "The remaining region should be regionA2.");
    console.log(`Verification: Region ${regionA1} confirmed deleted. Only ${regionA2} remains.`);

    console.log("\n--- deleteRegion Action Tests End ---");
  } finally {
    await client.close();
  }
});

Deno.test("Integrated Test: Multiple users and maps interact correctly and with proper isolation", async () => {
    const [db, client] = await testDb();
    const bodyMapGen = new BodyMapGenerationConcept(db);
    const painScoreConcept = new PainLocationScoringConcept(db);

    try {
        console.log("\n--- Multiple User/Map Interaction Test Start ---");

        // Setup maps for User A and User B
        const mapA = await setupMap(bodyMapGen, painScoreConcept, userA);
        const mapB = await setupMap(bodyMapGen, painScoreConcept, userB);

        // User A adds regions to their map
        console.log(`\nAction: User ${userA} adding regions to their map ${mapA}`);
        const addRegionA1Result = await painScoreConcept.addRegion({ user: userA, map: mapA, regionName: "Left Hand" });
        const { region: regionA1 } = addRegionA1Result as { region: ID };
        const addRegionA2Result = await painScoreConcept.addRegion({ user: userA, map: mapA, regionName: "Right Hand" });
        const { region: regionA2 } = addRegionA2Result as { region: ID };
        assertExists(regionA1, `Region ${regionA1} should exist.`); assertExists(regionA2, `Region ${regionA2} should exist.`);
        console.log(`Output: User ${userA} added ${regionA1}, ${regionA2}.`);

        // User B adds regions to their map
        console.log(`\nAction: User ${userB} adding regions to their map ${mapB}`);
        const addRegionB1Result = await painScoreConcept.addRegion({ user: userB, map: mapB, regionName: "Left Foot" });
        const { region: regionB1 } = addRegionB1Result as { region: ID };
        assertExists(regionB1, `Region ${regionB1} should exist.`);
        console.log(`Output: User ${userB} added ${regionB1}.`);

        // User A scores their regions
        console.log(`\nAction: User ${userA} scoring their regions.`);
        const scoreA1Result = await painScoreConcept.scoreRegion({ user: userA, region: regionA1, score: 5 });
        assertEquals("error" in scoreA1Result, false, "User A scoring own region should succeed.");
        const scoreA2Result = await painScoreConcept.scoreRegion({ user: userA, region: regionA2, score: 9 });
        assertEquals("error" in scoreA2Result, false, "User A scoring own region should succeed.");
        console.log(`Output: User ${userA} scored ${regionA1} (5), ${regionA2} (9).`);


        // User B scores their region
        console.log(`\nAction: User ${userB} scoring their regions.`);
        const scoreB1Result = await painScoreConcept.scoreRegion({ user: userB, region: regionB1, score: 3 });
        assertEquals("error" in scoreB1Result, false, "User B scoring own region should succeed.");
        console.log(`Output: User ${userB} scored ${regionB1} (3).`);


        // Verify User A's regions and scores
        console.log(`\nVerification: Checking ${userA}'s regions and scores for map ${mapA}.`);
        const userARegions = await painScoreConcept._getRegionsForMap({ user: userA, map: mapA });
        assertNotEquals("error" in userARegions, true, `_getRegionsForMap for ${userA} should not fail.`);
        assertEquals((userARegions as Array<any>).length, 2, `User ${userA} should have 2 regions.`);
        assertEquals((userARegions as Array<any>).find(r => r._id === regionA1)?.score, 5, `Region ${regionA1} score for ${userA} should be 5.`);
        assertEquals((userARegions as Array<any>).find(r => r._id === regionA2)?.score, 9, `Region ${regionA2} score for ${userA} should be 9.`);
        console.log(`Verification: User ${userA} regions verified with correct scores.`);

        // Verify User B's regions and scores
        console.log(`\nVerification: Checking ${userB}'s regions and scores for map ${mapB}.`);
        const userBRegions = await painScoreConcept._getRegionsForMap({ user: userB, map: mapB });
        assertNotEquals("error" in userBRegions, true, `_getRegionsForMap for ${userB} should not fail.`);
        assertEquals((userBRegions as Array<any>).length, 1, `User ${userB} should have 1 region.`);
        assertEquals((userBRegions as Array<any>).find(r => r._id === regionB1)?.score, 3, `Region ${regionB1} score for ${userB} should be 3.`);
        console.log(`Verification: User ${userB} regions verified with correct scores.`);

        // Attempt cross-user modification (should fail)
        console.log(`\nAction: Attempting cross-user modification (User ${userA} tries to score ${userB}'s region ${regionB1}).`);
        const crossScoreResult = await painScoreConcept.scoreRegion({ user: userA, region: regionB1, score: 10 });
        assertEquals("error" in crossScoreResult, true, "User A should not be able to score User B's region.");
        assertEquals((crossScoreResult as { error: string }).error, `Region '${regionB1}' not found or not owned by user '${userA}'.`, "Error message for cross-user scoring mismatch.");
        console.log(`Output: ${JSON.stringify(crossScoreResult)} (Expected Error: User A cannot score User B's region)`);

        console.log("\n--- Multiple User/Map Interaction Test End ---");
    } finally {
        await client.close();
    }
});
``` -->
