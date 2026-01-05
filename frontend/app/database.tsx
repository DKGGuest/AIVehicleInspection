import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
  Image,
  Dimensions,
} from 'react-native';
import { getAllImages, deleteImage } from '@/utils/database';
import { getDatabaseStats, exportAndDownload } from '@/utils/databaseHelper';
import { StoredImage } from '@/utils/types';

const { width } = Dimensions.get('window');

export default function DatabaseScreen() {
  const [images, setImages] = useState<StoredImage[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<StoredImage | null>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const storedImages = await getAllImages();
      const dbStats = await getDatabaseStats();
      setImages(storedImages);
      setStats(dbStats);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const handleDelete = (imageId: number) => {
    Alert.alert(
      'Delete Image',
      'Are you sure you want to delete this image?',
      [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            await deleteImage(imageId);
            await loadData();
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      const filePath = await exportAndDownload();
      Alert.alert('Success', `Database exported to:\n${filePath}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to export database');
    } finally {
      setLoading(false);
    }
  };

  const renderImageItem = ({ item }: { item: StoredImage }) => {
    const analysis = JSON.parse(item.damage_analysis || '{}');
    return (
      <TouchableOpacity
        style={styles.imageCard}
        onPress={() => setSelectedImage(item)}
      >
        {item.image_data && (
          <Image
            source={{ uri: `data:image/jpeg;base64,${item.image_data.substring(0, 100)}...` }}
            style={styles.thumbnail}
          />
        )}
        <View style={styles.imageInfo}>
          <Text style={styles.imageTitle}>Image {item.image_index}</Text>
          <Text style={styles.damageType}>Damage: {analysis.damageType || 'N/A'}</Text>
          <Text style={styles.severity}>Severity: {analysis.severity || 'N/A'}</Text>
          <Text style={styles.timestamp}>{new Date(item.timestamp).toLocaleDateString()}</Text>
        </View>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDelete(item.id)}
        >
          <Text style={styles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (selectedImage) {
    return (
      <View style={styles.fullImageContainer}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => setSelectedImage(null)}
        >
          <Text style={styles.closeBtnText}>← Back</Text>
        </TouchableOpacity>
        <ScrollView>
          {selectedImage.image_data && (
            <Image
              source={{ uri: `data:image/jpeg;base64,${selectedImage.image_data}` }}
              style={styles.fullImage}
            />
          )}
          <View style={styles.fullImageInfo}>
            <Text style={styles.fullImageTitle}>
              Inspection {selectedImage.inspection_id} - Image {selectedImage.image_index}
            </Text>
            <Text style={styles.analysisTitle}>Damage Analysis</Text>
            <Text style={styles.analysisText}>
              {JSON.stringify(JSON.parse(selectedImage.damage_analysis || '{}'), null, 2)}
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📸 Local Image Database</Text>
        <Text style={styles.subtitle}>All images stored locally on device</Text>
      </View>

      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalImages}</Text>
            <Text style={styles.statLabel}>Total Images</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalInspections}</Text>
            <Text style={styles.statLabel}>Inspections</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalSizeMB} MB</Text>
            <Text style={styles.statLabel}>Database Size</Text>
          </View>
        </View>
      )}

      <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
        <Text style={styles.exportBtnText}>📥 Export as CSV</Text>
      </TouchableOpacity>

      <Text style={styles.imagesTitle}>Stored Images</Text>
      {loading ? (
        <Text style={styles.loadingText}>Loading...</Text>
      ) : images.length === 0 ? (
        <Text style={styles.emptyText}>No images stored yet</Text>
      ) : (
        <FlatList
          data={images}
          renderItem={renderImageItem}
          keyExtractor={(item) => item.id.toString()}
          scrollEnabled={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  exportBtn: {
    backgroundColor: '#34C759',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
  },
  exportBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  imagesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  loadingText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
  },
  imageCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 10,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  thumbnail: {
    width: 80,
    height: 80,
    backgroundColor: '#f0f0f0',
  },
  imageInfo: {
    flex: 1,
    padding: 10,
    justifyContent: 'center',
  },
  imageTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#333',
  },
  damageType: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  severity: {
    fontSize: 12,
    color: '#FF6B6B',
    marginTop: 3,
  },
  timestamp: {
    fontSize: 11,
    color: '#999',
    marginTop: 3,
  },
  deleteBtn: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  deleteBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  fullImageContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  closeBtn: {
    backgroundColor: '#333',
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginTop: 10,
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fullImage: {
    width: width,
    height: width,
    resizeMode: 'contain',
  },
  fullImageInfo: {
    padding: 15,
    backgroundColor: '#f5f5f5',
  },
  fullImageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  analysisTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 10,
    marginBottom: 10,
  },
  analysisText: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
  },
});
