---
timestamp: 'Fri Oct 17 2025 12:30:34 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_123034.838f9a64.md]]'
content_id: d75cf7f7a395390de5d4f1fc6b71fb628132c0958e9fdf054ba5d7e994f518d9
---

# file: src/bodyMapGeneration/bodyMapGenerationConcept.test.ts

```typescript
import { assertEquals, assertExists, assertObjectMatch } from "jsr:@std/assert";
import { testDb } from "../../utils/database.ts"; // Assuming utils/database.ts is at the root or relative path
import {
  initiateGeneration,
  getGenerationStatus,
  retrieveBodyMap,
  simulateProcessing,
  BodyMapRecord,
} from "./bodyMapGeneration.ts"; // Import the mock implementation

Deno.test("BodyMapGeneration Concept Testing", async (t) => {
  let db: Deno.Kv;
  let client: Deno.Kv;

  Deno.test.beforeAll(async () => {
    [db, client] = await testDb();
  });

  Deno.test.afterAll(async () => {
    await client.close();
  });

  // --- Test initiateGeneration action ---
  await t.step("Action: initiateGeneration", async (tStep) => {
    await tStep.step("requires: patientId must not be empty", async () => {
      const result = await initiateGeneration(db, "", "scan123");
      assertExists(result.error);
      assertEquals(result.error, "patientId cannot be empty");
    });

    await tStep.step("requires: scanDataId must not be empty", async () => {
      const result = await initiateGeneration(db, "patient456", "");
      assertExists(result.error);
      assertEquals(result.error, "scanDataId cannot be empty");
    });

    await tStep.step("effects: creates a new pending body map record and returns its ID", async () => {
      const patientId = "patient123";
      const scanDataId = "scanABC";
      const { bodyMapId, error } = await initiateGeneration(
        db,
        patientId,
        scanDataId,
      );

      assertEquals(error, undefined, `Expected no error, got: ${error}`);
      assertExists(bodyMapId, "Expected bodyMapId to be returned");

      const key = ["body_maps", bodyMapId];
      const recordResult = await db.get<BodyMapRecord>(key);
      assertExists(recordResult.value, "Expected body map record to exist in DB");

      const record = recordResult.value!;
      assertEquals(record.id, bodyMapId);
      assertEquals(record.patientId, patientId);
      assertEquals(record.scanDataId, scanDataId);
      assertEquals(record.status, "pending");
      assertExists(record.createdAt);
      assertExists(record.updatedAt);
    });
  });

  // --- Test getGenerationStatus action ---
  await t.step("Action: getGenerationStatus", async (tStep) => {
    let testBodyMapId: string;

    Deno.test.beforeEach(async () => {
      // Setup: Create a pending body map for testing status
      const { bodyMapId } = await initiateGeneration(
        db,
        "patientForStatus",
        "scanForStatus",
      );
      assertExists(bodyMapId);
      testBodyMapId = bodyMapId!;
    });

    await tStep.step("requires: bodyMapId must not be empty", async () => {
      const result = await getGenerationStatus(db, "");
      assertExists(result.error);
      assertEquals(result.error, "bodyMapId cannot be empty");
    });

    await tStep.step("requires: bodyMapId must correspond to an existing record", async () => {
      const result = await getGenerationStatus(db, "nonExistentId");
      assertExists(result.error);
      assertEquals(result.error, "Body map not found");
    });

    await tStep.step("effects: returns the current status of a pending map", async () => {
      const statusResult = await getGenerationStatus(db, testBodyMapId);
      assertEquals(statusResult.error, undefined);
      assertEquals(statusResult.status, "pending");
      assertEquals(statusResult.bodyMapUrl, undefined);
    });

    await tStep.step("effects: returns the current status of a completed map", async () => {
      const expectedUrl = "http://example.com/map/completed";
      await simulateProcessing(db, testBodyMapId, "completed", expectedUrl);

      const statusResult = await getGenerationStatus(db, testBodyMapId);
      assertEquals(statusResult.error, undefined);
      assertEquals(statusResult.status, "completed");
      assertEquals(statusResult.bodyMapUrl, expectedUrl);
    });

    await tStep.step("effects: returns the current status of a failed map", async () => {
      const expectedError = "Processing failed due to insufficient data.";
      await simulateProcessing(db, testBodyMapId, "failed", undefined, expectedError);

      const statusResult = await getGenerationStatus(db, testBodyMapId);
      assertEquals(statusResult.error, expectedError);
      assertEquals(statusResult.status, "failed");
      assertEquals(statusResult.bodyMapUrl, undefined);
    });
  });

  // --- Test retrieveBodyMap action ---
  await t.step("Action: retrieveBodyMap", async (tStep) => {
    let testBodyMapId: string;
    const completedUrl = "http://example.com/map/final";

    Deno.test.beforeEach(async () => {
      // Setup: Create a pending body map for testing retrieval
      const { bodyMapId } = await initiateGeneration(
        db,
        "patientForRetrieve",
        "scanForRetrieve",
      );
      assertExists(bodyMapId);
      testBodyMapId = bodyMapId!;
    });

    await tStep.step("requires: bodyMapId must not be empty", async () => {
      const result = await retrieveBodyMap(db, "");
      assertExists(result.error);
      assertEquals(result.error, "bodyMapId cannot be empty");
    });

    await tStep.step("requires: bodyMapId must correspond to an existing record", async () => {
      const result = await retrieveBodyMap(db, "nonExistentId");
      assertExists(result.error);
      assertEquals(result.error, "Body map not found");
    });

    await tStep.step("requires: body map status must be 'completed'", async () => {
      // Test with pending status
      const pendingResult = await retrieveBodyMap(db, testBodyMapId);
      assertExists(pendingResult.error);
      assertEquals(pendingResult.error, `Body map generation is not completed. Current status: pending`);

      // Test with failed status
      await simulateProcessing(db, testBodyMapId, "failed", undefined, "some error");
      const failedResult = await retrieveBodyMap(db, testBodyMapId);
      assertExists(failedResult.error);
      assertEquals(failedResult.error, `Body map generation is not completed. Current status: failed`);
    });

    await tStep.step("effects: returns the bodyMapUrl if status is 'completed'", async () => {
      await simulateProcessing(db, testBodyMapId, "completed", completedUrl);
      const result = await retrieveBodyMap(db, testBodyMapId);
      assertEquals(result.error, undefined);
      assertEquals(result.bodyMapUrl, completedUrl);
    });

    await tStep.step("effects: returns error if status is 'completed' but no URL found (edge case)", async () => {
        // Force a completed status without a URL (shouldn't happen with simulateProcessing, but for robustness)
        const key = ["body_maps", testBodyMapId];
        const recordResult = await db.get<BodyMapRecord>(key);
        const record = recordResult.value!;
        record.status = "completed";
        record.bodyMapUrl = undefined; // Explicitly unset
        await db.set(key, record);

        const result = await retrieveBodyMap(db, testBodyMapId);
        assertExists(result.error);
        assertEquals(result.error, "Body map URL not found for a completed record.");
    });
  });

  // --- Ensure the principle is fully modeled by the actions ---
  await t.step("principle: User can initiate, monitor, and retrieve a body map", async () => {
    const patientId = "principlePatient";
    const scanDataId = "principleScan";
    const expectedBodyMapUrl = "http://example.com/principle/map.png";

    // 1. Initiate Generation
    const { bodyMapId: initiatedId, error: initError } = await initiateGeneration(
      db,
      patientId,
      scanDataId,
    );
    assertEquals(initError, undefined, "Principle: Failed to initiate generation.");
    assertExists(initiatedId, "Principle: Expected bodyMapId after initiation.");
    const bodyMapId = initiatedId!;

    // Verify initial status is 'pending'
    const { status: initialStatus, error: initialStatusError } = await getGenerationStatus(
      db,
      bodyMapId,
    );
    assertEquals(initialStatusError, undefined, "Principle: Error getting initial status.");
    assertEquals(initialStatus, "pending", "Principle: Initial status should be 'pending'.");

    // 2. Monitor Progress (simulate processing to 'processing' - though our mock skips this intermediate step)
    // In a real system, you might poll here, simulating time passing.
    // For this concept test, we'll simulate direct completion.

    // 3. Simulate completion of generation
    const processed = await simulateProcessing(db, bodyMapId, "completed", expectedBodyMapUrl);
    assertEquals(processed, true, "Principle: Failed to simulate processing to completed.");

    // Verify status is 'completed'
    const { status: completedStatus, bodyMapUrl: retrievedUrlFromStatus, error: completedStatusError } =
      await getGenerationStatus(db, bodyMapId);
    assertEquals(completedStatusError, undefined, "Principle: Error getting completed status.");
    assertEquals(completedStatus, "completed", "Principle: Status should be 'completed' after processing.");
    assertEquals(retrievedUrlFromStatus, expectedBodyMapUrl, "Principle: BodyMapUrl should be available in status.");

    // 4. Retrieve Body Map
    const { bodyMapUrl, error: retrieveError } = await retrieveBodyMap(db, bodyMapId);
    assertEquals(retrieveError, undefined, "Principle: Failed to retrieve body map.");
    assertEquals(bodyMapUrl, expectedBodyMapUrl, "Principle: Retrieved URL should match expected URL.");
  });
});

# trace:
```

1. **Initiate Generation**:
   * `initiateGeneration(db, "principlePatient", "principleScan")` is called.
   * This action `requires` non-empty `patientId` and `scanDataId`, which are provided.
   * The `effects` of this action are:
     * A new `BodyMapRecord` is created in the `testDb` with `status: 'pending'`.
     * A unique `bodyMapId` is returned.
   * We assert that `bodyMapId` exists and no `error` is returned.

2. **Monitor Status (Initial)**:
   * `getGenerationStatus(db, bodyMapId)` is called using the `bodyMapId` from step 1.
   * This action `requires` a valid `bodyMapId`.
   * The `effects` of this action are:
     * The record's `status` ("pending") is returned.
   * We assert that the `status` is "pending".

3. **Simulate Processing Completion**:
   * `simulateProcessing(db, bodyMapId, "completed", "http://example.com/principle/map.png")` is called. (This is a mock helper, not a core action, but simulates the internal system process).
   * This updates the `BodyMapRecord` in `testDb` to `status: 'completed'` and sets `bodyMapUrl`.
   * We assert that the simulation was successful.

4. **Monitor Status (Completed)**:
   * `getGenerationStatus(db, bodyMapId)` is called again.
   * The `effects` return the updated `status` ("completed") and the `bodyMapUrl`.
   * We assert that the `status` is "completed" and `bodyMapUrl` matches the expected one.

5. **Retrieve Body Map**:
   * `retrieveBodyMap(db, bodyMapId)` is called.
   * This action `requires` a valid `bodyMapId` and `status: 'completed'`. Both are satisfied.
   * The `effects` return the `bodyMapUrl`.
   * We assert that `bodyMapUrl` matches the expected URL and no `error` is returned.

```
```
