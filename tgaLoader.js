// TGA File Decoder for JavaScript
// Supports uncompressed and RLE compressed TGA files

export class TGALoader {
    constructor() {
        this.header = null;
        this.imageData = null;
    }

    load(buffer) {
        const data = new Uint8Array(buffer);
        let offset = 0;

        // Read TGA Header (18 bytes)
        this.header = {
            idLength: data[offset++],
            colorMapType: data[offset++],
            imageType: data[offset++],
            colorMapIndex: data[offset++] | (data[offset++] << 8),
            colorMapLength: data[offset++] | (data[offset++] << 8),
            colorMapDepth: data[offset++],
            xOrigin: data[offset++] | (data[offset++] << 8),
            yOrigin: data[offset++] | (data[offset++] << 8),
            width: data[offset++] | (data[offset++] << 8),
            height: data[offset++] | (data[offset++] << 8),
            pixelDepth: data[offset++],
            flags: data[offset++]
        };

        // Skip image ID if present
        offset += this.header.idLength;

        // Skip color map if present
        if (this.header.colorMapType === 1) {
            offset += this.header.colorMapLength * Math.ceil(this.header.colorMapDepth / 8);
        }

        const width = this.header.width;
        const height = this.header.height;
        const pixelDepth = this.header.pixelDepth;
        const imageType = this.header.imageType;

        // Create output image data
        const imageSize = width * height * 4; // RGBA
        this.imageData = new Uint8ClampedArray(imageSize);

        // Decode based on image type
        if (imageType === 2) {
            // Uncompressed RGB/RGBA
            this.decodeUncompressed(data, offset, width, height, pixelDepth);
        } else if (imageType === 10) {
            // RLE compressed RGB/RGBA
            this.decodeRLE(data, offset, width, height, pixelDepth);
        } else if (imageType === 3) {
            // Uncompressed grayscale
            this.decodeGrayscale(data, offset, width, height);
        } else {
            throw new Error(`Unsupported TGA image type: ${imageType}`);
        }

        // Flip vertically if needed (TGA can be stored bottom-up or top-down)
        const flipVertical = (this.header.flags & 0x20) === 0;
        if (flipVertical) {
            this.flipImageVertically(width, height);
        }

        return this.getImageData();
    }

    decodeUncompressed(data, offset, width, height, pixelDepth) {
        const bytesPerPixel = pixelDepth / 8;
        const pixelCount = width * height;

        for (let i = 0; i < pixelCount; i++) {
            const idx = i * 4;
            
            if (bytesPerPixel === 4) {
                // BGRA
                this.imageData[idx + 2] = data[offset++]; // B -> R
                this.imageData[idx + 1] = data[offset++]; // G -> G
                this.imageData[idx + 0] = data[offset++]; // R -> B
                this.imageData[idx + 3] = data[offset++]; // A -> A
            } else if (bytesPerPixel === 3) {
                // BGR
                this.imageData[idx + 2] = data[offset++]; // B -> R
                this.imageData[idx + 1] = data[offset++]; // G -> G
                this.imageData[idx + 0] = data[offset++]; // R -> B
                this.imageData[idx + 3] = 255; // A
            } else if (bytesPerPixel === 2) {
                // 16-bit (BGR5A1)
                const pixel = data[offset++] | (data[offset++] << 8);
                this.imageData[idx + 0] = ((pixel >> 10) & 0x1F) << 3;
                this.imageData[idx + 1] = ((pixel >> 5) & 0x1F) << 3;
                this.imageData[idx + 2] = (pixel & 0x1F) << 3;
                this.imageData[idx + 3] = (pixel & 0x8000) ? 255 : 0;
            }
        }
    }

    decodeRLE(data, offset, width, height, pixelDepth) {
        const bytesPerPixel = pixelDepth / 8;
        const pixelCount = width * height;
        let pixelIndex = 0;

        while (pixelIndex < pixelCount && offset < data.length) {
            const packet = data[offset++];
            const isRLE = (packet & 0x80) !== 0;
            const count = (packet & 0x7F) + 1;

            if (isRLE) {
                // RLE packet - repeat next pixel
                let r, g, b, a;
                
                if (bytesPerPixel === 4) {
                    b = data[offset++];
                    g = data[offset++];
                    r = data[offset++];
                    a = data[offset++];
                } else if (bytesPerPixel === 3) {
                    b = data[offset++];
                    g = data[offset++];
                    r = data[offset++];
                    a = 255;
                } else if (bytesPerPixel === 2) {
                    const pixel = data[offset++] | (data[offset++] << 8);
                    r = ((pixel >> 10) & 0x1F) << 3;
                    g = ((pixel >> 5) & 0x1F) << 3;
                    b = (pixel & 0x1F) << 3;
                    a = (pixel & 0x8000) ? 255 : 0;
                }

                for (let i = 0; i < count; i++) {
                    const idx = pixelIndex * 4;
                    this.imageData[idx + 0] = r;
                    this.imageData[idx + 1] = g;
                    this.imageData[idx + 2] = b;
                    this.imageData[idx + 3] = a;
                    pixelIndex++;
                }
            } else {
                // Raw packet - read pixels directly
                for (let i = 0; i < count; i++) {
                    const idx = pixelIndex * 4;
                    
                    if (bytesPerPixel === 4) {
                        this.imageData[idx + 2] = data[offset++];
                        this.imageData[idx + 1] = data[offset++];
                        this.imageData[idx + 0] = data[offset++];
                        this.imageData[idx + 3] = data[offset++];
                    } else if (bytesPerPixel === 3) {
                        this.imageData[idx + 2] = data[offset++];
                        this.imageData[idx + 1] = data[offset++];
                        this.imageData[idx + 0] = data[offset++];
                        this.imageData[idx + 3] = 255;
                    } else if (bytesPerPixel === 2) {
                        const pixel = data[offset++] | (data[offset++] << 8);
                        this.imageData[idx + 0] = ((pixel >> 10) & 0x1F) << 3;
                        this.imageData[idx + 1] = ((pixel >> 5) & 0x1F) << 3;
                        this.imageData[idx + 2] = (pixel & 0x1F) << 3;
                        this.imageData[idx + 3] = (pixel & 0x8000) ? 255 : 0;
                    }
                    pixelIndex++;
                }
            }
        }
    }

    decodeGrayscale(data, offset, width, height) {
        const pixelCount = width * height;
        
        for (let i = 0; i < pixelCount; i++) {
            const gray = data[offset++];
            const idx = i * 4;
            this.imageData[idx + 0] = gray;
            this.imageData[idx + 1] = gray;
            this.imageData[idx + 2] = gray;
            this.imageData[idx + 3] = 255;
        }
    }

    flipImageVertically(width, height) {
        const rowBytes = width * 4;
        const tempRow = new Uint8ClampedArray(rowBytes);
        
        for (let y = 0; y < height / 2; y++) {
            const topOffset = y * rowBytes;
            const bottomOffset = (height - y - 1) * rowBytes;
            
            // Swap rows
            tempRow.set(this.imageData.subarray(topOffset, topOffset + rowBytes));
            this.imageData.copyWithin(topOffset, bottomOffset, bottomOffset + rowBytes);
            this.imageData.set(tempRow, bottomOffset);
        }
    }

    getImageData() {
        return {
            width: this.header.width,
            height: this.header.height,
            data: this.imageData
        };
    }

    static async loadFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const loader = new TGALoader();
                    const imageData = loader.load(e.target.result);
                    resolve(imageData);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    static createCanvas(imageData) {
        const canvas = document.createElement('canvas');
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        const ctx = canvas.getContext('2d');
        const imgData = ctx.createImageData(imageData.width, imageData.height);
        imgData.data.set(imageData.data);
        ctx.putImageData(imgData, 0, 0);
        return canvas;
    }
}

