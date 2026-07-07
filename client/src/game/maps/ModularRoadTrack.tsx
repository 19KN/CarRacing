import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { MODULAR_ROAD_GLB, buildModularRoadPlacements } from './modularRoadConfig';

export function ModularRoadTrack({ startZ = 30 }: { startZ?: number }) {
  const { scene } = useGLTF(MODULAR_ROAD_GLB);

  const placements = useMemo(
    () => buildModularRoadPlacements(scene, startZ),
    [scene, startZ],
  );

  return (
    <group>
      {placements.pieces.map((p) => (
        <primitive key={p.key} object={p.piece} />
      ))}
    </group>
  );
}

useGLTF.preload(MODULAR_ROAD_GLB);
