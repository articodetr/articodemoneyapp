import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  const { session, loading, isPinSet, isPinVerified } = useAuth();
  const router = useRouter();
  const [forceRedirect, setForceRedirect] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      console.log('Force redirect timeout triggered');
      setForceRedirect(true);
    }, 3000);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    console.log('Index - loading:', loading, 'session:', !!session, 'isPinSet:', isPinSet, 'isPinVerified:', isPinVerified, 'forceRedirect:', forceRedirect);

    if (!loading || forceRedirect) {
      if (!session) {
        console.log('Redirecting to sign-in');
        router.replace('/(auth)/sign-in');
      } else if (isPinSet && !isPinVerified) {
        console.log('Redirecting to pin-entry');
        router.replace('/(auth)/pin-entry');
      } else {
        console.log('Redirecting to tabs');
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
