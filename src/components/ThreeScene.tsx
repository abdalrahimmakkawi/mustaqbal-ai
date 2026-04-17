import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial, Float, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

function AnimatedOrb() {
  const meshRef = useRef<THREE.Mesh>(null);
  // Initialize modern Timer
  const timer = useMemo(() => new (THREE as any).Timer(), []);

  useFrame(() => {
    timer.update();
    const elapsedTime = timer.getElapsed();
    if (meshRef.current) {
      meshRef.current.rotation.x = elapsedTime * 0.2;
      meshRef.current.rotation.y = elapsedTime * 0.3;
    }
  });

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={2}>
      <Sphere ref={meshRef} args={[1, 100, 100]} scale={1.5}>
        <MeshDistortMaterial
          color="#d4af37"
          speed={3}
          distort={0.4}
          radius={1}
          emissive="#d4af37"
          emissiveIntensity={0.2}
          roughness={0.2}
          metalness={0.8}
        />
      </Sphere>
    </Float>
  );
}

export function ThreeScene() {
  return (
    <div className="absolute inset-0 -z-10 opacity-40">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 5]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#39ff14" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#d4af37" />
        <AnimatedOrb />
      </Canvas>
    </div>
  );
}
