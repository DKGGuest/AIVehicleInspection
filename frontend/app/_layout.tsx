import { Stack } from 'expo-router';
import React from 'react';

import { AuthProvider } from '@/contexts/auth-context';
import { CarsProvider } from '@/contexts/cars-context';

export default function RootLayout() {
  return (
    <AuthProvider>
      <CarsProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </CarsProvider>
    </AuthProvider>
  );
}
