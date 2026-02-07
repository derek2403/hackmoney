import { useRef, useEffect } from 'react';
import { Renderer, Camera, Transform, Plane, Program, Mesh, Vec2, Color } from 'ogl';

const vertex = `
  attribute vec2 uv;
  attribute vec3 position;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const fragment = `
  precision highp float;
  precision highp int;

  varying vec2 vUv;
  uniform float uTime;
  uniform float uSpeed;
  uniform float uAmplitude;
  uniform vec2 uFrequency;
  uniform vec2 uResolution;
  uniform vec3 uBaseColor;
  uniform vec2 uMouse;
  uniform bool uInteractive;

  void main() {
    vec2 st = vUv;
    float time = uTime * uSpeed;
    
    vec2 p = -1.0 + 2.0 * st;
    p.x *= uResolution.x / uResolution.y;
    
    if (uInteractive) {
      p -= uMouse * 0.1;
    }

    for(float i = 1.0; i < 10.0; i++) {
        p.x += uAmplitude / i * sin(i * uFrequency.x * p.y + time + i);
        p.y += uAmplitude / i * cos(i * uFrequency.y * p.x + time + i);
    }

    vec3 color = vec3(0.5 + 0.5 * sin(p.x + p.y + time), 
                      0.5 + 0.5 * cos(p.x - p.y + time), 
                      0.8 + 0.2 * sin(p.x * p.y + time));
    
    // Chrome effect (grayscale-ish with high contrast)
    float gray = dot(color, vec3(0.299, 0.587, 0.114));
    vec3 chrome = vec3(pow(gray, 2.0), pow(gray, 1.5), pow(gray, 1.2));
    
    // Mix with base color
    vec3 finalColor = mix(uBaseColor, chrome, 0.5);
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

interface LiquidChromeProps {
  baseColor?: [number, number, number];
  speed?: number;
  amplitude?: number;
  frequencyX?: number;
  frequencyY?: number;
  interactive?: boolean;
}

export const LiquidChrome = ({
  baseColor = [0.1, 0.1, 0.1],
  speed = 1.0,
  amplitude = 0.6,
  frequencyX = 2.5,
  frequencyY = 1.5,
  interactive = true
}: LiquidChromeProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouse = useRef(new Vec2(0, 0));

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const renderer = new Renderer({ alpha: true, antialias: true });
    const gl = renderer.gl;
    container.appendChild(gl.canvas);

    const camera = new Camera(gl);
    camera.position.z = 5;

    const scene = new Transform();

    const geometry = new Plane(gl, { width: 2, height: 2 });

    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: speed },
        uAmplitude: { value: amplitude },
        uFrequency: { value: new Vec2(frequencyX, frequencyY) },
        uBaseColor: { value: new Color(...baseColor) },
        uResolution: { value: new Vec2(gl.canvas.width, gl.canvas.height) },
        uMouse: { value: mouse.current },
        uInteractive: { value: interactive }
      },
    });

    const mesh = new Mesh(gl, { geometry, program });
    mesh.setParent(scene);

    function resize() {
      if (!container) return;
      renderer.setSize(container.offsetWidth, container.offsetHeight);
      program.uniforms.uResolution.value.set(gl.canvas.width, gl.canvas.height);
    }
    window.addEventListener('resize', resize);
    resize();

    const handleMouseMove = (e: MouseEvent) => {
      if (!interactive) return;
      const rect = container.getBoundingClientRect();
      mouse.current.set(
        (e.clientX - rect.left) / rect.width * 2 - 1,
        (e.clientY - rect.top) / rect.height * -2 + 1
      );
    };
    window.addEventListener('mousemove', handleMouseMove);

    let requestId: number;
    function update(time: number) {
      requestId = requestAnimationFrame(update);
      program.uniforms.uTime.value = time * 0.001;
      renderer.render({ scene, camera });
    }
    requestId = requestAnimationFrame(update);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(requestId);
      if (container.contains(gl.canvas)) {
        container.removeChild(gl.canvas);
      }
    };
  }, [baseColor, speed, amplitude, frequencyX, frequencyY, interactive]);

  return <div ref={containerRef} className="absolute inset-0 z-0 h-full w-full pointer-events-none" />;
};

export default LiquidChrome;
