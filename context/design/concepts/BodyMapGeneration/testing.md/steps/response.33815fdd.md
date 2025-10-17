---
timestamp: 'Fri Oct 17 2025 13:16:51 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_131651.f093d87a.md]]'
content_id: 33815fddc6bddb492f5d8780122b0a2f7609e327b405c3ca3acf39e2759dd294
---

# response:

```typescript
import { assertEquals, assertRejects, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ObjectId } from "npm:mongodb"; // Assuming ObjectId is used for IDs

// --- MOCK CONCEPT IMPLEMENTATION (for testing purposes) ---
// In a real scenario, these would be imported from the concept's implementation file.

/**
 * Represents the state of a single body section.
 */
interface BodySection {
  health: number;
  status: string; // e.g., "healthy", "injured", "critical"
}

/**
 * Represents a character's full body map.
 */
interface BodyMap {
  _id: ObjectId; // Corresponds to characterId
  sections: Record<string, BodySection>;
}

/**
 * Default sections and their initial state for a new body map.
 */
const DEFAULT_BODY_SECTIONS: Record<string, BodySection> = {
  head: { health: 100, status: "healthy" },
  torso: { health: 100, status: "healthy" },
  leftArm: { health: 100, status: "healthy" },
  rightArm: { health: 100, status: "healthy" },
  leftLeg: { health: 100, status: "healthy" },
  rightLeg: { health: 100, status: "healthy" },
};

/**
 * Action: Initializes a body map for a new character.
 * @param db The database client.
 * @param characterId The ID of the character.
 * @returns The newly created body map.
 * @throws Error if characterId is missing or a body map already exists for the character.
 */
async function initializeBodyMap(db: any, characterId: ObjectId): Promise<BodyMap> {
  // Requires: characterId is provided
  if (!characterId) {
    throw new Error("Character ID is required.");
  }

  // Requires: A body map for characterId does not already exist
  const existingBodyMap = await db.collection("bodyMaps").findOne({ _id: characterId });
  if (existingBodyMap) {
    throw new Error(`Body map for character ${characterId} already exists.`);
  }

  const newBodyMap: BodyMap = {
    _id: characterId,
    sections: { ...DEFAULT_BODY_SECTIONS }, // Deep copy to avoid mutation issues
  };

  // Effects: A new bodyMap document is created
  await db.collection("bodyMaps").insertOne(newBodyMap);

  return newBodyMap;
}

/**
 * Action: Updates the health and/or status of a specific body section for a character.
 * @param db The database client.
 * @param characterId The ID of the character.
 * @param sectionName The name of the section to update (e.g., "head").
 * @param updates The partial updates for the section (health, status).
 * @returns The updated body section.
 * @throws Error if characterId, sectionName, or updates are missing, if the body map or section doesn't exist.
 */
async function updateBodyMapSection(
  db: any,
  characterId: ObjectId,
  sectionName: string,
  updates: Partial<BodySection>,
): Promise<BodySection> {
  // Requires: characterId, sectionName, updates are provided
  if (!characterId || !sectionName || !updates) {
    throw new Error("Character ID, section name, and updates are required.");
  }

  // Requires: A body map for characterId must exist
  const bodyMap = await db.collection("bodyMaps").findOne({ _id: characterId });
  if (!bodyMap) {
    throw new Error(`Body map for character ${characterId} not found.`);
  }

  // Requires: sectionName exists in the character's body map
  if (!bodyMap.sections[sectionName]) {
    throw new Error(`Section "${sectionName}" not found in character's body map.`);
  }

  const currentSection = bodyMap.sections[sectionName];
  const updatedSection: BodySection = {
    ...currentSection,
    ...updates,
  };

  // Effects: The specified section is updated
  await db.collection("bodyMaps").updateOne(
    { _id: characterId },
    { $set: { [`sections.${sectionName}`]: updatedSection } },
  );

  return updatedSection;
}

// --- CONCEPT TESTING ---

// file: src/BodyMapGeneration/BodyMapGenerationConcept.test.ts
Deno.test("BodyMapGeneration Concept Testing", async (t) => {
  const [db, client] = await testDb();

  // Test suite for 'initializeBodyMap' action
  await t.step("Action: initializeBodyMap", async (st) => {
    // Confirm 'requires' is satisfied
    await st.step("should reject if characterId is not provided", async () => {
      const charId = undefined as unknown as ObjectId; // Explicitly pass undefined
      await assertRejects(
        () => initializeBodyMap(db, charId),
        Error,
        "Character ID is required.",
      );
    });

    await st.step("should reject if a body map already exists for the character", async () => {
      const characterId = new ObjectId();
      await initializeBodyMap(db, characterId); // First time should succeed

      await assertRejects(
        () => initializeBodyMap(db, characterId),
        Error,
        `Body map for character ${characterId} already exists.`,
      );

      // Clean up for subsequent tests if this was a shared ID
      await db.collection("bodyMaps").deleteOne({ _id: characterId });
    });

    // Confirm 'effects' is satisfied
    await st.step("should create a new body map with default sections and return it", async () => {
      const characterId = new ObjectId();
      const result = await initializeBodyMap(db, characterId);

      // Verify return value
      assertExists(result._id);
      assertEquals(result._id, characterId);
      assertEquals(Object.keys(result.sections).length, Object.keys(DEFAULT_BODY_SECTIONS).length);
      assertEquals(result.sections.head.health, 100);
      assertEquals(result.sections.head.status, "healthy");

      // Verify database state
      const storedBodyMap = await db.collection("bodyMaps").findOne({ _id: characterId });
      assertExists(storedBodyMap);
      assertEquals(storedBodyMap._id, characterId);
      assertEquals(storedBodyMap.sections, DEFAULT_BODY_SECTIONS);
    });
  });

  // Test suite for 'updateBodyMapSection' action
  await t.step("Action: updateBodyMapSection", async (st) => {
    const characterId = new ObjectId();
    await initializeBodyMap(db, characterId); // Ensure a body map exists for testing updates

    // Confirm 'requires' is satisfied
    await st.step("should reject if characterId is not provided", async () => {
      const charId = undefined as unknown as ObjectId;
      await assertRejects(
        () => updateBodyMapSection(db, charId, "head", { health: 50 }),
        Error,
        "Character ID, section name, and updates are required.",
      );
    });

    await st.step("should reject if sectionName is not provided", async () => {
      await assertRejects(
        () => updateBodyMapSection(db, characterId, "", { health: 50 }),
        Error,
        "Character ID, section name, and updates are required.",
      );
    });

    await st.step("should reject if updates object is not provided", async () => {
      const updates = undefined as unknown as Partial<BodySection>;
      await assertRejects(
        () => updateBodyMapSection(db, characterId, "head", updates),
        Error,
        "Character ID, section name, and updates are required.",
      );
    });

    await st.step("should reject if body map for characterId does not exist", async () => {
      const nonExistentCharId = new ObjectId();
      await assertRejects(
        () => updateBodyMapSection(db, nonExistentCharId, "head", { health: 50 }),
        Error,
        `Body map for character ${nonExistentCharId} not found.`,
      );
    });

    await st.step("should reject if sectionName does not exist in the body map", async () => {
      await assertRejects(
        () => updateBodyMapSection(db, characterId, "nonExistentSection", { health: 50 }),
        Error,
        `Section "nonExistentSection" not found in character's body map.`,
      );
    });

    // Confirm 'effects' is satisfied
    await st.step("should update a specific section's health and return the updated section", async () => {
      const updatedSection = await updateBodyMapSection(db, characterId, "leftArm", { health: 75 });

      // Verify return value
      assertEquals(updatedSection.health, 75);
      assertEquals(updatedSection.status, "healthy"); // Status should remain unchanged if not specified

      // Verify database state
      const storedBodyMap = await db.collection("bodyMaps").findOne({ _id: characterId });
      assertExists(storedBodyMap);
      assertEquals(storedBodyMap.sections.leftArm.health, 75);
      assertEquals(storedBodyMap.sections.leftArm.status, "healthy");
    });

    await st.step("should update a specific section's status and return the updated section", async () => {
      const updatedSection = await updateBodyMapSection(db, characterId, "torso", { status: "injured" });

      // Verify return value
      assertEquals(updatedSection.health, 100); // Health should remain unchanged
      assertEquals(updatedSection.status, "injured");

      // Verify database state
      const storedBodyMap = await db.collection("bodyMaps").findOne({ _id: characterId });
      assertExists(storedBodyMap);
      assertEquals(storedBodyMap.sections.torso.health, 100);
      assertEquals(storedBodyMap.sections.torso.status, "injured");
    });

    await st.step("should update multiple properties of a section and return the updated section", async () => {
      const updatedSection = await updateBodyMapSection(db, characterId, "head", { health: 20, status: "critical" });

      // Verify return value
      assertEquals(updatedSection.health, 20);
      assertEquals(updatedSection.status, "critical");

      // Verify database state
      const storedBodyMap = await db.collection("bodyMaps").findOne({ _id: characterId });
      assertExists(storedBodyMap);
      assertEquals(storedBodyMap.sections.head.health, 20);
      assertEquals(storedBodyMap.sections.head.status, "critical");
    });
  });

  // Ensure that the 'principle' is fully modeled by the actions
  await t.step("Principle: Full Body Map Generation and Update Trace", async () => {
    // trace:
    // 1. A new character 'Hero' is created, and their body map is initialized.
    // 2. Hero takes heavy damage to the left arm.
    // 3. Hero takes moderate damage to the torso.
    // 4. Hero's left arm is healed.
    // 5. Hero takes critical damage to the head.
    // 6. Verify the final state of Hero's body map reflects all actions.

    const heroId = new ObjectId();

    // 1. Initialize Body Map
    const initialBodyMap = await initializeBodyMap(db, heroId);
    assertEquals(initialBodyMap.sections.head.health, 100);
    assertEquals(initialBodyMap.sections.leftArm.status, "healthy");

    // 2. Hero takes heavy damage to the left arm.
    await updateBodyMapSection(db, heroId, "leftArm", { health: 30, status: "severely injured" });

    // 3. Hero takes moderate damage to the torso.
    await updateBodyMapSection(db, heroId, "torso", { health: 60, status: "bruised" });

    // 4. Hero's left arm is healed (partially).
    await updateBodyMapSection(db, heroId, "leftArm", { health: 80, status: "recovering" });

    // 5. Hero takes critical damage to the head.
    await updateBodyMapSection(db, heroId, "head", { health: 10, status: "critical" });

    // 6. Verify the final state of Hero's body map
    const finalBodyMap = await db.collection("bodyMaps").findOne({ _id: heroId });
    assertExists(finalBodyMap);

    assertEquals(finalBodyMap.sections.head.health, 10);
    assertEquals(finalBodyMap.sections.head.status, "critical");

    assertEquals(finalBodyMap.sections.torso.health, 60);
    assertEquals(finalBodyMap.sections.torso.status, "bruised");

    assertEquals(finalBodyMap.sections.leftArm.health, 80);
    assertEquals(finalBodyMap.sections.leftArm.status, "recovering");

    // Other sections should remain at their default healthy state
    assertEquals(finalBodyMap.sections.rightArm.health, 100);
    assertEquals(finalBodyMap.sections.rightArm.status, "healthy");
    assertEquals(finalBodyMap.sections.leftLeg.health, 100);
    assertEquals(finalBodyMap.sections.leftLeg.status, "healthy");
    assertEquals(finalBodyMap.sections.rightLeg.health, 100);
    assertEquals(finalBodyMap.sections.rightLeg.status, "healthy");
  });

  await client.close();
});
```
