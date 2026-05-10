import { useRef } from 'react';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

export function Pipeline3D({ pressure }: { pressure: number | null }) {
    const meshRef = useRef<THREE.Mesh>(null!);

    // Change color based on your original threshold of 140 bar
    const statusColor = pressure && pressure > 140 ? '#ef4444' : '#10b981';

    return (
        <>
            <PerspectiveCamera makeDefault position={[0, 5, 10]} />
            <OrbitControls enablePan={true} enableZoom={true} />

            {/* Lighting */}
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} />

            {/* The Pipeline Mesh */}
            <mesh ref={meshRef} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[1, 1, 10, 32]} />
                <meshStandardMaterial
                    color={statusColor}
                    emissive={statusColor}
                    emissiveIntensity={0.2}
                    metalness={0.8}
                    roughness={0.2}
                />
            </mesh>

            {/* Grid for perspective */}
            <gridHelper args={[20, 20, 0x444444, 0x222222]} position={[0, -2, 0]} />
        </>
    );
}