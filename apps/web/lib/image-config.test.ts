import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getImageExtension, resolveImagePath, getPublicImagePath } from './image-config';

describe('image-config', () => {
  const originalEnv = process.env.NEXT_PUBLIC_IMAGE_EXTENSION;

  afterEach(() => {
    // Restore original environment
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_IMAGE_EXTENSION = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_IMAGE_EXTENSION;
    }
  });

  describe('getImageExtension', () => {
    it('should return .jpg as default', () => {
      delete process.env.NEXT_PUBLIC_IMAGE_EXTENSION;
      expect(getImageExtension()).toBe('.jpg');
    });

    it('should return configured extension', () => {
      process.env.NEXT_PUBLIC_IMAGE_EXTENSION = '.png';
      expect(getImageExtension()).toBe('.png');
    });

    it('should add dot if missing', () => {
      process.env.NEXT_PUBLIC_IMAGE_EXTENSION = 'webp';
      expect(getImageExtension()).toBe('.webp');
    });
  });

  describe('resolveImagePath', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_IMAGE_EXTENSION = '.jpg';
    });

    it('should return null for undefined', () => {
      expect(resolveImagePath(undefined)).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(resolveImagePath('')).toBeNull();
    });

    it('should handle extension-less bc-graphics paths', () => {
      const result = resolveImagePath('bc-graphics/figure-a-1-1-1-1-6-of-division-a');
      expect(result).toBe('/bc-graphics/figure-a-1-1-1-1-6-of-division-a.jpg');
    });

    it('should handle extension-less graphics paths', () => {
      const result = resolveImagePath('graphics/eg/009/eg00907b');
      expect(result).toBe('/graphics/eg/009/eg00907b.jpg');
    });

    it('should strip legacy .eps extension', () => {
      const result = resolveImagePath('bc-graphics/figure-a-1-1-1-1-6.eps');
      expect(result).toBe('/bc-graphics/figure-a-1-1-1-1-6.jpg');
    });

    it('should handle absolute paths with extension', () => {
      const result = resolveImagePath('/custom/path/image.png');
      expect(result).toBe('/custom/path/image.png');
    });

    it('should add extension to absolute paths without extension', () => {
      const result = resolveImagePath('/custom/path/image');
      expect(result).toBe('/custom/path/image.jpg');
    });

    it('should use configured extension', () => {
      process.env.NEXT_PUBLIC_IMAGE_EXTENSION = '.png';
      const result = resolveImagePath('bc-graphics/figure-a-1-1-1-1-6-of-division-a');
      expect(result).toBe('/bc-graphics/figure-a-1-1-1-1-6-of-division-a.png');
    });

    it('should handle paths with leading slash', () => {
      const result = resolveImagePath('/bc-graphics/figure-a-1-1-1-1-6-of-division-a');
      expect(result).toBe('/bc-graphics/figure-a-1-1-1-1-6-of-division-a.jpg');
    });
  });

  describe('getPublicImagePath', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_IMAGE_EXTENSION = '.jpg';
    });

    it('should return null for undefined', () => {
      expect(getPublicImagePath(undefined)).toBeNull();
    });

    it('should remove leading slash', () => {
      const result = getPublicImagePath('bc-graphics/figure-a-1-1-1-1-6-of-division-a');
      expect(result).toBe('bc-graphics/figure-a-1-1-1-1-6-of-division-a.jpg');
    });
  });
});
