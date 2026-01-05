import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, StatusBar, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';
import { useCars, Car } from '@/contexts/cars-context';
import { MaterialIcons } from '@expo/vector-icons';


export default function CarsScreen() {
  const router = useRouter();
  const { logout, userId } = useAuth();
  const { cars, removeCar } = useCars();

  const handleCarPress = (car: Car) => {
    // If photos are pending, go to upload flow
    // If completed, maybe go to review/edit
    if (car.status === 'analyzed' && car.analysisResults) {
      router.push({
        pathname: '/report',
        params: {
          inspectionId: car.id,
          results: car.analysisResults
        }
      });
    } else if (car.status === 'completed') {
      router.push({
        pathname: '/photos',
        params: { carId: car.id, mode: 'review' },
      });
    } else {
      router.push({
        pathname: '/photos',
        params: { carId: car.id, mode: 'upload' },
      });
    }
  };

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const handleDelete = (carId: string) => {
    Alert.alert(
      "Delete Car",
      "Are you sure you want to delete this car? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => removeCar(carId) }
      ]
    );
  };

  const renderCarItem = ({ item }: { item: Car }) => (
    <View style={styles.carCard}>
      <View style={styles.carHeader}>
        <View>
          <Text style={styles.carTitle}>{item.make} {item.model}</Text>
          <Text style={styles.carReg}>{item.registrationNumber}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[
            styles.statusBadge,
            item.status === 'completed' || item.status === 'analyzed' ? styles.statusCompleted : styles.statusPending
          ]}>
            <Text style={[
              styles.statusText,
              item.status === 'completed' || item.status === 'analyzed' ? styles.statusTextCompleted : styles.statusTextPending
            ]}>
              {item.status === 'analyzed' ? 'Analyzed' : (item.status === 'completed' ? 'Saved' : 'Pending Photos')}
            </Text>
          </View>
          <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
            <MaterialIcons name="delete-outline" size={24} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.actionRow}>
        {item.status === 'analyzed' ? (
          <View style={styles.analyzedActions}>
            <TouchableOpacity onPress={() => handleCarPress(item)} style={styles.textBtn}>
              <Text style={styles.textBtnText}>View Report</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/photos', params: { carId: item.id, mode: 'review' } })}
              style={styles.actionBtn}
            >
              <Text style={styles.actionBtnText}>Edit Photos</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => handleCarPress(item)}
            style={[styles.actionBtn, styles.primaryActionBtn]}
          >
            <Text style={[styles.actionBtnText, styles.primaryActionBtnText]}>
              {item.status === 'completed' ? 'Review Images' : 'Upload Photos'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // Material Design 3 FAB and Card Styles
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.headerTitle}>My Vehicles</Text>
        </View>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => router.replace('/dashboard')}
        >
          <MaterialIcons name="dashboard" size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={cars}
        renderItem={renderCarItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="directions-car" size={64} color="#E5E7EB" />
            <Text style={styles.emptyText}>No vehicles found</Text>
            <Text style={styles.emptySubtext}>Tap the + button to add one</Text>
          </View>
        }
      />

      {/* Material Design 3 Floating Action Button (FAB) */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/add-car')}
        activeOpacity={0.8}
      >
        <MaterialIcons name="add" size={28} color="#fff" />
        <Text style={styles.fabText}>New Car</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB', // MD3 Background
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#F9FAFB',
  },
  greeting: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 28, // Display Small
    fontWeight: '400',
    color: '#111827',
    letterSpacing: -0.5,
  },
  iconButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  listContainer: {
    padding: 24,
    paddingBottom: 100,
  },
  carCard: {
    backgroundColor: '#fff', // Surface
    borderRadius: 24, // MD3 Large corner radius
    padding: 20,
    marginBottom: 16,
    // MD3 Elevation Level 1
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  carHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  carTitle: {
    fontSize: 22, // Headline Small
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  carReg: {
    fontSize: 14,
    color: '#6B7280', // On Surface Variant
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusPending: {
    backgroundColor: '#FFF7ED', // Orange 50
  },
  statusCompleted: {
    backgroundColor: '#ECFDF5', // Emerald 50
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  statusTextPending: {
    color: '#C2410C', // Orange 700
  },
  statusTextCompleted: {
    color: '#047857', // Emerald 700
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
  },
  analyzedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  // Sub-buttons for actions (Tonal Buttons)
  actionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 100,
    backgroundColor: '#F3F4F6', // Secondary Container
  },
  primaryActionBtn: {
    backgroundColor: '#111827', // Primary
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151', // On Secondary Container
  },
  primaryActionBtnText: {
    color: '#fff', // On Primary
  },
  // Text Buttons
  textBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  textBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '500',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827', // Primary
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16, // MD3 FAB radius
    // Elevation Level 3
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  fabText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  }
});
