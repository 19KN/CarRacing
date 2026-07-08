import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';

const PEDESTRIAN_GLB = '/assets/characters/man.glb';
const TARGET_HEIGHT = 1.45;

function isPBRMaterial(mat: THREE.Material): mat is THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial {
  return mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial;
}

function shouldPaintMesh(name: string, materialName: string) {
  const label = `${name} ${materialName}`.toLowerCase();
  return !/skin|face|head|hair|eye|hand|foot|shoe|pupil|teeth|lip|beard|brow/i.test(label);
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

function pickLocomotionClip(clips: THREE.AnimationClip[], locomotion: 'walk' | 'run') {
  const walkClip = clips.find((clip) => /walk/i.test(clip.name));
  const runClip = clips.find((clip) => /run/i.test(clip.name));
  if (locomotion === 'walk') return walkClip ?? runClip ?? clips[0];
  return runClip ?? walkClip ?? clips[0];
}

function isLegBone(name: string) {
  return /leg|thigh|shin|knee|foot|ankle| calf/i.test(name);
}

function isArmBone(name: string) {
  return /arm|shoulder|elbow|hand|forearm/i.test(name);
}

export function PedestrianMesh({ color, locomotion = 'walk' }: { color: string; locomotion?: 'walk' | 'run' }) {
  const modelRef = useRef<THREE.Object3D>(null);
  const walkPhase = useRef(0);
  const legBones = useRef<THREE.Bone[]>([]);
  const armBones = useRef<THREE.Bone[]>([]);
  const { scene, animations } = useGLTF(PEDESTRIAN_GLB);
  const bodyMaterialsRef = useRef<THREE.MeshStandardMaterial[]>([]);

  const { model, scale, offset } = useMemo(() => {
    const cloned = SkeletonUtils.clone(scene) as THREE.Group;
    const bodyMaterials: THREE.MeshStandardMaterial[] = [];
    const legs: THREE.Bone[] = [];
    const arms: THREE.Bone[] = [];

    cloned.traverse((obj) => {
      if (obj instanceof THREE.Bone) {
        if (isLegBone(obj.name)) legs.push(obj);
        if (isArmBone(obj.name)) arms.push(obj);
      }

      if (!(obj instanceof THREE.Mesh)) return;

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

    legBones.current = legs;
    armBones.current = arms;
    bodyMaterialsRef.current = bodyMaterials;

    return {
      model: cloned,
      scale: TARGET_HEIGHT / height,
      offset: [-center.x, -box.min.y, -center.z] as [number, number, number],
    };
  }, [scene, color]);

  const { actions, mixer } = useAnimations(animations, modelRef);

  useEffect(() => {
    for (const mat of bodyMaterialsRef.current) {
      mat.color.set(color);
    }
  }, [color]);

  useEffect(() => {
    if (animations.length === 0) return undefined;

    const clip = pickLocomotionClip(animations, locomotion);
    const action = actions[clip?.name ?? ''];
    if (!action) return undefined;

    action.reset();
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.clampWhenFinished = false;
    action.setEffectiveTimeScale(locomotion === 'walk' ? 0.7 : 1.35);
    action.fadeIn(0.15).play();

    return () => {
      action.fadeOut(0.15);
    };
  }, [actions, animations, locomotion]);

  useFrame((_, delta) => {
    const animSpeed = locomotion === 'walk' ? 1.0 : 1.5;

    if (animations.length > 0 && mixer) {
      mixer.update(delta * animSpeed);
      return;
    }

    if (!modelRef.current) return;

    const phaseSpeed = locomotion === 'walk' ? 6.5 : 11;
    walkPhase.current += delta * phaseSpeed;
    const phase = walkPhase.current;
    const swing = Math.sin(phase) * (locomotion === 'walk' ? 0.4 : 0.65);

    modelRef.current.position.y = Math.abs(Math.sin(phase * 2)) * (locomotion === 'walk' ? 0.04 : 0.07);
    modelRef.current.rotation.x = swing * (locomotion === 'walk' ? 0.08 : 0.14);
    modelRef.current.rotation.z = Math.sin(phase * 0.5) * (locomotion === 'walk' ? 0.03 : 0.05);

    if (legBones.current.length > 0) {
      legBones.current.forEach((bone, i) => {
        bone.rotation.x = swing * (i % 2 === 0 ? 1 : -1) * (locomotion === 'walk' ? 0.35 : 0.55);
      });
    }
    if (armBones.current.length > 0) {
      armBones.current.forEach((bone, i) => {
        bone.rotation.x = swing * (i % 2 === 0 ? -1 : 1) * (locomotion === 'walk' ? 0.28 : 0.42);
      });
    }
  });

  return (
    <group scale={scale}>
      <group position={offset}>
        <primitive ref={modelRef} object={model} />
      </group>
    </group>
  );
}

useGLTF.preload(PEDESTRIAN_GLB);
