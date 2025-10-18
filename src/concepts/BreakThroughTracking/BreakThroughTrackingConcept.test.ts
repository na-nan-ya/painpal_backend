import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import BreakThroughTrackingConcept from "./BreakThroughTrackingConcept.ts";

// Define user and month IDs for testing
const userA = "user:Alice" as ID;
const userB = "user:Bob" as ID;
const monthIdOct2023 = "2023-10";
const monthIdNov2023 = "2023-11";
const monthIdDec2023 = "2023-12"; // For testing empty summary

// Helper for creating UTC Date objects easily for consistent testing across timezones.
// Month is 1-indexed (e.g., 10 for October).
const createDate = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number = 0,
): Date => {
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
};

// Helper to shorten Breakthrough IDs for more readable console output
const shortId = (id: ID | null | undefined): string => {
  if (!id) return "N/A";
  const idStr = id.toString();
  // MongoDB ObjectIds are 24 hex characters, so last 6 or 8 is usually enough
  return idStr.substring(idStr.length - 6);
};

Deno.test("BreakThroughTrackingConcept: Principle - Track, edit, and summarise breakthrough pain events", async () => {
  const [db, client] = await testDb();
  const concept = new BreakThroughTrackingConcept(db);

  console.group("Principle Trace: Breakthrough Pain Event Lifecycle");
  try {
    // # trace: Demonstrates how breakthrough pain events are tracked, edited, and summarised.

    console.log(
      "\n--- Step 1: UserA starts a breakthrough event (Pain #1) ---",
    );
    const startTime1 = createDate(2023, 10, 10, 9, 0); // Oct 10, 9:00 AM UTC
    const startResult1 = await concept.startBreakthrough({
      user: userA,
      startTime: startTime1,
      month: monthIdOct2023,
    });
    assertNotEquals(
      "error" in startResult1,
      true,
      `startBreakthrough 1 should succeed: ${
        (startResult1 as { error: string }).error
      }`,
    );
    const pain1 = (startResult1 as { pain: any }).pain;
    assertExists(pain1._id, "Pain event 1 should have an ID.");
    assertEquals(pain1.startTime, startTime1);
    assertEquals(
      pain1.endTime,
      null,
      "Pain event 1 should initially be ongoing.",
    );
    assertEquals(
      pain1.duration,
      null,
      "Pain event 1 should initially have null duration.",
    );
    console.log(
      `User ${userA} started Breakthrough #${
        shortId(pain1._id)
      } at ${pain1.startTime.toISOString()}. Status: Ongoing.`,
    );

    console.log(
      "\n--- Step 2: UserA ends the first breakthrough (Pain #1) ---",
    );
    const endTime1 = createDate(2023, 10, 10, 9, 30); // 30 minutes later
    const endResult1 = await concept.endBreakthrough({
      user: userA,
      pain: pain1._id,
      endTime: endTime1,
    });
    assertNotEquals(
      "error" in endResult1,
      true,
      `endBreakthrough 1 should succeed: ${
        (endResult1 as { error: string }).error
      }`,
    );
    const completedPain1 = (endResult1 as { pain: any }).pain;
    assertEquals(
      completedPain1.endTime,
      endTime1,
      "Pain event 1 endTime should be set.",
    );
    assertEquals(
      completedPain1.duration,
      30,
      "Duration for pain event 1 should be 30 minutes.",
    );
    console.log(
      `User ${userA} ended Breakthrough #${
        shortId(completedPain1._id)
      } at ${completedPain1.endTime.toISOString()}. Duration: ${completedPain1.duration} min.`,
    );

    console.log(
      "\n--- Step 3: UserA starts a second breakthrough (Pain #2) in the same month ---",
    );
    const startTime2 = createDate(2023, 10, 10, 10, 0); // Oct 10, 10:00 AM UTC
    const startResult2 = await concept.startBreakthrough({
      user: userA,
      startTime: startTime2,
      month: monthIdOct2023,
    });
    assertNotEquals(
      "error" in startResult2,
      true,
      `startBreakthrough 2 should succeed: ${
        (startResult2 as { error: string }).error
      }`,
    );
    const pain2 = (startResult2 as { pain: any }).pain;
    assertExists(pain2._id, "Pain event 2 should have an ID.");
    assertEquals(pain2.endTime, null, "Pain event 2 should be ongoing.");
    console.log(
      `User ${userA} started Breakthrough #${
        shortId(pain2._id)
      } at ${pain2.startTime.toISOString()}. Status: Ongoing.`,
    );

    console.log(
      "\n--- Step 4: UserA tries to start an overlapping breakthrough while Pain #2 is ongoing (expected to fail) ---",
    );
    const overlapStartTime = createDate(2023, 10, 10, 10, 15); // During pain2
    const overlapResult = await concept.startBreakthrough({
      user: userA,
      startTime: overlapStartTime,
      month: monthIdOct2023,
    });
    assertEquals(
      "error" in overlapResult,
      true,
      "Starting an overlapping breakthrough should fail.",
    );
    assertEquals(
      (overlapResult as { error: string }).error,
      "An overlapping breakthrough already exists or is ongoing for this user in this month.",
      "Overlap error message should be specific.",
    );
    console.log(
      `Attempt to start new breakthrough at ${overlapStartTime.toISOString()} failed as expected: ${
        (overlapResult as { error: string }).error
      }.`,
    );

    console.log(
      "\n--- Step 5: UserA ends the second breakthrough (Pain #2) ---",
    );
    const endTime2 = createDate(2023, 10, 10, 11, 0); // 60 minutes later
    const endResult2 = await concept.endBreakthrough({
      user: userA,
      pain: pain2._id,
      endTime: endTime2,
    });
    assertNotEquals(
      "error" in endResult2,
      true,
      `endBreakthrough 2 should succeed: ${
        (endResult2 as { error: string }).error
      }`,
    );
    const completedPain2 = (endResult2 as { pain: any }).pain;
    assertEquals(
      completedPain2.endTime,
      endTime2,
      "Pain event 2 endTime should be set.",
    );
    assertEquals(
      completedPain2.duration,
      60,
      "Duration for pain event 2 should be 60 minutes.",
    );
    console.log(
      `User ${userA} ended Breakthrough #${
        shortId(completedPain2._id)
      } at ${completedPain2.endTime.toISOString()}. Duration: ${completedPain2.duration} min.`,
    );

    console.log(
      "\n--- Step 6: UserA edits the first breakthrough (Pain #1) to a slightly different time range ---",
    );
    const newStartTime1 = createDate(2023, 10, 10, 8, 55); // 5 mins earlier
    const newEndTime1 = createDate(2023, 10, 10, 9, 25); // 5 mins earlier
    const editResult1 = await concept.editBreakthrough({
      user: userA,
      pain: pain1._id,
      newStart: newStartTime1,
      newEnd: newEndTime1,
    });
    assertNotEquals(
      "error" in editResult1,
      true,
      `editBreakthrough 1 should succeed: ${
        (editResult1 as { error: string }).error
      }`,
    );
    const editedPain1 = (editResult1 as { pain: any }).pain;
    assertEquals(
      editedPain1.startTime,
      newStartTime1,
      "Edited pain1 startTime should be updated.",
    );
    assertEquals(
      editedPain1.endTime,
      newEndTime1,
      "Edited pain1 endTime should be updated.",
    );
    assertEquals(
      editedPain1.duration,
      30, // 30 minutes (9:25 - 8:55)
      "Edited duration for pain event 1 should be recomputed to 30 minutes.",
    );
    console.log(
      `User ${userA} edited Breakthrough #${
        shortId(editedPain1._id)
      }. New range: ${editedPain1.startTime.toISOString()} - ${editedPain1.endTime.toISOString()}. New duration: ${editedPain1.duration} min.`,
    );

    console.log(
      "\n--- Step 7: UserB starts and ends a breakthrough (Pain #3) in the same month (Oct2023) ---",
    );
    const startTime_userB = createDate(2023, 10, 10, 9, 0);
    const endtime_userB = createDate(2023, 10, 10, 9, 45); // 45 minutes
    const startResult_userB = await concept.startBreakthrough({
      user: userB,
      startTime: startTime_userB,
      month: monthIdOct2023,
    });
    assertNotEquals(
      "error" in startResult_userB,
      true,
      "UserB start should succeed.",
    );
    const pain_userB = (startResult_userB as { pain: any }).pain;
    const endResult_userB = await concept.endBreakthrough({
      user: userB,
      pain: pain_userB._id,
      endTime: endtime_userB,
    });
    assertNotEquals(
      "error" in endResult_userB,
      true,
      "UserB end should succeed.",
    );
    const completedPain_userB = (endResult_userB as { pain: any }).pain;
    assertEquals(
      completedPain_userB.duration,
      45,
      "Duration for userB pain should be 45 minutes.",
    );
    console.log(
      `User ${userB} completed Breakthrough #${
        shortId(completedPain_userB._id)
      }. Duration: ${completedPain_userB.duration} min.`,
    );

    console.log(
      "\n--- Step 8: Summarise breakthrough events for UserA in October 2023 ---",
    );
    // Pain1 (edited): 30 min, Pain2: 60 min. Total 2 completed breakthroughs, sum duration 90 min. Avg: 45 min.
    const summaryUserAOct = await concept.summarise({
      user: userA,
      month: monthIdOct2023,
    });
    assertEquals(
      summaryUserAOct.frequency,
      2,
      "UserA Oct summary: frequency should be 2.",
    );
    assertEquals(
      summaryUserAOct.avgDuration,
      45,
      "UserA Oct summary: average duration should be 45.",
    ); // (30 + 60) / 2
    assertExists(summaryUserAOct.summary, "Summary string should exist.");
    console.log(
      `Summary for ${userA}, ${monthIdOct2023}: ${summaryUserAOct.summary}`,
    );

    console.log(
      "\n--- Step 9: UserA deletes the first breakthrough (Pain #1) ---",
    );
    const deleteResult1 = await concept.deleteBreakthrough({
      user: userA,
      pain: pain1._id,
    });
    assertEquals(
      "error" in deleteResult1,
      false,
      "Delete pain1 should succeed.",
    );
    console.log(`User ${userA} deleted Breakthrough #${shortId(pain1._id)}.`);

    console.log(
      "\n--- Step 10: Summarise again for UserA in October 2023 to verify deletion and updated summary ---",
    );
    // Only Pain2 (60 min) remains. Total 1 completed breakthrough, 60 min. Avg: 60 min.
    const summaryUserAOctAfterDelete = await concept.summarise({
      user: userA,
      month: monthIdOct2023,
    });
    assertEquals(
      summaryUserAOctAfterDelete.frequency,
      1,
      "UserA Oct summary after delete: frequency should be 1.",
    );
    assertEquals(
      summaryUserAOctAfterDelete.avgDuration,
      60,
      "UserA Oct summary after delete: average duration should be 60.",
    );
    console.log(
      `Summary for ${userA}, ${monthIdOct2023} after deletion: ${summaryUserAOctAfterDelete.summary}`,
    );

    console.log(
      "\n--- Step 11: Verify UserB's summary in Oct2023 is unaffected by UserA's actions ---",
    );
    const summaryUserBOct = await concept.summarise({
      user: userB,
      month: monthIdOct2023,
    });
    assertEquals(
      summaryUserBOct.frequency,
      1,
      "UserB Oct summary: frequency should still be 1.",
    );
    assertEquals(
      summaryUserBOct.avgDuration,
      45,
      "UserB Oct summary: average duration should still be 45.",
    );
    console.log(
      `Summary for ${userB}, ${monthIdOct2023}: ${summaryUserBOct.summary}`,
    );
  } finally {
    console.groupEnd(); // End of Principle Trace group
    await client.close();
  }
});

Deno.test("BreakThroughTrackingConcept: startBreakthrough requirements and effects", async () => {
  const [db, client] = await testDb();
  const concept = new BreakThroughTrackingConcept(db);

  try {
    // Setup: Create a completed breakthrough for userA in Oct2023
    const b1_start = createDate(2023, 10, 10, 9, 0);
    const b1_end = createDate(2023, 10, 10, 9, 30);
    const result1 = await concept.startBreakthrough({
      user: userA,
      startTime: b1_start,
      month: monthIdOct2023,
    });
    // Ensure setup steps succeed
    if ("error" in result1) {
      throw new Error(`Setup failed for b1: ${result1.error}`);
    }
    await concept.endBreakthrough({
      user: userA,
      pain: (result1 as { pain: any }).pain._id,
      endTime: b1_end,
    });

    // Create an ongoing breakthrough specifically for the overlap test cases
    const b_ongoing_for_overlap_test_start = createDate(
      2023,
      10,
      10,
      10,
      0,
    );
    const result_ongoing_for_overlap_test = await concept.startBreakthrough({
      user: userA,
      startTime: b_ongoing_for_overlap_test_start,
      month: monthIdOct2023,
    });
    if ("error" in result_ongoing_for_overlap_test) {
      throw new Error(
        `Setup failed for b_ongoing_for_overlap_test: ${result_ongoing_for_overlap_test.error}`,
      );
    }
    const b_ongoing_for_overlap_test_id = (result_ongoing_for_overlap_test as {
      pain: any;
    }).pain._id;

    // --- Requires: no overlapping Breakthrough exists for the same User and time range ---

    // Case 1: Try to start a breakthrough overlapping with an existing ongoing one.
    const overlap_ongoing_time = createDate(2023, 10, 10, 10, 15); // During b_ongoing_for_overlap_test
    const overlapResult1 = await concept.startBreakthrough({
      user: userA,
      startTime: overlap_ongoing_time,
      month: monthIdOct2023,
    });
    assertEquals(
      "error" in overlapResult1,
      true,
      "Should fail: cannot start a breakthrough overlapping with an ongoing one.",
    );
    assertEquals(
      (overlapResult1 as { error: string }).error,
      "An overlapping breakthrough already exists or is ongoing for this user in this month.",
    );

    // *FIX: End the ongoing breakthrough so subsequent "success" cases don't detect it as an overlap*
    const endOngoingOverlapTestResult = await concept.endBreakthrough({
      user: userA,
      pain: b_ongoing_for_overlap_test_id,
      endTime: createDate(2023, 10, 10, 11, 0), // End it before 12:00
    });
    if ("error" in endOngoingOverlapTestResult) {
      throw new Error(
        `Cleanup error for b_ongoing_for_overlap_test: ${endOngoingOverlapTestResult.error}`,
      );
    }

    // Case 2: Try to start a breakthrough whose startTime falls within an existing completed one.
    const overlap_existing_time = createDate(2023, 10, 10, 9, 15); // During b1 (9:00-9:30)
    const overlapResult2 = await concept.startBreakthrough({
      user: userA,
      startTime: overlap_existing_time,
      month: monthIdOct2023,
    });
    assertEquals(
      "error" in overlapResult2,
      true,
      "Should fail: cannot start a breakthrough whose startTime is within an existing completed one.",
    );
    assertEquals(
      (overlapResult2 as { error: string }).error,
      "An overlapping breakthrough already exists or is ongoing for this user in this month.",
    );

    // Case 3: Invalid startTime provided.
    const invalidStartTimeResult = await concept.startBreakthrough({
      user: userA,
      startTime: new Date("invalid date"),
      month: monthIdOct2023,
    });
    assertEquals(
      "error" in invalidStartTimeResult,
      true,
      "Should fail with an invalid startTime.",
    );
    assertEquals(
      (invalidStartTimeResult as { error: string }).error,
      "Invalid startTime provided. Must be a valid Date object.",
    );

    // --- Effects: Creates and returns a new Breakthrough pain event ---

    // Case 4: Successfully start a breakthrough with valid, non-overlapping times.
    const successStartTime = createDate(2023, 10, 10, 12, 0); // After all existing and now completed
    const successResult = await concept.startBreakthrough({
      user: userA,
      startTime: successStartTime,
      month: monthIdOct2023,
    });
    assertNotEquals(
      "error" in successResult,
      true,
      "Valid startBreakthrough should succeed.",
    );
    const newPain = (successResult as { pain: any }).pain;
    assertExists(newPain._id, "New breakthrough should have an ID.");
    assertEquals(newPain.userId, userA);
    assertEquals(newPain.monthId, monthIdOct2023);
    assertEquals(newPain.startTime, successStartTime);
    assertEquals(
      newPain.endTime,
      null,
      "New breakthrough should be ongoing (endTime null).",
    );
    assertEquals(
      newPain.duration,
      null,
      "New breakthrough should have null duration.",
    );

    // Clean up the newPain created in Case 4.
    const endNewPainResult = await concept.endBreakthrough({
      user: userA,
      pain: newPain._id,
      endTime: createDate(2023, 10, 10, 13, 0),
    });
    if ("error" in endNewPainResult) {
      throw new Error(`Cleanup error for newPain: ${endNewPainResult.error}`);
    }
  } finally {
    await client.close();
  }
});

Deno.test("BreakThroughTrackingConcept: endBreakthrough requirements and effects", async () => {
  const [db, client] = await testDb();
  const concept = new BreakThroughTrackingConcept(db);

  try {
    // Setup: Create a breakthrough that will be used for "already ended" case.
    // This needs to be started and ended first.
    const b_already_ended_start = createDate(2023, 10, 10, 10, 0);
    const b_already_ended_end = createDate(2023, 10, 10, 10, 30);
    const startResult_already_ended = await concept.startBreakthrough({
      user: userA,
      startTime: b_already_ended_start,
      month: monthIdOct2023,
    });
    // FIX: Check for error in setup step
    if ("error" in startResult_already_ended) {
      throw new Error(
        `Setup error for b_already_ended: ${startResult_already_ended.error}`,
      );
    }
    const b_already_ended_pain_id = (startResult_already_ended as {
      pain: any;
    }).pain._id;
    await concept.endBreakthrough({
      user: userA,
      pain: b_already_ended_pain_id,
      endTime: b_already_ended_end,
    });

    // Setup: Create a breakthrough that will be used for "successfully end" case.
    // Ensure it does not overlap with b_already_ended.
    const b_to_end_start = createDate(2023, 10, 10, 11, 0); // After b_already_ended
    const startResult_to_end = await concept.startBreakthrough({
      user: userA,
      startTime: b_to_end_start,
      month: monthIdOct2023,
    });
    if ("error" in startResult_to_end) {
      throw new Error(`Setup error for b_to_end: ${startResult_to_end.error}`);
    }
    const b_to_end_id = (startResult_to_end as { pain: any }).pain._id;

    // --- Requires: The Breakthrough has a Start time and belongs to the User ---

    // Case 1: Try to end a non-existent breakthrough.
    const nonExistentId = "pain:nonexistent" as ID;
    const endNonExistentResult = await concept.endBreakthrough({
      user: userA,
      pain: nonExistentId,
      endTime: createDate(2023, 10, 10, 9, 45),
    });
    assertEquals(
      "error" in endNonExistentResult,
      true,
      "Should fail for a non-existent breakthrough.",
    );
    assertEquals(
      (endNonExistentResult as { error: string }).error,
      "Breakthrough not found or does not belong to the user.",
    );

    // Case 2: Try to end a breakthrough that belongs to another user.
    const endOtherUserResult = await concept.endBreakthrough({
      user: userB, // Different user
      pain: b_to_end_id, // This pain belongs to userA
      endTime: createDate(2023, 10, 10, 11, 45),
    });
    assertEquals(
      "error" in endOtherUserResult,
      true,
      "Should fail for breakthrough belonging to another user.",
    );
    assertEquals(
      (endOtherUserResult as { error: string }).error,
      "Breakthrough not found or does not belong to the user.",
    );

    // Case 3: Try to end a breakthrough that already has an end time.
    const endAlreadyEndedResult = await concept.endBreakthrough({
      user: userA,
      pain: b_already_ended_pain_id,
      endTime: createDate(2023, 10, 10, 10, 45),
    });
    assertEquals(
      "error" in endAlreadyEndedResult,
      true,
      "Should fail for an already ended breakthrough.",
    );
    assertEquals(
      (endAlreadyEndedResult as { error: string }).error,
      "Breakthrough already has an end time.",
    );

    // Case 4: Try to end with an endTime that is before the breakthrough's startTime.
    // Use b_to_end_id which is still ongoing, and has startTime 11:00
    const endTimeBeforeStartResult = await concept.endBreakthrough({
      user: userA,
      pain: b_to_end_id,
      endTime: createDate(2023, 10, 10, 10, 45), // Before 11:00 start
    });
    assertEquals(
      "error" in endTimeBeforeStartResult,
      true,
      "Should fail if endTime is before startTime.",
    );
    assertEquals(
      (endTimeBeforeStartResult as { error: string }).error,
      "End time cannot be before start time.",
    );

    // Case 5: Invalid endTime provided.
    const invalidEndTimeResult = await concept.endBreakthrough({
      user: userA,
      pain: b_to_end_id,
      endTime: new Date("invalid date"),
    });
    assertEquals(
      "error" in invalidEndTimeResult,
      true,
      "Should fail with an invalid endTime.",
    );
    assertEquals(
      (invalidEndTimeResult as { error: string }).error,
      "Invalid endTime provided. Must be a valid Date object.",
    );

    // --- Effects: Sets the End time, computes Duration, and returns the completed Breakthrough ---

    // Case 6: Successfully end a breakthrough.
    const successEndTime = createDate(2023, 10, 10, 11, 45); // 45 minutes duration after 11:00 start
    const successResult = await concept.endBreakthrough({
      user: userA,
      pain: b_to_end_id,
      endTime: successEndTime,
    });
    assertNotEquals(
      "error" in successResult,
      true,
      "Valid endBreakthrough should succeed.",
    );
    const completedPain = (successResult as { pain: any }).pain;
    assertEquals(completedPain._id, b_to_end_id);
    assertEquals(
      completedPain.endTime,
      successEndTime,
      "endTime should be set.",
    );
    assertEquals(
      completedPain.duration,
      45,
      "Duration should be computed correctly (45 minutes).",
    );
  } finally {
    await client.close();
  }
});

Deno.test("BreakThroughTrackingConcept: editBreakthrough requirements and effects", async () => {
  const [db, client] = await testDb();
  const concept = new BreakThroughTrackingConcept(db);

  try {
    // Setup: Create two completed breakthroughs for userA in Oct2023
    const b_to_edit_start = createDate(2023, 10, 10, 9, 0);
    const b_to_edit_end = createDate(2023, 10, 10, 9, 30);
    const startResult1 = await concept.startBreakthrough({
      user: userA,
      startTime: b_to_edit_start,
      month: monthIdOct2023,
    });
    if ("error" in startResult1) {
      throw new Error(`Setup error for b_to_edit: ${startResult1.error}`);
    }
    const b_to_edit_id = (startResult1 as { pain: any }).pain._id;
    await concept.endBreakthrough({
      user: userA,
      pain: b_to_edit_id,
      endTime: b_to_edit_end,
    });

    const b_other_start = createDate(2023, 10, 10, 10, 0);
    const b_other_end = createDate(2023, 10, 10, 10, 30);
    const startResult2 = await concept.startBreakthrough({
      user: userA,
      startTime: b_other_start,
      month: monthIdOct2023,
    });
    if ("error" in startResult2) {
      throw new Error(`Setup error for b_other: ${startResult2.error}`);
    }
    const b_other_id = (startResult2 as { pain: any }).pain._id;
    await concept.endBreakthrough({
      user: userA,
      pain: b_other_id,
      endTime: b_other_end,
    });

    // --- Requires: The Breakthrough exists for the User ---

    // Case 1: Try to edit a non-existent breakthrough.
    const nonExistentId = "pain:nonexistent" as ID;
    const editNonExistentResult = await concept.editBreakthrough({
      user: userA,
      pain: nonExistentId,
      newStart: createDate(2023, 10, 10, 8, 0),
      newEnd: createDate(2023, 10, 10, 8, 30),
    });
    assertEquals(
      "error" in editNonExistentResult,
      true,
      "Should fail for a non-existent breakthrough.",
    );
    assertEquals(
      (editNonExistentResult as { error: string }).error,
      "Breakthrough not found or does not belong to the user.",
    );

    // Case 2: Try to edit a breakthrough that belongs to another user.
    const editOtherUserResult = await concept.editBreakthrough({
      user: userB, // Different user
      pain: b_to_edit_id,
      newStart: createDate(2023, 10, 10, 8, 0),
      newEnd: createDate(2023, 10, 10, 8, 30),
    });
    assertEquals(
      "error" in editOtherUserResult,
      true,
      "Should fail for breakthrough belonging to another user.",
    );
    assertEquals(
      (editOtherUserResult as { error: string }).error,
      "Breakthrough not found or does not belong to the user.",
    );

    // --- Requires: newEnd must be after newStart ---

    // Case 3: Try to edit with newEnd before newStart.
    const newEndBeforeStartResult = await concept.editBreakthrough({
      user: userA,
      pain: b_to_edit_id,
      newStart: createDate(2023, 10, 10, 9, 30),
      newEnd: createDate(2023, 10, 10, 9, 0),
    });
    assertEquals(
      "error" in newEndBeforeStartResult,
      true,
      "Should fail if newEnd is before newStart.",
    );
    assertEquals(
      (newEndBeforeStartResult as { error: string }).error,
      "newEnd time cannot be before newStart time.",
    );

    // Case 4: Invalid newStart or newEnd dates provided.
    const invalidDatesResult = await concept.editBreakthrough({
      user: userA,
      pain: b_to_edit_id,
      newStart: new Date("invalid date"),
      newEnd: createDate(2023, 10, 10, 9, 0),
    });
    assertEquals(
      "error" in invalidDatesResult,
      true,
      "Should fail with invalid dates.",
    );
    assertEquals(
      (invalidDatesResult as { error: string }).error,
      "Invalid newStart or newEnd time provided. Must be valid Date objects.",
    );

    // --- Requires: The updated breakthrough must not overlap with any other breakthroughs ---

    // Case 5: Try to edit the breakthrough to overlap with 'b_other'.
    const overlapEditResult = await concept.editBreakthrough({
      user: userA,
      pain: b_to_edit_id,
      newStart: createDate(2023, 10, 10, 10, 15), // Overlaps with b_other (10:00-10:30)
      newEnd: createDate(2023, 10, 10, 10, 45),
    });
    assertEquals(
      "error" in overlapEditResult,
      true,
      "Should fail due to overlap with another breakthrough.",
    );
    assertEquals(
      (overlapEditResult as { error: string }).error,
      "Edited breakthrough overlaps with another existing breakthrough for this user in this month.",
    );

    // --- Effects: Updates the Start/End times, recomputes Duration, and returns the updated Breakthrough ---

    // Case 6: Successfully edit a breakthrough with valid, non-overlapping times.
    const successNewStart = createDate(2023, 10, 10, 8, 45); // Earlier
    const successNewEnd = createDate(2023, 10, 10, 9, 45); // Later
    const successEditResult = await concept.editBreakthrough({
      user: userA,
      pain: b_to_edit_id,
      newStart: successNewStart,
      newEnd: successNewEnd,
    });
    assertNotEquals(
      "error" in successEditResult,
      true,
      "Valid editBreakthrough should succeed.",
    );
    const editedPain = (successEditResult as { pain: any }).pain;
    assertEquals(editedPain._id, b_to_edit_id);
    assertEquals(
      editedPain.startTime,
      successNewStart,
      "startTime should be updated.",
    );
    assertEquals(
      editedPain.endTime,
      successNewEnd,
      "endTime should be updated.",
    );
    assertEquals(
      editedPain.duration,
      60,
      "Duration should be recomputed correctly (60 minutes).",
    );
  } finally {
    await client.close();
  }
});

Deno.test("BreakThroughTrackingConcept: deleteBreakthrough requirements and effects", async () => {
  const [db, client] = await testDb();
  const concept = new BreakThroughTrackingConcept(db);

  try {
    // Setup: Create a breakthrough for userA to delete
    const b_to_delete_start = createDate(2023, 10, 10, 9, 0);
    const startResult = await concept.startBreakthrough({
      user: userA,
      startTime: b_to_delete_start,
      month: monthIdOct2023,
    });
    if ("error" in startResult) {
      throw new Error(`Setup error for b_to_delete: ${startResult.error}`);
    }
    const b_to_delete_id = (startResult as { pain: any }).pain._id;
    await concept.endBreakthrough({
      user: userA,
      pain: b_to_delete_id,
      endTime: createDate(2023, 10, 10, 9, 30),
    });

    // --- Requires: The Breakthrough exists for the User ---

    // Case 1: Try to delete a non-existent breakthrough.
    const nonExistentId = "pain:nonexistent" as ID;
    const deleteNonExistentResult = await concept.deleteBreakthrough({
      user: userA,
      pain: nonExistentId,
    });
    assertEquals(
      "error" in deleteNonExistentResult,
      true,
      "Should fail for a non-existent breakthrough.",
    );
    assertEquals(
      (deleteNonExistentResult as { error: string }).error,
      "Breakthrough not found or does not belong to the user.",
    );

    // Case 2: Try to delete a breakthrough that belongs to another user.
    const deleteOtherUserResult = await concept.deleteBreakthrough({
      user: userB, // Different user
      pain: b_to_delete_id,
    });
    assertEquals(
      "error" in deleteOtherUserResult,
      true,
      "Should fail for breakthrough belonging to another user.",
    );
    assertEquals(
      (deleteOtherUserResult as { error: string }).error,
      "Breakthrough not found or does not belong to the user.",
    );

    // --- Effects: Removes the Breakthrough from the associated Month ---

    // Case 3: Successfully delete a breakthrough.
    const successDeleteResult = await concept.deleteBreakthrough({
      user: userA,
      pain: b_to_delete_id,
    });
    assertEquals(
      "error" in successDeleteResult,
      false,
      "Valid deleteBreakthrough should succeed.",
    );

    // Verify deletion by attempting to summarise (should now show 0 breakthroughs for this user/month)
    const summaryAfterDelete = await concept.summarise({
      user: userA,
      month: monthIdOct2023,
    });
    assertEquals(
      summaryAfterDelete.frequency,
      0,
      "Frequency should be 0 after deleting the only breakthrough.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("BreakThroughTrackingConcept: summarise effects", async () => {
  const [db, client] = await testDb();
  const concept = new BreakThroughTrackingConcept(db);

  try {
    // Setup: Populate data for multiple users and months
    // UserA, Oct2023:
    // b1: 9:00-9:30 (30 min)
    // b2: 10:00-11:00 (60 min)
    // b_ongoing: 12:00 (not ended yet, should NOT count towards summary)
    const b1_start = createDate(2023, 10, 10, 9, 0);
    const b1_end = createDate(2023, 10, 10, 9, 30);
    const startRes1 = await concept.startBreakthrough({
      user: userA,
      startTime: b1_start,
      month: monthIdOct2023,
    });
    if ("error" in startRes1) {
      throw new Error(`Setup error: ${startRes1.error}`);
    }
    await concept.endBreakthrough({
      user: userA,
      pain: (startRes1 as { pain: any }).pain._id,
      endTime: b1_end,
    });

    const b2_start = createDate(2023, 10, 10, 10, 0);
    const b2_end = createDate(2023, 10, 10, 11, 0);
    const startRes2 = await concept.startBreakthrough({
      user: userA,
      startTime: b2_start,
      month: monthIdOct2023,
    });
    if ("error" in startRes2) {
      throw new Error(`Setup error: ${startRes2.error}`);
    }
    await concept.endBreakthrough({
      user: userA,
      pain: (startRes2 as { pain: any }).pain._id,
      endTime: b2_end,
    });

    const b_ongoing_start = createDate(2023, 10, 10, 12, 0);
    const startResOngoing = await concept.startBreakthrough({
      user: userA,
      startTime: b_ongoing_start,
      month: monthIdOct2023,
    });
    if ("error" in startResOngoing) {
      throw new Error(`Setup error: ${startResOngoing.error}`);
    }
    const b_ongoing_id = (startResOngoing as { pain: any }).pain._id; // Store ID to clean up later

    // UserB, Oct2023:
    // b_userB: 9:00-9:15 (15 min)
    const b_userB_start = createDate(2023, 10, 10, 9, 0);
    const b_userB_end = createDate(2023, 10, 10, 9, 15);
    const startResUserB = await concept.startBreakthrough({
      user: userB,
      startTime: b_userB_start,
      month: monthIdOct2023,
    });
    if ("error" in startResUserB) {
      throw new Error(`Setup error: ${startResUserB.error}`);
    }
    await concept.endBreakthrough({
      user: userB,
      pain: (startResUserB as { pain: any }).pain._id,
      endTime: b_userB_end,
    });

    // UserA, Nov2023:
    // b_nov: 9:00-9:30 (30 min)
    const b_nov_start = createDate(2023, 11, 10, 9, 0);
    const b_nov_end = createDate(2023, 11, 10, 9, 30);
    const startResNov = await concept.startBreakthrough({
      user: userA,
      startTime: b_nov_start,
      month: monthIdNov2023,
    });
    if ("error" in startResNov) {
      throw new Error(`Setup error: ${startResNov.error}`);
    }
    await concept.endBreakthrough({
      user: userA,
      pain: (startResNov as { pain: any }).pain._id,
      endTime: b_nov_end,
    });

    // --- Effects: Returns a summary String with the frequency and average duration ---

    // Case 1: Summarise userA for Oct2023
    // (b1: 30 min, b2: 60 min. The ongoing breakthrough 'b_ongoing' is correctly ignored for calculations.)
    const summaryUserAOct = await concept.summarise({
      user: userA,
      month: monthIdOct2023,
    });
    assertEquals(
      summaryUserAOct.frequency,
      2,
      "UserA Oct frequency should be 2 (completed breakthroughs).",
    );
    assertEquals(
      summaryUserAOct.avgDuration,
      45,
      "UserA Oct average duration should be (30+60)/2 = 45 minutes.",
    );
    assertEquals(
      summaryUserAOct.summary,
      "Summary for user:Alice in 2023-10: 2 breakthrough(s) with an average duration of 45.00 minutes.",
      "Summary string for UserA Oct should match.",
    );

    // Case 2: Summarise userB for Oct2023 (separate user, separate data)
    // (b_userB: 15 min)
    const summaryUserBOct = await concept.summarise({
      user: userB,
      month: monthIdOct2023,
    });
    assertEquals(
      summaryUserBOct.frequency,
      1,
      "UserB Oct frequency should be 1.",
    );
    assertEquals(
      summaryUserBOct.avgDuration,
      15,
      "UserB Oct average duration should be 15 minutes.",
    );
    assertEquals(
      summaryUserBOct.summary,
      "Summary for user:Bob in 2023-10: 1 breakthrough(s) with an average duration of 15.00 minutes.",
      "Summary string for UserB Oct should match.",
    );

    // Case 3: Summarise userA for Nov2023 (separate month for same user)
    // (b_nov: 30 min)
    const summaryUserANov = await concept.summarise({
      user: userA,
      month: monthIdNov2023,
    });
    assertEquals(
      summaryUserANov.frequency,
      1,
      "UserA Nov frequency should be 1.",
    );
    assertEquals(
      summaryUserANov.avgDuration,
      30,
      "UserA Nov average duration should be 30 minutes.",
    );
    assertEquals(
      summaryUserANov.summary,
      "Summary for user:Alice in 2023-11: 1 breakthrough(s) with an average duration of 30.00 minutes.",
      "Summary string for UserA Nov should match.",
    );

    // Case 4: Summarise for a month with no breakthroughs for the user.
    const summaryEmptyMonth = await concept.summarise({
      user: userA,
      month: monthIdDec2023, // No breakthroughs recorded for this month
    });
    assertEquals(
      summaryEmptyMonth.frequency,
      0,
      "Empty month frequency should be 0.",
    );
    assertEquals(
      summaryEmptyMonth.avgDuration,
      0,
      "Empty month average duration should be 0.",
    );
    assertEquals(
      summaryEmptyMonth.summary,
      "Summary for user:Alice in 2023-12: 0 breakthrough(s) with an average duration of 0.00 minutes.",
      "Summary string for empty month should match.",
    );

    // Cleanup the ongoing breakthrough to prevent state leakage to other tests (though testDb should handle this).
    await concept.endBreakthrough({
      user: userA,
      pain: b_ongoing_id,
      endTime: createDate(2023, 10, 10, 12, 30),
    });
  } finally {
    await client.close();
  }
});
