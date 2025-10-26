// UV Simplifier - Morphological operations and boundary detection
export class UVSimplifier {
    constructor(width, height) {
        this.width = width;
        this.height = height;
    }

    // Dilation: expand white regions
    dilate(imageData, radius = 1) {
        const data = imageData.data;
        const result = new Uint8ClampedArray(data);

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const idx = (y * this.width + x) * 4;
                
                // If current pixel is black, check neighbors
                if (data[idx] < 128) {
                    let foundWhite = false;
                    
                    // Check neighbors within radius
                    for (let dy = -radius; dy <= radius; dy++) {
                        for (let dx = -radius; dx <= radius; dx++) {
                            const nx = x + dx;
                            const ny = y + dy;
                            
                            if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                                const nidx = (ny * this.width + nx) * 4;
                                if (data[nidx] > 128) {
                                    foundWhite = true;
                                    break;
                                }
                            }
                        }
                        if (foundWhite) break;
                    }
                    
                    if (foundWhite) {
                        result[idx] = 255;
                        result[idx + 1] = 255;
                        result[idx + 2] = 255;
                    }
                }
            }
        }

        const resultImageData = new ImageData(result, this.width, this.height);
        return resultImageData;
    }

    // Erosion: shrink white regions
    erode(imageData, radius = 1) {
        const data = imageData.data;
        const result = new Uint8ClampedArray(data);

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const idx = (y * this.width + x) * 4;
                
                // If current pixel is white, check if all neighbors are white
                if (data[idx] > 128) {
                    let allWhite = true;
                    
                    for (let dy = -radius; dy <= radius; dy++) {
                        for (let dx = -radius; dx <= radius; dx++) {
                            const nx = x + dx;
                            const ny = y + dy;
                            
                            if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                                const nidx = (ny * this.width + nx) * 4;
                                if (data[nidx] < 128) {
                                    allWhite = false;
                                    break;
                                }
                            }
                        }
                        if (!allWhite) break;
                    }
                    
                    if (!allWhite) {
                        result[idx] = 0;
                        result[idx + 1] = 0;
                        result[idx + 2] = 0;
                    }
                }
            }
        }

        const resultImageData = new ImageData(result, this.width, this.height);
        return resultImageData;
    }

    // Closing: dilation followed by erosion (fills small holes)
    closing(imageData, radius = 1) {
        let result = this.dilate(imageData, radius);
        result = this.erode(result, radius);
        return result;
    }

    // Extract outline only
    extractOutline(imageData) {
        const data = imageData.data;
        const result = new Uint8ClampedArray(data.length);

        for (let y = 1; y < this.height - 1; y++) {
            for (let x = 1; x < this.width - 1; x++) {
                const idx = (y * this.width + x) * 4;
                
                if (data[idx] > 128) {
                    // Check if this white pixel is on the boundary
                    let isBoundary = false;
                    
                    // Check 4-neighbors
                    const neighbors = [
                        (y * this.width + (x - 1)) * 4,  // left
                        (y * this.width + (x + 1)) * 4,  // right
                        ((y - 1) * this.width + x) * 4,  // top
                        ((y + 1) * this.width + x) * 4   // bottom
                    ];
                    
                    for (const nidx of neighbors) {
                        if (data[nidx] < 128) {
                            isBoundary = true;
                            break;
                        }
                    }
                    
                    if (isBoundary) {
                        result[idx] = 255;
                        result[idx + 1] = 255;
                        result[idx + 2] = 255;
                        result[idx + 3] = 255;
                    }
                }
            }
        }

        return new ImageData(result, this.width, this.height);
    }
}
