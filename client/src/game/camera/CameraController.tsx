import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CameraMode } from '@indian-racing/shared';
import { collisionShake, decayCollisionShake } from '../effects/collisionFeedback';

export const CAM_HEIGHT = 6.0;
export const CAM_LOOK_HEIGHT = 1.0;
export const CAM_DISTANCE = 10;
const CAM_LOOK_AHEAD = 18;
const CAM_SMOOTH = 14;

function forwardVector(rot: number, out: THREE.Vector3) {
  return out.set(Math.sin(rot), 0, Math.cos(rot));
}

export function useCameraController(mode: CameraMode, target: React.RefObject<THREE.Group | null>) {
  const { camera } = useThree();
  const cinematicAngle = useRef(0);
  const lookTarget = useRef(new THREE.Vector3());
  const forward = useRef(new THREE.Vector3());
  const smoothedCam = useRef(new THREE.Vector3());
  const smoothedLook = useRef(new THREE.Vector3());
  const initialized = useRef(false);
  const lastMode = useRef(mode);

  useFrame((_, delta) => {
    if (!target.current) return;
    if (lastMode.current !== mode) {
      initialized.current = false;
      lastMode.current = mode;
    }
    const pos = target.current.position;
    const rot = target.current.rotation.y;
    const dt = Math.min(delta, 0.05);
    const fwd = forwardVector(rot, forward.current);
    const vehicleY = pos.y;

    const lookAt = lookTarget.current.set(
      pos.x + fwd.x * CAM_LOOK_AHEAD,
      vehicleY + CAM_LOOK_HEIGHT,
      pos.z + fwd.z * CAM_LOOK_AHEAD,
    );
    decayCollisionShake(dt);
    const shake = collisionShake.intensity;
    const shakeX = shake > 0 ? (Math.random() - 0.5) * shake * 1.4 : 0;
    const shakeY = shake > 0 ? (Math.random() - 0.5) * shake * 0.9 : 0;
    const shakeZ = shake > 0 ? (Math.random() - 0.5) * shake * 1.4 : 0;

    let desiredCam = smoothedCam.current;

    switch (mode) {
      case 'firstPerson': {
        desiredCam.set(
          pos.x + fwd.x * 0.5,
          vehicleY + CAM_LOOK_HEIGHT + 0.7,
          pos.z + fwd.z * 0.5,
        );
        break;
      }
      case 'thirdPerson': {
        desiredCam.set(
          pos.x - fwd.x * CAM_DISTANCE,
          vehicleY + CAM_HEIGHT,
          pos.z - fwd.z * CAM_DISTANCE,
        );
        break;
      }
      case 'topView': {
        desiredCam.set(pos.x, vehicleY + CAM_HEIGHT + 24, pos.z);
        lookAt.set(pos.x, vehicleY, pos.z);
        break;
      }
      case 'freeCamera': {
        desiredCam.set(
          pos.x - Math.sin(rot + Math.PI / 4) * 15,
          vehicleY + CAM_HEIGHT + 4,
          pos.z - Math.cos(rot + Math.PI / 4) * 15,
        );
        break;
      }
      case 'cinematic': {
        cinematicAngle.current += dt * 0.3;
        const angle = rot + cinematicAngle.current;
        desiredCam.set(
          pos.x - Math.sin(angle) * 12,
          vehicleY + CAM_HEIGHT,
          pos.z - Math.cos(angle) * 12,
        );
        break;
      }
    }

    if (!initialized.current) {
      smoothedCam.current.copy(desiredCam);
      smoothedLook.current.copy(lookAt);
      initialized.current = true;
    } else if (mode === 'thirdPerson' || mode === 'firstPerson') {
      const blend = 1 - Math.exp(-CAM_SMOOTH * dt);
      smoothedCam.current.lerp(desiredCam, blend);
      smoothedLook.current.lerp(lookAt, blend);
      desiredCam = smoothedCam.current;
      lookAt.copy(smoothedLook.current);
    }

    camera.position.copy(desiredCam);

    if (shake > 0) {
      camera.position.x += shakeX;
      camera.position.y += shakeY;
      camera.position.z += shakeZ;
    }

    camera.lookAt(lookAt);
  });
}

export function useCameraSwitcher() {
  const modes: CameraMode[] = ['thirdPerson', 'firstPerson', 'topView', 'freeCamera', 'cinematic'];
  const indexRef = useRef(0);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyC') {
        indexRef.current = (indexRef.current + 1) % modes.length;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return {
    getMode: () => modes[indexRef.current],
    cycleMode: () => { indexRef.current = (indexRef.current + 1) % modes.length; },
    modes,
    indexRef,
  };
}
