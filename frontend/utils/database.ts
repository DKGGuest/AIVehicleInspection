import * as SQLite from 'expo-sqlite';
import { StoredImage, InspectionData } from './types';

let db: SQLite.SQLiteDatabase | null = null;

// Initialize database
export async function initDatabase() {
  try {
    db = await SQLite.openDatabaseAsync('taxi_inspection.db');
    
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS stored_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        inspection_id TEXT,
        image_index INTEGER,
        image_data TEXT,
        damage_analysis TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS inspections (
        id TEXT PRIMARY KEY,
        car_model TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'pending'
      );
    `);
    
    console.log('✅ Database initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
}

// Save image to local database
export async function saveImage(
  inspectionId: string,
  imageIndex: number,
  imageData: string,
  damageAnalysis: any
): Promise<boolean> {
  try {
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    await db.runAsync(
      `INSERT INTO stored_images (inspection_id, image_index, image_data, damage_analysis)
       VALUES (?, ?, ?, ?);`,
      [inspectionId, imageIndex, imageData, JSON.stringify(damageAnalysis)]
    );
    
    console.log('✅ Image saved to database');
    return true;
  } catch (error) {
    console.error('❌ Error saving image:', error);
    return false;
  }
}

// Get all images for an inspection
export async function getImagesByInspection(inspectionId: string): Promise<StoredImage[]> {
  try {
    if (!db) return [];
    
    const result = await db.getAllAsync<StoredImage>(
      `SELECT * FROM stored_images WHERE inspection_id = ? ORDER BY image_index;`,
      [inspectionId]
    );
    
    console.log(`✅ Retrieved ${result.length} images for inspection ${inspectionId}`);
    return result;
  } catch (error) {
    console.error('❌ Error retrieving images:', error);
    return [];
  }
}

// Get all images
export async function getAllImages(): Promise<StoredImage[]> {
  try {
    if (!db) return [];
    
    const result = await db.getAllAsync<StoredImage>(
      `SELECT * FROM stored_images ORDER BY timestamp DESC;`
    );
    
    console.log(`✅ Retrieved ${result.length} total images`);
    return result;
  } catch (error) {
    console.error('❌ Error retrieving images:', error);
    return [];
  }
}

// Update car for inspection
export async function updateCar(inspectionId: string, carModel: string): Promise<boolean> {
  try {
    if (!db) return false;
    
    await db.runAsync(
      `INSERT OR REPLACE INTO inspections (id, car_model, status)
       VALUES (?, ?, 'in_progress');`,
      [inspectionId, carModel]
    );
    
    console.log('✅ Car updated for inspection');
    return true;
  } catch (error) {
    console.error('❌ Error updating car:', error);
    return false;
  }
}

// Get all cars/inspections
export async function getAllCars(): Promise<InspectionData[]> {
  try {
    if (!db) return [];
    
    const result = await db.getAllAsync<InspectionData>(
      `SELECT * FROM inspections ORDER BY created_at DESC;`
    );
    
    console.log(`✅ Retrieved ${result.length} inspections`);
    return result;
  } catch (error) {
    console.error('❌ Error retrieving inspections:', error);
    return [];
  }
}

// Delete inspection and its images
export async function deleteInspection(inspectionId: string): Promise<boolean> {
  try {
    if (!db) return false;
    
    await db.runAsync(
      `DELETE FROM stored_images WHERE inspection_id = ?;`,
      [inspectionId]
    );
    
    await db.runAsync(
      `DELETE FROM inspections WHERE id = ?;`,
      [inspectionId]
    );
    
    console.log('✅ Inspection deleted');
    return true;
  } catch (error) {
    console.error('❌ Error deleting inspection:', error);
    return false;
  }
}

// Delete a single image
export async function deleteImage(imageId: number): Promise<boolean> {
  try {
    if (!db) return false;
    
    await db.runAsync(
      `DELETE FROM stored_images WHERE id = ?;`,
      [imageId]
    );
    
    console.log('✅ Image deleted');
    return true;
  } catch (error) {
    console.error('❌ Error deleting image:', error);
    return false;
  }
}

// Clear all data
export async function clearAllData(): Promise<boolean> {
  try {
    if (!db) return false;
    
    await db.runAsync(`DELETE FROM stored_images;`);
    await db.runAsync(`DELETE FROM inspections;`);
    
    console.log('✅ All data cleared');
    return true;
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    return false;
  }
}

export { db };
