import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type JointOutcome = {
  id: number;
  aYes: boolean;
  bYes: boolean;
  cYes: boolean;
  label: string;
  probability: number; // 0–100
};

const DEFAULT_OUTCOMES: JointOutcome[] = [
  { id: 1, aYes: false, bYes: false, cYes: false, label: "Khamenei No, US No, Israel No", probability: 6.0 },
  { id: 2, aYes: false, bYes: false, cYes: true, label: "Khamenei No, US No, Israel Yes", probability: 6.0 },
  { id: 3, aYes: false, bYes: true, cYes: false, label: "Khamenei No, US Yes, Israel No", probability: 9.0 },
  { id: 4, aYes: false, bYes: true, cYes: true, label: "Khamenei No, US Yes, Israel Yes", probability: 9.0 },
  { id: 5, aYes: true, bYes: false, cYes: false, label: "Khamenei Yes, US No, Israel No", probability: 14.0 },
  { id: 6, aYes: true, bYes: false, cYes: true, label: "Khamenei Yes, US No, Israel Yes", probability: 14.0 },
  { id: 7, aYes: true, bYes: true, cYes: false, label: "Khamenei Yes, US Yes, Israel No", probability: 21.0 },
  { id: 8, aYes: true, bYes: true, cYes: true, label: "Khamenei Yes, US Yes, Israel Yes", probability: 21.0 },
];

interface JointMarket3DProps {
  outcomes?: JointOutcome[];
}

/**
 * Interactive 3D joint prediction market visualization using three.js
 *
 * - Large transparent cube = full outcome space
 * - 8 inner cubes (2×2×2) encode probabilities by opacity
 * - Axes:
 *   X: A (Khamenei out)  No → Yes
 *   Y: B (US strikes)    No → Yes
 *   Z: C (Israel strikes) No → Yes
 */
export const JointMarket3D: React.FC<JointMarket3DProps> = ({ outcomes = DEFAULT_OUTCOMES }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 640;
    const height = container.clientHeight || 400;

    const scene = new THREE.Scene();
    // Transparent background so underlying page shows through
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    camera.position.set(5, 4, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    container.appendChild(renderer.domElement);

    // Soft ambient + subtle directional light
    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.25);
    dirLight.position.set(3, 6, 4);
    scene.add(dirLight);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.6;
    controls.enablePan = false;
    controls.minDistance = 3;
    controls.maxDistance = 10;

    // Group containing the entire structure (outer cube + inner cubes)
    const rootGroup = new THREE.Group();
    rootGroup.position.set(0, 0, 0);
    scene.add(rootGroup);

    // Outer cube: size 2, centered at origin
    const outerSize = 2;
    const outerGeometry = new THREE.BoxGeometry(outerSize, outerSize, outerSize);
    const outerMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      opacity: 0.35,
      transparent: true,
      wireframe: false,
    });
    const outerCube = new THREE.Mesh(outerGeometry, outerMaterial);
    rootGroup.add(outerCube);

    // Edge outline
    const edges = new THREE.EdgesGeometry(outerGeometry);
    const edgeLines = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0xd1d5db, opacity: 0.9, transparent: true })
    );
    outerCube.add(edgeLines);

    // Inner cubes (composite cube of 8 small cubes)
    // Each small cube has identical dimensions and together form a solid cube.
    const cubeSize = 1; // edge length of each small cube
    const cellSize = cubeSize; // alias for clarity
    // Cyan‑teal family like the reference visual
    const baseColor = new THREE.Color(0x38bdf8);

    const maxProb = outcomes.reduce((m, o) => Math.max(m, o.probability), 0.0001);

    const cubes: { mesh: THREE.Mesh; outcome: JointOutcome }[] = [];

    outcomes.forEach((outcome) => {
      const xIndex = outcome.aYes ? 1 : 0;
      const yIndex = outcome.bYes ? 1 : 0;
      const zIndex = outcome.cYes ? 1 : 0;

      // BoxGeometry is centered on its origin. For a 2×2×2 grid of cubes of
      // edge length `cubeSize`, the centers must be offset by ±cubeSize / 2
      // along each axis to form one solid composite cube without gaps.
      const offset = cubeSize / 2;
      const x = xIndex === 0 ? -offset : offset;
      const y = yIndex === 0 ? -offset : offset;
      const z = zIndex === 0 ? -offset : offset;

      const geom = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
      const opacity = 0.12 + 0.85 * (outcome.probability / maxProb); // 0.12–0.97

      const mat = new THREE.MeshStandardMaterial({
        color: baseColor,
        opacity,
        transparent: true,
        roughness: 0.3,
        metalness: 0.0,
        flatShading: true,
      });

      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(x, y, z);
      mesh.userData.outcome = outcome;
      rootGroup.add(mesh);
      cubes.push({ mesh, outcome });
    });

    // Axis helpers
    const axisMaterial = new THREE.LineBasicMaterial({ color: 0x9ca3af, opacity: 0.5, transparent: true });
    const axisLength = outerSize * 0.8;

    function addAxis(from: THREE.Vector3, to: THREE.Vector3) {
      const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
      const line = new THREE.Line(geo, axisMaterial);
      scene.add(line);
    }

    // X axis (A)
    addAxis(new THREE.Vector3(-axisLength / 2, -outerSize * 0.7, -outerSize * 0.7), new THREE.Vector3(axisLength / 2, -outerSize * 0.7, -outerSize * 0.7));
    // Y axis (B)
    addAxis(new THREE.Vector3(-outerSize * 0.7, -axisLength / 2, -outerSize * 0.7), new THREE.Vector3(-outerSize * 0.7, axisLength / 2, -outerSize * 0.7));
    // Z axis (C)
    addAxis(new THREE.Vector3(-outerSize * 0.7, -outerSize * 0.7, -axisLength / 2), new THREE.Vector3(-outerSize * 0.7, -outerSize * 0.7, axisLength / 2));

    // Axis labels (simple CSS2D-style via DOM, positioned roughly)
    const labelContainer = document.createElement("div");
    labelContainer.style.position = "absolute";
    labelContainer.style.inset = "0";
    labelContainer.style.pointerEvents = "none";
    container.appendChild(labelContainer);

    function makeLabel(text: string, style: Partial<CSSStyleDeclaration>): HTMLDivElement {
      const el = document.createElement("div");
      el.textContent = text;
      el.style.position = "absolute";
      el.style.fontSize = "11px";
      el.style.fontWeight = "700";
      el.style.letterSpacing = "0.2em";
      el.style.textTransform = "uppercase";
      // Light text so labels remain visible over dark or gradient backgrounds
      el.style.color = "rgba(255,255,255,0.7)";
      Object.assign(el.style, style);
      labelContainer.appendChild(el);
      return el;
    }

    makeLabel("A: Khamenei out", { left: "50%", bottom: "8px", transform: "translateX(-50%)" });
    makeLabel("No", { left: "18%", bottom: "18px", fontSize: "10px" });
    makeLabel("Yes", { right: "18%", bottom: "18px", fontSize: "10px" });

    makeLabel("B: US strikes", { left: "4%", top: "50%", transform: "rotate(-90deg) translateY(-50%)", transformOrigin: "left center" });
    makeLabel("No", { left: "10%", bottom: "28%", fontSize: "10px" });
    makeLabel("Yes", { left: "10%", top: "22%", fontSize: "10px" });

    makeLabel("C: Israel next strikes", { right: "6%", bottom: "50%", transform: "rotate(90deg) translateY(50%)", transformOrigin: "right center" });
    makeLabel("No", { right: "12%", bottom: "28%", fontSize: "10px" });
    makeLabel("Yes", { right: "12%", top: "22%", fontSize: "10px" });

    // Tooltip
    let hovered: THREE.Mesh | null = null;
    const tooltip = tooltipRef.current;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    function updateTooltip(event: MouseEvent) {
      if (!tooltip) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(cubes.map((c) => c.mesh));

      if (intersects.length > 0) {
        const mesh = intersects[0].object as THREE.Mesh;
        const outcome: JointOutcome | undefined = mesh.userData.outcome;

        hovered = mesh;
        tooltip.style.opacity = "1";
        tooltip.style.left = `${event.clientX - rect.left + 12}px`;
        tooltip.style.top = `${event.clientY - rect.top + 12}px`;

        if (outcome) {
          tooltip.innerHTML = `<div style="font-size:11px;font-weight:700;margin-bottom:4px;">${outcome.label}</div>
            <div style="font-size:11px;opacity:0.7;">Probability: <span style="font-weight:700;">${outcome.probability.toFixed(
              2
            )}%</span></div>`;
        }
      } else {
        hovered = null;
        tooltip.style.opacity = "0";
      }
    }

    function handleClick() {
      cubes.forEach(({ mesh }) => {
        mesh.scale.set(1, 1, 1);
        (mesh.material as THREE.Material).opacity = (mesh.material as any).opacityBase ?? (mesh.material as any).opacity;
      });
      if (hovered) {
        hovered.scale.set(1.05, 1.05, 1.05);
        const mat = hovered.material as any;
        if (!mat.opacityBase) mat.opacityBase = mat.opacity;
        mat.opacity = Math.min(1, mat.opacityBase + 0.2);
      }
    }

    renderer.domElement.addEventListener("mousemove", updateTooltip);
    renderer.domElement.addEventListener("click", handleClick);

    // Animation loop
    let frameId: number;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || width;
      const h = container.clientHeight || height;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("mousemove", updateTooltip);
      renderer.domElement.removeEventListener("click", handleClick);
      container.removeChild(renderer.domElement);
      container.removeChild(labelContainer);
      controls.dispose();
      renderer.dispose();
    };
  }, [outcomes]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[420px] overflow-hidden"
    >
      <div
        ref={tooltipRef}
        style={{
          position: "absolute",
          pointerEvents: "none",
          background: "rgba(15,23,42,0.96)",
          borderRadius: 8,
          padding: "8px 10px",
          border: "1px solid rgba(148,163,184,0.5)",
          color: "white",
          fontSize: 11,
          boxShadow: "0 18px 45px rgba(15,23,42,0.6)",
          opacity: 0,
          transition: "opacity 0.15s ease-out",
          zIndex: 10,
        }}
      />
    </div>
  );
};

export default JointMarket3D;

