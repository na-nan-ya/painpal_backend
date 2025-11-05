---
timestamp: 'Tue Nov 04 2025 21:07:50 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251104_210750.326cd59c.md]]'
content_id: 88d37dcf6d8cb3096f665d96c1b6c0f364512190e38d7a7e9a787aa10d8aefeb
---

# response:

````markdown
# API Specification: BodyMapGeneration Concept

**Purpose:** provide a daily visual representation of the body for users to track changes over time, without including any notion of body measurements.

---

## API Endpoints

### POST /api/BodyMapGeneration/generateMap

**Description:** Generates a new body map for a user, archiving the previous one if it exists.

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

**Description:** Manually saves a user's current, unsaved body map.

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

**Description:** Deletes a user's current, unsaved body map.

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

**Description:** A system action that runs daily to generate new maps for all users.

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

**Description:** Retrieves the current map for a given user.

**Requirements:**
- (No explicit requirements)

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

**Description:** Retrieves all saved (historical) maps for a given user.

**Requirements:**
- (No explicit requirements)

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
    "isSaved": true
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

**Description:** Creates and returns a new Breakthrough pain event associated with the specified month.

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

**Description:** Marks an ongoing breakthrough event as completed at a specified end time.

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
    "endTime": "string",
    "duration": "number"
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

**Description:** Modifies the start and end times of an existing breakthrough event.

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
    "endTime": "string",
    "duration": "number"
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

**Description:** Deletes a specified breakthrough pain event.

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

**Description:** Generates a summary of breakthrough events for a user within a specified month.

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

**Description:** Creates a new selectable pain region on a user's body map.

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

**Description:** Assigns a pain score to a specific region on a body map.

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

**Description:** Removes a pain region from a body map.

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

**Description:** Retrieves the details of a specific pain region.

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
    "score": "number"
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

**Description:** Retrieves all pain regions for a specific body map.

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
    "score": "number"
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

**Description:** A helper endpoint for testing purposes to register a map's existence and ownership.

**Requirements:**
- (No explicit requirements)

**Effects:**
- Inserts a record linking a map ID to a user ID for ownership checks in other actions.

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

# API Specification: MapSummaryGeneration Concept

**Purpose:** concise summary of all body map logs up until the present day.

---

## API Endpoints

### POST /api/MapSummaryGeneration/sumRegion

**Description:** Calculates the frequency and median score for a specific region across a set of maps within a date range.

**Requirements:**
- the Region must exist.

**Effects:**
- assimilates the Maps within the Range, counts the Region occurrences, and returns the associated Numbers

**Request Body:**
```json
{
  "period": { "start": "string", "end": "string" },
  "mapSet": ["string"],
  "regionName": "string"
}
```

**Success Response Body (Action):**
```json
{
  "score": "number",
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
### POST /api/MapSummaryGeneration/summarise

**Description:** Generates a human-readable summary string from pre-calculated statistics for a region.

**Requirements:**
- the Region must exist

**Effects:**
- returns a String incorporating the given values of Range, Region, and the associated Numbers

**Request Body:**
```json
{
  "period": { "start": "string", "end": "string" },
  "regionName": "string",
  "score": "number",
  "frequency": "number"
}
```

**Success Response Body (Action):**
```json
{
  "summary": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/MapSummaryGeneration/generateAndStoreSummary

**Description:** A convenience action that calculates statistics for a region and stores the generated summary.

**Requirements:**
- (No explicit requirements)

**Effects:**
- Combines the logic of `sumRegion` and `summarise`, then persists the resulting summary.

**Request Body:**
```json
{
  "user": "string",
  "period": { "start": "string", "end": "string" },
  "mapSet": ["string"],
  "regionName": "string"
}
```

**Success Response Body (Action):**
```json
{
  "summaryId": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/MapSummaryGeneration/exportSummaryAsPDF

**Description:** Generates a PDF document for a single summary report.

**Requirements:**
- the summary must exist

**Effects:**
- generates a PDF document containing the summary text and returns it as a Uint8Array buffer

**Request Body:**
```json
{
  "summaryId": "string"
}
```

**Success Response Body (Action):**
```json
{
  "pdfBuffer": "array"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/MapSummaryGeneration/exportUserSummariesAsPDF

**Description:** Generates a single PDF document containing all summary reports for a user.

**Requirements:**
- the user must have at least one summary

**Effects:**
- generates a PDF document containing all summaries for the user and returns it as a Uint8Array buffer

**Request Body:**
```json
{
  "user": "string"
}
```

**Success Response Body (Action):**
```json
{
  "pdfBuffer": "array"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/MapSummaryGeneration/_getSummary

**Description:** Retrieves a previously generated summary by its ID.

**Requirements:**
- (No explicit requirements)

**Effects:**
- Returns the summary for a given summary ID, or null if not found.

**Request Body:**
```json
{
  "summaryId": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "summary": {
      "_id": "string",
      "name": "string",
      "frequency": "number",
      "medianScore": "number",
      "summary": "string",
      "period": { "start": "string", "end": "string" },
      "userId": "string"
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
### POST /api/MapSummaryGeneration/_getUserSummaries

**Description:** Retrieves all summaries generated for a specific user.

**Requirements:**
- (No explicit requirements)

**Effects:**
- Returns all summaries for a given user.

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
    "name": "string",
    "frequency": "number",
    "medianScore": "number",
    "summary": "string",
    "period": { "start": "string", "end": "string" },
    "userId": "string"
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

# API Specification: UserAuthentication Concept

**Purpose:** allows users to create a simple identity with a username and password, manage login sessions, and access their associated body maps.

---

## API Endpoints

### POST /api/UserAuthentication/register

**Description:** Creates a new user account.

**Requirements:**
- no existing User has the same username

**Effects:**
- Creates and stores a new User with the given credentials
- Returns the _id of the newly created User

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response Body (Action):**
```json
{
  "user": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/UserAuthentication/login

**Description:** Authenticates a user and creates a new session.

**Requirements:**
- a User with the given username exists and password matches the username

**Effects:**
- returns a new active Session if the password matches, otherwise returns null

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response Body (Action):**
```json
{
  "session": "string | null"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/UserAuthentication/logout

**Description:** Deactivates a user's session.

**Requirements:**
- the Session exists and is active

**Effects:**
- sets the Session's active flag to false and ends the user's login session

**Request Body:**
```json
{
  "session": "string"
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
### POST /api/UserAuthentication/getUserMaps

**Description:** Retrieves all body map IDs associated with a user.

**Requirements:**
- the User exists and has a valid active session

**Effects:**
- returns all BodyMaps associated with that User

**Request Body:**
```json
{
  "user": "string",
  "session": "string"
}
```

**Success Response Body (Action):**
```json
{
  "maps": ["string"]
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/UserAuthentication/_getUser

**Description:** Retrieves a user's details by their username.

**Requirements:**
- (No explicit requirements)

**Effects:**
- Returns the user state for a given username, or null if not found.

**Request Body:**
```json
{
  "username": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "user": {
      "_id": "string",
      "username": "string",
      "password": "string"
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
### POST /api/UserAuthentication/_getSession

**Description:** Retrieves the details of a specific session.

**Requirements:**
- (No explicit requirements)

**Effects:**
- Returns the session state for a given session ID, or null if not found.

**Request Body:**
```json
{
  "session": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "session": {
      "_id": "string",
      "userId": "string",
      "active": "boolean",
      "startTimestamp": "string"
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
````
