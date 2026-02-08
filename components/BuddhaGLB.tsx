"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

interface BuddhaGLBProps {
  src?: string;
  className?: string;
  height?: number | string;
  onLoad?: () => void;
}

export default function BuddhaGLB({ src = "/buddha5.glb", className = "", height = 320, onLoad }: BuddhaGLBProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;

  useEffect(() => {
    if (!containerRef.current || typeof window === "undefined") return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const heightPx = typeof height === "number" ? height : 320;

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(40, width / heightPx, 0.1, 100);
    camera.position.set(0, 0, 4);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, heightPx);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambient);
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(2, 2, 3);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xffffff, 1.0);
    fillLight.position.set(-2, 1, 2);
    scene.add(fillLight);
    const backLight = new THREE.DirectionalLight(0xffffff, 1.0);
    backLight.position.set(-1, 0.5, -2);
    scene.add(backLight);
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.8);
    rimLight.position.set(0, 2, -1);
    scene.add(rimLight);

    let model: THREE.Group | null = null;
    let animationId: number;

    const loader = new GLTFLoader();
    loader.load(
      src,
      (gltf) => {
        model = gltf.scene;
        scene.add(model);

        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 1.8 / maxDim;
        model.position.sub(center);
        model.scale.setScalar(scale);
        model.rotation.y = 0;
        onLoadRef.current?.();
      },
      undefined,
      (err) => {
        console.error("GLB load error:", err);
        onLoadRef.current?.();
      }
    );

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      if (model) model.rotation.y += 0.0005;
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = typeof height === "number" ? height : 320;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(animationId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [src, height]);

  const heightStyle = typeof height === "number" ? { height: `${height}px` } : { height };
  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", ...heightStyle }}
      aria-hidden
    />
  );
}
