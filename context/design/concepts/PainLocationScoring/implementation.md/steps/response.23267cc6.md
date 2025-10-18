---
timestamp: 'Fri Oct 17 2025 20:23:12 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_202312.9f163492.md]]'
content_id: 23267cc6e62504d56ec857807c140ea05bd1c5fb131aebb28f66c9999ef58a71
---

# response:

The following code implements the `PainLocationScoring` concept.

```typescript
// file: src/PainLocationScoring/PainLocationScoringConcept.ts

import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "PainLocationScoring" + ".";

// Generic types of this concept
type User = ID;
type Map = ID; // Represents the ID of a body map (e.g., "user:Alice:map:FrontBody")
type Region = ID; // Represents the ID of a specific pain region *instance* on a map (e.g., "region:12345")

// State structures
// ----------------

/**
 * a set of Users with
 *  a set of body Maps
 *
 * This interface represents a body map belonging to a user.
 * It primarily links a map ID to a user ID for ownership checks.
 * Regions are linked to maps via their `mapId` field in the `PainRegionDoc` interface.
 */
interface BodyMapDoc {
  _id: Map;
  userId: User;
}

/**
 * a set of body Maps with
 *  a set of Regions
 * a set of Regions with
 *  a scaled score Number
 *
 * This interface represents a specific region of the body on a map, with an associated pain score.
 * Note: The concept specification for `addRegion` has `region: Region` as an input.
 * To make the concept functional (i.e., know *which* part of the body is being selected),
 * we introduce `locationName: string`. The `region` input parameter for `addRegion`
 * will be treated as this `locationName` (semantic identifier) in the implementation,
 * even though its type is `Region` (ID) in the spec. The output `(region: Region)` will
 * then be the *newly generated ID* for this specific pain entry. This is a pragmatic
 * interpretation to allow the concept to actually store location information.
 */
interface PainRegionDoc {
  _id: Region; // Unique ID for this specific pain region instance
  mapId: Map; // The map this region belongs to
  locationName: string; // e.g., "Left Shoulder", "Lower Back". Crucial for identifying *which* body part.
  score?: number; // Pain intensity score, 1-10. Optional as it's set later.
}

export default class PainLocationScoringConcept {
  // MongoDB collections for the concept's state
  private maps: Collection<BodyMapDoc>;
  private regions: Collection<PainRegionDoc>;

  constructor(private readonly db: Db) {
    this.maps = this.db.collection(PREFIX + "maps");
    this.regions = this.db.collection(PREFIX + "regions");
  }

  /**
   * Purpose: users can select a region on the body map and rate the pain on a scale of 1 to 10
   * Principle: each region on a body map may be assigned a numerical score representing pain intensity
   */

  /**
   * addRegion(user: User, map: Map, region: Region): (region: Region)
   *
   * @param {Object} args - The input arguments.
   * @param {User} args.user - The ID of the user.
   * @param {Map} args.map - The ID of the body map.
   * @param {Region} args.region - The semantic name of the region (e.g., "Left Shoulder").
   *                                 Though typed as `Region` (ID) in the spec, it's used as a string.
   * @returns {Promise<{ region: Region } | { error: string }>} The ID of the newly created region, or an error.
   *
   * @requires the Map must already exist for the given User
   * @effects creates and returns a new Region on that Map
   */
  async addRegion(
    { user, map, region: locationNameInput }: {
      user: User;
      map: Map;
      region: Region; // Semantically treated as locationName: string
    },
  ): Promise<{ region: Region } | { error: string }> {
    // Requires: The Map must already exist for the given User
    const existingMap = await this.maps.findOne({
      _id: map,
      userId: user,
    });

    if (!existingMap) {
      return {
        error: `Map '${map}' not found for user '${user}' or does not belong to user.`,
      };
    }

    const newRegionId: Region = freshID() as Region;
    const locationName: string = locationNameInput as string; // Pragmatic cast

    const newRegion: PainRegionDoc = {
      _id: newRegionId,
      mapId: map,
      locationName: locationName,
      score: undefined, // Initially no score
    };

    try {
      await this.regions.insertOne(newRegion);
      return { region: newRegionId };
    } catch (e) {
      // Handle potential duplicate _id (though freshID makes it rare) or other DB errors
      return { error: `Failed to add region: ${e.message}` };
    }
  }

  /**
   * scoreRegion(user: User, region: Region, score: Number)
   *
   * @param {Object} args - The input arguments.
   * @param {User} args.user - The ID of the user.
   * @param {Region} args.region - The ID of the specific pain region instance to score.
   * @param {number} args.score - The pain intensity score (1-10).
   * @returns {Promise<Empty | { error: string }>} An empty object on success, or an error.
   *
   * @requires the Region must exist within the User’s Map and the Number must be between 1 and 10
   * @effects associates the Number with that Region
   */
  async scoreRegion(
    { user, region, score }: { user: User; region: Region; score: number },
  ): Promise<Empty | { error: string }> {
    // Requires: The Number must be between 1 and 10
    if (score < 1 || score > 10) {
      return { error: "Score must be between 1 and 10." };
    }

    // Requires: The Region must exist within the User’s Map
    const existingRegion = await this.regions.findOne({ _id: region });
    if (!existingRegion) {
      return { error: `Region '${region}' not found.` };
    }

    const existingMap = await this.maps.findOne({
      _id: existingRegion.mapId,
      userId: user,
    });
    if (!existingMap) {
      return {
        error:
          `Map '${existingRegion.mapId}' for region '${region}' not found for user '${user}' or does not belong to user.`,
      };
    }

    // Effects: associates the Number with that Region
    try {
      const result = await this.regions.updateOne(
        { _id: region },
        { $set: { score: score } },
      );

      if (result.matchedCount === 0) {
        return { error: `Region '${region}' not found for update.` }; // Should not happen given prior findOne
      }

      return {}; // Success
    } catch (e) {
      return { error: `Failed to score region: ${e.message}` };
    }
  }

  /**
   * deleteRegion(user: User, region: Region)
   *
   * @param {Object} args - The input arguments.
   * @param {User} args.user - The ID of the user.
   * @param {Region} args.region - The ID of the specific pain region instance to delete.
   * @returns {Promise<Empty | { error: string }>} An empty object on success, or an error.
   *
   * @requires the Region must already exist within the User’s Map
   * @effects removes the Region from the associated Map
   */
  async deleteRegion(
    { user, region }: { user: User; region: Region },
  ): Promise<Empty | { error: string }> {
    // Requires: The Region must already exist within the User’s Map
    const existingRegion = await this.regions.findOne({ _id: region });
    if (!existingRegion) {
      return { error: `Region '${region}' not found.` };
    }

    const existingMap = await this.maps.findOne({
      _id: existingRegion.mapId,
      userId: user,
    });
    if (!existingMap) {
      return {
        error:
          `Map '${existingRegion.mapId}' for region '${region}' not found for user '${user}' or does not belong to user.`,
      };
    }

    // Effects: removes the Region from the associated Map
    try {
      const result = await this.regions.deleteOne({ _id: region });

      if (result.deletedCount === 0) {
        return { error: `Region '${region}' not found for deletion.` }; // Should not happen given prior findOne
      }

      return {}; // Success
    } catch (e) {
      return { error: `Failed to delete region: ${e.message}` };
    }
  }

  // --- Query Methods ---
  // These are not explicitly requested by the prompt, but are essential for testing and
  // confirming the effects of actions, as per concept implementation guidelines.

  /**
   * _getRegion(region: Region)
   * Retrieves a specific pain region document.
   * @param {Object} args - The input arguments.
   * @param {Region} args.region - The ID of the region to retrieve.
   * @returns {Promise<PainRegionDoc | null>} The region document or null if not found.
   */
  async _getRegion(
    { region }: { region: Region },
  ): Promise<PainRegionDoc | null> {
    return await this.regions.findOne({ _id: region });
  }

  /**
   * _getRegionsForMap(map: Map)
   * Retrieves all pain regions associated with a given map.
   * @param {Object} args - The input arguments.
   * @param {Map} args.map - The ID of the map.
   * @returns {Promise<PainRegionDoc[]>} An array of region documents.
   */
  async _getRegionsForMap({ map }: { map: Map }): Promise<PainRegionDoc[]> {
    return await this.regions.find({ mapId: map }).toArray();
  }

  /**
   * _createMap(user: User, map: Map)
   * Helper action to create a map, as the concept assumes maps already exist.
   * This is not part of the core concept actions but is needed to set up state.
   * @param {Object} args - The input arguments.
   * @param {User} args.user - The ID of the user.
   * @param {Map} args.map - The ID of the map to create.
   * @returns {Promise<Empty | { error: string }>}
   */
  async _createMap(
    { user, map }: { user: User; map: Map },
  ): Promise<Empty | { error: string }> {
    const newMap: BodyMapDoc = {
      _id: map,
      userId: user,
    };
    try {
      await this.maps.insertOne(newMap);
      return {};
    } catch (e) {
      if (e.code === 11000) { // Duplicate key error
        return { error: `Map '${map}' already exists for user '${user}'.` };
      }
      return { error: `Failed to create map: ${e.message}` };
    }
  }
}
```
