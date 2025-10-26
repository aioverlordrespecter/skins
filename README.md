# CS:GO Skin Editor

A web-based application for creating and previewing CS:GO weapon skins with real-time 3D visualization, component masking, and TGA file support.

## Features

- **UV Texture Editor**: Compose textures by layering images on a UV sheet
  - Drag, resize, and rotate image layers
  - Boundary constraints keep images within canvas
  - Layer management (add, delete, reorder, opacity control)
  - **TGA file support** - Load .tga textures directly
  - Export final texture as PNG

- **🎨 Interactive UV Selection Mode**: Revolutionary click-to-select workflow
  - **Auto-extract UV maps** from OBJ files - no manual work needed!
  - **Hover over 3D model** to preview UV regions in real-time
  - **Click to select** - highlighted regions become automatic masks
  - **UV Island detection** - smart grouping of connected regions
  - Perfect for beginners and pros alike!

- **Component Masking System**: Alternative manual masking (optional)
  - Load mask images to define component regions
  - Select which component to work on (body, magazine, barrel, etc.)
  - Images automatically clip to selected component boundaries
  - Visual overlay shows active component
  - Pixel-perfect masking using color-coded regions

- **3D Preview**: Interactive 3D viewer for real-time skin preview
  - Load .obj weapon models
  - Orbit controls (rotate, zoom, pan)
  - Real-time texture updates
  - Screenshot export

- **User-Friendly Interface**:
  - Dark theme optimized for graphics work
  - Split-panel layout
  - Intuitive controls

## Getting Started

### Requirements

- Modern web browser with WebGL support (Chrome, Firefox, Edge, Safari)
- No installation required - runs entirely in the browser!

### Quick Start (New Interactive Mode!)

1. **Open the Application**
   - Simply open `index.html` in your web browser
   - For local development, use a local server to avoid CORS issues:
     ```bash
     # Using Python
     python -m http.server 8000
     
     # Using Node.js
     npx serve
     ```
   - Then navigate to `http://localhost:8000`

2. **Load a 3D Model**
   - Click "Load 3D Model (.obj)" button
   - Select your weapon model file (e.g., `weapon_rif_ak47.obj`)
   - The model will appear in the 3D viewer

3. **Enable Interactive Mode** 🎨
   - Click "🎨 Interactive Mode: OFF" button (turns cyan when ON)
   - UV wireframe appears on the canvas
   - Now you can interact directly with the 3D model!

4. **Select UV Regions by Clicking the 3D Model**
   - **Hover** over any part of the 3D model → UV region highlights (cyan)
   - **Click** the part → Region is selected (green) and becomes an active mask
   - Choose "UV Island" mode to select entire parts (body, magazine, etc.)
   - Or use "Single Face" mode for precise control

5. **Add Images to Selected Regions**
   - Click "Add Image Layer"
   - Select your image (supports .tga, .png, .jpg, etc.)
   - **Image automatically clips to the selected UV region!**
   - No bleeding into other parts - perfect boundaries!

6. **Select Different Parts**
   - Click another part of the 3D model
   - Previous selection clears, new region highlights
   - Add more images - they go to the new region
   - Build your skin part-by-part!

### Alternative: Manual Component Masks (Optional)

If you prefer manual control or need reusable masks:

1. **Load Component Mask (Optional)**
   - Click "Load Component Mask" button
   - Select a mask image where different colors represent different gun parts
   - The app will detect all unique colors and create component buttons
   - Click a component button to select that region
   - A colored overlay will show the selected area
   - **Any images you add will be automatically clipped to stay within the selected component**

2. **Or Load Base Texture**
   - Click "Load Base Texture (.tga)" button  
   - Select your base texture file (supports .tga, .png, .jpg, etc.)
   - **TGA files are automatically decoded** and displayed

### Working with Your Skin

7. **Adjust and Edit**
   - Drag images to move them
   - Use corner handles to resize
   - Adjust opacity with the slider
   - Reorder layers using Move Up/Down buttons
   - Images respect selected region boundaries

8. **Preview in 3D**
   - The 3D viewer updates automatically as you edit
   - Click and drag to rotate the model
   - Scroll to zoom in/out
   - Right-click and drag to pan

9. **Export Your Work**
   - "Export Texture": Save the final texture as PNG
   - "Screenshot 3D View": Capture the 3D preview

## File Structure

```
csgo-skin-editor/
├── index.html          # Main application page
├── styles.css          # Application styling
├── app.js             # Main application logic
├── uvEditor.js        # UV editor module (Fabric.js)
├── viewer3D.js        # 3D viewer module (Three.js) + face picking
├── uvExtractor.js     # UV coordinate extraction & island detection
├── tgaLoader.js       # TGA file decoder
├── maskingSystem.js   # Component masking system
├── assets/            # Your model and texture files
│   ├── weapon_rif_ak47.obj
│   └── ak-47.tga
├── README.md          # Full documentation
├── INTERACTIVE_MODE.md # Interactive mode guide
├── MASKING_GUIDE.md   # Manual masking guide
├── QUICKSTART.md      # Quick start guide
└── CHANGELOG.md       # Version history
```

## Technologies Used

- **Three.js**: 3D rendering and model loading
- **Fabric.js**: Canvas-based image manipulation
- **HTML5 Canvas**: 2D graphics and texture composition
- **WebGL**: Hardware-accelerated 3D graphics

## Tips

**Interactive Mode (Recommended for Beginners!):**
- Just click the 3D model - no mask creation needed!
- Use "UV Island" mode to select entire parts (body, magazine, etc.)
- Hover to preview, click to select
- UV wireframe shows the full layout
- Perfect for learning how UV mapping works

**General Tips:**
- Start with Interactive Mode to understand your model's UV layout
- Use multiple layers to build complex designs
- Adjust layer opacity for blending effects
- The texture resolution is 1024x1024 pixels
- TGA files with RLE compression are fully supported
- Export frequently to save your progress

**Advanced Users:**
- Create manual masks in image editor for reusable templates
- Combine Interactive Mode with manual masks for best of both worlds
- Use "Single Face" mode for pixel-perfect precision
- Toggle UV wireframe to see complete UV layout

## Troubleshooting

**Model doesn't load:**
- Ensure the .obj file is valid
- Check browser console for errors
- Make sure you're using a local server (not file://)

**Texture appears incorrect:**
- Verify the UV mapping in your .obj file
- Some models may have flipped UVs

**Performance issues:**
- Reduce image layer sizes before adding them
- Close other browser tabs
- Use a modern browser with good WebGL support

## Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Edge 90+
- ✅ Safari 14+

## Creating Component Masks

To use the masking feature, you need to create a mask image:

1. Open your UV template in an image editor (Photoshop, GIMP, etc.)
2. Create a new layer
3. Paint different gun parts with **solid, unique colors**:
   - Red (255,0,0) for body/main
   - Green (0,255,0) for magazine
   - Blue (0,0,255) for barrel
   - Yellow (255,255,0) for stock
   - Any unique color works!
4. Save the mask as PNG or TGA
5. Load it in the app using "Load Component Mask"

The app will automatically detect all unique colors and create component buttons for each.

## Supported File Formats

- **Models**: .obj
- **Textures**: .tga (with RLE compression), .png, .jpg, .jpeg, .gif, .webp
- **Masks**: Any image format

## Future Enhancements

- Save/load project files
- Preset masks for different CS:GO weapons
- Advanced filters and effects
- Material property editing (metalness, roughness)
- Support for multiple texture maps (normal, specular)
- Animation preview support
- Mask creation tool built into the app

## License

This project is provided as-is for educational and personal use.

## Credits

Built with ❤️ using open-source libraries:
- [Three.js](https://threejs.org/) - 3D rendering
- [Fabric.js](http://fabricjs.com/) - Canvas manipulation

---

Happy skin designing! 🎨🔫

