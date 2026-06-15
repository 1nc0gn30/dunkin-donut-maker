import React, { useState, useEffect, useRef } from 'react';
import { submitDonut, uploadVideo } from '../lib/netlify';
import { DonutDesign, CommunityDonut } from '../types';
import { Sparkles, ShoppingBag, Check, Printer, Video, Award, Heart, Camera, Send, ImageIcon, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import SelfieCameraModal from './SelfieCameraModal';

const TOPPING_OPTIONS = [
  { id: 'raccoon', label: '🦝 Gummy Mascot' },
  { id: 'coffee_beans', label: '☕ Espresso Beans' },
  { id: 'marshmallows', label: '☁️ Marshmallows' },
  { id: 'gold_foil', label: '✨ Sparkle Stars' },
  { id: 'bacon', label: '🥓 Crispy Bacon' },
  { id: 'strawberries', label: '🍓 Strawberries' },
  { id: 'blueberries', label: '🫐 Blueberries' },
  { id: 'bananas', label: '🍌 Bananas' },
  { id: 'oreo', label: '🍪 Cookie Crumb' }
];

interface SprinkleinatorProps {
  onSubmit?: (donut: CommunityDonut) => void;
}

export default function Sprinkleinator({ onSubmit }: SprinkleinatorProps) {
  const [design, setDesign] = useState<DonutDesign>({
    baseType: 'classic',
    glazeType: 'pink',
    sprinklesType: 'rainbow',
    drizzleType: 'none',
    customToppings: [],
    icingMessage: ''
  });

  const [creatorName, setCreatorName] = useState('');
  const [creatorEmail, setCreatorEmail] = useState('');
  const [creatorPhone, setCreatorPhone] = useState('');
  const [creatorCity, setCreatorCity] = useState('');
  const [creatorImage, setCreatorImage] = useState<string | null>(null);
  const [twitterHandle, setTwitterHandle] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [tiktokHandle, setTiktokHandle] = useState('');

  const [receipt, setReceipt] = useState<{ id: string; timestamp: string; qty: number } | null>(null);
  const [bakingProcess, setBakingProcess] = useState<string | null>(null);
  
  // Video & Menu Submission States
  const [recording, setRecording] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'sending' | 'success'>('idle');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const mountRef = useRef<HTMLDivElement>(null);
  const designRef = useRef(design);
  const metaRef = useRef({ creatorName, creatorEmail, creatorPhone, creatorCity, icingMessage: design.icingMessage });
  const selfieImgRef = useRef<HTMLImageElement | null>(null);
  const recordCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const autoSpinRef = useRef(true);
  const isRecordingRef = useRef(false);
  const recordedChunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    designRef.current = design;
    metaRef.current = { creatorName, creatorEmail, creatorPhone, creatorCity, icingMessage: design.icingMessage };
  }, [design, creatorName, creatorEmail, creatorPhone, creatorCity]);

  const handleImageUploadDataUrl = (dataUrl: string) => {
    setCreatorImage(dataUrl);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      selfieImgRef.current = img;
    };
    img.src = dataUrl;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleImageUploadDataUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth || 300;
    const height = mountRef.current.clientHeight || 280;

    // Create offline canvas for video export processing
    const rc = document.createElement('canvas');
    rc.width = 800;
    rc.height = 800;
    recordCanvasRef.current = rc;

    const scene = new THREE.Scene();
    
    // Smooth, warm framing camera position
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 15, 23);
    camera.lookAt(0, 0, 0);

    // CRITICAL: preserveDrawingBuffer must be true to copy canvas data for video
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    // Assembly groups
    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    const donutGroup = new THREE.Group();
    worldGroup.add(donutGroup);

    // Dynamic, high-quality lighting scheme
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.3);
    dirLight.position.set(5, 12, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 30;
    dirLight.shadow.bias = -0.001;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xffeebb, 0.6);
    fillLight.position.set(-8, 5, -8);
    scene.add(fillLight);

    // Subtle soft shadow floor
    const floorGeo = new THREE.PlaneGeometry(50, 50);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.1 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -2.5;
    floor.receiveShadow = true;
    scene.add(floor);

    // Store references
    let doughMesh: THREE.Mesh | null = null;
    let glazeMesh: THREE.Mesh | null = null;
    const sprinklesGroup = new THREE.Group();
    const toppingsGroup = new THREE.Group();
    const drizzleGroup = new THREE.Group();
    const textGroup = new THREE.Group();
    const fillingGroup = new THREE.Group();
    let currentShape = 'none';
    let loadedFont: any = null;
    let updateDonutMesh: () => void = () => {};

    donutGroup.add(sprinklesGroup);
    donutGroup.add(toppingsGroup);
    donutGroup.add(drizzleGroup);
    donutGroup.add(textGroup);
    donutGroup.add(fillingGroup);

    const fontLoader = new FontLoader();
    fontLoader.load('https://unpkg.com/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json', (f) => {
        loadedFont = f;
        updateDonutMesh();
    });

    // Plate removed to match Dunkin floating BG

    // Steam Particles
    const maxParticles = 40;
    const steamGeo = new THREE.BufferGeometry();
    const steamPos = new Float32Array(maxParticles * 3);
    const steamLife = new Float32Array(maxParticles);
    
    for (let i = 0; i < maxParticles; i++) {
        steamPos[i*3] = (Math.random() - 0.5) * 7;
        steamPos[i*3+1] = Math.random() * 5;
        steamPos[i*3+2] = (Math.random() - 0.5) * 7;
        steamLife[i] = Math.random() * 100;
    }
    steamGeo.setAttribute('position', new THREE.BufferAttribute(steamPos, 3));
    steamGeo.setAttribute('life', new THREE.BufferAttribute(steamLife, 1));
    
    // Custom steam texture
    const stCanvas = document.createElement('canvas');
    stCanvas.width = 64; stCanvas.height = 64;
    const stCtx = stCanvas.getContext('2d')!;
    const stGrad = stCtx.createRadialGradient(32,32,0,32,32,32);
    stGrad.addColorStop(0, 'rgba(255,255,255,1)');
    stGrad.addColorStop(1, 'rgba(255,255,255,0)');
    stCtx.fillStyle = stGrad; stCtx.fillRect(0,0,64,64);
    
    const steamMat = new THREE.PointsMaterial({
        map: new THREE.CanvasTexture(stCanvas),
        color: 0xffffff,
        size: 0.8,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
        blending: THREE.NormalBlending
    });
    const steamSystem = new THREE.Points(steamGeo, steamMat);
    worldGroup.add(steamSystem);

    const generateRingGeo = () => {
        const dGen = new THREE.TorusGeometry(3.5, 1.5, 48, 80);
        dGen.rotateX(Math.PI / 2); dGen.scale(1, 0.85, 1);
        const dPos = dGen.attributes.position;
        for (let i = 0; i < dPos.count; i++) {
            const x = dPos.getX(i); const y = dPos.getY(i); const z = dPos.getZ(i);
            dPos.setY(i, y + Math.sin(x * 2) * Math.cos(z * 2) * 0.05);
        }
        dGen.computeVertexNormals();

        const gGen = new THREE.TorusGeometry(3.5, 1.55, 48, 80);
        gGen.rotateX(Math.PI / 2); gGen.scale(1, 0.85, 1);
        const gPos = gGen.attributes.position;
        for (let i = 0; i < gPos.count; i++) {
            const x = gPos.getX(i); const y = gPos.getY(i); const z = gPos.getZ(i);
            const angle = Math.atan2(z, x);
            const wave = Math.sin(angle * 8) * Math.cos(angle * 13) * 0.22;
            gPos.setY(i, y + 0.18 + wave);
        }
        gGen.computeVertexNormals();
        return { d: dGen, g: gGen };
    };

    const generateFilledGeo = () => {
        const dGen = new THREE.SphereGeometry(3.2, 48, 48);
        dGen.scale(1, 0.6, 1);
        const dPos = dGen.attributes.position;
        for (let i = 0; i < dPos.count; i++) {
            const x = dPos.getX(i); const y = dPos.getY(i); const z = dPos.getZ(i);
            dPos.setY(i, y + Math.sin(x * 2) * Math.cos(z * 2) * 0.05);
        }
        dGen.computeVertexNormals();

        const gGen = new THREE.SphereGeometry(3.25, 48, 48);
        gGen.scale(1, 0.6, 1);
        const gPos = gGen.attributes.position;
        for (let i = 0; i < gPos.count; i++) {
            let x = gPos.getX(i); let y = gPos.getY(i); let z = gPos.getZ(i);
            if (y < 0) {
                gPos.setY(i, 0); gPos.setX(i, x * 0.9); gPos.setZ(i, z * 0.9);
            } else {
                const angle = Math.atan2(z, x);
                const wave = Math.sin(angle * 6) * Math.cos(angle * 10) * 0.15;
                gPos.setY(i, y + 0.1 + wave);
            }
        }
        gGen.computeVertexNormals();
        return { d: dGen, g: gGen };
    };

    // Geometry Generation (High Poly Base)
    const initialGeos = generateRingGeo();

    const doughMat = new THREE.MeshStandardMaterial({
      roughness: 0.7,
      metalness: 0.05,
      bumpScale: 0.02
    });
    doughMesh = new THREE.Mesh(initialGeos.d, doughMat);
    doughMesh.castShadow = true;
    doughMesh.receiveShadow = true;
    donutGroup.add(doughMesh);

    // High quality glossy physical material
    const glazeMat = new THREE.MeshPhysicalMaterial({
      roughness: 0.12,
      metalness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      transparent: true,
      opacity: 0.95
    });
    glazeMesh = new THREE.Mesh(initialGeos.g, glazeMat);
    glazeMesh.castShadow = true;
    donutGroup.add(glazeMesh);

    // Interactive Drag to Spin Animation state
    let animationFrameId: number;
    let targetRotationY = 0;
    let targetRotationX = Math.PI / 8; // Gentle tilt forward
    
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const handleStart = (clientX: number, clientY: number) => {
      isDragging = true;
      autoSpinRef.current = false;
      previousMousePosition = { x: clientX, y: clientY };
    };

    const handleMove = (clientX: number, clientY: number) => {
      if (!isDragging) return;
      const deltaX = clientX - previousMousePosition.x;
      const deltaY = clientY - previousMousePosition.y;

      targetRotationY += deltaX * 0.01;
      targetRotationX += deltaY * 0.01;
      targetRotationX = Math.max(-0.2, Math.min(Math.PI / 2.5, targetRotationX));

      previousMousePosition = { x: clientX, y: clientY };
    };

    const handleEnd = () => {
      isDragging = false;
      setTimeout(() => { if (!isDragging) autoSpinRef.current = true; }, 3000); // Resume spin after a break
    };

    const onMouseDown = (e: MouseEvent) => handleStart(e.clientX, e.clientY);
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onMouseUp = () => handleEnd();

    const onTouchStart = (e: TouchEvent) => { if (e.touches.length > 0) handleStart(e.touches[0].clientX, e.touches[0].clientY); };
    const onTouchMove = (e: TouchEvent) => { if (e.touches.length > 0) handleMove(e.touches[0].clientX, e.touches[0].clientY); };
    
    const domElem = renderer.domElement;
    domElem.addEventListener('mousedown', onMouseDown);
    domElem.addEventListener('mousemove', onMouseMove);
    domElem.addEventListener('mouseup', onMouseUp);
    domElem.addEventListener('mouseleave', onMouseUp);
    domElem.addEventListener('touchstart', onTouchStart, { passive: true });
    domElem.addEventListener('touchmove', onTouchMove, { passive: true });
    domElem.addEventListener('touchend', handleEnd);

    // Reconstruct mesh appearance entirely based on current state (called on a loop)
    updateDonutMesh = () => {
      if (!doughMesh || !glazeMesh) return;
      const curDesign = designRef.current;
      const targetShape = curDesign.baseType.includes('filled') ? 'filled' : 'ring';
      if (targetShape !== currentShape) {
         currentShape = targetShape;
         if (doughMesh.geometry) doughMesh.geometry.dispose();
         if (glazeMesh.geometry) glazeMesh.geometry.dispose();
         const geos = targetShape === 'filled' ? generateFilledGeo() : generateRingGeo();
         doughMesh.geometry = geos.d;
         glazeMesh.geometry = geos.g;
      }
      const isFilledShape = currentShape === 'filled';

      // Update base dough color
      let doughColor = 0xe0a96d;
      if (curDesign.baseType === 'chocolate') doughColor = 0x4e2d1d;
      if (curDesign.baseType === 'yeast') doughColor = 0xcd9a62;
      if (curDesign.baseType === 'blueberry') doughColor = 0x4a3b52;
      if (curDesign.baseType === 'red_velvet') doughColor = 0x6b2b2b;
      if (curDesign.baseType === 'maple') doughColor = 0xc28f58;
      (doughMesh.material as THREE.MeshStandardMaterial).color.setHex(doughColor);

      // Rebuild Filling Blob
      while(fillingGroup.children.length > 0) { fillingGroup.remove(fillingGroup.children[0]); }
      if (currentShape === 'filled') {
          const mColor = curDesign.baseType === 'filled_jelly' ? 0x990000 : 0xfffdd0;
          const fMat = new THREE.MeshPhysicalMaterial({ color: mColor, roughness: 0.1, clearcoat: 0.8 });
          const blob = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), fMat);
          blob.position.set(2.8, -0.4, 0);
          blob.scale.set(1.5, 1, 1);
          blob.castShadow = true;
          fillingGroup.add(blob);
      }

      // Update glaze styling
      if (curDesign.glazeType === 'none') {
        glazeMesh.visible = false;
      } else {
        glazeMesh.visible = true;
        let glazeColor = 0xda1a5f;
        if (curDesign.glazeType === 'orange') glazeColor = 0xff671f;
        if (curDesign.glazeType === 'chocolate') glazeColor = 0x3d1d10;
        if (curDesign.glazeType === 'coconut') glazeColor = 0xf5f5f5;
        if (curDesign.glazeType === 'vanilla') glazeColor = 0xfffdd0;
        if (curDesign.glazeType === 'maple') glazeColor = 0xba7c40;
        if (curDesign.glazeType === 'matcha') glazeColor = 0x86a674;
        if (curDesign.glazeType === 'blueberry') glazeColor = 0x7a6396;
        
        const mat = glazeMesh.material as THREE.MeshPhysicalMaterial;
        mat.color.setHex(glazeColor);
        mat.roughness = curDesign.glazeType === 'coconut' ? 0.4 : 0.12; 
      }

      // Rebuild Drizzle
      while(drizzleGroup.children.length > 0) { drizzleGroup.remove(drizzleGroup.children[0]); }
      if (curDesign.drizzleType && curDesign.drizzleType !== 'none') {
        const drizzleColors = { 'chocolate': 0x2c1508, 'vanilla': 0xffffff, 'caramel': 0xc27a27, 'strawberry': 0xda1a5f };
        const numPoints = 250;
        const curvePoints = [];
        const isSpiral = curDesign.drizzleType === 'caramel' || curDesign.drizzleType === 'vanilla';
        for (let i = 0; i <= numPoints; i++) {
           const t = i / numPoints;
           let x, y, z;
           if (isFilledShape) {
               let theta = t * Math.PI * 2 * (isSpiral ? 5 : 2);
               let phi = isSpiral ? (t * Math.PI * 0.4) : (Math.abs(Math.sin(theta * 10)) * Math.PI * 0.4);
               const R = 3.3;
               x = Math.sin(phi) * Math.cos(theta) * R;
               z = Math.sin(phi) * Math.sin(theta) * R;
               y = Math.cos(phi) * R * 0.6 + 0.12;
           } else {
               let theta = t * Math.PI * 2 * (isSpiral ? 4 : 1);
               let phi = isSpiral ? (Math.PI / 2) - (t * Math.PI * 0.8) : (Math.sin(theta * 18) * (Math.PI / 2.3)); 
               const R = 3.5, r = 1.62; 
               const tubeX = R + r * Math.sin(phi);
               x = tubeX * Math.cos(theta);
               z = tubeX * Math.sin(theta);
               const baseWave = Math.sin(theta * 8) * Math.cos(theta * 13) * 0.22;
               y = (r * Math.cos(phi)) * 0.85 + 0.18 + baseWave;
           }
           curvePoints.push(new THREE.Vector3(x, y, z));
        }
        try {
          const drizzleGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curvePoints), 400, 0.08, 8, false);
          const mat = new THREE.MeshPhysicalMaterial({ color: drizzleColors[curDesign.drizzleType as keyof typeof drizzleColors], roughness: 0.1, clearcoat: 1.0 });
          const drizzleMesh = new THREE.Mesh(drizzleGeo, mat);
          drizzleMesh.castShadow = true;
          drizzleGroup.add(drizzleMesh);
        } catch(e){}
      }

      // Rebuild Sprinkles
      while(sprinklesGroup.children.length > 0) { sprinklesGroup.remove(sprinklesGroup.children[0]); }
      if (curDesign.sprinklesType !== 'none') {
        const sprinkleColors = curDesign.sprinklesType === 'rainbow' 
          ? [0xff9800, 0xe91e63, 0x9c27b0, 0x2196f3, 0x4caf50, 0xffeb3b, 0xffffff]
          : curDesign.sprinklesType === 'orange' ? [0xff671f] 
          : curDesign.sprinklesType === 'chocolate' ? [0x2c1508]
          : curDesign.sprinklesType === 'pearls' ? [0xffffff]
          : curDesign.sprinklesType === 'gold' ? [0xffd700]
          : [0xda1a5f];

        const count = (curDesign.sprinklesType === 'pearls' || curDesign.sprinklesType === 'gold') ? 80 : 150;
        const sprinkleGeo = (curDesign.sprinklesType === 'pearls' || curDesign.sprinklesType === 'gold') 
          ? new THREE.SphereGeometry(0.12, 8, 8) 
          : new THREE.CapsuleGeometry(0.08, 0.25, 4, 8);
        
        for (let i = 0; i < count; i++) {
          const theta = Math.random() * Math.PI * 2;
          let x, y, z;
          if (isFilledShape) {
              const phi = Math.random() * Math.PI * 0.45;
              const R = 3.25;
              x = Math.sin(phi) * Math.cos(theta) * R;
              z = Math.sin(phi) * Math.sin(theta) * R;
              y = Math.cos(phi) * R * 0.6 + 0.15;
          } else {
              const phi = Math.random() * Math.PI * 0.7 + 0.15; 
              const R = 3.5, r = 1.55;
              const tubeX = R + r * Math.cos(phi);
              x = tubeX * Math.cos(theta);
              z = tubeX * Math.sin(theta);
              const wave = Math.sin(theta * 8) * Math.cos(theta * 13) * 0.22;
              y = (r * Math.sin(phi)) * 0.85 + 0.18 + wave + 0.05;
          }
          const randColor = sprinkleColors[Math.floor(Math.random() * sprinkleColors.length)];
          const sprinkleMat = new THREE.MeshStandardMaterial({ color: randColor, roughness: 0.3 });
          const spMesh = new THREE.Mesh(sprinkleGeo, sprinkleMat);
          spMesh.position.set(x, y, z);
          spMesh.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
          spMesh.castShadow = true;
          sprinklesGroup.add(spMesh);
        }
      }

      // Rebuild Fun Toppings
      while(toppingsGroup.children.length > 0) { toppingsGroup.remove(toppingsGroup.children[0]); }
      const placeOnSurface = (mesh: THREE.Object3D, theta: number, phi: number) => {
        if (isFilledShape) {
            const R = 3.25;
            const x = Math.sin(phi) * Math.cos(theta) * R;
            const z = Math.sin(phi) * Math.sin(theta) * R;
            const y = Math.cos(phi) * R * 0.6 + 0.2;
            mesh.position.set(x, y, z);
            mesh.lookAt(x + x, y + y, z + z);
            mesh.rotateX(Math.random() * 1.5);
        } else {
            const R = 3.5, r = 1.6;
            const tubeX = R + r * Math.cos(phi);
            const x = tubeX * Math.cos(theta);
            const z = tubeX * Math.sin(theta);
            const wave = Math.sin(theta * 8) * Math.cos(theta * 13) * 0.22;
            const y = (r * Math.sin(phi)) * 0.85 + 0.18 + wave + 0.2;
            mesh.position.set(x, y, z);
            mesh.lookAt(x + x, y + r*10, z + z); 
            mesh.rotateX(Math.random() * 1.5);
        }
      };

      curDesign.customToppings.forEach(toppingId => {
        if (toppingId === 'raccoon') {
          for (let i = 0; i < 2; i++) {
            const racGroup = new THREE.Group();
            const mat = new THREE.MeshStandardMaterial({ color: 0x6e6e6e, roughness: 0.8 });
            const m1 = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 12), mat);
            m1.castShadow = true; racGroup.add(m1);
            placeOnSurface(racGroup, i * Math.PI + 0.5, 0.4);
            toppingsGroup.add(racGroup);
          }
        }
        if (toppingId === 'coffee_beans') {
          const beanGeo = new THREE.SphereGeometry(0.4, 12, 12).scale(1, 0.6, 0.5);
          const beanMat = new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 0.65 });
          for (let j = 0; j < 6; j++) {
            const m = new THREE.Mesh(beanGeo, beanMat);
            m.castShadow = true; placeOnSurface(m, j * (Math.PI / 3) + 0.8, 0.5 + Math.random()*0.2);
            toppingsGroup.add(m);
          }
        }
        if (toppingId === 'marshmallows') {
          const marshGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.5, 12);
          const marshMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
          for (let k = 0; k < 6; k++) {
            const m = new THREE.Mesh(marshGeo, marshMat);
            m.castShadow = true; placeOnSurface(m, k * (Math.PI / 3) - 0.2, 0.3 + Math.random()*0.2);
            toppingsGroup.add(m);
          }
        }
        if (toppingId === 'gold_foil') {
          const foilGeo = new THREE.ConeGeometry(0.2, 0.4, 4);
          const foilMat = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.1, metalness: 0.8 });
          for (let l = 0; l < 8; l++) {
            const m = new THREE.Mesh(foilGeo, foilMat);
            m.castShadow = true; placeOnSurface(m, l * (Math.PI / 4) + Math.random(), 0.4);
            toppingsGroup.add(m);
          }
        }
        if (toppingId === 'bacon') {
          const baconGeo = new THREE.BoxGeometry(0.6, 0.1, 0.3);
          const baconMat = new THREE.MeshStandardMaterial({ color: 0x8a3a33, roughness: 0.9, bumpScale: 0.1 });
          for (let b = 0; b < 9; b++) {
            const m = new THREE.Mesh(baconGeo, baconMat);
            m.castShadow = true; placeOnSurface(m, b * (Math.PI / 4.5) + Math.random(), 0.5);
            m.rotateY(Math.random() * Math.PI); toppingsGroup.add(m);
          }
        }
        if (toppingId === 'strawberries') {
          const berryGeo = new THREE.ConeGeometry(0.25, 0.35, 8);
          const berryMat = new THREE.MeshStandardMaterial({ color: 0xc42131, roughness: 0.5 });
          for (let s = 0; s < 7; s++) {
            const m = new THREE.Mesh(berryGeo, berryMat);
            m.castShadow = true; placeOnSurface(m, s * (Math.PI / 3.5) + Math.random(), 0.6);
            m.rotateX(-Math.PI / 2); toppingsGroup.add(m);
          }
        }
        if (toppingId === 'blueberries') {
          const berryGeo = new THREE.SphereGeometry(0.2, 16, 16);
          const berryMat = new THREE.MeshStandardMaterial({ color: 0x2d3a54, roughness: 0.3 });
          for (let s = 0; s < 12; s++) {
            const m = new THREE.Mesh(berryGeo, berryMat);
            m.castShadow = true; placeOnSurface(m, Math.random() * Math.PI * 2, 0.3 + Math.random()*0.3);
            toppingsGroup.add(m);
          }
        }
        if (toppingId === 'bananas') {
          const bananaGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16);
          const bananaMat = new THREE.MeshStandardMaterial({ color: 0xfffdd0, roughness: 0.7 });
          for (let s = 0; s < 8; s++) {
            const m = new THREE.Mesh(bananaGeo, bananaMat);
            m.castShadow = true; placeOnSurface(m, Math.random() * Math.PI * 2, 0.3 + Math.random()*0.2);
            m.rotateX(Math.PI/2); toppingsGroup.add(m);
          }
        }
        if (toppingId === 'oreo') {
          const oreoGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 8);
          const oreoMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
          for (let o = 0; o < 14; o++) {
            const m = new THREE.Mesh(oreoGeo, oreoMat);
            m.castShadow = true; placeOnSurface(m, o * (Math.PI / 7) + Math.random()*0.5, 0.4 + Math.random()*0.2);
            toppingsGroup.add(m);
          }
        }
      });

      // 3D Groovy Text
      while(textGroup.children.length > 0) { textGroup.remove(textGroup.children[0]); }
      if (loadedFont && curDesign.icingMessage) {
          const textGeo = new TextGeometry(curDesign.icingMessage, {
              font: loadedFont, size: 0.7, depth: 0.15, curveSegments: 6,
              bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.02, bevelSegments: 3
          });
          textGeo.computeBoundingBox();
          const xOff = -0.5 * (textGeo.boundingBox!.max.x - textGeo.boundingBox!.min.x);
          textGeo.translate(xOff, 0, 0);

          const tPos = textGeo.attributes.position;
          for (let i = 0; i < tPos.count; i++) {
              const x = tPos.getX(i);
              tPos.setY(i, tPos.getY(i) + Math.sin(x * 1.5) * 0.25); 
          }
          textGeo.computeVertexNormals();

          const tMat = new THREE.MeshPhysicalMaterial({ color: 0xda1a5f, roughness: 0.2, clearcoat: 0.8, emissive: 0xda1a5f, emissiveIntensity: 0.1 });
          const tMesh = new THREE.Mesh(textGeo, tMat);
          tMesh.position.y = 4.5;
          tMesh.rotation.x = -Math.PI / 10;
          tMesh.castShadow = true;
          textGroup.add(tMesh);
      }
    };

    // Render loop state sync
    updateDonutMesh();

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };
    window.addEventListener('resize', handleResize);

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (autoSpinRef.current) {
        if (isRecordingRef.current) {
          targetRotationY -= 0.05; // Spin faster and grander for the video export
        } else {
          targetRotationY -= 0.005;
        }
      }
      
      donutGroup.rotation.y += (targetRotationY - donutGroup.rotation.y) * 0.15;
      worldGroup.rotation.x += (targetRotationX - worldGroup.rotation.x) * 0.15;
      
      // Animate Steam
      const positions = steamGeo.attributes.position.array as Float32Array;
      const lives = steamGeo.attributes.life.array as Float32Array;
      for (let i = 0; i < maxParticles; i++) {
          lives[i] += 1;
          positions[i*3+1] += 0.02; // speed up
          positions[i*3] += Math.sin(lives[i]*0.02) * 0.02;
          positions[i*3+2] += Math.cos(lives[i]*0.02) * 0.02;
          // Scale opacity based on height
          if (positions[i*3+1] > 6) {
              positions[i*3+1] = -1.5;
              positions[i*3] = (Math.random() - 0.5) * 6;
              positions[i*3+2] = (Math.random() - 0.5) * 6;
          }
      }
      steamGeo.attributes.position.needsUpdate = true;

      // Standard render
      renderer.render(scene, camera);

      // Compositing process for 3D Custom Video Export with Dunkin Overlay
      if (isRecordingRef.current && recordCanvasRef.current) {
        const rc = recordCanvasRef.current;
        const ctx = rc.getContext('2d');
        if (ctx) {
          // Warm Background Layer
          ctx.fillStyle = '#fff4ea'; // Soft cream
          ctx.fillRect(0, 0, 800, 800);
          
          // Branded Top Headers
          ctx.fillStyle = '#FF671F';
          ctx.fillRect(0, 0, 800, 24);
          ctx.fillStyle = '#DA1A5F';
          ctx.fillRect(0, 24, 800, 24);

          // Typography
          ctx.fillStyle = '#DA1A5F';
          ctx.font = '900 72px sans-serif'; 
          ctx.textAlign = 'center';
          ctx.fillText("DUNKIN'", 400, 130);

          ctx.fillStyle = '#FF671F';
          ctx.font = '800 36px sans-serif';
          ctx.fillText("COMMUNITY CREATION", 400, 180);

          // Draw the live WebGL scene right in the middle
          ctx.drawImage(renderer.domElement, 150, 200, 500, 466);

          // Footer section with avatar and name
          if (selfieImgRef.current) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(80, 720, 50, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(selfieImgRef.current, 30, 670, 100, 100);
            ctx.restore();
            
            ctx.beginPath();
            ctx.arc(80, 720, 50, 0, Math.PI * 2);
            ctx.lineWidth = 4;
            ctx.strokeStyle = '#FF671F';
            ctx.stroke();

            ctx.fillStyle = '#FF671F';
            ctx.font = 'bold 24px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`Chef: ${metaRef.current.creatorName || 'Super Fan'}`, 150, 720);
            ctx.fillStyle = '#4b5563';
            ctx.font = 'italic 18px sans-serif';
            ctx.fillText("Made specially by our team & guests ✨", 150, 750);
          } else {
            ctx.fillStyle = '#4b5563';
            ctx.font = 'italic 28px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText("Made specially by our team & guests ✨", 400, 760);
          }
          
          ctx.fillStyle = '#FF671F';
          ctx.fillRect(0, 776, 800, 24);
        }
      }
    };
    animate();

    const intervalCheck = setInterval(() => { updateDonutMesh(); }, 300);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      clearInterval(intervalCheck);
      domElem.removeEventListener('mousedown', onMouseDown);
      domElem.removeEventListener('mousemove', onMouseMove);
      domElem.removeEventListener('mouseup', onMouseUp);
      domElem.removeEventListener('mouseleave', onMouseUp);
      domElem.removeEventListener('touchstart', onTouchStart);
      domElem.removeEventListener('touchmove', onTouchMove);
      domElem.removeEventListener('touchend', handleEnd);
      if (mountRef.current) mountRef.current.innerHTML = '';
      renderer.dispose();
    };
  }, []);

  const toggleCustomTopping = (toppingId: string) => {
    setDesign(prev => ({
      ...prev,
      customToppings: prev.customToppings.includes(toppingId) 
        ? prev.customToppings.filter(t => t !== toppingId)
        : [...prev.customToppings, toppingId]
    }));
  };

  const handleGlazeSlick = () => {
    setBakingProcess("Warming the fresh dough... 🍩");
    setTimeout(() => setBakingProcess("Adding sweet frosting and toppings... ✨"), 1000);
    setTimeout(() => setBakingProcess("Boxing it up to share with love! 🎉"), 2000);

    // Start background video recording for 3 seconds while "baking"
    if (recordCanvasRef.current) {
      isRecordingRef.current = true;
      autoSpinRef.current = true;
      recordedChunksRef.current = [];
      const stream = recordCanvasRef.current.captureStream(30);
      let mimeType = 'video/webm';
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        mimeType = 'video/webm; codecs=vp9';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
        mimeType = 'video/webm; codecs=vp8';
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        isRecordingRef.current = false;
      };
      recorder.start();
      
      setTimeout(() => {
        recorder.stop();
      }, 3000);
    }

    setTimeout(() => {
      setReceipt({
        id: `TKT-${Math.floor(Math.random() * 9000) + 1000}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        qty: 1
      });
      setBakingProcess(null);
      setSubmitStatus('idle'); // Reset sub status for new bake
    }, 3000);
  };

  const exportVideo = () => {
    if (videoUrl) {
      const a = document.createElement('a');
      document.body.appendChild(a);
      a.style.display = 'none';
      a.href = videoUrl;
      a.download = `my-dunkin-donut-creation.webm`;
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleSubmitDesign = async () => {
    if (submitStatus === 'success') return;
    setSubmitStatus('sending');
    
    try {
      let uploadedVideoUrl = videoUrl;
      let videoStorageKey = null;
      
      // Upload video to Netlify Blob Storage if exists
      if (videoUrl && recordCanvasRef.current) {
        try {
          const videoBlob = await fetch(videoUrl).then(r => r.blob());
          const reader = new FileReader();
          const base64Promise = new Promise((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
          });
          reader.readAsDataURL(videoBlob);
          const base64 = await base64Promise;
          
          const uploadResult = await uploadVideo(videoBlob, 'donut-video.webm');
          uploadedVideoUrl = uploadResult.url;
          videoStorageKey = uploadResult.storageKey;
        } catch (uploadErr) {
          console.error('Video upload failed, using local URL:', uploadErr);
        }
      }
      
      // Submit to Netlify DB
      const result = await submitDonut({
        creatorName: creatorName || 'Anonymous Fan',
        creatorEmail: creatorEmail || null,
        creatorPhone: creatorPhone || null,
        creatorCity: creatorCity || null,
        creatorImage: creatorImage,
        twitterHandle: twitterHandle || null,
        instagramHandle: instagramHandle || null,
        tiktokHandle: tiktokHandle || null,
        design: design,
        videoUrl: uploadedVideoUrl,
        videoStorageKey: videoStorageKey || undefined,
      });
      
      setSubmitStatus('success');
      if (onSubmit) {
        onSubmit({
          id: result.id,
          creatorName: creatorName || 'Anonymous Fan',
          creatorEmail: creatorEmail || null,
          creatorPhone: creatorPhone || null,
          creatorCity: creatorCity || null,
          creatorImage: creatorImage,
          twitterHandle: twitterHandle || null,
          instagramHandle: instagramHandle || null,
          tiktokHandle: tiktokHandle || null,
          design: design,
          videoUrl: uploadedVideoUrl,
          likes: 0,
          createdAt: new Date().toISOString(),
          status: 'approved'
        });
      }
    } catch (err) {
      console.error('Submission error:', err);
      setSubmitStatus('idle');
      alert('Failed to submit donut. Please try again!');
    }
  };

  return (
    <div className="bg-white rounded-2xl border-4 border-[#FF671F] overflow-hidden shadow-xl" id="donut-creator">
      <div className="bg-[#FF671F] px-6 py-4 flex flex-col md:flex-row justify-between items-center text-white gap-3">
        <div>
          <h2 className="font-display font-black text-2xl tracking-tight uppercase flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-300" /> 3D Donut Canvas
          </h2>
          <p className="text-white/90 text-xs font-sans mt-0.5 max-w-xl">
            Design your perfect dream donut in gorgeous 3D! Save it as a video or submit it to be on our official Dunkin' menu!
          </p>
        </div>
        <div className="p-2 bg-white/20 rounded-xl hidden md:block"><ShoppingBag className="w-5 h-5 text-white" /></div>
      </div>

      <div className="p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          
          {/* Main Viewer Area */}
          <div className="flex flex-col items-center justify-center bg-zinc-50 border border-zinc-200 rounded-xl p-5 relative">
            <span className="absolute top-3 left-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-white border border-zinc-200 px-2 py-1 rounded shadow-sm z-10">
              Live Preview (Drag to spin)
            </span>

            {/* Video overlay alert indicator */}
            {recording && (
              <span className="absolute top-3 right-3 text-[10px] font-bold text-white bg-red-500 flex items-center gap-1.5 px-2 py-1 rounded shadow-sm z-10 animate-pulse">
                <span className="w-2 h-2 bg-white rounded-full"></span> RECORDING VIDEO...
              </span>
            )}

            <div className="w-full h-[320px] md:h-[400px] relative flex items-center justify-center rounded-lg cursor-grab active:cursor-grabbing bg-gradient-to-tr from-[#FF671F] to-[#DA1A5F] shadow-inner" ref={mountRef}>
              <div className="text-xs text-gray-400 font-sans">Warming up 3D Bakery...</div>
            </div>
          </div>

          {/* Builder Controls Area */}
          <div className="flex flex-col justify-between">
            <div className="space-y-4">
              <div className="bg-white border border-zinc-200 rounded-xl p-4 md:text-center">
                <span className="block text-sm font-black text-zinc-800 uppercase mb-3 text-left md:text-center">1. Fresh Dough Base</span>
                <div className="flex flex-wrap md:justify-center gap-2">
                  {[{ id: 'classic', label: 'Classic Golden' }, { id: 'chocolate', label: 'Rich Chocolate' }, { id: 'yeast', label: 'Glazed Yeast' }, { id: 'blueberry', label: 'Blueberry Cake' }, { id: 'red_velvet', label: 'Red Velvet' }, { id: 'maple', label: 'Maple Cake' }, { id: 'filled_jelly', label: 'Jelly Filled' }, { id: 'filled_cream', label: 'Boston Kreme' }].map((bt) => (
                    <button key={bt.id} onClick={() => setDesign(prev => ({ ...prev, baseType: bt.id as any }))}
                      className={`flex-1 min-w-[100px] py-1.5 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${design.baseType === bt.id ? 'bg-[#FF671F] border-[#FF671F] text-white shadow-sm scale-105' : 'bg-white border-zinc-200 text-zinc-700 hover:bg-orange-50'}`}>
                      {bt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-zinc-200 rounded-xl p-4 md:text-center">
                <span className="block text-sm font-black text-zinc-800 uppercase mb-3 text-left md:text-center">2. Sweet Frosting Flavor</span>
                <div className="flex flex-wrap md:justify-center gap-1.5">
                  {[{ id: 'pink', label: 'Strawberry' }, { id: 'orange', label: 'Orange' }, { id: 'chocolate', label: 'Fudge' }, { id: 'coconut', label: 'Coconut' }, { id: 'vanilla', label: 'Vanilla' }, { id: 'maple', label: 'Maple' }, { id: 'matcha', label: 'Matcha' }, { id: 'blueberry', label: 'Blueberry' }, { id: 'none', label: 'Plain' }].map((g) => (
                    <button key={g.id} onClick={() => setDesign(prev => ({ ...prev, glazeType: g.id as any }))}
                      className={`flex-1 min-w-[70px] py-1.5 px-1 rounded-lg text-[11px] font-bold border tracking-tight transition-all cursor-pointer ${design.glazeType === g.id ? 'bg-[#DA1A5F] border-[#DA1A5F] text-white shadow-sm scale-105' : 'bg-white border-zinc-200 text-zinc-700 hover:bg-pink-50'}`}>
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-zinc-200 rounded-xl p-4 md:text-center">
                <span className="block text-sm font-black text-zinc-800 uppercase mb-3 text-left md:text-center">3. Extra Drizzle</span>
                <div className="flex flex-wrap md:justify-center gap-1.5 mb-4">
                  {[{ id: 'chocolate', label: '🍫 Fudge' }, { id: 'caramel', label: '🍮 Caramel' }, { id: 'strawberry', label: '🍓 Berry' }, { id: 'vanilla', label: '🍦 Vanilla' }, { id: 'none', label: 'None' }].map((dr) => (
                    <button key={dr.id} onClick={() => setDesign(prev => ({ ...prev, drizzleType: dr.id as any }))}
                      className={`flex-1 min-w-[70px] py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${design.drizzleType === dr.id ? 'bg-[#FF671F] border-[#FF671F] text-white scale-105' : 'bg-white border-zinc-200 text-zinc-700 hover:bg-orange-50'}`}>
                      {dr.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-zinc-200 rounded-xl p-4 md:text-center">
                <span className="block text-sm font-black text-zinc-800 uppercase mb-3 text-left md:text-center">4. Sprinkles & Fun Toppings</span>
                <div className="flex flex-wrap md:justify-center gap-1.5 mb-4">
                  {[{ id: 'rainbow', label: '🌈 Rainbow' }, { id: 'orange', label: '🍊 Orange' }, { id: 'pink', label: '💕 Pink' }, { id: 'chocolate', label: '🍫 Chocolate' }, { id: 'pearls', label: '⚪ Pearls' }, { id: 'gold', label: '🌟 Gold Dust' }, { id: 'none', label: 'None' }].map((sp) => (
                    <button key={sp.id} onClick={() => setDesign(prev => ({ ...prev, sprinklesType: sp.id as any }))}
                      className={`flex-1 min-w-[80px] py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${design.sprinklesType === sp.id ? 'bg-[#FF671F] border-[#FF671F] text-white scale-105' : 'bg-white border-zinc-200 text-zinc-700 hover:bg-orange-50'}`}>
                      {sp.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap md:justify-center gap-2 pt-4 border-t border-zinc-100">
                  {TOPPING_OPTIONS.map((opt) => {
                    const isToggled = design.customToppings.includes(opt.id);
                    return (
                      <button key={opt.id} onClick={() => toggleCustomTopping(opt.id)}
                        className={`px-3 py-2 rounded-xl border-2 transition-all flex flex-col justify-center items-center md:items-center items-start gap-1 cursor-pointer min-w-[120px] ${isToggled ? 'border-[#DA1A5F] bg-pink-50' : 'border-zinc-200 hover:border-pink-200 bg-white'}`}>
                        <span className="text-xs font-bold text-zinc-800 flex items-center justify-between w-full md:justify-center">
                           {opt.label.split(' ')[0]} {isToggled && <Check className="ml-1 w-3 h-3 text-[#DA1A5F]" />}
                        </span>
                        <span className="text-[10px] text-zinc-500 leading-tight block">{opt.label.split(' ').slice(1).join(' ')}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white border text-center border-zinc-200 rounded-xl p-4 md:text-center text-left">
                <span className="block text-sm font-black text-zinc-800 uppercase mb-3">5. Add a warm message</span>
                <input type="text" maxLength={15} placeholder="Smile! You're awesome!" value={design.icingMessage}
                  onChange={(e) => setDesign(prev => ({ ...prev, icingMessage: e.target.value }))}
                  className="w-full bg-zinc-50 border-2 border-zinc-200 focus:border-[#FF671F] rounded-lg px-4 py-3 text-sm text-zinc-800 md:text-center outline-none transition-colors font-bold uppercase tracking-wider"
                />
              </div>

              <div className="bg-white border text-center border-zinc-200 rounded-xl p-4 md:text-center text-left">
                <span className="block text-sm font-black text-zinc-800 uppercase mb-3">6. Chef Contact Info</span>
                <p className="text-xs text-zinc-500 mb-3">We'll only use this to contact you if you win or for competition updates!</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <input 
                    type="email" 
                    placeholder="Your Email *" 
                    value={creatorEmail}
                    onChange={(e) => setCreatorEmail(e.target.value)}
                    className="w-full bg-zinc-50 border-2 border-zinc-200 focus:border-[#FF671F] rounded-lg px-3 py-2.5 text-sm text-zinc-800 outline-none transition-colors font-medium"
                  />
                  <input 
                    type="tel" 
                    placeholder="Your Phone (optional)" 
                    value={creatorPhone}
                    onChange={(e) => setCreatorPhone(e.target.value)}
                    className="w-full bg-zinc-50 border-2 border-zinc-200 focus:border-[#FF671F] rounded-lg px-3 py-2.5 text-sm text-zinc-800 outline-none transition-colors font-medium"
                  />
                  <input 
                    type="text" 
                    placeholder="Your City (optional)" 
                    value={creatorCity}
                    onChange={(e) => setCreatorCity(e.target.value)}
                    className="w-full bg-zinc-50 border-2 border-zinc-200 focus:border-[#FF671F] rounded-lg px-3 py-2.5 text-sm text-zinc-800 outline-none transition-colors font-medium"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <input 
                    type="text" 
                    placeholder="X / Twitter Handle (optional)" 
                    value={twitterHandle}
                    onChange={(e) => setTwitterHandle(e.target.value.replace(/^@+/, '').replace(/\s/g, ''))}
                    className="w-full bg-zinc-50 border-2 border-zinc-200 focus:border-[#FF671F] rounded-lg px-3 py-2.5 text-sm text-zinc-800 outline-none transition-colors font-medium"
                  />
                  <input 
                    type="text" 
                    placeholder="Instagram Handle (optional)" 
                    value={instagramHandle}
                    onChange={(e) => setInstagramHandle(e.target.value.replace(/^@+/, '').replace(/\s/g, ''))}
                    className="w-full bg-zinc-50 border-2 border-zinc-200 focus:border-[#FF671F] rounded-lg px-3 py-2.5 text-sm text-zinc-800 outline-none transition-colors font-medium"
                  />
                  <input 
                    type="text" 
                    placeholder="TikTok Handle (optional)" 
                    value={tiktokHandle}
                    onChange={(e) => setTiktokHandle(e.target.value.replace(/^@+/, '').replace(/\s/g, ''))}
                    className="w-full bg-zinc-50 border-2 border-zinc-200 focus:border-[#FF671F] rounded-lg px-3 py-2.5 text-sm text-zinc-800 outline-none transition-colors font-medium"
                  />
                </div>
                <div className="flex flex-col md:flex-row gap-3 items-center">
                  <input type="text" maxLength={20} placeholder="Your Name *" value={creatorName}
                    onChange={(e) => setCreatorName(e.target.value)}
                    className="flex-1 w-full bg-zinc-50 border-2 border-zinc-200 focus:border-[#FF671F] rounded-lg px-3 py-2.5 text-sm text-zinc-800 outline-none transition-colors font-bold uppercase"
                  />
                  <div className="flex-1 w-full flex gap-2">
                    <button 
                      onClick={() => setIsCameraOpen(true)}
                      className="flex-[2] bg-[#DA1A5F] hover:bg-[#c11551] text-white rounded-lg py-2.5 px-3 flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm font-bold uppercase text-[10px]"
                    >
                      <Camera className="w-4 h-4" /> Snap Selfie
                    </button>
                    <label className="flex-[1] bg-zinc-100 hover:bg-zinc-200 border-2 border-dashed border-zinc-300 rounded-lg py-2.5 px-3 flex flex-col items-center justify-center cursor-pointer transition-colors relative overflow-hidden" title="Upload Photo">
                      {creatorImage ? (
                         <img src={creatorImage} alt="Selfie" className="absolute inset-0 w-full h-full object-cover opacity-80" />
                      ) : (
                         <Upload className="w-4 h-4 text-zinc-500" />
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-2">
              <button onClick={handleGlazeSlick} disabled={!!bakingProcess}
                className="w-full bg-gradient-to-r from-[#FF671F] to-[#DA1A5F] hover:shadow-lg text-white font-display font-black text-sm py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md">
                <Heart className="w-5 h-5 fill-white" />
                {bakingProcess ? "PREPPING IN BAKERY..." : "BAKE MY BEAUTIFUL DONUT 🍩"}
              </button>
            </div>
          </div>
        </div>

        {/* Baking Animation State */}
        <AnimatePresence>
          {bakingProcess && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y:0 }} exit={{ opacity: 0, scale: 0.95 }} className="mt-6 py-4 px-6 bg-pink-50 text-[#DA1A5F] border-2 border-pink-200 rounded-xl flex items-center justify-center gap-3">
              <div className="w-5 h-5 border-4 border-t-[#DA1A5F] border-r-transparent animate-spin rounded-full"></div>
              <span className="text-sm font-bold animate-pulse">{bakingProcess}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Finished Ticket & Action Panel */}
        <AnimatePresence>
          {receipt && !bakingProcess && (
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }} className="mt-8 mx-auto bg-amber-50 border-2 border-[#DA1A5F] rounded-xl p-6 shadow-md relative overflow-hidden flex flex-col md:flex-row gap-6 items-center md:items-stretch">
              
              <div className="flex-1 space-y-4">
                <div className="text-center md:text-left border-b border-orange-200 pb-3">
                  <h3 className="font-display font-black text-2xl text-[#DA1A5F] uppercase tracking-tight">Freshly Baked!</h3>
                  <p className="text-zinc-600 font-medium text-sm mt-1">Your beautiful fresh creation is ready.</p>
                </div>
                
                <ul className="text-xs font-mono text-zinc-600 space-y-2">
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-green-500" /> Dough: {design.baseType.toUpperCase()}</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-green-500" /> Frosting: {design.glazeType.toUpperCase()}</li>
                  {design.icingMessage && <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-green-500" /> Icing Message: "{design.icingMessage}"</li>}
                </ul>
              </div>

              <div className="flex-1 flex flex-col gap-3 w-full border-t md:border-t-0 md:border-l border-orange-200 pt-4 md:pt-0 md:pl-6">
                
                {/* VIDEO EXPORT BUTTON */}
                <button 
                  onClick={exportVideo} 
                  disabled={recording} 
                  className={`w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-black uppercase text-xs transition-all shadow-sm cursor-pointer ${
                    recording ? 'bg-red-500 text-white animate-pulse' : 'bg-white border-2 border-[#DA1A5F] text-[#DA1A5F] hover:bg-pink-50'
                  }`}
                >
                  <Video className="w-4 h-4" />
                  {recording ? "Recording Spin Video..." : "Export Video Clip"}
                </button>

                {/* SUBMIT TO MENU BUTTON */}
                <button 
                  onClick={handleSubmitDesign} 
                  disabled={submitStatus !== 'idle'} 
                  className={`w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-black uppercase text-xs transition-all shadow-sm cursor-pointer ${
                    submitStatus === 'success' ? 'bg-green-500 text-white border-2 border-green-500' :
                    submitStatus === 'sending' ? 'bg-[#FF671F] text-white opacity-80' : 
                    'bg-[#FF671F] border-2 border-[#FF671F] text-white hover:bg-orange-600'
                  }`}
                >
                  {submitStatus === 'success' ? <Award className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                  {submitStatus === 'sending' ? "Sending to Bakery Team..." :
                   submitStatus === 'success' ? "Added to Community Menu!" : 
                   "Submit to Official Menu!"}
                </button>

              </div>
              
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selfie Camera Modal */}
        <SelfieCameraModal 
          isOpen={isCameraOpen} 
          onClose={() => setIsCameraOpen(false)} 
          onCapture={(dataUrl) => {
            handleImageUploadDataUrl(dataUrl);
            setIsCameraOpen(false);
          }} 
        />
      </div>
    </div>
  );
}
