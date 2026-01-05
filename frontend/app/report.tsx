import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, BackHandler, Alert, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GeminiAnalysisResult } from '@/utils/geminiAnalysis';
import { PHOTO_CONFIG } from '@/utils/carDetection';
import { useCars, InspectionReport } from '@/contexts/cars-context';
import ImageViewer from 'react-native-image-zoom-viewer';
import { Ionicons } from '@expo/vector-icons';


import { submitPhotos, compareImages } from '@/utils/api';
import { compareStructuredReports, StructuredDiffSummary } from '@/utils/comparisonReport';
import { Image } from 'react-native';

export default function ReportScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const inspectionId = params.inspectionId as string;
    const initialResultsString = params.results as string;

    const { getCar, updateLatestReportComparison } = useCars();
    const currentCar = getCar(inspectionId);

    // Determine available reports (stages)
    const reports = currentCar?.reports && currentCar.reports.length > 0
        ? currentCar.reports
        : [{
            stage: 1,
            timestamp: Date.now(),
            results: initialResultsString || '[]',
            comparison: undefined,
            photos: currentCar?.photos || []
        }];

    // Active Stage State (Default to latest)
    const [activeStageIndex, setActiveStageIndex] = useState(reports.length - 1);

    // Update active stage if reports change (e.g. newly added)
    useEffect(() => {
        setActiveStageIndex(reports.length - 1);
    }, [currentCar?.reports?.length]);

    const activeReport = reports[activeStageIndex];
    const results: GeminiAnalysisResult[] = activeReport && activeReport.results
        ? JSON.parse(activeReport.results)
        : [];

    const [comparisonReport, setComparisonReport] = useState<StructuredDiffSummary | null>(null);
    const [isComparisonVisible, setIsComparisonVisible] = useState(false);

    // Visual Comparison State
    const [visualDiffResult, setVisualDiffResult] = useState<any>(null);
    const [isVisualDiffVisible, setIsVisualDiffVisible] = useState(false);
    const [visualDiffLoading, setVisualDiffLoading] = useState(false);

    // Effect to generate local comparison if meaningful
    useEffect(() => {
        const isStage1 = activeReport?.stage === 1;

        if (isStage1) {
            setComparisonReport(null);
            return;
        }

        const previousIndex = activeStageIndex - 1;
        if (previousIndex >= 0) {
            const prevReport = reports[previousIndex];
            const prevResults: GeminiAnalysisResult[] = prevReport.results ? JSON.parse(prevReport.results) : [];

            // Generate Diff
            const diff = compareStructuredReports(prevResults, results);
            setComparisonReport(diff);
        }
    }, [activeStageIndex, activeReport, reports]);

    // Prevent hardware back button from going back to photos
    useEffect(() => {
        const onBackPress = () => {
            router.replace('/dashboard');
            return true;
        };
        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => subscription.remove();
    }, []);

    const rejectedPhotos = results.map((r, i) => ({ ...r, index: i })).filter(r => !r.imageComplete);
    const damagedPhotos = results.map((r, i) => ({ ...r, index: i })).filter(r => r.imageComplete && r.hasDamage);
    const cleanPhotos = results.map((r, i) => ({ ...r, index: i })).filter(r => r.imageComplete && !r.hasDamage);

    const [isVisible, setIsVisible] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const images = currentCar?.photos?.map(uri => ({ uri })) || [];

    const openImage = (index: number) => {
        if (currentCar && currentCar.photos && currentCar.photos[index]) {
            setCurrentImageIndex(index);
            setIsVisible(true);
        } else {
            console.error('Image not available for index:', index);
            Alert.alert("Error", "Image not available.");
        }
    };

    const handleClaim = (item: GeminiAnalysisResult, index: number) => {
        Alert.alert(
            "Initiate Claim",
            `Start claim process for ${item.severity} damage on ${PHOTO_CONFIG[index].label}?`,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Start Claim", onPress: () => Alert.alert("Claim Started", "Our team will contact you shortly.") }
            ]
        );
    };

    const runVisualComparison = async (photoIndex: number) => {
        if (activeStageIndex === 0) {
            Alert.alert("Info", "No previous stage history to compare with.");
            return;
        }

        const prevReport = reports[activeStageIndex - 1];

        // Attempt to retrieve photos from the report history
        const oldPhotoUri = prevReport.photos && prevReport.photos[photoIndex] ? prevReport.photos[photoIndex] : null;

        // For the new photo, check the active report, or fallback to current car photos if it's the latest stage
        const newPhotoUri = activeReport.photos && activeReport.photos[photoIndex]
            ? activeReport.photos[photoIndex]
            : (currentCar?.photos ? currentCar.photos[photoIndex] : null);

        if (!oldPhotoUri || !newPhotoUri) {
            Alert.alert("Unavailable", "Historical photo for this angle not found on device.");
            return;
        }

        try {
            setVisualDiffLoading(true);
            const result = await compareImages(oldPhotoUri, newPhotoUri);
            setVisualDiffResult(result);
            setIsVisualDiffVisible(true);
        } catch (e) {
            Alert.alert("Error", "Visual comparison failed. Backend might be unreachable.");
        } finally {
            setVisualDiffLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Inspection Report</Text>
                    <Text style={styles.headerSubtitle}>ID: #{inspectionId}</Text>
                </View>
            </View>

            {/* Stage Selector */}
            {reports.length > 1 && (
                <View style={styles.stageSelector}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                        {reports.map((report, idx) => (
                            <TouchableOpacity
                                key={idx}
                                style={[
                                    styles.stageChip,
                                    activeStageIndex === idx && styles.stageChipActive
                                ]}
                                onPress={() => setActiveStageIndex(idx)}
                            >
                                <Text style={[
                                    styles.stageChipText,
                                    activeStageIndex === idx && styles.stageChipTextActive
                                ]}>
                                    Stage {report.stage}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            <ScrollView style={styles.content}>

                {/* Comparison Report - Disabled as per request */}
                {/* 
                {comparisonReport && (
                    <View style={styles.section}>
                        ... (Comparison Report Code) ...
                    </View>
                )} 
                */}

                {/* Analysis Header - Enabled for ALL Stages */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: '#000', fontSize: 16, borderBottomWidth: 1, borderBottomColor: '#ddd', paddingBottom: 8 }]}>
                        CURRENT INSPECTION ANALYSIS
                    </Text>
                </View>

                {rejectedPhotos.length > 0 && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: '#000' }]}>Verification Failed</Text>
                        <View style={styles.card}>
                            {rejectedPhotos.map((item, idx) => (
                                <TouchableOpacity key={idx} style={styles.itemRow} onPress={() => openImage(item.index)}>
                                    <Text style={styles.label}>{PHOTO_CONFIG[item.index].label}</Text>
                                    <Text style={[styles.errorText, { color: '#000' }]}>{item.completenessNote || 'Wrong angle or unclear'}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                {damagedPhotos.length > 0 && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, styles.colorOrange]}>Damage Detected</Text>
                        <View style={styles.card}>
                            {damagedPhotos.map((item, idx) => (
                                <View key={idx} style={styles.damageItem}>
                                    <TouchableOpacity style={styles.itemHeader} onPress={() => openImage(item.index)}>
                                        <Text style={styles.label}>{PHOTO_CONFIG[item.index].label}</Text>
                                        <View style={[styles.badge, { backgroundColor: getSeverityColors(item.severity).bg }]}>
                                            <Text style={[styles.badgeText, { color: getSeverityColors(item.severity).text }]}>
                                                {item.severity.toUpperCase()}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                    <Text style={styles.damageType}>{item.damageType}</Text>
                                    <Text style={styles.description}>{item.description}</Text>
                                </View>
                            ))}
                        </View>
                        <TouchableOpacity
                            style={[styles.claimButton, { width: '100%', marginTop: 16, alignItems: 'center' }]}
                            onPress={() => Alert.alert("Initiate Claim", "Starting claim process for all reported damages...", [{ text: "OK" }])}
                        >
                            <Text style={styles.claimButtonText}>Initiate Claim Settlement</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {cleanPhotos.length > 0 && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: '#000' }]}>Passed / Clean</Text>
                        <View style={styles.card}>
                            {cleanPhotos.map((item, idx) => (
                                <TouchableOpacity key={idx} style={styles.itemRow} onPress={() => openImage(item.index)}>
                                    <Text style={styles.label}>{PHOTO_CONFIG[item.index].label}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Text style={{ color: '#000', fontSize: 13, fontWeight: '500' }}>Passed</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                {activeStageIndex > 0 && (
                    <View style={[styles.section, { marginBottom: 40 }]}>
                        <TouchableOpacity
                            style={{ backgroundColor: '#1976D2', paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}
                            onPress={() => setIsComparisonVisible(true)}
                        >
                            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Compare with Previous History</Text>
                        </TouchableOpacity>
                    </View>
                )}

            </ScrollView>

            <View style={styles.footer}>
                <View style={styles.footerButtons}>
                    <TouchableOpacity
                        style={styles.reviewButton}
                        onPress={() => router.push({ pathname: '/photos', params: { carId: inspectionId, mode: 'review' } })}
                    >
                        <Text style={styles.reviewButtonText}>Review Photos</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.doneButton}
                        onPress={() => router.replace('/dashboard')}
                    >
                        <Text style={styles.doneButtonText}>Done</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <Modal visible={isVisible} transparent={true} onRequestClose={() => setIsVisible(false)}>
                <View style={styles.viewerContainer}>
                    <TouchableOpacity style={styles.closeViewer} onPress={() => setIsVisible(false)}>
                        <Text style={styles.closeViewerText}>✕</Text>
                    </TouchableOpacity>
                    {images.length > 0 ? (
                        <ImageViewer
                            imageUrls={images.map(img => ({ url: img.uri }))}
                            index={currentImageIndex}
                            onSwipeDown={() => setIsVisible(false)}
                            enableSwipeDown={true}
                            backgroundColor="black"
                            renderIndicator={(currentIndex, allSize) => (
                                <View style={{ position: 'absolute', top: 40, width: '100%', alignItems: 'center', zIndex: 1 }}>
                                    <Text style={{ color: 'white', fontSize: 16 }}>
                                        {currentIndex !== undefined ? currentIndex + 1 : 1} / {allSize}
                                    </Text>
                                </View>
                            )}
                            saveToLocalByLongPress={false}
                        />
                    ) : (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <Text style={{ color: 'white' }}>No images available</Text>
                        </View>
                    )}
                </View>
            </Modal>

            {/* Visual Comparison Result Modal */}
            <Modal visible={isVisualDiffVisible} transparent={true} onRequestClose={() => setIsVisualDiffVisible(false)}>
                <View style={[styles.imageModal, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
                    <View style={{ width: '90%', height: '80%', backgroundColor: '#fff', borderRadius: 12, padding: 20 }}>
                        <TouchableOpacity
                            style={{ position: 'absolute', right: 10, top: 10, padding: 10, zIndex: 1 }}
                            onPress={() => setIsVisualDiffVisible(false)}
                        >
                            <Text style={{ fontSize: 24, fontWeight: 'bold' }}>✕</Text>
                        </TouchableOpacity>

                        <Text style={[styles.sectionTitle, { marginBottom: 20, textAlign: 'center' }]}>Visual Change Analysis</Text>

                        {visualDiffLoading ? (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                <Text>Analyzing pixel differences...</Text>
                            </View>
                        ) : visualDiffResult ? (
                            <View style={{ flex: 1, alignItems: 'center' }}>
                                <Image
                                    source={{ uri: `data:image/jpeg;base64,${visualDiffResult.diff_image_base64}` }}
                                    style={{ width: '100%', height: 300, resizeMode: 'contain', marginBottom: 20 }}
                                />
                                <View style={{ width: '100%' }}>
                                    <Text style={{ fontSize: 16, marginBottom: 8 }}>
                                        <Text style={{ fontWeight: 'bold' }}>Percentage Change: </Text>
                                        <Text style={{ color: visualDiffResult.diff_percentage > 5 ? 'red' : 'green' }}>
                                            {visualDiffResult.diff_percentage.toFixed(2)}%
                                        </Text>
                                    </Text>
                                    <Text style={{ fontSize: 16, marginBottom: 8 }}>
                                        <Text style={{ fontWeight: 'bold' }}>MSE Score: </Text>
                                        {visualDiffResult.mse.toFixed(2)}
                                    </Text>
                                    <Text style={{ fontSize: 14, color: '#555', marginTop: 10, fontStyle: 'italic' }}>
                                        {visualDiffResult.changes_summary}
                                    </Text>
                                    <Text style={{ fontSize: 12, color: '#999', marginTop: 20, textAlign: 'center' }}>
                                        Red areas indicate pixel-level differences (e.g., dents, scratches, lighting changes).
                                    </Text>
                                </View>
                            </View>
                        ) : (
                            <Text>No results.</Text>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Structured Comparison Modal */}
            <Modal visible={isComparisonVisible} animationType="slide" onRequestClose={() => setIsComparisonVisible(false)}>
                <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
                        <Text style={{ fontSize: 18, fontWeight: '700' }}>Details Comparison</Text>
                        <TouchableOpacity onPress={() => setIsComparisonVisible(false)}>
                            <Text style={{ fontSize: 18, color: '#007AFF' }}>Close</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={{ padding: 16 }}>
                        <Text style={{ fontSize: 16, marginBottom: 16, fontStyle: 'italic' }}>
                            {comparisonReport?.summary || "Analyzing..."}
                        </Text>

                        {comparisonReport?.angles.map((angle, i) => (
                            <View key={i} style={[styles.card, { marginBottom: 16, padding: 12 }]}>
                                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>{angle.label}</Text>
                                {angle.changes.map((change, idx) => (
                                    <View key={idx} style={{ marginBottom: 8, paddingBottom: 8, borderBottomWidth: idx < angle.changes.length - 1 ? 1 : 0, borderBottomColor: '#eee' }}>
                                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#555' }}>
                                            {change.field}: {change.type !== 'changed' && (
                                                <Text style={{
                                                    color: '#000',
                                                    fontWeight: 'bold'
                                                }}>{change.type.toUpperCase()}</Text>
                                            )}
                                        </Text>
                                        <View style={{ marginLeft: 8, marginTop: 4 }}>
                                            {change.oldValue !== undefined && change.oldValue !== null && (
                                                <Text style={{ color: '#000', fontSize: 13 }}>
                                                    Prev: {String(change.oldValue)}
                                                </Text>
                                            )}
                                            {change.newValue !== undefined && change.newValue !== null && (
                                                <Text style={{ color: '#000', fontSize: 14 }}>
                                                    Now: {String(change.newValue)}
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ))}
                        <View style={{ height: 40 }} />
                    </ScrollView>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

function getSeverityColors(severity: string) {
    switch (severity) {
        case 'minor': return { bg: '#FFF8E1', text: '#F57F17' }; // Subtle Amber
        case 'moderate': return { bg: '#FFF3E0', text: '#E65100' }; // Subtle Orange
        case 'severe': return { bg: '#FFEBEE', text: '#C62828' }; // Subtle Red
        default: return { bg: '#F5F5F5', text: '#757575' };
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 4,
    },
    stageSelector: {
        backgroundColor: '#fff',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    stageChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        marginRight: 8,
    },
    stageChipActive: {
        backgroundColor: '#1F2937', // Soft black (Dark Gray)
    },
    stageChipText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B7280',
    },
    stageChipTextActive: {
        color: '#fff',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 12,
        letterSpacing: 0.5,
    },
    colorRed: { color: '#EF4444' }, // Softer Red
    colorOrange: { color: '#F59E0B' }, // Softer Orange
    colorGreen: { color: '#10B981' }, // Softer Green

    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        paddingVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F9FAFB',
    },
    damageItem: {
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F9FAFB',
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    errorText: {
        fontSize: 14,
        color: '#EF4444',
        maxWidth: '60%',
        textAlign: 'right',
    },
    okText: {
        fontSize: 14,
        color: '#10B981',
    },
    damageType: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
    },
    description: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    footer: {
        padding: 16,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#E5E5EA',
    },
    footerButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    doneButton: {
        flex: 1,
        backgroundColor: '#000',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    reviewButton: {
        flex: 1,
        backgroundColor: '#F2F2F7',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    doneButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    reviewButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '600',
    },
    claimButton: {
        marginTop: 12,
        backgroundColor: '#000',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    claimButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    imageModal: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullImage: {
        width: '100%',
        height: '80%',
    },
    closeModal: {
        position: 'absolute',
        top: 40,
        right: 20,
        padding: 10,
        zIndex: 10,
    },
    closeText: {
        color: '#fff',
        fontSize: 30,
        fontWeight: 'bold',
    },
    viewerContainer: {
        flex: 1,
        backgroundColor: 'black',
    },
    closeViewer: {
        position: 'absolute',
        top: 40,
        right: 20,
        zIndex: 10,
        padding: 10,
    },
    closeViewerText: {
        color: 'white',
        fontSize: 30,
        fontWeight: 'bold',
    },
});
