---
timestamp: 'Fri Oct 17 2025 11:34:17 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_113417.a6d478d2.md]]'
content_id: 94f11f9566f8dc0e69adda31abe83752a2a75820a00c0d9459a9411b268e7d11
---

# Implementation: BodyMapGeneration

**file: src/BodyMapGeneration/BodyMapGenerationConcept.ts**

```typescript
import { Collection, Db } from "npm:mongodb";
import { ID } from "../../utils/types.ts"; // Assuming utils is in a sibling directory to concepts
import { freshID } from "../../utils/database.ts"; // Assuming utils is in a sibling directory to concepts

// Declare collection prefix, use concept name
const PREFIX = "BodyMapGeneration" + ".";

// Generic types of this concept
type SubjectID = ID;
type BodyMapID = ID;

/**
 * Represents a single data point for body map generation.
 * 'region': e.g., "head", "left_arm", "abdomen"
 * 'value': e.g., temperature, pain intensity, sensor reading
 * Additional properties can be added as needed.
 */
interface RawDataEntry {
  region: string;
  value: number;
  [key: string]: unknown; // Allows for additional arbitrary data point properties
}

/**
 * Interface for the stored state of a generated body map.
 * This directly corresponds to documents in the MongoDB 'bodyMaps' collection.
 */
interface GeneratedBodyMap {
  _id: BodyMapID;
  subject: SubjectID;
  name: string;
  rawData: RawDataEntry[]; // Stricter typing for rawData
  configuration: Record<string, unknown>; // Flexible JSON for config
  generatedImageUrl: string; // URL or base64 representation of the generated image
  createdAt: Date;
  updatedAt: Date;
}

// --- Action Argument and Result Interfaces ---

interface GenerateBodyMapArgs {
  subject: SubjectID;
  name: string;
  rawData: RawDataEntry[];
  configuration: Record<string, unknown>;
}

interface GenerateBodyMapResult {
  bodyMap?: BodyMapID; // On success, returns the ID of the new body map
  error?: string; // On failure, returns an error message
}

interface UpdateBodyMapArgs {
  bodyMap: BodyMapID;
  newName?: string;
  newRawData?: RawDataEntry[];
  newConfiguration?: Record<string, unknown>;
}

interface UpdateBodyMapResult {
  bodyMap?: BodyMapID; // On success, returns the ID of the updated body map
  error?: string; // On failure, returns an error message
}

interface DeleteBodyMapArgs {
  bodyMap: BodyMapID;
}

interface DeleteBodyMapResult {
  success?: boolean; // On success, indicates the deletion was successful
  error?: string; // On failure, returns an error message
}

interface GetRawBodyMapDataArgs {
  bodyMap: BodyMapID;
}

interface GetRawBodyMapDataResult {
  subject?: SubjectID;
  name?: string;
  rawData?: RawDataEntry[];
  configuration?: Record<string, unknown>;
  generatedImageUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
  error?: string;
}

interface ListBodyMapsForSubjectArgs {
  subject: SubjectID;
}

interface ListBodyMapsForSubjectResult {
  bodyMaps: Array<{
    id: BodyMapID;
    name: string;
    generatedImageUrl: string;
    updatedAt: Date;
  }>;
}

/**
 * concept BodyMapGeneration [Subject]
 * purpose To provide a visual representation of spatial data on a human body model for intuitive understanding and analysis.
 */
export default class BodyMapGenerationConcept {
  bodyMaps: Collection<GeneratedBodyMap>;

  constructor(private readonly db: Db) {
    this.bodyMaps = this.db.collection(PREFIX + "bodyMaps");
  }

  /**
   * Helper to simulate image generation based on rawData and configuration.
   * In a real-world scenario, this would interact with an external image rendering service.
   */
  private generateImageUrl(
    rawData: RawDataEntry[],
    configuration: Record<string, unknown>,
  ): string {
    // A simple, deterministic placeholder for a generated image URL.
    // In production, this would involve a robust image generation pipeline.
    const dataHash = JSON.stringify(rawData) + JSON.stringify(configuration);
    // Using base64 encoding to create a pseudo-unique string from the data.
    // In Deno, `btoa` is global for web compatibility.
    return `https://dummybodymap.com/map/${btoa(dataHash).substring(0, 20)}.png`;
  }

  /**
   * generateBodyMap (subject: Subject, name: String, rawData: JSON, configuration: JSON): (bodyMap: BodyMapID) | (error: String)
   *   requires rawData is a non-empty array of objects with region (String) and value (Number) fields, configuration is a valid JSON object.
   *   effects A new BodyMap is created. subject, name, rawData, configuration are stored. A generatedImageUrl is created based on rawData and configuration. createdAt and updatedAt are set to the current time. The ID of the new bodyMap is returned. If rawData or configuration are invalid, an error string is returned.
   */
  async generateBodyMap(
    { subject, name, rawData, configuration }: GenerateBodyMapArgs,
  ): Promise<GenerateBodyMapResult> {
    // Precondition: rawData is a non-empty array of objects with region (String) and value (Number) fields
    if (
      !rawData || rawData.length === 0 ||
      !rawData.every((entry) =>
        typeof entry.region === "string" && typeof entry.value === "number"
      )
    ) {
      return {
        error:
          "Invalid rawData: Must be a non-empty array of objects with 'region' (string) and 'value' (number).",
      };
    }

    // Precondition: configuration is a valid JSON object
    if (typeof configuration !== "object" || configuration === null) {
      return { error: "Invalid configuration: Must be a valid JSON object." };
    }

    const newBodyMapId = freshID();
    const now = new Date();
    const generatedImageUrl = this.generateImageUrl(rawData, configuration);

    const newBodyMap: GeneratedBodyMap = {
      _id: newBodyMapId,
      subject,
      name,
      rawData,
      configuration,
      generatedImageUrl,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await this.bodyMaps.insertOne(newBodyMap);
      return { bodyMap: newBodyMapId };
    } catch (e) {
      console.error("Error inserting new body map:", e);
      return { error: "Failed to generate body map due to a database error." };
    }
  }

  /**
   * updateBodyMap (bodyMap: BodyMapID, newName: String?, newRawData: JSON?, newConfiguration: JSON?): (bodyMap: BodyMapID) | (error: String)
   *   requires bodyMap exists. At least one of newName, newRawData, newConfiguration is provided. If newRawData is provided, it must be valid. If newConfiguration is provided, it must be valid.
   *   effects The BodyMap identified by bodyMap is updated with newName, newRawData, newConfiguration if provided. If newRawData or newConfiguration are updated, the generatedImageUrl is regenerated. updatedAt is set to the current time. The bodyMap ID is returned. If bodyMap not found, no update parameters, or invalid data/config, an error string is returned.
   */
  async updateBodyMap(
    { bodyMap, newName, newRawData, newConfiguration }: UpdateBodyMapArgs,
  ): Promise<UpdateBodyMapResult> {
    // Precondition: bodyMap exists.
    const existingMap = await this.bodyMaps.findOne({ _id: bodyMap });
    if (!existingMap) {
      return { error: `Body map with ID '${bodyMap}' not found.` };
    }

    // Precondition: At least one of newName, newRawData, newConfiguration is provided.
    if (newName === undefined && newRawData === undefined && newConfiguration === undefined) {
      return { error: "No update parameters provided." };
    }

    const updateDoc: Partial<GeneratedBodyMap> = { updatedAt: new Date() };
    let shouldRegenerateImage = false;

    if (newName !== undefined) {
      updateDoc.name = newName;
    }
    if (newRawData !== undefined) {
      // Precondition: If newRawData is provided, it must be valid.
      if (newRawData.length === 0 || !newRawData.every((entry) => typeof entry.region === "string" && typeof entry.value === "number")) {
        return { error: "Invalid newRawData: Must be a non-empty array of objects with 'region' (string) and 'value' (number)." };
      }
      updateDoc.rawData = newRawData;
      shouldRegenerateImage = true;
    }
    if (newConfiguration !== undefined) {
      // Precondition: If newConfiguration is provided, it must be valid.
      if (typeof newConfiguration !== "object" || newConfiguration === null) {
        return { error: "Invalid newConfiguration: Must be a valid JSON object." };
      }
      updateDoc.configuration = newConfiguration;
      shouldRegenerateImage = true;
    }

    if (shouldRegenerateImage) {
      // Use existing or new data/config to regenerate image
      const rawDataForRegen = updateDoc.rawData || existingMap.rawData;
      const configForRegen = updateDoc.configuration || existingMap.configuration;
      updateDoc.generatedImageUrl = this.generateImageUrl(
        rawDataForRegen,
        configForRegen,
      );
    }

    try {
      await this.bodyMaps.updateOne(
        { _id: bodyMap },
        { $set: updateDoc },
      );
      return { bodyMap: bodyMap };
    } catch (e) {
      console.error(`Error updating body map ${bodyMap}:`, e);
      return { error: "Failed to update body map due to a database error." };
    }
  }

  /**
   * deleteBodyMap (bodyMap: BodyMapID): (success: Boolean) | (error: String)
   *   requires bodyMap exists.
   *   effects The BodyMap identified by bodyMap is removed from the state. success: true is returned. If bodyMap not found, an error string is returned.
   */
  async deleteBodyMap({ bodyMap }: DeleteBodyMapArgs): Promise<DeleteBodyMapResult> {
    // Precondition: bodyMap exists (checked implicitly by deleteOne result)
    try {
      const result = await this.bodyMaps.deleteOne({ _id: bodyMap });
      if (result.deletedCount === 0) {
        return { error: `Body map with ID '${bodyMap}' not found.` };
      }
      return { success: true };
    } catch (e) {
      console.error(`Error deleting body map ${bodyMap}:`, e);
      return { error: "Failed to delete body map due to a database error." };
    }
  }

  /**
   * _getRawBodyMapData (bodyMap: BodyMapID): (subject: Subject, name: String, rawData: JSON, configuration: JSON, generatedImageUrl: String, createdAt: DateTime, updatedAt: DateTime) | (error: String)
   *   effects Returns all stored details for the specified bodyMap. If bodyMap not found, an error string is returned.
   */
  async _getRawBodyMapData(
    { bodyMap }: GetRawBodyMapDataArgs,
  ): Promise<GetRawBodyMapDataResult> {
    try {
      const foundMap = await this.bodyMaps.findOne({ _id: bodyMap });
      if (!foundMap) {
        return { error: `Body map with ID '${bodyMap}' not found.` };
      }
      return {
        subject: foundMap.subject,
        name: foundMap.name,
        rawData: foundMap.rawData,
        configuration: foundMap.configuration,
        generatedImageUrl: foundMap.generatedImageUrl,
        createdAt: foundMap.createdAt,
        updatedAt: foundMap.updatedAt,
      };
    } catch (e) {
      console.error(`Error retrieving body map data for ${bodyMap}:`, e);
      return { error: "Failed to retrieve body map data due to a database error." };
    }
  }

  /**
   * _listBodyMapsForSubject (subject: Subject): (bodyMaps: Array<{id: BodyMapID, name: String, generatedImageUrl: String, updatedAt: DateTime}>)
   *   effects Returns a list of summary information for all body maps associated with the given subject. If no maps are found, an empty array is returned.
   */
  async _listBodyMapsForSubject(
    { subject }: ListBodyMapsForSubjectArgs,
  ): Promise<ListBodyMapsForSubjectResult> {
    try {
      const maps = await this.bodyMaps.find({ subject }).project({
        _id: 1,
        name: 1,
        generatedImageUrl: 1,
        updatedAt: 1,
      }).toArray();

      return {
        bodyMaps: maps.map((m) => ({
          id: m._id,
          name: m.name,
          generatedImageUrl: m.generatedImageUrl,
          updatedAt: m.updatedAt,
        })),
      };
    } catch (e) {
      console.error(`Error listing body maps for subject ${subject}:`, e);
      // As per concept definition, return empty array on failure/no results for list queries
      return { bodyMaps: [] };
    }
  }
}
```
