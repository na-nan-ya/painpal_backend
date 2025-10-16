***Concept Design***

* **Concept Specifications**

**(1)**  
**concept** BodyMapGeneration  
**purpose** a body map is saved at the end of each day and a fresh one is created for usage the next day  
**principle**   
**state**   
a set of Users with  
   a set of calendar Days

a set of calendar Days with  
   a set of body Maps

a set of body Maps with  
   a set of Highlights

**actions**   
	**system** generateMap(day: Day, hours: 24): (bodymap: Map)  
	   **effects** creates and returns a fresh Map associated with that day  
	**system** saveMap(bodymap: Map, hours: 24):  
	   **requires** the Map must exist   
	   **effects** saves the Map associated with that day  
	clearMap(bodymap: Map): (bodymap: Map)  
	   **requires** the Map must exist and have at least one Highlight  
	   **effects** removes all Highlights from the Map and returns it  
	   

**(2)**  
**concept** PainLocationScoring  
**purpose** users can select a region on the body map and rate the pain on a scale of 1 to 10  
**principle**   
**state**   
a set of Users with  
   a set of body Maps

a set of body Maps with  
   a set of Regions

a set of Regions with  
   a scaled score Number

**actions**   
	addRegion(map: Map, region: Region): (region: Region)  
	   **requires** the Map must already exist  
	   **effects** creates and returns a new Region on that Map  
	scoreRegion(region: Region, score: Number)  
   **requires**  the Region must exist and the Number must be between 1 and 10  
   **effects** associates the Number with that region  
deleteRegion(region: Region)  
   **requires** the Region must already exist  
   **effects** removes the Region from the associated Map

**(3)**  
**concept** MapSummaryGeneration  
**purpose** concisely summarise all body map logs until present-day  
**principle**   
**state**   
a set of Users with  
   a set of body Maps

a set of body Maps with  
   a set of Regions  
   a date Range

a set of Regions with  
   a frequency Number  
   a median score Number  
   a summary String     
**actions**   
	sumRegion(period: Range, mapSet: Maps, region: Region): (score: Number, frequency: Number)  
	   **requires** the Region must exist  
	   **effects** scans Maps in date Range, counts Region hits, returns Region with associated Numbers  
	summarise(period: Range, region: Region, score: Number, frequency: Number): (summary: String)  
   **requires** the Region and its Numbers must exist  
   **effects** returns a String incorporating the given values of Range, Region, and the Numbers

**(4)**  
**concept** BreakThroughTracking  
**purpose** record the occurrence and duration of breakthrough pain and summarise such occurrences  
**principle**   
**state**   
a set of Users with  
   a set of Months

a set of Months with  
   a set of Breakthroughs  
   a breakthrough Summary

a set of Breakthroughs with  
   a Start time  
   an End time

a breakthrough Summary with  
   a Number of breakthroughs  
   an average duration Number

**actions**   
	startBreakthrough(startTime: Start, month: Month): (pain: Breakthrough)  
	   **effects** creates and returns a new Breakthrough pain event associated with the Month  
	endBreakthrough(endTime: End, pain: Breakthrough): (pain: Breakthrough)  
	   **requires** the Breakthrough has a start time  
	   **effects** returns the Breakthrough with an End time to complete the log  
	summarise(month: Month, avgDuration: Number, frequency: Number) (summary: String)  
	   **effects**  returns a summary String with the frequency and average duration for the Month

* **Synchronisations**

**(1)**  
**sync** generateMap  
**when** BodyMapGeneration.saveMap(bodyMap: Map, hours: 24\)  
**then** BodyMapGeneration.generateMap(day: Day, hours: 24): (bodymap: Map)

**(2)**  
**sync** summarise  
**when** Request.displaySummary(summary: String)  
**then**   
   MapSummaryGeneration.sumRegion(period: Range, mapSet: Maps, region: Region): (score: Number, frequency: Number)  
   MapSummaryGeneration.summarise(period: Range, region: Region, score: Number, frequency: Number): (summary: String)

**(3)**  
**sync** deleteRegion  
**when** BodyMapGeneration.clearMap(bodymap: Map): (bodymap: Map)  
**then** PainLocationScoring.deleteRegion(region: Region)
