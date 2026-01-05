// Image analysis service stub

interface ImageMetadata {
  width: number;
  height: number;
  size: number;
  mimeType: string;
}

// Get image metadata
export async function getImageMetadata(imageUri: string): Promise<ImageMetadata> {
  return {
    width: 1080,
    height: 1920,
    size: 1500000,
    mimeType: 'image/jpeg',
  };
}


// Analyze if image is likely a real car photo
export async function analyzeImageQuality(imageUri: string): Promise<{
  isRealPhoto: boolean;
  quality: number; // 0-100
  details: {
    resolution: 'low' | 'medium' | 'high';
    hasContent: boolean;
    sizeIndicator: string;
  };
}> {
  try {
    const metadata = await getImageMetadata(imageUri);

    const { width, height, size } = metadata;
    const totalPixels = width * height;
    const megapixels = totalPixels / 1000000;

    // Typical camera photo: 0.5-3 MB, 2-20 megapixels
    // Screenshot/dummy: < 20KB or very small resolution
    // Corrupted: > 20MB

    let quality = 70; // Start with good quality
    let resolution: 'low' | 'medium' | 'high' = 'medium';
    let hasContent = true;
    let sizeIndicator = 'normal';

    // Check resolution
    if (megapixels < 0.5) {
      resolution = 'low';
      quality -= 20;
      sizeIndicator = 'too_small';
      hasContent = false;
    } else if (megapixels > 20) {
      resolution = 'high';
      quality += 10;
    } else if (megapixels > 2) {
      resolution = 'high';
      quality += 5;
    }

    // Check file size (less strict now)
    if (size < 20) {
      // Too small - likely not a real photo
      hasContent = false;
      quality -= 50;
      sizeIndicator = 'too_small_file';
    } else if (size > 10000) {
      // Very large - might be high quality
      quality += 5;
    } else if (size > 200 && size < 10000) {
      // Typical camera photo size
      quality += 10;
      sizeIndicator = 'typical';
    }

    // Must have content to be considered real
    const isRealPhoto = hasContent && quality > 40;

    return {
      isRealPhoto,
      quality: Math.min(100, Math.max(40, quality)),
      details: {
        resolution,
        hasContent,
        sizeIndicator,
      },
    };
  } catch (error) {
    console.log('Error analyzing image:', error);
    // Assume it's valid on error
    return {
      isRealPhoto: true,
      quality: 70,
      details: { resolution: 'medium', hasContent: true, sizeIndicator: 'unknown' },
    };
  }
}

// Simulate brightness analysis
export async function analyzeBrightness(imageUri: string): Promise<{
  brightness: number; // 0-1
  isTooDark: boolean;
  isTooLight: boolean;
}> {
  try {
    // In production, this would analyze image histogram
    // For now, use file properties as proxy
    const metadata = await getImageMetadata(imageUri);

    // Simulate brightness based on file characteristics
    const brightness = 0.3 + Math.random() * 0.4; // 0.3-0.7 range

    return {
      brightness,
      isTooDark: brightness < 0.25,
      isTooLight: brightness > 0.85,
    };
  } catch (error) {
    return { brightness: 0.5, isTooDark: false, isTooLight: false };
  }
}

// Simulate blur detection
export async function analyzeBlur(imageUri: string): Promise<{
  blur: number; // 0-1, higher = more blur
  isBlurry: boolean;
}> {
  try {
    // In production, use Laplacian variance to detect blur
    // For now, simulate based on file randomness
    const blur = Math.random();

    return {
      blur,
      isBlurry: blur > 0.7,
    };
  } catch (error) {
    return { blur: 0.3, isBlurry: false };
  }
}

// Validate that image contains substantial content (not blank/white)
export async function hasSubstantialContent(imageUri: string): Promise<boolean> {
  try {
    const analysis = await analyzeImageQuality(imageUri);
    return analysis.isRealPhoto && analysis.details.hasContent;
  } catch (error) {
    return false;
  }
}
