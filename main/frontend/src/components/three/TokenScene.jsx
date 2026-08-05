import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';

/*
 * The recurring 3D object is the token — the thing the product actually gives
 * you when you raise a ticket. Faceted low-poly core, wireframe shell, an orbit
 * ring, and a sparse particle field, lit violet from above and cyan from below
 * to match the brand gradient.
 *
 * This module is loaded as its own chunk by Stage3D — nothing here is on the
 * critical path for first paint.
 */

const VIOLET = '#a78bfa';
const CYAN = '#38bdf8';
const INDIGO = '#6366f1';

function TokenCore({ intensity }) {
  const core = useRef();
  const shell = useRef();
  const ring = useRef();

  useFrame((_, delta) => {
    // ~0.15 rad/s, per the motion spec. Nothing bounces, nothing draws attention.
    const t = delta * 0.15;
    if (core.current) {
      core.current.rotation.y += t;
      core.current.rotation.x += t * 0.35;
    }
    if (shell.current) {
      shell.current.rotation.y -= t * 0.6;
      shell.current.rotation.z += t * 0.2;
    }
    if (ring.current) {
      ring.current.rotation.z += t * 0.8;
    }
  });

  return (
    <group>
      {/* Faceted core */}
      <mesh ref={core}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color={INDIGO}
          flatShading
          roughness={0.35}
          metalness={0.65}
          emissive={INDIGO}
          emissiveIntensity={0.18 * intensity}
        />
      </mesh>

      {/* Wireframe shell, slightly larger — reads as the token's outline */}
      <mesh ref={shell} scale={1.42}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial
          color={VIOLET}
          wireframe
          transparent
          opacity={0.22 * intensity}
        />
      </mesh>

      {/* Orbit ring */}
      <mesh ref={ring} rotation={[Math.PI / 2.6, 0, 0]} scale={1.9}>
        <torusGeometry args={[1, 0.012, 8, 96]} />
        <meshBasicMaterial color={CYAN} transparent opacity={0.5 * intensity} />
      </mesh>
    </group>
  );
}

function Particles({ count = 140, intensity }) {
  const points = useRef();

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Spread through a shell so nothing sits on top of the core
      const r = 3 + Math.random() * 3.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    if (points.current) points.current.rotation.y += delta * 0.04;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        color={VIOLET}
        transparent
        opacity={0.55 * intensity}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// Gentle pointer parallax on the whole scene — depth cue, not an interaction
function Parallax({ children, amount }) {
  const group = useRef();

  useFrame((state, delta) => {
    if (!group.current || !amount) return;
    const targetY = state.pointer.x * amount;
    const targetX = -state.pointer.y * amount;
    // Damped follow so the scene never snaps to the cursor
    const k = 1 - Math.pow(0.001, delta);
    group.current.rotation.y += (targetY - group.current.rotation.y) * k;
    group.current.rotation.x += (targetX - group.current.rotation.x) * k;
  });

  return <group ref={group}>{children}</group>;
}

/**
 * @param {'hero'|'ambient'} variant  hero = focal object; ambient = dim backdrop
 * @param {boolean} still             render one frame and stop (reduced motion)
 * @param {boolean} paused            off-screen or tab hidden
 */
export default function TokenScene({ variant = 'hero', still = false, paused = false }) {
  const hero = variant === 'hero';
  const intensity = hero ? 1 : 0.55;

  const frameloop = still ? 'demand' : paused ? 'never' : 'always';

  return (
    <Canvas
      dpr={[1, 1.75]}
      frameloop={frameloop}
      camera={{ position: [0, 0, hero ? 6 : 7.5], fov: 45 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      style={{ pointerEvents: 'none' }}
    >
      <ambientLight intensity={0.35} />
      <pointLight position={[-4, 5, 4]} intensity={hero ? 55 : 30} color={VIOLET} distance={20} decay={2} />
      <pointLight position={[5, -4, 3]} intensity={hero ? 45 : 24} color={CYAN} distance={20} decay={2} />
      <pointLight position={[0, 0, 6]} intensity={hero ? 18 : 10} color={INDIGO} distance={16} decay={2} />

      <Parallax amount={still ? 0 : hero ? 0.12 : 0.06}>
        <group scale={hero ? 1 : 0.85}>
          <TokenCore intensity={intensity} />
          <Particles count={hero ? 140 : 80} intensity={intensity} />
        </group>
      </Parallax>

      <fog attach="fog" args={[0x0f0f13, 6, 14]} />
    </Canvas>
  );
}
