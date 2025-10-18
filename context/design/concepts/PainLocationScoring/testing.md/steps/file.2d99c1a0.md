---
timestamp: 'Fri Oct 17 2025 21:14:31 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_211431.be28e382.md]]'
content_id: 2d99c1a054dcdf7868246e5e2ad04e4416727010f64682c80db797ddaf33579c
---

# file: src/concepts/PainLocationScoring/PainLocationScoringConcept.test.ts

```typescript
import {
  assertEquals,
  assertExists,
  assertNotEquals,
  assertArrayIncludes,
  assertStrictEquals,
} from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import PainLocationScoringConcept from "./PainLocationScoringConcept.ts";

// Dummy IDs for testing
const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;
const mapAlice1 = "map:Alice-body-map-1" as ID;
const mapAlice2 = "map:Alice-body-map-2" as ID; // Another map for Alice
const mapBob1 = "map:Bob-body-map-1" as ID; // Map for Bob

Deno.test("Principle: Generate map → add region → score region → delete region → verify state at each step", async (t) => {
  const [db, client] = await testDb();
  const painScoring = new PainLocationScoringConcept(db);

  try {
    console.log("\n--- Principle Test: Pain Location Scoring Lifecycle ---");

    // Step 1: Simulate map generation from an external concept (e.g., BodyMapGeneration)
    // PainLocationScoringConcept uses its own internal collection to track map ownership.
    // For this test, we use a helper to populate this internal state.
    console.log(
      `[SETUP] Simulating map generation for user '${userAlice}' with map ID '${mapAlice1}'.`,
    );
    const addMapResult = await painScoring._addMapForTesting({
      user: userAlice,
      map: mapAlice1,
    });
    assertEquals(
      "error" in addMapResult,
      false,
      "Expected _addMapForTesting to succeed.",
    );

    // Verify map exists for Alice (internal to PainLocationScoring's concept of maps)
    const mapCheck = await painScoring["bodyMaps"].findOne({
      _id: mapAlice1,
      userId: userAlice,
    });
    assertExists(mapCheck, "Map should exist in PainLocationScoring's internal state.");
    console.log(
      `[VERIFY] Map '${mapAlice1}' successfully registered for '${userAlice}'.`,
    );

    // Step 2: Add a new region to the generated map
    const regionName1 = "left knee";
    console.log(
      `[ACTION] User '${userAlice}' adding region '${regionName1}' to map '${mapAlice1}'.`,
    );
    const addRegionResult = await painScoring.addRegion({
      user: userAlice,
      map: mapAlice1,
      regionName: regionName1,
    });
    assertNotEquals("error" in addRegionResult, true, "Adding region should succeed.");
    const { region: region1Id } = addRegionResult as { region: ID };
    assertExists(region1Id, "A new region ID should be returned.");
    console.log(`[OUTPUT] Region '${region1Id}' created.`);

    // Verify the region exists on the map
    const regionsAfterAdd = await painScoring._getRegionsForMap({
      user: userAlice,
      map: mapAlice1,
    });
    assertNotEquals("error" in regionsAfterAdd, true, "Querying regions should succeed.");
    assertArrayIncludes(
      regionsAfterAdd as Array<any>,
      [{ _id: region1Id, mapId: mapAlice1, name: regionName1 }],
      "The newly added region should be present.",
    );
    assertEquals(
      (regionsAfterAdd as Array<any>).length,
      1,
      "Only one region should be present on the map.",
    );
    console.log(
      `[VERIFY] Region '${region1Id}' ('${regionName1}') exists on map '${mapAlice1}'.`,
    );

    // Step 3: Score the added region
    const score1 = 7;
    console.log(
      `[ACTION] User '${userAlice}' scoring region '${region1Id}' with score '${score1}'.`,
    );
    const scoreRegionResult = await painScoring.scoreRegion({
      user: userAlice,
      region: region1Id,
      score: score1,
    });
    assertEquals("error" in scoreRegionResult, false, "Scoring region should succeed.");
    console.log(`[OUTPUT] Region '${region1Id}' scored with ${score1}.`);

    // Verify the score is associated with the region
    const regionAfterScore = await painScoring._getRegion({
      user: userAlice,
      region: region1Id,
    });
    assertNotEquals("error" in regionAfterScore, true, "Querying region should succeed.");
    assertEquals(
      (regionAfterScore as Array<any>)[0]?.score,
      score1,
      `Region '${region1Id}' should have score ${score1}.`,
    );
    console.log(
      `[VERIFY] Region '${region1Id}' now has score ${score1}.`,
    );

    // Step 4: Delete the region
    console.log(
      `[ACTION] User '${userAlice}' deleting region '${region1Id}' from map '${mapAlice1}'.`,
    );
    const deleteRegionResult = await painScoring.deleteRegion({
      user: userAlice,
      region: region1Id,
    });
    assertEquals("error" in deleteRegionResult, false, "Deleting region should succeed.");
    console.log(`[OUTPUT] Region '${region1Id}' deleted.`);

    // Verify the region no longer exists
    const regionsAfterDelete = await painScoring._getRegionsForMap({
      user: userAlice,
      map: mapAlice1,
    });
    assertNotEquals("error" in regionsAfterDelete, true, "Querying regions should succeed.");
    assertEquals(
      (regionsAfterDelete as Array<any>).length,
      0,
      "No regions should be present on the map after deletion.",
    );
    console.log(
      `[VERIFY] Region '${region1Id}' no longer exists on map '${mapAlice1}'.`,
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: addRegion requires an owned map and creates unique regions", async (t) => {
  const [db, client] = await testDb();
  const painScoring = new PainLocationScoringConcept(db);

  try {
    console.log("\n--- Action Test: addRegion ---");

    // Setup: Simulate map generation for userAlice and userBob
    await painScoring._addMapForTesting({ user: userAlice, map: mapAlice1 });
    await painScoring._addMapForTesting({ user: userBob, map: mapBob1 });
    console.log(
      `[SETUP] Maps '${mapAlice1}' (for ${userAlice}) and '${mapBob1}' (for ${userBob}) registered.`,
    );

    await t.step("Fails to add region to a non-existent map", async () => {
      const nonExistentMap = "map:fake-id" as ID;
      console.log(
        `[ACTION] User '${userAlice}' trying to add region to non-existent map '${nonExistentMap}'.`,
      );
      const result = await painScoring.addRegion({
        user: userAlice,
        map: nonExistentMap,
        regionName: "fake part",
      });
      assertEquals("error" in result, true, "Expected an error for non-existent map.");
      assertStrictEquals(
        (result as { error: string }).error,
        `Map '${nonExistentMap}' not found for user '${userAlice}' or user does not own it.`,
      );
      console.log(
        `[OUTPUT] Error: ${(result as { error: string }).error}`,
      );
    });

    await t.step("Fails to add region to a map not owned by the user", async () => {
      const regionName = "head";
      console.log(
        `[ACTION] User '${userAlice}' trying to add region '${regionName}' to map '${mapBob1}' (owned by ${userBob}).`,
      );
      const result = await painScoring.addRegion({
        user: userAlice,
        map: mapBob1,
        regionName: regionName,
      });
      assertEquals(
        "error" in result,
        true,
        "Expected an error for map not owned by user.",
      );
      assertStrictEquals(
        (result as { error: string }).error,
        `Map '${mapBob1}' not found for user '${userAlice}' or user does not own it.`,
      );
      console.log(
        `[OUTPUT] Error: ${(result as { error: string }).error}`,
      );
    });

    await t.step("Allows adding multiple regions with the same name, generating unique IDs", async () => {
      const regionName = "lower back";
      console.log(
        `[ACTION] User '${userAlice}' adding '${regionName}' to map '${mapAlice1}' (first time).`,
      );
      const result1 = await painScoring.addRegion({
        user: userAlice,
        map: mapAlice1,
        regionName: regionName,
      });
      assertNotEquals("error" in result1, true, "First add should succeed.");
      const { region: regionId1 } = result1 as { region: ID };
      assertExists(regionId1);
      console.log(`[OUTPUT] Region '${regionId1}' created for '${regionName}'.`);

      console.log(
        `[ACTION] User '${userAlice}' adding '${regionName}' to map '${mapAlice1}' (second time).`,
      );
      const result2 = await painScoring.addRegion({
        user: userAlice,
        map: mapAlice1,
        regionName: regionName,
      });
      assertNotEquals("error" in result2, true, "Second add should succeed.");
      const { region: regionId2 } = result2 as { region: ID };
      assertExists(regionId2);
      console.log(`[OUTPUT] Region '${regionId2}' created for '${regionName}'.`);

      assertNotEquals(
        regionId1,
        regionId2,
        "Adding duplicate region names should create distinct region IDs.",
      );

      const regions = await painScoring._getRegionsForMap({
        user: userAlice,
        map: mapAlice1,
      });
      assertNotEquals("error" in regions, true, "Querying regions should succeed.");
      assertEquals(
        (regions as Array<any>).length,
        2,
        "Two regions with the same name but different IDs should exist.",
      );
      console.log(
        `[VERIFY] Two distinct regions for '${regionName}' exist: '${regionId1}' and '${regionId2}'.`,
      );
    });
  } finally {
    await client.close();
  }
});

Deno.test("Action: scoreRegion enforces requirements for region ownership and score range", async (t) => {
  const [db, client] = await testDb();
  const painScoring = new PainLocationScoringConcept(db);

  try {
    console.log("\n--- Action Test: scoreRegion ---");

    // Setup: Create a map and a region for userAlice
    await painScoring._addMapForTesting({ user: userAlice, map: mapAlice1 });
    const addRegionResult = await painScoring.addRegion({
      user: userAlice,
      map: mapAlice1,
      regionName: "right shoulder",
    });
    const { region: aliceRegionId } = addRegionResult as { region: ID };
    console.log(
      `[SETUP] Map '${mapAlice1}' and region '${aliceRegionId}' for '${userAlice}' created.`,
    );

    // Setup: Create a map and a region for userBob
    await painScoring._addMapForTesting({ user: userBob, map: mapBob1 });
    const addBobRegionResult = await painScoring.addRegion({
      user: userBob,
      map: mapBob1,
      regionName: "left elbow",
    });
    const { region: bobRegionId } = addBobRegionResult as { region: ID };
    console.log(
      `[SETUP] Map '${mapBob1}' and region '${bobRegionId}' for '${userBob}' created.`,
    );

    await t.step("Succeeds in scoring an owned region with a valid score", async () => {
      const score = 5;
      console.log(
        `[ACTION] User '${userAlice}' scoring region '${aliceRegionId}' with valid score '${score}'.`,
      );
      const result = await painScoring.scoreRegion({
        user: userAlice,
        region: aliceRegionId,
        score: score,
      });
      assertEquals("error" in result, false, "Expected scoring to succeed.");
      console.log(`[OUTPUT] Region '${aliceRegionId}' scored with ${score}.`);

      const scoredRegion = await painScoring._getRegion({
        user: userAlice,
        region: aliceRegionId,
      });
      assertNotEquals("error" in scoredRegion, true, "Querying region should succeed.");
      assertEquals(
        (scoredRegion as Array<any>)[0]?.score,
        score,
        "Region should have the assigned score.",
      );
      console.log(`[VERIFY] Score for '${aliceRegionId}' is ${score}.`);
    });

    await t.step("Allows updating an existing score", async () => {
      const initialScore = 3;
      await painScoring.scoreRegion({
        user: userAlice,
        region: aliceRegionId,
        score: initialScore,
      });
      console.log(
        `[SETUP] Region '${aliceRegionId}' initially scored with ${initialScore}.`,
      );

      const newScore = 9;
      console.log(
        `[ACTION] User '${userAlice}' updating score for '${aliceRegionId}' to '${newScore}'.`,
      );
      const updateResult = await painScoring.scoreRegion({
        user: userAlice,
        region: aliceRegionId,
        score: newScore,
      });
      assertEquals("error" in updateResult, false, "Expected score update to succeed.");
      console.log(`[OUTPUT] Score for '${aliceRegionId}' updated to ${newScore}.`);

      const updatedRegion = await painScoring._getRegion({
        user: userAlice,
        region: aliceRegionId,
      });
      assertNotEquals(
        "error" in updatedRegion,
        true,
        "Querying region should succeed.",
      );
      assertEquals(
        (updatedRegion as Array<any>)[0]?.score,
        newScore,
        "Region score should be updated.",
      );
      console.log(`[VERIFY] Score for '${aliceRegionId}' is now ${newScore}.`);
    });

    await t.step("Fails to score with out-of-bounds values (below 1)", async () => {
      const invalidScore = 0;
      console.log(
        `[ACTION] User '${userAlice}' trying to score '${aliceRegionId}' with invalid score '${invalidScore}'.`,
      );
      const result = await painScoring.scoreRegion({
        user: userAlice,
        region: aliceRegionId,
        score: invalidScore,
      });
      assertEquals("error" in result, true, "Expected an error for score below 1.");
      assertStrictEquals(
        (result as { error: string }).error,
        "Score must be a number between 1 and 10.",
      );
      console.log(
        `[OUTPUT] Error: ${(result as { error: string }).error}`,
      );
    });

    await t.step("Fails to score with out-of-bounds values (above 10)", async () => {
      const invalidScore = 11;
      console.log(
        `[ACTION] User '${userAlice}' trying to score '${aliceRegionId}' with invalid score '${invalidScore}'.`,
      );
      const result = await painScoring.scoreRegion({
        user: userAlice,
        region: aliceRegionId,
        score: invalidScore,
      });
      assertEquals("error" in result, true, "Expected an error for score above 10.");
      assertStrictEquals(
        (result as { error: string }).error,
        "Score must be a number between 1 and 10.",
      );
      console.log(
        `[OUTPUT] Error: ${(result as { error: string }).error}`,
      );
    });

    await t.step("Fails to score a non-existent region", async () => {
      const nonExistentRegion = "region:fake-id" as ID;
      console.log(
        `[ACTION] User '${userAlice}' trying to score non-existent region '${nonExistentRegion}'.`,
      );
      const result = await painScoring.scoreRegion({
        user: userAlice,
        region: nonExistentRegion,
        score: 5,
      });
      assertEquals("error" in result, true, "Expected an error for non-existent region.");
      assertStrictEquals(
        (result as { error: string }).error,
        `Region '${nonExistentRegion}' not found or not owned by user '${userAlice}'.`,
      );
      console.log(
        `[OUTPUT] Error: ${(result as { error: string }).error}`,
      );
    });

    await t.step("Fails to score a region not owned by the user", async () => {
      const score = 8;
      console.log(
        `[ACTION] User '${userAlice}' trying to score region '${bobRegionId}' (owned by ${userBob}).`,
      );
      const result = await painScoring.scoreRegion({
        user: userAlice,
        region: bobRegionId,
        score: score,
      });
      assertEquals(
        "error" in result,
        true,
        "Expected an error for region not owned by user.",
      );
      assertStrictEquals(
        (result as { error: string }).error,
        `Region '${bobRegionId}' not found or not owned by user '${userAlice}'.`,
      );
      console.log(
        `[OUTPUT] Error: ${(result as { error: string }).error}`,
      );
    });
  } finally {
    await client.close();
  }
});

Deno.test("Action: deleteRegion enforces requirements for region ownership", async (t) => {
  const [db, client] = await testDb();
  const painScoring = new PainLocationScoringConcept(db);

  try {
    console.log("\n--- Action Test: deleteRegion ---");

    // Setup: Create maps and regions for userAlice and userBob
    await painScoring._addMapForTesting({ user: userAlice, map: mapAlice1 });
    const addRegionAliceResult = await painScoring.addRegion({
      user: userAlice,
      map: mapAlice1,
      regionName: "neck",
    });
    const { region: aliceRegionId } = addRegionAliceResult as { region: ID };
    console.log(
      `[SETUP] Map '${mapAlice1}' and region '${aliceRegionId}' for '${userAlice}' created.`,
    );

    await painScoring._addMapForTesting({ user: userBob, map: mapBob1 });
    const addRegionBobResult = await painScoring.addRegion({
      user: userBob,
      map: mapBob1,
      regionName: "foot",
    });
    const { region: bobRegionId } = addRegionBobResult as { region: ID };
    console.log(
      `[SETUP] Map '${mapBob1}' and region '${bobRegionId}' for '${userBob}' created.`,
    );

    await t.step("Succeeds in deleting an owned region", async () => {
      console.log(
        `[ACTION] User '${userAlice}' deleting owned region '${aliceRegionId}'.`,
      );
      const result = await painScoring.deleteRegion({
        user: userAlice,
        region: aliceRegionId,
      });
      assertEquals("error" in result, false, "Expected deletion to succeed.");
      console.log(`[OUTPUT] Region '${aliceRegionId}' deleted.`);

      const regionsAfterDelete = await painScoring._getRegionsForMap({
        user: userAlice,
        map: mapAlice1,
      });
      assertNotEquals("error" in regionsAfterDelete, true, "Querying regions should succeed.");
      assertEquals(
        (regionsAfterDelete as Array<any>).length,
        0,
        "Region should no longer exist after deletion.",
      );
      console.log(`[VERIFY] Region '${aliceRegionId}' no longer exists.`);
    });

    await t.step("Fails to delete a non-existent region", async () => {
      const nonExistentRegion = "region:another-fake-id" as ID;
      console.log(
        `[ACTION] User '${userAlice}' trying to delete non-existent region '${nonExistentRegion}'.`,
      );
      const result = await painScoring.deleteRegion({
        user: userAlice,
        region: nonExistentRegion,
      });
      assertEquals(
        "error" in result,
        true,
        "Expected an error for non-existent region.",
      );
      assertStrictEquals(
        (result as { error: string }).error,
        `Region '${nonExistentRegion}' not found or not owned by user '${userAlice}'.`,
      );
      console.log(
        `[OUTPUT] Error: ${(result as { error: string }).error}`,
      );
    });

    await t.step("Fails to delete a region not owned by the user", async () => {
      console.log(
        `[ACTION] User '${userAlice}' trying to delete region '${bobRegionId}' (owned by ${userBob}).`,
      );
      const result = await painScoring.deleteRegion({
        user: userAlice,
        region: bobRegionId,
      });
      assertEquals(
        "error" in result,
        true,
        "Expected an error for region not owned by user.",
      );
      assertStrictEquals(
        (result as { error: string }).error,
        `Region '${bobRegionId}' not found or not owned by user '${userAlice}'.`,
      );
      console.log(
        `[OUTPUT] Error: ${(result as { error: string }).error}`,
      );

      // Verify Bob's region still exists
      const bobRegions = await painScoring._getRegionsForMap({
        user: userBob,
        map: mapBob1,
      });
      assertNotEquals("error" in bobRegions, true, "Querying Bob's regions should succeed.");
      assertEquals(
        (bobRegions as Array<any>).length,
        1,
        "Bob's region should still exist.",
      );
      console.log(`[VERIFY] Region '${bobRegionId}' still exists for '${userBob}'.`);
    });
  } finally {
    await client.close();
  }
});
```
