# Changelog

## Version 2.0 - TGA Support & Component Masking

### New Features

#### 🎨 Component Masking System
- **Constrain images to specific gun parts** - Images automatically clip to selected components
- **Visual component selection** - Color-coded buttons for each gun part
- **Mask overlay visualization** - See exactly which area you're working on
- **Multiple component support** - Work on body, magazine, barrel, stock, etc. separately
- **Pixel-perfect masking** - Uses efficient binary masks for accurate clipping
- **Dynamic component detection** - Automatically finds all unique colors in mask images

**Benefits:**
- No more images bleeding into wrong areas
- Work on one part without affecting others
- Professional-looking results with less manual effort
- Like Photoshop layers but for 3D weapon parts

#### 📦 TGA File Support
- **Native .tga file loading** - No conversion needed
- **Automatic decoding** - Handles format complexities transparently
- **Multiple format support:**
  - Uncompressed RGB/RGBA (Type 2)
  - RLE compressed RGB/RGBA (Type 10)
  - Grayscale (Type 3)
  - 16-bit, 24-bit, 32-bit color depths
- **Proper color handling** - BGR to RGB conversion
- **Orientation handling** - Top-down and bottom-up formats
- **Alpha channel support** - Full transparency handling

**Use Cases:**
- Load CS:GO texture files directly
- Import game assets without conversion
- Use TGA masks for component definition
- Add TGA image layers

### New Files

1. **tgaLoader.js** (279 lines)
   - Complete TGA decoder implementation
   - Supports uncompressed and RLE compression
   - Handles various pixel formats
   - Static helper methods for easy integration

2. **maskingSystem.js** (234 lines)
   - Component masking system
   - Color-based component detection
   - Binary mask generation
   - Image clipping functionality
   - Mask visualization

3. **MASKING_GUIDE.md** (380+ lines)
   - Comprehensive masking tutorial
   - Step-by-step workflow examples
   - Troubleshooting guide
   - Technical details

### Updated Files

#### uvEditor.js
- Integrated TGA loading
- Added masking system support
- New methods:
  - `loadImageFile()` - Handles TGA and regular images
  - `loadMask()` - Load component masks
  - `selectComponent()` - Select active component
  - `updateMaskOverlay()` - Show visual overlay
  - `clearMask()` - Clear component selection
- Modified `addImageLayer()` to apply masks automatically

#### app.js
- Added mask management
- New UI handlers:
  - Load mask button
  - Component selection buttons
  - Clear mask button
- New methods:
  - `loadMask()` - Load and process masks
  - `updateComponentSelector()` - Create component UI
  - `selectComponent()` - Handle component selection
  - `clearMask()` - Clear masking

#### index.html
- Added "Load Component Mask" button
- Added component selector UI section
- Added clear mask button
- Updated file inputs to accept .tga files

#### styles.css
- New mask control styling
- Component button styles
- Color indicator boxes
- Active state highlighting

#### README.md
- Updated feature list
- Added masking documentation
- Added TGA support info
- Added mask creation guide
- Updated file structure

#### QUICKSTART.md
- Added masking quick start
- Added TGA loading info
- Updated workflow steps
- Added mask creation example

### Technical Improvements

**Performance:**
- Efficient binary mask generation
- One-time mask processing
- Fast pixel-level clipping
- Minimal overhead on texture updates

**Code Quality:**
- Modular architecture
- Clear separation of concerns
- Comprehensive error handling
- Well-documented code

**User Experience:**
- Intuitive component selection
- Visual feedback with overlays
- Automatic image clipping
- Seamless TGA integration

### How to Use New Features

**Quick Start:**
```bash
1. python -m http.server 8000
2. Open http://localhost:8000
3. Load model: assets/weapon_rif_ak47.obj
4. Load texture: assets/ak-47.tga (TGA auto-decoded!)
5. Create a mask (see MASKING_GUIDE.md)
6. Load mask and select components
7. Add images - they'll clip to components automatically!
```

**Component Masking Workflow:**
1. Create mask image with unique colors per component
2. Load mask in app
3. Click component button to select area
4. Add images - they'll only appear in that area
5. Switch components to work on different parts
6. Clear mask to work on full UV map

**TGA Files:**
- Just select .tga files - they work like PNG/JPG
- No conversion needed
- Supports compression and various formats
- Works for base textures, masks, and layers

### Compatibility

- ✅ All modern browsers (Chrome, Firefox, Edge, Safari)
- ✅ Windows, macOS, Linux
- ✅ Backward compatible with existing workflows
- ✅ Optional features - works with or without masking

### Known Limitations

- Masking uses pixel-based clipping (not vector)
- Very large masks (>4096px) may be slower
- TGA types 1 and 9 not supported (rare formats)
- Component colors must be exact matches (no anti-aliasing)

### Future Enhancements

- Built-in mask creation tool
- Preset masks for common CS:GO weapons
- Gradient masking support
- Feathered edges option
- Save/load complete projects with masks

---

## Version 1.0 - Initial Release

### Features
- UV texture editor with Fabric.js
- 3D model viewer with Three.js
- Layer management system
- Image manipulation (move, scale, rotate)
- Real-time 3D preview
- Export functionality
- Professional dark theme UI

---

**Total Lines of Code Added:** ~1,100+ lines
**New Features:** 2 major systems (TGA loading, Component masking)
**Documentation:** 3 new/updated guides

Built with ❤️ for CS:GO skin creators

