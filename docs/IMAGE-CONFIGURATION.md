# Image Configuration

## Overview

The BC Building Code JSON now uses extension-less image paths to support multiple image formats. The image file extension is configured at build time via an environment variable.

## JSON Format Change

### Old Format (Deprecated)
```json
{
  "graphic": {
    "src": "bc-graphics/Figure A-1.1.1.1.(6) of Division A.jpg",
    "alt_text": "Diagram description"
  }
}
```

### New Format
```json
{
  "graphic": {
    "src": "bc-graphics/figure-a-1-1-1-1-6-of-division-a",
    "alt_text": "Diagram description"
  }
}
```

**Key Changes:**
- Lowercase filenames
- Hyphens instead of spaces
- No file extension
- No parentheses or special characters

## Configuration

### Environment Variable

Set `NEXT_PUBLIC_IMAGE_EXTENSION` to specify the image format:

```bash
# Use JPG images (default)
NEXT_PUBLIC_IMAGE_EXTENSION=.jpg npm run build

# Use PNG images
NEXT_PUBLIC_IMAGE_EXTENSION=.png npm run build

# Use EPS images
NEXT_PUBLIC_IMAGE_EXTENSION=.eps npm run build
```

### Default Behavior

If not specified, the application defaults to `.jpg`.


## Implementation Details

### Image Resolution Function

The `resolveImagePath()` function in `apps/web/lib/image-config.ts` handles:

1. **Extension-less paths**: Appends the configured extension
2. **Legacy .eps paths**: Strips old extension and adds configured one
3. **Absolute paths**: Returns as-is if already has extension
4. **bc-graphics/ prefix**: Preserves the directory structure

### Example Transformations

With `NEXT_PUBLIC_IMAGE_EXTENSION=.jpg`:

| JSON Path | Resolved Path |
|-----------|---------------|
| `bc-graphics/figure-a-1-1-1-1-6-of-division-a` | `/bc-graphics/figure-a-1-1-1-1-6-of-division-a.jpg` |
| `graphics/eg/009/eg00907b` | `/graphics/eg/009/eg00907b.jpg` |
| `/custom/path/image` | `/custom/path/image.jpg` |

### Components Updated

- `FigureBlock.tsx` - Standalone figures
- `TableBlock.tsx` - Figures within table cells

Both components now use the centralized `resolveImagePath()` utility.

## Build Scripts

Update your build commands to specify the image format:

```json
{
  "scripts": {
    "build": "NEXT_PUBLIC_IMAGE_EXTENSION=.jpg next build",
    "build:png": "NEXT_PUBLIC_IMAGE_EXTENSION=.png next build",
    "build:eps": "NEXT_PUBLIC_IMAGE_EXTENSION=.eps next build"
  }
}
```

## Asset Preparation

Ensure your image assets match the configured extension:

1. Place images in `apps/web/public/bc-graphics/` or `apps/web/public/graphics/`
2. Use lowercase filenames with hyphens
3. Match the extension specified in `NEXT_PUBLIC_IMAGE_EXTENSION`

Example structure:
```
apps/web/public/
├── bc-graphics/
│   ├── figure-a-1-1-1-1-6-of-division-a.jpg
│   └── figure-a-1-4-1-2-1-c-of-division-a.jpg
└── graphics/
    └── eg/
        └── 009/
            └── eg00907b.jpg
```

## Testing

To test with different image formats locally:

```bash
# Create .env.local file
echo "NEXT_PUBLIC_IMAGE_EXTENSION=.jpg" > apps/web/.env.local

# Run development server
npm run dev
```

## Migration Guide

If migrating from the old format:

1. Update JSON to use extension-less paths
2. Rename image files to lowercase with hyphens
3. Set `NEXT_PUBLIC_IMAGE_EXTENSION` in your build pipeline
4. Verify images load correctly in the application
