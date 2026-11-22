import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  RotateCcw,
  Play,
  Pause,
  Compass,
  Layers,
  X,
  Maximize2,
  Minimize2,
  Building2,
  Eye,
  CheckCircle2,
  Info,
} from 'lucide-react';

export interface Hotspot {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  lng: number;
  lat: number;
  camera: {
    pitch: number;
    bearing: number;
    zoom: number;
  };
}

export interface Map3DTourProps {
  latitude?: number | null;
  longitude?: number | null;
  modelUrl?: string | null;
  onHotspotClick?: (hotspot: Hotspot) => void;
  onClose?: () => void;
  className?: string;
}

// Fallback demo token if environment variables are not yet populated
const DEFAULT_MAPBOX_TOKEN =
  import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ||
  import.meta.env.VITE_MAPBOX_TOKEN ||
  'pk.eyJ1IjoibWFwYm94YWRtaW4iLCJhIjoiY2x0MWN3MDB4MDB0dzJxcGhmbmUxdWNnbSJ9.5Xp5CkmDkW6C7qY7pfnQKg';

export const Map3DTour: React.FC<Map3DTourProps> = ({
  latitude,
  longitude,
  modelUrl,
  onHotspotClick,
  onClose,
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const popupsRef = useRef<mapboxgl.Popup[]>([]);
  const orbitAnimIdRef = useRef<number | null>(null);

  // Fallback prime real-estate coordinates if none provided
  const centerLng = typeof longitude === 'number' && !isNaN(longitude) ? longitude : 73.0931;
  const centerLat = typeof latitude === 'number' && !isNaN(latitude) ? latitude : 33.7294;

  const [isOrbiting, setIsOrbiting] = useState<boolean>(false);
  const [activeHotspotId, setActiveHotspotId] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [modelLoading, setModelLoading] = useState<boolean>(false);
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite'>('streets');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [activeInfo, setActiveInfo] = useState<Hotspot | null>(null);

  // Define realistic hotspots positioned relative to the building's coordinates
  const hotspots: Hotspot[] = [
    {
      id: 'front-view',
      name: 'Front View',
      subtitle: 'Grand Entrance & Portico',
      description:
        'Street-level architectural perspective showcasing the double-height facade, landscaped portico, and vehicular entry plaza.',
      lng: centerLng + 0.00012,
      lat: centerLat - 0.00015,
      camera: { pitch: 50, bearing: 10, zoom: 18.4 },
    },
    {
      id: 'pent-house',
      name: 'Pent House',
      subtitle: 'Sky Terrace & Solarium',
      description:
        'Elevated bird’s-eye perspective capturing the private penthouse roof deck, panoramic glass solarium, and bespoke skyline vistas.',
      lng: centerLng + 0.00005,
      lat: centerLat + 0.0001,
      camera: { pitch: 65, bearing: 140, zoom: 19.1 },
    },
    {
      id: 'infinity-pool',
      name: 'Infinity Pool',
      subtitle: 'Sun Deck & Cabanas',
      description:
        'A resort-style heated infinity pool accented with recessed lounge seating, poolside cabanas, and manicured perimeter greenery.',
      lng: centerLng - 0.00015,
      lat: centerLat - 0.00006,
      camera: { pitch: 58, bearing: -60, zoom: 18.6 },
    },
    {
      id: 'rear-gardens',
      name: 'Rear Courtyard',
      subtitle: 'Private Zen Retreat',
      description:
        'Secluded backyard courtyard equipped with outdoor dining pergola, architectural firepit, and mature arbor pathways.',
      lng: centerLng - 0.00008,
      lat: centerLat + 0.00016,
      camera: { pitch: 62, bearing: -140, zoom: 18.7 },
    },
  ];

  // Helper to create a procedural modern luxury 3D villa/penthouse
  const buildProcedural3DBuilding = (): THREE.Group => {
    const buildingGroup = new THREE.Group();

    // 1. Foundation Podium (Dark basalt slab)
    const baseGeo = new THREE.BoxGeometry(32, 2, 26);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.8,
      metalness: 0.2,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.set(0, 1, 0);
    buildingGroup.add(baseMesh);

    // 2. Ground Floor Living Pavilion (White stucco & floor-to-ceiling glass)
    const gfGeo = new THREE.BoxGeometry(26, 6, 20);
    const gfMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.3,
      metalness: 0.1,
    });
    const gfMesh = new THREE.Mesh(gfGeo, gfMat);
    gfMesh.position.set(-2, 5, -1);
    buildingGroup.add(gfMesh);

    // Floor-to-ceiling glass facade panels
    const glassGeo = new THREE.BoxGeometry(20, 5, 0.4);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.65,
      roughness: 0.1,
      metalness: 0.8,
      reflectivity: 0.9,
    });
    const frontGlass = new THREE.Mesh(glassGeo, glassMat);
    frontGlass.position.set(-2, 5, 9.1);
    buildingGroup.add(frontGlass);

    // 3. Cantilevered Upper Level / Penthouse Suite
    const upperGeo = new THREE.BoxGeometry(28, 5.5, 18);
    const upperMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.4,
      metalness: 0.3,
    });
    const upperMesh = new THREE.Mesh(upperGeo, upperMat);
    upperMesh.position.set(2, 10.75, 2);
    buildingGroup.add(upperMesh);

    // Cantilever Balcony Railing (Glass)
    const balconyGeo = new THREE.BoxGeometry(28, 1.4, 0.2);
    const balconyMesh = new THREE.Mesh(balconyGeo, glassMat);
    balconyMesh.position.set(2, 14, 11.1);
    buildingGroup.add(balconyMesh);

    // 4. Rooftop Penthouse Terrace & Architectural Pergola
    const roofRoomGeo = new THREE.BoxGeometry(14, 4.5, 12);
    const roofRoomMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.2,
      metalness: 0.4,
    });
    const roofRoom = new THREE.Mesh(roofRoomGeo, roofRoomMat);
    roofRoom.position.set(-2, 15.75, 0);
    buildingGroup.add(roofRoom);

    // Wood slat pergola on roof
    const slatMat = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.7,
    });
    for (let i = 0; i < 7; i++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(10, 0.4, 0.6), slatMat);
      slat.position.set(8, 18, -4 + i * 1.5);
      buildingGroup.add(slat);
    }

    // 5. Azure Infinity Pool
    const poolBorderGeo = new THREE.BoxGeometry(10, 0.8, 16);
    const poolBorderMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.5,
    });
    const poolBorder = new THREE.Mesh(poolBorderGeo, poolBorderMat);
    poolBorder.position.set(-16, 1.4, 2);
    buildingGroup.add(poolBorder);

    const waterGeo = new THREE.BoxGeometry(8.5, 0.2, 14.5);
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.85,
      roughness: 0.05,
      metalness: 0.2,
      transmission: 0.6,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.set(-16, 1.6, 2);
    buildingGroup.add(water);

    // Architectural perimeter accent lighting points
    const lightGlowGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const lightGlowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const p1 = new THREE.Mesh(lightGlowGeo, lightGlowMat);
    p1.position.set(-10, 8.5, 9.3);
    const p2 = new THREE.Mesh(lightGlowGeo, lightGlowMat);
    p2.position.set(6, 8.5, 9.3);
    buildingGroup.add(p1, p2);

    return buildingGroup;
  };

  // Fly camera to a specific hotspot
  const flyToHotspot = useCallback(
    (hotspot: Hotspot) => {
      if (!mapRef.current) return;
      setActiveHotspotId(hotspot.id);
      setActiveInfo(hotspot);

      mapRef.current.flyTo({
        center: [hotspot.lng, hotspot.lat],
        zoom: hotspot.camera.zoom,
        pitch: hotspot.camera.pitch,
        bearing: hotspot.camera.bearing,
        duration: 2200,
        essential: true,
      });

      if (onHotspotClick) {
        onHotspotClick(hotspot);
      }
    },
    [onHotspotClick]
  );

  // Initialize Mapbox & Three.js Custom Layer
  useEffect(() => {
    if (!mapContainerRef.current) return;

    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoiYWJiYXNwcml2dCIsImEiOiJjbXZwYWtxdm4waHJoMnpyMHpmY2dqMTh4In0.3-lJTQxcTOH2E2pn9Fl3vw';

    const styleUrl =
      mapStyle === 'streets'
        ? 'mapbox://styles/mapbox/satellite-streets-v12'
        : 'mapbox://styles/mapbox/satellite-v9';

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: styleUrl,
      center: [centerLng, centerLat],
      zoom: 17.6,
      pitch: 62,
      bearing: -25,
      antialias: true,
      attributionControl: false,
    });

    mapRef.current = map;

    // Add navigation controls (compass + pitch + zoom)
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');
    map.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }), 'bottom-right');

    map.on('style.load', () => {
      setMapLoaded(true);

      // Setup 3D Three.js Custom Layer
      const modelOrigin: [number, number] = [centerLng, centerLat];
      const modelAltitude = 0;
      const modelRotate = [Math.PI / 2, 0, 0];

      const modelAsMercatorCoordinate = mapboxgl.MercatorCoordinate.fromLngLat(
        modelOrigin,
        modelAltitude
      );

      const modelTransform = {
        translateX: modelAsMercatorCoordinate.x,
        translateY: modelAsMercatorCoordinate.y,
        translateZ: modelAsMercatorCoordinate.z,
        rotateX: modelRotate[0],
        rotateY: modelRotate[1],
        rotateZ: modelRotate[2],
        scale: modelAsMercatorCoordinate.meterInMercatorCoordinateUnits() * 1.25,
      };

      let camera: THREE.Camera | null = null;
      let scene: THREE.Scene | null = null;
      let renderer: THREE.WebGLRenderer | null = null;

      const customLayer: mapboxgl.CustomLayerInterface = {
        id: '3d-model-property-layer',
        type: 'custom',
        renderingMode: '3d',
        onAdd: function (mapInstance, gl) {
          camera = new THREE.Camera();
          scene = new THREE.Scene();

          // Ambient and Directional Lighting for realistic Google Earth sun reflections
          const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
          scene.add(ambientLight);

          const sunLight = new THREE.DirectionalLight(0xfff8e7, 2.8);
          sunLight.position.set(60, 100, 80).normalize();
          scene.add(sunLight);

          const skyFillLight = new THREE.DirectionalLight(0x7dd3fc, 1.2);
          skyFillLight.position.set(-60, -40, -50).normalize();
          scene.add(skyFillLight);

          // If external modelUrl is provided, load using GLTFLoader
          if (modelUrl) {
            setModelLoading(true);
            const loader = new GLTFLoader();
            loader.load(
              modelUrl,
              (gltf) => {
                if (scene) {
                  // Normalize scale and center
                  const bbox = new THREE.Box3().setFromObject(gltf.scene);
                  const size = bbox.getSize(new THREE.Vector3());
                  const maxDim = Math.max(size.x, size.y, size.z);
                  const targetSize = 25; // 25 meters approx
                  const scaleFactor = targetSize / (maxDim || 1);
                  gltf.scene.scale.set(scaleFactor, scaleFactor, scaleFactor);

                  scene.add(gltf.scene);
                  mapInstance.triggerRepaint();
                }
                setModelLoading(false);
              },
              undefined,
              (err) => {
                console.warn(
                  'Could not load 3D GLTF model, falling back to architectural 3D building:',
                  err
                );
                if (scene) {
                  scene.add(buildProcedural3DBuilding());
                  mapInstance.triggerRepaint();
                }
                setModelLoading(false);
              }
            );
          } else {
            // Load high-detail procedural modern villa
            scene.add(buildProcedural3DBuilding());
          }

          renderer = new THREE.WebGLRenderer({
            canvas: mapInstance.getCanvas(),
            context: gl,
            antialias: true,
          });
          renderer.autoClear = false;
        },
        render: function (_gl, matrix) {
          if (!renderer || !scene || !camera) return;

          const rotationX = new THREE.Matrix4().makeRotationAxis(
            new THREE.Vector3(1, 0, 0),
            modelTransform.rotateX
          );
          const rotationY = new THREE.Matrix4().makeRotationAxis(
            new THREE.Vector3(0, 1, 0),
            modelTransform.rotateY
          );
          const rotationZ = new THREE.Matrix4().makeRotationAxis(
            new THREE.Vector3(0, 0, 1),
            modelTransform.rotateZ
          );

          const m = new THREE.Matrix4().fromArray(matrix);
          const l = new THREE.Matrix4()
            .makeTranslation(
              modelTransform.translateX,
              modelTransform.translateY,
              modelTransform.translateZ
            )
            .scale(
              new THREE.Vector3(
                modelTransform.scale,
                -modelTransform.scale,
                modelTransform.scale
              )
            )
            .multiply(rotationX)
            .multiply(rotationY)
            .multiply(rotationZ);

          camera.projectionMatrix = m.multiply(l);
          renderer.resetState();
          renderer.render(scene, camera);
          map.triggerRepaint();
        },
      };

      if (!map.getLayer('3d-model-property-layer')) {
        map.addLayer(customLayer);
      }

      // Add custom HTML Markers & Popups for Hotspots
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      popupsRef.current = [];

      hotspots.forEach((spot) => {
        // Create custom HTML marker element
        const el = document.createElement('div');
        el.className = 'custom-tour-hotspot-pin cursor-pointer group flex items-center gap-1.5 select-none';
        el.innerHTML = `
          <div class="relative flex items-center justify-center">
            <span class="absolute w-7 h-7 rounded-full bg-[#005d42]/40 animate-ping"></span>
            <div class="relative w-7 h-7 rounded-full bg-[#005d42] border-2 border-white text-white flex items-center justify-center shadow-lg group-hover:scale-115 transition-transform duration-200">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 12h20M12 2v20"/>
              </svg>
            </div>
          </div>
          <div class="px-2.5 py-1 rounded-full bg-[#0b1c30]/90 backdrop-blur-md text-white border border-white/20 text-[11px] font-bold shadow-xl tracking-wide group-hover:bg-[#005d42] transition-colors whitespace-nowrap">
            ${spot.name}
          </div>
        `;

        // Create interactive popup
        const popupHtml = `
          <div style="font-family: inherit; padding: 10px; max-width: 250px;">
            <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #005d42; margin-bottom: 2px;">
              ${spot.subtitle}
            </div>
            <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">
              ${spot.name}
            </div>
            <p style="font-size: 12px; color: #475569; line-height: 1.4; margin: 0 0 8px 0;">
              ${spot.description}
            </p>
            <div style="font-size: 11px; font-weight: 600; color: #006f67; display: flex; align-items: center; gap: 4px;">
              <span>• Coordinates:</span>
              <span style="font-family: monospace;">${spot.lat.toFixed(4)}, ${spot.lng.toFixed(4)}</span>
            </div>
          </div>
        `;

        const popup = new mapboxgl.Popup({
          offset: 25,
          closeButton: true,
          closeOnClick: false,
          className: 'modern-tour-popup',
        }).setHTML(popupHtml);

        popupsRef.current.push(popup);

        const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat([spot.lng, spot.lat])
          .setPopup(popup)
          .addTo(map);

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          flyToHotspot(spot);
        });

        markersRef.current.push(marker);
      });
    });

    return () => {
      if (orbitAnimIdRef.current) {
        cancelAnimationFrame(orbitAnimIdIdRef());
      }
      markersRef.current.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
    };
  }, [centerLng, centerLat, modelUrl, mapStyle]);

  // Helper for cancelling animation cleanly
  const orbitAnimIdIdRef = () => orbitAnimIdRef.current || 0;

  // Cinematic 360 camera orbit effect
  useEffect(() => {
    if (!isOrbiting || !mapRef.current) {
      if (orbitAnimIdRef.current) {
        cancelAnimationFrame(orbitAnimIdRef.current);
        orbitAnimIdRef.current = null;
      }
      return;
    }

    const animateOrbit = () => {
      if (mapRef.current) {
        const currentBearing = mapRef.current.getBearing();
        mapRef.current.setBearing(currentBearing + 0.15);
      }
      orbitAnimIdRef.current = requestAnimationFrame(animateOrbit);
    };

    orbitAnimIdRef.current = requestAnimationFrame(animateOrbit);

    return () => {
      if (orbitAnimIdRef.current) {
        cancelAnimationFrame(orbitAnimIdRef.current);
        orbitAnimIdRef.current = null;
      }
    };
  }, [isOrbiting]);

  // Reset Camera to initial isometric 3D satellite view
  const handleResetCamera = () => {
    if (!mapRef.current) return;
    setIsOrbiting(false);
    setActiveHotspotId(null);
    setActiveInfo(null);
    mapRef.current.flyTo({
      center: [centerLng, centerLat],
      zoom: 17.6,
      pitch: 62,
      bearing: -25,
      duration: 1800,
      essential: true,
    });
  };

  return (
    <div
      className={`relative w-full h-full min-h-[500px] flex flex-col bg-slate-950 text-white overflow-hidden select-none ${className}`}
    >
      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-4 right-16 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Brand & Coordinates Badge */}
        <div className="pointer-events-auto flex items-center gap-2.5 bg-[#0b1c30]/85 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/15 shadow-2xl">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#005d42] to-[#00a375] text-white flex items-center justify-center shadow-md">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-tight text-white flex items-center gap-1.5">
                3D Satellite Map Tour
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#00a375]/30 text-[#97f5cc] border border-[#00a375]/40">
                Google Earth 3D
              </span>
            </div>
            <p className="text-[10px] text-slate-300 font-mono">
              GPS: {centerLat.toFixed(5)}°N, {centerLng.toFixed(5)}°E
            </p>
          </div>
        </div>

        {/* Hotspots Quick Switcher Buttons */}
        <div className="pointer-events-auto hidden sm:flex items-center gap-1.5 bg-[#0b1c30]/80 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-xl overflow-x-auto">
          {hotspots.map((spot) => {
            const isActive = activeHotspotId === spot.id;
            return (
              <button
                key={spot.id}
                type="button"
                onClick={() => flyToHotspot(spot)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? 'bg-[#005d42] text-white shadow-md shadow-[#005d42]/40 scale-102'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Eye className="w-3.5 h-3.5 opacity-80" />
                <span>{spot.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Top Right Close Button (if onClose provided) */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close 3D Map Tour"
          className="absolute top-4 right-4 z-30 w-10 h-10 rounded-2xl bg-[#0b1c30]/90 hover:bg-rose-900/80 border border-white/20 text-white flex items-center justify-center transition-all shadow-2xl cursor-pointer hover:scale-105 backdrop-blur-md"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Mapbox Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full flex-1" />

      {/* Bottom Floating Control Dock */}
      <div className="absolute bottom-5 left-4 right-4 z-20 flex flex-wrap items-end justify-between gap-3 pointer-events-none">
        {/* Hotspot details card popup if active */}
        {activeInfo && (
          <div className="pointer-events-auto w-full max-w-sm bg-[#0b1c30]/90 backdrop-blur-md p-4 rounded-2xl border border-white/15 shadow-2xl animate-in slide-in-from-bottom-3 duration-200">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <span className="text-[10px] font-bold tracking-wider text-[#97f5cc] uppercase bg-[#005d42]/60 px-2 py-0.5 rounded-md">
                {activeInfo.subtitle}
              </span>
              <button
                type="button"
                onClick={() => setActiveInfo(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <h4 className="text-sm font-bold text-white mb-1">{activeInfo.name}</h4>
            <p className="text-xs text-slate-300 leading-relaxed mb-3">{activeInfo.description}</p>
            <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-white/10 pt-2">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#00a375]" /> 3D View Angle Loaded
              </span>
              <button
                type="button"
                onClick={() => flyToHotspot(activeInfo)}
                className="text-[#97f5cc] font-semibold hover:underline cursor-pointer"
              >
                Refocus Camera
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons Toolbar */}
        <div className="pointer-events-auto flex items-center gap-2 bg-[#0b1c30]/85 backdrop-blur-md p-1.5 rounded-2xl border border-white/15 shadow-2xl ml-auto">
          {/* Orbit 360 toggle */}
          <button
            type="button"
            onClick={() => setIsOrbiting((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              isOrbiting
                ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/30'
                : 'text-slate-200 hover:bg-white/10'
            }`}
            title="Auto-rotate 360 camera"
          >
            {isOrbiting ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isOrbiting ? 'Pause Orbit' : '360° Orbit'}</span>
          </button>

          {/* Reset Camera */}
          <button
            type="button"
            onClick={handleResetCamera}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-200 hover:bg-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
            title="Reset to default angle"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset View</span>
          </button>

          {/* Map style toggle */}
          <button
            type="button"
            onClick={() => setMapStyle((s) => (s === 'streets' ? 'satellite' : 'streets'))}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-200 hover:bg-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
            title="Toggle satellite layers"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{mapStyle === 'streets' ? 'Satellite + Roads' : 'Pure Satellite'}</span>
          </button>
        </div>
      </div>

      {/* Model Loading indicator */}
      {modelLoading && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 bg-black/75 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/15 text-xs text-white flex items-center gap-2.5 shadow-2xl">
          <div className="w-4 h-4 border-2 border-[#00a375] border-t-transparent rounded-full animate-spin" />
          <span>Rendering 3D Building Model...</span>
        </div>
      )}
    </div>
  );
};

export default Map3DTour;
