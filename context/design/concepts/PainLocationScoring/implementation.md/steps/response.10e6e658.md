---
timestamp: 'Fri Oct 17 2025 20:10:21 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_201021.1e08e769.md]]'
content_id: 10e6e65849595e8f71b1f186969d903d2d0edd714e1332c127f437f4c1d462d3
---

# response:

To implement `PainLocationScoring`, we'll define classes for `User`, `BodyMap`, and `Region`, representing the core entities described in the state. A central `PainLocationScoring` class will manage these objects and provide the specified actions, ensuring all requirements and effects are met.

```python
import uuid
from typing import Dict, List, Optional, Union

# --- Core Entities ---

class Region:
    """
    Represents a specific area on a body map with an optional pain score.
    """
    def __init__(self, name: str):
        if not isinstance(name, str) or not name.strip():
            raise ValueError("Region name must be a non-empty string.")
        self.id = str(uuid.uuid4()) # Unique ID for internal tracking
        self.name: str = name
        self._score: Optional[int] = None

    @property
    def score(self) -> Optional[int]:
        """Returns the current pain score for the region."""
        return self._score

    def set_score(self, score: int):
        """
        Sets the pain score for the region.
        Requires: score must be an integer between 1 and 10.
        Effects: associates the number with this Region.
        """
        if not isinstance(score, int):
            raise TypeError("Score must be an integer.")
        if not (1 <= score <= 10):
            raise ValueError("Pain score must be between 1 and 10.")
        self._score = score
        print(f"Region '{self.name}' (ID: {self.id}) score set to {score}.")

    def __repr__(self):
        return (f"Region(name='{self.name}', score={self.score if self.score is not None else 'None'})")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "score": self.score
        }

class BodyMap:
    """
    Represents a body map (e.g., "Front Body", "Back Body") containing regions.
    """
    def __init__(self, name: str):
        if not isinstance(name, str) or not name.strip():
            raise ValueError("BodyMap name must be a non-empty string.")
        self.id = str(uuid.uuid4()) # Unique ID for internal tracking
        self.name: str = name
        # Store regions by their unique ID for efficient lookup and management
        self._regions: Dict[str, Region] = {} # {region_id: Region_object}

    def add_region(self, region_name: str) -> Region:
        """
        Creates and adds a new Region to this BodyMap.
        """
        # Check if a region with the same *name* already exists to avoid user confusion
        # (Though internally we use UUIDs, users refer to regions by name)
        for region in self._regions.values():
            if region.name == region_name:
                raise ValueError(f"Region with name '{region_name}' already exists on map '{self.name}'.")

        new_region = Region(region_name)
        self._regions[new_region.id] = new_region
        print(f"Region '{region_name}' (ID: {new_region.id}) added to map '{self.name}'.")
        return new_region

    def get_region_by_id(self, region_id: str) -> Region:
        """Retrieves a region by its unique ID."""
        region = self._regions.get(region_id)
        if not region:
            raise KeyError(f"Region with ID '{region_id}' not found on map '{self.name}'.")
        return region

    def get_region_by_name(self, region_name: str) -> Region:
        """Retrieves a region by its name."""
        for region_id, region in self._regions.items():
            if region.name == region_name:
                return region
        raise KeyError(f"Region with name '{region_name}' not found on map '{self.name}'.")

    def delete_region(self, region_id: str):
        """
        Removes a Region from this BodyMap.
        Requires: The Region must exist within this Map.
        Effects: Removes the Region from the associated Map.
        """
        if region_id not in self._regions:
            raise KeyError(f"Region with ID '{region_id}' not found on map '{self.name}'.")
        region_name = self._regions[region_id].name
        del self._regions[region_id]
        print(f"Region '{region_name}' (ID: {region_id}) deleted from map '{self.name}'.")

    def get_all_regions(self) -> List[Region]:
        """Returns a list of all regions on this map."""
        return list(self._regions.values())

    def __repr__(self):
        return f"BodyMap(name='{self.name}', regions_count={len(self._regions)})"

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "regions": [r.to_dict() for r in self._regions.values()]
        }

class User:
    """
    Represents a user, holding a collection of their body maps.
    """
    def __init__(self, username: str):
        if not isinstance(username, str) or not username.strip():
            raise ValueError("Username must be a non-empty string.")
        self.id = str(uuid.uuid4()) # Unique ID for internal tracking
        self.username: str = username
        # Store maps by their unique ID for efficient lookup and management
        self._maps: Dict[str, BodyMap] = {} # {map_id: BodyMap_object}

    def add_map(self, map_name: str) -> BodyMap:
        """
        Creates and adds a new BodyMap for this User.
        """
        # Check if a map with the same *name* already exists
        for body_map in self._maps.values():
            if body_map.name == map_name:
                raise ValueError(f"Map with name '{map_name}' already exists for user '{self.username}'.")

        new_map = BodyMap(map_name)
        self._maps[new_map.id] = new_map
        print(f"Map '{map_name}' (ID: {new_map.id}) added for user '{self.username}'.")
        return new_map

    def get_map_by_id(self, map_id: str) -> BodyMap:
        """Retrieves a map by its unique ID."""
        body_map = self._maps.get(map_id)
        if not body_map:
            raise KeyError(f"Map with ID '{map_id}' not found for user '{self.username}'.")
        return body_map

    def get_map_by_name(self, map_name: str) -> BodyMap:
        """Retrieves a map by its name."""
        for map_id, body_map in self._maps.items():
            if body_map.name == map_name:
                return body_map
        raise KeyError(f"Map with name '{map_name}' not found for user '{self.username}'.")

    def get_all_maps(self) -> List[BodyMap]:
        """Returns a list of all maps for this user."""
        return list(self._maps.values())

    def __repr__(self):
        return f"User(username='{self.username}', maps_count={len(self._maps)})"

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "maps": [m.to_dict() for m in self._maps.values()]
        }


# --- PainLocationScoring System ---

class PainLocationScoring:
    """
    Manages users, their body maps, and pain regions.
    Provides the core actions for the PainLocationScoring system.
    """
    def __init__(self):
        self._users: Dict[str, User] = {} # {user_id: User_object}

    def create_user(self, username: str) -> User:
        """Creates and registers a new user."""
        # Check if a user with the same *username* already exists
        for user_obj in self._users.values():
            if user_obj.username == username:
                raise ValueError(f"User with username '{username}' already exists.")

        new_user = User(username)
        self._users[new_user.id] = new_user
        print(f"User '{username}' (ID: {new_user.id}) created.")
        return new_user

    def get_user_by_id(self, user_id: str) -> User:
        """Retrieves a user by their unique ID."""
        user = self._users.get(user_id)
        if not user:
            raise KeyError(f"User with ID '{user_id}' not found.")
        return user

    def get_user_by_username(self, username: str) -> User:
        """Retrieves a user by their username."""
        for user_id, user in self._users.items():
            if user.username == username:
                return user
        raise KeyError(f"User with username '{username}' not found.")

    def add_map_to_user(self, username: str, map_name: str) -> BodyMap:
        """
        Adds a new body map to an existing user.
        Requires: The user must exist.
        """
        user = self.get_user_by_username(username)
        return user.add_map(map_name)

    # --- Core Actions as per prompt ---

    def addRegion(self, username: str, map_name: str, region_name: str) -> Region:
        """
        Adds a new region to a specified map for a given user.
        Requires: the Map must already exist for the given User.
        Effects: creates and returns a new Region on that Map.
        """
        user = self.get_user_by_username(username) # Requires user to exist
        body_map = user.get_map_by_name(map_name)   # Requires map to exist for user
        return body_map.add_region(region_name)

    def scoreRegion(self, username: str, map_name: str, region_name: str, score: int):
        """
        Associates a pain score with a specific region for a user.
        Requires: the Region must exist within the User’s Map and the Number must be between 1 and 10.
        Effects: associates the Number with that Region.
        """
        user = self.get_user_by_username(username) # Requires user to exist
        body_map = user.get_map_by_name(map_name)   # Requires map to exist for user
        region = body_map.get_region_by_name(region_name) # Requires region to exist
        region.set_score(score) # Requires score to be 1-10

    def deleteRegion(self, username: str, map_name: str, region_name: str):
        """
        Removes a region from a specified map for a given user.
        Requires: the Region must already exist within the User’s Map.
        Effects: removes the Region from the associated Map.
        """
        user = self.get_user_by_username(username) # Requires user to exist
        body_map = user.get_map_by_name(map_name)   # Requires map to exist for user
        region_to_delete = body_map.get_region_by_name(region_name) # Requires region to exist
        body_map.delete_region(region_to_delete.id) # Use the region's internal ID for deletion

    # --- Utility/Reporting Methods ---

    def get_pain_report_for_user(self, username: str) -> Dict[str, Dict[str, Optional[int]]]:
        """
        Generates a summary of all regions and their scores for a user.
        Returns: {map_name: {region_name: score, ...}, ...}
        """
        user = self.get_user_by_username(username)
        report = {}
        for body_map in user.get_all_maps():
            map_regions = {}
            for region in body_map.get_all_regions():
                map_regions[region.name] = region.score
            report[body_map.name] = map_regions
        return report

    def get_region_details(self, username: str, map_name: str, region_name: str) -> Optional[Dict[str, Union[str, int, None]]]:
        """
        Get details for a specific region including its score.
        """
        try:
            user = self.get_user_by_username(username)
            body_map = user.get_map_by_name(map_name)
            region = body_map.get_region_by_name(region_name)
            return region.to_dict()
        except (KeyError, ValueError):
            return None

    def __repr__(self):
        return f"PainLocationScoring(users_count={len(self._users)})"

    def to_dict(self):
        return {
            "users": [u.to_dict() for u in self._users.values()]
        }


# --- Example Usage ---

if __name__ == "__main__":
    system = PainLocationScoring()

    print("--- Creating Users ---")
    user1 = system.create_user("Alice")
    user2 = system.create_user("Bob")

    try:
        system.create_user("Alice") # Attempt to create duplicate user
    except ValueError as e:
        print(f"Error: {e}")

    print("\n--- Adding Maps for Users ---")
    map1_alice = system.add_map_to_user("Alice", "Front Body")
    map2_alice = system.add_map_to_user("Alice", "Back Body")
    map1_bob = system.add_map_to_user("Bob", "Front Body")

    try:
        system.add_map_to_user("Alice", "Front Body") # Attempt to add duplicate map
    except ValueError as e:
        print(f"Error: {e}")

    print("\n--- Adding Regions and Scoring ---")
    # Alice's front body
    region_neck_alice_front = system.addRegion("Alice", "Front Body", "Neck")
    region_lshoulder_alice_front = system.addRegion("Alice", "Front Body", "Left Shoulder")
    system.scoreRegion("Alice", "Front Body", "Left Shoulder", 7)
    system.scoreRegion("Alice", "Front Body", "Neck", 3)

    # Alice's back body
    region_lshoulder_alice_back = system.addRegion("Alice", "Back Body", "Left Shoulder")
    system.scoreRegion("Alice", "Back Body", "Left Shoulder", 5)
    system.addRegion("Alice", "Back Body", "Lower Back")

    # Bob's front body
    region_rshoulder_bob_front = system.addRegion("Bob", "Front Body", "Right Shoulder")
    system.scoreRegion("Bob", "Front Body", "Right Shoulder", 9)
    system.addRegion("Bob", "Front Body", "Knee")
    system.scoreRegion("Bob", "Front Body", "Knee", 4)

    print("\n--- Attempting invalid scores ---")
    try:
        system.scoreRegion("Alice", "Front Body", "Neck", 0)
    except ValueError as e:
        print(f"Error: {e}")
    try:
        system.scoreRegion("Alice", "Front Body", "Neck", 11)
    except ValueError as e:
        print(f"Error: {e}")

    print("\n--- Generating Pain Reports ---")
    print("Alice's Pain Report:", system.get_pain_report_for_user("Alice"))
    print("Bob's Pain Report:", system.get_pain_report_for_user("Bob"))

    print("\n--- Getting specific region details ---")
    print("Alice's Left Shoulder (Front):", system.get_region_details("Alice", "Front Body", "Left Shoulder"))
    print("Bob's Right Shoulder (Front):", system.get_region_details("Bob", "Front Body", "Right Shoulder"))
    print("Non-existent region:", system.get_region_details("Alice", "Front Body", "Right Foot"))

    print("\n--- Deleting Regions ---")
    system.deleteRegion("Alice", "Front Body", "Neck")
    print("Alice's Pain Report after deletion:", system.get_pain_report_for_user("Alice"))

    try:
        system.deleteRegion("Alice", "Front Body", "NonExistentRegion")
    except KeyError as e:
        print(f"Error deleting non-existent region: {e}")

    try:
        system.scoreRegion("Alice", "Front Body", "Neck", 5) # Attempt to score deleted region
    except KeyError as e:
        print(f"Error scoring deleted region: {e}")

    print("\n--- Final System State (as dictionary) ---")
    import json
    print(json.dumps(system.to_dict(), indent=2))
```
