---
timestamp: 'Fri Oct 17 2025 20:15:20 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_201520.db1d4c40.md]]'
content_id: 486c65d22dfed6d6887bab63e5a8e11b181d877f471f8de6ef3c78c686c52126
---

# response:

To implement `PainLocationScoring`, we will define classes for `User`, `BodyMap`, and `Region` to model the system's `state`. A central `PainLocationScoring` class will manage these entities and provide the specified `actions`.

The core principle is that `Region` objects are uniquely identifiable within a `BodyMap`, which in turn belongs to a `User`. We'll rely on object identity for validation (ensuring the passed objects are the exact instances managed by the system).

### Data Model Classes

1. **`User`**: Represents a user in the system. Holds a collection of `BodyMap` objects.
2. **`BodyMap`**: Represents a specific body map (e.g., "Front View") for a user. Holds a collection of `Region` objects.
3. **`Region`**: Represents a specific area on a body map (e.g., "Left Knee"). Stores its name and a pain `score` (1-10).

### `PainLocationScoring` Class

This class encapsulates the business logic and manages the collections of `User` objects. It will implement the `addRegion`, `scoreRegion`, and `deleteRegion` actions.

```python
import uuid

# --- Data Model Classes ---

class User:
    """Represents a user in the PainLocationScoring system."""
    def __init__(self, user_id: str, name: str):
        if not isinstance(user_id, str) or not user_id:
            raise ValueError("user_id must be a non-empty string.")
        self.id = user_id
        self.name = name
        self.body_maps: dict[str, 'BodyMap'] = {} # Stores BodyMap objects by their ID

    def __repr__(self):
        return f"User(id='{self.id}', name='{self.name}')"

class BodyMap:
    """Represents a body map belonging to a user."""
    def __init__(self, map_id: str, name: str):
        if not isinstance(map_id, str) or not map_id:
            raise ValueError("map_id must be a non-empty string.")
        self.id = map_id
        self.name = name
        self.regions: dict[str, 'Region'] = {} # Stores Region objects by their ID

    def __repr__(self):
        return f"BodyMap(id='{self.id}', name='{self.name}')"

class Region:
    """Represents a specific region on a body map with an associated pain score."""
    def __init__(self, region_id: str, name: str, initial_score: int = None):
        if not isinstance(region_id, str) or not region_id:
            raise ValueError("region_id must be a non-empty string.")
        self.id = region_id
        self.name = name
        self._score = initial_score # Internal storage for the score

    @property
    def score(self) -> int | None:
        """Get the current pain score for the region."""
        return self._score

    @score.setter
    def score(self, value: int):
        """Set the pain score for the region, with validation."""
        if not isinstance(value, int):
            raise TypeError("Score must be an integer.")
        if not (1 <= value <= 10):
            raise ValueError("Score must be between 1 and 10.")
        self._score = value

    def __repr__(self):
        return f"Region(id='{self.id}', name='{self.name}', score={self.score})"

    # For `scoreRegion` and `deleteRegion`, we rely on `is` for object identity
    # to ensure we're operating on the exact instance stored in the system's state.

# --- PainLocationScoring System Implementation ---

class PainLocationScoring:
    """
    Implements the PainLocationScoring system.
    Allows users to manage body maps, add/delete regions, and score pain intensity.
    """
    def __init__(self):
        self.users: dict[str, User] = {} # Stores User objects by their ID

    # --- Internal Validation and Helper Methods ---

    def _validate_user_object(self, user_obj: User) -> User:
        """
        Validates if the provided user object is a known, managed instance in the system.
        Raises ValueError if the user does not exist or is not the correct instance.
        """
        system_user = self.users.get(user_obj.id)
        if system_user is None or system_user is not user_obj:
            raise ValueError(f"Provided User object (ID: '{user_obj.id}') is not a valid instance managed by the system.")
        return system_user

    def _validate_user_map_ownership(self, user_obj: User, map_obj: BodyMap):
        """
        Validates if a provided map object genuinely belongs to the given user object.
        Raises ValueError if the map does not belong to the user or is not the correct instance.
        """
        self._validate_user_object(user_obj) # Ensure the user itself is valid
        if map_obj.id not in user_obj.body_maps or user_obj.body_maps[map_obj.id] is not map_obj:
            raise ValueError(f"Map (ID: '{map_obj.id}') does not belong to User (ID: '{user_obj.id}') or is not the correct instance.")

    def _find_region_in_user_maps(self, user_obj: User, region_obj: Region) -> tuple[BodyMap, Region]:
        """
        Finds a specific region object within a user's maps, ensuring it's the exact instance.
        Returns the owning BodyMap and the found Region instance.
        Raises ValueError if the region is not found or the instance doesn't match.
        """
        self._validate_user_object(user_obj) # Ensure the user itself is valid

        for map_id, map_in_system in user_obj.body_maps.items():
            if region_obj.id in map_in_system.regions and map_in_system.regions[region_obj.id] is region_obj:
                return map_in_system, region_obj # Return the map and the exact region instance
        raise ValueError(f"Region (ID: '{region_obj.id}') does not exist as the provided instance within any map of User (ID: '{user_obj.id}').")

    # --- Setup/Helper Methods (for building the initial state, not explicit actions in prompt) ---

    def create_user(self, user_id: str = None, name: str = "New User") -> User:
        """Creates and registers a new user in the system."""
        if user_id is None:
            user_id = str(uuid.uuid4())
        if user_id in self.users:
            raise ValueError(f"User with ID '{user_id}' already exists.")
        new_user = User(user_id, name)
        self.users[user_id] = new_user
        return new_user

    def create_map(self, user: User, map_id: str = None, name: str = "Default Map") -> BodyMap:
        """Creates and assigns a new body map to an existing user."""
        system_user = self._validate_user_object(user)
        if map_id is None:
            map_id = str(uuid.uuid4())
        if map_id in system_user.body_maps:
            raise ValueError(f"Map with ID '{map_id}' already exists for User '{system_user.id}'.")
        new_map = BodyMap(map_id, name)
        system_user.body_maps[map_id] = new_map
        return new_map

    # --- Core Actions as per prompt ---

    def addRegion(self, user: User, map_obj: BodyMap, region_template: Region) -> Region:
        """
        Adds a new region to a specific body map of a user.
        
        **requires**: The `map_obj` must already exist for the given `user`.
        **effects**: Creates and returns a new `Region` object on that `map_obj`.
                     The `region_template` is used to get the ID and name for the new region;
                     its `score` attribute is ignored.
        
        Args:
            user (User): The user object to whom the map belongs.
            map_obj (BodyMap): The body map to which the region will be added.
            region_template (Region): An instance of Region providing the `id` and `name` for the new region.
        
        Returns:
            Region: The newly created and added Region object.
        
        Raises:
            TypeError: If `region_template` is not a Region instance.
            ValueError: If validation fails (e.g., map doesn't exist, region ID already exists).
        """
        self._validate_user_map_ownership(user, map_obj)

        if not isinstance(region_template, Region):
            raise TypeError("`region_template` must be an instance of Region.")

        region_id = region_template.id
        region_name = region_template.name

        if region_id in map_obj.regions:
            raise ValueError(f"Region with ID '{region_id}' already exists on Map '{map_obj.id}'.")

        new_region = Region(region_id, region_name)
        map_obj.regions[region_id] = new_region
        return new_region

    def scoreRegion(self, user: User, region_obj: Region, score: int):
        """
        Associates a pain score with a specific region.
        
        **requires**: The `region_obj` must exist within the `user`'s `map` and the `score` must be between 1 and 10.
        **effects**: Updates the score for that `region_obj`.
        
        Args:
            user (User): The user object who owns the region.
            region_obj (Region): The specific region object to score.
            score (int): The pain intensity score (1-10).
        
        Raises:
            TypeError: If `region_obj` is not a Region instance or score is not an integer.
            ValueError: If validation fails (e.g., region not found, score out of range).
        """
        if not isinstance(region_obj, Region):
            raise TypeError("`region_obj` must be an instance of Region.")

        # This call implicitly validates the user and finds the exact region instance
        # within the user's maps, ensuring it's owned and the instance matches.
        _, found_region_instance = self._find_region_in_user_maps(user, region_obj)
        
        # The Region's property setter handles score range validation (1-10)
        try:
            found_region_instance.score = score
        except (ValueError, TypeError) as e:
            raise ValueError(f"Failed to score region '{region_obj.id}': {e}") from e

    def deleteRegion(self, user: User, region_obj: Region):
        """
        Removes a specific region from its associated body map.
        
        **requires**: The `region_obj` must already exist within the `user`’s `map`.
        **effects**: Removes the `region_obj` from its associated `map`.
        
        Args:
            user (User): The user object who owns the region.
            region_obj (Region): The specific region object to delete.
        
        Raises:
            TypeError: If `region_obj` is not a Region instance.
            ValueError: If validation fails (e.g., region not found or not owned by user).
        """
        if not isinstance(region_obj, Region):
            raise TypeError("`region_obj` must be an instance of Region.")

        # This call implicitly validates the user and finds the exact region instance
        # within the user's maps, ensuring it's owned and the instance matches.
        owning_map, found_region_instance = self._find_region_in_user_maps(user, region_obj)

        # Remove the region from its owning map
        del owning_map.regions[found_region_instance.id]

```
