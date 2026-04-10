import React, { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';

interface MMOPlayerProps {
  playerId: string;
  onUpdate: (position: THREE.Vector3, rotation: number) => void;
}

const MMOPlayer: React.FC<MMOPlayerProps> = ({ playerId, onUpdate }) => {
  const { camera, gl } = useThree();
  const playerRef = useRef<THREE.Group>(null);

  const [position, setPosition] = useState(new THREE.Vector3(0, 1, 0));
  const [velocity, setVelocity] = useState(new THREE.Vector3(0, 0, 0));
  const [rotation, setRotation] = useState(0);
  const [isGrounded, setIsGrounded] = useState(true);
  const [stamina, setStamina] = useState(100);

  const [, get] = useKeyboardControls();

  const mouseX = useRef(0);
  const mouseY = useRef(0);
  const isPointerLocked = useRef(false);

  React.useEffect(() => {
    const handlePointerLockChange = () => {
      isPointerLocked.current = document.pointerLockElement === gl.domElement;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isPointerLocked.current) {
        mouseX.current -= e.movementX * 0.002;
        mouseY.current = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, mouseY.current - e.movementY * 0.002));
      }
    };

    const handleClick = () => {
      gl.domElement.requestPointerLock();
    };

    document.addEventListener('pointerlockchange', handlePointerLockChange);
    gl.domElement.addEventListener('mousemove', handleMouseMove);
    gl.domElement.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      gl.domElement.removeEventListener('mousemove', handleMouseMove);
      gl.domElement.removeEventListener('click', handleClick);
    };
  }, [gl]);

  useFrame((state, delta) => {
    const { forward, backward, left, right, jump, sprint } = get();

    const moveSpeed = sprint && stamina > 0 ? 8 : 4;
    const acceleration = 30;
    const friction = 10;
    const jumpForce = 8;
    const gravity = -25;

    let inputVector = new THREE.Vector3(0, 0, 0);

    if (forward) inputVector.z -= 1;
    if (backward) inputVector.z += 1;
    if (left) inputVector.x -= 1;
    if (right) inputVector.x += 1;

    if (inputVector.length() > 0) {
      inputVector.normalize();
      inputVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), mouseX.current);
    }

    const newVelocity = velocity.clone();

    newVelocity.x += inputVector.x * acceleration * delta;
    newVelocity.z += inputVector.z * acceleration * delta;

    newVelocity.x *= Math.pow(1 - friction * delta, delta);
    newVelocity.z *= Math.pow(1 - friction * delta, delta);

    const horizontalSpeed = Math.sqrt(newVelocity.x ** 2 + newVelocity.z ** 2);
    if (horizontalSpeed > moveSpeed) {
      const scale = moveSpeed / horizontalSpeed;
      newVelocity.x *= scale;
      newVelocity.z *= scale;
    }

    if (sprint && (forward || backward || left || right) && stamina > 0) {
      setStamina(prev => Math.max(0, prev - 30 * delta));
    } else {
      setStamina(prev => Math.min(100, prev + 20 * delta));
    }

    if (jump && isGrounded) {
      newVelocity.y = jumpForce;
      setIsGrounded(false);
    }

    if (!isGrounded) {
      newVelocity.y += gravity * delta;
    }

    const newPosition = position.clone();
    newPosition.x += newVelocity.x * delta;
    newPosition.y += newVelocity.y * delta;
    newPosition.z += newVelocity.z * delta;

    if (newPosition.y <= 1) {
      newPosition.y = 1;
      newVelocity.y = 0;
      setIsGrounded(true);
    } else {
      setIsGrounded(false);
    }

    const worldRadius = 100;
    const distFromCenter = Math.sqrt(newPosition.x ** 2 + newPosition.z ** 2);
    if (distFromCenter > worldRadius) {
      const angle = Math.atan2(newPosition.z, newPosition.x);
      newPosition.x = Math.cos(angle) * worldRadius;
      newPosition.z = Math.sin(angle) * worldRadius;
      newVelocity.x = 0;
      newVelocity.z = 0;
    }

    setPosition(newPosition);
    setVelocity(newVelocity);
    setRotation(mouseX.current);

    onUpdate(newPosition, mouseX.current);
  });

  return (
    <group ref={playerRef} position={position}>
      <mesh castShadow receiveShadow>
        <capsuleGeometry args={[0.5, 1.5, 8, 16]} />
        <meshStandardMaterial
          color="#ff3366"
          metalness={0.3}
          roughness={0.7}
        />
      </mesh>

      <mesh position={[0, 1.2, 0]} castShadow>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#ffccdd" />
      </mesh>

      {stamina < 100 && (
        <mesh position={[0, 2.5, 0]}>
          <planeGeometry args={[1, 0.1]} />
          <meshBasicMaterial color="#00ff00" transparent opacity={0.7} />
        </mesh>
      )}

      <pointLight
        position={[0, 1, 0]}
        intensity={0.5}
        distance={5}
        color="#ff3366"
      />
    </group>
  );
};

export default MMOPlayer;
