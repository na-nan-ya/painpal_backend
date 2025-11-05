import { actions, Sync } from "@engine";
import { BodyMapGeneration, PainLocationScoring } from "@concepts";

/**
 * When a new map is generated for a user, this sync calls the official 'trackMap' action
 * in the PainLocationScoring concept. This allows it to track ownership for future
 * validation of region-based actions in an architecturally sound way.
 */
export const TrackMapOwnershipForScoring: Sync = ({ user, mapId }) => ({
  when: actions(
    [BodyMapGeneration.generateMap, { user }, { mapId }],
  ),
  then: actions(
    // CORRECT: Use the new, official 'trackMap' action.
    // The 'map' parameter of trackMap is aliased to the 'mapId' variable from the 'when' clause.
    [PainLocationScoring.trackMap, { user, map: mapId }],
  ),
});
