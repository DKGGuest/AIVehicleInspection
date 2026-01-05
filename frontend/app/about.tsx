import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';


export default function AboutScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>About App</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.logoContainer}>
                    <View style={styles.logoPlaceholder}>
                        <Ionicons name="car-sport" size={48} color="#fff" />
                    </View>
                    <Text style={styles.appName}>Ride Sure</Text>
                    <Text style={styles.version}>Version 1.0.0</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About</Text>
                    <Text style={styles.text}>
                        Ride Sure is an advanced vehicle inspection and management system powered by AI.
                        It helps users document car conditions, detect damages automatically, and manage claims efficiently.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Features</Text>
                    <View style={styles.featureItem}>
                        <Ionicons name="camera" size={20} color="#007AFF" />
                        <Text style={styles.featureText}>AI-Powered Damage Detection</Text>
                    </View>
                    <View style={styles.featureItem}>
                        <Ionicons name="document-text" size={20} color="#007AFF" />
                        <Text style={styles.featureText}>Instant Reports</Text>
                    </View>
                    <View style={styles.featureItem}>
                        <Ionicons name="cloud" size={20} color="#007AFF" />
                        <Text style={styles.featureText}>Secure Cloud Storage</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Contact Us</Text>
                    <Text style={styles.text}>
                        Email: support@ridesure.ai {'\n'}
                        Phone: +1 800 123 4567
                    </Text>
                </View>
            </ScrollView>
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
        padding: 24,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    appName: {
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 4,
    },
    version: {
        fontSize: 14,
        color: '#8E8E93',
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
        color: '#000',
    },
    text: {
        fontSize: 16,
        lineHeight: 24,
        color: '#333',
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    featureText: {
        marginLeft: 12,
        fontSize: 16,
        color: '#333',
    },
});
