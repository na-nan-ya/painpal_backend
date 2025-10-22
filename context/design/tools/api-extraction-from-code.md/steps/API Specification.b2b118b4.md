---
timestamp: 'Tue Oct 21 2025 21:42:17 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251021_214217.2912e0aa.md]]'
content_id: b2b118b4b02fb5a5fe1cd62c7900d6923a0d1bf3ce5cbee3427100fb7b9a9d83
---

# API Specification: PainLocationScoring Concept

**Purpose:** users can select a region on the body map and rate the pain on a scale of 1 to 10

***

## API Endpoints

### POST /api/PainLocationScoring/addRegion

**Description:** Creates and returns a new Region on that Map.

**Requirements:**

* the Map must already exist for the given User

**Effects:**

* creates and returns a new Region on that Map

**Request Body:**

```json
{
  "user": "string",
  "map": "string",
  "regionName": "string"
}
```

**Success Response Body (Action):**

```json
{
  "region": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/PainLocationScoring/scoreRegion

**Description:** Associates the Number with that Region.

**Requirements:**

* the Region must exist within the User’s Map and the Number must be between 1 and 10

**Effects:**

* associates the Number with that Region

**Request Body:**

```json
{
  "user": "string",
  "region": "string",
  "score": "number"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/PainLocationScoring/deleteRegion

**Description:** Removes the Region from the associated Map.

**Requirements:**

* the Region must already exist within the User’s Map

**Effects:**

* removes the Region from the associated Map

**Request Body:**

```json
{
  "user": "string",
  "region": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/PainLocationScoring/\_getRegion

**Description:** Retrieves a specific region's details for a given user, including its score.

**Requirements:**

* The region must exist and be owned by the user.

**Effects:**

* Returns an array containing the BodyRegion object if found and owned, otherwise an empty array or error.

**Request Body:**

```json
{
  "user": "string",
  "region": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "string",
    "mapId": "string",
    "name": "string",
    "score": "number | undefined"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/PainLocationScoring/\_getRegionsForMap

**Description:** Retrieves all regions associated with a specific map owned by a user.

**Requirements:**

* The map must exist and be owned by the user.

**Effects:**

* Returns an array of BodyRegion objects for the specified map and user.

**Request Body:**

```json
{
  "user": "string",
  "map": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "string",
    "mapId": "string",
    "name": "string",
    "score": "number | undefined"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/PainLocationScoring/\_addMapForTesting

**Description:** Helper function for testing purposes ONLY. This concept does not implement `addMap` as per spec: "Do not add functions that create maps internally". However, for testing the concept in isolation, we need a way to populate the `bodyMaps` collection that this concept uses for ownership checks. This method bypasses the normal concept rules because it's purely for setting up test data.

**Requirements:**

* (No explicit requirements)

**Effects:**

* (No explicit effects beyond database insertion for testing)

**Request Body:**

```json
{
  "user": "string",
  "map": "string"
}
```

**Success Response Body (Query):**

```json
[
  {}
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

```
```
