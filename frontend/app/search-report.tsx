import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, FlatList, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCars } from '@/contexts/cars-context';


export default function SearchReportScreen() {
    const router = useRouter();
    const { cars } = useCars();
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredCars, setFilteredCars] = useState<typeof cars>([]);
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = () => {
        if (!searchQuery.trim()) return;

        const query = searchQuery.toLowerCase();
        const results = cars.filter(car =>
            (car.registrationNumber.toLowerCase().includes(query) ||
                car.make.toLowerCase().includes(query) ||
                car.model.toLowerCase().includes(query)) &&
            car.status === 'analyzed' // Only show cars with reports
        );

        setFilteredCars(results);
        setHasSearched(true);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Find Report</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.inputWrapper}>
                    <Ionicons name="search" size={20} color="#999" />
                    <TextInput
                        style={styles.input}
                        placeholder="Enter car Details (Reg No, Make, Model)..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                        autoFocus
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => { setSearchQuery(''); setHasSearched(false); }}>
                            <Ionicons name="close-circle" size={20} color="#999" />
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
                    <Text style={styles.searchButtonText}>Search</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                {hasSearched && filteredCars.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyTitle}>No Reports Found</Text>
                        <Text style={styles.emptyText}>
                            We couldn't find any analyzed cars matching "{searchQuery}".
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredCars}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.resultItem}
                                onPress={() => router.push({
                                    pathname: '/report',
                                    params: { inspectionId: item.id, results: item.analysisResults }
                                })}
                            >
                                <View>
                                    <Text style={styles.itemTitle}>{item.make} {item.model}</Text>
                                    <Text style={styles.itemSubtitle}>{item.registrationNumber}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#ccc" />
                            </TouchableOpacity>
                        )}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    searchContainer: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F2F2F7',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 12,
        marginBottom: 12,
    },
    input: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        color: '#000',
    },
    searchButton: {
        backgroundColor: '#000',
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: 'center',
    },
    searchButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    content: {
        flex: 1,
    },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    itemSubtitle: {
        fontSize: 14,
        color: '#666',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
        paddingHorizontal: 32,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
        color: '#000',
    },
    emptyText: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
    },
});
