import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, User, Phone, Hash } from 'lucide-react-native';

interface RegisteredCustomer {
  id: string;
  kind: 'registered';
  username: string;
  full_name: string;
  account_number: number;
  created_at: string;
}

interface LocalCustomer {
  id: string;
  kind: 'local';
  display_name: string;
  phone: string | null;
  note: string | null;
  local_account_number: number;
  created_at: string;
}

type Customer = RegisteredCustomer | LocalCustomer;

export default function CustomersScreen() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const filtered = customers.filter((customer) => {
        if (customer.kind === 'registered') {
          return (
            customer.full_name.toLowerCase().includes(query) ||
            customer.username.toLowerCase().includes(query) ||
            customer.account_number.toString().includes(query)
          );
        } else {
          const localAccountStr = `L-${customer.local_account_number.toString().padStart(4, '0')}`;
          return (
            customer.display_name.toLowerCase().includes(query) ||
            customer.phone?.includes(query) ||
            localAccountStr.includes(query.toUpperCase())
          );
        }
      });
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers(customers);
    }
  }, [searchQuery, customers]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_customers')
        .select('*')
        .eq('owner_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const customersList: Customer[] = [];

      for (const item of data || []) {
        if (item.kind === 'registered' && item.registered_user_id) {
          const { data: profileData } = await supabase
            .from('search_profiles')
            .select('*')
            .eq('id', item.registered_user_id)
            .maybeSingle();

          if (profileData) {
            customersList.push({
              id: item.id,
              kind: 'registered',
              username: profileData.username,
              full_name: profileData.full_name,
              account_number: profileData.account_number,
              created_at: item.created_at,
            });
          }
        } else if (item.kind === 'local' && item.local_customer_id) {
          const { data: localData } = await supabase
            .from('local_customers')
            .select('*')
            .eq('id', item.local_customer_id)
            .maybeSingle();

          if (localData) {
            customersList.push({
              id: item.id,
              kind: 'local',
              display_name: localData.display_name,
              phone: localData.phone,
              note: localData.note,
              local_account_number: localData.local_account_number,
              created_at: item.created_at,
            });
          }
        }
      }

      setCustomers(customersList);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderCustomerCard = ({ item }: { item: Customer }) => (
    <TouchableOpacity
      style={[
        styles.customerCard,
        item.kind === 'local' && styles.localCustomerCard,
      ]}
      onPress={() => router.push(`/customer/${item.id}` as any)}
    >
      <View style={styles.customerHeader}>
        <View
          style={[
            styles.customerAvatar,
            item.kind === 'local' && styles.localCustomerAvatar,
          ]}
        >
          <User
            color={item.kind === 'local' ? '#FF9500' : '#007AFF'}
            size={24}
          />
        </View>
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>
            {item.kind === 'registered' ? item.full_name : item.display_name}
          </Text>
          {item.kind === 'registered' && (
            <Text style={styles.customerUsername}>@{item.username}</Text>
          )}
          {item.kind === 'local' && item.phone && (
            <View style={styles.phoneContainer}>
              <Phone color="#666" size={14} />
              <Text style={styles.customerPhone}>{item.phone}</Text>
            </View>
          )}
        </View>
        {item.kind === 'local' && (
          <View style={styles.localBadge}>
            <Text style={styles.localBadgeText}>غير مسجّل</Text>
          </View>
        )}
      </View>

      <View style={styles.accountNumberContainer}>
        <Hash color="#666" size={14} />
        <Text style={styles.accountNumber}>
          {item.kind === 'registered'
            ? item.account_number
            : `L-${item.local_account_number.toString().padStart(4, '0')}`}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>العملاء</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Plus color="#fff" size={24} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Search color="#666" size={20} />
        <TextInput
          style={styles.searchInput}
          placeholder="ابحث برقم الحساب أو اسم المستخدم"
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={filteredCustomers}
          renderItem={renderCustomerCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <User color="#ccc" size={64} />
              <Text style={styles.emptyText}>لا يوجد عملاء</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => setModalVisible(true)}
              >
                <Text style={styles.emptyButtonText}>إضافة عميل جديد</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <AddCustomerModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSuccess={() => {
            setModalVisible(false);
            loadCustomers();
          }}
        />
      </Modal>
    </View>
  );
}

interface AddCustomerModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function AddCustomerModal({ visible, onClose, onSuccess }: AddCustomerModalProps) {
  const [activeTab, setActiveTab] = useState<'registered' | 'local'>('registered');
  const [searchInput, setSearchInput] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [localForm, setLocalForm] = useState({
    display_name: '',
    phone: '',
    note: '',
  });
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const handleSearch = async () => {
    if (!searchInput.trim()) {
      setError('يرجى إدخال اسم المستخدم أو رقم الحساب');
      return;
    }

    setSearching(true);
    setError('');
    setSearchResult(null);

    try {
      const isNumeric = /^\d+$/.test(searchInput);
      const { data, error } = await supabase
        .from('search_profiles')
        .select('*')
        .eq(isNumeric ? 'account_number' : 'username', isNumeric ? parseInt(searchInput) : searchInput.toLowerCase())
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setError('لم يتم العثور على مستخدم');
      } else if (data.id === user?.id) {
        setError('لا يمكنك إضافة نفسك كعميل');
      } else {
        setSearchResult(data);
      }
    } catch (error: any) {
      setError('حدث خطأ أثناء البحث');
      console.error(error);
    } finally {
      setSearching(false);
    }
  };

  const handleAddRegistered = async () => {
    if (!searchResult) return;

    setAdding(true);
    setError('');

    try {
      const { error } = await supabase.from('user_customers').insert({
        owner_id: user?.id,
        kind: 'registered',
        registered_user_id: searchResult.id,
      });

      if (error) {
        if (error.message?.includes('duplicate')) {
          setError('هذا العميل موجود بالفعل في قائمتك');
        } else {
          throw error;
        }
      } else {
        onSuccess();
      }
    } catch (error: any) {
      setError('حدث خطأ أثناء الإضافة');
      console.error(error);
    } finally {
      setAdding(false);
    }
  };

  const handleAddLocal = async () => {
    if (!localForm.display_name.trim()) {
      setError('يرجى إدخال اسم العميل');
      return;
    }

    setAdding(true);
    setError('');

    try {
      const { data: localCustomer, error: localError } = await supabase
        .from('local_customers')
        .insert({
          owner_id: user?.id,
          display_name: localForm.display_name,
          phone: localForm.phone || null,
          note: localForm.note || null,
        })
        .select()
        .single();

      if (localError) throw localError;

      const { error: userCustomerError } = await supabase
        .from('user_customers')
        .insert({
          owner_id: user?.id,
          kind: 'local',
          local_customer_id: localCustomer.id,
        });

      if (userCustomerError) throw userCustomerError;

      onSuccess();
    } catch (error: any) {
      setError('حدث خطأ أثناء الإضافة');
      console.error(error);
    } finally {
      setAdding(false);
    }
  };

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>إضافة عميل</Text>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'registered' && styles.activeTab]}
            onPress={() => {
              setActiveTab('registered');
              setError('');
              setSearchResult(null);
            }}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'registered' && styles.activeTabText,
              ]}
            >
              عميل مسجّل
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'local' && styles.activeTab]}
            onPress={() => {
              setActiveTab('local');
              setError('');
            }}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'local' && styles.activeTabText,
              ]}
            >
              عميل غير مسجّل
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.tabContent}>
          {activeTab === 'registered' ? (
            <View>
              <TextInput
                style={styles.input}
                placeholder="اسم المستخدم أو رقم الحساب"
                placeholderTextColor="#999"
                value={searchInput}
                onChangeText={setSearchInput}
              />

              <TouchableOpacity
                style={[styles.searchButton, searching && styles.buttonDisabled]}
                onPress={handleSearch}
                disabled={searching}
              >
                {searching ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.searchButtonText}>بحث</Text>
                )}
              </TouchableOpacity>

              {error && <Text style={styles.errorText}>{error}</Text>}

              {searchResult && (
                <View style={styles.resultCard}>
                  <Text style={styles.resultName}>{searchResult.full_name}</Text>
                  <Text style={styles.resultUsername}>
                    @{searchResult.username}
                  </Text>
                  <View style={styles.resultAccount}>
                    <Hash color="#666" size={14} />
                    <Text style={styles.resultAccountText}>
                      {searchResult.account_number}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.addResultButton, adding && styles.buttonDisabled]}
                    onPress={handleAddRegistered}
                    disabled={adding}
                  >
                    {adding ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.addResultButtonText}>إضافة</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <View>
              <TextInput
                style={styles.input}
                placeholder="الاسم *"
                placeholderTextColor="#999"
                value={localForm.display_name}
                onChangeText={(text) =>
                  setLocalForm({ ...localForm, display_name: text })
                }
              />

              <TextInput
                style={styles.input}
                placeholder="رقم الهاتف"
                placeholderTextColor="#999"
                value={localForm.phone}
                onChangeText={(text) =>
                  setLocalForm({ ...localForm, phone: text })
                }
                keyboardType="phone-pad"
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="ملاحظة"
                placeholderTextColor="#999"
                value={localForm.note}
                onChangeText={(text) =>
                  setLocalForm({ ...localForm, note: text })
                }
                multiline
                numberOfLines={3}
              />

              {error && <Text style={styles.errorText}>{error}</Text>}

              <TouchableOpacity
                style={[styles.addButton2, adding && styles.buttonDisabled]}
                onPress={handleAddLocal}
                disabled={adding}
              >
                {adding ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.addButton2Text}>إضافة</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>إغلاق</Text>
        </TouchableOpacity>
      </View>
    </View>
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
    paddingBottom: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    textAlign: 'right',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  customerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  localCustomerCard: {
    backgroundColor: '#FFF9E6',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  localCustomerAvatar: {
    backgroundColor: '#FFF3E0',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  customerUsername: {
    fontSize: 14,
    color: '#666',
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  customerPhone: {
    fontSize: 14,
    color: '#666',
  },
  localBadge: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  localBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  accountNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  accountNumber: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 16,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
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
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#007AFF',
  },
  tabContent: {
    maxHeight: 400,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'right',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  searchButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorText: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    textAlign: 'right',
    fontSize: 14,
  },
  resultCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  resultName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
    textAlign: 'right',
  },
  resultUsername: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    textAlign: 'right',
  },
  resultAccount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  resultAccountText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  addResultButton: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  addResultButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  addButton2: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  addButton2Text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  closeButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});
