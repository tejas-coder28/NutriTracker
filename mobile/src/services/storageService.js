import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

// Firestore field value size limit is ~1,048,487 bytes.
// We target well under that: 500 KB decoded byte size.
// The resulting base64 string will be ~667 KB, safely under the 1MB limit.
const MAX_DECODED_BYTES = 500 * 1024; // 500 KB

/**
 * Returns the DECODED byte size of a base64 image string.
 * This is what Firestore actually stores — it's the decoded binary size.
 */
export function getBase64SizeBytes(base64DataStr) {
  if (!base64DataStr) return 0;
  const rawBase64 = base64DataStr.replace(/^data:image\/\w+;base64,/, '');
  const padding = (rawBase64.match(/=/g) || []).length;
  return Math.floor((rawBase64.length * 3) / 4) - padding;
}

/**
 * Compress a food photo aggressively for Firestore storage.
 *
 * Multi-pass strategy (increasingly aggressive):
 *   Pass 1: 500px max-side, quality 50%
 *   Pass 2: 400px max-side, quality 40%
 *   Pass 3: 300px max-side, quality 30%
 *   Pass 4: 200px max-side, quality 20%
 *
 * After EACH pass, the decoded byte size is logged.
 * Returns a `data:image/jpeg;base64,...` string safely under MAX_DECODED_BYTES.
 * Throws a clear error message if all passes fail.
 */
export async function compressFoodPhoto(imageUri) {
  if (!imageUri) return null;

  // If already a data URI, check its size
  if (typeof imageUri === 'string' && imageUri.startsWith('data:image/')) {
    const existingSize = getBase64SizeBytes(imageUri);
    console.log(`[Storage] Input is data URI. Decoded size: ${(existingSize / 1024).toFixed(1)} KB`);
    if (existingSize <= MAX_DECODED_BYTES) {
      console.log('[Storage] Data URI already under limit — returning as-is.');
      return imageUri;
    }
    // On native we can't easily re-compress a data URI — reject it
    if (Platform.OS !== 'web') {
      throw new Error(
        `Photo is ${(existingSize / 1024).toFixed(0)} KB after compression, still over the 500 KB limit. ` +
        'Please use a lower resolution image.'
      );
    }
    // On web, fall through to canvas fallback below
  }

  // Aggressive multi-pass compression
  const passes = [
    { maxDim: 500, quality: 0.5 },
    { maxDim: 400, quality: 0.4 },
    { maxDim: 300, quality: 0.3 },
    { maxDim: 200, quality: 0.2 },
  ];

  for (let i = 0; i < passes.length; i++) {
    const { maxDim, quality } = passes[i];
    try {
      console.log(`[Storage] Compression pass ${i + 1}/${passes.length}: max ${maxDim}px, quality=${Math.round(quality * 100)}%`);

      // --- Step 1: Measure image dimensions ---
      let imgWidth = 4000; // pessimistic default (assume large camera photo)
      let imgHeight = 3000;

      try {
        // Use manipulateAsync with no actions and no base64 to just get dimensions cheaply
        const measured = await manipulateAsync(imageUri, [], {
          format: SaveFormat.JPEG,
          compress: 1.0,
          base64: false,
        });
        if (measured.width && measured.height) {
          imgWidth = measured.width;
          imgHeight = measured.height;
          console.log(`[Storage]   Measured: ${imgWidth}×${imgHeight}`);
        }
      } catch (measureErr) {
        console.warn(`[Storage]   Could not measure dimensions, using ${imgWidth}×${imgHeight} default:`, measureErr?.message || measureErr);
      }

      // --- Step 2: Build resize action ---
      const actions = [];
      const longestSide = Math.max(imgWidth, imgHeight);

      if (longestSide > maxDim) {
        if (imgWidth >= imgHeight) {
          // Landscape or square — resize by width
          actions.push({ resize: { width: maxDim } });
          console.log(`[Storage]   Resize: width → ${maxDim}px`);
        } else {
          // Portrait — resize by height
          actions.push({ resize: { height: maxDim } });
          console.log(`[Storage]   Resize: height → ${maxDim}px`);
        }
      } else {
        console.log(`[Storage]   Image is only ${longestSide}px — no resize needed, just quality reduction.`);
      }

      // --- Step 3: Apply compression and get base64 ---
      const result = await manipulateAsync(imageUri, actions, {
        compress: quality,
        format: SaveFormat.JPEG,
        base64: true,
      });

      if (!result || !result.base64 || result.base64.length < 10) {
        console.warn(`[Storage]   Pass ${i + 1} returned empty base64 — skipping.`);
        continue;
      }

      const dataUri = `data:image/jpeg;base64,${result.base64}`;
      const decodedBytes = getBase64SizeBytes(dataUri);

      console.log(
        `[Storage]   ✅ Pass ${i + 1} result: ${result.width}×${result.height}px | ` +
        `decoded=${(decodedBytes / 1024).toFixed(1)} KB | ` +
        `base64 string=${(result.base64.length / 1024).toFixed(1)} KB ` +
        `[limit: ${(MAX_DECODED_BYTES / 1024).toFixed(0)} KB decoded]`
      );

      if (decodedBytes <= MAX_DECODED_BYTES) {
        console.log(`[Storage] ✅ PASS ${i + 1} SUCCESS — safe to save to Firestore.`);
        return dataUri;
      } else {
        console.log(`[Storage] ⚠️  Pass ${i + 1} still ${(decodedBytes / 1024).toFixed(1)} KB — trying harder...`);
      }
    } catch (err) {
      console.warn(`[Storage] Pass ${i + 1} threw error:`, err?.message || err);
      // Continue to next pass
    }
  }

  // --- Web canvas fallback ---
  if (Platform.OS === 'web') {
    console.log('[Storage] Trying web canvas fallback (300px, quality 25%)...');
    try {
      const webResult = await compressImageWebCanvas(imageUri, 300, 0.25);
      const decodedBytes = getBase64SizeBytes(webResult);
      console.log(`[Storage] Canvas fallback: decoded=${(decodedBytes / 1024).toFixed(1)} KB`);
      if (decodedBytes <= MAX_DECODED_BYTES) {
        console.log('[Storage] ✅ Canvas fallback SUCCESS.');
        return webResult;
      }
    } catch (webErr) {
      console.warn('[Storage] Canvas fallback error:', webErr?.message || webErr);
    }
  }

  // All passes exhausted
  throw new Error(
    'Photo could not be compressed to under 500 KB. Please use a smaller or lower-resolution image.'
  );
}

/**
 * Web Canvas fallback — only called on Platform.OS === 'web'.
 */
function compressImageWebCanvas(imageUri, maxDim, quality) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let { width, height } = img;
      if (width >= height && width > maxDim) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else if (height > width && height > maxDim) {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = (e) => reject(new Error('Canvas image load failed: ' + JSON.stringify(e)));
    img.src = imageUri;
  });
}

/**
 * Legacy alias for backwards compatibility.
 */
export async function uploadFoodPhoto(imageUri) {
  return await compressFoodPhoto(imageUri);
}
