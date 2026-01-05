import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, StatusBar, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';
import { useCars } from '@/contexts/cars-context';
import { MaterialIcons, Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';


export default function DashboardScreen() {
    const router = useRouter();
    const { userId, userName, logout } = useAuth();

    const handleLogout = () => {
        logout();
        router.replace('/login');
    };

    const menuItems = [
        {
            title: 'My Cars',
            route: '/cars',
            description: 'View list & upload photos'
        },
        {
            title: 'New Car',
            route: '/add-car',
            description: 'Add a new vehicle'
        },
        {
            title: 'Profile',
            route: '/profile',
            description: 'Manage your account'
        },
        {
            title: 'View Report',
            route: '/search-report',
            description: 'Search by car details'
        },
        {
            title: 'Claims',
            route: '/claims',
            description: 'Track claim status'
        },
        {
            title: 'Logout',
            route: 'logout',
            description: 'Sign out of your account'
        }
    ];

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header Section */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.welcomeText}>Welcome,</Text>
                    <Text style={styles.userText}>{userName || userId || 'User'}</Text>
                </View>
                {/* Replaced Logout Icon with DKG Logo at the spot of logout logic */}

            </View>

            {/* Main Content */}
            <ScrollView contentContainerStyle={styles.content}>

                {/* Wallan Group Logo */}
                <View style={styles.brandContainer}>
                    <Image
                        source={require('../assets/images/wallan_brand_logo.png')}
                        style={styles.brandLogo}
                        resizeMode="contain"
                    />
                </View>

                <Text style={styles.sectionTitle}>Dashboard</Text>

                <View style={styles.grid}>
                    {menuItems.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.card}
                            onPress={() => {
                                if (item.route === 'logout') {
                                    handleLogout();
                                } else {
                                    router.push(item.route as any);
                                }
                            }}
                        >
                            <View style={styles.cardContent}>
                                <Text style={styles.cardTitle}>{item.title}</Text>
                                <Text style={styles.cardDescription}>{item.description}</Text>
                            </View>
                            <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
                        </TouchableOpacity>
                    ))}
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB', // MD3 Background
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 24,
        backgroundColor: '#F9FAFB',
    },
    welcomeText: {
        fontSize: 16,
        color: '#6B7280',
        marginBottom: 4,
        fontWeight: '500',
    },
    userText: {
        fontSize: 32, // Display Small
        fontWeight: '400',
        color: '#111827',
        letterSpacing: -0.5,
    },
    content: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 16,
        marginLeft: 4,
    },
    grid: {
        gap: 16,
    },
    card: {
        backgroundColor: '#fff', // Surface
        borderRadius: 24, // MD3 Large Shape
        padding: 24,
        flexDirection: 'row',
        alignItems: 'center',
        // MD3 Elevation Level 1
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
    },
    cardDescription: {
        fontSize: 14,
        color: '#6B7280',
    },
    brandContainer: {
        alignItems: 'center',
        marginBottom: 32,
        marginTop: 8,
    },
    brandLogo: {
        width: 140,
        height: 50,
        opacity: 0.8,
    }
});
