import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  getDatabaseStats,
  exportAndDownload,
  backupDatabase,
  clearDatabase,
  getDatabaseFileSize,
  optimizeDatabase,
} from '@/utils/databaseHelper';
import { clearAllData } from '@/utils/database';

interface Stats {
  totalImages: number;
  totalInspections: number;
  totalSizeMB: number;
  averageImageSize: number;
}

export default function DatabaseManagerScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [dbFileSize, setDbFileSize] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const dbStats = await getDatabaseStats();
      const fileSize = await getDatabaseFileSize();
      setStats(dbStats);
      setDbFileSize(fileSize);
      setLoading(false);
    } catch (error) {
      console.error('Error loading stats:', error);
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const handleViewDatabase = () => {
    router.push('/database');
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      await exportAndDownload();
      Alert.alert('Success', 'Database exported successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to export database');
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    try {
      setLoading(true);
      const backupPath = await backupDatabase();
      Alert.alert('Success', `Database backed up to:\n${backupPath}`);
      await handleRefresh();
    } catch (error) {
      Alert.alert('Error', 'Failed to backup database');
    } finally {
      setLoading(false);
    }
  };

  const handleOptimize = async () => {
    Alert.alert(
      'Optimize Database',
      'This will optimize the database to reclaim space. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Optimize',
          onPress: async () => {
            try {
              setLoading(true);
              await optimizeDatabase();
              Alert.alert('Success', 'Database optimized');
              await handleRefresh();
            } catch (error) {
              Alert.alert('Error', 'Failed to optimize database');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleClearAll = async () => {
    Alert.alert(
      'Clear All Data',
      'This will delete ALL stored images and inspections. This cannot be undone!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          onPress: async () => {
            try {
              setLoading(true);
              await clearAllData();
              Alert.alert('Success', 'All data cleared');
              await handleRefresh();
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data');
            } finally {
              setLoading(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading database stats...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📊 Database Manager</Text>
        <Text style={styles.subtitle}>Manage your local database</Text>
      </View>

      {stats && (
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Database Statistics</Text>

          <View style={styles.statGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.totalImages}</Text>
              <Text style={styles.statName}>Total Images</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.totalInspections}</Text>
              <Text style={styles.statName}>Inspections</Text>
            </View>
          </View>

          <View style={styles.statGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.totalSizeMB}</Text>
              <Text style={styles.statName}>Database Size (MB)</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{Math.round(stats.averageImageSize / 1024)}</Text>
              <Text style={styles.statName}>Avg Image (KB)</Text>
            </View>
          </View>

          <View style={styles.fileInfoBox}>
            <Text style={styles.fileInfoLabel}>Database File Size:</Text>
            <Text style={styles.fileInfoValue}>{(dbFileSize / (1024 * 1024)).toFixed(2)} MB</Text>
          </View>
        </View>
      )}

      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>Actions</Text>

        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton]}
          onPress={handleViewDatabase}
          disabled={loading}
        >
          <Text style={styles.actionButtonText}>📸 View All Images</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={handleRefresh}
          disabled={loading || refreshing}
        >
          <Text style={styles.actionButtonText}>
            {refreshing ? 'Refreshing...' : '🔄 Refresh Stats'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.successButton]}
          onPress={handleExport}
          disabled={loading}
        >
          <Text style={styles.actionButtonText}>📥 Export as CSV</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.infoButton]}
          onPress={handleBackup}
          disabled={loading}
        >
          <Text style={styles.actionButtonText}>💾 Backup Database</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.warningButton]}
          onPress={handleOptimize}
          disabled={loading}
        >
          <Text style={styles.actionButtonText}>⚙️ Optimize Database</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.dangerButton]}
          onPress={handleClearAll}
          disabled={loading}
        >
          <Text style={styles.actionButtonText}>🗑️ Clear All Data</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>💡 Tips</Text>
        <Text style={styles.infoText}>
          • Use "View All Images" to browse and manage individual images{'\n'}
          • "Export as CSV" to download data for reporting{'\n'}
          • "Backup Database" before clearing data{'\n'}
          • "Optimize Database" to reclaim disk space
        </Text>
      </View>

      <View style={styles.spacing} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 25,
    marginTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  statsSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginHorizontal: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  statName: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  fileInfoBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  fileInfoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  fileInfoValue: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  actionsSection: {
    marginBottom: 30,
  },
  actionButton: {
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#5AC8FA',
  },
  successButton: {
    backgroundColor: '#34C759',
  },
  infoButton: {
    backgroundColor: '#FF9500',
  },
  warningButton: {
    backgroundColor: '#FFCC00',
  },
  dangerButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#E8F4F8',
    borderRadius: 10,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 20,
  },
  spacing: {
    height: 20,
  },
});
