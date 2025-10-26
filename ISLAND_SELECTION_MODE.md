# Island Selection Mode - UV Component Selection

## What Changed

### Before:
- ❌ Clicking on the handle selected only a single triangle face
- ❌ Saw thousands of internal lines on UV map
- ❌ Had to manually select each tiny face

### After:
- ✅ Clicking on the handle selects the **ENTIRE handle component**
- ✅ Clean outlines show component boundaries (no internal lines)
- ✅ One click = entire UV island selected

## How It Works

### UV Island Detection
When you load a model, the app now:

1. **Parses the OBJ file** - extracts vertices, UVs, faces
2. **Detects UV Islands** - groups connected faces into components
3. **Builds edge maps** - identifies which edges are boundaries

**UV Island** = A group of connected UV faces (e.g., all faces that make up the gun handle)

### Component Selection
When you click on the 3D model:

1. **Raycast** detects which triangle face you clicked
2. **Island lookup** finds which UV island contains that face
3. **Entire island** is highlighted with clean outlines
4. **Mask created** from all faces in that island

## Visual Difference

### Old Behavior (Single Face):
```
Click handle → Highlights 1 tiny triangle
UV shows: Mesh of thousands of lines
Result: Need to click 500+ times to select handle
```

### New Behavior (Island Selection):
```
Click handle → Highlights ENTIRE HANDLE
UV shows: Clean outline of handle shape
Result: One click = entire component selected!
```

## UI Changes

### Interactive Controls Panel:
**New text:**
- "Interactive Component Selection"
- "Click to select entire component (handle, body, magazine, etc.)"
- "Selected area will be highlighted with clean outlines"
- "Mode: Island Selection (Full Components)"

### Hover Behavior:
- **Cyan outline** shows component preview when hovering
- **Green fill + outline** shows selected component when clicked

### UV Wireframe Button:
- Shows clean component outlines only
- No internal triangle edges
- Only boundary edges of UV islands

## Performance Optimizations

### For Large Models (AK-47):
- **Max 100,000 faces** processed for island detection
- Still finds major components (body, handle, magazine, etc.)
- Prevents browser hangs on massive models

### For Small Models (Pistol):
- **All faces** processed
- Perfect island detection
- Every component detected

## Examples

### Pistol Components:
Clicking different parts selects:
- **Slide** (top moving part)
- **Frame** (main body)
- **Grip** (handle)
- **Trigger guard**
- **Magazine**

### AK-47 Components:
Clicking different parts selects:
- **Receiver** (main body)
- **Stock** (shoulder rest)
- **Handguard** (front grip)
- **Magazine**
- **Barrel**
- **Sights**

## How to Use

### Step 1: Load Model
```
1. Click "Load 3D Model"
2. Select your OBJ file
3. Wait for island detection to complete
   Console will show: "Detected X UV islands"
```

### Step 2: Enable Interactive Mode
```
1. Click "🎨 Interactive Mode: OFF" button
2. It turns green: "🎨 Interactive Mode: ON"
3. UV wireframe appears showing component outlines
```

### Step 3: Select Components
```
1. Hover over 3D model parts
   → See cyan preview of component
2. Click on a part (e.g., handle)
   → Entire component highlighted in green
   → UV map shows clean outline
3. Add images - they will clip to selected component
```

### Step 4: Paint Selected Area
```
1. Click "Add Image Layer"
2. Select your texture/design
3. Image appears on UV canvas
4. Move/scale/rotate image
5. Image only appears on selected component!
```

## Technical Details

### Island Detection Algorithm:
```javascript
1. Build edge map: Map each UV edge to faces that use it
2. Find boundaries: Edges used by exactly 1 face = boundaries
3. Group faces: Connected faces = UV island
4. Result: List of islands with their face indices
```

### Highlighting Algorithm:
```javascript
1. Fill island area with semi-transparent color
2. Find boundary edges (edges shared by only 1 face)
3. Draw thick outline around boundaries
4. Result: Clean shape with visible outline
```

### Performance Limits:
| Model Size | Island Detection | Result |
|------------|------------------|--------|
| <50k faces | Full processing | Perfect |
| 50k-100k   | Full processing | Excellent |
| >100k      | Limited to 100k | Good (main components) |
| >200k      | Interactive mode disabled | View only |

## Comparison: Old vs New

### Old System (Face Selection):
```
Advantage: None really
Disadvantages:
- Had to click hundreds of times
- Couldn't see component shapes
- UV map was cluttered mess
- Selecting handle = 30 minutes of clicking
```

### New System (Island Selection):
```
Advantages:
- One click = entire component
- Clean visual outlines
- Fast and intuitive
- Professional workflow
Disadvantages:
- Requires island detection (adds 1-3 seconds load time)
- Limited to 100k faces on huge models
```

## Troubleshooting

### "Island not found" error:
**Cause:** Face has no UV coordinates or is not connected
**Solution:** Check if model has proper UV unwrapping

### Components not selecting properly:
**Cause:** Model might have disconnected UVs
**Solution:** Re-unwrap UVs in Blender with proper seams

### Selection is slow:
**Cause:** Model has >100k faces
**Solution:**
- Use simplified model
- Decimate in Blender
- Interactive mode may be disabled automatically

### Wrong component selected:
**Cause:** UVs might be overlapping or touching
**Solution:** Ensure UV islands have proper spacing in UV editor

## Best Practices

### Creating UV Maps:
1. **Mark seams properly** - defines island boundaries
2. **Unwrap with margin** - keep islands separated
3. **Pack UVs efficiently** - but don't overlap
4. **Test in app** - verify islands select correctly

### Working with Complex Models:
1. **Start with smaller models** to understand system
2. **Use LOD models** for editing (lower polygon count)
3. **Test island selection** before adding textures
4. **Export high-res** when done editing

### Optimal Workflow:
```
1. Load model → Wait for island detection
2. Enable interactive mode
3. Click each component once to verify detection
4. Add textures to selected components
5. Export final texture
6. Apply to high-poly model in game
```

## Tips & Tricks

### Multi-Component Selection:
- Currently: One component at a time
- Workaround: Use mask images for multiple components

### Fine Control:
- **Zoom in** on 3D model for precise clicking
- **Rotate model** to access all sides
- **Use UV wireframe** to see component layout

### Faster Texturing:
1. Select handle → Add wood texture
2. Select body → Add metal texture
3. Select magazine → Add plastic texture
4. Done in 3 clicks instead of 3 hours!

## FAQ

**Q: Why do I see lines inside the component?**
A: Those are the UV wireframe. Click "Hide UV Wireframe" to remove them.

**Q: Can I select multiple components at once?**
A: Not yet - one component at a time. Use mask files for multi-component selection.

**Q: The gun handle is still split into many pieces**
A: The model's UVs have multiple islands for one component. Re-unwrap in Blender.

**Q: Interactive mode is disabled for my AK-47**
A: Model has >200k polygons. Use a simplified version for editing.

**Q: How do I know what islands were detected?**
A: Check console log after loading: "Detected X UV islands"

**Q: Can I save selected components?**
A: Use "Export Texture" to save. The mask is applied to exported image.

---

**Version:** 3.3 (Island Selection Mode)
**Updated:** 2025-10-26
**Performance:** Optimized for models up to 100k faces
