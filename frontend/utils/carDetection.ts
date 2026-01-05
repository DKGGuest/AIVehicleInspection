import { analyzeImageQuality, analyzeBrightness, analyzeBlur, hasSubstantialContent } from './imageAnalysis';

export type CarAngle = 'Front' | 'Rear' | 'Side';

interface FramingCheck {
  isOptimal: boolean;
  hint: string;
  score: number; // 0-25
}

interface LightingCheck {
  isOptimal: boolean;
  hint: string;
  score: number; // 0-25
  brightness: number;
  hasGlare: boolean;
  hasShadows: boolean;
}

interface QualityCheck {
  isOptimal: boolean;
  hint: string;
  score: number; // 0-25
  blur: number;
}

export interface DetectionResult {
  carDetected: boolean;
  angle?: CarAngle;
  angleScore: number; // 0-25
  framing?: FramingCheck;
  lighting?: LightingCheck;
  quality?: QualityCheck;
  totalScore: number;
  isAccepted: boolean;
  hint: string;
}

const QUALITY_THRESHOLD = 65;

// Simulate ML car detection - in production, use TensorFlow Lite
export async function detectCar(imageUri: string, expectedAngle?: CarAngle): Promise<DetectionResult> {
  try {
    const qualityAnalysis = await analyzeImageQuality(imageUri);

    if (!qualityAnalysis.details.hasContent || qualityAnalysis.quality < 60) {
      return {
        carDetected: false,
        totalScore: 0,
        angleScore: 0,
        isAccepted: false,
        hint: 'Photo is too unclear or not a car. Please take a clear photo of the car.',
      };
    }

    const angle = await detectAngle(imageUri);

    if (expectedAngle && angle !== expectedAngle) {
      const angleNames: Record<CarAngle, string> = {
        'Front': 'Front',
        'Rear': 'Back/Rear',
        'Side': 'Side',
      };

      return {
        carDetected: false,
        totalScore: 0,
        angleScore: 0,
        isAccepted: false,
        hint: `Wrong angle! Expected ${angleNames[expectedAngle]}, but detected ${angleNames[angle]}. Please take a photo from the correct angle.`,
      };
    }

    const angleScore = 25;

    const framing = await checkFraming(imageUri);
    const lighting = await checkLighting(imageUri);
    const quality = await checkQuality(imageUri);

    const totalScore = angleScore + framing.score + lighting.score + quality.score;

    const isAccepted = totalScore >= QUALITY_THRESHOLD;

    let hint = '';
    if (!isAccepted) {
      if (!framing.isOptimal) hint = framing.hint;
      else if (!lighting.isOptimal) hint = lighting.hint;
      else if (!quality.isOptimal) hint = quality.hint;
      else hint = `Photo quality is too low. Score: ${totalScore.toFixed(0)}/100 (need ${QUALITY_THRESHOLD}/100)`;
    } else {
      hint = `Perfect! Quality Score: ${totalScore.toFixed(0)}/100`;
    }

    return {
      carDetected: isAccepted,
      angle,
      angleScore,
      framing,
      lighting,
      quality,
      totalScore,
      isAccepted,
      hint,
    };
  } catch (error) {
    console.log('Detection error:', error);
    return {
      carDetected: true,
      angle: 'Front',
      angleScore: 20,
      framing: { isOptimal: true, hint: 'OK', score: 20 },
      lighting: { isOptimal: true, hint: 'OK', score: 20, brightness: 0.5, hasGlare: false, hasShadows: false },
      quality: { isOptimal: true, hint: 'OK', score: 20, blur: 0 },
      totalScore: 80,
      isAccepted: false,
      hint: 'Please ensure good angle, framing, and lighting.',
    };
  }
}

async function detectAngle(imageUri: string): Promise<CarAngle> {
  try {
    const analysis = await analyzeImageQuality(imageUri);

    const brightness = 0.5;
    const quality = analysis.quality || 50;

    if (quality > 70 && brightness > 0.45 && brightness < 0.75) {
      const random = Math.random();

      if (random < 0.5) return 'Front';
      if (random < 0.85) return 'Rear';
      return 'Side';
    } else if (quality > 50) {
      const random = Math.random();
      if (random < 0.35) return 'Front';
      if (random < 0.7) return 'Rear';
      return 'Side';
    } else {
      const random = Math.random();
      if (random < 0.33) return 'Front';
      if (random < 0.66) return 'Rear';
      return 'Side';
    }
  } catch (error) {
    console.log('Angle detection error, defaulting to Front:', error);
    return 'Front';
  }
}

async function checkFraming(imageUri: string): Promise<FramingCheck> {
  try {
    const analysis = await analyzeImageQuality(imageUri);

    if (analysis.details.resolution === 'low') {
      return {
        isOptimal: false,
        hint: 'Move closer to the car for better detail and clarity.',
        score: 10,
      };
    } else if (analysis.quality < 50) {
      return {
        isOptimal: false,
        hint: 'Ensure the car fills most of the frame. Move closer.',
        score: 12,
      };
    } else {
      return {
        isOptimal: true,
        hint: 'Framing perfect.',
        score: 24,
      };
    }
  } catch (error) {
    return { isOptimal: false, hint: 'Could not analyze framing.', score: 10 };
  }
}

async function checkLighting(imageUri: string): Promise<LightingCheck> {
  try {
    const brightAnalysis = await analyzeBrightness(imageUri);

    let score = 24;
    let hint = 'Lighting optimal.';
    let isOptimal = true;
    let hasGlare = false;
    let hasShadows = false;

    if (brightAnalysis.isTooDark) {
      hint = 'Image is too dark. Move to brighter area with good light.';
      score = 8;
      hasShadows = true;
      isOptimal = false;
    } else if (brightAnalysis.isTooLight) {
      hint = 'Too much glare/reflection. Move away from bright light.';
      score = 8;
      hasGlare = true;
      isOptimal = false;
    } else if (brightAnalysis.brightness < 0.4) {
      hint = 'Lighting too low. Take photo in daylight or well-lit area.';
      score = 12;
      hasShadows = true;
      isOptimal = false;
    } else if (brightAnalysis.brightness > 0.8) {
      hint = 'Too bright/overexposed. Reduce glare and shadows.';
      score = 12;
      hasGlare = true;
      isOptimal = false;
    } else {
      score = 24;
      isOptimal = true;
    }

    return {
      isOptimal,
      hint,
      score,
      brightness: brightAnalysis.brightness,
      hasGlare,
      hasShadows,
    };
  } catch (error) {
    return { isOptimal: false, hint: 'Could not analyze lighting.', score: 10, brightness: 0.5, hasGlare: false, hasShadows: false };
  }
}

async function checkQuality(imageUri: string): Promise<QualityCheck> {
  try {
    const blurAnalysis = await analyzeBlur(imageUri);
    const qualityAnalysis = await analyzeImageQuality(imageUri);

    let score = 24;
    let hint = 'Image quality excellent.';
    let isOptimal = true;

    if (blurAnalysis.isBlurry) {
      hint = 'Image is blurry. Hold camera steady and retake photo.';
      score = 5;
      isOptimal = false;
    } else if (blurAnalysis.blur > 0.5) {
      hint = 'Motion blur detected. Hold camera still when taking photo.';
      score = 10;
      isOptimal = false;
    } else if (qualityAnalysis.quality < 45) {
      hint = 'Image quality too low. Use higher resolution camera.';
      score = 8;
      isOptimal = false;
    } else if (qualityAnalysis.quality < 55) {
      hint = 'Image is not clear enough. This is not a car photo.';
      score = 12;
      isOptimal = false;
    } else {
      score = 24;
      isOptimal = true;
    }

    return {
      isOptimal,
      hint,
      score,
      blur: blurAnalysis.blur,
    };
  } catch (error) {
    return { isOptimal: true, hint: 'Quality OK.', score: 20, blur: 0 };
  }
}

// Get expected angle based on photo number
export function getExpectedAngle(photoNumber: number): CarAngle {
  const angleMap: Record<number, CarAngle> = {
    0: 'Front',      // Front view
    1: 'Rear',       // Back view
    2: 'Side',       // Left Side
    3: 'Side',       // Right Side
    4: 'Front',      // Interior 1
    5: 'Front',      // Interior 2
    6: 'Front',      // Dashboard
    7: 'Front',      // Engine
    8: 'Rear',       // Trunk
  };

  return angleMap[photoNumber] || 'Front';
}

// Photo labels with expected angles
export const PHOTO_CONFIG = [
  { label: 'Front', expectedAngle: 'Front' as CarAngle },
  { label: 'Back', expectedAngle: 'Rear' as CarAngle },
  { label: 'Left Side', expectedAngle: 'Side' as CarAngle },
  { label: 'Right Side', expectedAngle: 'Side' as CarAngle },
  { label: 'Interior 1', expectedAngle: 'Front' as CarAngle },
  { label: 'Interior 2', expectedAngle: 'Front' as CarAngle },
  { label: 'Dashboard', expectedAngle: 'Front' as CarAngle },
  { label: 'Engine', expectedAngle: 'Front' as CarAngle },
  { label: 'Trunk', expectedAngle: 'Rear' as CarAngle },
];
