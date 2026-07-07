const LANE_W = 3.5;
const MEDIAN_W = 3;

export const RACE_START_Z = 20;
export const RACE_ROW_SPACING = 12;

/** Left carriageway lane centers (2 lanes) */
export const LEFT_LANE_X = [
  -(MEDIAN_W / 2 + LANE_W * 1.5),
  -(MEDIAN_W / 2 + LANE_W * 0.5),
] as const;

/** Right carriageway lane centers (2 lanes) */
export const RIGHT_LANE_X = [
  MEDIAN_W / 2 + LANE_W * 0.5,
  MEDIAN_W / 2 + LANE_W * 1.5,
] as const;

export interface SpawnPosition {
  x: number;
  y: number;
  z: number;
  rotation: number;
}

/**
 * Grid spawn layout for multiplayer races:
 * - 2 players: left road + right road (front row)
 * - 4 players: 2 left + 2 right (front row)
 * - 8 players: 2 left + 2 right front, 2 left + 2 right one row behind
 * - 16 players: 4 rows of 4 (2 left lanes + 2 right lanes per row)
 */
export function getRaceSpawnPosition(playerIndex: number, totalPlayers: number): SpawnPosition {
  const rotation = Math.PI;

  if (totalPlayers <= 1) {
    return { x: LEFT_LANE_X[1], y: 0.5, z: RACE_START_Z, rotation };
  }

  if (totalPlayers === 2) {
    return {
      x: playerIndex === 0 ? LEFT_LANE_X[0] : RIGHT_LANE_X[0],
      y: 0.5,
      z: RACE_START_Z,
      rotation,
    };
  }

  const slotsPerRow = 4;
  const row = Math.floor(playerIndex / slotsPerRow);
  const slotInRow = playerIndex % slotsPerRow;
  const laneIdx = slotInRow % 2;
  const x = slotInRow < 2 ? LEFT_LANE_X[laneIdx] : RIGHT_LANE_X[laneIdx];
  const z = RACE_START_Z + row * RACE_ROW_SPACING;

  return { x, y: 0.5, z, rotation };
}
