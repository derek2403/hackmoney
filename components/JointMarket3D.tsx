import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

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
  selections?: Record<number, string | null>;
  onSelectionChange?: (selections: Record<number, string | null>) => void;
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
export const JointMarket3D: React.FC<JointMarket3DProps> = ({
  outcomes = DEFAULT_OUTCOMES,
  selections,
  onSelectionChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const onSelectionChangeRef = useRef(onSelectionChange);
  const selectionsRef = useRef(selections);

  // Keep refs up to date
  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
    selectionsRef.current = selections;
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 640;
    const height = container.clientHeight || 400;

    const scene = new THREE.Scene();
    // Transparent background so underlying page shows through
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    camera.position.set(3.5, 3, 5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    // Fully transparent clear color per spec
    renderer.setClearColor(0x000000, 0);
    // Enable shadows for mirror-like depth
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Enhanced lighting for visible mirror-like reflections
    // Reduced ambient to make directional lights more prominent
    const ambient = new THREE.AmbientLight(0xffffff, 0.25);
    scene.add(ambient);
    
    // Strong main directional light - creates primary reflection
    const dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
    dirLight.position.set(5, 8, 6);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    scene.add(dirLight);
    
    // Secondary directional light from opposite angle - creates secondary reflection
    const dirLight2 = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight2.position.set(-4, 5, -5);
    scene.add(dirLight2);
    
    // Fill light for better reflections
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
    fillLight.position.set(-3, 4, -4);
    scene.add(fillLight);
    
    // Rim light for edge highlights and reflections
    const rimLight = new THREE.DirectionalLight(0xffffff, 1.0);
    rimLight.position.set(-2, -2, -3);
    scene.add(rimLight);
    
    // Point light for additional reflection hotspots
    const pointLight = new THREE.PointLight(0xffffff, 1.5, 20);
    pointLight.position.set(3, 4, 4);
    scene.add(pointLight);

    // Group containing the entire cube of 8 sub‑cubes
    const rootGroup = new THREE.Group();
    rootGroup.position.set(0, 0, 0);
    rootGroup.scale.setScalar(1.25); // Scale up the entire model
    scene.add(rootGroup);

    // Inner cubes (composite cube of 8 small cubes)
    // Each small cube has identical dimensions and together form a solid cube.
    const cubeSize = 1; // edge length of each small cube
    const maxProb = outcomes.reduce((m, o) => Math.max(m, o.probability), 0.0001);

    // Heatmap color function: maps probability (0-100) to a color gradient
    // Low probability: dark blue/purple, High probability: bright cyan/blue
    function probabilityToColor(probability: number, maxProb: number): THREE.Color {
      const normalized = probability / maxProb; // 0 to 1

      // Color gradient: dark blue -> bright cyan
      // Using HSL interpolation for smooth gradient
      const hue = 200; // Blue hue
      const saturation = 70 + (normalized * 30); // 70% to 100%
      const lightness = 20 + (normalized * 60); // 20% to 80%

      return new THREE.Color(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
    }

    type CubeEntry = {
      mesh: THREE.Mesh;
      outcome: JointOutcome;
      material: THREE.MeshPhysicalMaterial;
      basePosition: THREE.Vector3;
      target: {
        transmission: number;
        opacity: number;
        roughness: number;
        metalness?: number;
        clearcoat?: number;
        clearcoatRoughness?: number;
        thickness?: number;
        color: THREE.Color;
      };
    };

    const cubes: CubeEntry[] = [];

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

      // Smaller cubes to create more margin/spacing between them with rounded corners
      const margin = 0.08; // Larger margin between cubes
      const cubeSizeWithMargin = cubeSize - margin;
      const cornerRadius = 0.08; // Radius for rounded corners
      const segments = 4; // Number of segments for smoothness
      const geom = new RoundedBoxGeometry(
        cubeSizeWithMargin,
        cubeSizeWithMargin,
        cubeSizeWithMargin,
        segments,
        cornerRadius
      );

      // Heatmap color based on probability
      const cubeColor = probabilityToColor(outcome.probability, maxProb);
      const opacity = 0.35 + 0.5 * (outcome.probability / maxProb); // 0.35–0.85 (more visible range)

      const mat = new THREE.MeshPhysicalMaterial({
        color: cubeColor,
        transparent: true,
        opacity,
        roughness: 0.25,
        transmission: 0.6, // Reduced transmission for more color visibility
        thickness: 0.4,
        clearcoat: 0.3,
        ior: 1.4,
      });

      const mesh = new THREE.Mesh(geom, mat);
      const basePosition = new THREE.Vector3(x, y, z);
      mesh.position.copy(basePosition);
      mesh.userData.outcome = outcome;
      // Enable shadows for all cubes
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      rootGroup.add(mesh);
      cubes.push({
        mesh,
        outcome,
        material: mat,
        basePosition,
        target: {
          transmission: 0.6,
          opacity,
          roughness: 0.25,
          color: cubeColor.clone(),
        },
      });
    });

    // Add axes on the sides of the cube model (attached to rootGroup so they rotate with cube)
    const axisLength = 1.8; // Length of axis lines
    const axisColor = 0x000000; // Black axes
    const axisOpacity = 0.8;
    const axisOffset = 1.2; // Distance from cube center to axis start
    
    // X-axis (horizontal, extending to the right)
    const xAxisGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(axisLength, 0, 0)
    ]);
    const xAxisMaterial = new THREE.LineBasicMaterial({ color: axisColor, opacity: axisOpacity, transparent: true, linewidth: 2 });
    const xAxis = new THREE.Line(xAxisGeometry, xAxisMaterial);
    xAxis.position.set(-axisLength / 2, -axisOffset, -axisOffset);
    rootGroup.add(xAxis);
    
    // Y-axis (vertical, extending upward)
    const yAxisGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, axisLength, 0)
    ]);
    const yAxisMaterial = new THREE.LineBasicMaterial({ color: axisColor, opacity: axisOpacity, transparent: true, linewidth: 2 });
    const yAxis = new THREE.Line(yAxisGeometry, yAxisMaterial);
    yAxis.position.set(-axisOffset, -axisLength / 2, -axisOffset);
    rootGroup.add(yAxis);
    
    // Z-axis (depth, extending forward)
    const zAxisGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, axisLength)
    ]);
    const zAxisMaterial = new THREE.LineBasicMaterial({ color: axisColor, opacity: axisOpacity, transparent: true, linewidth: 2 });
    const zAxis = new THREE.Line(zAxisGeometry, zAxisMaterial);
    zAxis.position.set(-axisOffset, -axisOffset, -axisLength / 2);
    rootGroup.add(zAxis);

    // Axis labels (CSS2D overlay, anchored to cube so they move with it)
    const labelContainer = document.createElement("div");
    labelContainer.style.position = "absolute";
    labelContainer.style.inset = "0";
    labelContainer.style.pointerEvents = "none";
    container.appendChild(labelContainer);

    function makeLabel(text: string): HTMLDivElement {
      const el = document.createElement("div");
      el.textContent = text;
      el.style.position = "absolute";
      el.style.fontSize = "11px";
      el.style.fontWeight = "700";
      el.style.letterSpacing = "0.2em";
      el.style.textTransform = "uppercase";
      // Light text so labels remain visible over dark or gradient backgrounds
      el.style.color = "rgba(255,255,255,0.7)";
      el.style.whiteSpace = "nowrap";
      el.style.transform = "translate(-50%, -50%)";
      labelContainer.appendChild(el);
      return el;
    }
    type LabelAnchor = {
      el: HTMLDivElement;
      localPosition: THREE.Vector3;
    };

    // Axis labels positioned at the ends of axes with market names (matching navbar styling)
    const labelX = makeLabel("A: Khamenei out");
    labelX.style.fontSize = "14px"; // text-sm equivalent
    labelX.style.fontWeight = "700"; // font-bold
    labelX.style.color = "rgba(255,255,255,1)"; // text-white
    labelX.style.textTransform = "none"; // Override uppercase for readable market names
    labelX.style.letterSpacing = "normal"; // Remove wide letter spacing

    const labelY = makeLabel("B: US strikes");
    labelY.style.fontSize = "14px"; // text-sm equivalent
    labelY.style.fontWeight = "700"; // font-bold
    labelY.style.color = "rgba(255,255,255,1)"; // text-white
    labelY.style.textTransform = "none"; // Override uppercase for readable market names
    labelY.style.letterSpacing = "normal"; // Remove wide letter spacing

    const labelZ = makeLabel("C: Israel next strikes");
    labelZ.style.fontSize = "14px"; // text-sm equivalent
    labelZ.style.fontWeight = "700"; // font-bold
    labelZ.style.color = "rgba(255,255,255,1)"; // text-white
    labelZ.style.textTransform = "none"; // Override uppercase for readable market names
    labelZ.style.letterSpacing = "normal"; // Remove wide letter spacing

    // Yes labels at positive axis ends
    const labelXYes = makeLabel("Yes");
    labelXYes.style.fontSize = "13px";
    labelXYes.style.fontWeight = "700";
    labelXYes.style.color = "rgba(161,161,170,1)";
    labelXYes.style.textTransform = "capitalize";

    const labelYYes = makeLabel("Yes");
    labelYYes.style.fontSize = "13px";
    labelYYes.style.fontWeight = "700";
    labelYYes.style.color = "rgba(161,161,170,1)";
    labelYYes.style.textTransform = "capitalize";

    const labelZYes = makeLabel("Yes");
    labelZYes.style.fontSize = "13px";
    labelZYes.style.fontWeight = "700";
    labelZYes.style.color = "rgba(161,161,170,1)";
    labelZYes.style.textTransform = "capitalize";

    const labelAnchors: LabelAnchor[] = [
      // Axis name labels (positioned along the middle of each axis)
      { el: labelX, localPosition: new THREE.Vector3(axisLength * 0.3, -axisOffset - 0.5, -axisOffset) },
      { el: labelY, localPosition: new THREE.Vector3(-axisOffset - 0.5, axisLength * 0.3, -axisOffset) },
      { el: labelZ, localPosition: new THREE.Vector3(-axisOffset, -axisOffset - 0.5, axisLength * 0.3) },

      // Yes labels at positive ends of each axis
      { el: labelXYes, localPosition: new THREE.Vector3(axisLength / 2 + 0.7, -axisOffset, -axisOffset) },
      { el: labelYYes, localPosition: new THREE.Vector3(-axisOffset, axisLength / 2 + 0.7, -axisOffset) },
      { el: labelZYes, localPosition: new THREE.Vector3(-axisOffset, -axisOffset, axisLength / 2 + 0.7) },
    ];

    // Tooltip & selection
    let hovered: THREE.Mesh | null = null;
    
    // Helper: find which outcomes match current selections (can be multiple)
    function findMatchingOutcomeIds(): Set<number> {
      const selections = selectionsRef.current;
      const matchingIds = new Set<number>();
      if (!selections) return matchingIds;
      const hasAnySelection = Object.values(selections).some((s) => s !== null && s !== "Any");
      if (!hasAnySelection) return matchingIds;

      for (const outcome of outcomes) {
        let matches = true;
        for (let qId = 1; qId <= 3; qId++) {
          const selection = selections[qId];
          if (selection === null || selection === "Any") continue;

          const outcomeValue = qId === 1 ? outcome.aYes : qId === 2 ? outcome.bYes : outcome.cYes;
          const isYes = selection === "Yes";

          if (isYes !== outcomeValue) {
            matches = false;
            break;
          }
        }
        if (matches) matchingIds.add(outcome.id);
      }
      return matchingIds;
    }

    let selectedOutcomeIds = new Set<number>(findMatchingOutcomeIds());
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
          const isHoveredCubeSelected = selectedOutcomeIds.has(outcome.id);
          
          if (isHoveredCubeSelected && selectedOutcomeIds.size > 1) {
            // Show combined market information for selected group
            const selectedOutcomes = outcomes.filter((o) => selectedOutcomeIds.has(o.id));
            const totalProbability = selectedOutcomes.reduce((sum, o) => sum + o.probability, 0);
            
            // Build description showing the combined selection
            const q1Values = new Set(selectedOutcomes.map(o => o.aYes));
            const q2Values = new Set(selectedOutcomes.map(o => o.bYes));
            const q3Values = new Set(selectedOutcomes.map(o => o.cYes));
            
            const q1Desc = q1Values.size === 1 
              ? (q1Values.has(true) ? "Khamenei Yes" : "Khamenei No")
              : "Khamenei Any";
            const q2Desc = q2Values.size === 1
              ? (q2Values.has(true) ? "US Yes" : "US No")
              : "US Any";
            const q3Desc = q3Values.size === 1
              ? (q3Values.has(true) ? "Israel Yes" : "Israel No")
              : "Israel Any";
            
            tooltip.innerHTML = `<div style="font-size:11px;font-weight:700;margin-bottom:4px;">Combined Market (${selectedOutcomeIds.size} outcomes)</div>
              <div style="font-size:10px;opacity:0.8;margin-bottom:4px;">${q1Desc}, ${q2Desc}, ${q3Desc}</div>
              <div style="font-size:11px;opacity:0.7;">Total Probability: <span style="font-weight:700;">${totalProbability.toFixed(2)}%</span></div>`;
          } else {
            // Show individual cube information
            tooltip.innerHTML = `<div style="font-size:11px;font-weight:700;margin-bottom:4px;">${outcome.label}</div>
              <div style="font-size:11px;opacity:0.7;">Probability: <span style="font-weight:700;">${outcome.probability.toFixed(
                2
              )}%</span></div>`;
          }
        }
      } else {
        hovered = null;
        tooltip.style.opacity = "0";
      }
    }

    // Update materials based on selected outcome IDs (Set)
    function updateMaterialsForSelection(selectedIds: Set<number>) {
      cubes.forEach((entry) => {
        const { material } = entry;
        const isSelected = selectedIds.has(entry.outcome.id);

        if (isSelected) {
          // Mirror-like shiny green material with visible reflections
          entry.target = {
            transmission: 0.3, // Less transmission for more solid mirror look
            opacity: 0.98, // Nearly fully opaque for strong reflections
            roughness: 0.02, // Extremely low roughness for mirror-like shine
            metalness: 0.3, // Higher metalness for stronger reflections
            clearcoat: 1.0, // Maximum clearcoat for mirror shine
            clearcoatRoughness: 0.01, // Ultra-smooth clearcoat for sharp reflections
            thickness: 0.5, // Thickness for transmission
            color: new THREE.Color(0xE8E3DF), // RGB(232, 227, 223) - Warm off-white
          };
          // Enable shadows for selected cubes
          entry.mesh.castShadow = true;
          entry.mesh.receiveShadow = true;
        } else {
          const glassOpacity = 0.35 + 0.5 * (entry.outcome.probability / maxProb);
          const cubeColor = probabilityToColor(entry.outcome.probability, maxProb);
          entry.target = {
            transmission: 0.6,
            opacity: glassOpacity,
            roughness: 0.25,
            metalness: 0.0,
            clearcoat: 0.3,
            clearcoatRoughness: 0.3,
            thickness: 0.4,
            color: cubeColor,
          };
        }
        material.needsUpdate = true;
      });
    }

    // Initialize materials based on current selections
    updateMaterialsForSelection(selectedOutcomeIds);

    function handleClick() {
      // Only deselect on empty space if user wasn't dragging (spinning)
      if (!hovered) {
        // Only deselect if this was a genuine click, not a drag end
        if (!hasDragged && selectedOutcomeIds.size > 0) {
          selectedOutcomeIds.clear();
          updateMaterialsForSelection(selectedOutcomeIds);

          if (onSelectionChangeRef.current) {
            onSelectionChangeRef.current({
              1: null,
              2: null,
              3: null,
            });
          }
        }
        return;
      }

      const clickedEntry = cubes.find((entry) => entry.mesh === hovered);
      if (!clickedEntry) return;

      // Toggle this cube in/out of selection (deselect if already selected)
      const clickedId = clickedEntry.outcome.id;
      if (selectedOutcomeIds.has(clickedId)) {
        selectedOutcomeIds.delete(clickedId);
      } else {
        selectedOutcomeIds.add(clickedId);
      }

      // Update materials: selected cubes become solid white marble, others glass.
      updateMaterialsForSelection(selectedOutcomeIds);

      // Propagate selection change up to sync TradeSidebar
      // When multiple cubes selected, compute union: if all agree → Yes/No, else → "Any"
      if (onSelectionChangeRef.current) {
        if (selectedOutcomeIds.size === 0) {
          onSelectionChangeRef.current({
            1: null,
            2: null,
            3: null,
          });
        } else {
          const selectedOutcomes = outcomes.filter((o) => selectedOutcomeIds.has(o.id));

          // For each question, check if all selected outcomes agree
          const newSelections: Record<number, string | null> = { 1: null, 2: null, 3: null };

          for (let qId = 1; qId <= 3; qId++) {
            const values = selectedOutcomes.map((o) =>
              qId === 1 ? o.aYes : qId === 2 ? o.bYes : o.cYes
            );
            const allTrue = values.every((v) => v === true);
            const allFalse = values.every((v) => v === false);

            if (allTrue) {
              newSelections[qId] = "Yes";
            } else if (allFalse) {
              newSelections[qId] = "No";
            } else {
              // Mixed values → "Any"
              newSelections[qId] = "Any";
            }
          }

          onSelectionChangeRef.current(newSelections);
        }
      }
    }

    renderer.domElement.addEventListener("mousemove", updateTooltip);
    renderer.domElement.addEventListener("click", handleClick);

    // Pointer-driven rotation (rotate cube only when user drags)
    let isDragging = false;
    let hasDragged = false; // Track if user actually moved mouse during drag
    let lastX = 0;
    let lastY = 0;
    let dragStartX = 0;
    let dragStartY = 0;

    function handlePointerDown(event: MouseEvent) {
      isDragging = true;
      hasDragged = false;
      lastX = event.clientX;
      lastY = event.clientY;
      dragStartX = event.clientX;
      dragStartY = event.clientY;
    }

    function handlePointerMove(event: MouseEvent) {
      if (!isDragging) return;
      const deltaX = event.clientX - lastX;
      lastX = event.clientX;

      // Check if user moved significantly (more than 3 pixels)
      const totalMovement = Math.abs(event.clientX - dragStartX) + Math.abs(event.clientY - dragStartY);
      if (totalMovement > 3) {
        hasDragged = true;
      }

      const rotationSpeed = 0.005;
      rootGroup.rotation.y += deltaX * rotationSpeed;
      // Lock vertical tilt so axes/labels stay consistent
      rootGroup.rotation.x = 0;
    }

    function handlePointerUp() {
      isDragging = false;
      // Reset hasDragged after a short delay to allow click handler to check it
      setTimeout(() => {
        hasDragged = false;
      }, 100);
    }

    renderer.domElement.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);

    // Animation loop (lerp materials; rotation only changes on user drag)
    let frameId: number;
    const animate = () => {
      const now = performance.now();

      // Sync selectedOutcomeIds with current selections prop (if changed externally)
      const currentMatchingIds = findMatchingOutcomeIds();
      // Compare sets by size and content
      if (currentMatchingIds.size !== selectedOutcomeIds.size ||
          ![...currentMatchingIds].every(id => selectedOutcomeIds.has(id))) {
        selectedOutcomeIds = new Set(currentMatchingIds);
        updateMaterialsForSelection(selectedOutcomeIds);
      }

      // Check if the hovered cube is selected (needed for group pop-out logic)
      const hoveredOutcome = hovered ? (hovered.userData.outcome as JointOutcome | undefined) : undefined;
      const isHoveredCubeSelected = hoveredOutcome ? selectedOutcomeIds.has(hoveredOutcome.id) : false;

      // Lerp material properties towards targets and handle hover "split out"
      cubes.forEach((entry) => {
        const { material, target, basePosition, mesh } = entry;
        const lerpFactor = 0.12;
        material.transmission = THREE.MathUtils.lerp(
          material.transmission,
          target.transmission,
          lerpFactor
        );
        material.opacity = THREE.MathUtils.lerp(material.opacity, target.opacity, lerpFactor);
        material.roughness = THREE.MathUtils.lerp(
          material.roughness,
          target.roughness,
          lerpFactor
        );
        if (target.metalness !== undefined) {
          material.metalness = THREE.MathUtils.lerp(material.metalness, target.metalness, lerpFactor);
        }
        if (target.clearcoat !== undefined) {
          material.clearcoat = THREE.MathUtils.lerp(material.clearcoat, target.clearcoat, lerpFactor);
        }
        if (target.clearcoatRoughness !== undefined) {
          material.clearcoatRoughness = THREE.MathUtils.lerp(
            material.clearcoatRoughness,
            target.clearcoatRoughness,
            lerpFactor
          );
        }
        if (target.thickness !== undefined) {
          material.thickness = THREE.MathUtils.lerp(material.thickness, target.thickness, lerpFactor);
        }
        material.color.lerp(target.color, lerpFactor);

        // Enlarge & offset hovered cube slightly outwards from the composite cube
        const isHovered = hovered === mesh;
        const isSelected = selectedOutcomeIds.has(entry.outcome.id);
        
        // Determine if this cube should pop out:
        // - If hovering over an unselected cube: only that cube pops out
        // - If hovering over a selected cube: ALL selected cubes pop out together as a group
        let shouldPopOut = false;
        if (isHovered && !isHoveredCubeSelected) {
          // Hovering over unselected cube: only that cube pops out
          shouldPopOut = true;
        } else if (isHoveredCubeSelected && isSelected) {
          // Hovering over a selected cube: ALL selected cubes pop out together
          shouldPopOut = true;
        }
        
        const hoverScaleTarget = shouldPopOut ? 1.08 : 1.0;
        const hoverOffset = shouldPopOut ? 0.3 : 0;

        // Breathing animation - subtle pulsing in and out (all cubes in sync, slower)
        const breathingSpeed = 0.6; // Slower cycles per second
        const breathingAmplitude = 0.015; // Small scale variation (1.5% in/out)
        const breathingScale = 1.0 + Math.sin(now * 0.001 * breathingSpeed * Math.PI * 2) * breathingAmplitude;
        
        // Combine hover scale with breathing scale
        const scaleTarget = hoverScaleTarget * breathingScale;

        const scaleLerp = 0.2;
        const currentScale = mesh.scale.x; // uniform
        const newScale = THREE.MathUtils.lerp(currentScale, scaleTarget, scaleLerp);
        mesh.scale.setScalar(newScale);

        // Move along the radial direction from origin
        const dir = basePosition.clone().normalize();
        const targetPos = basePosition.clone().add(dir.multiplyScalar(hoverOffset));
        mesh.position.lerp(targetPos, 0.2);
      });

      // Update axis labels to stay attached to cube
      const rect = container.getBoundingClientRect();
      labelAnchors.forEach((anchor) => {
        const worldPos = anchor.localPosition.clone();
        rootGroup.localToWorld(worldPos);
        worldPos.project(camera);

        // Ignore labels behind the camera
        if (worldPos.z < -1 || worldPos.z > 1) {
          anchor.el.style.opacity = "0";
          return;
        }

        const x = (worldPos.x * 0.5 + 0.5) * rect.width;
        const y = (-worldPos.y * 0.5 + 0.5) * rect.height;
        anchor.el.style.left = `${x}px`;
        anchor.el.style.top = `${y}px`;
        anchor.el.style.opacity = "1";
      });

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
      renderer.domElement.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
      container.removeChild(renderer.domElement);
      container.removeChild(labelContainer);
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

