---
timestamp: 'Fri Oct 17 2025 22:17:03 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_221703.51cccc84.md]]'
content_id: 743166b334b4b0b4bf8f987e48e0a8488efdd8cf6eb888d38648f5097f63ed19
---

# test: BreakThroughTracking

**concept** BreakThroughTracking
**purpose** record, edit, and summarise occurrences of breakthrough pain events
**principle** breakthrough pain events are tracked within months to determine frequency, average duration, and overlap patterns; users may edit or delete entries

**state**
a set of Users with
 a set of Months

a set of Months with
 a set of Breakthroughs
 a breakthrough Summary

a set of Breakthroughs with
 a Start time
 an End time
 a duration Number

a breakthrough Summary with
 a Number of breakthroughs
 an average duration Number

**actions**
startBreakthrough(user: User, startTime: DateTime, month: Month): (pain: Breakthrough)
 **requires** no overlapping Breakthrough exists for the same User and time range
 **effects** creates and returns a new Breakthrough pain event associated with the Month

endBreakthrough(user: User, pain: Breakthrough, endTime: DateTime): (pain: Breakthrough)
 **requires** the Breakthrough has a Start time and belongs to the User
 **effects** sets the End time, computes Duration, and returns the completed Breakthrough

editBreakthrough(user: User, pain: Breakthrough, newStart: DateTime, newEnd: DateTime): (pain: Breakthrough)
   **requires** the Breakthrough exists for the User
   **effects** updates the Start/End times, recomputes Duration, and ensures no overlap with other Breakthroughs

deleteBreakthrough(user: User, pain: Breakthrough)
 **requires** the Breakthrough exists for the User
 **effects** removes the Breakthrough from the associated Month

summarise(user: User, month: Month, avgDuration: Number, frequency: Number): (summary: String)
 **effects** returns a summary String with the frequency and average duration for the Month
