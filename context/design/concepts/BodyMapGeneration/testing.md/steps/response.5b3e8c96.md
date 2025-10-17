---
timestamp: 'Fri Oct 17 2025 12:48:45 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_124845.670d80c0.md]]'
content_id: 5b3e8c9692ca48ed14e7688211d8508dfdd87a362b5084e17c5937ffdb50a980
---

# response:

The `BodyMapGeneration` concept, though not explicitly provided, can be inferred from its name and common patterns in application development. It likely involves managing templates for body maps and generating instances of these maps for specific entities.

### Assumed `BodyMapGeneration` Concept Specification

* **Principle:** A `BodyMapGeneration` system enables users to create and manage body maps (e.g., anatomical diagrams with interactive regions) for different entities (e.g., patients, equipment). It allows defining templates for body maps and then generating instances of these maps, associating them with specific records. The state of each instance can be updated independently.
* **Entities:**
  * `BodyMapTemplate`: Defines the structure of a body map.
    * Fields: `id`, `name` (unique), `svg_data` (SVG string), `regions` (JSONB array of `{ id: string, label: string, default_color: string }`), `created_at`, `updated_at`.
  * `BodyMapInstance`: An instance of a `BodyMapTemplate` associated with a specific record.
    * Fields: `id`, `template_id` (FK to `BodyMapTemplate`), `entity_id` (UUID, e.g., `patient_id`), `entity_type` (string, e.g., 'Patient'), `current_data` (JSONB storing state of regions, e.g., `{ region_id: { color: 'red', notes: '...' } }`), `created_at`, `updated_at`.
    * Constraint: `(template_id, entity_id, entity_type)` must be unique.
* **Actions:**

  1. **`createBodyMapTemplate(name, svg_data, regions)`**:
     * `requires`: `name` (string, unique), `svg_data` (string, valid SVG), `regions` (array of `{ id: string, label: string, default_color: string }`, `id`s unique within array).
     * `effects`: A new `BodyMapTemplate` record is created. Returns the created record.
  2. **`getBodyMapTemplate(template_id)`**:
     * `requires`: `template_id` (UUID).
     * `effects`: Returns the `BodyMapTemplate` record or `undefined`.
  3. **`updateBodyMapTemplate(template_id, updates)`**:
     * `requires`: `template_id` (UUID), `updates` (object with optional `name`, `svg_data`, `regions`).
     * `effects`: The specified `BodyMapTemplate` is updated. Returns the updated record or `undefined`. `updated_at` is updated.
  4. **`deleteBodyMapTemplate(template_id)`**:
     * `requires`: `template_id` (UUID).
     * `effects`: The `BodyMapTemplate` record and all associated `BodyMapInstance` records are deleted (cascade). Returns `true` if deleted, `false` otherwise.
  5. **`generateBodyMapInstance(template_id, entity_id, entity_type)`**:
     * `requires`: `template_id` (UUID, must exist), `entity_id` (UUID), `entity_type` (string). No existing instance for this `(template_id, entity_id, entity_type)` combination.
     * `effects`: A new `BodyMapInstance` is created, `current_data` initialized from `BodyMapTemplate.regions.default_color`. Returns the created record.
  6. **`getBodyMapInstance(instance_id)`**:
     * `requires`: `instance_id` (UUID).
     * `effects`: Returns the `BodyMapInstance` record or `undefined`.
  7. **`updateBodyMapInstanceData(instance_id, new_data)`**:
     * `requires`: `instance_id` (UUID, must exist), `new_data` (JSONB object, keys must be valid `region_id`s from the associated `BodyMapTemplate`).
     * `effects`: `current_data` of the `BodyMapInstance` is merged with `new_data`. Returns the updated record or `undefined`. `updated_at` is updated.
  8. **`deleteBodyMapInstance(instance_id)`**:
     * `requires`: `instance_id` (UUID).
     * `effects`: The `BodyMapInstance` record is deleted. Returns `true` if deleted, `false` otherwise.

### Implementation Setup (Mock)

For testing, we'll create a mock `BodyMapGeneration` class that interacts with the `testDb`.

**`src/BodyMapGeneration/BodyMapGeneration.ts`**

```typescript
import { PgClient } from "../../utils/database.ts"; // Adjust path as needed

export type BodyMapTemplate = {
  id: string;
  name: string;
  svg_data: string;
  regions: Array<{ id: string; label: string; default_color: string }>;
  created_at: Date;
  updated_at: Date;
};

export type BodyMapInstance = {
  id: string;
  template_id: string;
  entity_id: string;
  entity_type: string;
  current_data: Record<string, { color?: string; notes?: string }>;
  created_at: Date;
  updated_at: Date;
};

export class BodyMapGeneration {
  private client: PgClient;

  constructor(client: PgClient) {
    this.client = client;
  }

  // --- BodyMapTemplate Actions ---

  async createBodyMapTemplate(
    name: string,
    svg_data: string,
    regions: Array<{ id: string; label: string; default_color: string }>,
  ): Promise<BodyMapTemplate> {
    // Basic validation for regions (unique IDs) - a full validation layer would be more robust
    const regionIds = new Set<string>();
    for (const region of regions) {
      if (regionIds.has(region.id)) {
        throw new Error(`Duplicate region ID '${region.id}' found in template regions.`);
      }
      regionIds.add(region.id);
    }

    const query = `
      INSERT INTO body_map_templates (name, svg_data, regions)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const result = await this.client.queryObject<BodyMapTemplate>(query, [
      name,
      svg_data,
      JSON.stringify(regions),
    ]);
    return result.rows[0];
  }

  async getBodyMapTemplate(template_id: string): Promise<BodyMapTemplate | undefined> {
    const query = `SELECT * FROM body_map_templates WHERE id = $1;`;
    const result = await this.client.queryObject<BodyMapTemplate>(query, [template_id]);
    return result.rows[0];
  }

  async updateBodyMapTemplate(
    template_id: string,
    updates: {
      name?: string;
      svg_data?: string;
      regions?: Array<{ id: string; label: string; default_color: string }>;
    },
  ): Promise<BodyMapTemplate | undefined> {
    const fields: string[] = [];
    const values: (string | object)[] = [];
    let i = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${i++}`);
      values.push(updates.name);
    }
    if (updates.svg_data !== undefined) {
      fields.push(`svg_data = $${i++}`);
      values.push(updates.svg_data);
    }
    if (updates.regions !== undefined) {
      const regionIds = new Set<string>();
      for (const region of updates.regions) {
        if (regionIds.has(region.id)) {
          throw new Error(`Duplicate region ID '${region.id}' found in update regions.`);
        }
        regionIds.add(region.id);
      }
      fields.push(`regions = $${i++}`);
      values.push(JSON.stringify(updates.regions));
    }

    if (fields.length === 0) {
      return this.getBodyMapTemplate(template_id); // No updates, return current
    }

    values.push(template_id); // The last value is the id
    const query = `
      UPDATE body_map_templates
      SET ${fields.join(", ")}, updated_at = NOW()
      WHERE id = $${i}
      RETURNING *;
    `;
    const result = await this.client.queryObject<BodyMapTemplate>(query, values);
    return result.rows[0];
  }

  async deleteBodyMapTemplate(template_id: string): Promise<boolean> {
    // Due to ON DELETE CASCADE on the FK, deleting the template will delete instances.
    // The explicit DELETE FROM body_map_instances query is technically not needed here if FK is set,
    // but ensures the behavior even if FK is misconfigured.
    await this.client.queryObject(`DELETE FROM body_map_instances WHERE template_id = $1;`, [template_id]);
    const result = await this.client.queryObject(`DELETE FROM body_map_templates WHERE id = $1;`, [template_id]);
    return result.rowCount > 0;
  }

  // --- BodyMapInstance Actions ---

  async generateBodyMapInstance(
    template_id: string,
    entity_id: string,
    entity_type: string,
  ): Promise<BodyMapInstance> {
    const template = await this.getBodyMapTemplate(template_id);
    if (!template) {
      throw new Error(`Template with ID ${template_id} not found.`);
    }

    // Check for existing instance (unique constraint check)
    const existingInstanceQuery = `
      SELECT id FROM body_map_instances
      WHERE template_id = $1 AND entity_id = $2 AND entity_type = $3;
    `;
    const existingResult = await this.client.queryObject<{ id: string }>(existingInstanceQuery, [
      template_id,
      entity_id,
      entity_type,
    ]);

    if (existingResult.rows.length > 0) {
      throw new Error("An instance for this template, entity, and type already exists.");
    }

    const initialData: Record<string, { color?: string; notes?: string }> = {};
    for (const region of template.regions) {
      initialData[region.id] = { color: region.default_color };
    }

    const query = `
      INSERT INTO body_map_instances (template_id, entity_id, entity_type, current_data)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const result = await this.client.queryObject<BodyMapInstance>(query, [
      template_id,
      entity_id,
      entity_type,
      JSON.stringify(initialData),
    ]);
    return result.rows[0];
  }

  async getBodyMapInstance(instance_id: string): Promise<BodyMapInstance | undefined> {
    const query = `SELECT * FROM body_map_instances WHERE id = $1;`;
    const result = await this.client.queryObject<BodyMapInstance>(query, [instance_id]);
    return result.rows[0];
  }

  async updateBodyMapInstanceData(
    instance_id: string,
    new_data: Record<string, { color?: string; notes?: string }>,
  ): Promise<BodyMapInstance | undefined> {
    const instance = await this.getBodyMapInstance(instance_id);
    if (!instance) {
      return undefined;
    }

    const template = await this.getBodyMapTemplate(instance.template_id);
    if (!template) {
      // This should ideally not happen if FK integrity is maintained, but good to check.
      throw new Error(`Associated template for instance ${instance_id} not found.`);
    }

    const validRegionIds = new Set(template.regions.map((r) => r.id));
    for (const regionId of Object.keys(new_data)) {
      if (!validRegionIds.has(regionId)) {
        throw new Error(`Region ID '${regionId}' in new_data is not part of the template.`);
      }
    }

    const mergedData = { ...instance.current_data, ...new_data };

    const query = `
      UPDATE body_map_instances
      SET current_data = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *;
    `;
    const result = await this.client.queryObject<BodyMapInstance>(query, [
      JSON.stringify(mergedData),
      instance_id,
    ]);
    return result.rows[0];
  }

  async deleteBodyMapInstance(instance_id: string): Promise<boolean> {
    const result = await this.client.queryObject(`DELETE FROM body_map_instances WHERE id = $1;`, [instance_id]);
    return result.rowCount > 0;
  }
}
```

**Database Schema (Implicitly handled by `testDb` function in a real scenario)**

```sql
CREATE TABLE IF NOT EXISTS body_map_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    svg_data TEXT NOT NULL,
    regions JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS body_map_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES body_map_templates(id) ON DELETE CASCADE,
    entity_id UUID NOT NULL, -- Generic ID for the associated record (e.g., patient_id)
    entity_type VARCHAR(255) NOT NULL, -- Type of entity (e.g., 'Patient', 'Equipment')
    current_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(template_id, entity_id, entity_type) -- Ensures only one instance per entity/template/type
);
```

### Test File

**`src/BodyMapGeneration/BodyMapGenerationConcept.test.ts`**

```typescript
import { assertEquals, assertExists, assertNotEquals, assertRejects } from "jsr:@std/assert";
import { testDb } from "../../utils/database.ts"; // Adjust path as needed
import { BodyMapGeneration, BodyMapTemplate, BodyMapInstance } from "./BodyMapGeneration.ts"; // Assuming BodyMapGeneration.ts is in the same directory

// Helper to generate a UUID (Deno's crypto is fine for this)
const generateUuid = () => crypto.randomUUID();

Deno.test("# file: src/BodyMapGeneration/BodyMapGenerationConcept.test.ts", async (test) => {
  const [db, client] = await testDb();
  const bodyMapGen = new BodyMapGeneration(client);

  await test.step("Setup: Verify database is clean and ready", async () => {
    const templatesQuery = await client.queryObject("SELECT COUNT(*) FROM body_map_templates;");
    assertEquals(templatesQuery.rows[0].count, 0n, "body_map_templates table should be empty initially");
    const instancesQuery = await client.queryObject("SELECT COUNT(*) FROM body_map_instances;");
    assertEquals(instancesQuery.rows[0].count, 0n, "body_map_instances table should be empty initially");
  });

  let template1: BodyMapTemplate;
  let template2: BodyMapTemplate;
  const patientId1 = generateUuid();
  const patientId2 = generateUuid();

  await test.step("Action: createBodyMapTemplate - requires and effects", async (t) => {
    await t.step("should create a new body map template successfully (effects)", async () => {
      const name = "Human Torso";
      const svg_data = "<svg viewBox='0 0 100 100'><rect id='head' x='10' y='10' width='80' height='20'/></svg>";
      const regions = [
        { id: "head", label: "Head", default_color: "#FF0000" },
        { id: "torso", label: "Torso", default_color: "#00FF00" },
      ];

      template1 = await bodyMapGen.createBodyMapTemplate(name, svg_data, regions);

      assertExists(template1.id, "Template ID should be generated");
      assertEquals(template1.name, name, "Template name should match");
      assertEquals(template1.svg_data, svg_data, "Template SVG data should match");
      assertEquals(template1.regions, regions, "Template regions should match");
      assertExists(template1.created_at);
      assertExists(template1.updated_at);

      const fetchedTemplate = await bodyMapGen.getBodyMapTemplate(template1.id);
      assertEquals(fetchedTemplate, template1, "Fetched template should match created template");
    });

    await t.step("should reject if name is not unique (requires)", async () => {
      const name = "Human Torso"; // Duplicate name
      const svg_data = "<svg></svg>";
      const regions = [{ id: "foot", label: "Foot", default_color: "#0000FF" }];

      await assertRejects(
        async () => {
          await bodyMapGen.createBodyMapTemplate(name, svg_data, regions);
        },
        Error,
        "duplicate key value violates unique constraint",
      );
    });

    await t.step("should reject if regions have duplicate IDs (requires)", async () => {
      const name = "Invalid Regions Template";
      const svg_data = "<svg></svg>";
      const regions = [
        { id: "regionA", label: "A", default_color: "#111" },
        { id: "regionA", label: "B", default_color: "#222" }, // Duplicate ID
      ];
      await assertRejects(
        async () => {
          await bodyMapGen.createBodyMapTemplate(name, svg_data, regions);
        },
        Error,
        "Duplicate region ID 'regionA' found in template regions.",
      );
    });
  });

  await test.step("Action: getBodyMapTemplate - requires and effects", async (t) => {
    await t.step("should return the correct template for a given ID (effects)", async () => {
      const fetchedTemplate = await bodyMapGen.getBodyMapTemplate(template1.id);
      assertExists(fetchedTemplate);
      assertEquals(fetchedTemplate!.id, template1.id);
      assertEquals(fetchedTemplate, template1);
    });

    await t.step("should return undefined for a non-existent ID (requires)", async () => {
      const nonExistentId = generateUuid();
      const fetchedTemplate = await bodyMapGen.getBodyMapTemplate(nonExistentId);
      assertEquals(fetchedTemplate, undefined);
    });
  });

  await test.step("Action: updateBodyMapTemplate - requires and effects", async (t) => {
    await t.step("should update the template's name and svg_data (effects)", async () => {
      const newName = "Human Upper Body";
      const newSvgData = "<svg viewBox='0 0 100 100'><path id='upperbody' d='M0,0'/></svg>";
      const originalUpdatedAt = template1.updated_at;

      const updatedTemplate = await bodyMapGen.updateBodyMapTemplate(template1.id, {
        name: newName,
        svg_data: newSvgData,
      });

      assertExists(updatedTemplate);
      assertEquals(updatedTemplate!.name, newName);
      assertEquals(updatedTemplate!.svg_data, newSvgData);
      assertEquals(updatedTemplate!.regions, template1.regions, "Regions should remain unchanged");
      assertNotEquals(updatedTemplate!.updated_at, originalUpdatedAt, "updated_at should be updated");

      template1 = updatedTemplate!; // Update reference for subsequent tests
    });

    await t.step("should update the template's regions (effects)", async () => {
      const newRegions = [
        { id: "head", label: "Cranium", default_color: "#AAAAAA" }, // Label changed
        { id: "chest", label: "Chest", default_color: "#BBBBBB" }, // New region
      ];
      const originalUpdatedAt = template1.updated_at;

      const updatedTemplate = await bodyMapGen.updateBodyMapTemplate(template1.id, {
        regions: newRegions,
      });

      assertExists(updatedTemplate);
      assertEquals(updatedTemplate!.regions, newRegions, "Regions should be updated");
      assertNotEquals(updatedTemplate!.updated_at, originalUpdatedAt, "updated_at should be updated");

      template1 = updatedTemplate!; // Update reference
    });

    await t.step("should return undefined if template_id does not exist (requires)", async () => {
      const nonExistentId = generateUuid();
      const updatedTemplate = await bodyMapGen.updateBodyMapTemplate(nonExistentId, { name: "Non Existent" });
      assertEquals(updatedTemplate, undefined);
    });

    await t.step("should reject if regions in update have duplicate IDs (requires)", async () => {
      const invalidRegionsUpdate = [
        { id: "r1", label: "R1", default_color: "c1" },
        { id: "r1", label: "R1_duplicate", default_color: "c2" },
      ];
      await assertRejects(
        async () => {
          await bodyMapGen.updateBodyMapTemplate(template1.id, { regions: invalidRegionsUpdate });
        },
        Error,
        "Duplicate region ID 'r1' found in update regions.",
      );
    });
  });

  let firstInstance: BodyMapInstance; // To be used in later tests

  await test.step("Action: generateBodyMapInstance - requires and effects", async (t) => {
    await t.step("should generate a new body map instance successfully (effects)", async () => {
      firstInstance = await bodyMapGen.generateBodyMapInstance(template1.id, patientId1, "Patient");

      assertExists(firstInstance.id, "Instance ID should be generated");
      assertEquals(firstInstance.template_id, template1.id, "Instance template_id should match");
      assertEquals(firstInstance.entity_id, patientId1, "Instance entity_id should match");
      assertEquals(firstInstance.entity_type, "Patient", "Instance entity_type should match");
      assertExists(firstInstance.created_at);
      assertExists(firstInstance.updated_at);

      // Verify initial current_data based on template regions
      assertEquals(Object.keys(firstInstance.current_data).length, template1.regions.length);
      for (const region of template1.regions) {
        assertExists(firstInstance.current_data[region.id], `Region ${region.id} should exist in current_data`);
        assertEquals(firstInstance.current_data[region.id].color, region.default_color);
        assertEquals(firstInstance.current_data[region.id].notes, undefined);
      }

      const fetchedInstance = await bodyMapGen.getBodyMapInstance(firstInstance.id);
      assertEquals(fetchedInstance, firstInstance, "Fetched instance should match created instance");
    });

    await t.step("should reject if template_id does not exist (requires)", async () => {
      const nonExistentId = generateUuid();
      await assertRejects(
        async () => {
          await bodyMapGen.generateBodyMapInstance(nonExistentId, patientId1, "Patient");
        },
        Error,
        `Template with ID ${nonExistentId} not found.`,
      );
    });

    await t.step("should reject if an instance for the combination already exists (requires)", async () => {
      await assertRejects(
        async () => {
          await bodyMapGen.generateBodyMapInstance(template1.id, patientId1, "Patient"); // Duplicate
        },
        Error,
        "An instance for this template, entity, and type already exists.",
      );
    });

    await t.step("should successfully create another instance for a different patient using the same template (effects)", async () => {
      const instance2 = await bodyMapGen.generateBodyMapInstance(template1.id, patientId2, "Patient");
      assertExists(instance2.id);
      assertNotEquals(instance2.id, firstInstance.id);
      assertEquals(instance2.template_id, template1.id);
      assertEquals(instance2.entity_id, patientId2);
      assertEquals(instance2.entity_type, "Patient");
    });

    await t.step("should successfully create another instance for a different template using the same patient (effects)", async () => {
      template2 = await bodyMapGen.createBodyMapTemplate(
        "Human Hand",
        "<svg><path id='thumb'></path></svg>",
        [{ id: "thumb", label: "Thumb", default_color: "purple" }],
      );
      const instance3 = await bodyMapGen.generateBodyMapInstance(template2.id, patientId1, "Patient");
      assertExists(instance3.id);
      assertEquals(instance3.template_id, template2.id);
      assertEquals(instance3.entity_id, patientId1);
    });
  });

  await test.step("Action: getBodyMapInstance - requires and effects", async (t) => {
    // firstInstance was created in the previous step, use it for testing
    await t.step("should return the correct instance for a given ID (effects)", async () => {
      const fetchedInstance = await bodyMapGen.getBodyMapInstance(firstInstance.id);
      assertExists(fetchedInstance);
      assertEquals(fetchedInstance!.id, firstInstance.id);
      assertEquals(fetchedInstance, firstInstance);
    });

    await t.step("should return undefined for a non-existent ID (requires)", async () => {
      const nonExistentId = generateUuid();
      const fetchedInstance = await bodyMapGen.getBodyMapInstance(nonExistentId);
      assertEquals(fetchedInstance, undefined);
    });
  });

  await test.step("Action: updateBodyMapInstanceData - requires and effects", async (t) => {
    // Re-fetch firstInstance to ensure we have the latest state (from previous generates)
    firstInstance = (await bodyMapGen.getBodyMapInstance(firstInstance.id))!;
    const originalData = { ...firstInstance.current_data };
    const originalUpdatedAt = firstInstance.updated_at;

    await t.step("should update the instance's current_data for existing regions (effects)", async () => {
      const updates = {
        head: { color: "blue", notes: "Patient has a headache" },
        chest: { color: "orange" },
      };

      const updatedInstance = await bodyMapGen.updateBodyMapInstanceData(firstInstance.id, updates);

      assertExists(updatedInstance);
      assertEquals(updatedInstance!.id, firstInstance.id);
      assertEquals(updatedInstance!.current_data.head.color, "blue");
      assertEquals(updatedInstance!.current_data.head.notes, "Patient has a headache");
      assertEquals(updatedInstance!.current_data.chest.color, "orange");
      // Check that other regions remain unchanged
      for (const regionId of Object.keys(originalData)) {
        if (!updates[regionId as keyof typeof updates]) {
          assertEquals(updatedInstance!.current_data[regionId], originalData[regionId]);
        }
      }
      assertNotEquals(updatedInstance!.updated_at, originalUpdatedAt, "updated_at should be updated");

      firstInstance = updatedInstance!; // Update reference
    });

    await t.step("should merge new data with existing data (effects)", async () => {
      const originalHeadNotes = firstInstance.current_data.head.notes; // Should be "Patient has a headache"
      const updates = {
        head: { color: "red" }, // Only color changes for head
        chest: { notes: "No issues with chest today." }, // Add notes to existing region
      };

      const updatedInstance = await bodyMapGen.updateBodyMapInstanceData(firstInstance.id, updates);

      assertExists(updatedInstance);
      assertEquals(updatedInstance!.current_data.head.color, "red");
      assertEquals(updatedInstance!.current_data.head.notes, originalHeadNotes); // Notes should persist if not overwritten
      assertEquals(updatedInstance!.current_data.chest.notes, "No issues with chest today.");
      assertExists(updatedInstance!.current_data.chest.color); // Color should still be there
      firstInstance = updatedInstance!; // Update reference
    });

    await t.step("should return undefined if instance_id does not exist (requires)", async () => {
      const nonExistentId = generateUuid();
      const updatedInstance = await bodyMapGen.updateBodyMapInstanceData(nonExistentId, { head: { color: "red" } });
      assertEquals(updatedInstance, undefined);
    });

    await t.step("should reject if new_data contains region_id not in template (requires)", async () => {
      await assertRejects(
        async () => {
          await bodyMapGen.updateBodyMapInstanceData(firstInstance.id, {
            non_existent_region: { color: "black" },
          });
        },
        Error,
        "Region ID 'non_existent_region' in new_data is not part of the template.",
      );
    });
  });

  await test.step("Action: deleteBodyMapInstance - requires and effects", async (t) => {
    await t.step("should delete a body map instance successfully (effects)", async () => {
      const templateForDelete = await bodyMapGen.createBodyMapTemplate("Delete Test Template", "<svg/>", []);
      const instanceToDelete = await bodyMapGen.generateBodyMapInstance(
        templateForDelete.id,
        generateUuid(),
        "DeleteEntity",
      );

      const isDeleted = await bodyMapGen.deleteBodyMapInstance(instanceToDelete.id);
      assertEquals(isDeleted, true, "Instance should be deleted");

      const fetchedInstance = await bodyMapGen.getBodyMapInstance(instanceToDelete.id);
      assertEquals(fetchedInstance, undefined, "Deleted instance should not be found");
    });

    await t.step("should return false if instance_id does not exist (requires)", async () => {
      const nonExistentId = generateUuid();
      const isDeleted = await bodyMapGen.deleteBodyMapInstance(nonExistentId);
      assertEquals(isDeleted, false);
    });
  });

  await test.step("Action: deleteBodyMapTemplate - requires and effects", async (t) => {
    await t.step("should delete a body map template and all its instances successfully (effects)", async () => {
      // Create a template and a couple of instances for it
      const templateToDelete = await bodyMapGen.createBodyMapTemplate(
        "Template to Delete",
        "<svg/>",
        [{ id: "part1", label: "Part 1", default_color: "red" }],
      );
      const instance1ToDelete = await bodyMapGen.generateBodyMapInstance(
        templateToDelete.id,
        generateUuid(),
        "Entity1",
      );
      const instance2ToDelete = await bodyMapGen.generateBodyMapInstance(
        templateToDelete.id,
        generateUuid(),
        "Entity2",
      );

      const isTemplateDeleted = await bodyMapGen.deleteBodyMapTemplate(templateToDelete.id);
      assertEquals(isTemplateDeleted, true, "Template should be deleted");

      // Verify template is gone
      const fetchedTemplate = await bodyMapGen.getBodyMapTemplate(templateToDelete.id);
      assertEquals(fetchedTemplate, undefined, "Deleted template should not be found");

      // Verify instances are also gone due to cascade delete
      const fetchedInstance1 = await bodyMapGen.getBodyMapInstance(instance1ToDelete.id);
      assertEquals(fetchedInstance1, undefined, "Instance 1 should be deleted due to cascade");
      const fetchedInstance2 = await bodyMapGen.getBodyMapInstance(instance2ToDelete.id);
      assertEquals(fetchedInstance2, undefined, "Instance 2 should be deleted due to cascade");
    });

    await t.step("should return false if template_id does not exist (requires)", async () => {
      const nonExistentId = generateUuid();
      const isDeleted = await bodyMapGen.deleteBodyMapTemplate(nonExistentId);
      assertEquals(isDeleted, false);
    });
  });

  await test.step("# trace: Demonstrating the Principle", async () => {
    console.log("\n--- Trace: Demonstrating BodyMapGeneration Principle ---");
    console.log("Principle: A BodyMapGeneration system enables users to create and manage body maps for different entities. It allows defining templates and generating instances associated with specific records, with independent state updates.");

    // 1. Create a Body Map Template (e.g., for a general human patient)
    const traceTemplateName = "General Human Body";
    const traceTemplateSvg = "<svg width='200' height='300'><rect id='head' x='50' y='10' width='100' height='50'/><rect id='torso' x='50' y='70' width='100' height='150'/></svg>";
    const traceTemplateRegions = [
      { id: "head", label: "Head Area", default_color: "#E0BBE4" },
      { id: "torso", label: "Torso Area", default_color: "#957DAD" },
      { id: "left_leg", label: "Left Leg", default_color: "#D291BC" },
    ];
    const generalHumanTemplate = await bodyMapGen.createBodyMapTemplate(
      traceTemplateName,
      traceTemplateSvg,
      traceTemplateRegions,
    );
    assertExists(generalHumanTemplate.id, "Principle: Template created successfully.");
    assertEquals(generalHumanTemplate.name, traceTemplateName);
    console.log(`- Created template '${generalHumanTemplate.name}' (ID: ${generalHumanTemplate.id})`);

    // 2. Generate an Instance for a specific entity (e.g., Patient A)
    const patientAId = generateUuid();
    const patientAType = "Patient";
    const patientABodyMap = await bodyMapGen.generateBodyMapInstance(
      generalHumanTemplate.id,
      patientAId,
      patientAType,
    );
    assertExists(patientABodyMap.id, "Principle: Instance for Patient A generated successfully.");
    assertEquals(patientABodyMap.template_id, generalHumanTemplate.id);
    assertEquals(patientABodyMap.entity_id, patientAId);
    assertEquals(patientABodyMap.current_data.head.color, generalHumanTemplate.regions[0].default_color);
    console.log(`- Generated instance for Patient A (ID: ${patientABodyMap.id}) based on template ${generalHumanTemplate.id}`);

    // 3. Update the Instance data based on specific observations for Patient A
    const patientAUpdates = {
      head: { color: "red", notes: "Head injury observed." },
      torso: { notes: "No issues." },
    };
    const updatedPatientABodyMap = await bodyMapGen.updateBodyMapInstanceData(
      patientABodyMap.id,
      patientAUpdates,
    );
    assertExists(updatedPatientABodyMap, "Principle: Instance data updated successfully.");
    assertEquals(updatedPatientABodyMap!.current_data.head.color, "red");
    assertEquals(updatedPatientABodyMap!.current_data.head.notes, "Head injury observed.");
    assertEquals(updatedPatientABodyMap!.current_data.torso.notes, "No issues.");
    assertEquals(updatedPatientABodyMap!.current_data.left_leg.color, generalHumanTemplate.regions[2].default_color, "Other regions unchanged.");
    console.log(`- Updated Patient A's body map with specific observations. Head is now red with notes.`);

    // 4. Generate another Instance for a different entity (e.g., Patient B) using the same template
    const patientBId = generateUuid();
    const patientBType = "Patient";
    const patientBBodyMap = await bodyMapGen.generateBodyMapInstance(
      generalHumanTemplate.id,
      patientBId,
      patientBType,
    );
    assertExists(patientBBodyMap.id, "Principle: Instance for Patient B generated successfully.");
    assertEquals(patientBBodyMap.template_id, generalHumanTemplate.id);
    assertEquals(patientBBodyMap.entity_id, patientBId);
    // Crucially, Patient B's initial data should be from the template, not Patient A's changes
    assertEquals(patientBBodyMap.current_data.head.color, generalHumanTemplate.regions[0].default_color); // Should be default #E0BBE4, not red
    assertEquals(patientBBodyMap.current_data.head.notes, undefined);
    console.log(`- Generated instance for Patient B (ID: ${patientBBodyMap.id}), showing separate state (head is default color).`);

    // 5. Cleanup: Delete Patient A's instance and then the template, which should cascade delete Patient B's instance.
    const deleteInstanceResult = await bodyMapGen.deleteBodyMapInstance(patientABodyMap.id);
    assertEquals(deleteInstanceResult, true, "Principle: Patient A's instance deleted.");
    console.log(`- Deleted Patient A's body map instance.`);

    const deleteTemplateResult = await bodyMapGen.deleteBodyMapTemplate(generalHumanTemplate.id);
    assertEquals(deleteTemplateResult, true, "Principle: Template deleted, cascading to Patient B's instance.");
    const fetchedPatientBInstance = await bodyMapGen.getBodyMapInstance(patientBBodyMap.id);
    assertEquals(fetchedPatientBInstance, undefined, "Principle: Patient B's instance deleted via cascade.");
    console.log(`- Deleted template '${generalHumanTemplate.name}', confirming cascade deletion of Patient B's instance.`);
    console.log("--- Trace Complete ---");
  });

  await client.close();
});
```
