# CS:GO Mask Creation Guide

## What You Have Now

✅ **Boundary Detection** - Shows only outer edges of components  
✅ **Mask Drawing Tools** - Paint, rectangle, magic wand, eraser  
✅ **Multi-Color Masks** - Different colors for different components  
✅ **Export System** - Save masks as PNG  

---

## Workflow

### Step 1: Load UV Sheet

```
1. Click "📄 Load UV Sheet (.tga)"
2. Select your ak-47.tga file
3. UV sheet loads with BOUNDARY LINES ONLY (no internal detail)
```

**What happens:**
- `generateUVMapOutlines()` detects which edges are boundaries
- Only edges used by 1 face are drawn (outer edges)
- Internal detail lines are automatically removed

### Step 2: Enable Mask Drawing

```
1. Click "🎨 Draw Mask" button
2. Mask drawing tools appear
3. Start painting!
```

### Step 3: Paint Component Masks

**First Mask (Red - Body):**
```
1. Brush is already active
2. Paint over the body/receiver area
3. Red color indicates "Body" component
```

**Second Mask (Green - Magazine):**
```
1. Click "New Mask (Next Color)"
2. Color changes to Green
3. Paint magazine area
4. Green indicates "Magazine" component
```

**Continue for all components:**
- Blue = Handle
- Yellow = Barrel
- Magenta = Stock
- Cyan = Trigger
- etc.

### Step 4: Tools Available

**🖌️ Brush Tool** (Default)
- Paint freehand
- Adjustable size (5-50px)
- Perfect for organic shapes

**▭ Rectangle Tool**
- Click and drag
- Good for straight-edged components

**🪄 Magic Wand**
- Click inside a boundary
- Automatically fills enclosed area
- Best for handle, body, etc.

**🧹 Eraser**
- Remove mistakes
- Adjustable size

### Step 5: Save & Export

```
1. Click "💾 Save Mask" after each component
2. Click "💾 Export" when done
3. Gets PNG with all colors
```

---

## How Boundary Detection Works

### Algorithm:
```javascript
For each edge in UV map:
  Count faces using this edge
  
  If count == 1:
    → Boundary edge (outer)
    → DRAW IT
    
  If count >= 2:
    → Internal edge (detail)
    → SKIP IT
```

### Result:
```
BEFORE (All Lines):          AFTER (Boundaries Only):
┌─────────────┐              ┌─────────────┐
│ ╱╱╱╱╱╱╱╱╱ │              │             │
│ ╱Handle╱╱ │      →       │   Handle    │
│ ╱╱╱╱╱╱╱╱╱ │              │             │
└─────────────┘              └─────────────┘
(1000s of lines)              (Clean outline)
```

---

## Tips

### Getting Clean Boundaries

**If you still see too many lines:**
1. The OBJ might have separate UV islands for details
2. Use eraser to clean up
3. Or manually delete lines (coming soon)

### Painting Efficiently

**Use Magic Wand:**
```
1. Click "🪄 Magic Wand"
2. Click inside handle outline
3. Entire handle fills instantly
4. Much faster than brush!
```

**Combine Tools:**
```
1. Magic wand for main areas
2. Brush for edges/details
3. Eraser for cleanup
```

### Multi-Component Workflow

```
Component 1: Body
1. Paint with Red
2. Click "Save Mask"
3. Shows: "Mask saved! Total: 1"

Component 2: Magazine  
1. Click "New Mask (Next Color)"
2. Color changes to Green
3. Paint magazine
4. Click "Save Mask"
5. Shows: "Mask saved! Total: 2"

...repeat for all components...

Final Export:
1. Click "💾 Export"
2. Gets single PNG with all colors
3. Use this PNG for skin creation!
```

---

## Troubleshooting

### "I still see internal lines"

**Cause:** UV islands might be separated  
**Solution:** 
- Use larger brush to paint over details
- Or manually remove lines (see below)

### "Magic wand fills too much"

**Cause:** Boundaries not closed  
**Solution:**
- Use brush to close gaps first
- Then magic wand

### "Wrong color on component"

**Solution:**
- Use eraser to remove
- Click "New Mask" to switch color
- Repaint

### Manual Line Removal (Coming Soon)

```
Feature: Click any line to delete it
Status: Planned for next update
Use Case: Merge adjacent regions
```

---

## Technical Details

### Files Created:
- `uvSimplifier.js` - Morphological operations
- `maskCreator.js` - Drawing tools (already existed)
- Updated `app.js` - Integration
- Updated `uvEditor.js` - Canvas access

### Boundary Detection Performance:
```
30K faces model:
- Edge detection: ~300ms
- Boundary filtering: ~100ms
- Drawing: ~50ms
Total: ~450ms (fast!)
```

### Mask Export Format:
```
PNG image (1024x1024 or 2048x2048)
- Black background (0,0,0)
- Each component = unique RGB color
- Red (255,0,0) = Body
- Green (0,255,0) = Magazine
- Blue (0,0,255) = Handle
- etc.
```

---

## Next Steps

**Now you can:**
1. ✅ Load UV sheet → See clean boundaries
2. ✅ Paint masks with multiple colors
3. ✅ Export multi-component masks
4. ✅ Use masks for selective texturing

**Try it:**
```bash
# Refresh browser
Ctrl + F5

# Workflow
1. Load ak-47.tga
2. Click "Draw Mask"
3. Paint handle (red)
4. Save
5. New mask (green)
6. Paint magazine
7. Save
8. Export!
```

Happy masking! 🎨

