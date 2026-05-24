import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

export function NebulaField() {
  const materialRef = useRef<THREE.ShaderMaterial | null>(null)

  useFrame(({ clock }) => {
    if (materialRef.current) materialRef.current.uniforms.uTime.value = clock.elapsedTime
  })

  return (
    <mesh position={[0, 0, -7.8]} scale={[42, 24, 1]}>
      <planeGeometry args={[1, 1, 48, 48]} />
      <shaderMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        uniforms={{
          uTime: { value: 0 },
          uViolet: { value: new THREE.Color('#2b123f') },
          uWine: { value: new THREE.Color('#7d1236') },
          uInk: { value: new THREE.Color('#050306') },
        }}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform vec3 uViolet;
          uniform vec3 uWine;
          uniform vec3 uInk;
          varying vec2 vUv;

          float field(vec2 p) {
            float a = sin(p.x * 4.8 + uTime * 0.09) * 0.5 + 0.5;
            float b = sin((p.x + p.y) * 7.2 - uTime * 0.075) * 0.5 + 0.5;
            float c = sin(length(p - vec2(0.48, 0.52)) * 9.5 - uTime * 0.06) * 0.5 + 0.5;
            return a * 0.28 + b * 0.32 + c * 0.4;
          }

          void main() {
            vec2 p = vUv;
            float edge = smoothstep(0.0, 0.28, p.x) * smoothstep(1.0, 0.72, p.x) *
              smoothstep(0.0, 0.24, p.y) * smoothstep(1.0, 0.76, p.y);
            float soft = smoothstep(0.0, 0.92, 1.0 - distance(p, vec2(0.5, 0.52)));
            float dust = field(p);
            float veil = smoothstep(0.28, 0.92, dust) * (0.38 + soft * 0.62);
            vec3 color = mix(uInk, uViolet, 0.18 + veil * 0.62);
            color = mix(color, uWine, smoothstep(0.7, 1.0, dust) * (0.16 + soft * 0.2));
            float alpha = (0.54 + veil * 0.24) * edge;
            gl_FragColor = vec4(color, alpha);
          }
        `}
      />
    </mesh>
  )
}

export function MobileAtmosphereProbe({ onChange }: { onChange: (mobile: boolean) => void }) {
  const { size } = useThree()

  useEffect(() => {
    onChange(size.width < 700)
  }, [onChange, size.width])

  return null
}
