import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { GLB_VEHICLE_CONFIGS } from './glbVehicleConfigs';

interface GLBVehicleMeshProps {
  vehicleId: string;
  color: string;
}

function isPBRMaterial(mat: THREE.Material): mat is THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial {
  return mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial;
}

function tuneMaterial(
  mat: THREE.Material,
  color: string,
  role: 'body' | 'glass' | 'wheel' | 'default',
) {
  if (!isPBRMaterial(mat)) return;

  mat.side = THREE.DoubleSide;

  if (role === 'glass') {
    mat.transparent = true;
    mat.opacity = 0.5;
    mat.color.set('#0d1520');
    mat.metalness = 0.5;
    mat.roughness = 0.2;
    mat.depthWrite = false;
    return;
  }

  if (role === 'wheel') {
    mat.color.set('#1a1a1a');
    mat.metalness = 0.2;
    mat.roughness = 0.85;
    mat.metalnessMap = null;
    mat.roughnessMap = null;
    if (mat.map) mat.map = null;
    return;
  }

  if (role === 'body') {
    mat.color.set(color);
    mat.metalness = 0.35;
    mat.roughness = 0.4;
    mat.metalnessMap = null;
    mat.roughnessMap = null;
    mat.envMapIntensity = 1;
    if (mat.map) mat.map = null;
  }
}

function fixWheelPivot(mesh: THREE.Mesh) {
  mesh.geometry = mesh.geometry.clone();
  mesh.geometry.computeBoundingBox();
  const center = new THREE.Vector3();
  mesh.geometry.boundingBox!.getCenter(center);
  mesh.geometry.translate(-center.x, -center.y, -center.z);
  mesh.position.copy(center);
}

function getMeshRole(
  name: string,
  config: (typeof GLB_VEHICLE_CONFIGS)[string],
): 'body' | 'glass' | 'wheel' | 'default' {
  if (config.isGlass?.(name)) return 'glass';
  if (config.isWheel?.(name)) return 'wheel';
  if (config.paintMesh) {
    return config.paintMesh(name) ? 'body' : 'default';
  }
  return 'body';
}

function GLBModel({ vehicleId, color }: GLBVehicleMeshProps) {
  const config = GLB_VEHICLE_CONFIGS[vehicleId];
  const { scene } = useGLTF(config.path);
  const bodyMaterialsRef = useRef<THREE.MeshStandardMaterial[]>([]);

  const { model, scale, offset } = useMemo(() => {
    const cloned = scene.clone(true);
    const bodyMaterials: THREE.MeshStandardMaterial[] = [];

    cloned.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;

      obj.geometry = obj.geometry.clone();
      obj.castShadow = true;
      obj.receiveShadow = true;

      const role = getMeshRole(obj.name, config);
      if (role === 'wheel' && config.fixWheelPivots) {
        fixWheelPivot(obj);
      }

      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      const tuned = materials.map((mat) => {
        const next = mat.clone();
        let effectiveRole = role;
        if (vehicleId === 'bicycle' && /black/i.test(mat.name)) effectiveRole = 'wheel';
        tuneMaterial(next, color, effectiveRole);
        if (effectiveRole === 'body' && isPBRMaterial(next)) {
          bodyMaterials.push(next);
        }
        return next;
      });
      obj.material = Array.isArray(obj.material) ? tuned : tuned[0];
    });

    cloned.updateMatrixWorld(true);

    const oriented = new THREE.Group();
    oriented.add(cloned);
    if (config.modelRotation) {
      oriented.rotation.set(...config.modelRotation);
    }
    oriented.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(oriented);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);

    bodyMaterialsRef.current = bodyMaterials;

    return {
      model: oriented,
      scale: config.targetSize / maxDim,
      offset: [-center.x, -box.min.y, -center.z] as [number, number, number],
    };
  }, [scene, config, vehicleId]);

  useEffect(() => {
    for (const mat of bodyMaterialsRef.current) {
      mat.color.set(color);
    }
  }, [color]);

  return (
    <group scale={scale}>
      <group position={offset}>
        <primitive object={model} />
      </group>
    </group>
  );
}

export function GLBVehicleMesh({ vehicleId, color }: GLBVehicleMeshProps) {
  return <GLBModel vehicleId={vehicleId} color={color} />;
}

for (const config of Object.values(GLB_VEHICLE_CONFIGS)) {
  useGLTF.preload(config.path);
}
