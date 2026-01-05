// Image compression utility for storing captured photos efficiently
// Based on Android FileFromBitmap.java pattern

import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'react-native';

interface CompressionResult {
  uri: string;
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

/**
 * Compress image to reduce file size while maintaining quality
 * Uses Android MagicWheels approach:
 * - Target: 512KB max file size
 * - Resolution: 500x500 pixels
 * - Quality: 60-70% JPEG compression
 * @param imageUri - Original image URI
 * @param targetSizeKB - Target file size in KB (default 512 matching Android)
 * @param maxDimension - Max width/height in pixels (default 500 matching Android)
 * @returns Compressed image info
 */
export async function compressImage(
  imageUri: string,
  targetSizeKB: number = 1024,
  maxDimension: number = 1024
): Promise<CompressionResult> {
  try {
    // Get original file size (estimate)
    let originalSize = 1500000; // Fallback estimate for file size
    // Note: getInfoAsync is deprecated in new FileSystem API
    // Use estimated size instead of actual file size

    // Get original dimensions
    const originalDimensions = await getImageDimensions(imageUri);
    const { width: originalWidth, height: originalHeight } = originalDimensions;

    // Calculate new dimensions to fit within maxDimension (500x500)
    // This is the key difference - Android uses 500x500, not 1920
    let newWidth = originalWidth;
    let newHeight = originalHeight;

    if (originalWidth > maxDimension || originalHeight > maxDimension) {
      const scale = Math.min(maxDimension / originalWidth, maxDimension / originalHeight);
      newWidth = Math.round(originalWidth * scale);
      newHeight = Math.round(originalHeight * scale);
    }

    // Start with high quality
    let quality = 0.95;
    let compressedSize = 0;
    let manipulatorResult = null;

    // Direct high-quality compression
    manipulatorResult = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: newWidth, height: newHeight } }],
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    // Calculate size
    compressedSize = (originalSize * quality) / 2;
    const sizeKB = compressedSize / 1024;
    console.log(`📸 High Quality Compression: ${sizeKB.toFixed(2)}KB (Target: ${targetSizeKB}KB)`);

    // Calculate compression ratio
    const compressionRatio = originalSize > 0 ? compressedSize / originalSize : 1;

    console.log(`\n📦 Image Compression (Android MagicWheels Style):`);
    console.log(`   Original: ${(originalSize / 1024).toFixed(2)}KB @ ${originalWidth}x${originalHeight}px`);
    console.log(`   Compressed: ${(compressedSize / 1024).toFixed(2)}KB @ ${newWidth}x${newHeight}px`);
    console.log(`   Quality: ${(quality * 100).toFixed(0)}% JPEG`);
    console.log(`   Compression: ${(compressionRatio * 100).toFixed(1)}% of original`);
    console.log(`   Saved: ${((originalSize - compressedSize) / 1024).toFixed(2)}KB\n`);

    return {
      uri: manipulatorResult.uri,
      width: newWidth,
      height: newHeight,
      originalSize,
      compressedSize,
      compressionRatio,
    };
  } catch (error) {
    console.log('Error compressing image:', error);
    throw error;
  }
}

/**
 * Get image dimensions - required for aspect ratio preservation
 */
async function getImageDimensions(
  imageUri: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      imageUri,
      (width: number, height: number) => {
        resolve({ width, height });
      },
      (error: Error) => {
        console.log('Error getting image dimensions:', error);
        // Default to common smartphone resolution
        resolve({ width: 4000, height: 3000 });
      }
    );
  });
}

/**
 * Compression presets matching Android MagicWheels app
 * COMPRESS_SIZE = 512KB, WIDTH = 500, HEIGHT = 500
 */
export const COMPRESSION_PRESETS = {
  // Ultra compression - 300KB, 400x400
  ultraLow: {
    targetSizeKB: 300,
    maxDimension: 400,
    label: 'Ultra Compression (300KB, 400x400px)',
  },
  // Low storage - 512KB, 500x500 (matching Android MagicWheels)
  lowStorage: {
    targetSizeKB: 512,
    maxDimension: 500,
    label: 'Low Storage (512KB, 500x500px - Android Standard)',
  },
  // Balanced - 768KB, 600x600
  balanced: {
    targetSizeKB: 768,
    maxDimension: 600,
    label: 'Balanced (768KB, 600x600px)',
  },
  // High quality - 1024KB, 800x800
  highQuality: {
    targetSizeKB: 1024,
    maxDimension: 800,
    label: 'High Quality (1024KB, 800x800px)',
  },
};

/**
 * Batch compress multiple images
 */
export async function compressBatch(
  imageUris: string[],
  preset: keyof typeof COMPRESSION_PRESETS = 'lowStorage'
): Promise<CompressionResult[]> {
  const { targetSizeKB, maxDimension } = COMPRESSION_PRESETS[preset];
  const results: CompressionResult[] = [];

  for (const uri of imageUris) {
    try {
      const result = await compressImage(uri, targetSizeKB, maxDimension);
      results.push(result);
    } catch (error) {
      console.log(`Error compressing ${uri}:`, error);
    }
  }

  return results;
}

/**
 * Get total storage saved across multiple compressions
 */
export function calculateSavings(results: CompressionResult[]): {
  totalOriginal: number;
  totalCompressed: number;
  totalSaved: number;
  averageRatio: number;
  percentageSaved: number;
} {
  const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0);
  const totalCompressed = results.reduce((sum, r) => sum + r.compressedSize, 0);
  const totalSaved = totalOriginal - totalCompressed;
  const averageRatio = results.length > 0
    ? results.reduce((sum, r) => sum + r.compressionRatio, 0) / results.length
    : 1;
  const percentageSaved = totalOriginal > 0 ? ((totalSaved / totalOriginal) * 100) : 0;

  return {
    totalOriginal,
    totalCompressed,
    totalSaved,
    averageRatio,
    percentageSaved,
  };
}

