import * as THREE from 'three';
import { MODULAR_TILE_SCALE, buildModularTrackLayout, type ModularSegment } from '@indian-racing/shared';

export const MODULAR_ROAD_GLB = '/assets/maps/modular-road-kit.glb';

export interface RoadPieceDef {
  glbName: string;
  centerOffset: THREE.Vector3;
  scaleX: number;
  entry: { x: number; z: number; heading: number };
  exit: { x: number; z: number; heading: number };
}

export const ROAD_PIECES: Record<string, RoadPieceDef> = {
  straight: {
    glbName: 'road_splitBarrier',
    centerOffset: new THREE.Vector3(4.57, 0, -5.14),
    scaleX: 2,
    entry: { x: 0, z: 1, heading: Math.PI },
    exit: { x: 0, z: -1, heading: Math.PI },
  },
  curveRight: {
    glbName: 'road_curvePavement',
    centerOffset: new THREE.Vector3(5.02, 0, -2.14),
    scaleX: 1,
    entry: { x: 0, z: 1, heading: Math.PI },
    exit: { x: 1, z: 0, heading: Math.PI / 2 },
  },
  curveLeft: {
    glbName: 'road_curvePavement',
    centerOffset: new THREE.Vector3(5.02, 0, -2.14),
    scaleX: -1,
    entry: { x: 0, z: 1, heading: Math.PI },
    exit: { x: -1, z: 0, heading: -Math.PI / 2 },
  },
};

export interface PlacedRoadPiece {
  key: string;
  piece: THREE.Group;
  position: THREE.Vector3;
  rotation: number;
}

interface Cursor {
  x: number;
  y: number;
  z: number;
  heading: number;
}

function rotateXZ(x: number, z: number, yaw: number) {
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  return { x: x * cos - z * sin, z: x * sin + z * cos };
}

function cloneRoadPiece(scene: THREE.Group, def: RoadPieceDef): THREE.Group {
  const source = scene.getObjectByName(def.glbName);
  if (!source) return new THREE.Group();

  const wrapper = new THREE.Group();
  const clone = source.clone(true);
  clone.position.copy(def.centerOffset).multiplyScalar(-1);
  clone.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  wrapper.add(clone);
  return wrapper;
}

function placePiece(
  scene: THREE.Group,
  def: RoadPieceDef,
  cursor: Cursor,
  key: string,
): PlacedRoadPiece {
  const piece = cloneRoadPiece(scene, def);
  const yaw = cursor.heading - def.entry.heading;
  const mirror = def.scaleX < 0 ? -1 : 1;
  const scaleX = Math.abs(def.scaleX) * MODULAR_TILE_SCALE * mirror;

  piece.scale.set(scaleX, MODULAR_TILE_SCALE, MODULAR_TILE_SCALE);
  piece.rotation.y = yaw;

  const entry = rotateXZ(def.entry.x * Math.abs(def.scaleX), def.entry.z, yaw);
  piece.position.set(
    cursor.x - entry.x * MODULAR_TILE_SCALE,
    0,
    cursor.z - entry.z * MODULAR_TILE_SCALE,
  );

  const exit = rotateXZ(def.exit.x * Math.abs(def.scaleX), def.exit.z, yaw);
  cursor.x = piece.position.x + exit.x * MODULAR_TILE_SCALE;
  cursor.z = piece.position.z + exit.z * MODULAR_TILE_SCALE;
  cursor.heading = def.exit.heading + yaw;

  return { key, piece, position: piece.position.clone(), rotation: piece.rotation.y };
}

export function buildModularRoadPlacements(
  scene: THREE.Group,
  startZ = 30,
): { pieces: PlacedRoadPiece[]; endCursor: Cursor } {
  const layout = buildModularTrackLayout();
  const cursor: Cursor = { x: 0, y: 0, z: startZ, heading: Math.PI };
  const pieces: PlacedRoadPiece[] = [];

  layout.forEach((segment, index) => {
    if (segment.type === 'straight') {
      for (let i = 0; i < segment.tiles; i++) {
        const placed = placePiece(scene, ROAD_PIECES.straight, cursor, `straight_${index}_${i}`);
        pieces.push(placed);
      }
      return;
    }

    const def = ROAD_PIECES[segment.type];
    const placed = placePiece(scene, def, cursor, `${segment.type}_${index}`);
    pieces.push(placed);
  });

  return { pieces, endCursor: cursor };
}

export function layoutToSegments(): ModularSegment[] {
  return buildModularTrackLayout();
}
