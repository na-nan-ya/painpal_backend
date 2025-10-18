---
timestamp: 'Fri Oct 17 2025 20:48:51 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_204851.931873b8.md]]'
content_id: ac99d1595e39753c5221b3cf43fafe36057d5c9fbeeaf52b680ca14c5d1c1c4c
---

# file: src/concepts/PainLocationScoring/PainLocationScoringConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import PainLocationScoringConcept from "./PainLocationScoringConcept.ts";

// Define test IDs for users, maps, and regions
const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;
const mapAliceBodyFront = "map:alice_body_front_v1" as ID;
const mapBobBodyBack = "map:bob_body_back_v1" as ID;

Deno.test("PainLocationScoring: Principle - User adds, scores, and deletes a pain region", async (t) => {
  const [db, client] = await testDb();
  const painScoring = new PainLocationScoringConcept(db);

  try {
    console.log("\n--- Principle Test: Lifecycle of a Pain Region ---");

    // Pre-condition: Assume a valid body map for userAlice exists externally.
    // For testing, we use the internal helper to simulate this.
    console.log(`[SETUP] Adding map '${mapAliceBodyFront}' for user '${userAlice}'...`);
    const addMapResult = await painScoring._addMapForTesting({ user: userAlice, map: mapAliceBodyFront });
    assertNotEquals("error" in addMapResult, true, `Expected map to be added for testing, got error: ${JSON.stringify(addMapResult)}`);
    console.log(`[SETUP] Map '${mapAliceBodyFront}' added for testing.`);

    // 1. User adds a region to their map
    const regionName = "left_shoulder";
    console.log(`[ACTION] User '${userAlice}' adding region '${regionName}' to map '${mapAliceBodyFront}'...`);
    const addRegionResult = await painScoring.addRegion({ user: userAlice, map: mapAliceBodyFront, regionName });
    assertNotEquals("error" in addRegionResult, true, `Expected addRegion to succeed, got error: ${JSON.stringify(addRegionResult)}`);
    const { region: regionId } = addRegionResult as { region: ID };
    assertExists(regionId, "A region ID should be returned.");
    console.log(`[OUTPUT] Region '${regionId}' ('${regionName}') added.`);

    // Verify region exists on the map
    console.log(`[VERIFY] Checking if region '${regionId}' exists for user '${userAlice}' on map '${mapAliceBodyFront}'...`);
    const regionsForMap1 = await painScoring._getRegionsForMap({ user: userAlice, map: mapAliceBodyFront });
    assertNotEquals("error" in regionsForMap1, true, `Expected _getRegionsForMap to succeed, got error: ${JSON.stringify(regionsForMap1)}`);
    assertEquals((regionsForMap1 as any[]).length, 1, "There should be one region on the map.");
    assertEquals((regionsForMap1 as any[])[0]._id, regionId, "The added region ID should match.");
    assertEquals((regionsForMap1 as any[])[0].name, regionName, "The added region name should match.");
    console.log(`[VERIFY] Region '${regionId}' successfully found.`);

    // 2. User scores the region
    const scoreValue = 7; // A valid score between 1 and 10
    console.log(`[ACTION] User '${userAlice}' scoring region '${regionId}' with value '${scoreValue}'...`);
    const scoreRegionResult = await painScoring.scoreRegion({ user: userAlice, region: regionId, score: scoreValue });
    assertNotEquals("error" in scoreRegionResult, true, `Expected scoreRegion to succeed, got error: ${JSON.stringify(scoreRegionResult)}`);
    console.log(`[OUTPUT] Region '${regionId}' scored with ${scoreValue}.`);

    // Verify the region's score is updated
    console.log(`[VERIFY] Checking score of region '${regionId}' for user '${userAlice}'...`);
    const scoredRegion = await painScoring._getRegion({ user: userAlice, region: regionId });
    assertNotEquals("error" in scoredRegion, true, `Expected _getRegion to succeed, got error: ${JSON.stringify(scoredRegion)}`);
    assertEquals((scoredRegion as any[]).length, 1, "The region should still exist.");
    assertEquals((scoredRegion as any[])[0].score, scoreValue, "The region's score should be updated.");
    console.log(`[VERIFY] Region '${regionId}' has score ${scoreValue}.`);

    // 3. User deletes the region
    console.log(`[ACTION] User '${userAlice}' deleting region '${regionId}'...`);
    const deleteRegionResult = await painScoring.deleteRegion({ user: userAlice, region: regionId });
    assertNotEquals("error" in deleteRegionResult, true, `Expected deleteRegion to succeed, got error: ${JSON.stringify(deleteRegionResult)}`);
    console.log(`[OUTPUT] Region '${regionId}' deleted.`);

    // Verify the region no longer exists
    console.log(`[VERIFY] Checking if region '${regionId}' still exists for user '${userAlice}'...`);
    const deletedRegionCheck = await painScoring._getRegion({ user: userAlice, region: regionId });
    assertEquals("error" in deletedRegionCheck, true, "Expected _getRegion to fail after deletion (region not found).");
    assertEquals((deletedRegionCheck as { error: string }).error, `Region '${regionId}' not found or not owned by user '${userAlice}'.`, "Error message should indicate region not found.");
    console.log(`[VERIFY] Region '${regionId}' successfully confirmed as deleted.`);

    console.log("\n--- Principle Test Completed Successfully ---");
  } finally {
    await client.close();
  }
});

Deno.test("PainLocationScoring: Action - addRegion requirements and behavior", async (t) => {
  const [db, client] = await testDb();
  const painScoring = new PainLocationScoringConcept(db);

  try {
    console.log("\n--- Action Test: addRegion Requirements ---");

    // Pre-condition: Setup a map for userAlice and userBob for cross-user tests
    await painScoring._addMapForTesting({ user: userAlice, map: mapAliceBodyFront });
    await painScoring._addMapForTesting({ user: userBob, map: mapBobBodyBack });
    console.log(`[SETUP] Maps '${mapAliceBodyFront}' for '${userAlice}' and '${mapBobBodyBack}' for '${userBob}' added.`);

    await t.step("Requires: Map must exist for the given User", async () => {
      const nonExistentMap = "map:nonexistent" as ID;
      console.log(`[ACTION] Trying to add region to non-existent map '${nonExistentMap}' for '${userAlice}'...`);
      const result = await painScoring.addRegion({ user: userAlice, map: nonExistentMap, regionName: "fake_region" });
      assertEquals("error" in result, true, "Adding a region to a non-existent map should fail.");
      assertEquals((result as { error: string }).error, `Map '${nonExistentMap}' not found for user '${userAlice}' or user does not own it.`, "Error message should specify map not found.");
      console.log(`[OUTPUT] Correctly failed to add region to non-existent map: ${JSON.stringify(result)}`);
    });

    await t.step("Requires: User must own the map", async () => {
      console.log(`[ACTION] Trying to add region to map '${mapBobBodyBack}' (owned by '${userBob}') using user '${userAlice}'...`);
      const result = await painScoring.addRegion({ user: userAlice, map: mapBobBodyBack, regionName: "stolen_region" });
      assertEquals("error" in result, true, "Adding a region to a map not owned by the user should fail.");
      assertEquals((result as { error: string }).error, `Map '${mapBobBodyBack}' not found for user '${userAlice}' or user does not own it.`, "Error message should specify ownership issue.");
      console.log(`[OUTPUT] Correctly failed to add region to unowned map: ${JSON.stringify(result)}`);
    });

    await t.step("Behavior: Adding the same region name twice creates a new region", async () => {
      const regionName = "left_hand";
      console.log(`[ACTION] User '${userAlice}' adding region '${regionName}' (first time)...`);
      const result1 = await painScoring.addRegion({ user: userAlice, map: mapAliceBodyFront, regionName });
      assertNotEquals("error" in result1, true, `Expected first addRegion to succeed: ${JSON.stringify(result1)}`);
      const { region: regionId1 } = result1 as { region: ID };
      console.log(`[OUTPUT] First region ID: ${regionId1}`);

      console.log(`[ACTION] User '${userAlice}' adding region '${regionName}' (second time, same name)...`);
      const result2 = await painScoring.addRegion({ user: userAlice, map: mapAliceBodyFront, regionName });
      assertNotEquals("error" in result2, true, `Expected second addRegion to succeed: ${JSON.stringify(result2)}`);
      const { region: regionId2 } = result2 as { region: ID };
      console.log(`[OUTPUT] Second region ID: ${regionId2}`);

      assertNotEquals(regionId1, regionId2, "Adding a region with the same name should create a new unique ID.");

      const regions = await painScoring._getRegionsForMap({ user: userAlice, map: mapAliceBodyFront });
      assertNotEquals("error" in regions, true, `Expected _getRegionsForMap to succeed: ${JSON.stringify(regions)}`);
      assertEquals((regions as any[]).length, 2, "There should be two regions on the map after adding the same name twice.");
      console.log(`[VERIFY] Found ${regions.length} regions. Distinct IDs confirmed.`);
    });

    console.log("\n--- Action Test: addRegion Completed Successfully ---");
  } finally {
    await client.close();
  }
});

Deno.test("PainLocationScoring: Action - scoreRegion requirements and behavior", async (t) => {
  const [db, client] = await testDb();
  const painScoring = new PainLocationScoringConcept(db);

  try {
    console.log("\n--- Action Test: scoreRegion Requirements ---");

    // Pre-condition: Setup a map and a region for userAlice
    await painScoring._addMapForTesting({ user: userAlice, map: mapAliceBodyFront });
    const addRegionResult = await painScoring.addRegion({ user: userAlice, map: mapAliceBodyFront, regionName: "right_knee" });
    const { region: existingRegionId } = addRegionResult as { region: ID };
    console.log(`[SETUP] Map '${mapAliceBodyFront}' and region '${existingRegionId}' for '${userAlice}' created.`);

    await t.step("Requires: Region must exist for the given User", async () => {
      const nonExistentRegion = "region:fake" as ID;
      console.log(`[ACTION] Trying to score non-existent region '${nonExistentRegion}' for '${userAlice}'...`);
      const result = await painScoring.scoreRegion({ user: userAlice, region: nonExistentRegion, score: 5 });
      assertEquals("error" in result, true, "Scoring a non-existent region should fail.");
      assertEquals((result as { error: string }).error, `Region '${nonExistentRegion}' not found or not owned by user '${userAlice}'.`, "Error message should specify region not found.");
      console.log(`[OUTPUT] Correctly failed to score non-existent region: ${JSON.stringify(result)}`);
    });

    await t.step("Requires: Score must be between 1 and 10 (inclusive)", async () => {
      console.log(`[ACTION] Trying to score region '${existingRegionId}' with 0 (below bounds)...`);
      const belowBoundsResult = await painScoring.scoreRegion({ user: userAlice, region: existingRegionId, score: 0 });
      assertEquals("error" in belowBoundsResult, true, "Scoring with 0 should fail.");
      assertEquals((belowBoundsResult as { error: string }).error, "Score must be a number between 1 and 10.", "Error message should specify score bounds.");
      console.log(`[OUTPUT] Correctly failed to score below bounds: ${JSON.stringify(belowBoundsResult)}`);

      console.log(`[ACTION] Trying to score region '${existingRegionId}' with 11 (above bounds)...`);
      const aboveBoundsResult = await painScoring.scoreRegion({ user: userAlice, region: existingRegionId, score: 11 });
      assertEquals("error" in aboveBoundsResult, true, "Scoring with 11 should fail.");
      assertEquals((aboveBoundsResult as { error: string }).error, "Score must be a number between 1 and 10.", "Error message should specify score bounds.");
      console.log(`[OUTPUT] Correctly failed to score above bounds: ${JSON.stringify(aboveBoundsResult)}`);

      console.log(`[ACTION] Trying to score region '${existingRegionId}' with 1 (at min bound)...`);
      const minBoundsResult = await painScoring.scoreRegion({ user: userAlice, region: existingRegionId, score: 1 });
      assertNotEquals("error" in minBoundsResult, true, "Scoring with 1 should succeed.");
      console.log(`[OUTPUT] Correctly succeeded to score at min bound.`);

      console.log(`[ACTION] Trying to score region '${existingRegionId}' with 10 (at max bound)...`);
      const maxBoundsResult = await painScoring.scoreRegion({ user: userAlice, region: existingRegionId, score: 10 });
      assertNotEquals("error" in maxBoundsResult, true, "Scoring with 10 should succeed.");
      console.log(`[OUTPUT] Correctly succeeded to score at max bound.`);
    });

    console.log("\n--- Action Test: scoreRegion Completed Successfully ---");
  } finally {
    await client.close();
  }
});

Deno.test("PainLocationScoring: Action - deleteRegion requirements and behavior", async (t) => {
  const [db, client] = await testDb();
  const painScoring = new PainLocationScoringConcept(db);

  try {
    console.log("\n--- Action Test: deleteRegion Requirements ---");

    // Pre-condition: Setup a map and a region for userAlice
    await painScoring._addMapForTesting({ user: userAlice, map: mapAliceBodyFront });
    const addRegionResult = await painScoring.addRegion({ user: userAlice, map: mapAliceBodyFront, regionName: "abdomen" });
    const { region: existingRegionId } = addRegionResult as { region: ID };
    console.log(`[SETUP] Map '${mapAliceBodyFront}' and region '${existingRegionId}' for '${userAlice}' created.`);

    await t.step("Requires: Region must exist for the given User", async () => {
      const nonExistentRegion = "region:another_fake" as ID;
      console.log(`[ACTION] Trying to delete non-existent region '${nonExistentRegion}' for '${userAlice}'...`);
      const result = await painScoring.deleteRegion({ user: userAlice, region: nonExistentRegion });
      assertEquals("error" in result, true, "Deleting a non-existent region should fail.");
      assertEquals((result as { error: string }).error, `Region '${nonExistentRegion}' not found or not owned by user '${userAlice}'.`, "Error message should specify region not found.");
      console.log(`[OUTPUT] Correctly failed to delete non-existent region: ${JSON.stringify(result)}`);
    });

    // Add a map and region for userBob to test cross-user deletion
    await painScoring._addMapForTesting({ user: userBob, map: mapBobBodyBack });
    const addBobRegionResult = await painScoring.addRegion({ user: userBob, map: mapBobBodyBack, regionName: "lower_back" });
    const { region: bobRegionId } = addBobRegionResult as { region: ID };
    console.log(`[SETUP] Map '${mapBobBodyBack}' and region '${bobRegionId}' for '${userBob}' created.`);

    await t.step("Requires: User must own the region's map", async () => {
      console.log(`[ACTION] Trying to delete region '${bobRegionId}' (owned by '${userBob}') using user '${userAlice}'...`);
      const result = await painScoring.deleteRegion({ user: userAlice, region: bobRegionId });
      assertEquals("error" in result, true, "Deleting a region not owned by the user should fail.");
      assertEquals((result as { error: string }).error, `Region '${bobRegionId}' not found or not owned by user '${userAlice}'.`, "Error message should specify ownership issue.");
      console.log(`[OUTPUT] Correctly failed to delete unowned region: ${JSON.stringify(result)}`);
    });

    await t.step("Effects: Successfully deletes an existing and owned region", async () => {
      console.log(`[ACTION] Successfully deleting region '${existingRegionId}' for user '${userAlice}'...`);
      const result = await painScoring.deleteRegion({ user: userAlice, region: existingRegionId });
      assertNotEquals("error" in result, true, `Expected successful deletion, got error: ${JSON.stringify(result)}`);
      console.log(`[OUTPUT] Region '${existingRegionId}' deleted successfully.`);

      // Verify deletion
      const checkDeleted = await painScoring._getRegion({ user: userAlice, region: existingRegionId });
      assertEquals("error" in checkDeleted, true, "Expected region to be non-existent after deletion.");
      console.log(`[VERIFY] Region '${existingRegionId}' confirmed as deleted.`);
    });

    console.log("\n--- Action Test: deleteRegion Completed Successfully ---");
  } finally {
    await client.close();
  }
});
```
