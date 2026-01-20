import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthIndex() {
  const { session, loading, isPinSet, isPinVerified } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!session) {
        router.replace('/(auth)/sign-in');
      } else if (isPinSet && !isPinVerified) {
        router.replace('/(auth)/pin-entry');
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [session, loading, isPinSet, isPinVerified]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
