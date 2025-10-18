---
timestamp: 'Fri Oct 17 2025 20:13:52 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_201352.82af186d.md]]'
content_id: c43ffcb59276765e8a6088b42aa5723edf4c6f946effbd9e933ab489af74f1fb
---

# response:

To implement `PainLocationScoring`, we'll define classes for `User`, `BodyMap`, and `Region` to represent the system's state. The core `PainLocationScoring` class will then manage instances of these objects and provide methods for the specified actions, ensuring all "requires" conditions are met through validation and error handling.

**Design Choices:**

1. **Hierarchical State:**
   * `PainLocationScoring` holds a dictionary of `User` objects.
   * Each `User` holds a dictionary of `BodyMap` objects.
   * Each `BodyMap` holds a dictionary of `Region` objects.
   * Each `Region` stores its `region_id` and an optional `score`.
     This dictionary-based structure allows for efficient lookup by ID (user\_id, map\_id, region\_id).

2. **Method Signatures:** The problem description suggests method signatures like `addRegion(user: User, map: Map, region: Region)`. In a real-world system, it's more common and robust to pass identifiers (e.g., `user_id`, `map_id`, `region_id` as strings) to the central `PainLocationScoring` class, which then manages the retrieval and manipulation of the internal objects. This avoids issues like passing a `Region` object that isn't actually part of the system's known state. My implementation reflects this practical approach.

3. **Error Handling:** `ValueError` exceptions are raised whenever a "requires" condition is not met (e.g., map not found, score out of range).

***

```python
from typing import Dict, Optional, List

# --- State Classes ---

class Region:
    """
    Represents a specific region on a body map with an associated pain score.
    The score is validated to be between 1 and 10.
    """
    def __init__(self, region_id: str):
        if not region_id:
            raise ValueError("Region ID cannot be empty.")
        self.region_id = region_id
        self._score: Optional[int] = None  # Pain score from 1 to 10, None if not set

    @property
    def score(self) -> Optional[int]:
        """Returns the pain score for the region."""
        return self._score

    @score.setter
    def score(self, value: int):
        """Sets the pain score, validating it is between 1 and 10."""
        if not isinstance(value, int):
            raise TypeError("Score must be an integer.")
        if not (1 <= value <= 10):
            raise ValueError("Score must be an integer between 1 and 10.")
        self._score = value

    def __repr__(self):
        """String representation of the Region object."""
        score_display = self.score if self.score is not None else "N/A"
        return f"Region(id='{self.region_id}', score={score_display})"

class BodyMap:
    """
    Represents a body map, a collection of regions that a user can score.
    """
    def __init__(self, map_id: str):
        if not map_id:
            raise ValueError("Map ID cannot be empty.")
        self.map_id = map_id
        self.regions: Dict[str, Region] = {}  # Stores Region objects by their ID

    def __repr__(self):
        """String representation of the BodyMap object."""
        return f"BodyMap(id='{self.map_id}', regions={list(self.regions.keys())})"

class User:
    """
    Represents a user of the system, capable of having multiple body maps.
    """
    def __init__(self, user_id: str):
        if not user_id:
            raise ValueError("User ID cannot be empty.")
        self.user_id = user_id
        self.body_maps: Dict[str, BodyMap] = {}  # Stores BodyMap objects by their ID

    def __repr__(self):
        """String representation of the User object."""
        return f"User(id='{self.user_id}', maps={list(self.body_maps.keys())})"

# --- PainLocationScoring Implementation ---

class PainLocationScoring:
    """
    Implements the PainLocationScoring concept, managing users, their body maps,
    and the pain intensity scores for specific regions.
    """
    def __init__(self):
        self.users: Dict[str, User] = {}  # Stores User objects by their ID

    # --- Internal Helper Methods ---

    def _get_user(self, user_id: str) -> User:
        """Retrieves a User object by ID, raising ValueError if not found."""
        user = self.users.get(user_id)
        if not user:
            raise ValueError(f"User '{user_id}' not found.")
        return user

    def _get_map(self, user: User, map_id: str) -> BodyMap:
        """Retrieves a BodyMap object for a given user, raising ValueError if not found."""
        body_map = user.body_maps.get(map_id)
        if not body_map:
            raise ValueError(f"Map '{map_id}' not found for user '{user.user_id}'.")
        return body_map

    def _get_region(self, body_map: BodyMap, region_id: str) -> Region:
        """Retrieves a Region object from a given body map, raising ValueError if not found."""
        region = body_map.regions.get(region_id)
        if not region:
            raise ValueError(f"Region '{region_id}' not found in map '{body_map.map_id}'.")
        return region

    # --- Setup Methods (for system initialization, not explicitly in the 'actions' list but necessary) ---

    def add_user(self, user_id: str) -> User:
        """
        Adds a new user to the system.
        Raises ValueError if a user with the same ID already exists.
        """
        if user_id in self.users:
            raise ValueError(f"User '{user_id}' already exists.")
        user = User(user_id)
        self.users[user_id] = user
        print(f"[SYSTEM] User '{user_id}' added.")
        return user

    def add_map_to_user(self, user_id: str, map_id: str) -> BodyMap:
        """
        Adds a new body map for an existing user.
        Requires the user to exist. Raises ValueError if map_id already exists for the user.
        """
        user = self._get_user(user_id)  # Ensures user exists
        if map_id in user.body_maps:
            raise ValueError(f"Map '{map_id}' already exists for user '{user_id}'.")
        body_map = BodyMap(map_id)
        user.body_maps[map_id] = body_map
        print(f"[SYSTEM] Map '{map_id}' added for user '{user_id}'.")
        return body_map

    # --- Core Actions ---

    def addRegion(self, user_id: str, map_id: str, region_id: str) -> Region:
        """
        **concept** PainLocationScoring
        **action** addRegion(user: User, map: Map, region: Region): (region: Region)

        Creates and returns a new Region on a specified Map for a given User.

        **requires** The Map must already exist for the given User.
        **effects** Creates and returns a new Region on that Map.
                    Raises ValueError if the region_id already exists in the map.
        """
        user = self._get_user(user_id)
        body_map = self._get_map(user, map_id) # Validates map exists for user

        if region_id in body_map.regions:
            raise ValueError(f"Region '{region_id}' already exists in map '{map_id}' for user '{user_id}'.")

        new_region = Region(region_id)
        body_map.regions[region_id] = new_region
        print(f"[ACTION] Region '{region_id}' added to map '{map_id}' for user '{user_id}'.")
        return new_region

    def scoreRegion(self, user_id: str, map_id: str, region_id: str, score: int):
        """
        **concept** PainLocationScoring
        **action** scoreRegion(user: User, region: Region, score: Number)

        Associates a numerical pain score with a specific Region.

        **requires** The Region must exist within the User’s Map.
                     The Number (score) must be an integer between 1 and 10.
        **effects** Associates the Number with that Region.
        """
        user = self._get_user(user_id)
        body_map = self._get_map(user, map_id)
        region = self._get_region(body_map, region_id) # Validates region exists in map

        # The Region's setter property handles score validation (1-10)
        region.score = score
        print(f"[ACTION] Score '{score}' set for region '{region_id}' in map '{map_id}' for user '{user_id}'.")

    def deleteRegion(self, user_id: str, map_id: str, region_id: str):
        """
        **concept** PainLocationScoring
        **action** deleteRegion(user: User, region: Region)

        Removes a Region from the associated Map.

        **requires** The Region must already exist within the User’s Map.
        **effects** Removes the Region from the associated Map.
        """
        user = self._get_user(user_id)
        body_map = self._get_map(user, map_id)
        
        if region_id not in body_map.regions:
            raise ValueError(f"Region '{region_id}' not found in map '{map_id}' for user '{user_id}'. Cannot delete.")
        
        del body_map.regions[region_id]
        print(f"[ACTION] Region '{region_id}' deleted from map '{map_id}' for user '{user_id}'.")

    # --- Query Methods (useful for inspecting the system state) ---

    def get_user_maps(self, user_id: str) -> List[str]:
        """Returns a list of map IDs for a given user."""
        user = self._get_user(user_id)
        return list(user.body_maps.keys())

    def get_map_regions(self, user_id: str, map_id: str) -> List[str]:
        """Returns a list of region IDs for a given map and user."""
        user = self._get_user(user_id)
        body_map = self._get_map(user, map_id)
        return list(body_map.regions.keys())

    def get_region_score(self, user_id: str, map_id: str, region_id: str) -> Optional[int]:
        """Returns the score of a specific region, or None if not scored."""
        user = self._get_user(user_id)
        body_map = self._get_map(user, map_id)
        region = self._get_region(body_map, region_id)
        return region.score

# --- Example Usage ---
if __name__ == "__main__":
    scoring_system = PainLocationScoring()

    print("--- Setting up users and maps ---")
    user1 = scoring_system.add_user("Alice")
    user2 = scoring_system.add_user("Bob")

    map1_alice = scoring_system.add_map_to_user("Alice", "FrontBody")
    map2_alice = scoring_system.add_map_to_user("Alice", "BackBody")
    map1_bob = scoring_system.add_map_to_user("Bob", "LeftArm")

    print("\n--- Performing Actions: Adding Regions and Scoring ---")
    # Alice's FrontBody
    scoring_system.addRegion("Alice", "FrontBody", "LeftKnee")
    scoring_system.scoreRegion("Alice", "FrontBody", "LeftKnee", 7)

    scoring_system.addRegion("Alice", "FrontBody", "RightShoulder")
    scoring_system.scoreRegion("Alice", "FrontBody", "RightShoulder", 4)

    # Alice's BackBody
    scoring_system.addRegion("Alice", "BackBody", "LowerBack")
    scoring_system.scoreRegion("Alice", "BackBody", "LowerBack", 9)

    # Bob's LeftArm
    scoring_system.addRegion("Bob", "LeftArm", "LeftElbow")
    scoring_system.scoreRegion("Bob", "LeftArm", "LeftElbow", 6)

    scoring_system.addRegion("Alice", "FrontBody", "Head") # Add region without immediate score
    
    print("\n--- Querying Current State ---")
    print(f"Alice's Maps: {scoring_system.get_user_maps('Alice')}")
    print(f"Regions in Alice's FrontBody: {scoring_system.get_map_regions('Alice', 'FrontBody')}")
    print(f"Score for Alice's LeftKnee: {scoring_system.get_region_score('Alice', 'FrontBody', 'LeftKnee')}")
    print(f"Score for Alice's Head (initially unscored): {scoring_system.get_region_score('Alice', 'FrontBody', 'Head')}")
    print(f"Score for Bob's LeftElbow: {scoring_system.get_region_score('Bob', 'LeftArm', 'LeftElbow')}")
    
    print("\n--- Performing Actions: Deleting a Region ---")
    scoring_system.deleteRegion("Alice", "FrontBody", "RightShoulder")
    print(f"Regions in Alice's FrontBody after deletion: {scoring_system.get_map_regions('Alice', 'FrontBody')}")

    print("\n--- Testing 'Requires' Conditions (Error Handling) ---")
    try:
        # Require: Map must exist for the given User
        scoring_system.addRegion("Alice", "NonExistentMap", "NewRegion")
    except ValueError as e:
        print(f"[ERROR-EXPECTED] {e}")

    try:
        # Require: Region must exist within User's Map for scoring
        scoring_system.scoreRegion("Alice", "FrontBody", "NonExistentRegion", 5)
    except ValueError as e:
        print(f"[ERROR-EXPECTED] {e}")

    try:
        # Require: Number must be between 1 and 10
        scoring_system.scoreRegion("Alice", "FrontBody", "LeftKnee", 11)
    except ValueError as e:
        print(f"[ERROR-EXPECTED] {e}")

    try:
        # Require: Region must exist within User's Map for deletion
        scoring_system.deleteRegion("Alice", "FrontBody", "NonExistentRegion")
    except ValueError as e:
        print(f"[ERROR-EXPECTED] {e}")
    
    try:
        # Adding a region that already exists
        scoring_system.addRegion("Alice", "FrontBody", "LeftKnee")
    except ValueError as e:
        print(f"[ERROR-EXPECTED] {e}")

    try:
        # Adding a user that already exists
        scoring_system.add_user("Alice")
    except ValueError as e:
        print(f"[ERROR-EXPECTED] {e}")

    try:
        # Adding a map that already exists for the user
        scoring_system.add_map_to_user("Alice", "FrontBody")
    except ValueError as e:
        print(f"[ERROR-EXPECTED] {e}")

    print("\n--- Final State Inspection of objects ---")
    print(f"Alice's FrontBody: {scoring_system.users['Alice'].body_maps['FrontBody']}")
    print(f"Alice's BackBody: {scoring_system.users['Alice'].body_maps['BackBody']}")
    print(f"Bob's LeftArm: {scoring_system.users['Bob'].body_maps['LeftArm']}")
```
