import * as FileSystem from 'expo-file-system/legacy';

import { GEMINI_API_KEY } from './config';

const USE_DEMO_MODE = false;

export interface GeminiAnalysisResult {
  hasDamage: boolean;
  damageType: string;
  severity: 'none' | 'minor' | 'moderate' | 'severe';
  description: string;
  recommendations: string[];
  imageComplete: boolean;
  completenessNote?: string;
}

/**
 * Convert image file to base64 string for Gemini API
 */
async function imageToBase64(imageUri: string): Promise<string> {
  try {
    console.log('Converting image to base64:', imageUri);

    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: 'base64',
    });

    if (!base64 || base64.length === 0) {
      throw new Error('Image conversion returned empty result');
    }

    console.log('Image converted to base64, length:', base64.length);
    return base64;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Analyze car image using Google Gemini AI for damage detection
 * @param imageUri - URI of the car image to analyze
 * @returns Analysis result with damage information
 */
export async function analyzeCarDamageWithGemini(imageUri: string, expectedAngle: string = "Car View"): Promise<GeminiAnalysisResult> {
  try {
    if (!GEMINI_API_KEY || GEMINI_API_KEY.includes('YOUR_GOOGLE_API_KEY')) {
      console.error('Gemini API key not configured.');
      throw new Error(
        'Gemini API key not configured.'
      );
    }

    if (USE_DEMO_MODE) {
      console.log('DEMO MODE - Returning simulated analysis');

      const hasDamage = Math.random() < 0.5;

      const mockDamageTypes = [
        'Minor dents on front bumper',
        'Scratches on door panel',
        'Crease on fender',
        'Impact damage on hood',
        'Side mirror damage',
      ];

      const mockSeverities: Array<'none' | 'minor' | 'moderate' | 'severe'> = ['none', 'minor', 'moderate', 'severe'];

      return {
        hasDamage: hasDamage,
        damageType: hasDamage ? mockDamageTypes[Math.floor(Math.random() * mockDamageTypes.length)] : 'None',
        severity: hasDamage ? mockSeverities[Math.floor(Math.random() * (mockSeverities.length - 1)) + 1] : 'none',
        description: hasDamage
          ? `Simulated damage detected: ${Math.random() > 0.5 ? 'Visible dents' : 'Surface damage'} found during inspection`
          : 'Simulated analysis: No visible damage detected. Vehicle appears to be in good condition.',
        recommendations: hasDamage
          ? ['Get professional inspection', 'Check insurance coverage', 'Document damage with photos']
          : ['Regular maintenance recommended', 'Keep protective coating updated'],
        imageComplete: true,
      };
    }

    console.log('Analyzing car image with Gemini AI...');
    console.log('Using configured API Key');

    const base64 = await imageToBase64(imageUri);

    const payload = {
      contents: [
        {
          parts: [
            {
              text: `You are an expert vehicle inspector with 20 years of experience.
TARGET VIEW: ${expectedAngle}
Your goal is to inspect this image and report back to the customer in a professional, natural, and human tone.

INSTRUCTIONS:
0. FIRST, check if this image shows the "${expectedAngle}". If it looks like a completely different angle, FAIL it. Set "imageComplete": false.
1. Look for dents, scratches, misalignment, and scuffs.
2. Be critical but fair. "Clean" cars are rare.
3. **CRITICAL: Write the 'description' as if you are talking to the car owner.** 
   - BAD: "Damage detected on door panel of severity moderate."
   - GOOD: "I noticed a nasty dent on the door panel that looks like a parking lot door ding. It's quite visible."
   - GOOD: "The paint looks pristine here, no issues found."
   - Avoid robotic JSON-speak in the description field.

 Respond in this exact JSON format (ONLY JSON, no other text):
{
  "hasDamage": boolean,
  "damageType": "Short summary (e.g. 'Deep Scratch')",
  "severity": "none|minor|moderate|severe",
  "description": "Your human-like observation of the issue.",
  "recommendations": ["recommendation 1", "recommendation 2"],
  "imageComplete": true|false,
  "completenessNote": "If rejected, explain why naturally"
}

If image is completely blank or corrupted, set hasDamage to false.`,
            },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: base64,
              },
            },
          ],
        },
      ],
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`;
    console.log('Calling Gemini API (gemini-2.0-flash-exp)...');

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('API Error:', response.status, errorData);
      throw new Error(`Gemini API request failed with status ${response.status}`);
    }

    const data = await response.json();

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response format from Gemini API');
    }

    const responseText = data.candidates[0].content.parts[0].text;
    console.log('Raw AI Response:', responseText);

    let cleanedText = responseText;
    if (cleanedText.includes('```')) {
      cleanedText = cleanedText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
    }

    const analysisResult = JSON.parse(cleanedText);

    console.log('Analysis Complete:', analysisResult);

    return analysisResult as GeminiAnalysisResult;
  } catch (error) {
    console.error('Analysis error:', error);
    throw error;
  }
}

/**
 * Batch analyze multiple car images
 */
export async function analyzeBatchCarDamage(imageUris: string[]): Promise<GeminiAnalysisResult[]> {
  const results: GeminiAnalysisResult[] = [];

  for (let i = 0; i < imageUris.length; i++) {
    try {
      console.log(`Analyzing image ${i + 1}/${imageUris.length}...`);

      const { label } = await import('./carDetection').then(m => m.PHOTO_CONFIG[i]);

      const result = await analyzeCarDamageWithGemini(imageUris[i], label);
      results.push(result);

      if (i < imageUris.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`Failed to analyze image ${i + 1}:`, error);
      results.push({
        hasDamage: false,
        damageType: 'Analysis Failed',
        severity: 'none',
        description: 'Could not analyze image due to network or API error.',
        recommendations: [],
        imageComplete: false,
        completenessNote: 'Analysis failed'
      });
    }
  }

  return results;
}

/**
 * Generate damage report summary
 */
export function generateDamageReport(results: GeminiAnalysisResult[]): {
  totalImages: number;
  damageCount: number;
  averageSeverity: string;
  summary: string;
} {
  const totalImages = results.length;
  const damageCount = results.filter((r) => r.hasDamage).length;
  const severities = results
    .filter((r) => r.hasDamage)
    .map((r) => r.severity);

  const severityOrder = { none: 0, minor: 1, moderate: 2, severe: 3 };
  const averageSeverity =
    severities.length > 0
      ? Object.keys(severityOrder).find(
        (k) =>
          severityOrder[k as keyof typeof severityOrder] ===
          Math.round(
            severities.reduce((sum, s) => sum + severityOrder[s as keyof typeof severityOrder], 0) /
            severities.length
          )
      ) || 'minor'
      : 'none';

  const summary =
    damageCount === 0
      ? 'No damage detected in any photos'
      : `Damage detected in ${damageCount}/${totalImages} photos. Average severity: ${averageSeverity}`;

  return {
    totalImages,
    damageCount,
    averageSeverity,
    summary,
  };
}
