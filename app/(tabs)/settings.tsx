import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  LogOut,
  Lock,
  User,
  DollarSign,
  Info,
  ChevronRight,
} from 'lucide-react-native';

export default function SettingsScreen() {
  const { user, profile, signOut, setPin } = useAuth();
  const router = useRouter();
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const handleSignOut = () => {
    Alert.alert('تسجيل الخروج', 'هل أنت متأكد من تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'تسجيل الخروج',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/sign-in');
        },
      },
    ]);
  };

  const handleChangePin = () => {
    if (newPin.length !== 4) {
      Alert.alert('خطأ', 'رمز PIN يجب أن يكون 4 أرقام');
      return;
    }

    if (newPin !== confirmPin) {
      Alert.alert('خطأ', 'رموز PIN غير متطابقة');
      return;
    }

    setPin(newPin);
    setPinModalVisible(false);
    setNewPin('');
    setConfirmPin('');
    Alert.alert('نجح', 'تم تغيير رمز PIN بنجاح');
  };

  const settingsSections = [
    {
      title: 'الحساب',
      items: [
        {
          icon: <User color="#007AFF" size={20} />,
          label: 'الاسم',
          value: profile?.full_name,
          onPress: () => {},
        },
        {
          icon: <User color="#007AFF" size={20} />,
          label: 'اسم المستخدم',
          value: profile?.username,
          onPress: () => {},
        },
        {
          icon: <DollarSign color="#007AFF" size={20} />,
          label: 'رقم الحساب',
          value: profile?.account_number.toString(),
          onPress: () => {},
        },
        {
          icon: <Lock color="#007AFF" size={20} />,
          label: 'تغيير رمز PIN',
          onPress: () => setPinModalVisible(true),
        },
      ],
    },
    {
      title: 'الإعدادات',
      items: [
        {
          icon: <DollarSign color="#007AFF" size={20} />,
          label: 'العملات',
          value: 'إدارة العملات',
          onPress: () => {},
        },
      ],
    },
    {
      title: 'معلومات',
      items: [
        {
          icon: <Info color="#007AFF" size={20} />,
          label: 'عن التطبيق',
          value: 'الإصدار 1.0.0',
          onPress: () => {},
        },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>الإعدادات</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}>
          <User color="#fff" size={32} />
        </View>
        <Text style={styles.profileName}>{profile?.full_name}</Text>
        <Text style={styles.profileUsername}>@{profile?.username}</Text>
        <View style={styles.accountNumberBadge}>
          <Text style={styles.accountNumberLabel}>رقم الحساب</Text>
          <Text style={styles.accountNumberValue}>{profile?.account_number}</Text>
        </View>
      </View>

      {settingsSections.map((section, sectionIndex) => (
        <View key={sectionIndex} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.items.map((item, itemIndex) => (
            <TouchableOpacity
              key={itemIndex}
              style={styles.settingItem}
              onPress={item.onPress}
            >
              <View style={styles.settingLeft}>
                <View style={styles.settingIcon}>{item.icon}</View>
                <View>
                  <Text style={styles.settingLabel}>{item.label}</Text>
                  {item.value && (
                    <Text style={styles.settingValue}>{item.value}</Text>
                  )}
                </View>
              </View>
              <ChevronRight color="#ccc" size={20} />
            </TouchableOpacity>
          ))}
        </View>
      ))}

      <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
        <LogOut color="#fff" size={20} />
        <Text style={styles.logoutText}>تسجيل الخروج</Text>
      </TouchableOpacity>

      <Modal
        visible={pinModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPinModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>تغيير رمز PIN</Text>

            <TextInput
              style={styles.input}
              placeholder="رمز PIN الجديد (4 أرقام)"
              value={newPin}
              onChangeText={setNewPin}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
            />

            <TextInput
              style={styles.input}
              placeholder="تأكيد رمز PIN"
              value={confirmPin}
              onChangeText={setConfirmPin}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setPinModalVisible(false);
                  setNewPin('');
                  setConfirmPin('');
                }}
              >
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleChangePin}
              >
                <Text style={styles.saveButtonText}>حفظ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  accountNumberBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  accountNumberLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  accountNumberValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  section: {
    marginTop: 8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginLeft: 8,
  },
  settingItem: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  settingValue: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF3B30',
    marginHorizontal: 16,
    marginVertical: 24,
    padding: 16,
    borderRadius: 12,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
