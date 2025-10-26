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
        this.partTextures = {}; // Store separate canvas/texture for each FBX part
        this.currentPartCanvas = null; // Current part's dedicated canvas

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
        
        // Parts List Toggle
        document.getElementById('togglePartsListBtn').addEventListener('click', () => {
            const modal = document.getElementById('partsListModal');
            modal.style.display = modal.style.display === 'none' ? 'block' : 'none';
        });
        
        document.getElementById('closePartsListBtn').addEventListener('click', () => {
            document.getElementById('partsListModal').style.display = 'none';
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
        // Save current part's canvas state before switching
        if (this.selectedPart && this.uvEditor.canvas) {
            console.log(`💾 Saving canvas state for: ${this.selectedPart.name}`);
            this.partTextures[this.selectedPart.name] = this.uvEditor.canvas.toJSON();
        }
        
        this.selectedPart = part;
        
        const isNewCanvas = !this.partTextures[part.name];
        if (isNewCanvas) {
            this.showNotification(`✅ Selected: ${part.name} (New Canvas)`, 'success');
        } else {
            this.showNotification(`✅ Selected: ${part.name} (Loading Saved Work)`, 'success');
        }
        
        // Show part info in toolbar
        const selectedPartInfo = document.getElementById('selectedPartInfo');
        const selectedPartName = document.getElementById('selectedPartName');
        const clearBtn = document.getElementById('clearPartSelectionBtn');
        
        selectedPartInfo.style.display = 'flex';
        selectedPartName.textContent = part.name;
        clearBtn.style.display = 'inline-block';
        
        clearBtn.onclick = () => {
            // Save current state before clearing
            if (this.selectedPart && this.uvEditor.canvas) {
                this.partTextures[this.selectedPart.name] = this.uvEditor.canvas.toJSON();
            }
            
            this.selectedPart = null;
            selectedPartInfo.style.display = 'none';
            if (this.uvEditor && this.uvEditor.canvas) {
                this.uvEditor.canvas.clear();
            }
            this.showNotification('Part selection cleared', 'info');
        };
        
        // Clear canvas and load this part's saved state (if any)
        this.uvEditor.canvas.clear();
        this.uvEditor.canvas.backgroundColor = '#1a1a1a';
        
        if (this.partTextures[part.name]) {
            console.log(`📂 Loading saved canvas state for: ${part.name}`);
            this.uvEditor.canvas.loadFromJSON(this.partTextures[part.name], () => {
                this.showPartUVLayout(part);
                this.uvEditor.canvas.renderAll();
            });
        } else {
            console.log(`🆕 Creating new canvas for: ${part.name}`);
            this.showPartUVLayout(part);
        }
        
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
        
        // Add coordinate reference grid for debugging
        this.addDebugGrid(canvasWidth, canvasHeight);
        
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
        
        // Analyze UV range to detect issues
        let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
        for (let i = 0; i < uvAttribute.count; i++) {
            const u = uvAttribute.getX(i);
            const v = uvAttribute.getY(i);
            minU = Math.min(minU, u);
            maxU = Math.max(maxU, u);
            minV = Math.min(minV, v);
            maxV = Math.max(maxV, v);
        }
        console.log('   UV Range:');
        console.log('      U:', minU.toFixed(3), 'to', maxU.toFixed(3), '(width:', (maxU - minU).toFixed(3), ')');
        console.log('      V:', minV.toFixed(3), 'to', maxV.toFixed(3), '(height:', (maxV - minV).toFixed(3), ')');
        
        if (minU < -0.1 || maxU > 1.1 || minV < -0.1 || maxV > 1.1) {
            console.warn('   ⚠️ UVs outside standard 0-1 range!');
        }
        
        // Create lines for UV wireframe
        const lines = [];
        
        // Draw all edges (log first few for debugging)
        for (let i = 0; i < index.count; i += 3) {
            const i1 = index.getX(i);
            const i2 = index.getX(i + 1);
            const i3 = index.getX(i + 2);
            
            // Get raw UV coordinates (0-1 range)
            const u1_raw = uvAttribute.getX(i1);
            const v1_raw = uvAttribute.getY(i1);
            const u2_raw = uvAttribute.getX(i2);
            const v2_raw = uvAttribute.getY(i2);
            const u3_raw = uvAttribute.getX(i3);
            const v3_raw = uvAttribute.getY(i3);
            
            // Debug log first triangle
            if (i === 0) {
                console.log('   First triangle UVs (raw 0-1):');
                console.log('      v1:', u1_raw.toFixed(3), v1_raw.toFixed(3));
                console.log('      v2:', u2_raw.toFixed(3), v2_raw.toFixed(3));
                console.log('      v3:', u3_raw.toFixed(3), v3_raw.toFixed(3));
            }
            
            // Convert to canvas coordinates (flip Y because UV space has origin at bottom-left)
            const u1 = u1_raw * canvasWidth;
            const v1 = (1 - v1_raw) * canvasHeight;
            const u2 = u2_raw * canvasWidth;
            const v2 = (1 - v2_raw) * canvasHeight;
            const u3 = u3_raw * canvasWidth;
            const v3 = (1 - v3_raw) * canvasHeight;
            
            if (i === 0) {
                console.log('   First triangle canvas coords:');
                console.log('      v1:', u1.toFixed(1), v1.toFixed(1));
                console.log('      v2:', u2.toFixed(1), v2.toFixed(1));
                console.log('      v3:', u3.toFixed(1), v3.toFixed(1));
            }
            
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
        
        // Calculate bounding box of UV wireframe in canvas pixels
        minU = Infinity; 
        minV = Infinity; 
        maxU = -Infinity; 
        maxV = -Infinity;
        for (let i = 0; i < index.count; i += 3) {
            const i1 = index.getX(i);
            const i2 = index.getX(i + 1);
            const i3 = index.getX(i + 2);
            
            [i1, i2, i3].forEach(idx => {
                const u = uvAttribute.getX(idx) * canvasWidth;
                const v = (1 - uvAttribute.getY(idx)) * canvasHeight;
                minU = Math.min(minU, u);
                minV = Math.min(minV, v);
                maxU = Math.max(maxU, u);
                maxV = Math.max(maxV, v);
            });
        }
        
        // Add bounding box rectangle to show UV extent
        const bbox = new fabric.Rect({
            left: minU,
            top: minV,
            width: maxU - minU,
            height: maxV - minV,
            fill: 'transparent',
            stroke: '#ffff00', // Yellow
            strokeWidth: 2,
            strokeDashArray: [5, 5],
            selectable: false,
            evented: false
        });
        this.uvEditor.canvas.add(bbox);
        
        console.log(`   UV Bounding Box: (${minU.toFixed(1)}, ${minV.toFixed(1)}) to (${maxU.toFixed(1)}, ${maxV.toFixed(1)})`);
        console.log(`   Size: ${(maxU - minU).toFixed(1)} x ${(maxV - minV).toFixed(1)} px`);
        
        // Add all lines to canvas
        lines.forEach(line => {
            this.uvEditor.canvas.add(line);
            this.uvEditor.canvas.sendToBack(line);
        });
        
        this.uvEditor.canvas.renderAll();
        
        console.log(`✅ UV layout displayed for ${part.name}`);
        
        // Add corner markers to show UV space boundaries
        this.addUVCornerMarkers(canvasWidth, canvasHeight);
    }
    
    addDebugGrid(width, height) {
        // Add a subtle grid to show UV space (0,0) to (1,1)
        const gridSize = Math.min(width, height) / 4;
        
        for (let i = 0; i <= 4; i++) {
            // Vertical lines
            const vLine = new fabric.Line([i * gridSize, 0, i * gridSize, height], {
                stroke: '#333333',
                strokeWidth: 1,
                selectable: false,
                evented: false
            });
            this.uvEditor.canvas.add(vLine);
            this.uvEditor.canvas.sendToBack(vLine);
            
            // Horizontal lines
            const hLine = new fabric.Line([0, i * gridSize, width, i * gridSize], {
                stroke: '#333333',
                strokeWidth: 1,
                selectable: false,
                evented: false
            });
            this.uvEditor.canvas.add(hLine);
            this.uvEditor.canvas.sendToBack(hLine);
        }
        
        console.log('   Added debug grid');
    }
    
    addUVCornerMarkers(width, height) {
        // Add corner markers to show UV coordinate system
        const corners = [
            { x: 0, y: 0, label: '(0,0)' },
            { x: width, y: 0, label: '(1,0)' },
            { x: 0, y: height, label: '(0,1)' },
            { x: width, y: height, label: '(1,1)' }
        ];
        
        corners.forEach(corner => {
            const circle = new fabric.Circle({
                left: corner.x - 5,
                top: corner.y - 5,
                radius: 5,
                fill: '#ff00ff',
                selectable: false,
                evented: false
            });
            
            const text = new fabric.Text(corner.label, {
                left: corner.x + 10,
                top: corner.y - 10,
                fontSize: 12,
                fill: '#ff00ff',
                selectable: false,
                evented: false
            });
            
            this.uvEditor.canvas.add(circle);
            this.uvEditor.canvas.add(text);
        });
        
        console.log('   Added UV corner markers (magenta)');
    }
    
    populatePartsList() {
        const container = document.getElementById('partsListContainer');
        container.innerHTML = '';
        
        const parts = this.viewer3D.modelParts;
        
        if (!parts || parts.length === 0) {
            container.innerHTML = '<div style="color: #888; font-size: 12px; padding: 10px;">No parts found</div>';
            return;
        }
        
        console.log(`🔧 Populating parts list with ${parts.length} parts`);
        
        parts.forEach((part, index) => {
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
            `;
            
            // Check if this part has a saved texture
            const hasTexture = this.partTextures[part.name];
            const textureIndicator = hasTexture ? '🎨 ' : '';
            
            partBtn.innerHTML = `
                <div style="font-weight: bold; color: #4CAF50;">${textureIndicator}${part.name}</div>
                <div style="font-size: 11px; color: #888; margin-top: 4px;">
                    ${part.uvs.length} UV coords${hasTexture ? ' • Textured' : ''}
                </div>
            `;
            
            // Hover effect
            partBtn.onmouseenter = () => {
                partBtn.style.background = '#2a2a2a';
                partBtn.style.borderColor = '#4CAF50';
            };
            partBtn.onmouseleave = () => {
                if (this.selectedPart !== part) {
                    partBtn.style.background = '#1e1e1e';
                    partBtn.style.borderColor = '#3a3a3a';
                }
            };
            
            // Click to select part
            partBtn.onclick = () => {
                this.selectFBXPart(part);
                
                // Update all buttons to show selection
                Array.from(container.children).forEach(btn => {
                    btn.style.background = '#1e1e1e';
                    btn.style.borderColor = '#3a3a3a';
                });
                partBtn.style.background = '#2a2a2a';
                partBtn.style.borderColor = '#4CAF50';
                
                // Close modal after selection
                document.getElementById('partsListModal').style.display = 'none';
            };
            
            container.appendChild(partBtn);
        });
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
                
                // Show Parts Explorer section
                document.getElementById('partsExplorerSection').style.display = 'flex';
                
                // Populate parts list
                this.populatePartsList();
                
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
            this.showNotification(`✅ ${file.name} added - Position it over the CYAN wireframe`, 'success');
            
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
        if (!this.selectedPart) {
            console.warn('⚠️ No part selected, skipping texture application');
            return;
        }
        
        console.log(`🎨 Applying texture to: ${this.selectedPart.name}`);
        console.log(`   Current mesh material ID: ${this.selectedPart.mesh.material.id}`);
        console.log(`   Canvas dimensions: ${this.uvEditor.canvas.width} x ${this.uvEditor.canvas.height}`);
        
        // Save the canvas state for this part
        this.partTextures[this.selectedPart.name] = this.uvEditor.canvas.toJSON();
        
        // Export current UV editor canvas as texture
        const textureDataUrl = this.uvEditor.exportTexture();
        console.log(`   Texture data URL length: ${textureDataUrl.length} bytes`);
        
        // Create texture from canvas
        const loader = new THREE.TextureLoader();
        const texture = loader.load(textureDataUrl, () => {
            // Configure texture settings
            texture.wrapS = THREE.ClampToEdgeWrapping; // Don't repeat horizontally
            texture.wrapT = THREE.ClampToEdgeWrapping; // Don't repeat vertically
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.flipY = false; // Don't flip (we handle Y-flip in UV coords)
            texture.needsUpdate = true;
            
            console.log(`   Texture loaded:`, texture.image.width, 'x', texture.image.height);
            console.log(`   Texture wrap: S=${texture.wrapS}, T=${texture.wrapT}`);
            console.log(`   Texture flipY:`, texture.flipY);
            
            // Create a NEW material specifically for this part
            const newMaterial = new THREE.MeshStandardMaterial({
                map: texture,
                metalness: 0.3,
                roughness: 0.7,
                side: THREE.DoubleSide
            });
            
            console.log(`   New material created: ID ${newMaterial.id}`);
            console.log(`   Assigning to mesh: ${this.selectedPart.mesh.name}`);
            
            // Apply to selected part only
            this.selectedPart.mesh.material = newMaterial;
            this.selectedPart.currentMaterial = newMaterial; // Update current material tracker
            this.selectedPart.mesh.userData.isHighlighted = false; // Clear any highlight flag
            
            // Verify no other parts share this material
            const otherPartsWithSameMaterial = this.viewer3D.modelParts.filter(p => 
                p !== this.selectedPart && p.mesh.material.id === newMaterial.id
            );
            
            if (otherPartsWithSameMaterial.length > 0) {
                console.error('❌ ERROR: Other parts sharing the same material!', 
                    otherPartsWithSameMaterial.map(p => p.name));
            } else {
                console.log(`✅ Texture applied ONLY to ${this.selectedPart.name} (verified unique)`);
            }
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

