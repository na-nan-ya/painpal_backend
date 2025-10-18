---
timestamp: 'Fri Oct 17 2025 20:14:28 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_201428.442c5a20.md]]'
content_id: d162543233176a8222b3350b226b70ecd7a3d1ed0356aafe5d739ee122ce546d
---

# prompt: Implement the PainLocationScoring

**concept** PainLocationScoring
**purpose** users can select a region on the body map and rate the pain on a scale of 1 to 10
**principle** each region on a body map may be assigned a numerical score representing pain intensity

**state**
a set of Users with
 a set of body Maps
a set of body Maps with
 a set of Regions
a set of Regions with
 a scaled score Number

**actions**
addRegion(user: User, map: Map, region: Region): (region: Region)
 **requires** the Map must already exist for the given User
 **effects** creates and returns a new Region on that Map

scoreRegion(user: User, region: Region, score: Number)
 **requires** the Region must exist within the User’s Map and the Number must be between 1 and 10
 **effects** associates the Number with that Region

deleteRegion(user: User, region: Region)
 **requires** the Region must already exist within the User’s Map
 **effects** removes the Region from the associated Map
