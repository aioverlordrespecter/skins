# 🔧 FBX Parts Deconstruction - How It Works

## What Is Happening?

Your **FBX file already contains the deconstruction**! The app extracts and lists each named component automatically.

### The FBX File Contains:
- **Named Mesh Parts**: Each component (handle, magazine, barrel, etc.) is a separate named mesh
- **Individual UV Coordinates**: Each part has its own UV layout
- **Geometry Data**: Vertices, faces, and normals for each part

### What The App Does:
1. **Loads the FBX file** using Three.js FBXLoader
2. **Traverses the model hierarchy** to find all mesh objects
3. **Extracts each part's data**:
   - Part name (e.g., "PISTOL_GRIP", "MAGAZINE")
   - UV coordinates for that specific part
   - Geometry (vertices, faces)
   - Material references
4. **Makes each part independently selectable**

---

## 🎯 How To Use The Parts System

### Method 1: Click on the 3D Model
1. Load your FBX file
2. **Interactive Mode** is enabled automatically
3. **Hover** over any part - it highlights in green
4. **Click** to select that part
5. The UV layout appears in the left panel

### Method 2: Use The Parts List
1. After loading an FBX, click **"📋 Show All Parts"** in the toolbar
2. A list of all 25 components appears
3. Click any part name to select it
4. The UV layout appears instantly

---

## 🎨 Workflow For Texturing Individual Parts

### Step-by-Step:

1. **Select A Part** (handle, magazine, etc.)
   - Click it on the 3D model OR
   - Choose it from the Parts List

2. **See The UV Layout**
   - **Gray Grid**: Shows UV space (0,0 to 1,1)
   - **Cyan Wireframe**: The part's UV mesh
   - **Yellow Dashed Box**: Bounding area for this part
   - **Magenta Corners**: UV coordinate markers

3. **Add Your Image**
   - Click **"➕ Add Image"**
   - Position the image INSIDE the yellow box
   - Align it with the cyan wireframe

4. **See It Live**
   - The texture applies ONLY to the selected part
   - Hover away and the texture stays
   - Select another part to texture it separately

5. **Build Your Skin**
   - Repeat for each component
   - Each part keeps its own texture
   - Export when finished

---

## 🔍 Visual Guides Explained

When you select a part, you see multiple visual aids:

### Gray Grid Lines
- Divides UV space into 4x4 sections
- Helps you align images properly
- Non-intrusive background reference

### Cyan Wireframe
- Shows the EXACT UV layout for the selected part
- Every triangle of the part's mesh
- This is where your texture will be mapped

### Yellow Dashed Box
- Bounding rectangle of the part's UVs
- Shows the area you need to fill
- Position images INSIDE this box

### Magenta Markers
- Corner markers: (0,0), (1,0), (0,1), (1,1)
- Shows the full UV coordinate system
- Helps understand UV space orientation

---

## 💡 Tips For Best Results

### Image Placement
- **Drag** your image to position it over the cyan wireframe
- **Resize** using corner handles to fit the yellow box
- **Align** with the wireframe edges for precise mapping

### Understanding UV Space
- **Origin (0,0)**: Top-left corner (magenta marker)
- **Point (1,1)**: Bottom-right corner (magenta marker)
- UVs are normalized: 0.0 to 1.0 range

### Working With Small Parts
- Small parts (screws, buttons) have tiny UV areas
- Zoom in by making the UV editor fullscreen
- Use the Parts List to select them precisely

### Combining Multiple Images
- Select a part
- Add multiple images (layers)
- Stack them to create complex textures
- Adjust opacity for blending

---

## 🛠️ Technical Details

### How FBX Deconstruction Works:

```javascript
// The app automatically:
object.traverse((child) => {
    if (child.isMesh) {
        // Extract each part
        modelParts.push({
            name: child.name,           // Part name from FBX
            mesh: child,                 // 3D mesh object
            geometry: child.geometry,    // Vertices, faces
            uvs: extractUVCoords(),      // UV coordinates
            material: child.material     // Material/texture
        });
    }
});
```

### UV Coordinate System:
- **FBX UV Format**: Standard (0,0) = top-left
- **Canvas Flipping**: Y-axis flipped for correct display
- **Coordinate Range**: 0.0 to 1.0 normalized

### Part Selection:
- Uses **Three.js Raycasting** for 3D clicking
- Detects which mesh the mouse intersects
- Highlights with temporary green material
- Restores original material on deselect

---

## 🎮 Example: Texturing An AK-47

Your `AK47_PARTS.fbx` contains **25 named parts**:

1. MAGAZINE
2. FRONT_HARDWARE
3. BLOCK_&_BATTERY
4. BULLETS
5. BOLT
6. LOWER_RECIEVER
7. STOCK_HARDWARE
8. GAS_LOCK
9. SCOPE_MOUNT
10. SAFE
11. SPRING_COVER
12. UPPER_RECIEVER
13. STOCK_PLATE
14. GASTUBE
15. BITS_N_THANGS
16. MAG_RELEASE
17. BARREL
18. CLEANING_ROD
19. TRIGGER
20. PISTOL_GRIP
21. SIGHT_REAR
22. FOREGRIP_LOWER
23. FOREGRIP_TOP
24. TRIGGER_GAURD
25. STOCK

**Each part is independently texturable!**

---

## 📚 Summary

The FBX file **already contains the deconstruction** into named parts. The app simply:
- Extracts these parts
- Shows their UV layouts individually
- Lets you apply images to each part separately
- Combines them into a complete skin

**This is much simpler than trying to paint masks or detect boundaries from an OBJ file!**

---

## 🚨 Troubleshooting

### "Image appears in wrong place"
- ✅ FIXED in latest version (removed double Y-flip)
- Position image INSIDE the yellow dashed box
- Align with cyan wireframe

### "Can't see the wireframe"
- The part might have UVs outside 0-1 range
- Check console for UV coordinate logs
- Try another part to verify

### "Part list is empty"
- Your FBX might not have named parts
- Try re-exporting from your 3D software with proper naming
- Use OBJ workflow as fallback

---

**Happy Skinning! 🎨**

