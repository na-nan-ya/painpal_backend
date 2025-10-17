---
timestamp: 'Fri Oct 17 2025 12:06:03 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_120603.513c74b6.md]]'
content_id: 0a8a1510c85c1e737eeef5dd42cb6f2337afbeafecdd5b76d39d78c446e19461
---

# response:

```typescript
// For simplicity in this concept test, we define the interfaces and action implementations
// directly within the test file. In a real application, these would typically be in
// separate files (e.g., `src/BodyMapGeneration/types.ts` and `src/BodyMapGeneration/actions.ts`).

import { testDb } from "@utils/database.ts";
import { assertEquals, assertExists, assertInstanceOf, assertNotEquals } from "jsr:@std/assert";

// --- Mock Types for BodyMapGeneration Concept ---

/** Represents a single part of a body definition. */
interface BodyPart {
  id: string;   // Unique identifier for the part within a definition
  name: string; // Human-readable name of the part
  type: string; // Category or type of the part (e.g., "organ", "limb", "sensor")
}

/** Defines the structure and components of a body. */
interface BodyDefinition {
  _id: string;  // Database document ID (e.g., "bodyDefinition:{uuid}")
  _rev?: string; // Revision ID for CouchDB/PouchDB
  name: string; // Unique name for the body definition (e.g., "Humanoid", "QuadrupedRobot")
  parts: BodyPart[]; // Array of parts that constitute this body
}

/** Represents a generated map of a body based on a BodyDefinition. */
interface BodyMap {
  _id: string;  // Database document ID (e.g., "bodyMap:{uuid}")
  _rev?: string; // Revision ID for CouchDB/PouchDB
  bodyDefinitionId: string; // ID of the BodyDefinition this map was generated from
  generatedAt: string; // ISO 8601 timestamp of when the map was generated
  mappedParts: BodyPart[]; // The parts derived from the BodyDefinition at generation time
}

/** Type for action return values that can contain an error. */
type ActionReturn<T> = T | { error: string };

// --- Action Implementations for BodyMapGeneration Concept ---

/**
 * Creates a new BodyDefinition in the database.
 *
 * @param db The PouchDB database instance.
 * @param name The unique name for the body definition.
 * @param parts An array of BodyPart objects.
 * @returns The created BodyDefinition or an error object.
 */
async function createBodyDefinition(
  db: PouchDB.Database,
  name: string,
  parts: BodyPart[],
): Promise<ActionReturn<BodyDefinition>> {
  if (!name || name.trim() === "") {
    return { error: "Name is required." };
  }
  if (!parts || parts.length === 0) {
    return { error: "Parts array cannot be empty." };
  }

  // Check for unique part IDs within the input parts array
  const partIds = new Set<string>();
  for (const part of parts) {
    if (partIds.has(part.id)) {
      return { error: `Duplicate part ID within input: ${part.id}` };
    }
    partIds.add(part.id);
  }

  // Check for existing BodyDefinition with the same 'name'.
  // This requires querying the database. For PouchDB/CouchDB, this often
  // involves a design document and view, or iterating if the dataset is small.
  // We'll use a simple query function for demonstration.
  try {
    const queryResult = await db.query<{ name: string }>((doc, emit) => {
      // Simple map function to find docs by name
      if (doc._id && doc._id.startsWith("bodyDefinition:") && doc.name === name) {
        emit(doc._id, doc.name); // Emit key (name) and value (name) for easy lookup
      }
    }, { key: name, include_docs: false });

    if (queryResult.rows.length > 0) {
      return { error: `BodyDefinition with name '${name}' already exists.` };
    }
  } catch (e) {
    // Handle cases where the view might not be ready or other query errors
    console.error("Error querying for existing BodyDefinition by name:", e);
    return { error: "Database error during uniqueness check for body definition name." };
  }

  const newDef: BodyDefinition = {
    _id: `bodyDefinition:${crypto.randomUUID()}`, // Use a UUID for a globally unique ID
    name,
    parts: [...parts], // Store a copy of the parts array
  };

  try {
    await db.put(newDef);
    return newDef;
  } catch (e: any) {
    return { error: `Failed to create BodyDefinition: ${e.message}` };
  }
}

/**
 * Generates a BodyMap from an existing BodyDefinition.
 *
 * @param db The PouchDB database instance.
 * @param bodyDefinitionId The ID of the BodyDefinition to generate a map from.
 * @returns The created BodyMap or an error object.
 */
async function generateBodyMap(
  db: PouchDB.Database,
  bodyDefinitionId: string,
): Promise<ActionReturn<BodyMap>> {
  if (!bodyDefinitionId || bodyDefinitionId.trim() === "") {
    return { error: "bodyDefinitionId is required." };
  }

  let definition: BodyDefinition;
  try {
    // Retrieve the BodyDefinition by its ID
    definition = await db.get(bodyDefinitionId) as BodyDefinition;
    // Basic check to ensure it's a BodyDefinition document
    if (!definition._id.startsWith("bodyDefinition:")) {
      return { error: `Document with ID '${bodyDefinitionId}' is not a BodyDefinition.` };
    }
  } catch (e: any) {
    if (e.status === 404) {
      return { error: `BodyDefinition with ID '${bodyDefinitionId}' not found.` };
    }
    return { error: `Failed to retrieve BodyDefinition: ${e.message}` };
  }

  // A BodyDefinition must have parts to generate a meaningful map
  if (!definition.parts || definition.parts.length === 0) {
    return { error: `BodyDefinition '${bodyDefinitionId}' has no parts to map.` };
  }

  const newMap: BodyMap = {
    _id: `bodyMap:${crypto.randomUUID()}`,
    bodyDefinitionId: definition._id,
    generatedAt: new Date().toISOString(), // Timestamp of generation
    mappedParts: [...definition.parts], // Copy the parts from the definition
  };

  try {
    await db.put(newMap);
    return newMap;
  } catch (e: any) {
    return { error: `Failed to create BodyMap: ${e.message}` };
  }
}

// --- Test Implementation ---

# file: src/BodyMapGeneration/BodyMapGenerationConcept.test.ts

Deno.test("BodyMapGeneration Concept", async (t) => {
  // Setup: Initialize a test database before all tests in this file.
  // The database is automatically dropped before each test file by `testDb`.
  const [db, client] = await testDb();

  await t.step("Action: createBodyDefinition", async (st) => {

    st.test("requires: name is required", async () => {
      const result = await createBodyDefinition(db, "", [{ id: "eye", name: "Eye", type: "sensor" }]);
      assertEquals((result as { error: string }).error, "Name is required.");
    });

    st.test("requires: parts array cannot be empty", async () => {
      const result = await createBodyDefinition(db, "EmptyPartsBody", []);
      assertEquals((result as { error: string }).error, "Parts array cannot be empty.");
    });

    st.test("requires: parts must have unique IDs within the input", async () => {
      const result = await createBodyDefinition(db, "DuplicatedPartBody", [
        { id: "sensor_a", name: "Sensor A", type: "sensor" },
        { id: "sensor_a", name: "Sensor B", type: "sensor" }, // Duplicate ID
      ]);
      assertEquals((result as { error: string }).error, "Duplicate part ID within input: sensor_a");
    });

    st.test("requires: name must be unique across definitions", async () => {
      // First definition with a unique name
      const initialDef = await createBodyDefinition(db, "UniqueRobot", [{ id: "chassis", name: "Chassis", type: "frame" }]) as BodyDefinition;
      assertExists(initialDef._id, "Initial BodyDefinition should be created successfully.");

      // Attempt to create another definition with the same name
      const result = await createBodyDefinition(db, "UniqueRobot", [{ id: "arm", name: "Arm", type: "limb" }]);
      assertEquals((result as { error: string }).error, "BodyDefinition with name 'UniqueRobot' already exists.");
    });

    st.test("effects: a new BodyDefinition record is created and returned", async () => {
      const definitionName = "HoverDrone";
      const definitionParts = [
        { id: "propeller_1", name: "Propeller 1", type: "propulsion" },
        { id: "battery", name: "Battery", type: "power" },
      ];
      const result = await createBodyDefinition(db, definitionName, definitionParts) as BodyDefinition;

      // Verify the returned object
      assertExists(result._id, "Returned BodyDefinition should have an _id.");
      assertEquals(result.name, definitionName, "Returned BodyDefinition name should match input.");
      assertEquals(result.parts, definitionParts, "Returned BodyDefinition parts should match input.");
      assertInstanceOf(result, Object, "Returned result should be an object.");

      // Verify the record exists in the database
      const fetched = await db.get(result._id) as BodyDefinition;
      assertEquals(fetched._id, result._id, "Fetched BodyDefinition ID should match the created one.");
      assertEquals(fetched.name, definitionName, "Fetched BodyDefinition name should match.");
      assertEquals(fetched.parts, definitionParts, "Fetched BodyDefinition parts should match.");
    });
  });

  await t.step("Action: generateBodyMap", async (st) => {
    let baseBodyDefinition: BodyDefinition;

    // Setup: Create a BodyDefinition that will be used for subsequent tests in this step.
    await Deno.test.beforeAll(async () => {
      const setupParts = [
        { id: "wing_left", name: "Left Wing", type: "aerodynamic" },
        { id: "fuselage", name: "Fuselage", type: "structure" },
      ];
      baseBodyDefinition = await createBodyDefinition(db, "AircraftModel", setupParts) as BodyDefinition;
      assertExists(baseBodyDefinition._id, "Pre-requisite BodyDefinition for generateBodyMap should be created.");
    });

    st.test("requires: bodyDefinitionId is required", async () => {
      const result = await generateBodyMap(db, "");
      assertEquals((result as { error: string }).error, "bodyDefinitionId is required.");
    });

    st.test("requires: BodyDefinition must exist", async () => {
      const result = await generateBodyMap(db, "nonExistentBodyDef123");
      assertEquals((result as { error: string }).error, "BodyDefinition with ID 'nonExistentBodyDef123' not found.");
    });

    st.test("requires: BodyDefinition must have parts (covered by createBodyDefinition)", async () => {
      // The `createBodyDefinition` action already prevents the creation of a BodyDefinition
      // with empty parts. Therefore, any valid BodyDefinition ID passed to `generateBodyMap`
      // will implicitly refer to a definition that *has* parts. This requirement is thus
      // enforced upstream, ensuring `generateBodyMap` never receives a definition without parts
      // if `createBodyDefinition` is the only entry point for definitions.
      // If direct database insertion was possible, one would test this by inserting a definition
      // with `parts: []` and verifying `generateBodyMap` returns an error.
    });

    st.test("effects: a new BodyMap record is created, linked, and returned", async () => {
      const result = await generateBodyMap(db, baseBodyDefinition._id) as BodyMap;

      // Verify the returned object
      assertExists(result._id, "Returned BodyMap should have an _id.");
      assertEquals(result.bodyDefinitionId, baseBodyDefinition._id, "BodyMap should link to the correct BodyDefinition.");
      assertEquals(result.mappedParts, baseBodyDefinition.parts, "BodyMap's parts should be a copy of the BodyDefinition's parts.");
      assertExists(result.generatedAt, "BodyMap should have a generation timestamp.");
      // Ensure generatedAt is a valid ISO date string
      assertInstanceOf(new Date(result.generatedAt), Date, "generatedAt should be a valid date string.");

      // Verify the record exists in the database
      const fetched = await db.get(result._id) as BodyMap;
      assertEquals(fetched._id, result._id, "Fetched BodyMap ID should match the created one.");
      assertEquals(fetched.bodyDefinitionId, baseBodyDefinition._id, "Fetched BodyMap should link to the correct BodyDefinition.");
      assertEquals(fetched.mappedParts, baseBodyDefinition.parts, "Fetched BodyMap's parts should match definition's parts.");
      assertEquals(fetched.generatedAt, result.generatedAt, "Fetched BodyMap's generatedAt timestamp should match.");
    });

    st.test("effects: multiple BodyMaps can be generated from the same definition, each unique", async () => {
      const map1 = await generateBodyMap(db, baseBodyDefinition._id) as BodyMap;
      const map2 = await generateBodyMap(db, baseBodyDefinition._id) as BodyMap;

      assertExists(map1._id, "First BodyMap should be generated.");
      assertExists(map2._id, "Second BodyMap should be generated.");
      assertNotEquals(map1._id, map2._id, "Each generated BodyMap should have a unique ID.");
      assertEquals(map1.bodyDefinitionId, map2.bodyDefinitionId, "Both maps should link to the same BodyDefinition.");
      assertEquals(map1.mappedParts, map2.mappedParts, "Mapped parts should be identical for maps from the same definition.");
      assertNotEquals(map1.generatedAt, map2.generatedAt, "Generation timestamps should typically differ for sequential generations.");
    });
  });

  # trace: Full trace demonstrating the principle of BodyMapGeneration

  await t.step("Principle: A user defines a body, then generates an accurate map from that definition.", async (st) => {
    // 1. Create a BodyDefinition with specific parts.
    const principleDefName = "AutonomousVehicle";
    const principleDefParts = [
      { id: "chassis", name: "Chassis Frame", type: "structure" },
      { id: "front_sensor_array", name: "Front LIDAR/Camera", type: "sensor" },
      { id: "rear_motor", name: "Rear Electric Motor", type: "propulsion" },
      { id: "ai_computer", name: "AI Computing Unit", type: "control" },
    ];
    const createdDefinition = await createBodyDefinition(db, principleDefName, principleDefParts) as BodyDefinition;

    st.assertEquals(createdDefinition.name, principleDefName, "Principle Step 1: BodyDefinition name should be correctly set.");
    st.assertEquals(createdDefinition.parts, principleDefParts, "Principle Step 1: BodyDefinition parts should be correctly set.");
    st.assertExists(createdDefinition._id, "Principle Step 1: BodyDefinition should have been created with an ID.");

    // 2. Generate a BodyMap using the ID of the created BodyDefinition.
    const generatedMap = await generateBodyMap(db, createdDefinition._id) as BodyMap;

    st.assertExists(generatedMap._id, "Principle Step 2: BodyMap should be generated.");
    st.assertEquals(generatedMap.bodyDefinitionId, createdDefinition._id, "Principle Step 2: BodyMap should link back to the original BodyDefinition.");
    st.assertExists(generatedMap.generatedAt, "Principle Step 2: BodyMap should have a generation timestamp.");

    // 3. Verify that the BodyMap reflects the BodyDefinition's parts and includes generation metadata.
    st.assertEquals(generatedMap.mappedParts, principleDefParts, "Principle Step 3: BodyMap's parts should accurately reflect the BodyDefinition's parts.");

    // Further verification: fetch from DB to ensure persistence and integrity
    const retrievedMap = await db.get(generatedMap._id) as BodyMap;
    st.assertEquals(retrievedMap.bodyDefinitionId, createdDefinition._id, "Principle Step 3: Retrieved map's definition link is correct.");
    st.assertEquals(retrievedMap.mappedParts, principleDefParts, "Principle Step 3: Retrieved map's parts are correct.");
  });

  // Teardown: Close the database client after all tests in this file.
  await client.close();
});
```
