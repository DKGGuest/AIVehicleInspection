// Example component showing how to use car dent detection
// Copy and adapt this to your actual app screens

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { detectCarDents, analyzeCarFromMultipleAngles } from '../utils/dentDetection';

interface DentCheckResult {
  hasDents: boolean;
  severity: string;
  locations: string[];
  confidence: number;
  description: string;
  recommendations: string[];
}

/**
 * Example: Single Photo Dent Check
 * Shows how to analyze one car photo for dents
 */
export function SinglePhotoDentCheck() {
  const [result, setResult] = useState<DentCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkPhotoForDents = async (imageUri: string) => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Analyzing photo for dents...');
      
      // Call the dent detection function
      const analysis = await detectCarDents(imageUri);

      if (analysis.success) {
        setResult({
          hasDents: analysis.hasDents,
          severity: analysis.severity,
          locations: analysis.dentLocations,
          confidence: analysis.confidence,
          description: analysis.description,
          recommendations: analysis.recommendations,
        });
        console.log('✅ Analysis complete:', analysis);
      } else {
        setError(analysis.error || 'Analysis failed');
        Alert.alert('Error', `Dent detection failed: ${analysis.error}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      Alert.alert('Error', `Failed to analyze photo: ${errorMessage}`);
      console.error('❌ Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚗 Single Photo Dent Detection</Text>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Analyzing car damage...</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>❌ {error}</Text>
          <Text style={styles.errorHint}>
            Make sure your API key is added to geminiAnalysis.ts
          </Text>
        </View>
      )}

      {result && !loading && (
        <ScrollView style={styles.resultContainer}>
          <View
            style={[
              styles.resultBox,
              result.hasDents ? styles.damageFound : styles.noDamage,
            ]}
          >
            <Text style={styles.resultTitle}>
              {result.hasDents ? '⚠️ Damage Detected' : '✅ No Damage Found'}
            </Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Severity:</Text>
              <Text
                style={[
                  styles.detailValue,
                  {
                    color:
                      result.severity === 'severe'
                        ? '#d32f2f'
                        : result.severity === 'moderate'
                          ? '#f57c00'
                          : result.severity === 'minor'
                            ? '#fbc02d'
                            : '#388e3c',
                  },
                ]}
              >
                {result.severity.toUpperCase()}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Locations:</Text>
              <Text style={styles.detailValue}>
                {result.locations.length > 0
                  ? result.locations.join(', ')
                  : 'Not specified'}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Confidence:</Text>
              <Text style={styles.detailValue}>{result.confidence}%</Text>
            </View>

            <View style={styles.descriptionBox}>
              <Text style={styles.descriptionLabel}>📝 Analysis:</Text>
              <Text style={styles.descriptionText}>{result.description}</Text>
            </View>

            {result.recommendations.length > 0 && (
              <View style={styles.recommendationsBox}>
                <Text style={styles.recommendationsLabel}>💡 Recommendations:</Text>
                {result.recommendations.map((rec, index) => (
                  <Text key={index} style={styles.recommendationItem}>
                    • {rec}
                  </Text>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={() => {
          // In real app, this would be triggered by camera/gallery selection
          // For now, just show how it would be called
          Alert.alert('Note', 'In your real app, call checkPhotoForDents(imageUri) when photo is selected');
        }}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Analyzing...' : 'Select Photo to Check'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/**
 * Example: Multiple Angles Assessment
 * Analyzes car from 4 angles for comprehensive damage assessment
 */
export function MultiAngleDentAssessment() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assessCarFromAllAngles = async (imageUris: string[]) => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Starting comprehensive car assessment...');
      
      // Analyze all angles
      const fullReport = await analyzeCarFromMultipleAngles(imageUris);

      setReport(fullReport);
      console.log('✅ Assessment complete:', fullReport);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('❌ Assessment error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚗 4-Angle Car Assessment</Text>
      <Text style={styles.subtitle}>
        Upload photos from front, rear, left, and right sides
      </Text>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Analyzing all angles...</Text>
          <Text style={styles.loadingSubtext}>This may take 10-20 seconds</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>❌ {error}</Text>
        </View>
      )}

      {report && !loading && (
        <ScrollView style={styles.resultContainer}>
          <View
            style={[
              styles.reportBox,
              report.overallSeverity === 'none'
                ? styles.noDamage
                : styles.damageFound,
            ]}
          >
            <Text style={styles.reportTitle}>{report.summary}</Text>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Angles Analyzed:</Text>
              <Text style={styles.statValue}>
                {report.successfulAnalyses}/{report.totalAnglesAttempted}
              </Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Damage Found In:</Text>
              <Text style={styles.statValue}>
                {report.anglesWithDents}/{report.successfulAnalyses} angles
              </Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Overall Severity:</Text>
              <Text
                style={[
                  styles.statValue,
                  {
                    color:
                      report.overallSeverity === 'severe'
                        ? '#d32f2f'
                        : report.overallSeverity === 'moderate'
                          ? '#f57c00'
                          : report.overallSeverity === 'minor'
                            ? '#fbc02d'
                            : '#388e3c',
                  },
                ]}
              >
                {report.overallSeverity.toUpperCase()}
              </Text>
            </View>

            {report.dentLocations.length > 0 && (
              <View style={styles.locationsBox}>
                <Text style={styles.locationsLabel}>📍 Damage Locations:</Text>
                {report.dentLocations.map((location: string, index: number) => (
                  <Text key={index} style={styles.locationItem}>
                    • {location}
                  </Text>
                ))}
              </View>
            )}

            {report.allRecommendations.length > 0 && (
              <View style={styles.recommendationsBox}>
                <Text style={styles.recommendationsLabel}>
                  💡 Recommended Actions:
                </Text>
                {report.allRecommendations.map(
                  (recommendation: string, index: number) => (
                    <Text key={index} style={styles.recommendationItem}>
                      • {recommendation}
                    </Text>
                  )
                )}
              </View>
            )}
          </View>
        </ScrollView>
      )}

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={() => {
          Alert.alert(
            'Note',
            'In your real app, use camera/gallery to select 4 photos, then call assessCarFromAllAngles([uri1, uri2, uri3, uri4])'
          );
        }}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Analyzing...' : 'Start 4-Angle Assessment'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 12,
    color: '#999',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    fontWeight: '600',
  },
  errorHint: {
    color: '#d32f2f',
    fontSize: 12,
    marginTop: 8,
  },
  resultContainer: {
    flex: 1,
    marginBottom: 16,
  },
  resultBox: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    backgroundColor: 'white',
  },
  reportBox: {
    borderRadius: 12,
    padding: 16,
    backgroundColor: 'white',
  },
  damageFound: {
    borderLeftColor: '#d32f2f',
    borderLeftWidth: 4,
  },
  noDamage: {
    borderLeftColor: '#388e3c',
    borderLeftWidth: 4,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  descriptionBox: {
    marginTop: 16,
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
  },
  descriptionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
  },
  locationsBox: {
    marginTop: 16,
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
  },
  locationsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 8,
  },
  locationItem: {
    fontSize: 13,
    color: '#1565c0',
    marginVertical: 4,
  },
  recommendationsBox: {
    marginTop: 16,
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
  },
  recommendationsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e65100',
    marginBottom: 8,
  },
  recommendationItem: {
    fontSize: 13,
    color: '#bf360c',
    marginVertical: 4,
  },
  button: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
