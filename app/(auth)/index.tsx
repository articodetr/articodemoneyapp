import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthIndex() {
  const { session, loading, isPinSet, isPinVerified } = useAuth();
  const router = useRouter();
  const [forceRedirect, setForceRedirect] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setForceRedirect(true);
    }, 5000);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!loading || forceRedirect) {
      if (!session) {
        router.replace('/(auth)/sign-in');
      } else if (isPinSet && !isPinVerified) {
        router.replace('/(auth)/pin-entry');
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [session, loading, isPinSet, isPinVerified, forceRedirect]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
      {forceRedirect && (
        <Text style={styles.text}>جاري التحميل...</Text>
      )}
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
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});
