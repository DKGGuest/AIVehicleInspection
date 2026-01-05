import db from './database';
import * as FileSystem from 'expo-file-system/legacy';
import { StoredImage } from './types';

const BACKUP_DIR = `${FileSystem.documentDirectory}inspections`;

// Export all images as CSV
export async function exportImagesAsCSV(): Promise<string> {
  try {
    const result = await new Promise<StoredImage[]>((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          `SELECT * FROM stored_images ORDER BY timestamp DESC;`,
          [],
          (_, { rows }) => {
            const images = rows._array as StoredImage[];
            resolve(images);
          },
          (_, error) => reject(error)
        );
      });
    });

    let csv = 'ID,Inspection ID,Image Index,Damage Type,Severity,Timestamp\n';
    result.forEach((img) => {
      const analysis = JSON.parse(img.damage_analysis || '{}');
      csv += `${img.id},"${img.inspection_id}",${img.image_index},"${analysis.damageType || 'N/A'}","${analysis.severity || 'N/A'}","${img.timestamp}"\n`;
    });

    return csv;
  } catch (error) {
    console.error('❌ Error exporting CSV:', error);
    throw error;
  }
}

// Save CSV to file
export async function saveCSVToFile(csvContent: string): Promise<string> {
  try {
    await FileSystem.makeDirectoryAsync(BACKUP_DIR, { intermediates: true });
    const timestamp = new Date().toISOString().slice(0, 10);
    const filePath = `${BACKUP_DIR}/inspections_${timestamp}.csv`;
    await FileSystem.writeAsStringAsync(filePath, csvContent);
    console.log('✅ CSV saved to:', filePath);
    return filePath;
  } catch (error) {
    console.error('❌ Error saving CSV:', error);
    throw error;
  }
}

// Export and download images
export async function exportAndDownload(): Promise<string> {
  try {
    const csv = await exportImagesAsCSV();
    const filePath = await saveCSVToFile(csv);
    return filePath;
  } catch (error) {
    console.error('❌ Error exporting and downloading:', error);
    throw error;
  }
}

// Get database statistics
export async function getDatabaseStats(): Promise<any> {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        `SELECT COUNT(*) as totalImages FROM stored_images;`,
        [],
        (_, { rows }) => {
          const totalImages = rows._array[0].totalImages;

          tx.executeSql(
            `SELECT COUNT(*) as totalInspections FROM inspections;`,
            [],
            (_, { rows: rows2 }) => {
              const totalInspections = rows2._array[0].totalInspections;

              tx.executeSql(
                `SELECT SUM(LENGTH(image_data)) as totalSize FROM stored_images;`,
                [],
                (_, { rows: rows3 }) => {
                  const totalSize = rows3._array[0].totalSize || 0;
                  const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);

                  resolve({
                    totalImages,
                    totalInspections,
                    totalSizeMB: sizeMB,
                    averageImageSize: totalImages > 0 ? (totalSize / totalImages / 1024).toFixed(2) : 0
                  });
                },
                (_, error) => reject(error)
              );
            },
            (_, error) => reject(error)
          );
        },
        (_, error) => reject(error)
      );
    });
  });
}

// Backup database
export async function backupDatabase(): Promise<string> {
  try {
    const dbPath = `${FileSystem.documentDirectory}SQLite/taxi_inspection.db`;
    const backupPath = `${BACKUP_DIR}/taxi_inspection_backup_${Date.now()}.db`;

    await FileSystem.makeDirectoryAsync(BACKUP_DIR, { intermediates: true });
    await FileSystem.copyAsync({
      from: dbPath,
      to: backupPath
    });

    console.log('✅ Database backed up to:', backupPath);
    return backupPath;
  } catch (error) {
    console.error('❌ Error backing up database:', error);
    throw error;
  }
}

// Restore database from backup
export async function restoreDatabase(backupPath: string): Promise<boolean> {
  try {
    const dbPath = `${FileSystem.documentDirectory}SQLite/taxi_inspection.db`;

    await FileSystem.copyAsync({
      from: backupPath,
      to: dbPath
    });

    console.log('✅ Database restored from:', backupPath);
    return true;
  } catch (error) {
    console.error('❌ Error restoring database:', error);
    throw error;
  }
}

export default {
  exportImagesAsCSV,
  saveCSVToFile,
  exportAndDownload,
  getDatabaseStats,
  backupDatabase,
  restoreDatabase
};
