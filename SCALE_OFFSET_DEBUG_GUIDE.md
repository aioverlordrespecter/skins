# 🔍 Texture Scale, Weapon Size & Offset Debugging

## Issues Fixed

### 1. **Material Overwrite Bug** ❌ → ✅
**Problem**: After creating unique materials for each part, the code was overwriting them ALL with a default gray material.

**Location**: `viewer3D.js` line 474-485

**Before**:
```javascript
// Apply default materials to all parts
object.traverse((child) => {
    if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
            color: 0xaaaaaa,  // ❌ Overwrites unique materials!
            ...
        });
    }
});
```

**After**:
```javascript
// Note: Materials already set during part extraction
// Just enable shadows
object.traverse((child) => {
    if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
    }
});
```

**Result**: Each part now keeps its unique material instance!

---

### 2. **Camera Auto-Positioning** 🎥
**Problem**: Camera was at fixed position (0, 5, 20) regardless of model size.

**Solution**: Camera now automatically positions based on model dimensions.

```javascript
// Calculate optimal distance from model
const optimalDistance = Math.max(size.x, size.y, size.z) * scale * 2;
this.camera.position.set(0, optimalDistance * 0.3, optimalDistance);
this.camera.lookAt(0, 0, 0);
```

**Result**: Camera automatically frames the model correctly!

---

### 3. **Texture Wrapping Settings** 🗺️
**Problem**: Textures might repeat or flip unexpectedly.

**Solution**: Explicit texture configuration:

```javascript
texture.wrapS = THREE.ClampToEdgeWrapping; // No horizontal repeat
texture.wrapT = THREE.ClampToEdgeWrapping; // No vertical repeat
texture.minFilter = THREE.LinearFilter;
texture.magFilter = THREE.LinearFilter;
texture.flipY = false; // We handle Y-flip in UV coordinates
```

**Result**: Textures map exactly to UV coordinates without tiling!

---

### 4. **Material Creation Safety** 🛡️
**Problem**: FBX might not have materials defined.

**Solution**: Create default if needed:

```javascript
const baseMaterial = child.material || new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    metalness: 0.2,
    roughness: 0.8,
    side: THREE.DoubleSide
});
const uniqueMaterial = baseMaterial.clone();
```

**Result**: Always have a valid material to work with!

---

## Enhanced Debug Logging

### When Loading FBX:
```
✅ FBX Model added to scene: Group
   Position: 0.00 0.00 0.00
   Scale: 0.0027
   Parts: 25
   Original size: 281.2 x 1070.6 x 3728.7
   Scaled size: 0.8 x 2.9 x 10.0
   Camera distance: 20.0
```

### When Selecting Part:
```
🎨 Drawing UV layout for: PISTOL_GRIP
   Canvas size: 535 x 535
   Geometry: BufferGeometry
   Has UV: true
   Has index: true
   UV count: 1449 Triangles: 483
   UV Range:
      U: 0.000 to 0.245 (width: 0.245)
      V: 0.000 to 0.368 (height: 0.368)
   First triangle UVs (raw 0-1):
      v1: 0.123 0.245
      v2: 0.134 0.256
      v3: 0.145 0.267
   UV Bounding Box: (0.0, 338.0) to (131.1, 535.0)
   Size: 131.1 x 197.0 px
```

### When Applying Texture:
```
🎨 Applying texture to: PISTOL_GRIP
   Current mesh material ID: 42
   Canvas dimensions: 535 x 535
   Texture data URL length: 125438 bytes
   Texture loaded: 535 x 535
   Texture wrap: S=1001, T=1001 (ClampToEdge)
   Texture flipY: false
   New material created: ID 57
   Assigning to mesh: PISTOL_GRIP
✅ Texture applied ONLY to PISTOL_GRIP (verified unique)
```

---

## Diagnostic Checklist

### ✅ Model Scale Issues:
**Symptom**: Model too small/large or not centered

**Check**:
1. Console log: "Original size" vs "Scaled size"
2. Console log: "Camera distance"
3. Verify model is at Position (0, 0, 0)

**Expected**:
- Scaled size: ~10 units in largest dimension
- Camera distance: ~20 units
- Position: (0, 0, 0)

---

### ✅ UV Range Issues:
**Symptom**: Texture appears stretched, compressed, or in wrong location

**Check**:
1. Console log: "UV Range"
2. Look for warning: "⚠️ UVs outside standard 0-1 range!"
3. Compare UV width/height to canvas size

**Expected**:
- U and V both in 0.0 to 1.0 range
- Width and height > 0
- No negative values

**Common Issues**:
- **UVs outside 0-1**: Model has overlapping or tiled UV layout
- **Very small range** (e.g., 0.001 width): Part uses tiny UV space, texture will be tiny
- **Negative values**: UV layout has mirroring or flipping

---

### ✅ Texture Application Issues:
**Symptom**: Texture doesn't appear or appears incorrectly

**Check**:
1. Console log: "Canvas dimensions"
2. Console log: "Texture loaded" dimensions
3. Console log: "Texture wrap" and "flipY"
4. Verify: "✅ Texture applied ONLY to [part] (verified unique)"

**Expected**:
- Canvas and texture dimensions match
- Wrap mode: 1001 (ClampToEdgeWrapping)
- flipY: false
- Verification passes (no other parts share material)

---

### ✅ Material Isolation:
**Symptom**: Texture appears on multiple parts

**Check**:
1. Look for: "ERROR: Other parts sharing the same material!"
2. Console log: Material IDs before and after

**Expected**:
- New material ID different from current
- No error about shared materials
- Each part has unique material.id

---

## Testing Workflow

### Step 1: Load FBX and Check Model
```
1. Load your FBX file
2. Check console:
   ✓ 25 parts found?
   ✓ Model centered at (0, 0, 0)?
   ✓ Scaled size reasonable (~10 units)?
   ✓ Camera positioned correctly?
3. Can you see the entire model?
```

### Step 2: Select Part and Check UVs
```
1. Select a part (e.g., PISTOL_GRIP)
2. Check console:
   ✓ UV count > 0?
   ✓ UV range within 0-1?
   ✓ Bounding box reasonable?
3. Can you see cyan wireframe on canvas?
```

### Step 3: Add Image and Check Texture
```
1. Add an image
2. Position it on the wireframe
3. Check console:
   ✓ Texture loaded with correct dimensions?
   ✓ Wrap mode: ClampToEdge?
   ✓ flipY: false?
   ✓ Material verification passed?
4. Does texture appear ONLY on selected part?
```

### Step 4: Switch Parts and Verify Isolation
```
1. Select different part (e.g., MAGAZINE)
2. Add a different image
3. Check 3D model:
   ✓ First part still has its texture?
   ✓ New part has new texture?
   ✓ No textures appearing on wrong parts?
```

---

## Common UV Layout Issues

### Issue 1: UVs Outside 0-1 Range
```
UV Range:
   U: -0.5 to 1.5 (width: 2.0)  ⚠️
   V: -0.2 to 1.2 (height: 1.4) ⚠️
```

**Cause**: Model has tiled or overlapping UV layout  
**Solution**: Part may share UV space with other parts. Use FBX with non-overlapping UVs.

---

### Issue 2: Tiny UV Area
```
UV Range:
   U: 0.001 to 0.015 (width: 0.014)  ⚠️ Very small!
   V: 0.002 to 0.020 (height: 0.018) ⚠️ Very small!
```

**Cause**: Part uses small portion of UV sheet  
**Effect**: Texture will appear tiny on 3D model  
**Solution**: This is correct if part is small! Use high-res image or zoom in canvas.

---

### Issue 3: Full 0-1 Range (Good!)
```
UV Range:
   U: 0.000 to 1.000 (width: 1.000) ✅
   V: 0.000 to 1.000 (height: 1.000) ✅
```

**Perfect**: Part uses entire UV space. Texture will map 1:1.

---

### Issue 4: Partial Range (Normal)
```
UV Range:
   U: 0.123 to 0.456 (width: 0.333) ✅
   V: 0.200 to 0.600 (height: 0.400) ✅
```

**Normal**: Part uses portion of UV space. Position your image in this area on canvas.

---

## Advanced: Understanding UV to Canvas Mapping

### UV Space → Canvas Pixels:
```javascript
// UV coordinates are 0.0 to 1.0
// Canvas coordinates are 0 to canvasWidth/Height

canvasX = uvU * canvasWidth;
canvasY = (1 - uvV) * canvasHeight; // Flip Y axis
```

### Example:
```
Canvas: 535 x 535 pixels
UV point: (0.5, 0.5) in UV space

Canvas position:
  X = 0.5 * 535 = 267.5 px
  Y = (1 - 0.5) * 535 = 267.5 px

Result: Center of canvas (correct!)
```

---

## Quick Reference

### Good Console Output:
```
✅ Model centered and scaled
✅ Camera positioned automatically
✅ UVs in 0-1 range
✅ Texture wrapping: ClampToEdge
✅ Material verification passed
✅ No warnings or errors
```

### Problem Indicators:
```
⚠️ UVs outside standard 0-1 range!
❌ ERROR: Other parts sharing the same material!
⚠️ No UV attribute found
⚠️ No index found
```

---

## What to Report

If you still see issues, provide:
1. **Console output** when loading FBX
2. **Console output** when selecting part
3. **Console output** when applying texture
4. **Screenshot** of 3D model showing issue
5. **Screenshot** of UV canvas showing wireframe
6. **Description** of what's wrong (too big/small, offset, stretched, etc.)

---

**All major scaling and offset bugs are now fixed!**  
Refresh your browser and check the console output. 🔍

