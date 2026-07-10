import { useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { GLB_VEHICLE_CONFIGS } from './glbVehicleConfigs';

interface AircraftMeshProps {
  vehicleId: string;
  color: string;
  rotorSpeed?: number;
  pitch?: number;
  onGround?: boolean;
  visualRef?: MutableRefObject<{ rotorSpeed: number; pitch: number; onGround: boolean }>;
}

/** Broken GLB blade/hub meshes — hidden and replaced with procedural rotors. */
const HELI_HIDE_MESHES = new Set(['Box04_Box014', 'Box20183', 'Cylinder007', 'Cylinder006']);
const HELI_ROTOR_HUB = 'Cylinder006';
const HELI_TAIL_ANCHOR = 'Object014';
const HELI_BLADE_MESHES = ['Box04_Box014', 'Box20183'] as const;

const BLADE_MAT = { color: '#1a1a1a', metalness: 0.55, roughness: 0.35 };
const HUB_MAT = { color: '#333333', metalness: 0.6, roughness: 0.45 };

function meshBoundsCenter(obj: THREE.Object3D): THREE.Vector3 {
  const box = new THREE.Box3().setFromObject(obj);
  const center = new THREE.Vector3();
  box.getCenter(center);
  return center;
}

function meshBoundsSize(obj: THREE.Object3D): THREE.Vector3 {
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  box.getSize(size);
  return size;
}

function hideHelicopterBlades(root: THREE.Object3D): {
  mainAnchor: THREE.Vector3;
  mainBladeLen: number;
  tailAnchor: THREE.Vector3;
  tailBladeLen: number;
} {
  let hub: THREE.Object3D | null = null;
  let tail: THREE.Object3D | null = null;
  const bladeMeshes: THREE.Object3D[] = [];

  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh && HELI_HIDE_MESHES.has(obj.name)) {
      obj.visible = false;
    }
    if (obj.name === HELI_ROTOR_HUB) hub = obj;
    if (obj.name === HELI_TAIL_ANCHOR) tail = obj;
    if ((HELI_BLADE_MESHES as readonly string[]).includes(obj.name)) {
      bladeMeshes.push(obj);
    }
  });

  const hubCenter = hub ? meshBoundsCenter(hub) : new THREE.Vector3(0, 207, 0);
  const bladeCenters = bladeMeshes.map(meshBoundsCenter);
  const bladeY = bladeCenters.length > 0
    ? bladeCenters.reduce((sum, c) => sum + c.y, 0) / bladeCenters.length
    : hubCenter.y + 28;

  const mainAnchor = new THREE.Vector3(hubCenter.x, bladeY, hubCenter.z);

  let mainBladeLen = 440;
  if (bladeMeshes[0]) {
    const size = meshBoundsSize(bladeMeshes[0]);
    mainBladeLen = Math.max(size.x, size.y, size.z);
  }

  const tailAnchor = tail
    ? meshBoundsCenter(tail)
    : mainAnchor.clone().add(new THREE.Vector3(0, 0, 420));

  let tailBladeLen = 32;
  if (tail) {
    const size = meshBoundsSize(tail);
    tailBladeLen = Math.max(size.x, size.y, size.z) * 0.85;
  }

  return { mainAnchor, mainBladeLen, tailAnchor, tailBladeLen };
}

function buildProceduralMainRotor(bladeLen: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ProceduralMainRotor';

  const mastH = Math.max(18, bladeLen * 0.1);
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(bladeLen * 0.008, bladeLen * 0.01, mastH, 10),
    new THREE.MeshStandardMaterial(HUB_MAT),
  );
  mast.position.y = -mastH / 2;
  mast.castShadow = true;
  group.add(mast);

  const hubCap = new THREE.Mesh(
    new THREE.CylinderGeometry(bladeLen * 0.012, bladeLen * 0.012, bladeLen * 0.007, 12),
    new THREE.MeshStandardMaterial(HUB_MAT),
  );
  hubCap.castShadow = true;
  group.add(hubCap);

  const chord = bladeLen * 0.35;
  const thickness = Math.max(2.5, bladeLen * 0.008);
  for (let i = 0; i < 2; i++) {
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(bladeLen, thickness, chord),
      new THREE.MeshStandardMaterial(BLADE_MAT),
    );
    blade.rotation.y = (i * Math.PI) / 2;
    blade.castShadow = true;
    group.add(blade);
  }

  return group;
}

function buildProceduralTailRotor(bladeLen: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ProceduralTailRotor';

  const thickness = Math.max(1.2, bladeLen * 0.06);
  for (let i = 0; i < 2; i++) {
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(thickness, bladeLen, bladeLen * 0.07),
      new THREE.MeshStandardMaterial(BLADE_MAT),
    );
    blade.rotation.z = (i * Math.PI) / 2;
    blade.castShadow = true;
    group.add(blade);
  }

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(bladeLen * 0.06, bladeLen * 0.06, thickness * 2, 8),
    new THREE.MeshStandardMaterial(HUB_MAT),
  );
  hub.rotation.z = Math.PI / 2;
  group.add(hub);

  return group;
}

function isPBRMaterial(mat: THREE.Material): mat is THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial {
  return mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial;
}

function setupAirplaneProp(root: THREE.Object3D): THREE.Group | null {
  const props: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (/propeller|prop|blade|Cylinder005/i.test(obj.name) && obj instanceof THREE.Mesh) {
      props.push(obj);
    }
  });
  if (props.length === 0) return null;

  const spinner = new THREE.Group();
  const pivot = props[0].position.clone();
  spinner.position.copy(pivot);
  root.add(spinner);
  for (const p of props) spinner.attach(p);
  return spinner;
}

function AircraftModel({ vehicleId, color, rotorSpeed = 0, pitch = 0, onGround = false, visualRef }: AircraftMeshProps) {
  const config = GLB_VEHICLE_CONFIGS[vehicleId];
  const { scene } = useGLTF(config.path);
  const mainRotorRef = useRef<THREE.Group | null>(null);
  const tailRotorRef = useRef<THREE.Group | null>(null);
  const propSpinnerRef = useRef<THREE.Group | null>(null);
  const mainRotorSpin = useRef(0);
  const tailRotorSpin = useRef(0);

  const { model, scale, offset } = useMemo(() => {
    const cloned = scene.clone(true);
    let mainRotorGroup: THREE.Group | null = null;
    let tailRotorGroup: THREE.Group | null = null;
    propSpinnerRef.current = null;

    if (vehicleId === 'helicopter') {
      const { mainAnchor, mainBladeLen, tailAnchor, tailBladeLen } = hideHelicopterBlades(cloned);
      mainRotorGroup = buildProceduralMainRotor(mainBladeLen);
      mainRotorGroup.position.copy(mainAnchor);
      cloned.add(mainRotorGroup);

      tailRotorGroup = buildProceduralTailRotor(tailBladeLen);
      tailRotorGroup.position.copy(tailAnchor);
      cloned.add(tailRotorGroup);
    } else {
      propSpinnerRef.current = setupAirplaneProp(cloned);
    }

    cloned.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (!obj.visible) return;
      obj.geometry = obj.geometry.clone();
      obj.castShadow = true;
      obj.receiveShadow = true;

      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      const tuned = materials.map((mat) => {
        const next = mat.clone();
        if (isPBRMaterial(next)) {
          next.side = THREE.DoubleSide;
          if (config.paintMesh?.(obj.name) ?? true) {
            next.color.set(color);
            next.metalness = 0.4;
            next.roughness = 0.45;
          } else if (/glass|window/i.test(obj.name)) {
            next.transparent = true;
            next.opacity = 0.45;
            next.color.set('#1a2530');
          } else {
            next.color.set('#333');
            next.metalness = 0.5;
            next.roughness = 0.5;
          }
        }
        return next;
      });
      obj.material = Array.isArray(obj.material) ? tuned : tuned[0];
    });

    mainRotorRef.current = mainRotorGroup;
    tailRotorRef.current = tailRotorGroup;

    const oriented = new THREE.Group();
    oriented.add(cloned);
    if (config.modelRotation) {
      oriented.rotation.set(...config.modelRotation);
    }

    const box = new THREE.Box3().setFromObject(oriented);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);

    return {
      model: oriented,
      scale: config.targetSize / maxDim,
      offset: [-center.x, -box.min.y, -center.z] as [number, number, number],
    };
  }, [scene, config, vehicleId, color]);

  useFrame((_, delta) => {
    const rs = visualRef?.current.rotorSpeed ?? rotorSpeed;
    const idle = vehicleId === 'helicopter' ? 14 : 4;
    const spinRate = vehicleId === 'helicopter'
      ? idle + rs * 32
      : onGround ? idle + rs * 6 : 8 + rs * 12;

    mainRotorSpin.current += spinRate * delta;
    tailRotorSpin.current += spinRate * 1.8 * delta;

    if (mainRotorRef.current) {
      mainRotorRef.current.rotation.y = mainRotorSpin.current;
    }
    if (tailRotorRef.current) {
      tailRotorRef.current.rotation.x = tailRotorSpin.current;
    }
    if (propSpinnerRef.current) {
      propSpinnerRef.current.rotation.z = mainRotorSpin.current;
    }
  });

  const livePitch = visualRef?.current.pitch ?? pitch;

  return (
    <group rotation={[livePitch, 0, 0]}>
      <group scale={scale}>
        <group position={offset}>
          <primitive object={model} />
        </group>
      </group>
    </group>
  );
}

export function AircraftMesh(props: AircraftMeshProps) {
  return <AircraftModel {...props} />;
}

for (const id of ['helicopter', 'airplane', 'fighter_jet']) {
  const cfg = GLB_VEHICLE_CONFIGS[id];
  if (cfg) useGLTF.preload(cfg.path);
}
