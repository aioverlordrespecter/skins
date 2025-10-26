# 🎨 Simple FBX Skin Editor - Clean & Focused

## What This Does

This is a **completely revamped, simplified version** that focuses on one thing: **applying images to specific gun parts in FBX files**.

**No more complex features** - just the core functionality you need:
- ✅ Load FBX models
- ✅ Click gun parts to select them
- ✅ See UV wireframes
- ✅ Add images that map correctly
- ✅ Apply textures to specific parts

## How To Use

### Step 1: Load Your FBX Model
1. Click **"🎮 Load FBX Model"**
2. Select your `.fbx` file (like `AK47_PARTS.fbx`)
3. Wait for the model to load
4. You'll see the 3D gun on the right

### Step 2: Select A Gun Part
**Method 1: Click the 3D Model**
- Move your mouse over the gun in the right panel
- Click any part (it will turn green)
- The part name appears in the toolbar

**Method 2: Use Parts List**
- Click **"📋 Show List"** in the toolbar
- Click any part name in the popup
- Part gets selected automatically

### Step 3: Add Your Image
1. Make sure a part is selected (green highlight)
2. Click **"➕ Add Image"**
3. Choose your image file
4. Image appears on the UV canvas (left side)

### Step 4: Position Your Image
- **Drag** the image to move it
- **Resize** using corner handles
- **Align it** with the **cyan wireframe**
- The wireframe shows the exact shape of the selected part

### Step 5: See Result
- Texture automatically applies to the selected part
- Only that part gets the texture
- Other parts stay unchanged

## Visual Guide

```
┌─────────────────────────────────┐ ┌─────────────────────────────────┐
│         UV EDITOR                │ │         3D VIEWER               │
│                                 │ │                                 │
│  ┌─────────────────────────┐   │ │  ┌─────────────────────────┐   │
│  │   CYAN WIREFRAME        │   │ │  │   GREEN HIGHLIGHT       │   │
│  │   (part shape)          │   │ │  │   (selected part)       │   │
│  │                         │   │ │  │                         │   │
│  │  [YOUR IMAGE HERE]      │   │ │  │                         │   │
│  │                         │   │ │  │                         │   │
│  │  YELLOW BOX             │   │ │  │                         │   │
│  │  (UV bounds)            │   │ │  │                         │   │
│  └─────────────────────────┘   │ │  └─────────────────────────┘   │
└─────────────────────────────────┘ └─────────────────────────────────┘
```

## What Each Color Means

- **Cyan Lines**: UV wireframe of selected part
- **Yellow Dashed Box**: Bounding area where part's UVs live
- **Green Part**: Currently selected in 3D view
- **Gray Parts**: Other parts (not selected)

## Troubleshooting

### "Image appears in wrong place"
**Solution**: Drag the image to align with the cyan wireframe. The wireframe shows exactly where the texture will map on the 3D model.

### "Texture doesn't apply"
**Solution**: Make sure you have a part selected (green highlight) before clicking "Add Image".

### "Can't see the wireframe"
**Solution**: The part might not have UV coordinates. Try selecting a different part.

### "Model doesn't load"
**Solution**: Make sure it's a `.fbx` file. Check console for error messages.

## Technical Details

### How UV Mapping Works Here

1. **FBX Loading**: Model loads with separate parts (meshes)
2. **Part Selection**: Each mesh has its own material
3. **UV Display**: Part's UV coordinates drawn as cyan lines
4. **Image Placement**: You position image over the UV lines
5. **Texture Application**: Canvas exported as texture, applied to part's material

### Key Improvements

- **Unique Materials**: Each part gets its own material instance
- **No Material Sharing**: Textures can't bleed between parts
- **Clear Visual Feedback**: Wireframes show exactly where to place images
- **Automatic Scaling**: Model fits perfectly in viewport
- **Simple Interface**: No complex features to confuse the workflow

## Files Changed

- `skin_editor_simple.js` - New simplified editor (main logic)
- `index.html` - Cleaned up UI, removed complex features
- `SIMPLE_SKIN_EDITOR_README.md` - This guide

## Why This Version Works Better

The previous version had too many features competing:
- OBJ processing
- Mask creation
- Layer management
- Complex UV extraction
- Multiple workflow modes

This version focuses **only** on what you actually need: applying images to FBX gun parts with precise UV mapping.

**The image placement problem was caused by complex interactions between features. This clean version eliminates those conflicts.**

---

## Quick Test

1. Load `AK47_PARTS.fbx`
2. Click the pistol grip
3. Add an image
4. Position it over the cyan wireframe
5. See it appear on the grip only

**No more random placement!** 🎯
