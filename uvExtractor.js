// UV Extractor - Parse UV coordinates from OBJ files
export class UVExtractor {
    constructor() {
        this.vertices = [];
        this.uvs = [];
        this.faces = [];
        this.uvIslands = [];
    }

    parseOBJ(objText) {
        this.vertices = [];
        this.uvs = [];
        this.faces = [];

        const lines = objText.split('\n');
        const totalLines = lines.length;

        // Warn if file is extremely large
        if (totalLines > 500000) {
            console.warn(`Large OBJ file detected (${totalLines} lines). Performance may be affected.`);
        }

        let lineCount = 0;

        for (let line of lines) {
            line = line.trim();
            if (!line || line.startsWith('#')) continue;

            // Performance optimization: use indexOf instead of startsWith for better speed
            const firstChar = line[0];
            const secondChar = line[1];

            // Quick checks for common line types
            if (firstChar === 'v') {
                if (secondChar === ' ') {
                    // Vertex position - v
                    const parts = line.split(/\s+/);
                    this.vertices.push({
                        x: parseFloat(parts[1]),
                        y: parseFloat(parts[2]),
                        z: parseFloat(parts[3])
                    });
                    continue;
                } else if (secondChar === 't') {
                    // UV coordinate - vt
                    const parts = line.split(/\s+/);
                    this.uvs.push({
                        u: parseFloat(parts[1]),
                        v: 1.0 - parseFloat(parts[2]) // Flip V coordinate
                    });
                    continue;
                } else if (secondChar === 'n') {
                    // Normal - skip for performance
                    continue;
                }
            } else if (firstChar === 'f' && secondChar === ' ') {
                // Face
                this.parseFace(line);
                continue;
            }

            // Progress logging for large files
            lineCount++;
            if (lineCount % 100000 === 0) {
                console.log(`Parsing progress: ${Math.floor(lineCount / totalLines * 100)}%`);
            }
        }

        console.log(`Parsed OBJ: ${this.vertices.length} vertices, ${this.uvs.length} UVs, ${this.faces.length} faces`);
        return this.faces.length > 0;
    }

    parseFace(line) {
        const parts = line.split(/\s+/);
        const face = {
            vertices: [],
            uvIndices: [],
            normalIndices: []
        };

        for (let i = 1; i < parts.length; i++) {
            const indices = parts[i].split('/');
            face.vertices.push(parseInt(indices[0]) - 1); // OBJ is 1-indexed

            if (indices.length > 1 && indices[1]) {
                face.uvIndices.push(parseInt(indices[1]) - 1);
            }

            if (indices.length > 2 && indices[2]) {
                face.normalIndices.push(parseInt(indices[2]) - 1);
            }
        }

        // Triangulate if face has more than 3 vertices
        if (face.vertices.length === 3) {
            this.faces.push(face);
        } else if (face.vertices.length > 3) {
            // Simple fan triangulation
            for (let i = 1; i < face.vertices.length - 1; i++) {
                this.faces.push({
                    vertices: [face.vertices[0], face.vertices[i], face.vertices[i + 1]],
                    uvIndices: face.uvIndices.length > 0 ?
                        [face.uvIndices[0], face.uvIndices[i], face.uvIndices[i + 1]] : [],
                    normalIndices: face.normalIndices.length > 0 ?
                        [face.normalIndices[0], face.normalIndices[i], face.normalIndices[i + 1]] : []
                });
            }
        }
    }


    generateUVMap(width = 1024, height = 1024, lineColor = '#00ffff', backgroundColor = '#1a1a1a') {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);

        // Draw UV wireframe
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1;

        for (const face of this.faces) {
            if (face.uvIndices.length < 3) continue;

            ctx.beginPath();
            for (let i = 0; i < face.uvIndices.length; i++) {
                const uvIndex = face.uvIndices[i];
                const uv = this.uvs[uvIndex];
                
                if (!uv) continue;

                const x = uv.u * width;
                const y = uv.v * height;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();
            ctx.stroke();
        }

        return canvas;
    }

    generateSimpleUVMap(width = 1024, height = 1024, lineColor = '#00ffff', backgroundColor = 'transparent') {
        // Ultra-lightweight version - draw only a sample of edges
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.2;

        // Calculate skip factor to limit total edges drawn
        const maxEdges = 2000; // Reduced from 5000 for better performance
        const skipFactor = Math.max(1, Math.floor(this.faces.length / maxEdges));

        console.log(`Drawing UV map with skip factor ${skipFactor} (${this.faces.length} total faces)`);

        // Use a single path for all edges to improve performance
        ctx.beginPath();
        let edgeCount = 0;

        for (let i = 0; i < this.faces.length && edgeCount < maxEdges; i += skipFactor) {
            const face = this.faces[i];
            if (face.uvIndices.length < 3) continue;

            // Draw triangle edges
            for (let j = 0; j < face.uvIndices.length; j++) {
                const uvIndex = face.uvIndices[j];
                const uv = this.uvs[uvIndex];

                if (!uv) continue;

                const x = uv.u * width;
                const y = uv.v * height;

                if (j === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            // Close the triangle
            const firstUv = this.uvs[face.uvIndices[0]];
            if (firstUv) {
                ctx.lineTo(firstUv.u * width, firstUv.v * height);
            }

            edgeCount++;
        }

        ctx.stroke();
        return canvas;
    }

    generateUVMapOutlines(width = 1024, height = 1024, lineColor = '#00ffff', backgroundColor = 'transparent') {
        const startTime = performance.now();
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);

        console.log(`Building edge map for ${this.faces.length} faces...`);

        // Build edge usage map - track how many faces use each edge
        // Use a more efficient data structure
        const edgeUsage = new Map();
        const maxFacesToProcess = Math.min(this.faces.length, 50000); // Limit processing for huge models

        for (let i = 0; i < maxFacesToProcess; i++) {
            const face = this.faces[i];
            if (face.uvIndices.length < 3) continue;

            for (let j = 0; j < face.uvIndices.length; j++) {
                const uv1 = face.uvIndices[j];
                const uv2 = face.uvIndices[(j + 1) % face.uvIndices.length];

                // Create edge key (order independent) - use simpler key
                const edgeKey = uv1 < uv2 ? `${uv1}-${uv2}` : `${uv2}-${uv1}`;

                if (!edgeUsage.has(edgeKey)) {
                    edgeUsage.set(edgeKey, { count: 0, uv1, uv2 });
                }
                edgeUsage.get(edgeKey).count++;
            }

            // Progress feedback for large models
            if (i % 10000 === 0 && i > 0) {
                console.log(`Edge detection: ${Math.floor(i / maxFacesToProcess * 100)}%`);
            }
        }

        if (this.faces.length > maxFacesToProcess) {
            console.warn(`Only processed ${maxFacesToProcess} faces for outline generation (out of ${this.faces.length})`);
        }

        console.log(`Found ${edgeUsage.size} unique edges, drawing outlines...`);

        // Draw only boundary edges (used by exactly 1 face)
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Batch all boundary edges into a single path for better performance
        ctx.beginPath();
        let boundaryCount = 0;

        for (const [edgeKey, data] of edgeUsage) {
            if (data.count === 1) { // Boundary edge
                const uv1 = this.uvs[data.uv1];
                const uv2 = this.uvs[data.uv2];

                if (!uv1 || !uv2) continue;

                ctx.moveTo(uv1.u * width, uv1.v * height);
                ctx.lineTo(uv2.u * width, uv2.v * height);
                boundaryCount++;
            }
        }

        ctx.stroke();

        const endTime = performance.now();
        console.log(`Drew ${boundaryCount} boundary edges in ${(endTime - startTime).toFixed(0)}ms`);

        return canvas;
    }

    detectUVIslands() {
        // Optimized version for large models
        const startTime = performance.now();

        // For extremely large models, limit processing to prevent hangs
        const maxFacesToProcess = Math.min(this.faces.length, 100000);
        const shouldLimitProcessing = this.faces.length > maxFacesToProcess;

        if (shouldLimitProcessing) {
            console.warn(`Large model detected: Processing only first ${maxFacesToProcess} faces for island detection`);
        }

        // Build face-to-face adjacency using UV edge sharing
        const faceAdjacency = new Map();
        const uvEdgeToFaces = new Map();
        
        // Build edge map (much faster than checking all face pairs)
        for (let faceIndex = 0; faceIndex < maxFacesToProcess; faceIndex++) {
            const face = this.faces[faceIndex];
            if (!face || face.uvIndices.length < 3) continue;

            faceAdjacency.set(faceIndex, new Set());
            
            // For each edge in the face
            for (let i = 0; i < face.uvIndices.length; i++) {
                const uv1 = face.uvIndices[i];
                const uv2 = face.uvIndices[(i + 1) % face.uvIndices.length];
                
                // Create edge key (order independent)
                const edgeKey = uv1 < uv2 ? `${uv1}-${uv2}` : `${uv2}-${uv1}`;
                
                if (!uvEdgeToFaces.has(edgeKey)) {
                    uvEdgeToFaces.set(edgeKey, []);
                }
                uvEdgeToFaces.get(edgeKey).push(faceIndex);
            }
        }
        
        // Build adjacency from shared edges
        for (const [edgeKey, faces] of uvEdgeToFaces) {
            if (faces.length >= 2) {
                // These faces share an edge
                for (let i = 0; i < faces.length; i++) {
                    for (let j = i + 1; j < faces.length; j++) {
                        faceAdjacency.get(faces[i]).add(faces[j]);
                        faceAdjacency.get(faces[j]).add(faces[i]);
                    }
                }
            }
        }

        // Find connected components using BFS (much faster than checking all pairs)
        const visited = new Set();
        this.uvIslands = [];

        for (let startFaceIdx = 0; startFaceIdx < maxFacesToProcess; startFaceIdx++) {
            if (visited.has(startFaceIdx)) continue;
            const face = this.faces[startFaceIdx];
            if (!face || face.uvIndices.length < 3) continue;

            const island = {
                faces: [],
                uvIndices: new Set()
            };

            const queue = [startFaceIdx];
            visited.add(startFaceIdx);

            while (queue.length > 0) {
                const currentFaceIdx = queue.shift();
                const currentFace = this.faces[currentFaceIdx];
                
                island.faces.push(currentFaceIdx);
                currentFace.uvIndices.forEach(idx => island.uvIndices.add(idx));

                // Add adjacent faces to queue
                const adjacentFaces = faceAdjacency.get(currentFaceIdx);
                if (adjacentFaces) {
                    for (const adjFaceIdx of adjacentFaces) {
                        if (!visited.has(adjFaceIdx)) {
                            visited.add(adjFaceIdx);
                            queue.push(adjFaceIdx);
                        }
                    }
                }
            }

            if (island.faces.length > 0) {
                this.uvIslands.push(island);
            }
        }

        const endTime = performance.now();
        console.log(`Detected ${this.uvIslands.length} UV islands in ${(endTime - startTime).toFixed(0)}ms`);
        return this.uvIslands;
    }

    getFaceUVCoordinates(faceIndex) {
        if (faceIndex < 0 || faceIndex >= this.faces.length) return null;

        const face = this.faces[faceIndex];
        if (face.uvIndices.length < 3) return null;

        return face.uvIndices.map(idx => this.uvs[idx]);
    }

    getIslandContainingFace(faceIndex) {
        return this.uvIslands.find(island => island.faces.includes(faceIndex));
    }

    createUVMask(faceIndices, width = 1024, height = 1024) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#ffffff';

        // Batch all faces into a single path for better performance
        ctx.beginPath();

        for (const faceIndex of faceIndices) {
            const face = this.faces[faceIndex];
            if (!face || face.uvIndices.length < 3) continue;

            // Start a new sub-path for each face
            let firstPoint = null;
            face.uvIndices.forEach((uvIdx, i) => {
                const uv = this.uvs[uvIdx];
                if (!uv) return;

                const x = uv.u * width;
                const y = uv.v * height;

                if (i === 0) {
                    ctx.moveTo(x, y);
                    firstPoint = { x, y };
                } else {
                    ctx.lineTo(x, y);
                }
            });

            // Close this triangle
            if (firstPoint) {
                ctx.lineTo(firstPoint.x, firstPoint.y);
            }
        }

        // Fill all faces at once
        ctx.fill();

        return canvas;
    }

    getUVBounds(faceIndices) {
        let minU = Infinity, minV = Infinity;
        let maxU = -Infinity, maxV = -Infinity;

        for (const faceIndex of faceIndices) {
            const face = this.faces[faceIndex];
            if (!face || face.uvIndices.length < 3) continue;

            face.uvIndices.forEach(uvIdx => {
                const uv = this.uvs[uvIdx];
                if (!uv) return;

                minU = Math.min(minU, uv.u);
                minV = Math.min(minV, uv.v);
                maxU = Math.max(maxU, uv.u);
                maxV = Math.max(maxV, uv.v);
            });
        }

        return { minU, minV, maxU, maxV };
    }
}

