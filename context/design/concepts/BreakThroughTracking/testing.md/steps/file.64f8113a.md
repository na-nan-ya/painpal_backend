---
timestamp: 'Fri Oct 17 2025 22:17:03 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_221703.51cccc84.md]]'
content_id: 64f8113a4be7f577e2963523477fec14301b88cdd569c169a74e130f716b0b1a
---

# file: src/concepts/BreakThroughTracking/BreakThroughTrackingConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

/**
 * concept: BreakThroughTracking
 * purpose: record, edit, and summarise occurrences of breakthrough pain events
 * principle: breakthrough pain events are tracked within months to determine frequency, average duration, and overlap patterns;
 *            users may edit or delete entries
 */

// Collection prefix
const PREFIX = "BreakThroughTracking" + ".";

// Generic types from the concept specification
type User = ID;
/**
 * Represents a calendar month for grouping.
 * Although specified as a generic 'Month' type, this implementation uses a string
 * in "YYYY-MM" format for practical, calendar-based grouping of events.
 */
type MonthString = string; // Format: "YYYY-MM"
type BreakthroughID = ID;

/**
 * a set of Breakthroughs with
 *  a Start time
 *  an End time
 *  a duration Number
 *
 * Represents a single breakthrough pain event.
 */
interface Breakthrough {
  _id: BreakthroughID;
  userId: User;
  monthId: MonthString; // e.g., "2023-10"
  startTime: Date;
  endTime: Date | null; // Null if the breakthrough is ongoing
  duration: number | null; // Duration in minutes, null if endTime is null
}

/**
 * a breakthrough Summary with
 *  a Number of breakthroughs
 *  an average duration Number
 *
 * This interface defines the structure of the computed summary,
 * which is returned by the `summarise` action and not persistently stored
 * within this concept.
 */
interface BreakthroughSummaryData {
  numberOfBreakthroughs: number;
  averageDuration: number; // in minutes
}

export default class BreakThroughTrackingConcept {
  private breakthroughs: Collection<Breakthrough>;

  constructor(private readonly db: Db) {
    this.breakthroughs = this.db.collection(PREFIX + "breakthroughs");
  }

  // --- Helper Methods ---

  /**
   * Calculates the duration between two Date objects in minutes.
   * @param start The start Date.
   * @param end The end Date.
   * @returns The duration in minutes, or null if end is before start.
   */
  private calculateDuration(start: Date, end: Date): number | null {
    if (end < start) {
      return null;
    }
    // Convert milliseconds to minutes
    return (end.getTime() - start.getTime()) / (1000 * 60);
  }

  /**
   * Checks for overlapping breakthroughs for a given user within a month.
   * An overlap occurs if the `checkRange` ([checkStart, checkEnd]) intersects with any existing breakthrough.
   *
   * @param userId The ID of the user.
   * @param monthId The ID of the month ("YYYY-MM").
   * @param checkStart The start time of the period to check for overlap.
   * @param checkEnd The end time of the period to check for overlap (null if the period is ongoing).
   * @param excludePainId If provided, this specific breakthrough ID will be excluded from the overlap check
   *                      (useful when editing an existing breakthrough).
   * @returns `true` if an overlap is found, `false` otherwise.
   */
  private async checkForOverlap(
    userId: User,
    monthId: MonthString,
    checkStart: Date,
    checkEnd: Date | null,
    excludePainId: BreakthroughID | null = null,
  ): Promise<boolean> {
    const query: any = {
      userId: userId,
      monthId: monthId,
    };

    if (excludePainId) {
      query._id = { $ne: excludePainId };
    }

    // A breakthrough 'A' ([A_start, A_end]) overlaps with 'B' ([B_start, B_end]) if:
    // (A_start <= B_end AND A_end >= B_start)
    // For ongoing breakthroughs (endTime: null), A_end is considered "infinity".

    if (checkEnd === null) {
      // Case: Checking for overlap with a new, ongoing breakthrough starting at checkStart.
      // Overlap if:
      // 1. Another ongoing breakthrough exists (endTime: null) for the user.
      // 2. The `checkStart` falls within an existing completed breakthrough [s, e] (s <= checkStart <= e).
      query.$or = [
        { endTime: null }, // Another ongoing breakthrough already exists
        { startTime: { $lte: checkStart }, endTime: { $gte: checkStart } }, // checkStart within a completed one
      ];
    } else {
      // Case: Checking for overlap with a breakthrough that has a defined end time ([checkStart, checkEnd]).
      // Overlap if:
      // 1. An existing ongoing breakthrough [s, infinity] overlaps [checkStart, checkEnd]
      //    (i.e., s <= checkEnd).
      // 2. An existing completed breakthrough [s, e] overlaps with [checkStart, checkEnd]
      //    (i.e., s <= checkEnd AND e >= checkStart).
      query.$or = [
        { endTime: null, startTime: { $lte: checkEnd } }, // Ongoing breakthrough overlaps with the new range
        { startTime: { $lte: checkEnd }, endTime: { $gte: checkStart } }, // Completed breakthrough overlaps
      ];
    }

    const overlappingPain = await this.breakthroughs.findOne(query);
    return !!overlappingPain;
  }

  // --- Actions ---

  /**
   * startBreakthrough(user: User, startTime: DateTime, month: Month): (pain: Breakthrough)
   *
   * requires: No overlapping Breakthrough exists for the same User and time range.
   *           Specifically, the user must not have an active (ongoing) breakthrough,
   *           and the startTime must not fall within any existing completed breakthrough for that user in that month.
   * effects: Creates and returns a new Breakthrough pain event associated with the Month.
   */
  async startBreakthrough(
    { user, startTime, month }: {
      user: User;
      startTime: Date;
      month: MonthString;
    },
  ): Promise<{ pain: Breakthrough } | { error: string }> {
    // Validate startTime
    if (isNaN(startTime.getTime())) {
      return {
        error: "Invalid startTime provided. Must be a valid Date object.",
      };
    }

    // Check for overlap: This new breakthrough starts at `startTime` and is ongoing (endTime is null).
    // We need to ensure no active breakthrough exists for the user, and `startTime` does not fall
    // within a completed one.
    const hasOverlap = await this.checkForOverlap(
      user,
      month,
      startTime,
      null, // Check for ongoing or overlaps with completed for a new starting event
    );
    if (hasOverlap) {
      return {
        error:
          "An overlapping breakthrough already exists or is ongoing for this user in this month.",
      };
    }

    const newPain: Breakthrough = {
      _id: freshID(),
      userId: user,
      monthId: month,
      startTime: startTime,
      endTime: null,
      duration: null,
    };

    await this.breakthroughs.insertOne(newPain);
    return { pain: newPain };
  }

  /**
   * endBreakthrough(user: User, pain: Breakthrough, endTime: DateTime): (pain: Breakthrough)
   *
   * requires: The Breakthrough has a Start time and belongs to the User.
   *           The provided endTime must be a valid date and must be after the breakthrough's startTime.
   * effects: Sets the End time, computes Duration, and returns the completed Breakthrough.
   */
  async endBreakthrough(
    { user, pain, endTime }: {
      user: User;
      pain: BreakthroughID;
      endTime: Date;
    },
  ): Promise<{ pain: Breakthrough } | { error: string }> {
    // Validate endTime
    if (isNaN(endTime.getTime())) {
      return {
        error: "Invalid endTime provided. Must be a valid Date object.",
      };
    }

    const existingPain = await this.breakthroughs.findOne({
      _id: pain,
      userId: user,
    });

    if (!existingPain) {
      return {
        error: "Breakthrough not found or does not belong to the user.",
      };
    }
    if (existingPain.endTime !== null) {
      return { error: "Breakthrough already has an end time." };
    }
    if (endTime < existingPain.startTime) {
      return { error: "End time cannot be before start time." };
    }

    const duration = this.calculateDuration(existingPain.startTime, endTime);

    const updateResult = await this.breakthroughs.findOneAndUpdate(
      { _id: pain, userId: user },
      { $set: { endTime: endTime, duration: duration } },
      { returnDocument: "after" }, // Return the updated document
    );

    return updateResult
      ? { pain: updateResult }
      : { error: "Failed to update breakthrough." };
  }

  /**
   * editBreakthrough(user: User, pain: Breakthrough, newStart: DateTime, newEnd: DateTime): (pain: Breakthrough)
   *
   * requires: The Breakthrough exists for the User.
   *           `newEnd` must be after `newStart`.
   *           The updated breakthrough must not overlap with any other breakthroughs for the same user in the same month.
   * effects: Updates the Start/End times, recomputes Duration, and returns the updated Breakthrough.
   */
  async editBreakthrough(
    { user, pain, newStart, newEnd }: {
      user: User;
      pain: BreakthroughID;
      newStart: Date;
      newEnd: Date;
    },
  ): Promise<{ pain: Breakthrough } | { error: string }> {
    // Validate dates
    if (isNaN(newStart.getTime()) || isNaN(newEnd.getTime())) {
      return {
        error:
          "Invalid newStart or newEnd time provided. Must be valid Date objects.",
      };
    }
    if (newEnd < newStart) {
      return { error: "newEnd time cannot be before newStart time." };
    }

    const existingPain = await this.breakthroughs.findOne({
      _id: pain,
      userId: user,
    });

    if (!existingPain) {
      return {
        error: "Breakthrough not found or does not belong to the user.",
      };
    }

    // Check for overlap with *other* breakthroughs, explicitly excluding the one being edited itself.
    const hasOverlap = await this.checkForOverlap(
      user,
      existingPain.monthId, // Use the monthId of the existing breakthrough
      newStart,
      newEnd,
      pain, // Exclude the current pain event from the overlap check
    );

    if (hasOverlap) {
      return {
        error:
          "Edited breakthrough overlaps with another existing breakthrough for this user in this month.",
      };
    }

    const newDuration = this.calculateDuration(newStart, newEnd);

    const updateResult = await this.breakthroughs.findOneAndUpdate(
      { _id: pain, userId: user },
      { $set: { startTime: newStart, endTime: newEnd, duration: newDuration } },
      { returnDocument: "after" },
    );

    return updateResult
      ? { pain: updateResult }
      : { error: "Failed to update breakthrough." };
  }

  /**
   * deleteBreakthrough(user: User, pain: Breakthrough)
   *
   * requires: The Breakthrough exists for the User.
   * effects: Removes the Breakthrough from the associated Month.
   */
  async deleteBreakthrough(
    { user, pain }: { user: User; pain: BreakthroughID },
  ): Promise<Empty | { error: string }> {
    const deleteResult = await this.breakthroughs.deleteOne({
      _id: pain,
      userId: user,
    });

    if (deleteResult.deletedCount === 0) {
      return {
        error: "Breakthrough not found or does not belong to the user.",
      };
    }

    return {};
  }

  /**
   * summarise(user: User, month: Month, avgDuration: Number, frequency: Number): (summary: String)
   *
   * effects: Returns a summary String with the frequency and average duration for the Month for the specified user.
   *          The average duration and frequency are also returned as explicit numerical values.
   */
  async summarise(
    { user, month }: { user: User; month: MonthString },
  ): Promise<{ summary: string; avgDuration: number; frequency: number }> {
    const userBreakthroughs = await this.breakthroughs.find({
      userId: user,
      monthId: month,
    }).toArray();

    // Only consider completed breakthroughs with valid durations for summary
    const completedBreakthroughs = userBreakthroughs.filter((b) =>
      b.endTime !== null && b.duration !== null
    );

    const numberOfBreakthroughs = completedBreakthroughs.length;
    let totalDuration = 0;

    if (numberOfBreakthroughs > 0) {
      totalDuration = completedBreakthroughs.reduce(
        (sum, b) => sum + (b.duration as number),
        0,
      );
    }
    const averageDuration = numberOfBreakthroughs > 0
      ? totalDuration / numberOfBreakthroughs
      : 0;

    const summaryString =
      `Summary for ${user} in ${month}: ${numberOfBreakthroughs} breakthrough(s) with an average duration of ${
        averageDuration.toFixed(2)
      } minutes.`;

    return {
      summary: summaryString,
      avgDuration: averageDuration,
      frequency: numberOfBreakthroughs,
    };
  }
}

```
