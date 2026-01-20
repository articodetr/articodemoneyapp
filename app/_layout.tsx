import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/contexts/AuthContext';
import { DataRefreshProvider } from '@/contexts/DataRefreshContext';

export default function RootLayout() {
  useFrameworkReady();

  return (
    <AuthProvider>
      <DataRefreshProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="customer" />
          <Stack.Screen
            name="(modals)/add-customer"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </DataRefreshProvider>
    </AuthProvider>
  );
}
