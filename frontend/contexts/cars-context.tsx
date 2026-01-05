import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type InspectionReport = {
    stage: number;
    timestamp: number;
    results: string; // JSON string of GeminiAnalysisResult[]
    comparison?: string;
    photos: string[]; // Store photos associated with this report
};

export type Car = {
    id: string;
    make: string;
    model: string;
    registrationNumber: string;
    photos: string[];
    analysisResults?: string; // JSON string of GeminiAnalysisResult[]
    reports?: InspectionReport[]; // History of reports
    status: 'pending_photos' | 'completed' | 'analyzed';
};

type CarsContextType = {
    cars: Car[];
    addCar: (car: Omit<Car, 'id' | 'status' | 'photos'>) => Promise<string>;
    updateCarPhotos: (id: string, photos: string[]) => Promise<void>;
    saveAnalysis: (id: string, results: string) => Promise<void>;
    updateLatestReportComparison: (id: string, comparison: string) => Promise<void>;
    getCar: (id: string) => Car | undefined;
    clearAllCars: () => Promise<void>;
    removeCar: (id: string) => Promise<void>;
};

const CarsContext = createContext<CarsContextType | undefined>(undefined);

export function CarsProvider({ children }: { children: ReactNode }) {
    const [cars, setCars] = useState<Car[]>([]);

    // Load cars on mount
    useEffect(() => {
        loadCars();
    }, []);

    // Save cars whenever they change (debounce could be added but simple is fine for now)
    const [isLoaded, setIsLoaded] = useState(false);
    useEffect(() => {
        if (isLoaded) {
            AsyncStorage.setItem('cars', JSON.stringify(cars)).catch(e => console.error('Failed to save cars', e));
        }
    }, [cars, isLoaded]);

    const loadCars = async () => {
        try {
            const storedCars = await AsyncStorage.getItem('cars');
            if (storedCars) {
                setCars(JSON.parse(storedCars));
            }
        } catch (e) {
            console.error('Failed to load cars', e);
        } finally {
            setIsLoaded(true);
        }
    };

    const addCar = async (carData: Omit<Car, 'id' | 'status' | 'photos'>) => {
        const newCar: Car = {
            id: Date.now().toString(),
            ...carData,
            photos: [],
            status: 'pending_photos',
            reports: [],
        };
        setCars(prev => [...prev, newCar]);
        return newCar.id;
    };

    const updateCarPhotos = async (id: string, photos: string[]) => {
        setCars(prev => prev.map((car) =>
            car.id === id ? { ...car, photos, status: 'completed' as const } : car
        ));
    };

    const saveAnalysis = async (id: string, results: string) => {
        setCars(prev => prev.map((car) => {
            if (car.id === id) {
                const existingReports = car.reports || [];
                const nextStage = existingReports.length + 1;
                const newReport: InspectionReport = {
                    stage: nextStage,
                    timestamp: Date.now(),
                    results: results,
                    comparison: undefined,
                    photos: [...car.photos] // Snapshot of current photos
                };

                return {
                    ...car,
                    analysisResults: results,
                    status: 'analyzed' as const,
                    reports: [...existingReports, newReport]
                };
            }
            return car;
        }));
    };

    const updateLatestReportComparison = async (id: string, comparison: string) => {
        setCars(prev => prev.map((car) => {
            if (car.id === id && car.reports && car.reports.length > 0) {
                const newReports = [...car.reports];
                const lastIndex = newReports.length - 1;
                newReports[lastIndex] = {
                    ...newReports[lastIndex],
                    comparison: comparison
                };
                return { ...car, reports: newReports };
            }
            return car;
        }));
    };

    const clearAllCars = async () => {
        setCars([]);
        try {
            await AsyncStorage.removeItem('cars');
        } catch (e) {
            console.error('Failed to clear cars', e);
        }
    };

    const removeCar = async (id: string) => {
        setCars(prev => prev.filter((car) => car.id !== id));
    };

    const getCar = (id: string) => cars.find((c) => c.id === id);

    return (
        <CarsContext.Provider value={{ cars, addCar, updateCarPhotos, saveAnalysis, updateLatestReportComparison, getCar, clearAllCars, removeCar }}>
            {children}
        </CarsContext.Provider>
    );
}

export function useCars() {
    const context = useContext(CarsContext);
    if (!context) {
        throw new Error('useCars must be used within CarsProvider');
    }
    return context;
}
