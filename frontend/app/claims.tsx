import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useCars } from '@/contexts/cars-context';


export default function ClaimsScreen() {
    const router = useRouter();
    const { cars } = useCars();

    // In a real app, 'isClaimed' would be a property on the car object. 
    // For now, let's filter cars that have been 'analyzed' and assume some have claims (or just show analyzed ones as potential claims).
    // Or we can just show all 'analyzed' cars as "Claim Eligible/Initiated".
    // The user said: "claims(till now which car has opt for claims will show)"
    // Since we don't have a specific "opted for claim" state in backend yet, I'll assume any car with severity 'severe' or 'moderate'
    // in the analysis results might be in the claims list, or just show analyzed ones.

    // Let's filter cars that have analysis results for now.
    const claimCars = cars.filter(c => c.status === 'analyzed' && c.analysisResults);

    const renderItem = ({ item }: { item: any }) => {
        let severeCount = 0;
        try {
            const results = JSON.parse(item.analysisResults || '[]');
            severeCount = results.filter((r: any) => r.severity === 'severe' || r.severity === 'moderate').length;
        } catch (e) { }

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => router.push({
                    pathname: '/report',
                    params: { inspectionId: item.id, results: item.analysisResults }
                })}
            >
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={styles.carTitle}>{item.make} {item.model}</Text>
                        <Text style={styles.regNumber}>{item.registrationNumber}</Text>
                    </View>
                    <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>Processing</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.cardFooter}>
                    <View style={styles.footerItem}>
                        <Text style={styles.footerLabel}>Detected Damages</Text>
                        <Text style={styles.footerValue}>{severeCount} Issues</Text>
                    </View>
                    <View style={styles.footerItem}>
                        <Text style={styles.footerLabel}>Clone ID</Text>
                        <Text style={styles.footerValue}>#{item.id.slice(-6)}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Claims</Text>
                <View style={{ width: 40 }} />
            </View>

            <FlatList
                data={claimCars}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <MaterialIcons name="shield" size={64} color="#E5E5EA" />
                        <Text style={styles.emptyTitle}>No Claims Yet</Text>
                        <Text style={styles.emptyText}>Cars with reported damage will appear here.</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F7',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
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
    list: {
        padding: 16,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    carTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
    },
    regNumber: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    statusBadge: {
        backgroundColor: '#F2F2F7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#000',
    },
    divider: {
        height: 1,
        backgroundColor: '#F2F2F7',
        marginVertical: 12,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    footerItem: {
        flex: 1,
    },
    footerLabel: {
        fontSize: 12,
        color: '#999',
        marginBottom: 4,
    },
    footerValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#000',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
        textAlign: 'center',
    },
});
