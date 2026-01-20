import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, User, Hash, Phone, FileText } from 'lucide-react-native';

interface RegisteredCustomerData {
  id: string;
  kind: 'registered';
  username: string;
  full_name: string;
  account_number: number;
}

interface LocalCustomerData {
  id: string;
  kind: 'local';
  display_name: string;
  phone: string | null;
  note: string | null;
  local_account_number: number;
}

type CustomerData = RegisteredCustomerData | LocalCustomerData;

export default function CustomerDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCustomerDetails();
  }, [id]);

  const loadCustomerDetails = async () => {
    setLoading(true);
    setError('');

    try {
      const { data: userCustomer, error: userCustomerError } = await supabase
        .from('user_customers')
        .select('*')
        .eq('id', id)
        .eq('owner_id', user?.id)
        .maybeSingle();

      if (userCustomerError) throw userCustomerError;

      if (!userCustomer) {
        setError('العميل غير موجود');
        return;
      }

      if (userCustomer.kind === 'registered' && userCustomer.registered_user_id) {
        const { data: profileData, error: profileError } = await supabase
          .from('search_profiles')
          .select('*')
          .eq('id', userCustomer.registered_user_id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (profileData) {
          setCustomer({
            id: userCustomer.id,
            kind: 'registered',
            username: profileData.username,
            full_name: profileData.full_name,
            account_number: profileData.account_number,
          });
        }
      } else if (userCustomer.kind === 'local' && userCustomer.local_customer_id) {
        const { data: localData, error: localError } = await supabase
          .from('local_customers')
          .select('*')
          .eq('id', userCustomer.local_customer_id)
          .maybeSingle();

        if (localError) throw localError;

        if (localData) {
          setCustomer({
            id: userCustomer.id,
            kind: 'local',
            display_name: localData.display_name,
            phone: localData.phone,
            note: localData.note,
            local_account_number: localData.local_account_number,
          });
        }
      }
    } catch (error: any) {
      console.error('Error loading customer:', error);
      setError('حدث خطأ أثناء تحميل بيانات العميل');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error || !customer) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'العميل غير موجود'}</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>العودة</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backIcon}
          onPress={() => router.back()}
        >
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>تفاصيل العميل</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View
          style={[
            styles.profileCard,
            customer.kind === 'local' && styles.localProfileCard,
          ]}
        >
          <View
            style={[
              styles.profileAvatar,
              customer.kind === 'local' && styles.localProfileAvatar,
            ]}
          >
            <User
              color={customer.kind === 'local' ? '#FF9500' : '#007AFF'}
              size={48}
            />
          </View>

          <Text style={styles.profileName}>
            {customer.kind === 'registered'
              ? customer.full_name
              : customer.display_name}
          </Text>

          {customer.kind === 'registered' && (
            <Text style={styles.profileUsername}>@{customer.username}</Text>
          )}

          {customer.kind === 'local' && (
            <View style={styles.localBadge}>
              <Text style={styles.localBadgeText}>عميل غير مسجّل</Text>
            </View>
          )}

          <View style={styles.accountNumberBadge}>
            <Hash color="#666" size={16} />
            <Text style={styles.accountNumberText}>
              {customer.kind === 'registered'
                ? customer.account_number
                : `L-${customer.local_account_number.toString().padStart(4, '0')}`}
            </Text>
          </View>
        </View>

        {customer.kind === 'local' && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>معلومات إضافية</Text>

            {customer.phone && (
              <View style={styles.infoRow}>
                <Phone color="#666" size={20} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>رقم الهاتف</Text>
                  <Text style={styles.infoValue}>{customer.phone}</Text>
                </View>
              </View>
            )}

            {customer.note && (
              <View style={styles.infoRow}>
                <FileText color="#666" size={20} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>ملاحظة</Text>
                  <Text style={styles.infoValue}>{customer.note}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        <View style={styles.placeholderSection}>
          <Text style={styles.placeholderText}>
            سيتم عرض دفتر الحساب هنا في المرحلة القادمة
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    color: '#c62828',
    marginBottom: 24,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
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
  localProfileCard: {
    backgroundColor: '#FFF9E6',
    borderWidth: 2,
    borderColor: '#FF9500',
  },
  profileAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  localProfileAvatar: {
    backgroundColor: '#FFF3E0',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
    textAlign: 'center',
  },
  profileUsername: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  localBadge: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 12,
  },
  localBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  accountNumberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  accountNumberText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  infoSection: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
    textAlign: 'right',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    textAlign: 'right',
  },
  infoValue: {
    fontSize: 16,
    color: '#000',
    textAlign: 'right',
  },
  placeholderSection: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f0f0f0',
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});
