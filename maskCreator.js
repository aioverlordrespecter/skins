// Mask Creator - 2D Drawing Tools for Creating Component Masks
// Simple 2D workflow: Load UV sheet → Draw masks → Save masks

export class MaskCreator {
    constructor(fabricCanvas) {
        this.canvas = fabricCanvas;
        this.isDrawing = false;
        this.drawingMode = 'brush'; // 'brush', 'rectangle', 'lasso', 'magic'
        this.brushSize = 20;
        this.currentMask = null;
        this.maskCanvas = null;
        this.maskColor = { r: 255, g: 0, b: 0 }; // Red for first mask
        this.savedMasks = [];

        this.initMaskCanvas();
    }

    initMaskCanvas() {
        // Create offscreen canvas for mask drawing
        this.maskCanvas = document.createElement('canvas');
        this.maskCanvas.width = this.canvas.width;
        this.maskCanvas.height = this.canvas.height;
        this.maskCtx = this.maskCanvas.getContext('2d');
        this.clearMask();
    }

    clearMask() {
        // Clear to black (no mask)
        this.maskCtx.fillStyle = '#000000';
        this.maskCtx.fillRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
    }

    enableDrawingMode(mode = 'brush') {
        this.drawingMode = mode;
        this.canvas.isDrawingMode = (mode === 'brush');

        if (mode === 'brush') {
            this.canvas.freeDrawingBrush.color = this.rgbToHex(this.maskColor);
            this.canvas.freeDrawingBrush.width = this.brushSize;
        }
    }

    disableDrawingMode() {
        this.canvas.isDrawingMode = false;
    }

    rgbToHex(color) {
        return '#' + [color.r, color.g, color.b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }

    // Draw brush stroke on mask canvas
    addBrushStroke(path) {
        this.maskCtx.strokeStyle = this.rgbToHex(this.maskColor);
        this.maskCtx.lineWidth = this.brushSize;
        this.maskCtx.lineCap = 'round';
        this.maskCtx.lineJoin = 'round';

        // Convert fabric path to canvas drawing
        const pathData = path.path;
        this.maskCtx.beginPath();

        for (let i = 0; i < pathData.length; i++) {
            const cmd = pathData[i];
            switch (cmd[0]) {
                case 'M':
                    this.maskCtx.moveTo(cmd[1], cmd[2]);
                    break;
                case 'L':
                    this.maskCtx.lineTo(cmd[1], cmd[2]);
                    break;
                case 'Q':
                    this.maskCtx.quadraticCurveTo(cmd[1], cmd[2], cmd[3], cmd[4]);
                    break;
            }
        }

        this.maskCtx.stroke();
    }

    // Rectangle selection tool
    addRectangle(x, y, width, height) {
        this.maskCtx.fillStyle = this.rgbToHex(this.maskColor);
        this.maskCtx.fillRect(x, y, width, height);
    }

    // Lasso/polygon selection tool
    addPolygon(points) {
        this.maskCtx.fillStyle = this.rgbToHex(this.maskColor);
        this.maskCtx.beginPath();

        points.forEach((point, i) => {
            if (i === 0) {
                this.maskCtx.moveTo(point.x, point.y);
            } else {
                this.maskCtx.lineTo(point.x, point.y);
            }
        });

        this.maskCtx.closePath();
        this.maskCtx.fill();
    }

    // Magic wand - select similar colors (simple flood fill)
    magicWand(startX, startY, tolerance = 30, uvImageData) {
        const width = this.maskCanvas.width;
        const height = this.maskCanvas.height;

        // Get target color from UV image
        const targetIdx = (startY * width + startX) * 4;
        const targetR = uvImageData.data[targetIdx];
        const targetG = uvImageData.data[targetIdx + 1];
        const targetB = uvImageData.data[targetIdx + 2];

        // Flood fill similar colors
        const visited = new Uint8Array(width * height);
        const stack = [[startX, startY]];
        const fillPixels = [];

        while (stack.length > 0) {
            const [x, y] = stack.pop();

            if (x < 0 || x >= width || y < 0 || y >= height) continue;

            const idx = y * width + x;
            if (visited[idx]) continue;

            const pixelIdx = idx * 4;
            const r = uvImageData.data[pixelIdx];
            const g = uvImageData.data[pixelIdx + 1];
            const b = uvImageData.data[pixelIdx + 2];

            // Check if color is similar
            const diff = Math.abs(r - targetR) + Math.abs(g - targetG) + Math.abs(b - targetB);
            if (diff > tolerance) continue;

            visited[idx] = 1;
            fillPixels.push([x, y]);

            // Add neighbors
            stack.push([x + 1, y]);
            stack.push([x - 1, y]);
            stack.push([x, y + 1]);
            stack.push([x, y - 1]);
        }

        // Draw filled pixels
        this.maskCtx.fillStyle = this.rgbToHex(this.maskColor);
        for (const [x, y] of fillPixels) {
            this.maskCtx.fillRect(x, y, 1, 1);
        }

        return fillPixels.length;
    }

    // Eraser tool
    erase(x, y, size) {
        this.maskCtx.globalCompositeOperation = 'destination-out';
        this.maskCtx.beginPath();
        this.maskCtx.arc(x, y, size / 2, 0, Math.PI * 2);
        this.maskCtx.fill();
        this.maskCtx.globalCompositeOperation = 'source-over';
    }

    // Get mask as overlay image for preview
    getMaskOverlay(opacity = 0.5) {
        const overlayCanvas = document.createElement('canvas');
        overlayCanvas.width = this.maskCanvas.width;
        overlayCanvas.height = this.maskCanvas.height;
        const ctx = overlayCanvas.getContext('2d');

        // Draw mask with semi-transparency
        ctx.globalAlpha = opacity;
        ctx.drawImage(this.maskCanvas, 0, 0);

        return overlayCanvas;
    }

    // Export mask as image file
    exportMask(name = 'mask') {
        return this.maskCanvas.toDataURL('image/png');
    }

    // Save current mask to collection
    saveMask(name) {
        const maskData = this.maskCtx.getImageData(0, 0, this.maskCanvas.width, this.maskCanvas.height);
        this.savedMasks.push({
            name: name,
            color: { ...this.maskColor },
            imageData: maskData,
            dataURL: this.maskCanvas.toDataURL('image/png')
        });

        console.log(`Saved mask: ${name} (${this.savedMasks.length} total masks)`);
        return this.savedMasks.length - 1;
    }

    // Load mask from saved collection
    loadMask(index) {
        if (index < 0 || index >= this.savedMasks.length) return false;

        const mask = this.savedMasks[index];
        this.maskCtx.putImageData(mask.imageData, 0, 0);
        this.maskColor = { ...mask.color };

        return true;
    }

    // Create new mask (new color)
    newMask(color) {
        this.clearMask();
        this.maskColor = color;
    }

    // Combine all saved masks into one image (for export)
    exportCombinedMasks() {
        const combinedCanvas = document.createElement('canvas');
        combinedCanvas.width = this.maskCanvas.width;
        combinedCanvas.height = this.maskCanvas.height;
        const ctx = combinedCanvas.getContext('2d');

        // Black background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height);

        // Draw each mask with its color
        for (const mask of this.savedMasks) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = this.maskCanvas.width;
            tempCanvas.height = this.maskCanvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.putImageData(mask.imageData, 0, 0);

            ctx.drawImage(tempCanvas, 0, 0);
        }

        return combinedCanvas.toDataURL('image/png');
    }

    // Get suggested next mask color (for easy multi-mask creation)
    getNextMaskColor() {
        const colors = [
            { r: 255, g: 0, b: 0, name: 'Red - Body' },
            { r: 0, g: 255, b: 0, name: 'Green - Magazine' },
            { r: 0, g: 0, b: 255, name: 'Blue - Handle' },
            { r: 255, g: 255, b: 0, name: 'Yellow - Barrel' },
            { r: 255, g: 0, b: 255, name: 'Magenta - Stock' },
            { r: 0, g: 255, b: 255, name: 'Cyan - Trigger' },
            { r: 255, g: 128, b: 0, name: 'Orange - Sights' },
            { r: 128, g: 0, b: 255, name: 'Purple - Accents' }
        ];

        const index = this.savedMasks.length % colors.length;
        return colors[index];
    }

    // Auto-detect components using edge detection and flood fill
    autoDetectComponents(uvImageData, minSize = 1000) {
        const width = this.maskCanvas.width;
        const height = this.maskCanvas.height;

        // Simple edge detection (Sobel-like)
        const edges = new Uint8Array(width * height);

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;

                // Get current pixel
                const r = uvImageData.data[idx];
                const g = uvImageData.data[idx + 1];
                const b = uvImageData.data[idx + 2];

                // Get neighbors
                const rightIdx = (y * width + (x + 1)) * 4;
                const downIdx = ((y + 1) * width + x) * 4;

                const rDiff = Math.abs(r - uvImageData.data[rightIdx]);
                const gDiff = Math.abs(g - uvImageData.data[rightIdx + 1]);
                const bDiff = Math.abs(b - uvImageData.data[rightIdx + 2]);

                const rDiff2 = Math.abs(r - uvImageData.data[downIdx]);
                const gDiff2 = Math.abs(g - uvImageData.data[downIdx + 1]);
                const bDiff2 = Math.abs(b - uvImageData.data[downIdx + 2]);

                const totalDiff = rDiff + gDiff + bDiff + rDiff2 + gDiff2 + bDiff2;

                if (totalDiff > 100) {
                    edges[y * width + x] = 1;
                }
            }
        }

        // Find connected components
        const visited = new Uint8Array(width * height);
        const components = [];

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                if (visited[idx] || edges[idx]) continue;

                // Flood fill to find component
                const component = this.floodFillComponent(x, y, edges, visited, width, height);

                if (component.length > minSize) {
                    components.push(component);
                }
            }
        }

        return components;
    }

    floodFillComponent(startX, startY, edges, visited, width, height) {
        const stack = [[startX, startY]];
        const component = [];

        while (stack.length > 0) {
            const [x, y] = stack.pop();

            if (x < 0 || x >= width || y < 0 || y >= height) continue;

            const idx = y * width + x;
            if (visited[idx] || edges[idx]) continue;

            visited[idx] = 1;
            component.push([x, y]);

            stack.push([x + 1, y]);
            stack.push([x - 1, y]);
            stack.push([x, y + 1]);
            stack.push([x, y - 1]);
        }

        return component;
    }
}
