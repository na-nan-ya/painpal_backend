---
timestamp: 'Fri Oct 17 2025 12:53:46 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_125346.7cb48386.md]]'
content_id: 995db86f2accae863a37202b9146d80c65f29f591ac42bb49c9be5ac73bfb4b1
---

# Concept: BodyMapGeneration

`BodyMapGeneration` allows users to create and populate personalized body maps, defining regions with associated information, and retrieve these maps.

### Actions:

1. **`createBodyMap(userId: string, name: string)`**
   * **requires**:
     * `userId` must be a non-empty string.
     * `name` must be a non-empty string.
     * `name` must be unique for the given `userId`.
   * **effects**:
     * A new `body_map` record is created in the database.
     * Returns an object `{ id: string }` containing the ID of the new body map.
     * If requirements are not met, returns an object `{ error: string }`.

2. **`addRegionToBodyMap(bodyMapId: string, regionName: string, data: Record<string, unknown>)`**
   * **requires**:
     * `bodyMapId` must exist in the database.
     * `regionName` must be a non-empty string.
     * `data` must be a non-null object.
     * `regionName` must be unique within the given `bodyMapId`.
   * **effects**:
     * A new `body_map_region` record is created, linked to `bodyMapId`.
     * Returns an object `{ id: string }` containing the ID of the new region.
     * If requirements are not met, returns an object `{ error: string }`.

3. **`getBodyMapWithRegions(bodyMapId: string)`**
   * **requires**:
     * `bodyMapId` must be a non-empty string.
   * **effects**:
     * If `bodyMapId` exists, returns an object `{ id: string, userId: string, name: string, createdAt: Date, regions: BodyMapRegion[] }` where `regions` is an array of associated `BodyMapRegion` objects.
     * If `bodyMapId` does not exist, returns `null`.
     * If requirements are not met, returns an object `{ error: string }`.

4. **`listUserBodyMaps(userId: string)`**
   * **requires**:
     * `userId` must be a non-empty string.
   * **effects**:
     * Returns an array of `BodyMap` objects belonging to the `userId`. The array is empty if no maps are found.
     * If requirements are not met, returns an object `{ error: string }`.

### Principle:

A user can establish multiple unique body maps. Each body map can contain multiple unique regions, each with associated structured data. All created maps and their regions are retrievable.

***
