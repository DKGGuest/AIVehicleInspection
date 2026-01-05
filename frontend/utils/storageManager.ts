// Storage management utility
// Helps track where photos are stored and manage storage space

import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Get the app's document directory path
 */
export function getAppStoragePath(): string {
  return (FileSystem as any).documentDirectory || '';
}

/**
 * Get all stored photo sets
 */
export async function getStoredPhotoSets(): Promise<{
  carModel: string;
  photoCount: number;
  totalSize: number;
  lastModified: Date;
}[]> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const photoKeys = allKeys.filter(key => key.startsWith('photos_'));

    const sets = [];

    for (const key of photoKeys) {
      const carModel = key.replace('photos_', '');
      const storedData = await AsyncStorage.getItem(key);

      if (storedData) {
        const photos = JSON.parse(storedData);
        let totalSize = 0;

        for (const photo of photos) {
          if (photo.uri) {
            try {
              const fileInfo = await (FileSystem as any).getInfoAsync(photo.uri);
              if (fileInfo && 'size' in fileInfo) {
                totalSize += (fileInfo as any).size;
              }
            } catch (e) {
              // File may have been deleted
            }
          }
        }

        sets.push({
          carModel,
          photoCount: photos.filter((p: any) => p.uri).length,
          totalSize,
          lastModified: new Date(),
        });
      }
    }

    return sets;
  } catch (error) {
    console.log('Error getting photo sets:', error);
    return [];
  }
}

/**
 * Get total app storage used
 */
export async function getTotalStorageUsed(): Promise<number> {
  try {
    const storagePath = getAppStoragePath();
    const files = await FileSystem.readDirectoryAsync(storagePath);

    let totalSize = 0;

    for (const file of files) {
      try {
        const fileInfo = await (FileSystem as any).getInfoAsync(`${storagePath}${file}`);
        if (fileInfo && 'size' in fileInfo) {
          totalSize += (fileInfo as any).size;
        }
      } catch (e) {
        // Skip unreadable files
      }
    }

    return totalSize;
  } catch (error) {
    console.log('Error calculating storage:', error);
    return 0;
  }
}

/**
 * Delete all photos for a car model
 */
export async function deletePhotoSet(carModel: string): Promise<void> {
  try {
    const key = `photos_${carModel}`;
    const storedData = await AsyncStorage.getItem(key);

    if (storedData) {
      const photos = JSON.parse(storedData);

      // Delete physical files
      for (const photo of photos) {
        if (photo.uri) {
          try {
            await FileSystem.deleteAsync(photo.uri, { idempotent: true });
          } catch (e) {
            console.log('Error deleting file:', e);
          }
        }
      }

      // Delete metadata
      await AsyncStorage.removeItem(key);
    }
  } catch (error) {
    console.log('Error deleting photo set:', error);
  }
}

/**
 * Export photos for a car model (create zip or list)
 */
export async function getPhotoSetDetails(carModel: string): Promise<{
  carModel: string;
  photos: {
    name: string;
    uri: string;
    size: number;
    date: string;
  }[];
  totalSize: number;
  storagePath: string;
}> {
  try {
    const key = `photos_${carModel}`;
    const storedData = await AsyncStorage.getItem(key);

    const photos: any[] = [];
    let totalSize = 0;

    if (storedData) {
      const photoList = JSON.parse(storedData);

      for (const photo of photoList) {
        if (photo.uri) {
          try {
            const fileInfo = await (FileSystem as any).getInfoAsync(photo.uri);
            if (fileInfo && 'size' in fileInfo) {
              const fileSize = (fileInfo as any).size;
              totalSize += fileSize;

              photos.push({
                name: photo.name,
                uri: photo.uri,
                size: fileSize,
                date: new Date(((fileInfo as any).modificationTime || Date.now()) * 1000).toLocaleDateString(),
              });
            }
          } catch (e) {
            console.log('Error getting photo info:', e);
          }
        }
      }
    }

    return {
      carModel,
      photos,
      totalSize,
      storagePath: getAppStoragePath(),
    };
  } catch (error) {
    console.log('Error getting photo set details:', error);
    return {
      carModel,
      photos: [],
      totalSize: 0,
      storagePath: getAppStoragePath(),
    };
  }
}

/**
 * Format bytes to readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get storage info for display
 */
export async function getStorageInfo(): Promise<{
  appStorage: string;
  totalFiles: number;
  photoSets: number;
}> {
  try {
    const totalUsed = await getTotalStorageUsed();
    const sets = await getStoredPhotoSets();
    const storagePath = getAppStoragePath();
    const files = await FileSystem.readDirectoryAsync(storagePath);

    return {
      appStorage: formatBytes(totalUsed),
      totalFiles: files.length,
      photoSets: sets.length,
    };
  } catch (error) {
    return {
      appStorage: '0 MB',
      totalFiles: 0,
      photoSets: 0,
    };
  }
}
