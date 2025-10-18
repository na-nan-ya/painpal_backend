---
timestamp: 'Fri Oct 17 2025 22:43:03 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_224303.7cc02bdd.md]]'
content_id: d32b86d8e5a417a9bac41a6e3f6aa1ffaf679c868225c0b0aba3c521fe102a41
---

# prompt: Fix this error in the BodyMapGeneration test suite.

BodyMapGeneration => ./src/concepts/BodyMapGeneration/BodyMapGeneration.test.ts:743:6
error: Leaks detected:

* A TLS connection was opened/accepted during the test, but not closed during the test. Close the TLS connection by calling `tlsConn.close()`.
* An async call to op\_read was started in this test, but never completed.
