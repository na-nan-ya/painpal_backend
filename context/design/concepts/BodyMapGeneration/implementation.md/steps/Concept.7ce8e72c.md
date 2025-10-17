---
timestamp: 'Fri Oct 17 2025 11:34:17 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_113417.a6d478d2.md]]'
content_id: 7ce8e72cabb1fada8e05d3f2a25756e197151813ec3e92f52548616d5a738a47
---

# Concept: BodyMapGeneration

**concept** BodyMapGeneration \[Subject]

**purpose** To provide a visual representation of spatial data on a human body model for intuitive understanding and analysis.

**principle** If a user provides sensor data points with associated values for a particular subject, along with a configuration, then a corresponding body map image will be generated and stored, visually representing the data's distribution and intensity across the subject's body. This map can then be retrieved and viewed later.

**state**
`a set of BodyMaps with`
`  a subject Subject` (ID of the person/entity the map is for)
`  a name String` (user-friendly name for the map)
`  a rawData JSON` (the input data, e.g., `[{region: "head", value: 37.5}, {region: "left_arm", value: 2.1}]`)
`  a configuration JSON` (parameters for generation, e.g., `{template: "human_male_3d", colorScale: "spectral", unit: "C"}`)
`  a generatedImageUrl String` (URL or base64 representation of the generated image)
`  a createdAt DateTime`
`  a updatedAt DateTime`

**actions**
`generateBodyMap (subject: Subject, name: String, rawData: JSON, configuration: JSON): (bodyMap: BodyMapID) | (error: String)`
`  requires` `rawData` is a non-empty array of objects with `region` (String) and `value` (Number) fields, `configuration` is a valid JSON object.
`  effects` A new `BodyMap` is created. `subject`, `name`, `rawData`, `configuration` are stored. A `generatedImageUrl` is created based on `rawData` and `configuration`. `createdAt` and `updatedAt` are set to the current time. The ID of the new `bodyMap` is returned. If `rawData` or `configuration` are invalid, an `error` string is returned.

`updateBodyMap (bodyMap: BodyMapID, newName: String?, newRawData: JSON?, newConfiguration: JSON?): (bodyMap: BodyMapID) | (error: String)`
`  requires` `bodyMap` exists. At least one of `newName`, `newRawData`, `newConfiguration` is provided. If `newRawData` is provided, it must be valid. If `newConfiguration` is provided, it must be valid.
`  effects` The `BodyMap` identified by `bodyMap` is updated with `newName`, `newRawData`, `newConfiguration` if provided. If `newRawData` or `newConfiguration` are updated, the `generatedImageUrl` is regenerated. `updatedAt` is set to the current time. The `bodyMap` ID is returned. If `bodyMap` not found, no update parameters, or invalid data/config, an `error` string is returned.

`deleteBodyMap (bodyMap: BodyMapID): (success: Boolean) | (error: String)`
`  requires` `bodyMap` exists.
`  effects` The `BodyMap` identified by `bodyMap` is removed from the state. `success: true` is returned. If `bodyMap` not found, an `error` string is returned.

**queries**
`_getRawBodyMapData (bodyMap: BodyMapID): (subject: Subject, name: String, rawData: JSON, configuration: JSON, generatedImageUrl: String, createdAt: DateTime, updatedAt: DateTime) | (error: String)`
`  effects` Returns all stored details for the specified `bodyMap`. If `bodyMap` not found, an `error` string is returned.

`_listBodyMapsForSubject (subject: Subject): (bodyMaps: Array<{id: BodyMapID, name: String, generatedImageUrl: String, updatedAt: DateTime}>)`
`  effects` Returns a list of summary information for all body maps associated with the given `subject`. If no maps are found, an empty array is returned.

***
