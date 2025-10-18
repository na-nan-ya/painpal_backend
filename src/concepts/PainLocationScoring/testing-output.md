PainLocationScoring ...
  Principle: Add region → score region → delete region → verify state at each step ...
------- post-test output -------

--- Principle: PainLocationScoring Lifecycle ---
  Setup: Generating map for user 'user:Alice'. Friendly ID: 'Map-1'
  Setup: Registered map 'Map-1' with PainLocationScoring.
  Output: Map 'Map-1' created for user 'user:Alice'.

  Principle: Adding region 'Left Knee' to map 'Map-1' for user 'user:Alice'.
  Output: New region created with friendly ID: 'Left Knee'.

  Principle: Verifying region 'Left Knee' was added to map 'Map-1'.
  Verification: Region 'Left Knee' successfully added to map 'Map-1'.

  Principle: Scoring region 'Left Knee' with value 7 for user 'user:Alice'.
  Output: Region 'Left Knee' scored with 7.

  Principle: Verifying score for region 'Left Knee'.
  Verification: Region 'Left Knee' now has score 7.

  Principle: Deleting region 'Left Knee' for user 'user:Alice'.
  Output: Region 'Left Knee' deleted.

  Principle: Verifying region 'Left Knee' is deleted from map 'Map-1'.
  Verification: Region 'Left Knee' successfully deleted from map 'Map-1'.
--- Principle: PainLocationScoring Lifecycle Complete ---

----- post-test output end -----

  Principle: Add region → score region → delete region → verify state at each step ... ok (1s)
  Action: addRegion requirements and effects ...

------- post-test output -------

--- Action: addRegion Tests Start ---
  Setup: Initializing maps for user 'user:Alice' and user 'user:Bob'.
  Setup: Generating map for user 'user:Alice'. Friendly ID: 'Map-2'
  Setup: Registered map 'Map-2' with PainLocationScoring.
  Setup: Generating map for user 'user:Bob'. Friendly ID: 'Map-3'
  Setup: Registered map 'Map-3' with PainLocationScoring.
  Output: Map 'Map-2' for 'user:Alice', Map 'Map-3' for 'user:Bob'.

  Action: User 'user:Alice' attempts to add region to non-existent map 'map:nonexistent'.
  Output: Error received: 'Map 'map:nonexistent' not found for user 'user:Alice' or user does not own it.' (Expected)

  Action: User 'user:Alice' attempts to add region to map 'Map-3' owned by 'user:Bob'.
  Output: Error received: 'Map '0199f55c-d16f-717b-b0bb-5923589fed95' not found for user 'user:Alice' or user does not own it.' (Expected)

  Action: User 'user:Alice' successfully adding region 'Right Shoulder' to their map 'Map-2'.
  Output: New region created with friendly ID: 'Right Shoulder'.

  Verification: Checking if region 'Right Shoulder' exists in map 'Map-2'.
  Verification: Region 'Right Shoulder' confirmed in map 'Map-2'.
--- Action: addRegion Tests End ---
----- post-test output end -----

  Action: addRegion requirements and effects ... ok (1s)
  Action: scoreRegion requirements and effects ...
------- post-test output -------

--- Action: scoreRegion Tests Start ---
  Setup: Initializing maps for user 'user:Alice' and user 'user:Bob'.
  Setup: Generating map for user 'user:Alice'. Friendly ID: 'Map-4'
  Setup: Registered map 'Map-4' with PainLocationScoring.
  Setup: Generating map for user 'user:Bob'. Friendly ID: 'Map-5'
  Setup: Registered map 'Map-5' with PainLocationScoring.
  Setup: Added region 'Forehead' to map 'Map-4' for user 'user:Alice'.
  Setup: Added region 'Left Ankle' to map 'Map-5' for user 'user:Bob'.

  Action: User 'user:Alice' attempts to score non-existent region 'region:ghost'.
  Output: Error received: 'Region 'region:ghost' not found or not owned by user 'user:Alice'.' (Expected)

  Action: User 'user:Alice' attempts to score region 'Left Ankle' owned by 'user:Bob'.
  Output: Error received: 'Region '0199f55c-d5f4-759c-8fb3-01065ffc77bd' not found or not owned by user 'user:Alice'.' (Expected)

  Action: User 'user:Alice' attempts to score region 'Forehead' with value 0 (below min).
  Output: Error received: 'Score must be a number between 1 and 10.' (Expected)

  Action: User 'user:Alice' attempts to score region 'Forehead' with value 11 (above max).
  Output: Error received: 'Score must be a number between 1 and 10.' (Expected)

  Action: User 'user:Alice' successfully scoring region 'Forehead' with value 6.
  Output: Score updated for region 'Forehead'.

  Verification: Checking score for region 'Forehead'.
  Verification: Region 'Forehead' confirmed with score 6.

  Action: User 'user:Alice' updating score for region 'Forehead' to 9.
  Output: Score updated for region 'Forehead'.

  Verification: Checking updated score for region 'Forehead'.
  Verification: Region 'Forehead' confirmed updated to score 9.
--- Action: scoreRegion Tests End ---
----- post-test output end -----

  Action: scoreRegion requirements and effects ... ok (1s)
  Action: deleteRegion requirements and effects ...
------- post-test output -------

--- Action: deleteRegion Tests Start ---
  Setup: Initializing maps for user 'user:Alice' and user 'user:Bob'.
  Setup: Generating map for user 'user:Alice'. Friendly ID: 'Map-6'
  Setup: Registered map 'Map-6' with PainLocationScoring.
  Setup: Generating map for user 'user:Bob'. Friendly ID: 'Map-7'
  Setup: Registered map 'Map-7' with PainLocationScoring.
  Setup: Added region 'Right Elbow' to map 'Map-6' for user 'user:Alice'.
  Setup: Added region 'Left Wrist' to map 'Map-6' for user 'user:Alice'.
  Setup: Added region 'Nose' to map 'Map-7' for user 'user:Bob'.
  Action: User 'user:Alice' attempts to delete non-existent region 'region:imaginary'.
  Output: Error received: 'Region 'region:imaginary' not found or not owned by user 'user:Alice'.' (Expected)

  Action: User 'user:Alice' attempts to delete region 'Nose' owned by 'user:Bob'.
  Output: Error received: 'Region '0199f55c-dab2-733c-9a6f-b86eaf1c8594' not found or not owned by user 'user:Alice'.' (Expected)

  Action: User 'user:Alice' successfully deleting region 'Right Elbow' from their map 'Map-6'.
  Output: Region 'Right Elbow' deleted.

  Verification: Checking regions remaining in map 'Map-6' after deletion.
  Verification: Region 'Right Elbow' confirmed deleted. Only 'Left Wrist' remains in map 'Map-6'.
--- Action: deleteRegion Tests End ---
----- post-test output end -----

  Action: deleteRegion requirements and effects ... ok (1s)
  Integrated Test: Multiple users and maps interact correctly and with proper isolation ...
------- post-test output -------

--- Integrated Test: Multiple User/Map Interaction ---
  Setup: Initializing maps for user 'user:Alice' and user 'user:Bob'.
  Setup: Generating map for user 'user:Alice'. Friendly ID: 'Map-8'
  Setup: Registered map 'Map-8' with PainLocationScoring.
  Setup: Generating map for user 'user:Bob'. Friendly ID: 'Map-9'
  Setup: Registered map 'Map-9' with PainLocationScoring.
  Action: User 'user:Alice' adding regions to their map 'Map-8'.
  Output: User 'user:Alice' added regions: 'Left Hand', 'Right Hand'.

  Action: User 'user:Bob' adding regions to their map 'Map-9'.
  Output: User 'user:Bob' added region: 'Left Foot'.

  Action: User 'user:Alice' scoring their regions in map 'Map-8'.
  Output: User 'user:Alice' scored 'Left Hand' (5), 'Right Hand' (9).

  Action: User 'user:Bob' scoring their region in map 'Map-9'.
  Output: User 'user:Bob' scored 'Left Foot' (3).

  Verification: Checking 'user:Alice's regions and scores for map 'Map-8'.
  Verification: User 'user:Alice' regions and scores verified successfully.
  Verification: Checking 'user:Bob's regions and scores for map 'Map-9'.
  Verification: User 'user:Bob' regions and scores verified successfully.

  Action: User 'user:Alice' attempts cross-user modification (score user:Bob's region 'Left Foot').
  Output: Error received: 'Region '0199f55c-e223-7cc4-879e-58711edd6e4a' not found or not owned by user 'user:Alice'.' (Expected: User A cannot score User B's region)
  
--- Integrated Test: Multiple User/Map Interaction Complete ---
----- post-test output end -----
  Integrated Test: Multiple users and maps interact correctly and with proper isolation ... ok (2s)
PainLocationScoring ... ok (6s)

ok | 8 passed (12 steps) | 0 failed (19s)