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
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, TrendingUp } from 'lucide-react-native';

interface Balance {
  currency: string;
  amount: number;
}

interface CustomerWithBalances {
  id: string;
  name: string;
  username?: string;
  initials: string;
  avatarColor: string;
  balances: Balance[];
}

const AVATAR_COLORS = [
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
];

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  YER: 'ر.ي',
  SAR: 'ر.س',
  EGP: 'ج.م',
  EUR: '€',
  AED: 'د.إ',
  QAR: 'ر.ق',
};

export default function CustomersScreen() {
  const [customers, setCustomers] = useState<CustomerWithBalances[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerWithBalances[]>([]);
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
      const filtered = customers.filter((customer) =>
        customer.name.toLowerCase().includes(query) ||
        customer.username?.toLowerCase().includes(query)
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers(customers);
    }
  }, [searchQuery, customers]);

  const getInitials = (name: string): string => {
    const words = name.trim().split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return words[0].substring(0, 2).toUpperCase();
  };

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_customers')
        .select('*')
        .eq('owner_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const customersList: CustomerWithBalances[] = [];

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
              name: profileData.full_name,
              username: profileData.username,
              initials: getInitials(profileData.full_name),
              avatarColor: AVATAR_COLORS[customersList.length % AVATAR_COLORS.length],
              balances: [
                { currency: 'USD', amount: -30892 },
                { currency: 'YER', amount: 7783 },
              ],
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
              name: localData.display_name,
              initials: getInitials(localData.display_name),
              avatarColor: AVATAR_COLORS[customersList.length % AVATAR_COLORS.length],
              balances: [
                { currency: 'USD', amount: 4224 },
                { currency: 'YER', amount: 2222 },
                { currency: 'EGP', amount: 1 },
              ],
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

  const formatAmount = (amount: number, currency: string): string => {
    const symbol = CURRENCY_SYMBOLS[currency] || currency;
    const sign = amount < 0 ? '-' : '+';
    const absAmount = Math.abs(amount).toLocaleString('en-US');
    return `${symbol} ${sign}${absAmount}`;
  };

  const renderProfitLossCard = () => (
    <TouchableOpacity style={styles.profitLossCard}>
      <View style={styles.profitLossIcon}>
        <TrendingUp color="#FF9500" size={24} />
      </View>
      <View style={styles.profitLossContent}>
        <Text style={styles.profitLossTitle}>الأرباح والخسائر 💰</Text>
      </View>
      <Text style={styles.profitLossStatus}>متساوي</Text>
    </TouchableOpacity>
  );

  const renderCustomerCard = ({ item }: { item: CustomerWithBalances }) => (
    <TouchableOpacity
      style={styles.customerCard}
      onPress={() => router.push(`/customer/${item.id}` as any)}
    >
      <View style={styles.customerContent}>
        <View style={styles.balancesContainer}>
          {item.balances.map((balance, index) => (
            <Text
              key={index}
              style={[
                styles.balanceText,
                balance.amount < 0 ? styles.balanceNegative : styles.balancePositive,
              ]}
            >
              {formatAmount(balance.amount, balance.currency)}
            </Text>
          ))}
        </View>
        <View style={styles.customerInfo}>
          <View style={[styles.avatar, { backgroundColor: item.avatarColor }]}>
            <Text style={styles.avatarText}>{item.initials}</Text>
          </View>
          <View style={styles.customerDetails}>
            <Text style={styles.customerName}>{item.name}</Text>
            {item.username && (
              <Text style={styles.customerUsername}>@{item.username}</Text>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>العملاء</Text>
      </View>

      <View style={styles.searchContainer}>
        <Search color="#999" size={20} />
        <TextInput
          style={styles.searchInput}
          placeholder="ابحث عن عميل..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      ) : (
        <FlatList
          data={filteredCustomers}
          renderItem={renderCustomerCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListHeaderComponent={renderProfitLossCard}
          ListEmptyComponent={
            <View style={styles.emptyState}>
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

      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setModalVisible(true)}
      >
        <Plus color="#fff" size={28} />
      </TouchableOpacity>

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
    <KeyboardAvoidingView
      style={styles.modalOverlay}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <Pressable style={styles.modalOverlay} onPress={Keyboard.dismiss}>
        <Pressable style={styles.modalContent} onPress={() => {}}>
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

          <ScrollView
            style={styles.tabContent}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 20 }}
          >
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
            <Text style={styles.closeButtonText}>إلغاء</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'right',
  },
  searchContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    textAlign: 'right',
    marginRight: 12,
    color: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  profitLossCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE6A0',
  },
  profitLossIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profitLossContent: {
    flex: 1,
    marginRight: 16,
  },
  profitLossTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'right',
  },
  profitLossStatus: {
    fontSize: 14,
    color: '#666',
    marginLeft: 16,
  },
  customerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  customerContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  customerInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  customerDetails: {
    marginRight: 12,
    alignItems: 'flex-end',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  customerUsername: {
    fontSize: 13,
    color: '#666',
  },
  balancesContainer: {
    alignItems: 'flex-start',
  },
  balanceText: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  balanceNegative: {
    color: '#10B981',
  },
  balancePositive: {
    color: '#EF4444',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 90,
    left: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
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
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: '#000',
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
    color: '#10B981',
  },
  tabContent: {
    maxHeight: 400,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'right',
    color: '#000',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  searchButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
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
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
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
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
    textAlign: 'right',
  },
  resultUsername: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'right',
  },
  addResultButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  addResultButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  addButton2: {
    backgroundColor: '#10B981',
    borderRadius: 12,
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
    borderRadius: 12,
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
