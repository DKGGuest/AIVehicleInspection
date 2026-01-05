import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, SafeAreaView, StatusBar, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useCars } from '@/contexts/cars-context';
import { MaterialIcons } from '@expo/vector-icons';

// Material Design 3 Colors
// Material Design 3 Colors
const MD3Colors = {
    primary: '#000000',
    onPrimary: '#FFFFFF',
    background: '#FDFBFF',
    surface: '#FDFBFF',
    onSurface: '#1C1B1F',
    onSurfaceVariant: '#49454F',
    outline: '#79747E',
};

export default function AddCarScreen() {
    const router = useRouter();
    const { addCar } = useCars();
    const [make, setMake] = useState('');
    const [model, setModel] = useState('');
    const [regNumber, setRegNumber] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!make || !model || !regNumber) {
            Alert.alert('Missing Fields', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            const newCarId = await addCar({
                make,
                model,
                registrationNumber: regNumber,
            });
            // Go directly to photos upload
            router.replace({
                pathname: '/photos',
                params: { carId: newCarId, mode: 'upload' }
            });
        } catch (e) {
            Alert.alert('Error', 'Failed to save car');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <StatusBar barStyle="dark-content" backgroundColor={MD3Colors.background} />
            <SafeAreaView style={{ backgroundColor: MD3Colors.background }}>
            </SafeAreaView>

            <View style={styles.topAppBar}>
                <Pressable onPress={() => router.back()} style={styles.iconButton}>
                    <MaterialIcons name="arrow-back" size={24} color={MD3Colors.onSurface} />
                </Pressable>
                <Text style={styles.titleLarge}>New Vehicle</Text>
                <View style={{ width: 48 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                <Text style={styles.headlineSmall}>Vehicle Details</Text>
                <Text style={styles.bodyMedium}>Enter the information for the car to be inspected.</Text>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Car Make</Text>
                    <TextInput
                        style={styles.outlinedInput}
                        placeholder="e.g. Toyota"
                        placeholderTextColor={MD3Colors.outline}
                        value={make}
                        onChangeText={setMake}
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Car Model</Text>
                    <TextInput
                        style={styles.outlinedInput}
                        placeholder="e.g. Camry"
                        placeholderTextColor={MD3Colors.outline}
                        value={model}
                        onChangeText={setModel}
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Registration Number</Text>
                    <TextInput
                        style={styles.outlinedInput}
                        placeholder="e.g. ABC 1234"
                        placeholderTextColor={MD3Colors.outline}
                        value={regNumber}
                        onChangeText={setRegNumber}
                        autoCapitalize="characters"
                    />
                </View>

                <Pressable
                    style={({ pressed }) => [
                        styles.filledButton,
                        loading && styles.disabledButton,
                        pressed && styles.buttonPressed
                    ]}
                    onPress={handleSave}
                    disabled={loading}
                    android_ripple={{ color: MD3Colors.onPrimary }}
                >
                    <Text style={styles.buttonText}>
                        {loading ? 'Saving...' : 'Save & Continue'}
                    </Text>
                </Pressable>

            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: MD3Colors.background,
    },
    topAppBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: MD3Colors.background,
    },
    iconButton: {
        padding: 8,
    },
    titleLarge: {
        fontSize: 22,
        color: MD3Colors.onSurface,
        fontWeight: '400',
    },
    content: {
        padding: 24,
    },
    headlineSmall: {
        fontSize: 24,
        color: MD3Colors.onSurface,
        marginBottom: 8,
    },
    bodyMedium: {
        fontSize: 14,
        color: MD3Colors.onSurfaceVariant,
        marginBottom: 32,
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 12,
        color: MD3Colors.onSurfaceVariant,
        marginBottom: 8,
        marginLeft: 4,
    },
    outlinedInput: {
        borderWidth: 1,
        borderColor: MD3Colors.outline,
        borderRadius: 4,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: MD3Colors.onSurface,
    },
    filledButton: {
        backgroundColor: MD3Colors.primary,
        paddingVertical: 16,
        borderRadius: 100,
        alignItems: 'center',
        marginTop: 24,
        elevation: 0,
    },
    buttonPressed: {
        opacity: 0.9,
    },
    disabledButton: {
        backgroundColor: '#E0E0E0',
    },
    buttonText: {
        color: MD3Colors.onPrimary,
        fontSize: 16,
        fontWeight: '500',
        letterSpacing: 0.1,
    },
});
