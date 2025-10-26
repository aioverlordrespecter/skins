// 3D Viewer Module using Three.js
import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class Viewer3D {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.model = null;
        this.texture = null;
        this.animationId = null;
        this.modelLoaded = false;
        this.currentPolyCount = 0;

        // Face picking
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.hoveredFace = null;
        this.hoveredMesh = null;
        this.selectedFaces = new Set();
        this.highlightMaterial = null;
        this.onFaceHoverCallback = null;
        this.onFaceClickCallback = null;
        this.pickingEnabled = false;
        
        // Model data
        this.modelMesh = null;
        this.objData = null;
        this.modelParts = [];

        // Performance optimizations
        this.lastHoverTime = 0;
        this.hoverThrottle = 50; // ms between hover checks
        this.needsRender = true;

        this.initScene();
        this.setupLighting();
        this.setupPicking();
        this.animate();
    }

    initScene() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x2a2a2a);
        
        // Add grid helper for reference
        const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
        this.scene.add(gridHelper);
        
        // Add axes helper for debugging
        const axesHelper = new THREE.AxesHelper(10);
        this.scene.add(axesHelper);
        
        // TEST CUBE REMOVED - Rendering confirmed working!
        
        console.log('✅ Scene initialized with test cube');
        console.log('   Added: Grid, Axes, Red Cube at (0, 1, 0)');
        console.log('   Canvas:', this.canvas);
        console.log('   Canvas dimensions:', this.canvas.clientWidth, 'x', this.canvas.clientHeight);
        
        // Ensure canvas has minimum dimensions
        if (this.canvas.clientWidth === 0 || this.canvas.clientHeight === 0) {
            console.warn('⚠️ Canvas has 0 dimensions! Forcing parent container size...');
            const container = this.canvas.parentElement;
            console.log('   Container:', container);
            console.log('   Container dimensions:', container.clientWidth, 'x', container.clientHeight);
            
            // Force container to have size
            container.style.minHeight = '600px';
            container.style.width = '100%';
            
            // Force canvas to fill container
            this.canvas.style.width = '100%';
            this.canvas.style.height = '100%';
        }

        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            this.canvas.clientWidth / this.canvas.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 5, 20);
        this.camera.lookAt(0, 0, 0);
        
        console.log('📷 Camera created at position:', this.camera.position);

        // Create renderer with performance optimizations
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: false, // Disable antialiasing for performance
            powerPreference: 'high-performance'
        });
        // Get actual dimensions after potential fixes
        let width = this.canvas.clientWidth;
        let height = this.canvas.clientHeight;
        
        // Fallback if still 0
        if (width === 0 || height === 0) {
            console.warn('   Canvas still 0x0, using fallback dimensions');
            width = 800;
            height = 600;
        }
        
        this.renderer.setSize(width, height, true);
        // Limit pixel ratio to 1.5 max for better performance
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        
        console.log('🎨 Renderer initialized');
        console.log('   Size:', width, 'x', height);
        console.log('   Pixel ratio:', this.renderer.getPixelRatio());
        
        // Force immediate render
        setTimeout(() => {
            this.renderer.render(this.scene, this.camera);
            console.log('   Initial render complete');
        }, 100);

        // Add orbit controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 50;
        this.controls.maxPolarAngle = Math.PI / 1.5;
        
        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());
        
        // Trigger initial render
        this.needsRender = true;
    }

    setupPicking() {
        // Create highlight material for hovered faces
        this.highlightMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });

        // Mouse move for hovering - throttled for performance
        this.canvas.addEventListener('mousemove', (event) => {
            if (!this.pickingEnabled || !this.modelLoaded) return;

            const now = performance.now();
            if (now - this.lastHoverTime < this.hoverThrottle) return;
            this.lastHoverTime = now;

            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            this.updateHover();
        });

        // Mouse click for selection
        this.canvas.addEventListener('click', (event) => {
            if (!this.pickingEnabled || !this.modelLoaded) return;

            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            this.handleClick(event.shiftKey);
        });
    }

    updateHover() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // For FBX models with parts, intersect all meshes
        let intersects;
        if (this.modelParts && this.modelParts.length > 0) {
            const meshes = this.modelParts.map(p => p.mesh);
            intersects = this.raycaster.intersectObjects(meshes, false);
        } else if (this.modelMesh) {
            intersects = this.raycaster.intersectObject(this.modelMesh, false);
        } else {
            return;
        }

        if (intersects.length > 0) {
            const intersection = intersects[0];
            const mesh = intersection.object;
            
            // For FBX: hover over part (mesh-based selection)
            if (this.modelParts && this.modelParts.length > 0) {
                if (this.hoveredMesh !== mesh) {
                    // Restore previous mesh to its current material (not original!)
                    if (this.hoveredMesh && !this.hoveredMesh.userData.isHighlighted) {
                        const prevPart = this.modelParts.find(p => p.mesh === this.hoveredMesh);
                        if (prevPart && prevPart.currentMaterial) {
                            this.hoveredMesh.material = prevPart.currentMaterial;
                        }
                    }
                    
                    // Only highlight if not already highlighted (clicked)
                    this.hoveredMesh = mesh;
                    if (!mesh.userData.isHighlighted) {
                        const part = this.modelParts.find(p => p.mesh === mesh);
                        if (part) {
                            // Store current material before highlighting
                            part.currentMaterial = mesh.material;
                            
                            // Create temporary highlight
                            const highlightMat = mesh.material.clone();
                            highlightMat.emissive = new THREE.Color(0x0088ff);
                            highlightMat.emissiveIntensity = 0.2;
                            mesh.material = highlightMat;
                        }
                    }
                    
                    this.canvas.style.cursor = 'pointer';
                    
                    if (this.onFaceHoverCallback) {
                        const part = this.modelParts.find(p => p.mesh === mesh);
                        this.onFaceHoverCallback(null, { mesh, part });
                    }
                }
            } else {
                // For OBJ: face-based selection
                const faceIndex = intersection.faceIndex;
                if (this.hoveredFace !== faceIndex) {
                    this.hoveredFace = faceIndex;
                    this.canvas.style.cursor = 'pointer';
                    
                    if (this.onFaceHoverCallback) {
                        this.onFaceHoverCallback(faceIndex, intersection);
                    }
                }
            }
        } else {
            // Clear hover - restore current material
            if (this.hoveredMesh && !this.hoveredMesh.userData.isHighlighted) {
                const prevPart = this.modelParts?.find(p => p.mesh === this.hoveredMesh);
                if (prevPart && prevPart.currentMaterial) {
                    this.hoveredMesh.material = prevPart.currentMaterial;
                }
            }
            this.hoveredMesh = null;
            
            if (this.hoveredFace !== null) {
                this.hoveredFace = null;
                this.canvas.style.cursor = 'default';
                
                if (this.onFaceHoverCallback) {
                    this.onFaceHoverCallback(null, null);
                }
            }
        }
    }

    handleClick(additive = false) {
        // For FBX: click to select mesh/part
        if (this.hoveredMesh) {
            if (this.onFaceClickCallback) {
                const part = this.modelParts.find(p => p.mesh === this.hoveredMesh);
                this.onFaceClickCallback(null, { mesh: this.hoveredMesh, part });
            }
            return;
        }
        
        // For OBJ: click to select face
        if (this.hoveredFace !== null) {
            if (additive) {
                // Shift+click to add to selection
                if (this.selectedFaces.has(this.hoveredFace)) {
                    this.selectedFaces.delete(this.hoveredFace);
                } else {
                    this.selectedFaces.add(this.hoveredFace);
                }
            } else {
                // Regular click to select single face
                this.selectedFaces.clear();
                this.selectedFaces.add(this.hoveredFace);
            }

            if (this.onFaceClickCallback) {
                this.onFaceClickCallback(Array.from(this.selectedFaces));
            }
        }
    }

    enablePicking(enabled = true) {
        this.pickingEnabled = enabled;
        if (!enabled) {
            this.hoveredFace = null;
            this.canvas.style.cursor = 'default';
        }
    }

    onFaceHover(callback) {
        this.onFaceHoverCallback = callback;
    }

    onFaceClick(callback) {
        this.onFaceClickCallback = callback;
    }

    clearSelection() {
        this.selectedFaces.clear();
        this.hoveredFace = null;
    }

    selectFaces(faceIndices) {
        this.selectedFaces = new Set(faceIndices);
    }

    getSelectedFaces() {
        return Array.from(this.selectedFaces);
    }

    getOBJData() {
        return this.objData;
    }

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Directional light (main)
        const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
        mainLight.position.set(5, 10, 7);
        this.scene.add(mainLight);

        // Fill light
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-5, 0, -5);
        this.scene.add(fillLight);

        // Rim light
        const rimLight = new THREE.DirectionalLight(0xffffff, 0.4);
        rimLight.position.set(0, 5, -10);
        this.scene.add(rimLight);
    }

    disposeModel() {
        if (this.model) {
            // Properly dispose of all geometries and materials
            this.model.traverse((child) => {
                if (child.isMesh) {
                    if (child.geometry) {
                        child.geometry.dispose();
                    }
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => mat.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });
            this.scene.remove(this.model);
            this.model = null;
            this.modelMesh = null;
        }
    }

    loadModel(file) {
        const isFBX = file.name.toLowerCase().endsWith('.fbx');
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (isFBX) {
                    this.loadFBXModel(e.target.result, file, resolve, reject);
                } else {
                    this.loadOBJModel(e.target.result, file, resolve, reject);
                }
            };
            reader.onerror = reject;
            
            if (isFBX) {
                reader.readAsArrayBuffer(file);
            } else {
                reader.readAsText(file);
            }
        });
    }

    loadFBXModel(arrayBuffer, file, resolve, reject) {
        const loader = new FBXLoader();
        
        try {
            const object = loader.parse(arrayBuffer, '');
            this.processFBXModel(object, file, resolve, reject);
        } catch (error) {
            console.error('FBX parsing error:', error);
            reject(error);
        }
    }

    processFBXModel(object, file, resolve, reject) {
        // Remove old model if exists
        if (this.model) {
            this.scene.remove(this.model);
        }

        this.model = object;
        this.modelParts = [];

        // Extract all mesh parts with names and UVs
        object.traverse((child) => {
            if (child.isMesh) {
                child.userData.isSelectable = true;
                
                // Extract UV coordinates from geometry
                const uvs = [];
                const uvAttribute = child.geometry.attributes.uv;
                if (uvAttribute) {
                    for (let i = 0; i < uvAttribute.count; i++) {
                        uvs.push({
                            u: uvAttribute.getX(i),
                            v: 1 - uvAttribute.getY(i) // Flip V for standard UV space
                        });
                    }
                }
                
                this.modelParts.push({
                    name: child.name || 'Unnamed Part',
                    mesh: child,
                    originalMaterial: child.material.clone(),
                    currentMaterial: child.material, // Track current material
                    uvs: uvs,
                    geometry: child.geometry
                });
                console.log(`Found part: ${child.name} (${uvs.length} UV coords)`);
            }
        });

        // Center and scale model
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 10 / maxDim; // Scale to 10 units

        // FIRST: Apply scale
        object.scale.set(scale, scale, scale);
        
        // THEN: Recalculate bounding box after scaling
        object.updateMatrixWorld(true);
        const scaledBox = new THREE.Box3().setFromObject(object);
        const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
        
        // FINALLY: Center at origin
        object.position.set(
            -scaledCenter.x,
            -scaledCenter.y,
            -scaledCenter.z
        );

        this.scene.add(object);
        this.modelLoaded = true;
        this.needsRender = true;
        
        // Apply default materials to all parts
        object.traverse((child) => {
            if (child.isMesh) {
                child.material = new THREE.MeshStandardMaterial({
                    color: 0xaaaaaa,
                    metalness: 0.3,
                    roughness: 0.7,
                    side: THREE.DoubleSide
                });
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        console.log(`✅ FBX Model added to scene:`, object);
        console.log(`   Position:`, object.position.x, object.position.y, object.position.z);
        console.log(`   Scale:`, object.scale.x, object.scale.y, object.scale.z);
        console.log(`   Parts:`, this.modelParts.length);
        console.log(`   Bounding box min:`, box.min.x, box.min.y, box.min.z);
        console.log(`   Bounding box max:`, box.max.x, box.max.y, box.max.z);
        console.log(`   Model size:`, size.x, size.y, size.z);
        console.log(`   Max dimension:`, maxDim);
        console.log(`   Final scale factor:`, scale);
        console.log(`   Camera position:`, this.camera.position.x, this.camera.position.y, this.camera.position.z);
        
        // Log material info for debugging
        object.traverse((child) => {
            if (child.isMesh) {
                console.log(`   Part "${child.name}":`, {
                    material: child.material.type,
                    color: child.material.color,
                    visible: child.visible
                });
            }
        });

        // Get polygon count
        let polyCount = 0;
        object.traverse((child) => {
            if (child.isMesh && child.geometry) {
                if (child.geometry.index) {
                    polyCount += child.geometry.index.count / 3;
                } else {
                    polyCount += child.geometry.attributes.position.count / 3;
                }
            }
        });

        resolve({
            name: file.name,
            polyCount: Math.floor(polyCount),
            parts: this.modelParts,
            isFBX: true
        });
    }

    loadOBJModel(objData, file, resolve, reject) {
        this.objData = objData; // Store for UV extraction
        const loader = new OBJLoader();

        try {
            const object = loader.parse(objData);

            // Properly dispose of old model before loading new one
            this.disposeModel();

            this.model = object;

            // Calculate bounding box to center and scale model
            const box = new THREE.Box3().setFromObject(object);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 10 / maxDim; // Scale to fit in view

            object.position.sub(center);
            object.scale.set(scale, scale, scale);

            // Get polygon count first for material decisions
            let polyCount = 0;
            object.traverse((child) => {
                if (child.isMesh && child.geometry) {
                    if (child.geometry.index) {
                        polyCount += child.geometry.index.count / 3;
                    } else {
                        polyCount += child.geometry.attributes.position.count / 3;
                    }
                }
            });
            polyCount = Math.floor(polyCount);

            // Apply texture if available
            if (this.texture) {
                this.applyTextureToModel(object, polyCount);
            } else {
                // Apply default material with performance optimizations
                object.traverse((child) => {
                    if (child.isMesh) {
                        // Use simpler material for large models
                        if (polyCount > 200000) {
                            child.material = new THREE.MeshBasicMaterial({
                                color: 0x808080
                            });
                        } else {
                            child.material = new THREE.MeshStandardMaterial({
                                color: 0xcccccc,
                                metalness: 0.2,
                                roughness: 0.8,
                                side: THREE.DoubleSide
                            });
                        }
                        child.material.needsUpdate = true;
                    }
                });
            }

            this.scene.add(object);
            this.modelLoaded = true;

            // Store mesh reference for picking
            this.modelMesh = null;
            object.traverse((child) => {
                if (child.isMesh && child.geometry) {
                    if (!this.modelMesh) {
                        this.modelMesh = child; // Store first mesh for picking
                    }
                }
            });

            this.currentPolyCount = polyCount;

            resolve({
                name: file.name,
                polyCount: this.currentPolyCount,
                objData: objData
            });
        } catch (error) {
            reject(error);
        }
    }

    applyTextureToModel(model, polyCount = 0) {
        model.traverse((child) => {
            if (child.isMesh) {
                // Use simpler materials for large models
                if (polyCount > 200000) {
                    child.material = new THREE.MeshBasicMaterial({
                        map: this.texture
                    });
                } else {
                    child.material = new THREE.MeshStandardMaterial({
                        map: this.texture,
                        metalness: 0.3,
                        roughness: 0.7
                    });
                }
                child.material.needsUpdate = true;
            }
        });
    }

    updateTextureFromCanvas(canvas) {
        // Create or update texture from canvas
        if (!this.texture) {
            this.texture = new THREE.CanvasTexture(canvas);
            this.texture.colorSpace = THREE.SRGBColorSpace;
            this.texture.flipY = false;
        } else {
            this.texture.image = canvas;
            this.texture.needsUpdate = true;
        }

        // Apply texture to loaded model
        if (this.model) {
            this.applyTextureToModel(this.model, this.currentPolyCount);
        }
    }

    onWindowResize() {
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());

        if (this.controls) {
            this.controls.update();
        }
        
        // Rotate model for visual feedback
        if (this.model && this.modelLoaded) {
            this.model.rotation.y += 0.005;
        }

        this.renderer.render(this.scene, this.camera);
    }

    handleResize() {
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        
        if (width > 0 && height > 0) {
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
            this.needsRender = true;
            console.log('🔄 Canvas resized:', width, 'x', height);
        }
    }

    takeScreenshot() {
        this.renderer.render(this.scene, this.camera);
        return this.renderer.domElement.toDataURL('image/png');
    }

    isModelLoaded() {
        return this.modelLoaded;
    }

    dispose() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        this.disposeModel();
        if (this.texture) {
            this.texture.dispose();
        }
        if (this.renderer) {
            this.renderer.dispose();
        }
        if (this.controls) {
            this.controls.dispose();
        }
    }
}

