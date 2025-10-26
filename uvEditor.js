// UV Editor Module using Fabric.js
import { MaskingSystem } from './maskingSystem.js';
import { TGALoader } from './tgaLoader.js';
import { UVSimplifier } from './uvSimplifier.js';

export class UVEditor {
    constructor(canvasId) {
        // Calculate canvas size to fit screen with some padding
        const availableWidth = window.innerWidth - 60;
        const availableHeight = window.innerHeight - 200;
        const canvasSize = Math.min(availableWidth, availableHeight, 2048);

        console.log(`Creating canvas: ${canvasSize}x${canvasSize}px`);

        this.canvas = new fabric.Canvas(canvasId, {
            width: canvasSize,
            height: canvasSize,
            backgroundColor: '#1a1a1a',
            renderOnAddRemove: true, // Enable automatic rendering
            enableRetinaScaling: false, // Disable retina for performance
            selection: true // Enable selection
        });

        this.layers = [];
        this.activeLayer = null;
        this.onChangeCallback = null;
        this.maskingSystem = new MaskingSystem(canvasSize, canvasSize);
        this.maskOverlay = null;
        this.uvHighlightOverlay = null;
        this.uvExtractor = null;
        this.uvSimplifier = new UVSimplifier(canvasSize, canvasSize);
        this.simplifiedIslands = null;
        this.isFullscreen = false;

        this.initializeCanvas();
        this.setupEventListeners();
    }

    initializeCanvas() {
        // Set canvas selection style
        fabric.Object.prototype.set({
            transparentCorners: false,
            cornerColor: '#0d7377',
            cornerStyle: 'circle',
            borderColor: '#14afb5',
            cornerSize: 10,
            padding: 0,
            borderScaleFactor: 2
        });
    }

    setupEventListeners() {
        // Handle object selection
        this.canvas.on('selection:created', (e) => {
            this.setActiveLayer(e.selected[0]);
        });

        this.canvas.on('selection:updated', (e) => {
            this.setActiveLayer(e.selected[0]);
        });

        this.canvas.on('selection:cleared', () => {
            this.setActiveLayer(null);
        });

        // Constrain objects to canvas bounds
        this.canvas.on('object:moving', (e) => {
            this.constrainToCanvas(e.target);
        });

        this.canvas.on('object:scaling', (e) => {
            this.constrainToCanvas(e.target);
        });

        this.canvas.on('object:rotating', (e) => {
            this.constrainToCanvas(e.target);
        });

        // Trigger change callback for texture updates
        this.canvas.on('object:modified', () => {
            this.triggerChange();
        });

        this.canvas.on('object:added', () => {
            this.triggerChange();
        });

        this.canvas.on('object:removed', () => {
            this.triggerChange();
        });
    }

    constrainToCanvas(obj) {
        const bounds = obj.getBoundingRect();
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;

        // Calculate boundaries
        let left = obj.left;
        let top = obj.top;

        // Left boundary
        if (bounds.left < 0) {
            left = obj.left - bounds.left;
        }
        // Right boundary
        if (bounds.left + bounds.width > canvasWidth) {
            left = obj.left - (bounds.left + bounds.width - canvasWidth);
        }
        // Top boundary
        if (bounds.top < 0) {
            top = obj.top - bounds.top;
        }
        // Bottom boundary
        if (bounds.top + bounds.height > canvasHeight) {
            top = obj.top - (bounds.top + bounds.height - canvasHeight);
        }

        obj.set({
            left: left,
            top: top
        });

        obj.setCoords();
    }

    async loadBaseTexture(imageFile) {
        try {
            const imageUrl = await this.loadImageFile(imageFile);

            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    // Process image to remove internal white lines
                    const processedCanvas = this.removeInternalLines(img);

                    // Convert processed canvas to fabric image
                    fabric.Image.fromURL(processedCanvas.toDataURL(), (fabricImg) => {
                        // Scale to fit canvas
                        const scale = Math.min(
                            this.canvas.width / fabricImg.width,
                            this.canvas.height / fabricImg.height
                        );

                        fabricImg.set({
                            scaleX: scale,
                            scaleY: scale,
                            left: this.canvas.width / 2,
                            top: this.canvas.height / 2,
                            originX: 'center',
                            originY: 'center',
                            selectable: false,
                            evented: false
                        });

                        // Set as background
                        this.canvas.setBackgroundImage(fabricImg, () => {
                            this.canvas.renderAll();
                            this.triggerChange();
                            resolve();
                        });
                    }, { crossOrigin: 'anonymous' });
                };
                img.onerror = reject;
                img.src = imageUrl;
            });
        } catch (error) {
            throw error;
        }
    }

    // Show only outer boundaries of major shapes
    removeInternalLines(img) {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        // Draw original image
        ctx.drawImage(img, 0, 0);
        let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Step 1: Convert all colored lines to white, make background black
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            // If it's not mostly transparent and has some color
            if (a > 100 && (r > 50 || g > 50 || b > 50)) {
                // Make it white (UV islands)
                data[i] = 255;
                data[i + 1] = 255;
                data[i + 2] = 255;
                data[i + 3] = 255;
            } else {
                // Make it black (background)
                data[i] = 0;
                data[i + 1] = 0;
                data[i + 2] = 0;
                data[i + 3] = 255;
            }
        }

        ctx.putImageData(imageData, 0, 0);

        // Step 2: Apply morphological closing to merge nearby shapes
        imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        imageData = this.uvSimplifier.closing(imageData, 8); // Aggressive merging
        ctx.putImageData(imageData, 0, 0);

        // Step 3: Extract only outer boundaries
        imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const outlineData = this.uvSimplifier.extractOutline(imageData);

        // Step 4: Draw thick cyan outlines on original image
        const resultCanvas = document.createElement('canvas');
        resultCanvas.width = canvas.width;
        resultCanvas.height = canvas.height;
        const resultCtx = resultCanvas.getContext('2d');

        // Draw original image
        resultCtx.drawImage(img, 0, 0);

        // Draw outlines as thick cyan lines
        const outline = outlineData.data;
        resultCtx.strokeStyle = '#00ffff';
        resultCtx.lineWidth = 3;

        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                const idx = (y * canvas.width + x) * 4;
                if (outline[idx] > 128) {
                    resultCtx.fillStyle = '#00ffff';
                    resultCtx.fillRect(x, y, 1, 1);
                }
            }
        }

        console.log('Showing only outer boundaries of major components');
        return resultCanvas;
    }

    async loadImageFile(file) {
        // Check if file is TGA
        if (file.name.toLowerCase().endsWith('.tga')) {
            const imageData = await TGALoader.loadFromFile(file);
            const canvas = TGALoader.createCanvas(imageData);
            return canvas.toDataURL('image/png');
        } else {
            // Regular image file
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }
    }

    async addImageLayer(imageFile, applyMask = false) {
        try {
            const imageUrl = await this.loadImageFile(imageFile);

            return new Promise((resolve, reject) => {
                fabric.Image.fromURL(imageUrl, (img) => {
                    // Apply masking if enabled and mask is active
                    if (applyMask && this.maskingSystem.getActiveMask()) {
                        // Create temporary canvas to apply mask
                        const tempCanvas = document.createElement('canvas');
                        tempCanvas.width = img.width;
                        tempCanvas.height = img.height;
                        const ctx = tempCanvas.getContext('2d');
                        ctx.drawImage(img.getElement(), 0, 0);

                        // Apply mask (this will clip the image to the component)
                        const maskedCanvas = this.maskingSystem.applyMaskToImage(tempCanvas);

                        // Create new fabric image from masked canvas
                        fabric.Image.fromURL(maskedCanvas.toDataURL(), (maskedImg) => {
                            this.addFabricImageToCanvas(maskedImg, imageFile, resolve);
                        }, { crossOrigin: 'anonymous' });
                    } else {
                        this.addFabricImageToCanvas(img, imageFile, resolve);
                    }
                }, { crossOrigin: 'anonymous' });
            });
        } catch (error) {
            throw error;
        }
    }

    addFabricImageToCanvas(img, imageFile, callback) {
        // Scale image to reasonable size
        const maxSize = this.canvas.width * 0.3;
        const scale = Math.min(
            maxSize / img.width,
            maxSize / img.height
        );

        img.set({
            scaleX: scale,
            scaleY: scale,
            left: this.canvas.width / 2,
            top: this.canvas.height / 2,
            originX: 'center',
            originY: 'center',
            selectable: true,  // ENSURE SELECTABLE
            evented: true,     // ENSURE INTERACTIVE
            hasControls: true, // ENSURE CONTROLS VISIBLE
            hasBorders: true   // ENSURE BORDERS VISIBLE
        });

        // Store layer info
        img.layerName = imageFile.name;
        img.layerId = Date.now() + Math.random();

        this.canvas.add(img);
        this.layers.push(img);
        this.canvas.setActiveObject(img);
        this.canvas.renderAll();

        console.log(`Added image layer: ${imageFile.name} - SELECTABLE and MOVABLE`);
        callback(img);
    }

    deleteActiveLayer() {
        if (this.activeLayer) {
            this.canvas.remove(this.activeLayer);
            const index = this.layers.indexOf(this.activeLayer);
            if (index > -1) {
                this.layers.splice(index, 1);
            }
            this.activeLayer = null;
            this.canvas.renderAll();
            return true;
        }
        return false;
    }

    moveLayerUp() {
        if (this.activeLayer) {
            this.canvas.bringForward(this.activeLayer);
            this.canvas.renderAll();
            this.triggerChange();
            return true;
        }
        return false;
    }

    moveLayerDown() {
        if (this.activeLayer) {
            this.canvas.sendBackwards(this.activeLayer);
            this.canvas.renderAll();
            this.triggerChange();
            return true;
        }
        return false;
    }

    setLayerOpacity(opacity) {
        if (this.activeLayer) {
            this.activeLayer.set('opacity', opacity / 100);
            this.canvas.renderAll();
            this.triggerChange();
        }
    }

    setActiveLayer(layer) {
        this.activeLayer = layer;
        if (this.onLayerSelectCallback) {
            this.onLayerSelectCallback(layer);
        }
    }

    getActiveLayer() {
        return this.activeLayer;
    }

    getAllLayers() {
        return this.layers;
    }

    selectLayer(layer) {
        this.canvas.setActiveObject(layer);
        this.canvas.renderAll();
    }

    exportTexture(format = 'png') {
        const dataURL = this.canvas.toDataURL({
            format: format,
            quality: 1.0
        });
        return dataURL;
    }

    getCanvasElement() {
        return this.canvas.lowerCanvasEl;
    }

    getFabricCanvas() {
        return this.canvas;
    }

    onChange(callback) {
        this.onChangeCallback = callback;
    }

    onLayerSelect(callback) {
        this.onLayerSelectCallback = callback;
    }

    triggerChange() {
        if (this.onChangeCallback) {
            this.onChangeCallback();
        }
    }

    clear() {
        // Properly dispose of all objects
        this.canvas.getObjects().forEach(obj => {
            if (obj.dispose) {
                obj.dispose();
            }
        });
        this.canvas.clear();
        this.layers = [];
        this.activeLayer = null;
        this.canvas.backgroundColor = '#2a2a2a';
        this.canvas.renderAll();
    }

    dispose() {
        // Clean up all resources
        this.clear();
        if (this.canvas) {
            this.canvas.dispose();
        }
        if (this.maskingSystem) {
            this.maskingSystem = null;
        }
        this.uvExtractor = null;
    }

    // Masking system methods
    async loadMask(maskFile, maskName = 'default') {
        const colors = await this.maskingSystem.loadMaskImage(maskFile, maskName);
        return colors;
    }

    selectComponent(maskName, colorKey) {
        const success = this.maskingSystem.selectComponent(maskName, colorKey);
        if (success) {
            this.updateMaskOverlay();
        }
        return success;
    }

    updateMaskOverlay() {
        // Remove old overlay
        if (this.maskOverlay) {
            this.canvas.remove(this.maskOverlay);
            this.maskOverlay = null;
        }

        // Add new overlay if mask is active
        const maskCanvas = this.maskingSystem.getMaskVisualization(0.25);
        if (maskCanvas) {
            fabric.Image.fromURL(maskCanvas.toDataURL(), (img) => {
                img.set({
                    left: 0,
                    top: 0,
                    selectable: false,
                    evented: false,
                    opacity: 1
                });
                this.maskOverlay = img;
                this.canvas.add(img);
                this.canvas.sendToBack(img);
                this.canvas.renderAll();
            }, { crossOrigin: 'anonymous' });
        } else {
            this.canvas.renderAll();
        }
    }

    clearMask() {
        if (this.maskOverlay) {
            this.canvas.remove(this.maskOverlay);
            this.maskOverlay = null;
        }
        this.maskingSystem.clearActiveMask();
        this.canvas.renderAll();
    }

    getMaskingSystem() {
        return this.maskingSystem;
    }

    getFabricCanvas() {
        return this.canvas;
    }

    // UV Extraction and highlighting methods
    setUVExtractor(uvExtractor) {
        this.uvExtractor = uvExtractor;

        // DISABLED: Simplified islands generation (causes crashes on large models)
        // The morphological operations are too expensive for real-time selection
        // We'll keep the clean outline visualization but use standard island detection
        this.simplifiedIslands = null;
    }

    showUVMap() {
        if (!this.uvExtractor) return;

        // Use standard outline generation (SAFE - no expensive morphological operations)
        console.log('Generating UV component outlines...');
        const uvMap = this.uvExtractor.generateUVMapOutlines(
            this.canvas.width,
            this.canvas.height,
            '#00ffff',
            'transparent'
        );

        fabric.Image.fromURL(uvMap.toDataURL(), (img) => {
            img.set({
                left: 0,
                top: 0,
                selectable: false,
                evented: false,
                opacity: 0.3
            });

            // Remove old UV map if exists
            if (this.uvMapOverlay) {
                this.canvas.remove(this.uvMapOverlay);
            }

            this.uvMapOverlay = img;
            this.canvas.add(img);
            this.canvas.sendToBack(img);
            this.canvas.renderAll();
        }, { crossOrigin: 'anonymous' });
    }

    hideUVMap() {
        if (this.uvMapOverlay) {
            this.canvas.remove(this.uvMapOverlay);
            this.uvMapOverlay = null;
            this.canvas.renderAll();
        }
    }

    highlightUVFaces(faceIndices, color = '#00ffff', opacity = 0.5) {
        if (!this.uvExtractor || !faceIndices || faceIndices.length === 0) {
            this.clearUVHighlight();
            return;
        }

        // Limit highlighting to reasonable number of faces to avoid lag
        const maxFacesToHighlight = 1000;
        const facesToHighlight = faceIndices.length > maxFacesToHighlight
            ? faceIndices.slice(0, maxFacesToHighlight)
            : faceIndices;

        if (faceIndices.length > maxFacesToHighlight) {
            console.warn(`Highlighting limited to ${maxFacesToHighlight} faces for performance`);
        }

        // Create highlight canvas
        const highlightCanvas = document.createElement('canvas');
        highlightCanvas.width = this.canvas.width;
        highlightCanvas.height = this.canvas.height;
        const ctx = highlightCanvas.getContext('2d');

        ctx.fillStyle = color;
        ctx.globalAlpha = opacity;

        // Batch all faces into a single path
        ctx.beginPath();
        for (const faceIndex of facesToHighlight) {
            const face = this.uvExtractor.faces[faceIndex];
            if (!face || face.uvIndices.length < 3) continue;

            let firstPoint = null;
            face.uvIndices.forEach((uvIdx, i) => {
                const uv = this.uvExtractor.uvs[uvIdx];
                if (!uv) return;

                const x = uv.u * this.canvas.width;
                const y = uv.v * this.canvas.height;

                if (i === 0) {
                    ctx.moveTo(x, y);
                    firstPoint = { x, y };
                } else {
                    ctx.lineTo(x, y);
                }
            });

            if (firstPoint) {
                ctx.lineTo(firstPoint.x, firstPoint.y);
            }
        }
        ctx.fill();

        // Add to canvas
        fabric.Image.fromURL(highlightCanvas.toDataURL(), (img) => {
            img.set({
                left: 0,
                top: 0,
                selectable: false,
                evented: false
            });

            // Remove old highlight
            if (this.uvHighlightOverlay) {
                this.canvas.remove(this.uvHighlightOverlay);
                // Dispose of old image to free memory
                if (this.uvHighlightOverlay.dispose) {
                    this.uvHighlightOverlay.dispose();
                }
            }

            this.uvHighlightOverlay = img;
            this.canvas.add(img);

            // Position above UV map but below other layers
            if (this.uvMapOverlay) {
                this.uvHighlightOverlay.moveTo(this.canvas.getObjects().indexOf(this.uvMapOverlay) + 1);
            } else {
                this.canvas.sendToBack(this.uvHighlightOverlay);
            }

            this.canvas.renderAll();
        }, { crossOrigin: 'anonymous' });
    }

    clearUVHighlight() {
        if (this.uvHighlightOverlay) {
            this.canvas.remove(this.uvHighlightOverlay);
            this.uvHighlightOverlay = null;
            this.canvas.renderAll();
        }
    }

    highlightUVIsland(island, color = '#00ffff', opacity = 0.5) {
        if (!this.uvExtractor || !island || !island.faces || island.faces.length === 0) {
            this.clearUVHighlight();
            return;
        }

        // SIMPLIFIED VERSION - No morphological operations during selection
        // This prevents crashes on large models
        const highlightCanvas = document.createElement('canvas');
        highlightCanvas.width = this.canvas.width;
        highlightCanvas.height = this.canvas.height;
        const ctx = highlightCanvas.getContext('2d');

        // Fill the island area with semi-transparent color
        ctx.fillStyle = color;
        ctx.globalAlpha = opacity * 0.5;
        ctx.beginPath();

        for (const faceIndex of island.faces) {
            const face = this.uvExtractor.faces[faceIndex];
            if (!face || face.uvIndices.length < 3) continue;

            let firstPoint = null;
            face.uvIndices.forEach((uvIdx, i) => {
                const uv = this.uvExtractor.uvs[uvIdx];
                if (!uv) return;

                const x = uv.u * this.canvas.width;
                const y = uv.v * this.canvas.height;

                if (i === 0) {
                    ctx.moveTo(x, y);
                    firstPoint = { x, y };
                } else {
                    ctx.lineTo(x, y);
                }
            });

            if (firstPoint) {
                ctx.lineTo(firstPoint.x, firstPoint.y);
            }
        }
        ctx.fill();

        // Draw simple outline by finding boundary edges
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;

        // Build edge map quickly
        const edges = new Map();
        for (const faceIndex of island.faces) {
            const face = this.uvExtractor.faces[faceIndex];
            if (!face || face.uvIndices.length < 3) continue;

            for (let i = 0; i < face.uvIndices.length; i++) {
                const uv1 = face.uvIndices[i];
                const uv2 = face.uvIndices[(i + 1) % face.uvIndices.length];
                const key = uv1 < uv2 ? `${uv1}-${uv2}` : `${uv2}-${uv1}`;
                edges.set(key, (edges.get(key) || 0) + 1);
            }
        }

        // Draw boundary edges only
        ctx.beginPath();
        for (const [key, count] of edges) {
            if (count === 1) {
                const [uv1, uv2] = key.split('-').map(Number);
                const uvA = this.uvExtractor.uvs[uv1];
                const uvB = this.uvExtractor.uvs[uv2];
                if (uvA && uvB) {
                    ctx.moveTo(uvA.u * this.canvas.width, uvA.v * this.canvas.height);
                    ctx.lineTo(uvB.u * this.canvas.width, uvB.v * this.canvas.height);
                }
            }
        }
        ctx.stroke();

        // Add to canvas
        fabric.Image.fromURL(highlightCanvas.toDataURL(), (img) => {
            img.set({
                left: 0,
                top: 0,
                selectable: false,
                evented: false
            });

            // Remove old highlight
            if (this.uvHighlightOverlay) {
                this.canvas.remove(this.uvHighlightOverlay);
                if (this.uvHighlightOverlay.dispose) {
                    this.uvHighlightOverlay.dispose();
                }
            }

            this.uvHighlightOverlay = img;
            this.canvas.add(img);

            // Position above UV map but below other layers
            if (this.uvMapOverlay) {
                this.uvHighlightOverlay.moveTo(this.canvas.getObjects().indexOf(this.uvMapOverlay) + 1);
            } else {
                this.canvas.sendToBack(this.uvHighlightOverlay);
            }

            this.canvas.renderAll();
        }, { crossOrigin: 'anonymous' });
    }

    // Find simplified island containing a face by checking UV position
    findSimplifiedIslandForFace(faceIndex) {
        if (!this.uvExtractor || !this.simplifiedIslands || !this.simplifiedIslands.length) {
            // Fallback to original island
            return this.uvExtractor.getIslandContainingFace(faceIndex);
        }

        const face = this.uvExtractor.faces[faceIndex];
        if (!face || face.uvIndices.length < 3) return null;

        // Get center point of the face in UV space
        let avgU = 0, avgV = 0;
        for (const uvIdx of face.uvIndices) {
            const uv = this.uvExtractor.uvs[uvIdx];
            if (uv) {
                avgU += uv.u;
                avgV += uv.v;
            }
        }
        avgU /= face.uvIndices.length;
        avgV /= face.uvIndices.length;

        // Convert to pixel coordinates
        const x = Math.floor(avgU * this.canvas.width);
        const y = Math.floor(avgV * this.canvas.height);

        // Find which simplified island contains this point
        for (const simplifiedIsland of this.simplifiedIslands) {
            for (const [px, py] of simplifiedIsland.pixels) {
                if (Math.abs(px - x) < 3 && Math.abs(py - y) < 3) {
                    // Found it! Now return the original island with all faces that map to this simplified island
                    return this.getOriginalIslandForSimplified(simplifiedIsland);
                }
            }
        }

        // Fallback to original island detection
        return this.uvExtractor.getIslandContainingFace(faceIndex);
    }

    // Map simplified island back to original faces for masking
    getOriginalIslandForSimplified(simplifiedIsland) {
        const faces = [];

        // Check all faces to see if they fall within this simplified island
        for (let i = 0; i < this.uvExtractor.faces.length; i++) {
            const face = this.uvExtractor.faces[i];
            if (!face || face.uvIndices.length < 3) continue;

            // Check if face center is in simplified island
            let avgU = 0, avgV = 0;
            for (const uvIdx of face.uvIndices) {
                const uv = this.uvExtractor.uvs[uvIdx];
                if (uv) {
                    avgU += uv.u;
                    avgV += uv.v;
                }
            }
            avgU /= face.uvIndices.length;
            avgV /= face.uvIndices.length;

            const x = Math.floor(avgU * this.canvas.width);
            const y = Math.floor(avgV * this.canvas.height);

            // Check if point is in simplified island
            for (const [px, py] of simplifiedIsland.pixels) {
                if (Math.abs(px - x) < 2 && Math.abs(py - y) < 2) {
                    faces.push(i);
                    break;
                }
            }
        }

        return {
            faces: faces,
            uvIndices: new Set(),
            simplified: true
        };
    }

    selectUVIsland(faceIndex) {
        if (!this.uvExtractor) return null;

        const island = this.uvExtractor.getIslandContainingFace(faceIndex);
        if (island) {
            this.highlightUVFaces(island.faces, '#00ff00', 0.4);

            // Create mask from island
            const maskCanvas = this.uvExtractor.createUVMask(
                island.faces,
                this.canvas.width,
                this.canvas.height
            );

            // Apply as active mask
            this.applyUVSelectionAsMask(maskCanvas);

            return island;
        }
        return null;
    }

    applyUVSelectionAsMask(maskCanvas) {
        // Convert mask canvas to ImageData for masking system
        const ctx = maskCanvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        
        // Create a temporary mask in the masking system
        this.maskingSystem.masks.set('uv_selection', {
            imageData: imageData,
            canvas: maskCanvas,
            colors: []
        });

        // Select it
        this.maskingSystem.activeMask = {
            name: 'uv_selection',
            colorKey: '255,255,255',
            imageData: imageData,
            canvas: maskCanvas,
            colors: []
        };

        // Create binary mask
        const data = imageData.data;
        const binaryData = new Uint8ClampedArray(data.length);
        
        for (let i = 0; i < data.length; i += 4) {
            const value = data[i] > 128 ? 255 : 0;
            binaryData[i] = value;
            binaryData[i + 1] = value;
            binaryData[i + 2] = value;
            binaryData[i + 3] = 255;
        }
        
        this.maskingSystem.activeMask.binaryMask = binaryData;
    }

    toggleFullscreen() {
        const canvasContainer = document.querySelector('.canvas-container');
        const uvPanel = document.querySelector('.uv-editor-panel');
        
        if (!this.isFullscreen) {
            // Enter fullscreen
            uvPanel.classList.add('fullscreen');
            canvasContainer.classList.add('fullscreen');
            this.isFullscreen = true;
        } else {
            // Exit fullscreen
            uvPanel.classList.remove('fullscreen');
            canvasContainer.classList.remove('fullscreen');
            this.isFullscreen = false;
        }
        
        // Trigger canvas re-render
        this.canvas.renderAll();
    }
}



