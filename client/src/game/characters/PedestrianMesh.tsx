import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const PEDESTRIAN_GLB = '/assets/characters/hoodie-character.glb';
const TARGET_HEIGHT = 1.75;

function isPBRMaterial(mat: THREE.Material): mat is THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial {
  return mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial;
}

function shouldPaintMesh(name: string, materialName: string) {
  const label = `${name} ${materialName}`.toLowerCase();
  return !/skin|face|head|hair|eye|hand|foot|shoe|pupil|teeth|lip/i.test(label);
}

function tuneMaterial(mat: THREE.Material, color: string, paint: boolean) {
  if (!isPBRMaterial(mat)) return;

  mat.side = THREE.DoubleSide;

  if (paint) {
    mat.color.set(color);
    mat.metalness = 0.1;
    mat.roughness = 0.75;
    if (mat.map) mat.map = null;
  }
}

export function PedestrianMesh({ color }: { color: string }) {
  const { scene } = useGLTF(PEDESTRIAN_GLB);
  const bodyMaterialsRef = useRef<THREE.MeshStandardMaterial[]>([]);

  const { model, scale, offset } = useMemo(() => {
    const cloned = scene.clone(true);
    const bodyMaterials: THREE.MeshStandardMaterial[] = [];

    cloned.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;

      obj.geometry = obj.geometry.clone();
      obj.castShadow = true;
      obj.receiveShadow = true;

      const paint = shouldPaintMesh(obj.name, Array.isArray(obj.material)
        ? obj.material.map((m) => m.name).join(' ')
        : obj.material.name);

      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      const tuned = materials.map((mat) => {
        const next = mat.clone();
        tuneMaterial(next, color, paint);
        if (paint && isPBRMaterial(next)) {
          bodyMaterials.push(next);
        }
        return next;
      });
      obj.material = Array.isArray(obj.material) ? tuned : tuned[0];
    });

    cloned.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);
    const height = Math.max(size.y, 0.01);

    bodyMaterialsRef.current = bodyMaterials;

    return {
      model: cloned,
      scale: TARGET_HEIGHT / height,
      offset: [-center.x, -box.min.y, -center.z] as [number, number, number],
    };
  }, [scene, color]);

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

useGLTF.preload(PEDESTRIAN_GLB);
