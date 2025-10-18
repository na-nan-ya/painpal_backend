---
timestamp: 'Fri Oct 17 2025 21:06:36 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_210636.ac464248.md]]'
content_id: 87756f5854cc1016e0c8098b5302de34a5ef6bd71e12457db575265674c4398a
---

# file: src/concepts/PainLocationScoring/PainLocationScoringConcept.test.ts

````typescript
import { assertEquals, assertExists, assertNotEquals, assertArrayIncludes } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import PainLocationScoringConcept from "./PainLocationScoringConcept.ts";

// Test users and map IDs
const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID; // For testing ownership
const mapAlice1 = "map:AliceMap1" as ID;
const mapBob1 = "map:BobMap1" as ID; // For testing unowned maps
const nonExistentMap = "map:NotFound" as ID;
const nonExistentRegion = "region:NotFound" as ID;

Deno.test("PainLocationScoring: Principle - full lifecycle of a pain region", async (t) => {
  const [db, client] = await testDb();
  const painScoring = new PainLocationScoringConcept(db);
  let regionId: ID;

  try {
    // --- Simulate BodyMapGeneration: generateMap(userAlice, date) ---
    // The PainLocationScoring concept needs to be aware of the map's existence and ownership
    // for its internal validation logic. We use the private helper `_addMapForTesting`
    // to simulate `BodyMapGeneration` providing a valid map ID.
    console.log(`[Principle] Simulating map generation for user '${userAlice}' with map ID '${mapAlice1}'.`);
    const addMapResult = await painScoring._addMapForTesting({ user: userAlice, map: mapAlice1 });
    assertEquals("error" in addMapResult, false, `Failed to add map for testing: ${JSON.stringify(addMapResult)}`);
    console.log(`[Principle] Map '${mapAlice1}' added to PainLocationScoring's internal state for user '${userAlice}'.`);

    await t.step("1. Add a region to the map", async () => {
      const regionName = "Left Knee";
      console.log(`  [Action] Calling addRegion with user: '${userAlice}', map: '${mapAlice1}', regionName: '${regionName}'.`);
      const addRegionResult = await painScoring.addRegion({ user: userAlice, map: mapAlice1, regionName });
      assertNotEquals("error" in addRegionResult, true, `Expected addRegion to succeed, but got: ${JSON.stringify(addRegionResult)}`);
      regionId = (addRegionResult as { region: ID }).region;
      assertExists(regionId, "Region ID should be returned after adding.");
      console.log(`  [Output] Region added with ID: '${regionId}'.`);

      // Verify the region was added
      console.log(`  [Verification] Querying _getRegion for user '${userAlice}' and region '${regionId}'.`);
      const getRegionResult = await painScoring._getRegion({ user: userAlice, region: regionId });
      assertEquals("error" in getRegionResult, false, `Expected _getRegion to succeed, but got: ${JSON.stringify(getRegionResult)}`);
      const regions = getRegionResult as { _id: ID; mapId: ID; name: string; score?: number }[];
      assertEquals(regions.length, 1, "Should find one region.");
      assertEquals(regions[0]._id, regionId);
      assertEquals(regions[0].name, regionName);
      assertEquals(regions[0].mapId, mapAlice1);
      assertEquals(regions[0].score, undefined, "Region should not have a score initially.");
      console.log(`  [Verification] Region '${regionId}' found with name '${regions[0].name}' on map '${regions[0].mapId}'. Score is undefined as expected.`);
    });

    await t.step("2. Score the added region", async () => {
      const scoreValue = 7; // Example score between 1 and 10
      console.log(`  [Action] Calling scoreRegion with user: '${userAlice}', region: '${regionId}', score: ${scoreValue}.`);
      const scoreRegionResult = await painScoring.scoreRegion({ user: userAlice, region: regionId, score: scoreValue });
      assertEquals("error" in scoreRegionResult, false, `Expected scoreRegion to succeed, but got: ${JSON.stringify(scoreRegionResult)}`);
      console.log(`  [Output] Region '${regionId}' scored successfully.`);

      // Verify the region was scored
      console.log(`  [Verification] Querying _getRegion to check score of region '${regionId}'.`);
      const getRegionResult = await painScoring._getRegion({ user: userAlice, region: regionId });
      assertEquals("error" in getRegionResult, false, `Expected _getRegion to succeed, but got: ${JSON.stringify(getRegionResult)}`);
      const regions = getRegionResult as { _id: ID; mapId: ID; name: string; score?: number }[];
      assertEquals(regions.length, 1, "Should still find one region.");
      assertEquals(regions[0].score, scoreValue, `Region score should be ${scoreValue}.`);
      console.log(`  [Verification] Region '${regionId}' now has score ${regions[0].score} as expected.`);
    });

    await t.step("3. Delete the region", async () => {
      console.log(`  [Action] Calling deleteRegion with user: '${userAlice}', region: '${regionId}'.`);
      const deleteRegionResult = await painScoring.deleteRegion({ user: userAlice, region: regionId });
      assertEquals("error" in deleteRegionResult, false, `Expected deleteRegion to succeed, but got: ${JSON.stringify(deleteRegionResult)}`);
      console.log(`  [Output] Region '${regionId}' deleted successfully.`);

      // Verify the region was deleted
      console.log(`  [Verification] Querying _getRegion to check if region '${regionId}' still exists.`);
      const getRegionResult = await painScoring._getRegion({ user: userAlice, region: regionId });
      assertEquals("error" in getRegionResult, true, "Expected _getRegion to fail as region should be deleted.");
      assertEquals((getRegionResult as { error: string }).error, `Region '${regionId}' not found or not owned by user '${userAlice}'.`, "Error message should indicate region not found/owned.");
      console.log(`  [Verification] Region '${regionId}' is confirmed deleted.`);
    });
  } finally {
    await client.close();
  }
});

Deno.test("PainLocationScoring: Action - addRegion requirements and effects", async (t) => {
  const [db, client] = await testDb();
  const painScoring = new PainLocationScoringConcept(db);

  try {
    // Setup: Add a map for userAlice and userBob
    await painScoring._addMapForTesting({ user: userAlice, map: mapAlice1 });
    await painScoring._addMapForTesting({ user: userBob, map: mapBob1 });

    await t.step("addRegion: successfully adds a region to an owned map", async () => {
      const regionName = "Right Shoulder";
      console.log(`  [Action] Adding '${regionName}' to map '${mapAlice1}' for user '${userAlice}'.`);
      const addRegionResult = await painScoring.addRegion({ user: userAlice, map: mapAlice1, regionName });
      assertEquals("error" in addRegionResult, false, `Expected addRegion to succeed: ${JSON.stringify(addRegionResult)}`);
      const regionId = (addRegionResult as { region: ID }).region;
      assertExists(regionId);
      console.log(`  [Output] Region added with ID: '${regionId}'.`);

      // Verify effect: region is present in the map
      const regions = await painScoring._getRegionsForMap({ user: userAlice, map: mapAlice1 });
      assertEquals("error" in regions, false, "Expected query for regions to succeed.");
      assertArrayIncludes(regions as any[], [{ _id: regionId, name: regionName, mapId: mapAlice1 }], "Added region should be present in the map.");
      console.log(`  [Verification] Region '${regionId}' confirmed in map '${mapAlice1}'.`);
    });

    await t.step("addRegion: fails when adding to a non-existent map (requires)", async () => {
      const regionName = "Fake Region";
      console.log(`  [Action] Attempting to add region '${regionName}' to non-existent map '${nonExistentMap}' for user '${userAlice}'.`);
      const addRegionResult = await painScoring.addRegion({ user: userAlice, map: nonExistentMap, regionName });
      assertEquals("error" in addRegionResult, true, "Expected addRegion to fail for non-existent map.");
      assertEquals((addRegionResult as { error: string }).error, `Map '${nonExistentMap}' not found for user '${userAlice}' or user does not own it.`, "Error message should indicate map not found/owned.");
      console.log(`  [Output] Correctly failed to add region to non-existent map.`);
    });

    await t.step("addRegion: fails when adding to a map not owned by the user (requires)", async () => {
      const regionName = "Stolen Region";
      console.log(`  [Action] User '${userAlice}' attempting to add region '${regionName}' to map '${mapBob1}' (owned by '${userBob}').`);
      const addRegionResult = await painScoring.addRegion({ user: userAlice, map: mapBob1, regionName });
      assertEquals("error" in addRegionResult, true, "Expected addRegion to fail for unowned map.");
      assertEquals((addRegionResult as { error: string }).error, `Map '${mapBob1}' not found for user '${userAlice}' or user does not own it.`, "Error message should indicate map not found/owned for user.");
      console.log(`  [Output] Correctly failed to add region to unowned map.`);
    });

    await t.step("addRegion: allows adding multiple regions with the same name (creates new unique IDs)", async () => {
        const regionName = "Left Hand";
        console.log(`  [Action] Adding '${regionName}' (first instance) to map '${mapAlice1}' for user '${userAlice}'.`);
        const addRegion1Result = await painScoring.addRegion({ user: userAlice, map: mapAlice1, regionName });
        assertEquals("error" in addRegion1Result, false, `Expected first addRegion to succeed: ${JSON.stringify(addRegion1Result)}`);
        const regionId1 = (addRegion1Result as { region: ID }).region;
        assertExists(regionId1);
        console.log(`  [Output] First '${regionName}' region added with ID: '${regionId1}'.`);

        console.log(`  [Action] Adding '${regionName}' (second instance) to map '${mapAlice1}' for user '${userAlice}'.`);
        const addRegion2Result = await painScoring.addRegion({ user: userAlice, map: mapAlice1, regionName });
        assertEquals("error" in addRegion2Result, false, `Expected second addRegion to succeed: ${JSON.stringify(addRegion2Result)}`);
        const regionId2 = (addRegion2Result as { region: ID }).region;
        assertExists(regionId2);
        assertNotEquals(regionId1, regionId2, "Should create a new unique ID for regions with the same name.");
        console.log(`  [Output] Second '${regionName}' region added with ID: '${regionId2}'.`);

        // Verify effect: both regions are present
        const regionsInMap = await painScoring._getRegionsForMap({ user: userAlice, map: mapAlice1 });
        assertEquals("error" in regionsInMap, false, "Expected query for regions to succeed.");
        assertEquals((regionsInMap as any[]).filter(r => r.name === regionName).length, 2, "Should find two regions named 'Left Hand'.");
        console.log(`  [Verification] Two regions named '${regionName}' confirmed in map '${mapAlice1}', with distinct IDs.`);
    });

  } finally {
    await client.close();
  }
});

Deno.test("PainLocationScoring: Action - scoreRegion requirements and effects", async (t) => {
  const [db, client] = await testDb();
  const painScoring = new PainLocationScoringConcept(db);
  let regionIdAlice: ID;
  let regionIdBob: ID;

  try {
    // Setup: Add maps and regions for two users
    await painScoring._addMapForTesting({ user: userAlice, map: mapAlice1 });
    const addRegionAliceResult = await painScoring.addRegion({ user: userAlice, map: mapAlice1, regionName: "Left Foot" });
    regionIdAlice = (addRegionAliceResult as { region: ID }).region;
    console.log(`  [Setup] Region '${regionIdAlice}' added for user '${userAlice}'.`);

    await painScoring._addMapForTesting({ user: userBob, map: mapBob1 });
    const addRegionBobResult = await painScoring.addRegion({ user: userBob, map: mapBob1, regionName: "Right Hand" });
    regionIdBob = (addRegionBobResult as { region: ID }).region;
    console.log(`  [Setup] Region '${regionIdBob}' added for user '${userBob}'.`);

    await t.step("scoreRegion: successfully scores an owned region (initial score)", async () => {
      const scoreValue = 8;
      console.log(`  [Action] Calling scoreRegion with user: '${userAlice}', region: '${regionIdAlice}', score: ${scoreValue}.`);
      const scoreResult = await painScoring.scoreRegion({ user: userAlice, region: regionIdAlice, score: scoreValue });
      assertEquals("error" in scoreResult, false, `Expected scoreRegion to succeed: ${JSON.stringify(scoreResult)}`);
      console.log(`  [Output] Region '${regionIdAlice}' scored successfully.`);

      // Verify effect: score is updated
      const region = await painScoring._getRegion({ user: userAlice, region: regionIdAlice });
      assertEquals("error" in region, false, "Expected query for region to succeed.");
      assertEquals((region as any[])[0].score, scoreValue, `Region score should be ${scoreValue}.`);
      console.log(`  [Verification] Region '${regionIdAlice}' confirmed with score ${scoreValue}.`);
    });

    await t.step("scoreRegion: successfully updates an existing score on an owned region", async () => {
      const updatedScore = 2;
      console.log(`  [Action] Calling scoreRegion to update score for region '${regionIdAlice}' to ${updatedScore}.`);
      const updateScoreResult = await painScoring.scoreRegion({ user: userAlice, region: regionIdAlice, score: updatedScore });
      assertEquals("error" in updateScoreResult, false, `Expected scoreRegion (update) to succeed: ${JSON.stringify(updateScoreResult)}`);
      console.log(`  [Output] Region '${regionIdAlice}' score updated successfully.`);

      // Verify effect: score is updated
      const region = await painScoring._getRegion({ user: userAlice, region: regionIdAlice });
      assertEquals("error" in region, false, "Expected query for region to succeed.");
      assertEquals((region as any[])[0].score, updatedScore, `Region score should be ${updatedScore}.`);
      console.log(`  [Verification] Region '${regionIdAlice}' confirmed updated to score ${updatedScore}.`);
    });

    await t.step("scoreRegion: fails for out-of-bounds score (below min 1) (requires)", async () => {
      const invalidScore = 0;
      console.log(`  [Action] Attempting to score region '${regionIdAlice}' with invalid score ${invalidScore}.`);
      const scoreResult = await painScoring.scoreRegion({ user: userAlice, region: regionIdAlice, score: invalidScore });
      assertEquals("error" in scoreResult, true, "Expected scoreRegion to fail for score 0.");
      assertEquals((scoreResult as { error: string }).error, "Score must be a number between 1 and 10.", "Error message should indicate invalid score range.");
      console.log(`  [Output] Correctly failed for score ${invalidScore}.`);
    });

    await t.step("scoreRegion: fails for out-of-bounds score (above max 10) (requires)", async () => {
      const invalidScore = 11;
      console.log(`  [Action] Attempting to score region '${regionIdAlice}' with invalid score ${invalidScore}.`);
      const scoreResult = await painScoring.scoreRegion({ user: userAlice, region: regionIdAlice, score: invalidScore });
      assertEquals("error" in scoreResult, true, "Expected scoreRegion to fail for score 11.");
      assertEquals((scoreResult as { error: string }).error, "Score must be a number between 1 and 10.", "Error message should indicate invalid score range.");
      console.log(`  [Output] Correctly failed for score ${invalidScore}.`);
    });

    await t.step("scoreRegion: fails for a non-existent region (requires)", async () => {
      const scoreValue = 5;
      console.log(`  [Action] Attempting to score non-existent region '${nonExistentRegion}' for user '${userAlice}'.`);
      const scoreResult = await painScoring.scoreRegion({ user: userAlice, region: nonExistentRegion, score: scoreValue });
      assertEquals("error" in scoreResult, true, "Expected scoreRegion to fail for non-existent region.");
      assertEquals((scoreResult as { error: string }).error, `Region '${nonExistentRegion}' not found or not owned by user '${userAlice}'.`, "Error message should indicate region not found/owned.");
      console.log(`  [Output] Correctly failed for non-existent region.`);
    });

    await t.step("scoreRegion: fails for a region not owned by the user (requires)", async () => {
      const scoreValue = 5;
      console.log(`  [Action] User '${userAlice}' attempting to score region '${regionIdBob}' (owned by '${userBob}').`);
      const scoreResult = await painScoring.scoreRegion({ user: userAlice, region: regionIdBob, score: scoreValue });
      assertEquals("error" in scoreResult, true, "Expected scoreRegion to fail for unowned region.");
      assertEquals((scoreResult as { error: string }).error, `Region '${regionIdBob}' not found or not owned by user '${userAlice}'.`, "Error message should indicate region not found/owned for user.");
      console.log(`  [Output] Correctly failed for unowned region.`);
    });
  } finally {
    await client.close();
  }
});

Deno.test("PainLocationScoring: Action - deleteRegion requirements and effects", async (t) => {
  const [db, client] = await testDb();
  const painScoring = new PainLocationScoringConcept(db);
  let regionIdAliceToDelete: ID;
  let regionIdBobToKeep: ID;

  try {
    // Setup: Add maps and regions for two users
    await painScoring._addMapForTesting({ user: userAlice, map: mapAlice1 });
    const addRegionAliceResult = await painScoring.addRegion({ user: userAlice, map: mapAlice1, regionName: "Back" });
    regionIdAliceToDelete = (addRegionAliceResult as { region: ID }).region;
    await painScoring.scoreRegion({ user: userAlice, region: regionIdAliceToDelete, score: 6 }); // Add a score to ensure it's a fully set up region
    console.log(`  [Setup] Region '${regionIdAliceToDelete}' added and scored for user '${userAlice}'.`);

    await painScoring._addMapForTesting({ user: userBob, map: mapBob1 });
    const addRegionBobResult = await painScoring.addRegion({ user: userBob, map: mapBob1, regionName: "Head" });
    regionIdBobToKeep = (addRegionBobResult as { region: ID }).region;
    console.log(`  [Setup] Region '${regionIdBobToKeep}' added for user '${userBob}'.`);

    await t.step("deleteRegion: successfully deletes an owned region", async () => {
      console.log(`  [Action] Calling deleteRegion with user: '${userAlice}', region: '${regionIdAliceToDelete}'.`);
      const deleteResult = await painScoring.deleteRegion({ user: userAlice, region: regionIdAliceToDelete });
      assertEquals("error" in deleteResult, false, `Expected deleteRegion to succeed: ${JSON.stringify(deleteResult)}`);
      console.log(`  [Output] Region '${regionIdAliceToDelete}' deleted successfully.`);

      // Verify effect: region is gone
      const regionCheck = await painScoring._getRegion({ user: userAlice, region: regionIdAliceToDelete });
      assertEquals("error" in regionCheck, true, "Expected _getRegion to fail as region should be deleted.");
      assertEquals((regionCheck as { error: string }).error, `Region '${regionIdAliceToDelete}' not found or not owned by user '${userAlice}'.`, "Error message should indicate region not found/owned after deletion.");
      console.log(`  [Verification] Region '${regionIdAliceToDelete}' is confirmed deleted.`);
    });

    await t.step("deleteRegion: fails for a non-existent region (requires)", async () => {
      console.log(`  [Action] Attempting to delete non-existent region '${nonExistentRegion}' for user '${userAlice}'.`);
      const deleteResult = await painScoring.deleteRegion({ user: userAlice, region: nonExistentRegion });
      assertEquals("error" in deleteResult, true, "Expected deleteRegion to fail for non-existent region.");
      assertEquals((deleteResult as { error: string }).error, `Region '${nonExistentRegion}' not found or not owned by user '${userAlice}'.`, "Error message should indicate region not found/owned.");
      console.log(`  [Output] Correctly failed to delete non-existent region.`);
    });

    await t.step("deleteRegion: fails for a region not owned by the user (requires)", async () => {
      console.log(`  [Action] User '${userAlice}' attempting to delete region '${regionIdBobToKeep}' (owned by '${userBob}').`);
      const deleteResult = await painScoring.deleteRegion({ user: userAlice, region: regionIdBobToKeep });
      assertEquals("error" in deleteResult, true, "Expected deleteRegion to fail for unowned region.");
      assertEquals((deleteResult as { error: string }).error, `Region '${regionIdBobToKeep}' not found or not owned by user '${userAlice}'.`, "Error message should indicate region not found/owned for user.");
      console.log(`  [Output] Correctly failed to delete unowned region.`);
    });
  } finally {
    await client.close();
  }
});

# trace: PainLocationScoring Principle Trace

The following trace demonstrates how the **principle** of the `PainLocationScoring` concept is fulfilled by a sequence of actions, integrating with simulated `BodyMapGeneration`.

```typescript
Deno.test("PainLocationScoring: Principle Trace", async () => {
  const [db, client] = await testDb();
  const painScoring = new PainLocationScoringConcept(db);

  try {
    const user = "trace:UserA" as ID;
    const map = "trace:Map1" as ID;
    const regionName = "trace:LeftArm";
    let regionId: ID;

    console.log("\n--- PainLocationScoring Principle Trace ---");

    // 1. Simulate BodyMapGeneration: `BodyMapGeneration.generateMap(user, date)`
    // This creates a map entry in PainLocationScoring's internal state for ownership tracking.
    console.log(`1. Simulating map generation for user '${user}' resulting in map ID '${map}'.`);
    const addMapForTestingResult = await painScoring._addMapForTesting({ user, map });
    assertEquals("error" in addMapForTestingResult, false, `Expected map simulation to succeed: ${JSON.stringify(addMapForTestingResult)}`);
    console.log(`   Result: Map '${map}' is now known to PainLocationScoring concept, owned by '${user}'.`);

    // 2. Action: User adds a region to their generated map.
    // Call: `PainLocationScoring.addRegion(user, map, regionName)`
    console.log(`2. User '${user}' adds region '${regionName}' to map '${map}'.`);
    const addRegionResult = await painScoring.addRegion({ user, map, regionName });
    assertEquals("error" in addRegionResult, false, `Expected addRegion to succeed: ${JSON.stringify(addRegionResult)}`);
    regionId = (addRegionResult as { region: ID }).region;
    assertExists(regionId, "Region ID should be returned.");
    console.log(`   Output: Region '${regionName}' added successfully, ID: '${regionId}'.`);

    // 3. Verification: Check if the region exists and is un-scored.
    // Query: `PainLocationScoring._getRegion(user, regionId)`
    console.log(`3. Verifying region '${regionId}' exists and has no score yet.`);
    const getRegionResultAfterAdd = await painScoring._getRegion({ user, region: regionId });
    assertEquals("error" in getRegionResultAfterAdd, false, `Expected _getRegion to succeed: ${JSON.stringify(getRegionResultAfterAdd)}`);
    const regionsAfterAdd = getRegionResultAfterAdd as any[];
    assertEquals(regionsAfterAdd.length, 1, "Should find one region.");
    assertEquals(regionsAfterAdd[0]._id, regionId, "Region ID matches.");
    assertEquals(regionsAfterAdd[0].name, regionName, "Region name matches.");
    assertEquals(regionsAfterAdd[0].score, undefined, "Region should initially have no score.");
    console.log(`   Verification: Region '${regionId}' confirmed, with name '${regionName}', and no score as expected.`);

    // 4. Action: User scores the newly added region.
    // Call: `PainLocationScoring.scoreRegion(user, regionId, score)`
    const score = 8;
    console.log(`4. User '${user}' scores region '${regionId}' with value '${score}'.`);
    const scoreRegionResult = await painScoring.scoreRegion({ user, region: regionId, score });
    assertEquals("error" in scoreRegionResult, false, `Expected scoreRegion to succeed: ${JSON.stringify(scoreRegionResult)}`);
    console.log(`   Output: Region '${regionId}' scored successfully with '${score}'.`);

    // 5. Verification: Check if the region now has the assigned score.
    // Query: `PainLocationScoring._getRegion(user, regionId)`
    console.log(`5. Verifying region '${regionId}' now has score '${score}'.`);
    const getRegionResultAfterScore = await painScoring._getRegion({ user, region: regionId });
    assertEquals("error" in getRegionResultAfterScore, false, `Expected _getRegion to succeed: ${JSON.stringify(getRegionResultAfterScore)}`);
    const regionsAfterScore = getRegionResultAfterScore as any[];
    assertEquals(regionsAfterScore.length, 1, "Should find one region.");
    assertEquals(regionsAfterScore[0].score, score, "Region score should be updated.");
    console.log(`   Verification: Region '${regionId}' confirmed with score '${score}'.`);

    // 6. Action: User deletes the region.
    // Call: `PainLocationScoring.deleteRegion(user, regionId)`
    console.log(`6. User '${user}' deletes region '${regionId}'.`);
    const deleteRegionResult = await painScoring.deleteRegion({ user, region: regionId });
    assertEquals("error" in deleteRegionResult, false, `Expected deleteRegion to succeed: ${JSON.stringify(deleteRegionResult)}`);
    console.log(`   Output: Region '${regionId}' deleted successfully.`);

    // 7. Verification: Check that the region no longer exists.
    // Query: `PainLocationScoring._getRegion(user, regionId)`
    console.log(`7. Verifying region '${regionId}' no longer exists.`);
    const getRegionResultAfterDelete = await painScoring._getRegion({ user, region: regionId });
    assertEquals("error" in getRegionResultAfterDelete, true, "Expected _getRegion to fail as region should be deleted.");
    assertEquals((getRegionResultAfterDelete as { error: string }).error, `Region '${regionId}' not found or not owned by user '${user}'.`, "Error message should indicate region not found/owned.");
    console.log(`   Verification: Region '${regionId}' is confirmed deleted (query returned an error as expected).`);

    console.log("--- End of PainLocationScoring Principle Trace ---");
  } finally {
    await client.close();
  }
});
````
