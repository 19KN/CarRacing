import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const BIG_TREE_GLB = '/assets/props/big-tree.glb';
const TARGET_HEIGHT = 10;

export function BigTreeMesh({ scale = 1 }: { scale?: number }) {
  const { scene } = useGLTF(BIG_TREE_GLB);

  const { model, treeScale, offset } = useMemo(() => {
    const cloned = scene.clone(true);
    cloned.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });

    cloned.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    box.getSize(size);
    const height = Math.max(size.y, 0.01);
    const uniformScale = (TARGET_HEIGHT / height) * scale;

    return {
      model: cloned,
      treeScale: uniformScale,
      offset: [-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2] as [number, number, number],
    };
  }, [scene, scale]);

  return (
    <group scale={treeScale}>
      <group position={offset}>
        <primitive object={model} />
      </group>
    </group>
  );
}

useGLTF.preload(BIG_TREE_GLB);
