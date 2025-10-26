# Component Masking & TGA Support Guide

This guide explains how to use the **component masking system** and **TGA file support** in the CS:GO Skin Editor.

## What is Component Masking?

Component masking allows you to **constrain images to specific parts of the gun**. Instead of placing images anywhere on the entire UV map, you can:
- Work on just the body/receiver
- Add designs only to the magazine
- Customize just the barrel or stock
- **Prevent images from bleeding into other parts**

Think of it like masking in Photoshop, but for 3D weapon parts!

## How It Works

### Step 1: Create a Mask Image

A mask is a special image where **each unique color represents a different gun component**.

**Using any image editor (Photoshop, GIMP, Paint.NET, etc.):**

1. Open your UV template (`assets/ak-47.tga`)
2. Create a new layer above it
3. Using the **paint bucket or brush tool**, fill each gun part with a **solid, unique color**:
   
   ```
   Recommended Colors:
   - Red    (255, 0, 0)   → Body/Main/Receiver
   - Green  (0, 255, 0)   → Magazine
   - Blue   (0, 0, 255)   → Barrel
   - Yellow (255, 255, 0) → Stock
   - Cyan   (0, 255, 255) → Handguard
   - Magenta(255, 0, 255) → Grip
   ```

4. **Important:** Use solid colors, not gradients!
5. Save as PNG or TGA (any format works)
6. You now have a component mask!

**Example:**
```
UV Template           →    Component Mask
┌─────────────┐           ┌─────────────┐
│   ┌───┐     │           │   ┌───┐     │
│   │   │ ▓▓▓ │    →      │   │ G │ R R │  
│   └───┘     │           │   └───┘     │
│    ▓▓       │           │    B B      │
└─────────────┘           └─────────────┘
(Gun parts)               (G=Green=Magazine)
                          (R=Red=Body)
                          (B=Blue=Barrel)
```

### Step 2: Load the Mask in the App

1. Start the CS:GO Skin Editor
2. Click **"Load Component Mask"** button
3. Select your mask image
4. The app will analyze it and detect all unique colors
5. Component buttons will appear in the "Component Selection" area

### Step 3: Select a Component

1. Click any component button (e.g., "Body/Main", "Magazine")
2. A **colored overlay** appears on the canvas showing the selected region
3. The button highlights to show it's active

### Step 4: Add Images

1. Click **"Add Image Layer"**
2. Choose your image (PNG, JPG, or TGA)
3. **The image will automatically be clipped to the selected component!**
4. Move and resize as normal
5. The image will **only appear within that component area**

### Step 5: Switch Components or Clear

- Click another component button to work on a different part
- Click **"Clear Selection"** to work on the entire UV map again
- You can switch between components at any time

## TGA File Support

The app now supports **TGA (Targa) image files** including:
- Uncompressed RGB/RGBA
- RLE compressed (common in game files)
- 16-bit, 24-bit, and 32-bit formats
- Grayscale TGA files

**No conversion needed!** Just load .tga files directly:
- Base textures
- Component masks  
- Image layers

The decoder automatically handles:
- Color channel swapping (BGR → RGB)
- Vertical flipping
- RLE decompression
- Alpha channel support

## Advanced Tips

### Creating Better Masks

**Precision:**
- Use the magic wand or pen tool for exact edges
- Zoom in to ensure no gaps between colors
- Clean edges = better masking

**Color Choice:**
- Use highly saturated, distinct colors
- Avoid similar colors (e.g., don't use both dark red and dark pink)
- The app detects colors by exact RGB values

**Testing:**
- Create a simple 2-color test mask first
- Verify both components are detected
- Then create your full mask

### Workflow Recommendations

**For Complex Skins:**
```
1. Load base texture
2. Load component mask
3. Select "Body/Main"
4. Add and position your main design images
5. Select "Magazine"
6. Add magazine-specific designs
7. Repeat for each component
8. Clear mask to add any full-UV overlays
9. Export!
```

**For Simple Edits:**
```
1. Load base texture
2. Add images without using masks
3. Position manually
4. Export!
```

### Performance Notes

- Masking adds minimal overhead
- Mask is processed once when loaded
- Real-time clipping is pixel-based and fast
- Large images (>2048px) may take a moment to clip

## Troubleshooting

**"No components found in mask"**
- Your mask might be all one color
- Ensure you used multiple distinct colors
- Check that colors are solid (no gradients or anti-aliasing)

**Image appears in wrong area**
- Wrong component selected
- Mask colors might not align with UV template
- Try reloading the mask

**Image doesn't appear at all**
- Selected component might be very small
- Check that opacity isn't set to 0
- Try clearing the mask to see the full image

**Mask overlay blocks my view**
- The overlay is semi-transparent
- It disappears when you deselect components
- Use "Clear Selection" to remove it

## Example Workflow

Here's a complete example of creating a custom AK-47 skin:

```
1. Create mask in GIMP:
   - Open ak-47.tga
   - New layer
   - Paint body parts: red for body, green for magazine, blue for stock
   - Save as "ak47_mask.png"

2. In Skin Editor:
   - Load weapon_rif_ak47.obj
   - Load ak-47.tga as base texture
   - Load ak47_mask.png as component mask
   - See 3 buttons: "Body/Main", "Magazine", "Stock"

3. Design the body:
   - Click "Body/Main" button
   - Add dragon_pattern.png
   - Resize and position on body
   - Add flames.png
   - Position on front of body

4. Design the magazine:
   - Click "Magazine" button
   - Add skull_logo.png
   - Center on magazine
   - Adjust opacity to 80%

5. Design the stock:
   - Click "Stock" button
   - Add wood_texture.png
   - Scale to cover stock area

6. Final touches:
   - Click "Clear Selection"
   - Add border_accent.png (full UV)
   - Position as needed

7. Export:
   - Click "Export Texture"
   - Save as my_ak47_skin.png
   - Click "Screenshot 3D View"
   - Save preview image
```

## Technical Details

### How Masking Works Internally

1. **Mask Loading**: Image is loaded and scaled to 1024x1024
2. **Color Detection**: Unique RGB values are extracted (ignoring transparent pixels)
3. **Binary Mask Creation**: When you select a component, a binary mask is created (255 = inside, 0 = outside)
4. **Image Clipping**: When you add an image, each pixel is checked against the mask
5. **Alpha Modification**: Pixels outside the mask get alpha = 0 (transparent)

### Mask Format Requirements

- **Any image format** (PNG, JPG, TGA, etc.)
- **Any size** (will be scaled to match canvas)
- **Colors**: Must have alpha > 128 to be detected
- **Minimum size**: 256x256 recommended
- **Maximum components**: No hard limit, but 10-15 is practical

### TGA Decoder Capabilities

Supports:
- ✅ Image Type 2 (Uncompressed RGB/RGBA)
- ✅ Image Type 3 (Uncompressed Grayscale)
- ✅ Image Type 10 (RLE Compressed RGB/RGBA)
- ✅ 16-bit, 24-bit, 32-bit pixel depths
- ✅ Top-down and bottom-up orientation
- ✅ Color map handling

Does not support:
- ❌ Image Type 1 (Color-mapped)
- ❌ Image Type 9 (RLE Grayscale)
- ❌ Exotic TGA extensions

## Questions?

- Check the main README.md for general usage
- See QUICKSTART.md for basic setup
- Open browser console (F12) to see detailed error messages

Happy skin designing! 🎨🔫

