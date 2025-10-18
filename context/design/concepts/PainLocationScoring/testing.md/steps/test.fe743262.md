---
timestamp: 'Fri Oct 17 2025 20:48:25 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_204825.e9ab5c44.md]]'
content_id: fe743262e6e662bcf191d200772123cbcff9646d342cd5dcc79676d5077b39c9
---

# test: PainLocationScoring

You are given an example Deno test suite for a LikertSurvey concept implementation. Use it as a model for structure, phrasing, and best practices, including:

* Top-level lifecycle “Principle” tests.
* Smaller “Action” tests for requirement enforcement.
* Use of `testDb()` for MongoDB isolation.
* Assertions (`assertEquals`, `assertNotEquals`, etc.).
* Clean test isolation via `client.close()` in a `finally` block.

Now, write a **complete Deno test suite for PainLocationScoring**. Expectations:

* Follow the LikertSurvey test suite’s structure.
* Include a top-level **“Principle” test** that walks through the expected lifecycle: a user with a map → add a region → score the region → delete the region → verify state at each step.
* Include **smaller “Action” tests** for edge cases, e.g.:
  * Adding the same region twice.
  * Scoring a region that does not exist.
  * Scoring out of bounds (e.g., 0 or 11).
  * Deleting a non-existent region.
* Assume that a valid body map has already been created externally (e.g., by BodyMapGeneration) and is provided as an argument to all actions. The concept itself does **not** create maps but should still validate that the map exists.
* Use the same import style as the LikertSurvey suite.
* Print helpful console messages for inputs, outputs, and verification steps.
* End each test with `await client.close()` in a `finally` block.
* Ensure tests are **fully programmatic**—all passes/fails are determined by assertions, no human interpretation needed.
