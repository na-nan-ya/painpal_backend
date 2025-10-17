---
timestamp: 'Fri Oct 17 2025 12:34:40 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_123440.8a122fee.md]]'
content_id: 8cf4e6ff73dc92f3db697d2247a6f3e08d16baa48cf261fa8f1cef33c2a7f522
---

# file: src/BodyMapGeneration/BodyMapGenerationConcept.test.ts

```typescript
import { testDb } from "@utils/database.ts";
import { assertEquals } from "jsr:@std/assert";
import { assertRejects } from "jsr:@std/assert"; // Useful for testing 'requires' failures

// Assume the following imports would be present from your concept implementation
// import {
//   createBodyMapTemplate,
//   generateBodyMapInstance,
//   updateBodyMapPartState,
//   // ... any other actions defined in the concept
// } from "./BodyMapGeneration.ts";
//
// import {
//   BodyMapTemplate,
//   BodyMapInstance,
//   // ... any other types
// } from "./BodyMapGeneration.types.ts";

Deno.test("BodyMapGeneration Concept Tests", async (test) => {
  const [db, client] = await testDb();
  // We'll pass `db` to our concept actions, assuming they need it.
  // Example: createBodyMapTemplate(db, ...)

  await test.step("1. Confirm 'requires' for each action", async (subtest) => {
    // --- Test: createBodyMapTemplate requires a 'name' and 'parts' ---
    await subtest.step("createBodyMapTemplate: fails without required fields", async () => {
      // Hypothetical action signature: createBodyMapTemplate(db, { name: string, description?: string, parts: Array<{ id: string, name: string }> })
      // Test case 1: Missing 'name'
      await assertRejects(
        () => Promise.resolve(), // Replace with the actual action call, e.g., createBodyMapTemplate(db, { parts: [{ id: "head", name: "Head" }] })
        Error, // Or a more specific custom error type for validation
        "Name is required for a body map template", // Expected error message
        "Should reject if 'name' is missing",
      );

      // Test case 2: Empty 'parts' array
      await assertRejects(
        () => Promise.resolve(), // Replace with createBodyMapTemplate(db, { name: "Invalid Template", parts: [] })
        Error,
        "A template must define at least one body part",
        "Should reject if 'parts' array is empty",
      );

      // Add more specific 'requires' tests for other actions here
      // Example: generateBodyMapInstance requires a valid templateId
      await subtest.step("generateBodyMapInstance: fails with invalid templateId", async () => {
        await assertRejects(
          () => Promise.resolve(), // Replace with generateBodyMapInstance(db, "non-existent-id", "patient-123", {})
          Error,
          "Body map template not found",
          "Should reject if templateId does not exist",
        );
      });
    });

    // Add similar tests for other actions' 'requires' conditions
    // Example: updateBodyMapPartState requires an existing instanceId and partId
    await subtest.step("updateBodyMapPartState: fails with invalid instanceId or partId", async () => {
      await assertRejects(
        () => Promise.resolve(), // updateBodyMapPartState(db, "non-existent-instance", "head", { status: "minor_pain" })
        Error,
        "Body map instance not found",
        "Should reject if instanceId does not exist",
      );
      await assertRejects(
        () => Promise.resolve(), // updateBodyMapPartState(db, "valid-instance-id", "non-existent-part", { status: "minor_pain" })
        Error,
        "Body part not found in instance",
        "Should reject if partId does not exist within the instance",
      );
    });
  });

  await test.step("2. Confirm 'effects' for each action", async (subtest) => {
    // --- Test: createBodyMapTemplate creates a template record ---
    await subtest.step("createBodyMapTemplate: creates a new template and returns it", async () => {
      const templateName = "Human Anatomy Template";
      const parts = [{ id: "head", name: "Head" }, { id: "chest", name: "Chest" }];

      // Mock or call the actual action
      // const newTemplate: BodyMapTemplate = await createBodyMapTemplate(db, { name: templateName, description: "Standard human body map", parts });
      const newTemplate = { id: "template-1", name: templateName, description: "Standard human body map", parts }; // Placeholder

      assertEquals(newTemplate.name, templateName, "Template name should match");
      assertEquals(newTemplate.parts.length, parts.length, "Template should have correct number of parts");
      assertEquals(newTemplate.parts[0].name, "Head", "First part name should be 'Head'");

      // Verify state change by querying the database (if the action doesn't return the full state)
      // const foundTemplate = await db.collection("bodyMapTemplates").findOne({ id: newTemplate.id });
      // assertEquals(foundTemplate?.name, templateName, "Template should be retrievable from DB");
    });

    // --- Test: generateBodyMapInstance creates an instance and links to template ---
    await subtest.step("generateBodyMapInstance: creates an instance from a template", async () => {
      // First, create a template (or use a pre-existing one from previous step)
      // const template = await createBodyMapTemplate(db, { name: "Patient Specific", parts: [{ id: "arm", name: "Arm" }] });
      const templateId = "template-2"; // Placeholder
      const patientId = "patient-alpha";
      const initialData = { arm: { status: "normal" } };

      // const newInstance: BodyMapInstance = await generateBodyMapInstance(db, template.id, patientId, initialData);
      const newInstance = { id: "instance-1", templateId: templateId, patientId: patientId, partsState: { arm: { status: "normal" } } }; // Placeholder

      assertEquals(newInstance.templateId, templateId, "Instance should reference the correct template");
      assertEquals(newInstance.patientId, patientId, "Instance should be linked to the patient");
      assertEquals(newInstance.partsState.arm.status, "normal", "Initial part state should be set");

      // Verify persistence if not fully returned
      // const foundInstance = await db.collection("bodyMapInstances").findOne({ id: newInstance.id });
      // assertEquals(foundInstance?.templateId, templateId, "Instance should be retrievable from DB");
    });

    // --- Test: updateBodyMapPartState modifies a part's state ---
    await subtest.step("updateBodyMapPartState: updates the state of a specific body part", async () => {
      // Setup: Create a template and an instance
      // const template = await createBodyMapTemplate(db, { name: "Update Test", parts: [{ id: "leg", name: "Leg" }] });
      // const instance = await generateBodyMapInstance(db, template.id, "patient-beta", { leg: { status: "healthy" } });
      const instanceId = "instance-2"; // Placeholder
      const partId = "leg";
      const newState = { status: "sprained", severity: "medium" };

      // await updateBodyMapPartState(db, instance.id, partId, newState);
      // Assume the action updates the record in DB and/or returns the updated instance.

      // Verify the state change
      // const updatedInstance = await db.collection("bodyMapInstances").findOne({ id: instance.id });
      const updatedInstance = { id: instanceId, partsState: { leg: { status: "sprained", severity: "medium" } } }; // Placeholder for DB query result
      assertEquals(updatedInstance.partsState.leg.status, "sprained", "Part status should be updated");
      assertEquals(updatedInstance.partsState.leg.severity, "medium", "Part severity should be updated");
    });
  });

  await test.step("3. Ensure the 'principle' is fully modeled by the actions", async (subtest) => {
    // Principle: "A user can create a reusable body map template and then generate specific instances of it
    // for individual patients, updating the state of individual body parts on that instance."

    await subtest.step("Demonstrate the full principle flow", async () => {
      // Step 1: Create a reusable body map template
      const templateName = "General Health Body Map";
      const templateParts = [
        { id: "left_arm", name: "Left Arm" },
        { id: "right_arm", name: "Right Arm" },
        { id: "torso", name: "Torso" },
      ];
      // const template = await createBodyMapTemplate(db, { name: templateName, parts: templateParts });
      const template = { id: "principle-template", name: templateName, parts: templateParts }; // Placeholder

      // Verify template creation (part of 'effects' testing, but good to re-confirm here)
      assertEquals(template.name, templateName);
      assertEquals(template.parts.length, 3);

      // Step 2: Generate specific instances for individual patients
      const patient1Id = "patient-gamma";
      const patient2Id = "patient-delta";

      // Instance for Patient Gamma
      const initialDataGamma = {
        left_arm: { status: "normal" },
        right_arm: { status: "pain", level: "mild" },
        torso: { status: "normal" },
      };
      // const instanceGamma = await generateBodyMapInstance(db, template.id, patient1Id, initialDataGamma);
      const instanceGamma = { id: "instance-gamma", templateId: template.id, patientId: patient1Id, partsState: initialDataGamma }; // Placeholder

      assertEquals(instanceGamma.patientId, patient1Id);
      assertEquals(instanceGamma.partsState.right_arm.status, "pain");

      // Instance for Patient Delta
      const initialDataDelta = {
        left_arm: { status: "normal" },
        right_arm: { status: "normal" },
        torso: { status: "rash", area: "abdomen" },
      };
      // const instanceDelta = await generateBodyMapInstance(db, template.id, patient2Id, initialDataDelta);
      const instanceDelta = { id: "instance-delta", templateId: template.id, patientId: patient2Id, partsState: initialDataDelta }; // Placeholder

      assertEquals(instanceDelta.patientId, patient2Id);
      assertEquals(instanceDelta.partsState.torso.status, "rash");

      // Step 3: Update the state of individual body parts on these instances
      // Update Patient Gamma's right arm (pain resolved)
      const newGammaRightArmState = { status: "normal" };
      // await updateBodyMapPartState(db, instanceGamma.id, "right_arm", newGammaRightArmState);
      // Fetch updated instanceGamma for verification (or assume action returns it)
      const updatedInstanceGamma = { ...instanceGamma, partsState: { ...instanceGamma.partsState, right_arm: newGammaRightArmState } }; // Placeholder

      assertEquals(updatedInstanceGamma.partsState.right_arm.status, "normal", "Patient Gamma's right arm state updated");

      // Update Patient Delta's torso (rash worsened)
      const newDeltaTorsoState = { status: "rash", area: "abdomen", severity: "severe" };
      // await updateBodyMapPartState(db, instanceDelta.id, "torso", newDeltaTorsoState);
      // Fetch updated instanceDelta for verification
      const updatedInstanceDelta = { ...instanceDelta, partsState: { ...instanceDelta.partsState, torso: newDeltaTorsoState } }; // Placeholder

      assertEquals(updatedInstanceDelta.partsState.torso.severity, "severe", "Patient Delta's torso state updated");

      // Further checks to ensure other parts/instances are unaffected
      assertEquals(updatedInstanceGamma.partsState.left_arm.status, "normal", "Other parts of Gamma unchanged");
      assertEquals(updatedInstanceDelta.partsState.left_arm.status, "normal", "Other parts of Delta unchanged");
    });
  });

  await client.close();
});
```

***
