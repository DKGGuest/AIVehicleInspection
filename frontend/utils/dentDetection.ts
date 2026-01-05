// Specialized utility for detecting and analyzing dents on car surfaces
// Uses Google Gemini AI vision capabilities to identify dent locations and severity

export interface DentAnalysisResult {
  success: boolean;
  error?: string;
  hasDents: boolean;
  severity: 'none' | 'minor' | 'moderate' | 'severe';
  dentLocations: string[];
  description: string;
  recommendations: string[];
  confidence: number; // 0-100
  rawAnalysis?: any;
}

/**
 * Detect dents on car surface from a single image
 * Specifically analyzes the image for dents, creases, and indentations
 * 
 * @param imageUri - Local file URI of the car image to analyze
 * @returns Detailed dent analysis result
 * 
 * @example
 * const result = await detectCarDents(imageUri);
 * if (result.hasDents) {
 *   console.log(`Found ${result.severity} dents at: ${result.dentLocations.join(', ')}`);
 * }
 */
export async function detectCarDents(imageUri: string): Promise<DentAnalysisResult> {
  try {
    console.log('🚗 Starting car dent detection...');

    // Dynamically import to avoid circular dependency
    const { analyzeCarDamageWithGemini } = await import('./geminiAnalysis');
    const result = await analyzeCarDamageWithGemini(imageUri);

    // Extract dent-specific information
    const dentInfo = result.description.toLowerCase();
    const hasDents = dentInfo.includes('dent') || 
                     dentInfo.includes('indent') || 
                     dentInfo.includes('crease') ||
                     dentInfo.includes('dimple') ||
                     (result.hasDamage && result.damageType.toLowerCase().includes('dent'));

    const dentLocations = extractDentLocations(result.description);

    return {
      success: true,
      hasDents: hasDents || (result.hasDamage && result.severity !== 'none'),
      severity: result.severity,
      dentLocations: dentLocations.length > 0 ? dentLocations : extractFromDescription(result.description),
      description: result.description,
      recommendations: result.recommendations,
      confidence: calculateConfidence(result),
      rawAnalysis: result,
    };
  } catch (error) {
    console.error('❌ Dent detection failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during dent detection',
      hasDents: false,
      severity: 'none',
      dentLocations: [],
      description: '',
      recommendations: [],
      confidence: 0,
    };
  }
}

/**
 * Analyze multiple car images from different angles to get comprehensive dent assessment
 * 
 * @param imageUris - Array of image URIs (ideally from different angles: front, rear, sides)
 * @returns Comprehensive dent analysis across all angles
 * 
 * @example
 * const angles = [frontImageUri, rearImageUri, leftSideUri, rightSideUri];
 * const fullAnalysis = await analyzeCarFromMultipleAngles(angles);
 * console.log(`Total dents found: ${fullAnalysis.totalDentsFound}`);
 */
export async function analyzeCarFromMultipleAngles(imageUris: string[]) {
  console.log(`📸 Analyzing car from ${imageUris.length} different angles...`);
  
  const allResults: DentAnalysisResult[] = [];
  const angleLabels = ['Front', 'Rear', 'Left Side', 'Right Side'];

  for (let i = 0; i < imageUris.length; i++) {
    try {
      console.log(`\n🔍 Analyzing angle ${i + 1}/${imageUris.length}: ${angleLabels[i] || `Angle ${i + 1}`}`);
      
      const result = await detectCarDents(imageUris[i]);
      allResults.push(result);

      // Polite delay between API requests to avoid rate limiting
      if (i < imageUris.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    } catch (error) {
      console.error(`❌ Failed analyzing angle ${i + 1}:`, error);
    }
  }

  return generateComprehensiveReport(allResults, imageUris.length);
}

/**
 * Generate a comprehensive dent assessment report
 */
function generateComprehensiveReport(results: DentAnalysisResult[], totalAnglesAttempted: number) {
  const successfulAnalyses = results.filter((r) => r.success);
  const angliesWithDents = results.filter((r) => r.success && r.hasDents);
  
  // Aggregate all unique dent locations
  const allLocations = new Set<string>();
  results.forEach((r) => r.dentLocations.forEach((loc) => allLocations.add(loc)));

  // Calculate average severity
  const severityScores = angliesWithDents.map((r) => {
    const scores = { none: 0, minor: 1, moderate: 2, severe: 3 };
    return scores[r.severity as keyof typeof scores];
  });

  const avgSeverityScore =
    severityScores.length > 0
      ? Math.round(severityScores.reduce((a, b) => a + b, 0) / severityScores.length)
      : 0;

  const severityLabels = ['none', 'minor', 'moderate', 'severe'];
  const overallSeverity = severityLabels[avgSeverityScore] || 'minor';

  // Generate summary text
  const summary = generateSummaryText(successfulAnalyses, angliesWithDents, overallSeverity);

  return {
    analysisComplete: true,
    totalAnglesAttempted,
    successfulAnalyses: successfulAnalyses.length,
    anglesWithDents: angliesWithDents.length,
    totalDentsFound: angliesWithDents.length > 0 ? 'Multiple' : 'None',
    overallSeverity,
    dentLocations: Array.from(allLocations),
    allRecommendations: Array.from(
      new Set(
        results
          .filter((r) => r.success)
          .flatMap((r) => r.recommendations)
      )
    ),
    detailedResults: results,
    summary,
  };
}

/**
 * Extract dent locations from the AI analysis description
 */
function extractDentLocations(description: string): string[] {
  const locations: string[] = [];
  
  // Common car body parts that can have dents
  const locationPatterns: { [key: string]: string[] } = {
    'hood': ['hood', 'bonnet'],
    'front bumper': ['front bumper', 'front end'],
    'rear bumper': ['rear bumper', 'trunk lid', 'tailgate'],
    'left door': ['left door', 'driver door', 'driver side door'],
    'right door': ['right door', 'passenger door', 'passenger side door'],
    'left fender': ['left fender', 'left front fender', 'driver side fender'],
    'right fender': ['right fender', 'right front fender', 'passenger side fender'],
    'roof': ['roof', 'top'],
    'quarter panel': ['quarter panel', 'rear quarter'],
    'side panel': ['side panel', 'rocker panel'],
    'door handle area': ['door handle', 'handle'],
  };

  const descLower = description.toLowerCase();

  for (const [location, keywords] of Object.entries(locationPatterns)) {
    for (const keyword of keywords) {
      if (descLower.includes(keyword)) {
        if (!locations.includes(location)) {
          locations.push(location);
        }
        break;
      }
    }
  }

  return locations;
}

/**
 * Extract location info directly from the description if pattern matching fails
 */
function extractFromDescription(description: string): string[] {
  // If no specific locations found, extract whatever is mentioned
  if (description.toLowerCase().includes('damage') || description.toLowerCase().includes('dent')) {
    return ['Damage detected - review full description for details'];
  }
  return [];
}

/**
 * Calculate confidence score (0-100) based on analysis quality
 */
function calculateConfidence(result: any): number {
  if (!result) return 0;

  let confidence = 50; // Base confidence

  // Add points for complete image analysis
  if (result.imageComplete) confidence += 20;

  // Add points for detailed description
  if (result.description && result.description.length > 50) confidence += 15;

  // Add points for recommendations
  if (result.recommendations && result.recommendations.length > 0) confidence += 15;

  // Cap at 100
  return Math.min(confidence, 100);
}

/**
 * Generate human-readable summary text
 */
function generateSummaryText(
  successfulAnalyses: DentAnalysisResult[],
  angliesWithDents: DentAnalysisResult[],
  overallSeverity: string
): string {
  if (successfulAnalyses.length === 0) {
    return '⚠️ Unable to complete analysis. Please ensure images are clear car photos.';
  }

  if (angliesWithDents.length === 0) {
    return '✅ No dents detected. Vehicle exterior appears to be in good condition.';
  }

  const percentage = Math.round((angliesWithDents.length / successfulAnalyses.length) * 100);
  const dentSummary = `⚠️ Dents detected in ${angliesWithDents.length}/${successfulAnalyses.length} angles (${percentage}%)`;
  const severitySummary = `Overall severity: ${overallSeverity}`;

  return `${dentSummary}. ${severitySummary}. Review detailed recommendations above for repair options.`;
}
