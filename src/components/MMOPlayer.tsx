import React, { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  RigidBody,
  CapsuleCollider,
  useRapier,
  type RapierRigidBody,
} from '@react-three/rapier';
import type { KinematicCharacterController } from '@dimforge/rapier3d-compat';
import CharacterModel from './CharacterModel';
import { gameAudio } from '../lib/gameAudio';
import { useGameStore } from '../store/gameState';
import { PLAYER_CAPSULE, CHARACTER_CONTROLLER } from '../game/physicsColliders';
import type { GearLevel, ArchetypeId } from '../game/character';

interface MMOPlayerProps {
  playerId: string;
  onUpdate: (position: THREE.Vector3, rotation: number) => void;
  flashApi?: React.MutableRefObject<(() => void) | null>;
  /** Live stamina written every frame for the HUD (no React re-render). */
  staminaRef?: React.MutableRefObject<number>;
  tint?: string;
  accent?: string;
  accent2?: string;
  skinTone?: string;
  gear?: GearLevel;
  archetype?: ArchetypeId;
  bodyScale?: number;
  /** Hide mesh while driving a vehicle. */
  hiddenRef?: React.MutableRefObject<boolean>;
  /** When true, skip locomotion (vehicle owns position). */
  drivingRef?: React.MutableRefObject<boolean>;
  /** Snap back after vehicle exit / respawn. */
  externalPosRef?: React.MutableRefObject<THREE.Vector3>;
}

const MMOPlayer: React.FC<MMOPlayerProps> = ({
  playerId,
  onUpdate,
  flashApi,
  staminaRef,
  tint = '#d4d5d8',
  accent = '#c03a30',
  accent2 = '#2b2f36',
  skinTone = '#e0b48c',
  gear = 'none',
  archetype,
  bodyScale = 1,
  hiddenRef,
  drivingRef,
  externalPosRef,
}) => {
  const { gl } = useThree();
  const { world } = useRapier();
  const bodyRef = useRef<RapierRigidBody>(null);
  const controllerRef = useRef<KinematicCharacterController | null>(null);
  const visualRef = useRef<THREE.Group>(null);
  const flash = useRef(0);
  const speedRef = useRef(0);

  // Per-frame mutable physics state — refs, not React state, so the hot
  // loop never re-renders. Rapier's kinematic controller owns collision;
  // we own acceleration/friction/gravity so the game feel is unchanged.
  const velocity = useRef(new THREE.Vector3(0, 0, 0));
  const grounded = useRef(true);
  const desired = useRef(new THREE.Vector3());
  const outPos = useRef(new THREE.Vector3(0, PLAYER_CAPSULE.centerY, 0));

  const [stamina, setStamina] = useState(100);

  const [, get] = useKeyboardControls();

  // One character controller per mounted player; configured for street
  // furniture (autostep), slopes and downhill ground snapping.
  useEffect(() => {
    const ctrl = world.createCharacterController(CHARACTER_CONTROLLER.offset);
    ctrl.setApplyImpulsesToDynamicBodies(false);
    ctrl.enableAutostep(
      CHARACTER_CONTROLLER.autostepMaxHeight,
      CHARACTER_CONTROLLER.autostepMinWidth,
      true
    );
    ctrl.enableSnapToGround(CHARACTER_CONTROLLER.snapToGroundDistance);
    ctrl.setMaxSlopeClimbAngle(CHARACTER_CONTROLLER.maxSlopeClimbAngle);
    controllerRef.current = ctrl;
    return () => {
      controllerRef.current = null;
      world.removeCharacterController(ctrl);
    };
  }, [world]);

  React.useEffect(() => {
    if (!flashApi) return;
    flashApi.current = () => {
      flash.current = 1;
    };
    return () => {
      flashApi.current = null;
    };
  }, [flashApi]);

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
        mouseY.current = Math.max(
          -Math.PI / 2,
          Math.min(Math.PI / 2, mouseY.current - e.movementY * 0.002)
        );
      }
    };

    const handleClick = () => {
      gl.domElement.requestPointerLock();
    };

    document.addEventListener('pointerlockchange', handlePointerLockChange);
    gl.domElement.addEventListener('mousemove', handleMouseMove);
    gl.domElement.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener(
        'pointerlockchange',
        handlePointerLockChange
      );
      gl.domElement.removeEventListener('mousemove', handleMouseMove);
      gl.domElement.removeEventListener('click', handleClick);
    };
  }, [gl]);

  useFrame((state, delta) => {
    const body = bodyRef.current;
    const controller = controllerRef.current;
    if (!body || !controller) return;

    if (drivingRef?.current) {
      // Vehicle owns locomotion; hide on-foot mesh and mirror camera target.
      if (visualRef.current) {
        visualRef.current.visible = false;
      }
      speedRef.current = 0;
      return;
    }

    if (visualRef.current) visualRef.current.visible = !hiddenRef?.current;

    const t = body.translation();
    outPos.current.set(t.x, t.y, t.z);

    // After exiting a vehicle, snap on-foot controller to world position.
    if (externalPosRef) {
      const e = externalPosRef.current;
      if (outPos.current.distanceToSquared(e) > 6) {
        body.setTranslation({ x: e.x, y: e.y, z: e.z }, true);
        outPos.current.copy(e);
        velocity.current.set(0, 0, 0);
      }
    }

    const { forward, backward, left, right, jump, sprint } = get();

    // Soft gamepad support (first connected pad).
    let padFwd = 0;
    let padRight = 0;
    let padJump = false;
    let padSprint = false;
    let lookDx = 0;
    let lookDy = 0;
    try {
      const pads = navigator.getGamepads?.() || [];
      const gp = pads[0] || pads[1];
      if (gp) {
        const dead = 0.22;
        const lx = Math.abs(gp.axes[0]) > dead ? gp.axes[0] : 0;
        const ly = Math.abs(gp.axes[1]) > dead ? gp.axes[1] : 0;
        const rx = Math.abs(gp.axes[2]) > dead ? gp.axes[2] : 0;
        const ry = Math.abs(gp.axes[3]) > dead ? gp.axes[3] : 0;
        padRight = lx;
        padFwd = -ly;
        lookDx = -rx * 0.04;
        lookDy = -ry * 0.03;
        padJump = gp.buttons[0]?.pressed || false;
        padSprint =
          gp.buttons[6]?.pressed ||
          gp.buttons[7]?.pressed ||
          gp.buttons[10]?.pressed ||
          false;
      }
    } catch {
      /* ignore */
    }

    if (lookDx || lookDy) {
      mouseX.current += lookDx;
      mouseY.current = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2, mouseY.current + lookDy)
      );
    }

    const moveSpeed = (sprint || padSprint) && stamina > 0 ? 8 : 4;
    const acceleration = 30;
    const friction = 10;
    const jumpForce = 8;
    const gravity = -25;

    const inputVector = new THREE.Vector3(0, 0, 0);

    if (forward) inputVector.z -= 1;
    if (backward) inputVector.z += 1;
    if (left) inputVector.x -= 1;
    if (right) inputVector.x += 1;
    inputVector.x += padRight;
    inputVector.z -= padFwd;

    if (inputVector.length() > 0) {
      inputVector.normalize();
      inputVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), mouseX.current);
    }

    const newVelocity = velocity.current;

    newVelocity.x += inputVector.x * acceleration * delta;
    newVelocity.z += inputVector.z * acceleration * delta;

    newVelocity.x *= Math.max(0, 1 - friction * delta);
    newVelocity.z *= Math.max(0, 1 - friction * delta);

    const horizontalSpeedSq =
      newVelocity.x * newVelocity.x + newVelocity.z * newVelocity.z;
    if (horizontalSpeedSq > moveSpeed * moveSpeed) {
      const horizontalSpeed = Math.sqrt(horizontalSpeedSq);
      const scale = moveSpeed / horizontalSpeed;
      newVelocity.x *= scale;
      newVelocity.z *= scale;
    }

    let nextStamina = stamina;
    const drainMod = useGameStore.getState().getModifiers().staminaDrain;
    const moving =
      forward ||
      backward ||
      left ||
      right ||
      Math.abs(padFwd) > 0.05 ||
      Math.abs(padRight) > 0.05;
    if ((sprint || padSprint) && moving && stamina > 0) {
      nextStamina = Math.max(0, stamina - 30 * drainMod * delta);
    } else {
      nextStamina = Math.min(100, stamina + 20 * delta);
    }
    if (nextStamina !== stamina) setStamina(nextStamina);
    if (staminaRef) staminaRef.current = nextStamina;

    if ((jump || padJump) && grounded.current) {
      newVelocity.y = jumpForce;
      grounded.current = false;
    } else if (grounded.current) {
      // Small downward bias keeps the controller pressed to the ground so
      // snap-to-ground / autostep engage on step descent instead of
      // micro-hops (grounded frames zero to -1, not 0 — see below).
      newVelocity.y = -1;
    } else {
      newVelocity.y += gravity * delta;
    }

    // Ask Rapier's kinematic controller how far the capsule can actually
    // move: it slides along walls, climbs steps, respects slopes and snaps
    // to the ground, using the fixed cuboids from StaticWorldColliders.
    if (body.numColliders() === 0) return;
    desired.current
      .set(newVelocity.x, newVelocity.y, newVelocity.z)
      .multiplyScalar(delta);
    controller.computeColliderMovement(body.collider(0), desired.current);
    const move = controller.computedMovement();
    grounded.current = controller.computedGrounded();
    // Reset to the bias value (not 0) while grounded so the branch above
    // keeps pressing down next frame; airborne keeps accumulating gravity.
    if (grounded.current && newVelocity.y < 0) newVelocity.y = -1;

    const newPosition = outPos.current;
    newPosition.x += move.x;
    newPosition.y += move.y;
    newPosition.z += move.z;

    const worldRadius = 100;
    const distFromCenterSq =
      newPosition.x * newPosition.x + newPosition.z * newPosition.z;
    if (distFromCenterSq > worldRadius * worldRadius) {
      // Memory Convention: Prefer vector scaling over trigonometric functions
      const dist = Math.sqrt(distFromCenterSq);
      newPosition.x = (newPosition.x / dist) * worldRadius;
      newPosition.z = (newPosition.z / dist) * worldRadius;
      newVelocity.x = 0;
      newVelocity.z = 0;
    }

    body.setNextKinematicTranslation({
      x: newPosition.x,
      y: newPosition.y,
      z: newPosition.z,
    });

    // The RigidBody applies the translation after the physics step; keep the
    // facing on the visual group so the capsule itself never rotates.
    if (visualRef.current) {
      visualRef.current.rotation.y = mouseX.current;
    }

    // Feed the animation blender the horizontal ground speed.
    speedRef.current = Math.sqrt(
      newVelocity.x * newVelocity.x + newVelocity.z * newVelocity.z
    );

    // Procedural footsteps — free Web Audio, rate-limited inside gameAudio.
    if (grounded.current) gameAudio.footstep(speedRef.current);

    onUpdate(newPosition, mouseX.current);
  });

  return (
    <RigidBody
      ref={bodyRef}
      type="kinematicPosition"
      colliders={false}
      enabledRotations={[false, false, false]}
      // Spawn with the controller's offset of ground clearance so the
      // capsule doesn't start in exact contact and pop up on frame one.
      position={[0, PLAYER_CAPSULE.centerY + CHARACTER_CONTROLLER.offset, 0]}
    >
      <CapsuleCollider
        args={[PLAYER_CAPSULE.halfHeight, PLAYER_CAPSULE.radius]}
      />
      <group ref={visualRef}>
        {/* Rigged animated character; feet sit 1 unit below the physics
            center (capsule bottom = body center - 1, same convention as the
            old manual loop). Soldier faces +Z, forward is -Z, hence flip. */}
        <group position={[0, -1, 0]} rotation={[0, Math.PI, 0]}>
          <CharacterModel
            speedRef={speedRef}
            flashRef={flash}
            tint={tint}
            accent={accent}
            accent2={accent2}
            skinTone={skinTone}
            gear={gear}
            archetype={archetype}
            bodyScale={bodyScale}
          />
        </group>

        {stamina < 100 && (
          <mesh position={[0, 2.5, 0]}>
            <planeGeometry args={[1, 0.1]} />
            <meshBasicMaterial color="#c03a30" transparent opacity={0.7} />
          </mesh>
        )}

        <pointLight
          position={[0, 1, 0]}
          intensity={0.4}
          distance={5}
          color="#c03a30"
        />
      </group>
    </RigidBody>
  );
};

export default MMOPlayer;
