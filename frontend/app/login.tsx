import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, Image, StatusBar, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';
import { requestOTP, verifyOTP } from '@/utils/api';
import { MaterialIcons } from '@expo/vector-icons';

// Material Design 3 Colors for Login
// Material Design 3 Colors for Login
const MD3LoginColors = {
  primary: '#000000',
  onPrimary: '#FFFFFF',
  surface: '#FDFBFF',
  onSurface: '#1C1B1F',
  onSurfaceVariant: '#49454F',
  outline: '#79747E',
  outlineVariant: '#CAC4D0',
};

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [isLoading, setIsLoading] = useState(false);

  const handleGetOTP = async () => {
    if (phone.length < 10) {
      Alert.alert('Invalid Number', 'Please enter a valid phone number');
      return;
    }

    setIsLoading(true);
    try {
      const response = await requestOTP(phone);
      setStep('otp');
      Alert.alert('Verification Code', `Your OTP is: ${response.otp}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (otp.length < 4) {
      Alert.alert('Invalid OTP', 'Please enter the code sent to your phone');
      return;
    }

    setIsLoading(true);
    try {
      const response = await verifyOTP(phone, parseInt(otp));
      if (response && response.user_id) {
        login(response.user_id.toString(), name);
        router.replace('/dashboard');
      } else {
        Alert.alert('Login Failed', 'Invalid OTP or server error');
      }
    } catch (error) {
      Alert.alert('Error', 'Login failed. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.mainContainer}>
        <View style={styles.logoArea}>
          <Text style={styles.displayMedium}>RideSure</Text>
          <Text style={styles.titleMedium}>Inspection & Claims</Text>
        </View>

        <View style={styles.formCard}>
          {step === 'phone' ? (
            <>
              <Text style={styles.headlineSmall}>Welcome</Text>
              <Text style={styles.bodyMedium}>Sign in to inspect your vehicles</Text>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Full Name (Optional)</Text>
                <TextInput
                  style={styles.outlinedInput}
                  placeholder="e.g. John Doe"
                  placeholderTextColor={MD3LoginColors.outline}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.outlinedInput}
                  placeholder="+91 00000 00000"
                  placeholderTextColor={MD3LoginColors.outline}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>

              <Pressable
                style={({ pressed }) => [styles.filledButton, pressed && styles.buttonPressed]}
                onPress={handleGetOTP}
                android_ripple={{ color: '#FFFFFF33' }}
              >
                <Text style={styles.buttonText}>Get Verification Code</Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.otpHeader}>
                <Pressable onPress={() => setStep('phone')} style={styles.backButton}>
                  <MaterialIcons name="arrow-back" size={24} color={MD3LoginColors.onSurface} />
                </Pressable>
                <Text style={styles.headlineSmall}>Verification</Text>
              </View>
              <Text style={styles.bodyMedium}>Enter the 4-digit code sent to {phone}</Text>

              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.outlinedInput, styles.otpInput]}
                  placeholder="XXXX"
                  placeholderTextColor={MD3LoginColors.outline}
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={4}
                  autoFocus
                />
              </View>

              <Pressable
                style={({ pressed }) => [styles.filledButton, pressed && styles.buttonPressed]}
                onPress={handleLogin}
                android_ripple={{ color: '#FFFFFF33' }}
              >
                <Text style={styles.buttonText}>Sign In</Text>
              </Pressable>
            </>
          )}
        </View>

        <View style={styles.footer}>
          <Image source={require('../assets/images/dkg_footer_logo.png')} style={styles.footerLogo} resizeMode="contain" />
          <Text style={styles.footerText}>Powered By DKG Labs</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MD3LoginColors.surface,
  },
  mainContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  logoArea: {
    marginBottom: 48,
    alignItems: 'center',
  },
  displayMedium: {
    fontSize: 45,
    fontWeight: '400',
    color: MD3LoginColors.onSurface,
    letterSpacing: -0.5,
  },
  titleMedium: {
    fontSize: 16,
    fontWeight: '500',
    color: MD3LoginColors.onSurfaceVariant,
    letterSpacing: 0.15,
  },
  formCard: {
    // No card background, just clean inputs on surface
    gap: 16,
  },
  headlineSmall: {
    fontSize: 24,
    fontWeight: '400',
    color: MD3LoginColors.onSurface,
    marginBottom: 4,
  },
  bodyMedium: {
    fontSize: 14,
    color: MD3LoginColors.onSurfaceVariant,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    color: MD3LoginColors.onSurfaceVariant,
    marginBottom: 8,
    marginLeft: 4,
  },
  outlinedInput: {
    borderWidth: 1,
    borderColor: MD3LoginColors.outline,
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: MD3LoginColors.onSurface,
  },
  otpInput: {
    textAlign: 'center',
    letterSpacing: 8,
    fontSize: 24,
  },
  filledButton: {
    backgroundColor: MD3LoginColors.primary,
    borderRadius: 100, // Fully rounded for MD3 buttons
    height: 48, // Standard height
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    elevation: 0, // Filled buttons usuallt have 0 elevation in resting state in MD3
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonText: {
    color: MD3LoginColors.onPrimary,
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  otpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: MD3LoginColors.onSurfaceVariant,
    opacity: 0.6,
  },
  footerLogo: {
    width: 120,
    height: 40,
    marginBottom: 8,
    opacity: 0.8,
  },
});
