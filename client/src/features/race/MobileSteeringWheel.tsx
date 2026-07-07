import { Suspense, useMemo, useRef, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const WHEEL_GLB = '/assets/controls/steering-wheel.glb';
const MAX_WHEEL_ROT = Math.PI * 0.42;

function WheelModel({ rotation }: { rotation: number }) {
  const { scene } = useGLTF(WHEEL_GLB);
  const groupRef = useRef<THREE.Group>(null);

  const model = useMemo(() => {
    const cloned = scene.clone(true);
    cloned.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    const box = new THREE.Box3().setFromObject(cloned);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = maxDim > 0 ? 1.6 / maxDim : 0.01;
    cloned.scale.setScalar(scale);
    box.setFromObject(cloned);
    const center = box.getCenter(new THREE.Vector3());
    cloned.position.sub(center);
    return cloned;
  }, [scene]);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.z = rotation;
    }
  });

  return (
    <group ref={groupRef} rotation={[Math.PI / 2, 0, 0]}>
      <primitive object={model} />
    </group>
  );
}

function WheelScene({ rotation }: { rotation: number }) {
  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[2, 4, 5]} intensity={1.1} />
      <WheelModel rotation={rotation} />
    </>
  );
}

interface MobileSteeringWheelProps {
  rotation: number;
  onRotationChange: (rotation: number, steer: number) => void;
  onRelease: () => void;
}

export function MobileSteeringWheel({ rotation, onRotationChange, onRelease }: MobileSteeringWheelProps) {
  const activeRef = useRef(false);
  const startAngleRef = useRef(0);
  const startRotationRef = useRef(0);
  const areaRef = useRef<HTMLDivElement>(null);

  const getAngle = useCallback((clientX: number, clientY: number) => {
    const el = areaRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return Math.atan2(clientY - cy, clientX - cx);
  }, []);

  const applyRotation = useCallback((rot: number) => {
    const clamped = Math.max(-MAX_WHEEL_ROT, Math.min(MAX_WHEEL_ROT, rot));
    onRotationChange(clamped, clamped / MAX_WHEEL_ROT);
  }, [onRotationChange]);

  const onTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    activeRef.current = true;
    startAngleRef.current = getAngle(touch.clientX, touch.clientY);
    startRotationRef.current = rotation;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!activeRef.current) return;
    e.preventDefault();
    const touch = e.touches[0];
    const angle = getAngle(touch.clientX, touch.clientY);
    const delta = angle - startAngleRef.current;
    applyRotation(startRotationRef.current - delta);
  };

  const onTouchEnd = () => {
    activeRef.current = false;
    onRelease();
  };

  return (
    <div
      ref={areaRef}
      className="relative w-36 h-36 pointer-events-auto touch-none select-none"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <Canvas
        className="rounded-full bg-black/35 border border-white/15"
        camera={{ position: [0, 0, 2.4], fov: 42 }}
        gl={{ alpha: true, antialias: true }}
      >
        <Suspense fallback={null}>
          <WheelScene rotation={rotation} />
        </Suspense>
      </Canvas>
      <div className="absolute bottom-1 left-0 right-0 text-center text-[10px] text-gray-400 pointer-events-none">
        STEER
      </div>
    </div>
  );
}

useGLTF.preload(WHEEL_GLB);
