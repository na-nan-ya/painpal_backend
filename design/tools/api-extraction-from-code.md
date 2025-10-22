[@api-extraction-from-spec](api-extraction-from-spec.md)

# Extracting from code

The following is an explanation of how concepts are implemented, for the purposes of understanding how to extract an API.

[@implementing-concepts](../background/implementing-concepts.md)

# prompt: 

Now, analyze the following Concept Implementation and generate the API documentation based on these instructions.

[@BodyMapGeneration](../../src/concepts/BodyMapGeneration/BodyMapGeneration.ts)

[@BreakThroughTracking](../../src/concepts/BreakThroughTracking/BreakThroughTrackingConcept.ts)

[@PainLocationScoring](../../src/concepts/PainLocationScoring/PainLocationScoringConcept.ts)

# response:

```markdown
# API Specification: BodyMapGeneration Concept

**Purpose:** provide a daily visual representation of the body for users to track changes over time, without including any notion of body measurements.

---

## API Endpoints

### POST /api/BodyMapGeneration/generateMap

**Description:** Generates a new body map for a user.

**Requirements:**
- true

**Effects:**
- If user has an existing currentMapId: That map's isSaved property is set to true.
- A new Map is created with ownerId, current Date, placeholder imageUrl, and isSaved: false.
- The user's currentMapId is updated to this new Map's ID.
- Returns the _id of the newly generated Map.

**Request Body:**
```json
{
  "user": "string"
}
```

**Success Response Body (Action):**
```json
{
  "mapId": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/BodyMapGeneration/saveMap

**Description:** Allows a user to manually archive their current map at any time.

**Requirements:**
- user has a currentMapId.

**Effects:**
- The Map referenced by user's currentMapId has its isSaved property set to true.
- This action allows a user to manually archive their current map at any time.

**Request Body:**
```json
{
  "user": "string"
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

---

### POST /api/BodyMapGeneration/clearMap

**Description:** Deletes the user's current body map and clears the reference.

**Requirements:**
- user has a currentMapId.

**Effects:**
- The Map referenced by user's currentMapId is deleted from the maps collection.
- The user's currentMapId is set to null.

**Request Body:**
```json
{
  "user": "string"
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

---

### POST /api/BodyMapGeneration/triggerDailyMapGeneration

**Description:** System action to automatically generate and save maps for all users daily.

**Requirements:**
- The current time is 00:00:00 (midnight) of a new day, AND dailyGenerationStatus.lastRunDate is not today's date.

**Effects:**
- For each user in the users collection: Call generateMap(user). (This will implicitly save the previous currentMap if one exists, then create a new one).
- Update dailyGenerationStatus.lastRunDate to the current date.

**Request Body:**
```json
{}
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

---

### POST /api/BodyMapGeneration/_getCurrentMap

**Description:** Returns the current map for a given user, or null if none exists.

**Requirements:**
- (Implicit from effects: No explicit requirements other than valid user ID)

**Effects:**
- Returns the current map for a given user, or null if none exists.

**Request Body:**
```json
{
  "user": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "map": {
      "_id": "string",
      "ownerId": "string",
      "creationDate": "string",
      "imageUrl": "string",
      "isSaved": "boolean"
    }
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/BodyMapGeneration/_getSavedMaps

**Description:** Returns all saved maps for a given user.

**Requirements:**
- (Implicit from effects: No explicit requirements other than valid user ID)

**Effects:**
- Returns all saved maps for a given user.

**Request Body:**
```json
{
  "user": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "_id": "string",
    "ownerId": "string",
    "creationDate": "string",
    "imageUrl": "string",
    "isSaved": "boolean"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

# API Specification: BreakThroughTracking Concept

**Purpose:** record, edit, and summarise occurrences of breakthrough pain events

---

## API Endpoints

### POST /api/BreakThroughTracking/startBreakthrough

**Description:** Creates and returns a new Breakthrough pain event associated with the Month.

**Requirements:**
- No overlapping Breakthrough exists for the same User and time range.
- Specifically, the user must not have an active (ongoing) breakthrough, and the startTime must not fall within any existing completed breakthrough for that user in that month.

**Effects:**
- Creates and returns a new Breakthrough pain event associated with the Month.

**Request Body:**
```json
{
  "user": "string",
  "startTime": "string",
  "month": "string"
}
```

**Success Response Body (Action):**
```json
{
  "pain": {
    "_id": "string",
    "userId": "string",
    "monthId": "string",
    "startTime": "string",
    "endTime": "string | null",
    "duration": "number | null"
  }
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/BreakThroughTracking/endBreakthrough

**Description:** Sets the End time, computes Duration, and returns the completed Breakthrough.

**Requirements:**
- The Breakthrough has a Start time and belongs to the User.
- The provided endTime must be a valid date and must be after the breakthrough's startTime.

**Effects:**
- Sets the End time, computes Duration, and returns the completed Breakthrough.

**Request Body:**
```json
{
  "user": "string",
  "pain": "string",
  "endTime": "string"
}
```

**Success Response Body (Action):**
```json
{
  "pain": {
    "_id": "string",
    "userId": "string",
    "monthId": "string",
    "startTime": "string",
    "endTime": "string | null",
    "duration": "number | null"
  }
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/BreakThroughTracking/editBreakthrough

**Description:** Updates the Start/End times, recomputes Duration, and returns the updated Breakthrough.

**Requirements:**
- The Breakthrough exists for the User.
- `newEnd` must be after `newStart`.
- The updated breakthrough must not overlap with any other breakthroughs for the same user in the same month.

**Effects:**
- Updates the Start/End times, recomputes Duration, and returns the updated Breakthrough.

**Request Body:**
```json
{
  "user": "string",
  "pain": "string",
  "newStart": "string",
  "newEnd": "string"
}
```

**Success Response Body (Action):**
```json
{
  "pain": {
    "_id": "string",
    "userId": "string",
    "monthId": "string",
    "startTime": "string",
    "endTime": "string | null",
    "duration": "number | null"
  }
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/BreakThroughTracking/deleteBreakthrough

**Description:** Removes the Breakthrough from the associated Month.

**Requirements:**
- The Breakthrough exists for the User.

**Effects:**
- Removes the Breakthrough from the associated Month.

**Request Body:**
```json
{
  "user": "string",
  "pain": "string"
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

---

### POST /api/BreakThroughTracking/summarise

**Description:** Returns a summary String with the frequency and average duration for the Month for the specified user. The average duration and frequency are also returned as explicit numerical values.

**Requirements:**
- (No explicit requirements)

**Effects:**
- Returns a summary String with the frequency and average duration for the Month for the specified user.
- The average duration and frequency are also returned as explicit numerical values.

**Request Body:**
```json
{
  "user": "string",
  "month": "string"
}
```

**Success Response Body (Action):**
```json
{
  "summary": "string",
  "avgDuration": "number",
  "frequency": "number"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

# API Specification: PainLocationScoring Concept

**Purpose:** users can select a region on the body map and rate the pain on a scale of 1 to 10

---

## API Endpoints

### POST /api/PainLocationScoring/addRegion

**Description:** Creates and returns a new Region on that Map.

**Requirements:**
- the Map must already exist for the given User

**Effects:**
- creates and returns a new Region on that Map

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

---

### POST /api/PainLocationScoring/scoreRegion

**Description:** Associates the Number with that Region.

**Requirements:**
- the Region must exist within the User’s Map and the Number must be between 1 and 10

**Effects:**
- associates the Number with that Region

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

---

### POST /api/PainLocationScoring/deleteRegion

**Description:** Removes the Region from the associated Map.

**Requirements:**
- the Region must already exist within the User’s Map

**Effects:**
- removes the Region from the associated Map

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

---

### POST /api/PainLocationScoring/_getRegion

**Description:** Retrieves a specific region's details for a given user, including its score.

**Requirements:**
- The region must exist and be owned by the user.

**Effects:**
- Returns an array containing the BodyRegion object if found and owned, otherwise an empty array or error.

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

---

### POST /api/PainLocationScoring/_getRegionsForMap

**Description:** Retrieves all regions associated with a specific map owned by a user.

**Requirements:**
- The map must exist and be owned by the user.

**Effects:**
- Returns an array of BodyRegion objects for the specified map and user.

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

---

### POST /api/PainLocationScoring/_addMapForTesting

**Description:** Helper function for testing purposes ONLY. This concept does not implement `addMap` as per spec: "Do not add functions that create maps internally". However, for testing the concept in isolation, we need a way to populate the `bodyMaps` collection that this concept uses for ownership checks. This method bypasses the normal concept rules because it's purely for setting up test data.

**Requirements:**
- (No explicit requirements)

**Effects:**
- (No explicit effects beyond database insertion for testing)

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

---
```