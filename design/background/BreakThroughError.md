BreakThroughTrackingConcept: startBreakthrough requirements and effects => ./src/concepts/BreakThroughTracking/BreakThroughTrackingConcept.test.ts:310:6 
error: AssertionError: Expected actual: true not to be: true: Valid startBreakthrough should succeed.
  throw new AssertionError(
        ^
    at assertNotEquals (https://jsr.io/@std/assert/1.0.15/not_equals.ts:34:9)
    at file:///Users/ananyaganesh/painpal_backend/src/concepts/BreakThroughTracking/BreakThroughTrackingConcept.test.ts:398:5

BreakThroughTrackingConcept: endBreakthrough requirements and effects => ./src/concepts/BreakThroughTracking/BreakThroughTrackingConcept.test.ts:435:6
error: TypeError: Cannot read properties of undefined (reading '_id')
      pain: b_already_ended_pain._id,
                                 ^
    at file:///Users/ananyaganesh/painpal_backend/src/concepts/BreakThroughTracking/BreakThroughTrackingConcept.test.ts:460:34
  )