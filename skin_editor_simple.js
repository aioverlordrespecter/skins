/**
 * Simple FBX Skin Editor - Focused on precise UV mapping
 * This is a clean rewrite focused only on:
 * 1. Loading FBX models
 * 2. Selecting parts by clicking
 * 3. Showing UV wireframes
 * 4. Adding images that map correctly to UVs
 * 5. Applying textures to parts
 */

import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { fabric } from 'fabric';

class SimpleFBXSkinEditor {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.modelParts = [];
        this.selectedPart = null;
        this.uvCanvas = null;
        this.fabricCanvas = null;

        this.init();
    }

    init() {
        this.initThreeJS();
        this.initFabricCanvas();
        this.initEventListeners();
        this.animate();

        console.log('🎨 Simple FBX Skin Editor initialized');
    }

    initThreeJS() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a1a);

        // Camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / 2 / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 5, 20);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth / 2, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        const viewer3D = document.getElementById('viewer3D');
        if (viewer3D) {
            viewer3D.appendChild(this.renderer.domElement);
        }

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        // Controls
        this.controls = {
            mouse: new THREE.Vector2(),
            raycaster: new THREE.Raycaster()
        };

        // Handle mouse events
        this.renderer.domElement.addEventListener('click', (event) => this.onMouseClick(event));
        this.renderer.domElement.addEventListener('mousemove', (event) => this.onMouseMove(event));

        console.log('✅ Three.js initialized');
    }

    initFabricCanvas() {
        // UV Canvas setup
        const uvCanvas = document.getElementById('uvCanvas');
        if (!uvCanvas) {
            console.error('UV canvas element not found');
            return;
        }

        // Set canvas size to match container
        const container = uvCanvas.parentElement;
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Create fabric canvas
        this.fabricCanvas = new fabric.Canvas('uvCanvas', {
            width: width,
            height: height,
            backgroundColor: '#1a1a1a'
        });

        console.log(`✅ Fabric canvas initialized: ${width}x${height}`);
    }

    initEventListeners() {
        // Load model button
        const loadBtn = document.getElementById('loadModelBtn');
        if (loadBtn) {
            loadBtn.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.fbx';
                input.onchange = (e) => this.loadFBXModel(e.target.files[0]);
                input.click();
            });
        }

        // Add image button
        const addImageBtn = document.getElementById('addImageBtn');
        if (addImageBtn) {
            addImageBtn.addEventListener('click', () => {
                if (!this.selectedPart) {
                    this.showNotification('Please select a gun part first!', 'error');
                    return;
                }
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e) => this.addImageToUV(e.target.files[0]);
                input.click();
            });
        }

        // Parts list toggle
        const toggleBtn = document.getElementById('togglePartsListBtn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const modal = document.getElementById('partsListModal');
                modal.style.display = modal.style.display === 'none' ? 'block' : 'none';
            });
        }

        // Close parts list
        const closeBtn = document.getElementById('closePartsListBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                document.getElementById('partsListModal').style.display = 'none';
            });
        }
    }

    async loadFBXModel(file) {
        console.log('🔄 Loading FBX model...');

        const loader = new FBXLoader();
        const url = URL.createObjectURL(file);

        try {
            const object = await new Promise((resolve, reject) => {
                loader.load(url, resolve, undefined, reject);
            });

            // Process the loaded model
            this.processFBXModel(object);

            console.log('✅ FBX model loaded successfully');

        } catch (error) {
            console.error('❌ Error loading FBX:', error);
        }
    }

    processFBXModel(object) {
        // Clear existing parts
        this.modelParts = [];

        // Process each mesh in the FBX
        object.traverse((child) => {
            if (child.isMesh) {
                // Create unique material for this part
                const material = new THREE.MeshStandardMaterial({
                    color: 0xcccccc,
                    metalness: 0.2,
                    roughness: 0.8
                });
                child.material = material;

                // Store part information
                const part = {
                    name: child.name || 'Unnamed Part',
                    mesh: child,
                    material: material,
                    originalMaterial: material.clone(),
                    geometry: child.geometry,
                    uvs: this.extractUVs(child.geometry),
                    boundingBox: new THREE.Box3().setFromObject(child)
                };

                this.modelParts.push(part);
                console.log(`🔧 Found part: ${part.name} (${part.uvs.length} UV coords)`);

                // Enable shadows
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        // Scale and center the model
        this.centerAndScaleModel(object);

        // Add to scene
        this.scene.add(object);

        // Update UI
        this.updatePartsList();

        // Show texture tools
        const textureSection = document.getElementById('textureSection');
        if (textureSection) {
            textureSection.style.display = 'flex';
        }

        console.log(`📦 Model processed with ${this.modelParts.length} parts`);
    }

    extractUVs(geometry) {
        const uvs = [];
        const uvAttribute = geometry.attributes.uv;

        if (uvAttribute) {
            for (let i = 0; i < uvAttribute.count; i++) {
                uvs.push({
                    u: uvAttribute.getX(i),
                    v: uvAttribute.getY(i)
                });
            }
        }

        return uvs;
    }

    centerAndScaleModel(object) {
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 8 / maxDim; // Scale to fit in viewport

        object.scale.set(scale, scale, scale);
        object.position.set(-center.x * scale, -center.y * scale, -center.z * scale);

        // Position camera to view the model
        this.camera.position.set(0, maxDim * scale * 0.5, maxDim * scale * 2);
        this.camera.lookAt(0, 0, 0);

        console.log(`📐 Model scaled: ${scale.toFixed(4)}, positioned camera at: ${this.camera.position.x.toFixed(1)}, ${this.camera.position.y.toFixed(1)}, ${this.camera.position.z.toFixed(1)}`);
    }

    updatePartsList() {
        const container = document.getElementById('partsListContainer');
        const noPartsMsg = document.getElementById('noPartsMessage');
        if (!container) return;

        container.innerHTML = '';

        if (this.modelParts.length === 0) {
            if (noPartsMsg) noPartsMsg.style.display = 'block';
            return;
        }

        if (noPartsMsg) noPartsMsg.style.display = 'none';

        this.modelParts.forEach((part, index) => {
            const partBtn = document.createElement('button');
            partBtn.style.cssText = `
                width: 100%;
                padding: 10px;
                background: #1e1e1e;
                border: 1px solid #3a3a3a;
                border-radius: 4px;
                color: #fff;
                text-align: left;
                cursor: pointer;
                font-size: 13px;
                transition: all 0.2s;
                margin-bottom: 5px;
            `;

            partBtn.innerHTML = `
                <div style="font-weight: bold; color: #4CAF50;">${part.name}</div>
                <div style="font-size: 11px; color: #888; margin-top: 4px;">
                    ${part.uvs.length} UV coords
                </div>
            `;

            partBtn.onclick = () => this.selectPart(part);
            container.appendChild(partBtn);
        });
    }

    selectPart(part) {
        // Clear previous selection
        if (this.selectedPart) {
            this.selectedPart.mesh.material = this.selectedPart.originalMaterial;
        }

        this.selectedPart = part;

        // Highlight selected part
        const highlightMaterial = new THREE.MeshStandardMaterial({
            color: 0x4CAF50,
            metalness: 0.3,
            roughness: 0.7,
            emissive: 0x004400
        });
        part.mesh.material = highlightMaterial;

        // Update UI
        const selectedPartName = document.getElementById('selectedPartName');
        if (selectedPartName) {
            selectedPartName.textContent = part.name;
        }

        // Show UV wireframe
        this.displayUVWireframe(part);

        console.log(`🎯 Selected part: ${part.name}`);
    }

    displayUVWireframe(part) {
        // Clear canvas
        this.fabricCanvas.clear();
        this.fabricCanvas.backgroundColor = '#1a1a1a';

        const canvasWidth = this.fabricCanvas.width;
        const canvasHeight = this.fabricCanvas.height;

        console.log(`🎨 Drawing UV wireframe for: ${part.name}`);
        console.log(`   Canvas size: ${canvasWidth} x ${canvasHeight}`);

        const geometry = part.geometry;
        const uvAttribute = geometry.attributes.uv;
        let index = geometry.index;

        if (!uvAttribute) {
            console.warn('❌ No UV attribute found for this part');
            return;
        }

        // Create sequential index if none exists
        if (!index) {
            console.log('⚠️ No index found, creating sequential');
            const positionCount = geometry.attributes.position.count;
            const indexArray = [];
            for (let i = 0; i < positionCount; i++) {
                indexArray.push(i);
            }
            index = {
                count: indexArray.length,
                getX: (i) => indexArray[i]
            };
        }

        console.log(`   UV coords: ${uvAttribute.count}, Triangles: ${index.count / 3}`);

        // Draw UV wireframe
        const lines = [];
        const vertices = [];

        for (let i = 0; i < index.count; i += 3) {
            const i1 = index.getX(i);
            const i2 = index.getX(i + 1);
            const i3 = index.getX(i + 2);

            // Get UV coordinates (raw, 0-1 range)
            const u1 = uvAttribute.getX(i1);
            const v1 = uvAttribute.getY(i1);
            const u2 = uvAttribute.getX(i2);
            const v2 = uvAttribute.getY(i2);
            const u3 = uvAttribute.getX(i3);
            const v3 = uvAttribute.getY(i3);

            // Convert to canvas coordinates (flip Y axis)
            const x1 = u1 * canvasWidth;
            const y1 = (1 - v1) * canvasHeight;
            const x2 = u2 * canvasWidth;
            const y2 = (1 - v2) * canvasHeight;
            const x3 = u3 * canvasWidth;
            const y3 = (1 - v3) * canvasHeight;

            // Store vertices for bounding box
            vertices.push({ x: x1, y: y1 }, { x: x2, y: y2 }, { x: x3, y: y3 });

            // Create triangle lines
            lines.push(
                new fabric.Line([x1, y1, x2, y2], {
                    stroke: '#00ffff',
                    strokeWidth: 1,
                    selectable: false,
                    evented: false
                }),
                new fabric.Line([x2, y2, x3, y3], {
                    stroke: '#00ffff',
                    strokeWidth: 1,
                    selectable: false,
                    evented: false
                }),
                new fabric.Line([x3, y3, x1, y1], {
                    stroke: '#00ffff',
                    strokeWidth: 1,
                    selectable: false,
                    evented: false
                })
            );
        }

        // Add all lines to canvas
        lines.forEach(line => {
            this.fabricCanvas.add(line);
            this.fabricCanvas.sendToBack(line);
        });

        // Calculate and draw bounding box
        if (vertices.length > 0) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

            vertices.forEach(v => {
                minX = Math.min(minX, v.x);
                minY = Math.min(minY, v.y);
                maxX = Math.max(maxX, v.x);
                maxY = Math.max(maxY, v.y);
            });

            const bbox = new fabric.Rect({
                left: minX,
                top: minY,
                width: maxX - minX,
                height: maxY - minY,
                fill: 'transparent',
                stroke: '#ffff00',
                strokeWidth: 2,
                strokeDashArray: [5, 5],
                selectable: false,
                evented: false
            });

            this.fabricCanvas.add(bbox);

            console.log(`   UV bounding box: (${minX.toFixed(1)}, ${minY.toFixed(1)}) to (${maxX.toFixed(1)}, ${maxY.toFixed(1)})`);
            console.log(`   Size: ${(maxX - minX).toFixed(1)} x ${(maxY - minY).toFixed(1)} px`);
        }

        this.fabricCanvas.renderAll();
        console.log(`✅ UV wireframe displayed for ${part.name}`);
    }

    addImageToUV(file) {
        if (!this.selectedPart) {
            alert('Please select a part first!');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            fabric.Image.fromURL(e.target.result, (img) => {
                // Scale image to fit UV space initially
                const canvasWidth = this.fabricCanvas.width;
                const canvasHeight = this.fabricCanvas.height;

                // Scale image to reasonable size (20% of canvas)
                const scale = Math.min(canvasWidth * 0.2 / img.width, canvasHeight * 0.2 / img.height);
                img.scale(scale);

                // Center the image
                img.set({
                    left: (canvasWidth - img.getScaledWidth()) / 2,
                    top: (canvasHeight - img.getScaledHeight()) / 2,
                    selectable: true,
                    evented: true
                });

                this.fabricCanvas.add(img);
                this.fabricCanvas.setActiveObject(img);

                console.log(`🖼️ Added image: ${file.name} (${img.getScaledWidth().toFixed(1)}x${img.getScaledHeight().toFixed(1)})`);
                console.log('💡 Drag the image to position it on the cyan wireframe, then the texture will apply to the 3D part');

                // Apply texture immediately when image is added
                setTimeout(() => this.applyTextureToPart(), 100);
            });
        };
        reader.readAsDataURL(file);
    }

    applyTextureToPart() {
        if (!this.selectedPart) return;

        console.log(`🎨 Applying texture to: ${this.selectedPart.name}`);

        // Export canvas as texture
        const textureDataUrl = this.fabricCanvas.toDataURL({
            format: 'png',
            quality: 1.0
        });

        // Create Three.js texture
        const loader = new THREE.TextureLoader();
        const texture = loader.load(textureDataUrl, () => {
            // Configure texture
            texture.wrapS = THREE.ClampToEdgeWrapping;
            texture.wrapT = THREE.ClampToEdgeWrapping;
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.flipY = false;
            texture.needsUpdate = true;

            console.log(`   Texture created: ${texture.image.width}x${texture.image.height}`);

            // Create new material with texture
            const newMaterial = new THREE.MeshStandardMaterial({
                map: texture,
                metalness: 0.3,
                roughness: 0.7,
                side: THREE.DoubleSide
            });

            // Apply to selected part only
            this.selectedPart.mesh.material = newMaterial;

            // Restore original material for highlighting
            this.selectedPart.currentMaterial = newMaterial;

            console.log(`✅ Texture applied to ${this.selectedPart.name} only`);

            // Show success message
            this.showNotification('Texture applied successfully!', 'success');
        });
    }

    onMouseClick(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.controls.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.controls.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.controls.raycaster.setFromCamera(this.controls.mouse, this.camera);

        const intersects = this.controls.raycaster.intersectObjects(
            this.modelParts.map(p => p.mesh),
            false
        );

        if (intersects.length > 0) {
            const clickedMesh = intersects[0].object;
            const part = this.modelParts.find(p => p.mesh === clickedMesh);

            if (part) {
                this.selectPart(part);
            }
        }
    }

    onMouseMove(event) {
        // Optional: Add hover effects
    }

    showNotification(message, type = 'info') {
        // Simple notification
        console.log(`📢 ${message}`);
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 70px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : '#2196F3'};
            color: white;
            padding: 10px 20px;
            border-radius: 4px;
            font-size: 14px;
            z-index: 1000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    handleResize() {
        if (this.renderer && this.camera) {
            const width = window.innerWidth / 2;
            const height = window.innerHeight;

            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();

            this.renderer.setSize(width, height);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.skinEditor = new SimpleFBXSkinEditor();
});

// Handle window resize
window.addEventListener('resize', () => {
    if (window.skinEditor) {
        window.skinEditor.handleResize();
    }
});
