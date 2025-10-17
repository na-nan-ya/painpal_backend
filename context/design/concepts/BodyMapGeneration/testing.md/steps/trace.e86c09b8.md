---
timestamp: 'Fri Oct 17 2025 12:34:40 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_123440.8a122fee.md]]'
content_id: e86c09b8d0f61cf679834d5c49769bebe203272ae00d64373755daade0b96c23
---

# trace:

This trace outlines the sequence of actions that would fulfill the `BodyMapGeneration` concept's principle. The principle is assumed to be: "A user can create a reusable body map template and then generate specific instances of it for individual patients, updating the state of individual body parts on that instance."

**1. Define the Body Map Structure (Template Creation)**

* **Action:** `createBodyMapTemplate`
* **Input:**
  * `name`: "Standard Human Body Map"
  * `description`: "A general template for recording symptoms across common body regions."
  * `parts`:
    * `{ id: "head", name: "Head", description: "Cranium and face region" }`
    * `{ id: "torso", name: "Torso", description: "Chest and abdomen" }`
    * `{ id: "left_arm", name: "Left Arm" }`
    * `{ id: "right_arm", name: "Right Arm" }`
    * `{ id: "left_leg", name: "Left Leg" }`
    * `{ id: "right_leg", name: "Right Leg" }`
* **Expected Output/Effect:** A new `BodyMapTemplate` record is created in the database, uniquely identified (e.g., `template_id_001`), containing the specified structure.

**2. Generate a Patient-Specific Body Map (Instance Creation - Patient A)**

* **Action:** `generateBodyMapInstance`
* **Input:**
  * `templateId`: `template_id_001` (from step 1)
  * `patientId`: `patient_id_A`
  * `initialState`:
    * `left_arm`: `{ status: "normal" }`
    * `right_arm`: `{ status: "pain", level: "mild", onset: "2023-10-26" }`
    * `torso`: `{ status: "rash", location: "chest" }`
    * `head`: `{ status: "headache", intensity: "moderate" }`
    * (Other parts default to a 'normal' or 'unassigned' state based on concept rules)
* **Expected Output/Effect:** A new `BodyMapInstance` record is created, uniquely identified (e.g., `instance_id_A`), linked to `template_id_001` and `patient_id_A`, with the initial state recorded for the specified parts.

**3. Generate another Patient-Specific Body Map (Instance Creation - Patient B)**

* **Action:** `generateBodyMapInstance`
* **Input:**
  * `templateId`: `template_id_001` (reusing the same template)
  * `patientId`: `patient_id_B`
  * `initialState`:
    * `left_leg`: `{ status: "swelling", cause: "injury" }`
    * `right_leg`: `{ status: "normal" }`
    * `torso`: `{ status: "normal" }`
* **Expected Output/Effect:** Another new `BodyMapInstance` record is created (e.g., `instance_id_B`), linked to the same `template_id_001` but a different `patient_id_B`, with its own distinct initial state.

**4. Update a Body Part's State (Patient A)**

* **Action:** `updateBodyMapPartState`
* **Input:**
  * `instanceId`: `instance_id_A`
  * `partId`: `"right_arm"`
  * `newState`: `{ status: "resolved", resolvedDate: "2023-10-28" }`
* **Expected Output/Effect:** The `BodyMapInstance` record for `instance_id_A` is updated. Specifically, the `partsState` for `right_arm` is modified to reflect the new status and resolved date. The state of other parts in `instance_id_A` and `instance_id_B` remains unchanged.

**5. Update another Body Part's State (Patient B)**

* **Action:** `updateBodyMapPartState`
* **Input:**
  * `instanceId`: `instance_id_B`
  * `partId`: `"left_leg"`
  * `newState`: `{ status: "healing", notes: "Applying ice daily." }`
* **Expected Output/Effect:** The `BodyMapInstance` record for `instance_id_B` is updated. The `partsState` for `left_leg` is modified. The state of other parts, including those in `instance_id_A`, remains unchanged.

This trace demonstrates how a single template can be used to generate multiple patient-specific body maps, and how the state of individual parts can be independently tracked and updated for each patient's instance, directly fulfilling the outlined principle.
