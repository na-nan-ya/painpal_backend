---
timestamp: 'Tue Oct 21 2025 21:42:17 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251021_214217.2912e0aa.md]]'
content_id: 4a41d146fa477fdf530b15689c58072c2d7924539273c428e71d970010795283
---

# API Specification: BreakThroughTracking Concept

**Purpose:** record, edit, and summarise occurrences of breakthrough pain events

***

## API Endpoints

### POST /api/BreakThroughTracking/startBreakthrough

**Description:** Creates and returns a new Breakthrough pain event associated with the Month.

**Requirements:**

* No overlapping Breakthrough exists for the same User and time range.
* Specifically, the user must not have an active (ongoing) breakthrough, and the startTime must not fall within any existing completed breakthrough for that user in that month.

**Effects:**

* Creates and returns a new Breakthrough pain event associated with the Month.

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

***

### POST /api/BreakThroughTracking/endBreakthrough

**Description:** Sets the End time, computes Duration, and returns the completed Breakthrough.

**Requirements:**

* The Breakthrough has a Start time and belongs to the User.
* The provided endTime must be a valid date and must be after the breakthrough's startTime.

**Effects:**

* Sets the End time, computes Duration, and returns the completed Breakthrough.

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

***

### POST /api/BreakThroughTracking/editBreakthrough

**Description:** Updates the Start/End times, recomputes Duration, and returns the updated Breakthrough.

**Requirements:**

* The Breakthrough exists for the User.
* `newEnd` must be after `newStart`.
* The updated breakthrough must not overlap with any other breakthroughs for the same user in the same month.

**Effects:**

* Updates the Start/End times, recomputes Duration, and returns the updated Breakthrough.

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

***

### POST /api/BreakThroughTracking/deleteBreakthrough

**Description:** Removes the Breakthrough from the associated Month.

**Requirements:**

* The Breakthrough exists for the User.

**Effects:**

* Removes the Breakthrough from the associated Month.

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

***

### POST /api/BreakThroughTracking/summarise

**Description:** Returns a summary String with the frequency and average duration for the Month for the specified user. The average duration and frequency are also returned as explicit numerical values.

**Requirements:**

* (No explicit requirements)

**Effects:**

* Returns a summary String with the frequency and average duration for the Month for the specified user.
* The average duration and frequency are also returned as explicit numerical values.

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

***
