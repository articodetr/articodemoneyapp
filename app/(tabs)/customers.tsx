import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Search } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Customer, CURRENCIES } from '@/types/database';
import { useDataRefresh } from '@/contexts/DataRefreshContext';

interface CustomerBalance {
  currency: string;
  balance: number;
}

interface CustomerWithBalances {
  id: string;
  name: string;
  phone: string;
  account_number?: number;
  kind: 'registered' | 'local';
  balances: CustomerBalance[];
  last_activity_date?: string;
  created_at: string;
}

export default function CustomersScreen() {
  const router = useRouter();
  const { lastRefreshTime } = useDataRefresh();
  const [customers, setCustomers] = useState<CustomerWithBalances[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerWithBalances[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      console.log('[Customers] Auto-refreshing due to data change');
      loadCustomers();
    }
  }, [lastRefreshTime]);

  useEffect(() => {
    filterCustomers();
  }, [searchQuery, customers]);

  const loadCustomers = async () => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        setCustomers([]);
        setIsLoading(false);
        return;
      }

      // Load user's customer list
      const { data: userCustomersData, error: userCustomersError } = await supabase
        .from('user_customers')
        .select(`
          id,
          kind,
          registered_user_id,
          local_customer_id,
          created_at
        `)
        .eq('owner_id', currentUser.user.id)
        .order('created_at', { ascending: false }) as any;

      if (userCustomersError) throw userCustomersError;

      if (!userCustomersData || userCustomersData.length === 0) {
        setCustomers([]);
        setIsLoading(false);
        return;
      }

      // Extract IDs for batch loading
      const registeredUserIds = userCustomersData
        .filter((uc: any) => uc.kind === 'registered' && uc.registered_user_id)
        .map((uc: any) => uc.registered_user_id);

      const localCustomerIds = userCustomersData
        .filter((uc: any) => uc.kind === 'local' && uc.local_customer_id)
        .map((uc: any) => uc.local_customer_id);

      // Batch load profiles and local customers
      const [profilesResult, localCustomersResult] = await Promise.all([
        registeredUserIds.length > 0
          ? supabase
              .from('profiles')
              .select('id, full_name, account_number')
              .in('id', registeredUserIds)
          : Promise.resolve({ data: [], error: null }),
        localCustomerIds.length > 0
          ? supabase
              .from('local_customers')
              .select('id, display_name, phone, local_account_number')
              .in('id', localCustomerIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      // Create lookup maps for fast access
      const profilesMap = new Map(
        (profilesResult.data || []).map((p: any) => [p.id, p])
      );
      const localCustomersMap = new Map(
        (localCustomersResult.data || []).map((lc: any) => [lc.id, lc])
      );

      // Load all movements for these customers
      const userCustomerIds = userCustomersData.map((uc: any) => uc.id);

      const { data: movements } = await supabase
        .from('customer_movements')
        .select('user_customer_id, currency, signed_amount, created_at')
        .in('user_customer_id', userCustomerIds)
        .order('created_at', { ascending: false });

      // Calculate balances per customer per currency
      const balancesMap = new Map<string, Map<string, number>>();
      const lastActivityMap = new Map<string, string>();

      movements?.forEach((m: any) => {
        // Track balances
        if (!balancesMap.has(m.user_customer_id)) {
          balancesMap.set(m.user_customer_id, new Map());
        }
        const customerBalances = balancesMap.get(m.user_customer_id)!;
        customerBalances.set(
          m.currency,
          (customerBalances.get(m.currency) || 0) + Number(m.signed_amount)
        );

        // Track last activity date (first occurrence is the latest due to ordering)
        if (!lastActivityMap.has(m.user_customer_id)) {
          lastActivityMap.set(m.user_customer_id, m.created_at);
        }
      });

      // Build customer list maintaining original order
      const customersWithBalances: CustomerWithBalances[] = [];

      for (const userCustomer of userCustomersData) {
        let customerBalances: CustomerBalance[] = [];

        // Get balances for this customer
        const balances = balancesMap.get(userCustomer.id);
        if (balances) {
          customerBalances = Array.from(balances.entries())
            .filter(([_, balance]) => balance !== 0)
            .map(([currency, balance]) => ({
              currency,
              balance,
            }))
            .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
        }

        if (userCustomer.kind === 'registered' && userCustomer.registered_user_id) {
          const profile = profilesMap.get(userCustomer.registered_user_id);
          if (profile) {
            customersWithBalances.push({
              id: profile.id,
              name: profile.full_name || 'بدون اسم',
              phone: '',
              account_number: profile.account_number,
              kind: 'registered',
              balances: customerBalances,
              last_activity_date: lastActivityMap.get(userCustomer.id),
              created_at: userCustomer.created_at,
            });
          }
        } else if (userCustomer.kind === 'local' && userCustomer.local_customer_id) {
          const localCustomer = localCustomersMap.get(userCustomer.local_customer_id);
          if (localCustomer) {
            customersWithBalances.push({
              id: localCustomer.id,
              name: localCustomer.display_name || 'بدون اسم',
              phone: localCustomer.phone || '',
              account_number: localCustomer.local_account_number,
              kind: 'local',
              balances: customerBalances,
              last_activity_date: lastActivityMap.get(userCustomer.id),
              created_at: userCustomer.created_at,
            });
          }
        }
      }

      // Sort customers by last activity (most recent first)
      customersWithBalances.sort((a, b) => {
        const aDate = a.last_activity_date || a.created_at;
        const bDate = b.last_activity_date || b.created_at;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });

      setCustomers(customersWithBalances);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterCustomers = () => {
    if (!searchQuery.trim()) {
      setFilteredCustomers(customers);
      return;
    }

    const filtered = customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone.includes(searchQuery)
    );
    setFilteredCustomers(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCustomers();
    setRefreshing(false);
  };

  const getAvatarColor = (index: number) => {
    const colors = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
    return colors[index % colors.length];
  };

  const getInitials = (name: string) => {
    const words = name.split(' ');
    if (words.length >= 2) {
      return words[0][0] + words[1][0];
    }
    return name.substring(0, 2);
  };

  const getCurrencySymbol = (code: string) => {
    const currency = CURRENCIES.find((c) => c.code === code);
    return currency?.symbol || code;
  };

  const handleCustomerLongPress = (customer: CustomerWithBalances) => {
    Alert.alert('خيارات العميل', `اختر العملية لـ ${customer.name}:`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'فتح',
        onPress: () => router.push(`/customer/${customer.id}?kind=${customer.kind}` as any),
      },
    ]);
  };

  const renderCustomer = ({ item, index }: { item: CustomerWithBalances; index: number }) => {
    const hasBalances = item.balances.length > 0;
    const displayBalances = item.balances.slice(0, 2);

    return (
      <TouchableOpacity
        style={styles.customerCard}
        onPress={() => router.push(`/customer/${item.id}?kind=${item.kind}` as any)}
        onLongPress={() => handleCustomerLongPress(item)}
      >
        <View style={[styles.avatar, { backgroundColor: getAvatarColor(index) }]}>
          <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
        </View>

        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>{item.name}</Text>
          {item.account_number && (
            <Text style={styles.accountNumber}>#{item.account_number}</Text>
          )}
        </View>

        <View style={styles.balanceContainer}>
          {!hasBalances ? (
            <Text style={[styles.balanceText, { color: '#9CA3AF' }]}>ملخص</Text>
          ) : (
            <>
              {displayBalances.map((balance, idx) => {
                const balanceAmount = Number(balance.balance);
                return (
                  <Text
                    key={balance.currency}
                    style={[
                      styles.balanceText,
                      { color: balanceAmount > 0 ? '#10B981' : '#EF4444' },
                      idx > 0 && { fontSize: 13 },
                    ]}
                  >
                    {balanceAmount > 0
                      ? `+${Math.round(balanceAmount)}`
                      : `${Math.round(balanceAmount)}`}{' '}
                    {getCurrencySymbol(balance.currency)}
                  </Text>
                );
              })}
              {item.balances.length > 2 && (
                <Text style={[styles.balanceText, { fontSize: 12, color: '#6B7280' }]}>
                  +{item.balances.length - 2} المزيد
                </Text>
              )}
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>العملاء</Text>
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="ابحث عن عميل..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
          textAlign="right"
        />
      </View>

      <FlatList
        data={filteredCustomers}
        renderItem={renderCustomer}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {isLoading ? 'جاري التحميل...' : 'لا يوجد عملاء'}
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => router.push('/(modals)/add-customer' as any)}
      >
        <Plus size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'right',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginLeft: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#111827',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  customerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  customerInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  customerName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'right',
  },
  accountNumber: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  balanceContainer: {
    alignItems: 'flex-start',
    gap: 2,
  },
  balanceText: {
    fontSize: 15,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    backgroundColor: '#10B981',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
