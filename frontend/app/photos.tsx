import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Image, Alert, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import ImageViewer from 'react-native-image-zoom-viewer';
import { detectCar, PHOTO_CONFIG, DetectionResult } from '@/utils/carDetection';
import { compressImage } from '@/utils/imageCompression';
import { analyzeBatchCarDamage, generateDamageReport } from '@/utils/geminiAnalysis';
import { useAuth } from '@/contexts/auth-context';
import { useCars } from '@/contexts/cars-context';

export default function PhotosScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const { updateCarPhotos, saveAnalysis, getCar } = useCars();
  const params = useLocalSearchParams();
  const carId = params.carId as string;
  const mode = (params.mode as string) || 'upload'; // 'upload' or 'review'

  const currentCar = getCar(carId);
  const TOTAL_PHOTOS = 9;

  console.log('PhotosScreen Render:', { carId, mode, hasCar: !!currentCar, numPhotos: currentCar?.photos?.length, photos: currentCar?.photos });

  // Initialize photos from context if available, padding to TOTAL_PHOTOS
  const initPhotos = () => {
    if (currentCar?.photos && currentCar.photos.length > 0) {
      const loaded = currentCar.photos.map(uri => ({ uri }));
      const padding = Array(Math.max(0, TOTAL_PHOTOS - loaded.length)).fill({ uri: '' });
      return [...loaded, ...padding];
    }
    return Array(TOTAL_PHOTOS).fill({ uri: '' });
  };

  const [photos, setPhotos] = useState<Array<{ uri: string }>>(initPhotos());

  // Sync with car data if it loads later or changes
  useEffect(() => {
    if (currentCar?.photos && currentCar.photos.length > 0) {
      // If our local state is effectively empty (all blank), OR if the car ID matches but we have no photos
      // We should rely on the context source of truth for "Review" mode especially.
      const isLocalEmpty = photos.every(p => !p.uri);

      if (isLocalEmpty || mode === 'review') {
        const loaded = currentCar.photos.map(uri => ({ uri }));
        const padding = Array(Math.max(0, TOTAL_PHOTOS - loaded.length)).fill({ uri: '' });
        setPhotos([...loaded, ...padding]);
      }
    }
  }, [currentCar?.photos, mode]);

  // Force-sync state on screen focus to handle navigation updates
  useFocusEffect(
    useCallback(() => {
      if (currentCar?.photos && currentCar.photos.length > 0) {
        console.log("PhotosScreen Focused: Syncing photos", currentCar.photos.length);
        const loaded = currentCar.photos.map(uri => ({ uri }));
        const padding = Array(Math.max(0, TOTAL_PHOTOS - loaded.length)).fill({ uri: '' });
        setPhotos([...loaded, ...padding]);
      }
    }, [currentCar?.photos])
  );

  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showCamera, setShowCamera] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const openViewer = (index: number) => {
    console.log('Attempting to open viewer for index:', index);
    if (photos[index]?.uri) {
      setViewerIndex(index);
      setIsViewerVisible(true);
    } else {
      console.log('No URI for photo at index:', index);
    }
  };

  // Explicitly calculate valid images and index for the viewer
  const validPhotos = photos.filter(p => p.uri);
  const currentViewerIndex = validPhotos.findIndex(p => p.uri === photos[viewerIndex]?.uri);
  const safeViewerIndex = currentViewerIndex >= 0 ? currentViewerIndex : 0;




  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  const handleOpenCamera = () => {
    setShowCamera(true);
    setDetection(null);
  };

  const handleRetakePhoto = (index: number) => {
    setCurrentPhotoIndex(index);
    setShowCamera(true);
    setDetection(null);
  };

  const handlePickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0].uri) {
        const compressed = await compressImage(result.assets[0].uri);
        const newPhotos = [...photos];
        newPhotos[currentPhotoIndex] = { uri: compressed.uri };
        setPhotos(newPhotos);
        setShowCamera(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not select photo');
    }
  };

  const handleTakePhoto = async () => {
    if (!cameraRef.current) return;

    setIsDetecting(true);
    setDetection(null);

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) {
        const compressed = await compressImage(photo.uri);

        // Skip detection for now to speed up or keep it if it works locally
        const expectedAngle = PHOTO_CONFIG[currentPhotoIndex]?.expectedAngle || 'Any';
        // const result = await detectCar(compressed.uri, expectedAngle);
        // setDetection(result);

        // For now, accept automatically
        setTimeout(() => {
          const newPhotos = [...photos];
          newPhotos[currentPhotoIndex] = { uri: compressed.uri };
          setPhotos(newPhotos);
          setShowCamera(false);
          setDetection(null);
        }, 500);

      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to take photo');
    } finally {
      setIsDetecting(false);
    }
  };

  const handleSave = async () => {
    const photosWithUri = photos.filter(p => p.uri);
    if (photosWithUri.length === 0) {
      Alert.alert('No Photos', 'Please take at least one photo.');
      return;
    }

    await saveToContext(photosWithUri.map(p => p.uri));
  };

  const saveToContext = async (uris: string[]) => {
    setIsSaving(true);
    try {
      await updateCarPhotos(carId, uris);
      Alert.alert('Success', 'Photos saved successfully!', [
        { text: 'OK', onPress: () => { } } // Stay here so they can analyze? Or go back?
      ]);
    } catch (e) {
      Alert.alert('Error', 'Failed to save photos');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAnalyze = async () => {
    const photosWithUri = photos.filter(p => p.uri);
    if (photosWithUri.length === 0) {
      Alert.alert('No Photos', 'Please upload photos first.');
      return;
    }

    setIsAnalyzing(true);
    setLoadingMessage('Analyzing damage with AI...\n(This may take ~20 seconds)');

    try {
      const uris = photosWithUri.map(p => p.uri);
      // Ensure photos are saved first
      await updateCarPhotos(carId, uris);

      const results = await analyzeBatchCarDamage(uris);
      const resultsJson = JSON.stringify(results);

      await saveAnalysis(carId, resultsJson);

      router.push({
        pathname: '/report',
        params: {
          inspectionId: carId,
          results: resultsJson
        }
      });
    } catch (error) {
      console.error('Analysis failed', error);
      Alert.alert('Error', 'Failed to analyze photos. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (showCamera && permission?.granted) {
    // const isSuccess = detection?.isAccepted;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.cameraHeader}>
          <Text style={styles.cameraTitle}>
            {mode === 'review' ? 'Changing Photo' : `Photo ${currentPhotoIndex + 1} of ${TOTAL_PHOTOS}`}
          </Text>
          <Text style={styles.photoLabel}>{PHOTO_CONFIG[currentPhotoIndex]?.label}</Text>
        </View>

        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
        />

        {isDetecting && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        )}

        <View style={styles.cameraControls}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              setShowCamera(false);
              setDetection(null);
            }}
            disabled={isDetecting}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.captureButton, isDetecting && styles.captureButtonDisabled]}
            onPress={handleTakePhoto}
            disabled={isDetecting}
          >
            <View style={styles.captureInner} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.galleryButton}
            onPress={handlePickFromGallery}
            disabled={isDetecting}
          >
            <Text style={styles.galleryButtonText}>Gallery</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}> Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {mode === 'review' ? 'Review Photos' : 'Upload Photos'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.subHeader}>
        <Text style={styles.carInfo}>
          {currentCar?.make || 'Car'} {currentCar?.model || ''}
        </Text>
        <Text style={styles.carReg}>{currentCar?.registrationNumber}</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.photoGrid}>
          {Array.from({ length: TOTAL_PHOTOS }).map((_, index) => {
            const photo = photos[index];
            const isCompleted = photo?.uri !== '' && photo?.uri !== undefined;

            return (
              <View
                key={index}
                style={[
                  styles.photoItem,
                  isCompleted && styles.photoItemCompleted,
                ]}
              >
                {isCompleted ? (
                  <>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => openViewer(index)}>
                      <Image
                        source={{ uri: photo.uri }}
                        style={styles.photoImage}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => handleRetakePhoto(index)}
                    >
                      <Text style={styles.editButtonText}>
                        {mode === 'review' ? 'Change' : 'Retake'}
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={styles.emptyPhoto}
                    onPress={() => handleRetakePhoto(index)}
                  >
                    <Text style={styles.photoNumber}>{index + 1}</Text>
                    <Text style={styles.photoSubtext}>{PHOTO_CONFIG[index]?.label || 'Photo'}</Text>
                    <Text style={styles.plusIcon}>+</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.saveButton]}
            onPress={handleSave}
            disabled={isSaving || isAnalyzing}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.actionButtonText}>
                Save Only
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.analyzeButton]}
            onPress={handleAnalyze}
            disabled={isSaving || isAnalyzing}
          >
            <Text style={styles.actionButtonText}>Save & Analyze AI</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal transparent={true} visible={isAnalyzing} animationType="fade">
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>{loadingMessage}</Text>
        </View>
      </Modal>

      <Modal visible={isViewerVisible} transparent={true} onRequestClose={() => setIsViewerVisible(false)}>
        <View style={styles.viewerContainer}>
          <TouchableOpacity style={styles.closeViewer} onPress={() => setIsViewerVisible(false)}>
            <Text style={styles.closeViewerText}>✕</Text>
          </TouchableOpacity>
          {validPhotos.length > 0 ? (
            <ImageViewer
              imageUrls={validPhotos.map(p => ({ url: p.uri }))}
              index={safeViewerIndex}
              onSwipeDown={() => setIsViewerVisible(false)}
              enableSwipeDown={true}
              backgroundColor="black"
              renderIndicator={(currentIndex, allSize) => (
                <View style={{ position: 'absolute', top: 40, width: '100%', alignItems: 'center', zIndex: 1 }}>
                  <Text style={{ color: 'white', fontSize: 16 }}>
                    {currentIndex !== undefined ? currentIndex + 1 : 1} / {allSize}
                  </Text>
                </View>
              )}
              onChange={(index) => {
                if (index !== undefined) {
                  // Update internal state or tracking if needed
                  // For now just logging or simple state update if we had one for current viewer index
                  // But safeViewerIndex comes from validPhotos...
                  // We might need a local state for the viewer's current index to support 'Change' on the correct photo after swiping
                  // Let's rely on safeViewerIndex updates? No, that is derived from viewerIndex state.
                  // We need to update viewerIndex based on validPhotos[index]
                  const currentUri = validPhotos[index]?.uri;
                  const originalIndex = photos.findIndex(p => p.uri === currentUri);
                  if (originalIndex !== -1) {
                    setViewerIndex(originalIndex);
                  }
                }
              }}
              renderHeader={() => (
                <TouchableOpacity
                  style={{
                    position: 'absolute',
                    top: 40,
                    right: 60,
                    zIndex: 10,
                    backgroundColor: 'white',
                    padding: 8,
                    borderRadius: 8
                  }}
                  onPress={() => {
                    setIsViewerVisible(false);
                    // photos[viewerIndex] is the source array, but we need the actual index in the full list
                    // 'safeViewerIndex' is the index in validPhotos
                    // We need to find the original index of the photo being viewed
                    const currentUri = validPhotos[safeViewerIndex]?.uri;
                    const originalIndex = photos.findIndex(p => p.uri === currentUri);
                    if (originalIndex !== -1) {
                      handleRetakePhoto(originalIndex);
                    }
                  }}
                >
                  <Text style={{ color: 'black', fontWeight: 'bold' }}>Change Photo</Text>
                </TouchableOpacity>
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
    </SafeAreaView >
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  subHeader: {
    padding: 12,
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  carInfo: {
    fontWeight: '700',
    fontSize: 18,
    color: '#000'
  },
  carReg: {
    fontSize: 14,
    color: '#666',
    marginTop: 2
  },
  backButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  backButtonText: {
    fontSize: 14,
    color: '#000',
    fontWeight: '600',
  },
  plusIcon: {
    fontSize: 24,
    color: '#000',
    marginTop: 4
  },
  analyzeButton: {
    backgroundColor: '#000',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#000',
    alignItems: 'center'
  },
  cameraTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  photoLabel: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 4,
  },
  camera: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center'
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    paddingBottom: 30,
    backgroundColor: '#000',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#fff',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  captureButtonDisabled: {
    opacity: 0.6,
  },
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
  galleryButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
  placeholder: {
    width: 60,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
    paddingBottom: 20
  },
  photoItem: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
    marginBottom: 8,
  },
  photoItemCompleted: {
    borderColor: '#34C759',
    borderWidth: 2,
  },
  emptyPhoto: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  photoNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ccc',
  },
  photoSubtext: {
    fontSize: 9,
    color: '#999',
    marginTop: 2,
    textAlign: 'center',
  },
  photoImage: {
    flex: 1,
    width: '100%',
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 4,
    alignItems: 'center'
  },
  editButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee'
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#8E8E93',
  },

});
