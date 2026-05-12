import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stars } from '@react-three/drei';
import * as THREE from 'three';

export function Pipeline3D({ pressure, threshold }: { pressure: number | null, threshold: number }) {
    const meshRef = useRef<THREE.Mesh>(null!);

    // Use your original logic: pressure vs threshold
    const isAnomaly = pressure ? pressure > threshold : false;
    const statusColor = isAnomaly ? '#ef4444' : '#10b981';

    useFrame((state) => {
        if (isAnomaly) {
            // Pulse effect for alerts
            const s = 1 + Math.sin(state.clock.elapsedTime * 5) * 0.05;
            meshRef.current.scale.set(s, 1, s);
        } else {
            meshRef.current.scale.set(1, 1, 1);
        }
    });

    return (
        <>
            <PerspectiveCamera makeDefault position={[0, 5, 12]} />
            <OrbitControls enablePan={true} />
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1.5} />

            <mesh ref={meshRef} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[1, 1, 15, 32]} />
                <meshStandardMaterial
                    color={statusColor}
                    emissive={statusColor}
                    emissiveIntensity={isAnomaly ? 0.5 : 0.2}
                    metalness={0.9}
                    roughness={0.1}
                />
            </mesh>

            <gridHelper args={[30, 30, 0x334155, 0x1e293b]} position={[0, -2, 0]} />
        </>
    );
}