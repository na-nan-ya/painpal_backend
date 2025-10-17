---
timestamp: 'Fri Oct 17 2025 12:53:46 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_125346.7cb48386.md]]'
content_id: 8c2aed239e9b874174e1e7860f902b7956c333d66cc8d2c311c84667bf14f48d
---

# file: src/BodyMapGeneration/BodyMapGenerationConcept.test.ts

```typescript
import { testDb } from "@utils/database.ts"; // Assuming this utility exists as described
import { assertEquals, assertRejects, assertNotEquals, assertExists, assertInstanceOf } from "jsr:@std/assert";
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts"; // Explicitly import Client for type inference

// Re-import the BodyMapGenerationService and its interfaces from the dummy implementation
// In a real scenario, this would be: `import { BodyMapGenerationService } from "./BodyMapGeneration.ts";`
// For this example, we'll keep the entire implementation in the test file for self-containment.

interface BodyMap {
  id: string;
  userId: string;
  name: string;
  createdAt: Date;
}

interface BodyMapRegion {
  id: string;
  bodyMapId: string;
  name: string;
  data: Record<string, unknown>;
  createdAt: Date;
}

interface BodyMapWithRegions extends BodyMap {
  regions: BodyMapRegion[];
}

class BodyMapGenerationService {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  async createBodyMap(userId: string, name: string): Promise<{ id: string } | { error: string }> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      return { error: "User ID is required." };
    }
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return { error: "Body map name is required." };
    }

    try {
      const existingMaps = await this.client.queryObject<{ count: number }>(
        `SELECT COUNT(*) FROM body_maps WHERE user_id = $1 AND name = $2`,
        userId, name
      );

      if (existingMaps.rows[0].count > 0) {
        return { error: `A body map with name '${name}' already exists for user '${userId}'.` };
      }

      const result = await this.client.queryObject<{ id: string }>(
        `INSERT INTO body_maps (user_id, name) VALUES ($1, $2) RETURNING id`,
        userId, name
      );
      return { id: result.rows[0].id };
    } catch (e) {
      console.error("Error creating body map:", e);
      return { error: `Failed to create body map: ${e.message}` };
    }
  }

  async addRegionToBodyMap(bodyMapId: string, regionName: string, data: Record<string, unknown>): Promise<{ id: string } | { error: string }> {
    if (!bodyMapId || typeof bodyMapId !== 'string' || bodyMapId.trim() === '') {
      return { error: "Body map ID is required." };
    }
    if (!regionName || typeof regionName !== 'string' || regionName.trim() === '') {
      return { error: "Region name is required." };
    }
    if (typeof data !== 'object' || data === null) {
      return { error: "Region data must be an object." };
    }

    try {
      const mapExists = await this.client.queryObject<{ count: number }>(
        `SELECT COUNT(*) FROM body_maps WHERE id = $1`,
        bodyMapId
      );
      if (mapExists.rows[0].count === 0) {
        return { error: `Body map with ID '${bodyMapId}' not found.` };
      }

      const existingRegions = await this.client.queryObject<{ count: number }>(
        `SELECT COUNT(*) FROM body_map_regions WHERE body_map_id = $1 AND name = $2`,
        bodyMapId, regionName
      );
      if (existingRegions.rows[0].count > 0) {
        return { error: `A region with name '${regionName}' already exists in body map '${bodyMapId}'.` };
      }

      const result = await this.client.queryObject<{ id: string }>(
        `INSERT INTO body_map_regions (body_map_id, name, data) VALUES ($1, $2, $3::jsonb) RETURNING id`,
        bodyMapId, regionName, JSON.stringify(data)
      );
      return { id: result.rows[0].id };
    } catch (e) {
      console.error("Error adding region to body map:", e);
      return { error: `Failed to add region: ${e.message}` };
    }
  }

  async getBodyMapWithRegions(bodyMapId: string): Promise<BodyMapWithRegions | null | { error: string }> {
    if (!bodyMapId || typeof bodyMapId !== 'string' || bodyMapId.trim() === '') {
      return { error: "Body map ID is required." };
    }

    try {
      const mapResult = await this.client.queryObject<BodyMap>(
        `SELECT id, user_id AS "userId", name, created_at AS "createdAt" FROM body_maps WHERE id = $1`,
        bodyMapId
      );

      if (mapResult.rows.length === 0) {
        return null;
      }

      const bodyMap = mapResult.rows[0];

      const regionsResult = await this.client.queryObject<BodyMapRegion>(
        `SELECT id, body_map_id AS "bodyMapId", name, data, created_at AS "createdAt" FROM body_map_regions WHERE body_map_id = $1 ORDER BY name`,
        bodyMapId
      );

      const regions = regionsResult.rows.map(row => ({
          ...row,
          data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data
      }));

      return {
        ...bodyMap,
        regions: regions
      };
    } catch (e) {
      console.error("Error getting body map with regions:", e);
      return { error: `Failed to retrieve body map: ${e.message}` };
    }
  }

  async listUserBodyMaps(userId: string): Promise<BodyMap[] | { error: string }> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      return { error: "User ID is required." };
    }

    try {
      const result = await this.client.queryObject<BodyMap>(
        `SELECT id, user_id AS "userId", name, created_at AS "createdAt" FROM body_maps WHERE user_id = $1 ORDER BY name`,
        userId
      );
      return result.rows;
    } catch (e) {
      console.error("Error listing user body maps:", e);
      return { error: `Failed to list body maps: ${e.message}` };
    }
  }
}


Deno.test("BodyMapGeneration Concept Testing", async (t) => {
  const [db, client] = await testDb();
  const service = new BodyMapGenerationService(client);

  // --- Setup for the test file: Create tables ---
  // This hook ensures tables are present before any tests run in this file.
  // The database itself is dropped before all test files, so we recreate tables here.
  Deno.test.beforeAll(async () => {
    console.log("Setting up database schema for BodyMapGenerationConcept.test.ts...");
    await client.queryArray(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    await client.queryArray(`
      CREATE TABLE IF NOT EXISTS body_maps (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (user_id, name)
      );
    `);
    await client.queryArray(`
      CREATE TABLE IF NOT EXISTS body_map_regions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          body_map_id UUID NOT NULL REFERENCES body_maps(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          data JSONB NOT NULL DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (body_map_id, name)
      );
    `);
    console.log("Database schema setup complete.");
  });

  // --- Action: createBodyMap ---
  await t.step("createBodyMap - requires: userId and name must be non-empty strings", async () => {
    let result = await service.createBodyMap("", "My First Map");
    assertEquals((result as { error: string }).error, "User ID is required.");

    result = await service.createBodyMap("user123", "");
    assertEquals((result as { error: string }).error, "Body map name is required.");

    result = await service.createBodyMap("user123", "   ");
    assertEquals((result as { error: string }).error, "Body map name is required.");
  });

  await t.step("createBodyMap - requires: name must be unique for the given userId", async () => {
    const userId = "user_unique_name";
    const mapName = "Unique Test Map";

    // Create first map successfully
    const createResult1 = await service.createBodyMap(userId, mapName);
    assertExists((createResult1 as { id: string }).id);

    // Try to create another map with the same name for the same user
    const createResult2 = await service.createBodyMap(userId, mapName);
    assertExists((createResult2 as { error: string }).error);
    assertEquals((createResult2 as { error: string }).error, `A body map with name '${mapName}' already exists for user '${userId}'.`);

    // Create a map with the same name for a different user (should succeed)
    const createResult3 = await service.createBodyMap("another_user", mapName);
    assertExists((createResult3 as { id: string }).id);
  });

  await t.step("createBodyMap - effects: A new body_map record is created and returns its ID", async () => {
    const userId = "user456";
    const mapName = "My Second Map";
    const result = await service.createBodyMap(userId, mapName);

    assertExists((result as { id: string }).id);
    const mapId = (result as { id: string }).id;

    // Verify it exists in the database
    const queryResult = await client.queryObject<BodyMap>(`SELECT id, user_id AS "userId", name FROM body_maps WHERE id = $1`, mapId);
    assertEquals(queryResult.rows.length, 1);
    assertEquals(queryResult.rows[0].id, mapId);
    assertEquals(queryResult.rows[0].userId, userId);
    assertEquals(queryResult.rows[0].name, mapName);
  });

  // --- Action: addRegionToBodyMap ---
  let testMapId: string; // To be used across tests

  await t.step("addRegionToBodyMap - prerequisites: Create a map for region tests", async () => {
    const userId = "user_region_test";
    const mapName = "Region Test Map";
    const createResult = await service.createBodyMap(userId, mapName);
    assertExists((createResult as { id: string }).id);
    testMapId = (createResult as { id: string }).id;
  });

  await t.step("addRegionToBodyMap - requires: bodyMapId must exist", async () => {
    const nonExistentMapId = "00000000-0000-0000-0000-000000000000"; // A valid UUID format but not in DB
    const result = await service.addRegionToBodyMap(nonExistentMapId, "Head", { x: 10, y: 20 });
    assertExists((result as { error: string }).error);
    assertEquals((result as { error: string }).error, `Body map with ID '${nonExistentMapId}' not found.`);
  });

  await t.step("addRegionToBodyMap - requires: regionName must be non-empty", async () => {
    let result = await service.addRegionToBodyMap(testMapId, "", { x: 10, y: 20 });
    assertEquals((result as { error: string }).error, "Region name is required.");

    result = await service.addRegionToBodyMap(testMapId, "   ", { x: 10, y: 20 });
    assertEquals((result as { error: string }).error, "Region name is required.");
  });

  await t.step("addRegionToBodyMap - requires: data must be a non-null object", async () => {
    let result = await service.addRegionToBodyMap(testMapId, "RegionNoData", null as unknown as Record<string, unknown>);
    assertEquals((result as { error: string }).error, "Region data must be an object.");

    result = await service.addRegionToBodyMap(testMapId, "RegionInvalidData", "invalid" as unknown as Record<string, unknown>);
    assertEquals((result as { error: string }).error, "Region data must be an object.");
  });

  await t.step("addRegionToBodyMap - requires: regionName must be unique within the given bodyMapId", async () => {
    const regionName = "Unique Region In Map";
    const addResult1 = await service.addRegionToBodyMap(testMapId, regionName, { color: "red" });
    assertExists((addResult1 as { id: string }).id);

    const addResult2 = await service.addRegionToBodyMap(testMapId, regionName, { color: "blue" });
    assertExists((addResult2 as { error: string }).error);
    assertEquals((addResult2 as { error: string }).error, `A region with name '${regionName}' already exists in body map '${testMapId}'.`);
  });

  await t.step("addRegionToBodyMap - effects: A new body_map_region record is created and returns its ID", async () => {
    const regionName = "Left Arm";
    const regionData = {
      description: "Upper left limb",
      points: [[0, 0], [10, 20], [0, 40]]
    };
    const result = await service.addRegionToBodyMap(testMapId, regionName, regionData);

    assertExists((result as { id: string }).id);
    const regionId = (result as { id: string }).id;

    // Verify it exists in the database
    const queryResult = await client.queryObject<BodyMapRegion>(
      `SELECT id, body_map_id AS "bodyMapId", name, data FROM body_map_regions WHERE id = $1`,
      regionId
    );
    assertEquals(queryResult.rows.length, 1);
    assertEquals(queryResult.rows[0].id, regionId);
    assertEquals(queryResult.rows[0].bodyMapId, testMapId);
    assertEquals(queryResult.rows[0].name, regionName);
    assertEquals(queryResult.rows[0].data, regionData); // JSONB should preserve object
  });


  // --- Action: getBodyMapWithRegions ---
  let mapIdWithRegions: string;
  let region1Id: string, region2Id: string;

  await t.step("getBodyMapWithRegions - prerequisites: Create a map with multiple regions", async () => {
    const userId = "user_map_regions_get";
    const mapName = "Full Body Map";
    const createMapResult = await service.createBodyMap(userId, mapName);
    assertExists((createMapResult as { id: string }).id);
    mapIdWithRegions = (createMapResult as { id: string }).id;

    const addRegion1Result = await service.addRegionToBodyMap(mapIdWithRegions, "Head", { color: "skin", details: "face" });
    assertExists((addRegion1Result as { id: string }).id);
    region1Id = (addRegion1Result as { id: string }).id;

    const addRegion2Result = await service.addRegionToBodyMap(mapIdWithRegions, "Torso", { color: "skin", details: "chest and abdomen" });
    assertExists((addRegion2Result as { id: string }).id);
    region2Id = (addRegion2Result as { id: string }).id;
  });

  await t.step("getBodyMapWithRegions - requires: bodyMapId must be a non-empty string", async () => {
    const result = await service.getBodyMapWithRegions("");
    assertEquals((result as { error: string }).error, "Body map ID is required.");
  });

  await t.step("getBodyMapWithRegions - effects: If bodyMapId exists, returns map with regions", async () => {
    const retrievedMap = await service.getBodyMapWithRegions(mapIdWithRegions);

    assertExists(retrievedMap);
    assertNotEquals(retrievedMap, null);
    assertInstanceOf(retrievedMap, Object);

    const fullMap = retrievedMap as BodyMapWithRegions;
    assertEquals(fullMap.id, mapIdWithRegions);
    assertEquals(fullMap.name, "Full Body Map");
    assertEquals(fullMap.regions.length, 2);

    // Regions are ordered by name
    assertEquals(fullMap.regions[0].name, "Head");
    assertEquals(fullMap.regions[0].id, region1Id);
    assertEquals(fullMap.regions[0].data, { color: "skin", details: "face" });

    assertEquals(fullMap.regions[1].name, "Torso");
    assertEquals(fullMap.regions[1].id, region2Id);
    assertEquals(fullMap.regions[1].data, { color: "skin", details: "chest and abdomen" });
  });

  await t.step("getBodyMapWithRegions - effects: If bodyMapId does not exist, returns null", async () => {
    const nonExistentMapId = "00000000-0000-0000-0000-000000000001";
    const retrievedMap = await service.getBodyMapWithRegions(nonExistentMapId);
    assertEquals(retrievedMap, null);
  });

  // --- Action: listUserBodyMaps ---
  const userListId = "user_list_maps";
  let map1ForUserList: string, map2ForUserList: string;

  await t.step("listUserBodyMaps - prerequisites: Create multiple maps for a user and one for another", async () => {
    const createResult1 = await service.createBodyMap(userListId, "Map A");
    assertExists((createResult1 as { id: string }).id);
    map1ForUserList = (createResult1 as { id: string }).id;

    const createResult2 = await service.createBodyMap(userListId, "Map B");
    assertExists((createResult2 as { id: string }).id);
    map2ForUserList = (createResult2 as { id: string }).id;

    // Create a map for a different user
    const createResult3 = await service.createBodyMap("another_user_for_list", "Map C");
    assertExists((createResult3 as { id: string }).id);
  });

  await t.step("listUserBodyMaps - requires: userId must be a non-empty string", async () => {
    const result = await service.listUserBodyMaps("");
    assertEquals((result as { error: string }).error, "User ID is required.");
  });

  await t.step("listUserBodyMaps - effects: Returns an array of BodyMap objects for the userId", async () => {
    const userMaps = await service.listUserBodyMaps(userListId);
    assertExists(userMaps);
    assertInstanceOf(userMaps, Array);
    assertEquals((userMaps as BodyMap[]).length, 2);

    // Ensure maps are sorted by name
    assertEquals((userMaps as BodyMap[])[0].name, "Map A");
    assertEquals((userMaps as BodyMap[])[0].id, map1ForUserList);
    assertEquals((userMaps as BodyMap[])[1].name, "Map B");
    assertEquals((userMaps as BodyMap[])[1].id, map2ForUserList);
  });

  await t.step("listUserBodyMaps - effects: Returns an empty array if no maps are found", async () => {
    const nonExistentUserId = "non_existent_user";
    const userMaps = await service.listUserBodyMaps(nonExistentUserId);
    assertExists(userMaps);
    assertInstanceOf(userMaps, Array);
    assertEquals((userMaps as BodyMap[]).length, 0);
  });

  // --- Principle Trace ---
  await t.step("Principle: Demonstrate the full cycle of body map management", async () => {
    console.log("\n# trace: Principle Demonstration");

    const principleUserId = "user_principle_full_cycle";
    const map1Name = "Principle Map - Skeleton";
    const map2Name = "Principle Map - Organs";

    // 1. A user can establish multiple unique body maps.
    console.log(`  - Action: createBodyMap for user '${principleUserId}' with name '${map1Name}'`);
    const createMap1 = await service.createBodyMap(principleUserId, map1Name);
    assertExists((createMap1 as { id: string }).id);
    const pMap1Id = (createMap1 as { id: string }).id;
    console.log(`    -> Created map ID: ${pMap1Id}`);

    console.log(`  - Action: createBodyMap for user '${principleUserId}' with name '${map2Name}'`);
    const createMap2 = await service.createBodyMap(principleUserId, map2Name);
    assertExists((createMap2 as { id: string }).id);
    const pMap2Id = (createMap2 as { id: string }).id;
    console.log(`    -> Created map ID: ${pMap2Id}`);

    // Verify multiple maps exist for the user
    console.log(`  - Verification: listUserBodyMaps for user '${principleUserId}'`);
    const userMaps = await service.listUserBodyMaps(principleUserId) as BodyMap[];
    assertEquals(userMaps.length, 2);
    assertEquals(userMaps[0].name, map1Name); // Sorted
    assertEquals(userMaps[1].name, map2Name);
    console.log(`    -> User has ${userMaps.length} maps.`);

    // 2. Each body map can contain multiple unique regions, each with associated structured data.
    console.log(`  - Action: addRegionToBodyMap for Map '${map1Name}' (ID: ${pMap1Id}) - "Skull"`);
    const addRegion1Map1 = await service.addRegionToBodyMap(pMap1Id, "Skull", { bone_count: 22, protection: "brain" });
    assertExists((addRegion1Map1 as { id: string }).id);
    console.log(`    -> Added region "Skull" (ID: ${(addRegion1Map1 as { id: string }).id})`);

    console.log(`  - Action: addRegionToBodyMap for Map '${map1Name}' (ID: ${pMap1Id}) - "Rib Cage"`);
    const addRegion2Map1 = await service.addRegionToBodyMap(pMap1Id, "Rib Cage", { function: "protect organs", count: 12 });
    assertExists((addRegion2Map1 as { id: string }).id);
    console.log(`    -> Added region "Rib Cage" (ID: ${(addRegion2Map1 as { id: string }).id})`);

    console.log(`  - Action: addRegionToBodyMap for Map '${map2Name}' (ID: ${pMap2Id}) - "Heart"`);
    const addRegion1Map2 = await service.addRegionToBodyMap(pMap2Id, "Heart", { pumping_rate: "72bpm", type: "muscle" });
    assertExists((addRegion1Map2 as { id: string }).id);
    console.log(`    -> Added region "Heart" (ID: ${(addRegion1Map2 as { id: string }).id})`);

    // 3. All created maps and their regions are retrievable.
    console.log(`  - Verification: getBodyMapWithRegions for Map '${map1Name}' (ID: ${pMap1Id})`);
    const retrievedMap1 = await service.getBodyMapWithRegions(pMap1Id) as BodyMapWithRegions;
    assertExists(retrievedMap1);
    assertEquals(retrievedMap1.name, map1Name);
    assertEquals(retrievedMap1.regions.length, 2);
    assertEquals(retrievedMap1.regions[0].name, "Rib Cage"); // Sorted by name
    assertEquals(retrievedMap1.regions[0].data, { function: "protect organs", count: 12 });
    assertEquals(retrievedMap1.regions[1].name, "Skull");
    assertEquals(retrievedMap1.regions[1].data, { bone_count: 22, protection: "brain" });
    console.log(`    -> Retrieved Map 1 with regions: ${JSON.stringify(retrievedMap1.regions.map(r => r.name))}`);

    console.log(`  - Verification: getBodyMapWithRegions for Map '${map2Name}' (ID: ${pMap2Id})`);
    const retrievedMap2 = await service.getBodyMapWithRegions(pMap2Id) as BodyMapWithRegions;
    assertExists(retrievedMap2);
    assertEquals(retrievedMap2.name, map2Name);
    assertEquals(retrievedMap2.regions.length, 1);
    assertEquals(retrievedMap2.regions[0].name, "Heart");
    assertEquals(retrievedMap2.regions[0].data, { pumping_rate: "72bpm", type: "muscle" });
    console.log(`    -> Retrieved Map 2 with regions: ${JSON.stringify(retrievedMap2.regions.map(r => r.name))}`);

    console.log("Principle demonstration complete.");
  });


  // Close the client after all tests in this file
  await client.close();
  await db.close(); // Close the database connection pool as well
});
```
