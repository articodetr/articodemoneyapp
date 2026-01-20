import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  const { session, loading } = useAuth();

  console.log('Index - Loading:', loading, 'Session:', session ? 'Yes' : 'No');

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>جاري التحميل...</Text>
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
});
