import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowRight, Settings, ChevronDown, Plus, Phone, MessageCircle, FileText, Share2, Search } from 'lucide-react-native';

interface CustomerData {
  id: string;
  name: string;
  username?: string;
  accountNumber: string;
  movementsCount: number;
  kind: 'registered' | 'local';
}

interface Balance {
  currency: string;
  forUs: number;
  forThem: number;
}

interface Movement {
  id: string;
  number: string;
  amount: number;
  currency: string;
  type: 'له' | 'عليه';
  date: string;
  notes?: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  YER: 'ر.ي',
  SAR: 'ر.س',
  EGP: 'ج.م',
  EUR: '€',
};

const getCurrencyPillColor = (currency: string): string => {
  const colors: Record<string, string> = {
    USD: '#FFE5E5',
    YER: '#FFE5E5',
    SAR: '#E5F5FF',
    EGP: '#FFE5E5',
  };
  return colors[currency] || '#F5F5F5';
};

export default function CustomerDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionsModalVisible, setActionsModalVisible] = useState(false);

  useEffect(() => {
    loadCustomerData();
  }, [id]);

  const loadCustomerData = async () => {
    setLoading(true);
    try {
      const { data: userCustomer } = await supabase
        .from('user_customers')
        .select('*')
        .eq('id', id)
        .eq('owner_id', user?.id)
        .maybeSingle();

      if (!userCustomer) return;

      let customerData: CustomerData | null = null;

      if (userCustomer.kind === 'registered' && userCustomer.registered_user_id) {
        const { data: profileData } = await supabase
          .from('search_profiles')
          .select('*')
          .eq('id', userCustomer.registered_user_id)
          .maybeSingle();

        if (profileData) {
          customerData = {
            id: userCustomer.id,
            name: profileData.full_name,
            username: profileData.username,
            accountNumber: profileData.account_number.toString(),
            movementsCount: 6,
            kind: 'registered',
          };
        }
      } else if (userCustomer.kind === 'local' && userCustomer.local_customer_id) {
        const { data: localData } = await supabase
          .from('local_customers')
          .select('*')
          .eq('id', userCustomer.local_customer_id)
          .maybeSingle();

        if (localData) {
          customerData = {
            id: userCustomer.id,
            name: localData.display_name,
            accountNumber: `L-${localData.local_account_number.toString().padStart(4, '0')}`,
            movementsCount: 6,
            kind: 'local',
          };
        }
      }

      setCustomer(customerData);
      setBalances([
        { currency: 'USD', forUs: 30892, forThem: 0 },
        { currency: 'YER', forUs: 0, forThem: 7783 },
      ]);
      setMovements([
        { id: '1', number: '26622', amount: 4600, currency: 'USD', type: 'عليه', date: 'يناير 20' },
        { id: '2', number: '26391', amount: 200, currency: 'USD', type: 'عليه', date: 'يناير 16' },
        { id: '3', number: '26334', amount: 1000, currency: 'YER', type: 'عليه', date: 'يناير 16' },
        { id: '4', number: '26330', amount: 5100, currency: 'USD', type: 'عليه', date: 'يناير 16' },
        { id: '5', number: '26097', amount: 20992, currency: 'USD', type: 'عليه', date: 'يناير 13' },
        { id: '6', number: '26096', amount: 6783, currency: 'YER', type: 'عليه', date: 'يناير 13' },
      ]);
    } catch (error) {
      console.error('Error loading customer:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !customer) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#10B981', '#059669']}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setActionsModalVisible(true)}
          >
            <Settings color="#fff" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{customer.name}</Text>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.back()}
          >
            <ArrowRight color="#fff" size={24} />
          </TouchableOpacity>
        </View>

        <View style={styles.headerChips}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{customer.movementsCount} حركة</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText}>رقم الحساب: {customer.accountNumber}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.balancesSection}>
          {balances.map((balance, index) => (
            <View key={index} style={styles.balanceGroup}>
              {balance.forUs > 0 && (
                <Text style={styles.balanceForUs}>
                  لنا عنده {CURRENCY_SYMBOLS[balance.currency]} {balance.forUs.toLocaleString('en-US')}
                </Text>
              )}
              {balance.forThem > 0 && (
                <Text style={styles.balanceForThem}>
                  له علينا {CURRENCY_SYMBOLS[balance.currency]} {balance.forThem.toLocaleString('en-US')}
                </Text>
              )}
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.summarySection}
          onPress={() => setSummaryExpanded(!summaryExpanded)}
        >
          <ChevronDown
            color="#666"
            size={20}
            style={{
              transform: [{ rotate: summaryExpanded ? '180deg' : '0deg' }],
            }}
          />
          <Text style={styles.summaryTitle}>ملخص الحركات</Text>
        </TouchableOpacity>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.shareButton}>
            <Text style={styles.shareButtonText}>مشاركة الحساب</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <FileText color="#666" size={20} />
            <Text style={styles.actionButtonText}>طباعة PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Phone color="#666" size={20} />
            <Text style={styles.actionButtonText}>اتصال</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <MessageCircle color="#666" size={20} />
            <Text style={styles.actionButtonText}>واتساب</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Search color="#999" size={20} />
          <TextInput
            style={styles.searchInput}
            placeholder="ابحث في الحركات (رقم، مبلغ، تاريخ، ملاحظات...)"
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.movementsSection}>
          <Text style={styles.monthHeader}>يناير 2026</Text>
          {movements.map((movement) => (
            <TouchableOpacity key={movement.id} style={styles.movementCard}>
              <View style={styles.movementRight}>
                <Text style={styles.movementDate}>{movement.date}</Text>
                <Text style={styles.movementNumber}>{movement.number}</Text>
                <Text
                  style={[
                    styles.movementType,
                    movement.type === 'له'
                      ? styles.movementTypeGreen
                      : styles.movementTypeRed,
                  ]}
                >
                  {movement.type}
                </Text>
              </View>
              <View style={styles.movementLeft}>
                <View
                  style={[
                    styles.currencyPill,
                    { backgroundColor: getCurrencyPillColor(movement.currency) },
                  ]}
                >
                  <Text style={styles.currencyPillText}>
                    {CURRENCY_SYMBOLS[movement.currency]}
                  </Text>
                </View>
                <Text style={styles.movementAmount}>
                  {movement.amount.toLocaleString('en-US')}
                </Text>
                <Text style={styles.movementLabel}>من الصحيفة</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.floatingButton}>
        <Plus color="#fff" size={28} />
      </TouchableOpacity>

      <Modal
        visible={actionsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setActionsModalVisible(false)}
      >
        <CustomerActionsModal
          customerName={customer.name}
          onClose={() => setActionsModalVisible(false)}
        />
      </Modal>
    </View>
  );
}

interface CustomerActionsModalProps {
  customerName: string;
  onClose: () => void;
}

function CustomerActionsModal({ customerName, onClose }: CustomerActionsModalProps) {
  return (
    <View style={styles.modalOverlay}>
      <View style={styles.bottomSheet}>
        <Text style={styles.bottomSheetTitle}>إدارة العميل</Text>
        <Text style={styles.bottomSheetSubtitle}>{customerName}</Text>

        <TouchableOpacity style={styles.bottomSheetOption}>
          <Text style={styles.bottomSheetOptionText}>تعديل البيانات</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bottomSheetOption}>
          <Text style={styles.bottomSheetOptionText}>إرسال واتساب</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bottomSheetOption}>
          <Text style={styles.bottomSheetOptionText}>اتصال</Text>
        </TouchableOpacity>

        <View style={styles.bottomSheetDivider} />

        <TouchableOpacity style={styles.bottomSheetOption}>
          <Text style={[styles.bottomSheetOptionText, styles.bottomSheetDanger]}>
            تصفير الحساب
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bottomSheetOption}>
          <Text style={[styles.bottomSheetOptionText, styles.bottomSheetDanger]}>
            حذف العميل
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bottomSheetCancel} onPress={onClose}>
          <Text style={styles.bottomSheetCancelText}>إلغاء</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerButton: {
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
  headerChips: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  chip: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  balancesSection: {
    backgroundColor: '#fff',
    padding: 20,
    gap: 12,
  },
  balanceGroup: {
    gap: 8,
  },
  balanceForUs: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '600',
    textAlign: 'right',
  },
  balanceForThem: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    textAlign: 'right',
  },
  summarySection: {
    backgroundColor: '#fff',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 16,
    marginTop: 1,
    gap: 8,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  actionsRow: {
    flexDirection: 'row-reverse',
    padding: 16,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  actionButtonText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  shareButton: {
    backgroundColor: '#FF9500',
    borderRadius: 12,
    padding: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  shareButtonText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
  searchContainer: {
    backgroundColor: '#fff',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    textAlign: 'right',
    marginRight: 12,
    color: '#000',
  },
  movementsSection: {
    padding: 16,
  },
  monthHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
    textAlign: 'right',
  },
  movementCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  movementRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  movementDate: {
    fontSize: 13,
    color: '#999',
  },
  movementNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  movementType: {
    fontSize: 13,
    fontWeight: '600',
  },
  movementTypeRed: {
    color: '#EF4444',
  },
  movementTypeGreen: {
    color: '#10B981',
  },
  movementLeft: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  movementLabel: {
    fontSize: 11,
    color: '#999',
  },
  movementAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  currencyPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currencyPillText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 90,
    right: 20,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  bottomSheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  bottomSheetSubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  bottomSheetOption: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  bottomSheetOptionText: {
    fontSize: 16,
    color: '#000',
    textAlign: 'right',
  },
  bottomSheetDanger: {
    color: '#EF4444',
  },
  bottomSheetDivider: {
    height: 8,
    backgroundColor: '#F5F5F5',
    marginVertical: 8,
    marginHorizontal: -24,
  },
  bottomSheetCancel: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 16,
  },
  bottomSheetCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
});
