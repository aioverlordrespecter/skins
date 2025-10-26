// Masking System for Component-Based Image Placement
// Allows constraining images to specific regions of the UV map

export class MaskingSystem {
    constructor(canvasWidth, canvasHeight) {
        this.width = canvasWidth;
        this.height = canvasHeight;
        this.masks = new Map(); // Store multiple masks by name
        this.activeMask = null;
        this.maskCanvas = null;
        this.maskContext = null;
        
        this.initMaskCanvas();
    }

    initMaskCanvas() {
        this.maskCanvas = document.createElement('canvas');
        this.maskCanvas.width = this.width;
        this.maskCanvas.height = this.height;
        this.maskContext = this.maskCanvas.getContext('2d');
    }

    // Load a mask image where different colors represent different components
    async loadMaskImage(file, componentName = 'default') {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    // Draw mask to canvas and extract pixel data
                    const canvas = document.createElement('canvas');
                    canvas.width = this.width;
                    canvas.height = this.height;
                    const ctx = canvas.getContext('2d');
                    
                    // Scale mask to fit UV canvas
                    ctx.drawImage(img, 0, 0, this.width, this.height);
                    const imageData = ctx.getImageData(0, 0, this.width, this.height);
                    
                    this.masks.set(componentName, {
                        imageData: imageData,
                        canvas: canvas,
                        colors: this.extractUniqueColors(imageData)
                    });
                    
                    resolve(this.masks.get(componentName).colors);
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // Extract unique colors from mask (each color represents a component)
    extractUniqueColors(imageData) {
        const colors = new Map();
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            
            // Skip transparent pixels
            if (a < 128) continue;
            
            const colorKey = `${r},${g},${b}`;
            if (!colors.has(colorKey)) {
                colors.set(colorKey, {
                    r, g, b,
                    name: this.generateColorName(r, g, b),
                    pixelCount: 0
                });
            }
            colors.get(colorKey).pixelCount++;
        }
        
        return Array.from(colors.values()).sort((a, b) => b.pixelCount - a.pixelCount);
    }

    generateColorName(r, g, b) {
        // Generate a descriptive name based on color
        if (r > 200 && g < 100 && b < 100) return 'Body/Main';
        if (g > 200 && r < 100 && b < 100) return 'Magazine';
        if (b > 200 && r < 100 && g < 100) return 'Barrel';
        if (r > 200 && g > 200 && b < 100) return 'Stock';
        if (r > 200 && b > 200 && g < 100) return 'Grip';
        if (r < 100 && g < 100 && b < 100) return 'Receiver';
        if (r > 200 && g > 200 && b > 200) return 'Accents';
        return `Component (${r},${g},${b})`;
    }

    // Select which component to work on
    selectComponent(maskName, colorKey) {
        const mask = this.masks.get(maskName);
        if (!mask) return false;
        
        this.activeMask = {
            name: maskName,
            colorKey: colorKey,
            ...mask
        };
        
        // Create a binary mask for the selected component
        this.createBinaryMask(colorKey);
        return true;
    }

    createBinaryMask(colorKey) {
        const [r, g, b] = colorKey.split(',').map(Number);
        const data = this.activeMask.imageData.data;
        const binaryData = new Uint8ClampedArray(data.length);
        
        // Create binary mask (255 = inside component, 0 = outside)
        for (let i = 0; i < data.length; i += 4) {
            const matches = (
                data[i] === r &&
                data[i + 1] === g &&
                data[i + 2] === b &&
                data[i + 3] > 128
            );
            
            const value = matches ? 255 : 0;
            binaryData[i] = value;
            binaryData[i + 1] = value;
            binaryData[i + 2] = value;
            binaryData[i + 3] = 255;
        }
        
        this.maskContext.clearRect(0, 0, this.width, this.height);
        const imgData = this.maskContext.createImageData(this.width, this.height);
        imgData.data.set(binaryData);
        this.maskContext.putImageData(imgData, 0, 0);
        
        this.activeMask.binaryMask = binaryData;
    }

    // Check if a point is within the active mask
    isPointInMask(x, y) {
        if (!this.activeMask || !this.activeMask.binaryMask) return true;
        
        const px = Math.floor(x);
        const py = Math.floor(y);
        
        if (px < 0 || px >= this.width || py < 0 || py >= this.height) return false;
        
        const idx = (py * this.width + px) * 4;
        return this.activeMask.binaryMask[idx] > 128;
    }

    // Apply mask to an image (clip image to mask boundaries)
    applyMaskToImage(imageCanvas) {
        if (!this.activeMask || !this.activeMask.binaryMask) return imageCanvas;
        
        const canvas = document.createElement('canvas');
        canvas.width = imageCanvas.width;
        canvas.height = imageCanvas.height;
        const ctx = canvas.getContext('2d');
        
        // Draw original image
        ctx.drawImage(imageCanvas, 0, 0);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Scale mask to image size if needed
        const scaleX = this.width / canvas.width;
        const scaleY = this.height / canvas.height;
        
        // Apply mask (make pixels transparent if outside mask)
        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                const maskX = Math.floor(x * scaleX);
                const maskY = Math.floor(y * scaleY);
                
                if (!this.isPointInMask(maskX, maskY)) {
                    const idx = (y * canvas.width + x) * 4;
                    data[idx + 3] = 0; // Make transparent
                }
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }

    // Get visual representation of active mask
    getMaskVisualization(opacity = 0.3) {
        if (!this.activeMask) return null;
        
        const canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        const ctx = canvas.getContext('2d');
        
        const imageData = ctx.createImageData(this.width, this.height);
        const data = imageData.data;
        const mask = this.activeMask.binaryMask;
        
        // Create colored overlay
        const [r, g, b] = this.activeMask.colorKey.split(',').map(Number);
        
        for (let i = 0; i < mask.length; i += 4) {
            if (mask[i] > 128) {
                data[i] = r;
                data[i + 1] = g;
                data[i + 2] = b;
                data[i + 3] = Math.floor(opacity * 255);
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }

    getActiveMask() {
        return this.activeMask;
    }

    clearActiveMask() {
        this.activeMask = null;
    }

    getAllMasks() {
        return Array.from(this.masks.keys());
    }

    getMaskComponents(maskName) {
        const mask = this.masks.get(maskName);
        return mask ? mask.colors : [];
    }
}

