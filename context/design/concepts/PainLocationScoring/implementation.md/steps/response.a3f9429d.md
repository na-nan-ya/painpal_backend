---
timestamp: 'Fri Oct 17 2025 20:19:31 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_201931.0fbdd58b.md]]'
content_id: a3f9429da06a374c6dc01a067f5f0bea5b5e6cba2a65d1f0051b2eeaf11e68e4
---

# response:

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "PainLocationScoring" + ".";

// Generic types of this concept
type User = ID;
type Map = ID;
type Region = ID;

/**
 * State:
 * a set of body Maps with
 *  a set of Regions
 *
 * Represents a user's body map document in the database.
 */
interface MapDocument {
  _id: Map;
  userId: User;
  name: string; // e.g., "Front Body", "Back Body"
}

/**
 * State:
 * a set of Regions with
 *  a scaled score Number
 *
 * Represents a specific region on a body map document in the database.
 */
interface RegionDocument {
  _id: Region;
  mapId: Map;
  userId: User; // For efficient ownership verification, tied to user as well as map
  name: string; // e.g., "Left Shoulder", "Lower Back", or a more specific identifier like "fbm_left_shoulder"
  score: number | null; // null if not yet scored, number between 1 and 10
}

/**
 * @concept PainLocationScoring
 * @purpose users can select a region on the body map and rate the pain on a scale of 1 to 10
 *
 * This concept allows users to define regions on their body maps,
 * associate pain scores with these regions, and manage these regions.
 */
export default class PainLocationScoringConcept {
  /**
   * @principle each region on a body map may be assigned a numerical score representing pain intensity
   *
   * The core principle ensures that individual body regions can be isolated
   * and given a quantifiable pain intensity, allowing for granular tracking
   * and analysis of pain location and severity over time.
   */

  private maps: Collection<MapDocument>;
  private regions: Collection<RegionDocument>;

  constructor(private readonly db: Db) {
    this.maps = this.db.collection(PREFIX + "maps");
    this.regions = this.db.collection(PREFIX + "regions");
  }

  /**
   * addRegion(user: User, map: Map, regionName: string): (region: Region)
   * Creates and returns a new Region on that Map.
   *
   * @param {object} params - The parameters for the action.
   * @param {User} params.user - The ID of the user creating the region.
   * @param {Map} params.map - The ID of the map to which the region is added.
   * @param {string} params.regionName - A descriptive name or identifier for the new region (e.g., "Left Arm").
   * @returns {Promise<{ region: Region } | { error: string }>} - The ID of the created region or an error object.
   *
   * @requires the Map must already exist for the given User. The system checks if a map with the given `map` ID
   *           exists and belongs to the `user`.
   * @effects creates and returns a new Region on that Map. A new region document is inserted into the
   *          `regions` collection, associated with the specified map and user, and initialized with a null score.
   */
  async addRegion(
    { user, map, regionName }: { user: User; map: Map; regionName: string },
  ): Promise<{ region: Region } | { error: string }> {
    // Requires: the Map must already exist for the given User
    const existingMap = await this.maps.findOne({ _id: map, userId: user });
    if (!existingMap) {
      return { error: `Map '${map}' not found for user '${user}'.` };
    }

    // Effects: creates and returns a new Region on that Map
    const newRegionId = freshID() as Region;
    const newRegion: RegionDocument = {
      _id: newRegionId,
      mapId: map,
      userId: user,
      name: regionName,
      score: null, // Initially, the region has no score
    };

    try {
      await this.regions.insertOne(newRegion);
      return { region: newRegionId };
    } catch (e) {
      console.error("Failed to insert region:", e);
      return { error: "Failed to create region due to a database error." };
    }
  }

  /**
   * scoreRegion(user: User, region: Region, score: Number)
   * Associates the Number with that Region.
   *
   * @param {object} params - The parameters for the action.
   * @param {User} params.user - The ID of the user scoring the region.
   * @param {Region} params.region - The ID of the region to be scored.
   * @param {number} params.score - The pain score (1-10).
   * @returns {Promise<Empty | { error: string }>} - An empty object on success, or an error object.
   *
   * @requires the Region must exist within the User’s Map and the Number must be between 1 and 10.
   *           The system verifies the score range and that the region exists and belongs to the user.
   * @effects associates the Number with that Region. The `score` field of the corresponding
   *          region document in the `regions` collection is updated with the provided `score`.
   */
  async scoreRegion(
    { user, region, score }: { user: User; region: Region; score: number },
  ): Promise<Empty | { error: string }> {
    // Requires: the Number must be between 1 and 10
    if (score < 1 || score > 10) {
      return { error: "Score must be between 1 and 10." };
    }

    // Requires: the Region must exist within the User’s Map
    // This implicitly checks map ownership as the region document stores userId.
    const updateResult = await this.regions.updateOne(
      { _id: region, userId: user },
      { $set: { score: score } },
    );

    if (updateResult.matchedCount === 0) {
      return {
        error: `Region '${region}' not found or does not belong to user '${user}'.`,
      };
    }

    // Effects: associates the Number with that Region
    return {};
  }

  /**
   * deleteRegion(user: User, region: Region)
   * Removes the Region from the associated Map.
   *
   * @param {object} params - The parameters for the action.
   * @param {User} params.user - The ID of the user deleting the region.
   * @param {Region} params.region - The ID of the region to be deleted.
   * @returns {Promise<Empty | { error: string }>} - An empty object on success, or an error object.
   *
   * @requires the Region must already exist within the User’s Map. The system checks that the region
   *           exists and belongs to the `user`.
   * @effects removes the Region from the associated Map. The corresponding region document is
   *          deleted from the `regions` collection.
   */
  async deleteRegion(
    { user, region }: { user: User; region: Region },
  ): Promise<Empty | { error: string }> {
    // Requires: the Region must already exist within the User’s Map
    // This implicitly checks map ownership as the region document stores userId.
    const deleteResult = await this.regions.deleteOne({
      _id: region,
      userId: user,
    });

    if (deleteResult.deletedCount === 0) {
      return {
        error: `Region '${region}' not found or does not belong to user '${user}'.`,
      };
    }

    // Effects: removes the Region from the associated Map
    return {};
  }

  // --- Internal Query Methods (following concept spec for queries starting with underscore) ---
  // These methods are not part of the primary actions but provide ways to inspect the state.

  /**
   * _getRegion(user: User, region: Region): { name: string, score: number | null } | { error: string }
   * Internal query to retrieve a region's details (name and score) for a given user.
   *
   * @param {object} params - The parameters for the query.
   * @param {User} params.user - The ID of the user.
   * @param {Region} params.region - The ID of the region.
   * @returns {Promise<{ name: string, score: number | null } | { error: string }>} - The region's name and score, or an error object if not found.
   */
  async _getRegion(
    { user, region }: { user: User; region: Region },
  ): Promise<{ name: string; score: number | null } | { error: string }> {
    const foundRegion = await this.regions.findOne(
      { _id: region, userId: user },
      { projection: { name: 1, score: 1, _id: 0 } }, // Project only necessary fields
    );

    if (!foundRegion) {
      return {
        error: `Region '${region}' not found or does not belong to user '${user}'.`,
      };
    }

    return { name: foundRegion.name, score: foundRegion.score };
  }

  /**
   * _listUserMaps(user: User): { maps: { id: Map, name: string }[] }
   * Internal query to list all maps belonging to a user.
   *
   * @param {object} params - The parameters for the query.
   * @param {User} params.user - The ID of the user.
   * @returns {Promise<{ maps: { id: Map, name: string }[] }>} - A list of maps owned by the user.
   */
  async _listUserMaps(
    { user }: { user: User },
  ): Promise<{ maps: { id: Map; name: string }[] }> {
    const userMaps = await this.maps.find(
      { userId: user },
      { projection: { _id: 1, name: 1 } },
    ).toArray();

    return {
      maps: userMaps.map((m) => ({ id: m._id, name: m.name })),
    };
  }

  /**
   * _listMapRegions(user: User, map: Map): { regions: { id: Region, name: string, score: number | null }[] } | { error: string }
   * Internal query to list all regions for a specific map owned by a user.
   *
   * @param {object} params - The parameters for the query.
   * @param {User} params.user - The ID of the user.
   * @param {Map} params.map - The ID of the map.
   * @returns {Promise<{ regions: { id: Region, name: string, score: number | null }[] } | { error: string }>} - A list of regions on the map, or an error if the map is not found or not owned by the user.
   */
  async _listMapRegions(
    { user, map }: { user: User; map: Map },
  ): Promise<{ regions: { id: Region; name: string; score: number | null }[] } | {
    error: string;
  }> {
    // First, ensure the map exists and belongs to the user
    const existingMap = await this.maps.findOne({ _id: map, userId: user });
    if (!existingMap) {
      return { error: `Map '${map}' not found for user '${user}'.` };
    }

    const mapRegions = await this.regions.find(
      { mapId: map, userId: user },
      { projection: { _id: 1, name: 1, score: 1 } },
    ).toArray();

    return {
      regions: mapRegions.map((r) => ({
        id: r._id,
        name: r.name,
        score: r.score,
      })),
    };
  }

  /**
   * _createMap(user: User, mapName: string): { map: Map }
   * Helper query (not an action from the concept spec) to create a new map for a user.
   * This is useful for setting up test conditions or initial state, as the concept
   * does not define actions for managing maps themselves, only regions within them.
   *
   * @param {object} params - The parameters for the query.
   * @param {User} params.user - The ID of the user.
   * @param {string} params.mapName - The name of the new map.
   * @returns {Promise<{ map: Map }>} - The ID of the created map.
   */
  async _createMap(
    { user, mapName }: { user: User; mapName: string },
  ): Promise<{ map: Map }> {
    const newMapId = freshID() as Map;
    const newMap: MapDocument = {
      _id: newMapId,
      userId: user,
      name: mapName,
    };
    await this.maps.insertOne(newMap);
    return { map: newMapId };
  }
}
```
