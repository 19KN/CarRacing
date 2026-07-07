import { MapConfig, getMapRoadLength, getMapRaceDistance } from '@indian-racing/shared';
import { IndianHighwayRoad } from './IndianHighwayRoad';
import { FinishLine } from './FinishLine';
import { getFinishLineZ } from '../../utils/soloRace';

export function MapEnvironment({ map }: { map: MapConfig }) {
  const roadLength = getMapRoadLength(map);
  const finishZ = getFinishLineZ(getMapRaceDistance(map));

  return (
    <group>
      <IndianHighwayRoad points={map.checkpoints} />
      <FinishLine z={finishZ} />

      {/* Distant hills */}
      <mesh position={[0, 20, -roadLength - 200]}>
        <boxGeometry args={[6000, 60, 300]} />
        <meshStandardMaterial color="#7a8a6a" />
      </mesh>
    </group>
  );
}