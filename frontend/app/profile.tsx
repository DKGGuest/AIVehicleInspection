import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';
import { Ionicons } from '@expo/vector-icons';


export default function ProfileScreen() {
    const router = useRouter();
    const { userId, logout } = useAuth();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                <View style={styles.avatarContainer}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{userId ? userId.substring(0, 1).toUpperCase() : 'U'}</Text>
                    </View>
                    <Text style={styles.username}>{userId}</Text>
                    <Text style={styles.role}>User</Text>
                </View>

                <View style={styles.infoSection}>
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>Phone Number</Text>
                        <Text style={styles.value}>{userId}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>Member Since</Text>
                        <Text style={styles.value}>Dec 2024</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>Account Status</Text>
                        <Text style={[styles.value, { color: '#34C759' }]}>Active</Text>
                    </View>
                </View>

                <TouchableOpacity style={styles.logoutButton} onPress={() => {
                    logout();
                    router.replace('/login');
                }}>
                    <Text style={styles.logoutText}>Sign Out</Text>
                </TouchableOpacity>
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
    content: {
        flex: 1,
        padding: 20,
        alignItems: 'center',
    },
    avatarContainer: {
        alignItems: 'center',
        marginVertical: 32,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F2F2F7',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    avatarText: {
        fontSize: 40,
        fontWeight: '600',
        color: '#000',
    },
    username: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 4,
    },
    role: {
        fontSize: 16,
        color: '#8E8E93',
    },
    infoSection: {
        width: '100%',
        backgroundColor: '#F9F9F9',
        borderRadius: 12,
        padding: 16,
        marginBottom: 32,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    label: {
        fontSize: 16,
        color: '#666',
    },
    value: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    logoutButton: {
        width: '100%',
        paddingVertical: 16,
        borderRadius: 12,
        backgroundColor: '#FFF0F0',
        alignItems: 'center',
    },
    logoutText: {
        color: '#FF3B30',
        fontSize: 16,
        fontWeight: '600',
    },
});
