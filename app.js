// Main Application Logic
import { UVEditor } from './uvEditor.js';
import { Viewer3D } from './viewer3D.js';
import { UVExtractor } from './uvExtractor.js';
import { MaskCreator } from './maskCreator.js';
import * as THREE from 'three';

class CSGOSkinEditor {
    constructor() {
        this.uvEditor = null;
        this.viewer3D = null;
        this.uvExtractor = null;
        this.maskCreator = null;
        this.currentModel = null;
        this.currentMask = null;
        this.selectedComponent = null;
        this.interactiveModeEnabled = false;
        this.maskDrawingMode = false;
        this.selectionMode = 'island'; // 'face' or 'island'
        this.selectedPart = null; // For FBX workflow

        this.init();
    }

    init() {
        // Initialize UV Editor
        this.uvEditor = new UVEditor('uvCanvas');

        // Initialize Mask Creator
        this.maskCreator = new MaskCreator(this.uvEditor.getFabricCanvas());

        // Initialize 3D Viewer
        this.viewer3D = new Viewer3D('viewer3D');

        // Setup sync between editor and viewer
        this.uvEditor.onChange(() => {
            this.updateViewerTexture();
        });

        // Setup layer selection callback
        this.uvEditor.onLayerSelect((layer) => {
            this.updateLayerUI(layer);
        });

        // Setup 3D viewer callbacks for face picking - STANDARD ISLAND MODE (SAFE)
        this.viewer3D.onFaceHover((faceIndex, intersection) => {
            if (!this.interactiveModeEnabled) return;
            
            // FBX part hover
            if (intersection && intersection.part) {
                const partName = intersection.part.name;
                document.getElementById('componentSelector').innerHTML = `
                    <div style="padding: 10px; background: #2a2a2a; border-radius: 8px;">
                        <small>Hovering:</small><br>
                        <strong>${partName}</strong>
                    </div>
                `;
                document.getElementById('componentSelector').style.display = 'block';
                return;
            }
            
            // OBJ face hover
            if (faceIndex !== null && this.uvExtractor) {
                // Use standard island detection (no morphological processing on hover)
                const island = this.uvExtractor.getIslandContainingFace(faceIndex);
                if (island) {
                    this.uvEditor.highlightUVIsland(island, '#00ffff', 0.3);
                } else {
                    this.uvEditor.clearUVHighlight();
                }
            } else {
                this.uvEditor.clearUVHighlight();
            }
        });

        this.viewer3D.onFaceClick((faceIndices, intersection) => {
            if (!this.interactiveModeEnabled) return;
            
            // FBX part click
            if (intersection && intersection.part) {
                this.selectFBXPart(intersection.part);
                return;
            }
            
            // OBJ face click
            if (faceIndices && faceIndices.length > 0 && this.uvExtractor) {
                // Use standard island detection (SAFE - no expensive computation)
                const faceIndex = faceIndices[0];
                const island = this.uvExtractor.getIslandContainingFace(faceIndex);

                if (island) {
                    // Highlight the selected island with clean outlines
                    this.uvEditor.highlightUVIsland(island, '#00ff00', 0.5);

                    // Create mask from island
                    this.uvEditor.applyUVSelectionAsMask(
                        this.uvExtractor.createUVMask(island.faces, 1024, 1024)
                    );

                    this.showNotification(
                        `✓ Selected component with ${island.faces.length} faces`,
                        'success'
                    );
                } else {
                    this.showNotification('Could not find UV island for this face', 'error');
                }
            }
        });

        // Setup UI event listeners
        this.setupEventListeners();

        console.log('CS:GO Skin Editor initialized - Version 5.0 (FBX Support!)');
        console.log('Features: FBX part selection, OBJ island detection, boundary outlines');
    }

    setupEventListeners() {
        // Load 3D Model
        const loadModelBtn = document.getElementById('loadModelBtn');
        console.log('loadModelBtn found:', loadModelBtn);
        
        loadModelBtn.addEventListener('click', () => {
            console.log('Load Model button clicked!');
            document.getElementById('modelInput').click();
        });

        document.getElementById('modelInput').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.loadModel(e.target.files[0]);
            }
        });

        // Load Base Texture
        document.getElementById('loadBaseTextureBtn').addEventListener('click', () => {
            document.getElementById('baseTextureInput').click();
        });

        document.getElementById('baseTextureInput').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.loadBaseTexture(e.target.files[0]);
            }
            e.target.value = '';
        });

        // Load Mask
        document.getElementById('loadMaskBtn').addEventListener('click', () => {
            document.getElementById('maskInput').click();
        });

        document.getElementById('maskInput').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.loadMask(e.target.files[0]);
            }
            e.target.value = '';
        });

        // Clear Mask
        document.getElementById('clearMaskBtn').addEventListener('click', () => {
            this.clearMask();
        });

        // Add Image Layer
        document.getElementById('addImageBtn').addEventListener('click', () => {
            console.log('🖱️ Add Image button clicked!');
            const imageInput = document.getElementById('imageInput');
            console.log('   Image input element:', imageInput);
            imageInput.click();
        });

        document.getElementById('imageInput').addEventListener('change', async (e) => {
            if (e.target.files.length > 0) {
                console.log('📁 Image selected:', e.target.files[0].name);
                try {
                    await this.addImageLayer(e.target.files[0]);
                } catch (error) {
                    console.error('❌ Error adding image:', error);
                    this.showNotification('Error adding image: ' + error.message, 'error');
                }
            }
            // Reset input so same file can be added again
            e.target.value = '';
        });

        // Layer Controls
        document.getElementById('deleteLayerBtn').addEventListener('click', () => {
            this.deleteSelectedLayer();
        });

        document.getElementById('moveUpBtn').addEventListener('click', () => {
            this.uvEditor.moveLayerUp();
            this.updateLayerList();
        });

        document.getElementById('moveDownBtn').addEventListener('click', () => {
            this.uvEditor.moveLayerDown();
            this.updateLayerList();
        });

        // Opacity Control
        document.getElementById('opacitySlider').addEventListener('input', (e) => {
            const value = e.target.value;
            document.getElementById('opacityValue').textContent = value + '%';
            this.uvEditor.setLayerOpacity(value);
        });

        // Export Texture
        document.getElementById('exportTextureBtn').addEventListener('click', () => {
            this.exportTexture();
        });

        // Screenshot 3D View
        document.getElementById('screenshotBtn').addEventListener('click', () => {
            this.takeScreenshot();
        });

        // Interactive Mode Toggle
        document.getElementById('interactiveModeBtn').addEventListener('click', () => {
            this.toggleInteractiveMode();
        });

        // Show UV Map
        document.getElementById('showUVMapBtn').addEventListener('click', () => {
            this.toggleUVMap();
        });

        // Fullscreen UV
        document.getElementById('fullscreenUVBtn').addEventListener('click', () => {
            this.toggleFullscreenUV();
        });

        // Escape key to exit fullscreen  
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.uvEditor.isFullscreen) {
                this.toggleFullscreenUV();
            }
        });

        // Mask Drawing Tools
        document.getElementById('createMaskBtn')?.addEventListener('click', () => {
            this.toggleMaskDrawingMode();
        });

        document.getElementById('brushTool')?.addEventListener('click', () => {
            this.setDrawingTool('brush');
        });

        document.getElementById('rectangleTool')?.addEventListener('click', () => {
            this.setDrawingTool('rectangle');
        });

        document.getElementById('magicWandTool')?.addEventListener('click', () => {
            this.setDrawingTool('magic');
        });

        document.getElementById('eraserTool')?.addEventListener('click', () => {
            this.setDrawingTool('eraser');
        });

        document.getElementById('brushSize')?.addEventListener('input', (e) => {
            this.maskCreator.brushSize = parseInt(e.target.value);
            document.getElementById('brushSizeValue').textContent = e.target.value + 'px';
        });

        document.getElementById('newMaskBtn')?.addEventListener('click', () => {
            this.startNewMask();
        });

        document.getElementById('saveMaskBtn')?.addEventListener('click', () => {
            this.saveMask();
        });

        document.getElementById('showMaskOverlay')?.addEventListener('change', (e) => {
            this.updateMaskOverlay();
        });

        document.getElementById('maskOpacity')?.addEventListener('input', (e) => {
            document.getElementById('maskOpacityValue').textContent = e.target.value + '%';
            this.updateMaskOverlay();
        });
    }

    selectFBXPart(part) {
        this.selectedPart = part;
        this.showNotification(`✅ Selected: ${part.name}`, 'success');
        
        // Show part info in toolbar
        const selectedPartInfo = document.getElementById('selectedPartInfo');
        const selectedPartName = document.getElementById('selectedPartName');
        const clearBtn = document.getElementById('clearPartSelectionBtn');
        
        selectedPartInfo.style.display = 'flex';
        selectedPartName.textContent = part.name;
        clearBtn.style.display = 'inline-block';
        
        clearBtn.onclick = () => {
            this.selectedPart = null;
            selectedPartInfo.style.display = 'none';
            if (this.uvEditor && this.uvEditor.canvas) {
                this.uvEditor.canvas.clear();
            }
            this.showNotification('Part selection cleared', 'info');
        };
        
        // Show UV layout for this part
        this.showPartUVLayout(part);
        
        // Enable "Add Image" button
        const addBtn = document.getElementById('addImageBtn');
        if (addBtn) {
            addBtn.disabled = false;
            addBtn.style.opacity = '1';
            addBtn.style.cursor = 'pointer';
            console.log('✅ Add Image button enabled');
        }
    }
    
    showPartUVLayout(part) {
        console.log('🎨 Drawing UV layout for:', part.name);
        
        // Clear existing canvas
        if (this.uvEditor && this.uvEditor.canvas) {
            this.uvEditor.canvas.clear();
            this.uvEditor.canvas.backgroundColor = '#1a1a1a';
        }
        
        // Get canvas size from Fabric canvas
        const canvasWidth = this.uvEditor.canvas.width;
        const canvasHeight = this.uvEditor.canvas.height;
        console.log('   Canvas size:', canvasWidth, 'x', canvasHeight);
        
        // Draw UV wireframe directly on Fabric canvas
        const geometry = part.geometry;
        
        console.log('   Geometry:', geometry);
        console.log('   Attributes:', Object.keys(geometry.attributes));
        console.log('   Has UV:', !!geometry.attributes.uv);
        console.log('   Has index:', !!geometry.index);
        
        const uvAttribute = geometry.attributes.uv;
        let index = geometry.index;
        
        if (!uvAttribute) {
            console.warn('   No UV attribute found for this part');
            this.showNotification(`Part "${part.name}" has no UV mapping`, 'warning');
            return;
        }
        
        // If no index, create one from position attribute
        if (!index) {
            console.log('   No index found, using sequential vertex order');
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
        
        console.log('   UV count:', uvAttribute.count, 'Triangles:', index.count / 3);
        
        // Create lines for UV wireframe
        const lines = [];
        
        // Draw all edges
        for (let i = 0; i < index.count; i += 3) {
            const i1 = index.getX(i);
            const i2 = index.getX(i + 1);
            const i3 = index.getX(i + 2);
            
            const u1 = uvAttribute.getX(i1) * canvasWidth;
            const v1 = (1 - uvAttribute.getY(i1)) * canvasHeight;
            const u2 = uvAttribute.getX(i2) * canvasWidth;
            const v2 = (1 - uvAttribute.getY(i2)) * canvasHeight;
            const u3 = uvAttribute.getX(i3) * canvasWidth;
            const v3 = (1 - uvAttribute.getY(i3)) * canvasHeight;
            
            // Create three lines for the triangle
            lines.push(
                new fabric.Line([u1, v1, u2, v2], {
                    stroke: '#00ffff',
                    strokeWidth: 1,
                    selectable: false,
                    evented: false
                }),
                new fabric.Line([u2, v2, u3, v3], {
                    stroke: '#00ffff',
                    strokeWidth: 1,
                    selectable: false,
                    evented: false
                }),
                new fabric.Line([u3, v3, u1, v1], {
                    stroke: '#00ffff',
                    strokeWidth: 1,
                    selectable: false,
                    evented: false
                })
            );
        }
        
        console.log('   Created', lines.length, 'UV wireframe lines');
        
        // Add all lines to canvas
        lines.forEach(line => {
            this.uvEditor.canvas.add(line);
            this.uvEditor.canvas.sendToBack(line);
        });
        
        this.uvEditor.canvas.renderAll();
        
        console.log(`✅ UV layout displayed for ${part.name}`);
    }

    async loadModel(file) {
        const isFBX = file.name.toLowerCase().endsWith('.fbx');
        
        // Check file size before loading
        const fileSizeMB = file.size / (1024 * 1024);

        if (fileSizeMB > 30) {
            const shouldContinue = confirm(
                `⚠️ WARNING: This model is ${fileSizeMB.toFixed(1)}MB!\n\n` +
                `Models over 30MB may crash your browser.\n` +
                `For AK47 and complex guns, try to use simplified models.\n\n` +
                `Recommended: Use models under 10MB\n` +
                `Maximum safe: 30MB\n\n` +
                `Some features will be disabled for performance.\n\n` +
                `Continue at your own risk?`
            );
            if (!shouldContinue) {
                return;
            }
        } else if (fileSizeMB > 10) {
            this.showNotification(
                `⚠️ Large model (${fileSizeMB.toFixed(1)}MB). Some features may be slow or disabled.`,
                'info'
            );
        }

        const loadingNotification = this.showLoadingNotification('Loading model...');

        try {
            // Load 3D model
            const modelInfo = await this.viewer3D.loadModel(file);
            this.currentModel = modelInfo;

            // === FBX WORKFLOW: Parts-based selection ===
            if (modelInfo.isFBX) {
                this.hideLoadingNotification(loadingNotification);
                
                console.log('📦 Showing 3D viewer panel...');
                const viewerPanel = document.getElementById('viewer3DPanel');
                console.log('   Panel element:', viewerPanel);
                console.log('   Panel current display:', window.getComputedStyle(viewerPanel).display);
                
                viewerPanel.style.display = 'flex';
                viewerPanel.style.visibility = 'visible';
                
                console.log('   Panel after setting display:', window.getComputedStyle(viewerPanel).display);
                
                document.getElementById('modelName').textContent = modelInfo.name;
                document.getElementById('polyCount').textContent = modelInfo.polyCount.toLocaleString();
                document.getElementById('viewerPlaceholder').classList.add('hidden');
                
                // Force canvas resize after panel is visible
                setTimeout(() => {
                    console.log('🔄 Forcing canvas resize...');
                    const canvas = document.getElementById('viewer3D');
                    console.log('   Canvas before resize:', canvas.clientWidth, 'x', canvas.clientHeight);
                    
                    this.viewer3D.handleResize();
                    
                    console.log('   Canvas after resize:', canvas.clientWidth, 'x', canvas.clientHeight);
                }, 100);
                
                // Double-check with longer delay
                setTimeout(() => {
                    console.log('🔄 Second resize check...');
                    this.viewer3D.handleResize();
                }, 500);
                
                // Show parts list
                const partsList = modelInfo.parts.map(p => p.name).join('\n• ');
                this.showNotification(
                    `✅ FBX loaded with ${modelInfo.parts.length} parts!\n\n` +
                    `Parts:\n• ${partsList}\n\n` +
                    `Click "Interactive Mode" then click parts to select them!`,
                    'success',
                    8000
                );
                
                // Enable interactive mode
                document.getElementById('interactiveModeBtn').disabled = false;
                document.getElementById('textureToolsSection').style.display = 'flex';
                document.getElementById('modelToolsSection').style.display = 'flex';
                
                // Initially disable Add Image button until part is selected
                const addBtn = document.getElementById('addImageBtn');
                addBtn.disabled = true;
                addBtn.title = 'Select a part first using Interactive Mode';
                
                this.hideLoadingNotification(loadingNotification);
                return;
            }

            // === OBJ WORKFLOW: UV extraction ===
            // Update loading message
            this.updateLoadingNotification(loadingNotification, 'Extracting UV coordinates...');

            // Small delay to let UI update
            await new Promise(resolve => setTimeout(resolve, 50));

            // Extract UV data
            this.uvExtractor = new UVExtractor();
            const success = this.uvExtractor.parseOBJ(modelInfo.objData);

            if (success) {
                // Run island detection for component selection (optimized for large models)
                console.log('UV extraction complete, detecting islands...');
                this.uvExtractor.detectUVIslands();
                this.uvEditor.setUVExtractor(this.uvExtractor);

                console.log(`UV extracted: ${this.uvExtractor.uvs.length} UVs, ${this.uvExtractor.faces.length} faces, ${this.uvExtractor.uvIslands.length} islands`);
            }

            // Update UI
            document.getElementById('modelName').textContent = modelInfo.name;
            document.getElementById('polyCount').textContent = modelInfo.polyCount.toLocaleString();
            document.getElementById('viewerPlaceholder').classList.add('hidden');
            document.getElementById('viewer3DPanel').style.display = 'flex';
            
            // Force canvas resize after panel is visible
            setTimeout(() => {
                this.viewer3D.handleResize();
            }, 100);

            // Check polygon count and disable features for very large models
            const polyCount = modelInfo.polyCount;
            let disableInteractiveMode = false;

            if (polyCount > 200000) {
                this.showNotification(
                    `⚠️ VERY HIGH polygon count (${polyCount.toLocaleString()}).\n` +
                    `Interactive mode DISABLED to prevent crashes.`,
                    'error'
                );
                disableInteractiveMode = true;
            } else if (polyCount > 100000) {
                this.showNotification(
                    `High polygon count (${polyCount.toLocaleString()}). Interactive mode may be very slow.`,
                    'info'
                );
            }

            // Enable interactive controls (unless model is too large)
            if (disableInteractiveMode) {
                document.getElementById('interactiveModeBtn').disabled = true;
                document.getElementById('interactiveModeBtn').title = 'Disabled - Model too large (>200k polygons)';
            } else {
                document.getElementById('interactiveModeBtn').disabled = false;
                document.getElementById('interactiveModeBtn').title = 'Click 3D model to select UV regions';
            }

            document.getElementById('showUVMapBtn').disabled = false;

            // Apply current texture if exists
            this.updateViewerTexture();

            // Remove loading notification
            this.hideLoadingNotification(loadingNotification);
            
            this.showNotification('Model loaded successfully! Click "Interactive Mode" to start.', 'success');
        } catch (error) {
            console.error('Error loading model:', error);
            this.hideLoadingNotification(loadingNotification);
            this.showNotification('Error loading model. Please try again.', 'error');
        }
    }

    async loadBaseTexture(file) {
        try {
            await this.uvEditor.loadBaseTexture(file);

            // Show mask and texture tools after loading UV sheet
            document.getElementById('maskToolsSection').style.display = 'inline-flex';
            document.getElementById('textureToolsSection').style.display = 'inline-flex';

            this.showNotification(`UV Sheet loaded! White internal lines removed. Now you can draw masks or add images.`, 'success');
        } catch (error) {
            console.error('Error loading base texture:', error);
            this.showNotification('Error loading texture. Please try again.', 'error');
        }
    }

    async loadMask(file) {
        try {
            const colors = await this.uvEditor.loadMask(file, 'default');
            this.currentMask = 'default';
            this.updateComponentSelector(colors);
            this.showNotification(`Mask loaded: ${colors.length} components found`, 'success');
        } catch (error) {
            console.error('Error loading mask:', error);
            this.showNotification('Error loading mask. Please try again.', 'error');
        }
    }

    updateComponentSelector(colors) {
        const selector = document.getElementById('componentSelector');
        const clearBtn = document.getElementById('clearMaskBtn');
        
        if (colors.length === 0) {
            selector.innerHTML = '<div class="empty-state">No components found in mask</div>';
            clearBtn.style.display = 'none';
            return;
        }

        selector.innerHTML = '';
        clearBtn.style.display = 'block';
        
        colors.forEach((color) => {
            const button = document.createElement('button');
            button.className = 'component-button';
            
            const colorBox = document.createElement('div');
            colorBox.className = 'component-color';
            colorBox.style.backgroundColor = `rgb(${color.r}, ${color.g}, ${color.b})`;
            
            const name = document.createElement('span');
            name.textContent = color.name;
            
            button.appendChild(colorBox);
            button.appendChild(name);
            
            const colorKey = `${color.r},${color.g},${color.b}`;
            button.addEventListener('click', () => {
                this.selectComponent(colorKey, button);
            });
            
            selector.appendChild(button);
        });
    }

    selectComponent(colorKey, buttonElement) {
        // Update UI
        document.querySelectorAll('.component-button').forEach(btn => {
            btn.classList.remove('active');
        });
        buttonElement.classList.add('active');
        
        // Set mask in editor
        this.uvEditor.selectComponent(this.currentMask, colorKey);
        this.selectedComponent = colorKey;
        
        this.showNotification('Component selected - images will be clipped to this area', 'info');
    }

    clearMask() {
        this.uvEditor.clearMask();
        this.selectedComponent = null;
        
        // Clear UI selection
        document.querySelectorAll('.component-button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        this.showNotification('Mask cleared - images can be placed anywhere', 'info');
    }

    async addImageLayer(file) {
        try {
            const layer = await this.uvEditor.addImageLayer(file);
            this.updateLayerList();
            this.showNotification(`Added layer: ${file.name}`, 'success');
            
            // If FBX part is selected, apply texture to that part only
            if (this.selectedPart) {
                this.applyTextureToFBXPart();
            } else {
                // Regular workflow: update entire model texture
                this.updateViewerTexture();
            }
        } catch (error) {
            console.error('Error adding image layer:', error);
            this.showNotification('Error adding image. Please try again.', 'error');
        }
    }
    
    applyTextureToFBXPart() {
        if (!this.selectedPart) return;
        
        // Export current UV editor canvas as texture
        const textureDataUrl = this.uvEditor.exportTexture();
        
        // Create texture from canvas
        const loader = new THREE.TextureLoader();
        const texture = loader.load(textureDataUrl, () => {
            // Apply to selected part only
            const material = new THREE.MeshStandardMaterial({
                map: texture,
                metalness: 0.3,
                roughness: 0.7,
                side: THREE.DoubleSide
            });
            
            this.selectedPart.mesh.material = material;
            this.selectedPart.currentMaterial = material; // Update current material tracker
            this.selectedPart.mesh.userData.isHighlighted = false; // Clear any highlight flag
            
            console.log(`✅ Texture applied to ${this.selectedPart.name}`);
        });
    }

    deleteSelectedLayer() {
        if (this.uvEditor.deleteActiveLayer()) {
            this.updateLayerList();
            this.updateLayerUI(null);
            this.showNotification('Layer deleted', 'success');
        }
    }

    updateViewerTexture() {
        const canvas = this.uvEditor.getCanvasElement();
        this.viewer3D.updateTextureFromCanvas(canvas);
    }

    updateLayerList() {
        const layerList = document.getElementById('layerList');
        const layers = this.uvEditor.getAllLayers();

        if (layers.length === 0) {
            layerList.innerHTML = '<div class="empty-state">No layers yet. Add an image to get started!</div>';
            return;
        }

        layerList.innerHTML = '';
        
        // Display layers as compact chips in toolbar
        layers.forEach((layer, index) => {
            const layerChip = document.createElement('span');
            layerChip.style.cssText = 'display: inline-block; padding: 4px 8px; margin: 0 4px; background: #2a2a2a; border-radius: 4px; font-size: 11px; cursor: pointer; border: 1px solid #3a3a3a;';
            
            if (layer === this.uvEditor.getActiveLayer()) {
                layerChip.style.background = '#4CAF50';
                layerChip.style.color = '#fff';
                layerChip.style.borderColor = '#4CAF50';
            }
            
            layerChip.textContent = layer.layerName || `Layer ${index + 1}`;
            layerChip.addEventListener('click', () => {
                this.uvEditor.selectLayer(layer);
                this.updateLayerList();
            });
            
            layerList.appendChild(layerChip);
        });
    }

    updateLayerUI(layer) {
        const deleteBtn = document.getElementById('deleteLayerBtn');
        const moveUpBtn = document.getElementById('moveUpBtn');
        const moveDownBtn = document.getElementById('moveDownBtn');
        const opacitySlider = document.getElementById('opacitySlider');
        const opacityValue = document.getElementById('opacityValue');

        if (layer) {
            if (deleteBtn) deleteBtn.disabled = false;
            if (moveUpBtn) moveUpBtn.disabled = false;
            if (moveDownBtn) moveDownBtn.disabled = false;

            // Update opacity slider
            if (opacitySlider && opacityValue) {
                const opacity = Math.round(layer.opacity * 100);
                opacitySlider.value = opacity;
                opacityValue.textContent = opacity + '%';
            }
        } else {
            if (deleteBtn) deleteBtn.disabled = true;
            if (moveUpBtn) moveUpBtn.disabled = true;
            if (moveDownBtn) moveDownBtn.disabled = true;
        }
    }

    exportTexture() {
        const dataURL = this.uvEditor.exportTexture('png');
        const link = document.createElement('a');
        link.download = 'csgo-skin-texture.png';
        link.href = dataURL;
        link.click();

        this.showNotification('Texture exported successfully!', 'success');
    }

    takeScreenshot() {
        if (!this.viewer3D.isModelLoaded()) {
            this.showNotification('Please load a 3D model first', 'error');
            return;
        }

        const dataURL = this.viewer3D.takeScreenshot();
        const link = document.createElement('a');
        link.download = 'csgo-skin-preview.png';
        link.href = dataURL;
        link.click();

        this.showNotification('Screenshot saved!', 'success');
    }

    toggleInteractiveMode() {
        this.interactiveModeEnabled = !this.interactiveModeEnabled;
        
        const btn = document.getElementById('interactiveModeBtn');
        const controls = document.getElementById('interactiveControls');
        
        if (this.interactiveModeEnabled) {
            btn.classList.add('active');
            btn.textContent = '🎨 Interactive Mode: ON';
            controls.style.display = 'block';
            this.viewer3D.enablePicking(true);
            this.uvEditor.showUVMap();
            this.showNotification('Interactive mode ON - Click gun parts to select entire components!', 'info');
        } else {
            btn.classList.remove('active');
            btn.textContent = '🎨 Interactive Mode: OFF';
            controls.style.display = 'none';
            this.viewer3D.enablePicking(false);
            this.uvEditor.clearUVHighlight();
            this.showNotification('Interactive mode OFF', 'info');
        }
    }

    toggleUVMap() {
        if (this.uvEditor.uvMapOverlay) {
            this.uvEditor.hideUVMap();
            document.getElementById('showUVMapBtn').textContent = 'Show UV Wireframe';
        } else {
            this.uvEditor.showUVMap();
            document.getElementById('showUVMapBtn').textContent = 'Hide UV Wireframe';
        }
    }

    toggleFullscreenUV() {
        this.uvEditor.toggleFullscreen();
        const btn = document.getElementById('fullscreenUVBtn');
        if (this.uvEditor.isFullscreen) {
            btn.textContent = '✕ Exit Fullscreen';
        } else {
            btn.textContent = '⛶ Fullscreen';
        }
    }

    toggleMaskDrawingMode() {
        this.maskDrawingMode = !this.maskDrawingMode;
        const btn = document.getElementById('createMaskBtn');
        const toolsPanel = document.getElementById('maskDrawingTools');

        if (this.maskDrawingMode) {
            btn.classList.add('active');
            btn.textContent = '✓ Mask Drawing ON';
            toolsPanel.style.display = 'block';
            this.maskCreator.enableDrawingMode('brush');
            this.showNotification('Mask drawing enabled! Paint to create component masks', 'success');
        } else {
            btn.classList.remove('active');
            btn.textContent = '🎨 Draw Mask';
            toolsPanel.style.display = 'none';
            this.maskCreator.disableDrawingMode();
            this.showNotification('Mask drawing disabled', 'info');
        }
    }

    setDrawingTool(tool) {
        // Update active button
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(tool + 'Tool')?.classList.add('active');

        this.maskCreator.enableDrawingMode(tool);
        this.showNotification(`Tool: ${tool}`, 'info');
    }

    startNewMask() {
        const nextColor = this.maskCreator.getNextMaskColor();
        this.maskCreator.newMask(nextColor);

        // Update UI
        const preview = document.getElementById('maskColorPreview');
        const name = document.getElementById('maskColorName');
        preview.style.background = this.maskCreator.rgbToHex(nextColor);
        name.textContent = nextColor.name;

        this.showNotification(`New mask: ${nextColor.name}`, 'success');
    }

    saveMask() {
        const maskIndex = this.maskCreator.saveMask(`Mask ${this.maskCreator.savedMasks.length + 1}`);
        document.getElementById('saveMaskBtn').disabled = false;
        this.showNotification(`Mask saved! Total: ${maskIndex + 1}`, 'success');
    }

    updateMaskOverlay() {
        const show = document.getElementById('showMaskOverlay').checked;
        const opacity = parseInt(document.getElementById('maskOpacity').value) / 100;

        if (show && this.maskCreator) {
            const overlay = this.maskCreator.getMaskOverlay(opacity);
            // TODO: Display overlay on canvas
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#2d7a2d' : type === 'error' ? '#a02d2d' : '#0d7377'};
            color: white;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 1000;
            animation: slideIn 0.3s ease;
            font-size: 14px;
        `;
        notification.textContent = message;

        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(400px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(400px); opacity: 0; }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    showLoadingNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            padding: 30px 40px;
            background: #2a2a2a;
            color: white;
            border: 2px solid #0d7377;
            border-radius: 8px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
            z-index: 10000;
            font-size: 16px;
            text-align: center;
            min-width: 300px;
        `;
        
        notification.innerHTML = `
            <div class="loading-spinner" style="
                border: 4px solid #3a3a3a;
                border-top: 4px solid #0d7377;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin: 0 auto 15px;
            "></div>
            <div class="loading-message">${message}</div>
        `;

        // Add spinner animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);

        // Add backdrop
        const backdrop = document.createElement('div');
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            z-index: 9999;
        `;
        notification.backdrop = backdrop;

        document.body.appendChild(backdrop);
        document.body.appendChild(notification);

        return notification;
    }

    updateLoadingNotification(notification, message) {
        const messageEl = notification.querySelector('.loading-message');
        if (messageEl) {
            messageEl.textContent = message;
        }
    }

    hideLoadingNotification(notification) {
        if (notification) {
            if (notification.backdrop) {
                notification.backdrop.remove();
            }
            notification.remove();
        }
    }
}


// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.skinEditor = new CSGOSkinEditor();
});

