---
timestamp: 'Fri Oct 17 2025 19:08:42 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_190842.6c0e6c32.md]]'
content_id: 703f475d31c793abc1999b25f2060fa6e73fca9e6f4710f138dd4af296763966
---

# prompt: You are given an example Deno test suite for a LikertSurvey concept implementation. Use it as a model for how to structure and phrase tests — including the principles, action requirements, use of testDb(), assertions (assertEquals, assertNotEquals, etc.), and clean test isolation via client.close().Now, write a complete Deno test suite for the given BodyMapGeneration implementation. Expectations:

* Follow the LikertSurvey test suite’s structure.
* Include a top-level “Principle” test that walks through the lifecycle: user creation → map generation → saving → retrieval → deletion.
* Include smaller “Action” tests for requirements (e.g., generating map twice in one day should fail, saving a map without a user should fail, etc.).
* Use the same import style
* End each test with await client.close() in a finally block.
