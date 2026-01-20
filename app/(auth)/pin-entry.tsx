import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function PinEntry() {
  const [pin, setPin] = useState('');
  const { checkPin, isPinSet, setPin: savePin } = useAuth();
  const router = useRouter();
  const maxLength = 4;

  const handleNumberPress = (num: string) => {
    if (pin.length < maxLength) {
      const newPin = pin + num;
      setPin(newPin);

      if (newPin.length === maxLength) {
        setTimeout(() => handlePinComplete(newPin), 100);
      }
    }
  };

  const handlePinComplete = async (completedPin: string) => {
    if (isPinSet) {
      const isCorrect = await checkPin(completedPin);
      if (isCorrect) {
        router.replace('/(tabs)');
      } else {
        Alert.alert('خطأ', 'رمز PIN غير صحيح');
        setPin('');
      }
    } else {
      await savePin(completedPin);
      Alert.alert('نجح', 'تم حفظ رمز PIN بنجاح');
      router.replace('/(tabs)');
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {isPinSet ? 'أدخل رمز PIN' : 'أنشئ رمز PIN'}
      </Text>
      <Text style={styles.subtitle}>
        {isPinSet
          ? 'أدخل رمز PIN للمتابعة'
          : 'أنشئ رمز PIN مكون من 4 أرقام'}
      </Text>

      <View style={styles.pinDisplay}>
        {[...Array(maxLength)].map((_, index) => (
          <View
            key={index}
            style={[
              styles.pinDot,
              pin.length > index && styles.pinDotFilled,
            ]}
          />
        ))}
      </View>

      <View style={styles.keypad}>
        {[
          ['1', '2', '3'],
          ['4', '5', '6'],
          ['7', '8', '9'],
          ['', '0', 'delete'],
        ].map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keypadRow}>
            {row.map((key, keyIndex) => {
              if (key === '') {
                return <View key={keyIndex} style={styles.keypadButton} />;
              }

              if (key === 'delete') {
                return (
                  <TouchableOpacity
                    key={keyIndex}
                    style={styles.keypadButton}
                    onPress={handleDelete}
                  >
                    <Text style={styles.keypadText}>⌫</Text>
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  key={keyIndex}
                  style={styles.keypadButton}
                  onPress={() => handleNumberPress(key)}
                >
                  <Text style={styles.keypadText}>{key}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#000',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 48,
    color: '#666',
  },
  pinDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 48,
    gap: 16,
  },
  pinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: '#fff',
  },
  pinDotFilled: {
    backgroundColor: '#007AFF',
  },
  keypad: {
    gap: 16,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  keypadButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keypadText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
  },
});
