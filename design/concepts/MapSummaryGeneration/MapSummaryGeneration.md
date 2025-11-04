**concept** MapSummaryGeneration

**purpose** concise summary of all body map logs up until the present day.

**principle** captures and organizes body map data over time, 
              analyses region-based selection and scoring, 
              generates concise summaries from metrics

**state**  
  a set of Users with  
    a set of body Maps
  
  a set of Maps with  
    a set of regions  
    a date Range  
  
  a set of Regions with  
    a frequency Number  
    a median score Number 
    a summary String

**actions**

sumRegion(period: Range, mapSet: Maps, region: Region): (score: Number, frequency: Number)  
  **requires** the Region must exist.  
  **effects** assimilates the Maps within the Range, counts the Region occurrences, and returns the associated Numbers

summarise(period: Range, region: Region, score: Number, frequency: Number): (summary: String)  
  **requires** the Region must exist  
  **effects** returns a String incorporating the given values of Range, Region**, and the associated Numbers
