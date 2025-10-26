# Quick Start Guide

## Running the Application

Since this is a web application that loads external resources, you need to run it through a local web server to avoid CORS restrictions.

### Option 1: Using Python (Recommended if you have Python installed)

Open your terminal/command prompt in the project folder and run:

```bash
# For Python 3
python -m http.server 8000

# For Python 2
python -m SimpleHTTPServer 8000
```

Then open your browser and navigate to: `http://localhost:8000`

### Option 2: Using Node.js/NPM

If you have Node.js installed:

```bash
npx serve
```

This will start a server and show you the URL to open (usually `http://localhost:3000`).

### Option 3: Using VS Code Live Server Extension

1. Install the "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

## First Steps

1. **Load Your 3D Model**
   - Click "Load 3D Model (.obj)" button
   - Select `assets/weapon_rif_ak47.obj`
   - Your AK-47 model will appear in the right panel

2. **Load Base Texture (Optional)**
   - Click "Load Base Texture (.tga)"
   - Select `assets/ak-47.tga`
   - **TGA files are automatically decoded** - no conversion needed!
   - This gives you the default texture as a starting point

3. **Load Component Mask (Optional but Powerful!)**
   - Click "Load Component Mask"
   - Select a mask image (see "Creating Masks" below)
   - Component buttons will appear showing different gun parts
   - Click a component to select it (e.g., "Body/Main", "Magazine")
   - A colored overlay shows which area is selected
   - **Images you add will only appear within this component!**

4. **Add Custom Images**
   - Click "Add Image Layer"
   - Select any image from your computer (PNG, JPG, **TGA**, etc.)
   - Drag to move, use corner handles to resize
   - Rotate using the rotation handle at the top
   - If a component is selected, the image will be clipped to that area

5. **Edit Layers**
   - Click on layers in the layer list to select them
   - Adjust opacity with the slider
   - Use Move Up/Down to change layer order
   - Delete unwanted layers

6. **Clear Component Selection (Optional)**
   - Click "Clear Selection" to work on the entire texture
   - You can re-select components at any time

7. **Export Your Work**
   - "Export Texture" saves your final texture as PNG
   - "Screenshot 3D View" captures the 3D preview

## Tips for Best Results

- **Image Boundaries**: Images are automatically constrained to stay within the canvas
- **Real-time Preview**: The 3D model updates automatically as you edit
- **Layer Management**: Layers at the top of the list appear on top in the texture
- **Camera Controls**:
  - Left click + drag: Rotate
  - Right click + drag: Pan
  - Scroll wheel: Zoom

## Troubleshooting

**Problem**: "Failed to fetch" or CORS errors in console
**Solution**: Make sure you're running through a local server (not opening the file directly)

**Problem**: Model appears black
**Solution**: The model is loading - give it a moment. If it stays black, check the console for errors.

**Problem**: Texture doesn't appear on model
**Solution**: Ensure your .obj file has proper UV mapping. Try loading a base texture first.

## Creating Component Masks

To use the masking feature:

1. **Quick Method - Paint Tool:**
   - Open your UV template (ak-47.tga) in any image editor
   - Create a new layer
   - Paint each gun part with a **unique solid color**:
     - Red (255, 0, 0) = Body/Main
     - Green (0, 255, 0) = Magazine  
     - Blue (0, 0, 255) = Barrel
     - Yellow (255, 255, 0) = Stock
     - Magenta (255, 0, 255) = Grip
   - Save as PNG or TGA
   - Load in app with "Load Component Mask"

2. **The app will:**
   - Detect all unique colors automatically
   - Create a button for each component
   - Let you select which part to work on
   - Clip your images to stay within that part

**Example:** If you select "Magazine" (green), any images you add will only appear on the magazine area!

## What You Have

Your project now includes:
- ✅ Full UV texture editor with image manipulation
- ✅ **TGA file support** - Load .tga textures directly
- ✅ **Component masking system** - Work on specific gun parts
- ✅ Interactive 3D viewer with orbit controls
- ✅ Layer management system
- ✅ Export functionality
- ✅ Real-time texture preview
- ✅ Professional dark-themed UI

Enjoy creating your CS:GO skins! 🎨

