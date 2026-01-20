import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  LogOut,
  User,
  DollarSign,
  Store,
  Phone,
  MapPin,
  Camera,
  Image as ImageIcon,
  Save,
} from 'lucide-react-native';
import {
  pickImageFromGallery,
  pickImageFromCamera,
  uploadLogo,
  updateShopLogo,
  updateShopSettings,
  getShopSettings,
} from '@/services/logoService';

export default function SettingsScreen() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const [shopSettings, setShopSettings] = useState<any>(null);
  const [shopName, setShopName] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);

  useEffect(() => {
    loadShopSettings();
  }, []);

  const loadShopSettings = async () => {
    const settings = await getShopSettings();
    if (settings) {
      setShopSettings(settings);
      setShopName(settings.shop_name || '');
      setShopPhone(settings.shop_phone || '');
      setShopAddress(settings.shop_address || '');
      setLogoUrl(settings.shop_logo_url || null);
    }
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    const success = await updateShopSettings({
      shopName,
      shopPhone,
      shopAddress,
    });

    if (success) {
      Alert.alert('نجح', 'تم حفظ إعدادات المحل بنجاح');
      loadShopSettings();
    } else {
      Alert.alert('خطأ', 'حدث خطأ أثناء حفظ الإعدادات');
    }
    setIsLoading(false);
  };

  const handlePickImage = async (source: 'gallery' | 'camera') => {
    setShowImagePicker(false);
    setIsLoading(true);

    try {
      const result =
        source === 'gallery'
          ? await pickImageFromGallery()
          : await pickImageFromCamera();

      if (!result.success || !result.base64) {
        if (result.error) {
          Alert.alert('خطأ', result.error);
        }
        setIsLoading(false);
        return;
      }

      const uploadResult = await uploadLogo(result.base64);

      if (!uploadResult.success || !uploadResult.url) {
        Alert.alert('خطأ', uploadResult.error || 'فشل رفع الصورة');
        setIsLoading(false);
        return;
      }

      const updateSuccess = await updateShopLogo(uploadResult.url);

      if (updateSuccess) {
        setLogoUrl(uploadResult.url);
        Alert.alert('نجح', 'تم تحديث الشعار بنجاح');
        loadShopSettings();
      } else {
        Alert.alert('خطأ', 'فشل حفظ الشعار');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('خطأ', 'حدث خطأ غير متوقع');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/sign-in');
  };

  const settingsSections = [
    {
      title: 'معلومات الحساب',
      items: [
        {
          icon: <User color="#007AFF" size={20} />,
          label: 'الاسم',
          value: profile?.full_name || '',
        },
        {
          icon: <User color="#007AFF" size={20} />,
          label: 'اسم المستخدم',
          value: profile?.username || '',
        },
        {
          icon: <DollarSign color="#007AFF" size={20} />,
          label: 'رقم الحساب',
          value: profile?.account_number.toString() || '',
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>إعدادات المحل</Text>

        <View style={styles.settingCard}>
          <TouchableOpacity
            style={styles.logoContainer}
            onPress={() => setShowImagePicker(true)}
            disabled={isLoading}
          >
            {logoUrl ? (
              <Image source={{ uri: logoUrl }} style={styles.logoImage} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Store color="#999" size={40} />
                <Text style={styles.logoPlaceholderText}>إضافة شعار</Text>
              </View>
            )}
            {isLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#007AFF" />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.inputGroup}>
            <View style={styles.inputIcon}>
              <Store color="#007AFF" size={20} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="اسم المحل"
              placeholderTextColor="#999"
              value={shopName}
              onChangeText={setShopName}
              textAlign="right"
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputIcon}>
              <Phone color="#007AFF" size={20} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="رقم الهاتف"
              placeholderTextColor="#999"
              value={shopPhone}
              onChangeText={setShopPhone}
              keyboardType="phone-pad"
              textAlign="right"
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputIcon}>
              <MapPin color="#007AFF" size={20} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="العنوان"
              placeholderTextColor="#999"
              value={shopAddress}
              onChangeText={setShopAddress}
              textAlign="right"
            />
          </View>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveSettings}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Save color="#fff" size={20} />
                <Text style={styles.saveButtonText}>حفظ الإعدادات</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {settingsSections.map((section, sectionIndex) => (
        <View key={sectionIndex} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.items.map((item, itemIndex) => (
            <View
              key={itemIndex}
              style={styles.settingItem}
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
            </View>
          ))}
        </View>
      ))}

      <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
        <LogOut color="#fff" size={20} />
        <Text style={styles.logoutText}>تسجيل الخروج</Text>
      </TouchableOpacity>

      <Modal
        visible={showImagePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImagePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowImagePicker(false)}
        >
          <View style={styles.imagePickerModal}>
            <Text style={styles.imagePickerTitle}>اختر مصدر الصورة</Text>

            <TouchableOpacity
              style={styles.imagePickerOption}
              onPress={() => handlePickImage('camera')}
            >
              <Camera color="#007AFF" size={24} />
              <Text style={styles.imagePickerOptionText}>التقاط صورة</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.imagePickerOption}
              onPress={() => handlePickImage('gallery')}
            >
              <ImageIcon color="#007AFF" size={24} />
              <Text style={styles.imagePickerOptionText}>اختيار من المعرض</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.imagePickerCancel}
              onPress={() => setShowImagePicker(false)}
            >
              <Text style={styles.imagePickerCancelText}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
  settingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  logoPlaceholderText: {
    marginTop: 8,
    fontSize: 12,
    color: '#999',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 60,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  inputIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#000',
    textAlign: 'right',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    padding: 14,
    borderRadius: 8,
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  imagePickerModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  imagePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#000',
  },
  imagePickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    marginBottom: 12,
  },
  imagePickerOptionText: {
    fontSize: 16,
    color: '#000',
  },
  imagePickerCancel: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  imagePickerCancelText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '600',
  },
});
