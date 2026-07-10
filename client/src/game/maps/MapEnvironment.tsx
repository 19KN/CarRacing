import { MapConfig, getMapRoadLength, getMapRaceDistance, samplePathByZ } from '@indian-racing/shared';
import { IndianHighwayRoad } from './IndianHighwayRoad';
import { GhatRoad } from './GhatRoad';
import { AerialEnvironment } from './AerialEnvironment';
import { MedianLife } from './MedianLife';
import { FinishLine } from './FinishLine';
import { getFinishLineZ } from '../../utils/soloRace';

export function MapEnvironment({ map }: { map: MapConfig }) {
  const roadLength = getMapRoadLength(map);
  const finishZ = getFinishLineZ(getMapRaceDistance(map));
  const isGhat = map.roadType === 'hill';
  const isAerial = map.roadType === 'aerial';
  const finishPoint = isGhat ? samplePathByZ(map.checkpoints, finishZ) : null;

  return (
    <group>
      {isGhat ? (
        <GhatRoad points={map.checkpoints} />
      ) : isAerial ? (
        <AerialEnvironment map={map} />
      ) : (
        <IndianHighwayRoad points={map.checkpoints} />
      )}

      {!isGhat && !isAerial && <MedianLife roadLength={roadLength} />}

      {finishPoint ? (
        <group position={[finishPoint.x, finishPoint.y, finishPoint.z]} rotation={[0, finishPoint.rotation, 0]}>
          <FinishLine z={0} />
        </group>
      ) : !isAerial ? (
        <FinishLine z={finishZ} />
      ) : null}

      {!isGhat && !isAerial && (
        <mesh position={[0, 20, -roadLength - 200]}>
          <boxGeometry args={[6000, 60, 300]} />
          <meshStandardMaterial color="#7a8a6a" />
        </mesh>
      )}

      {isGhat && (
        <>
          <mesh position={[0, 35, -roadLength * 0.4]}>
            <boxGeometry args={[500, 100, 500]} />
            <meshStandardMaterial color="#8aa8b8" transparent opacity={0.22} depthWrite={false} />
          </mesh>
          <mesh position={[0, 25, -roadLength * 0.55]}>
            <boxGeometry args={[350, 70, 350]} />
            <meshStandardMaterial color="#9ab8c8" transparent opacity={0.14} depthWrite={false} />
          </mesh>
        </>
      )}
    </group>
  );
}
