import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { Plus, ArrowUp, ArrowDown, DollarSign } from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';

interface Movement {
  id: string;
  customer_id: string;
  amount: number;
  currency: string;
  direction: 'debit' | 'credit';
  commission_amount: number | null;
  notes: string | null;
  created_at: string;
  customers: {
    name: string;
  } | null;
}

interface Customer {
  id: string;
  name: string;
}

const CURRENCIES = ['USD', 'EUR', 'TRY', 'SAR', 'AED'];

export default function TransactionsScreen() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newMovement, setNewMovement] = useState({
    customer_id: '',
    amount: '',
    currency: 'USD',
    direction: 'credit' as 'debit' | 'credit',
    commission_amount: '',
    notes: '',
  });

  useEffect(() => {
    loadMovements();
    loadCustomers();
  }, []);

  const loadMovements = async () => {
    const { data, error } = await supabase
      .from('account_movements')
      .select('*, customers(name)')
      .order('created_at', { ascending: false });

    if (error) {
      Alert.alert('خطأ', 'فشل تحميل المعاملات');
      return;
    }

    setMovements(data || []);
  };

  const loadCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('id, name')
      .order('name');

    if (error) {
      Alert.alert('خطأ', 'فشل تحميل العملاء');
      return;
    }

    setCustomers(data || []);
  };

  const handleAddMovement = async () => {
    if (!newMovement.customer_id) {
      Alert.alert('خطأ', 'الرجاء اختيار عميل');
      return;
    }

    if (!newMovement.amount || parseFloat(newMovement.amount) <= 0) {
      Alert.alert('خطأ', 'الرجاء إدخال مبلغ صحيح');
      return;
    }

    const { error } = await supabase.from('account_movements').insert({
      customer_id: newMovement.customer_id,
      amount: parseFloat(newMovement.amount),
      currency: newMovement.currency,
      direction: newMovement.direction,
      commission_amount: newMovement.commission_amount
        ? parseFloat(newMovement.commission_amount)
        : null,
      notes: newMovement.notes || null,
    } as any);

    if (error) {
      Alert.alert('خطأ', 'فشل إضافة المعاملة');
      return;
    }

    setModalVisible(false);
    setNewMovement({
      customer_id: '',
      amount: '',
      currency: 'USD',
      direction: 'credit',
      commission_amount: '',
      notes: '',
    });
    loadMovements();
  };

  const renderMovementCard = ({ item }: { item: Movement }) => (
    <TouchableOpacity style={styles.movementCard}>
      <View style={styles.movementHeader}>
        <View style={styles.movementIcon}>
          {item.direction === 'credit' ? (
            <ArrowDown color="#34C759" size={20} />
          ) : (
            <ArrowUp color="#FF3B30" size={20} />
          )}
        </View>
        <View style={styles.movementInfo}>
          <Text style={styles.customerName}>
            {item.customers?.name || 'غير محدد'}
          </Text>
          <Text style={styles.movementDate}>
            {new Date(item.created_at).toLocaleDateString('ar')}
          </Text>
        </View>
        <Text
          style={[
            styles.amount,
            item.direction === 'credit' ? styles.credit : styles.debit,
          ]}
        >
          {item.direction === 'credit' ? '+' : '-'}
          {item.amount.toLocaleString()} {item.currency}
        </Text>
      </View>
      {item.commission_amount && (
        <Text style={styles.commission}>
          عمولة: {item.commission_amount} {item.currency}
        </Text>
      )}
      {item.notes && <Text style={styles.notes}>{item.notes}</Text>}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>المعاملات</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Plus color="#fff" size={24} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={movements}
        renderItem={renderMovementCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <DollarSign color="#ccc" size={64} />
            <Text style={styles.emptyText}>لا توجد معاملات</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.emptyButtonText}>إضافة معاملة جديدة</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScroll}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>معاملة جديدة</Text>

              <Text style={styles.label}>العميل *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={newMovement.customer_id}
                  onValueChange={(value) =>
                    setNewMovement({ ...newMovement, customer_id: value })
                  }
                >
                  <Picker.Item label="اختر عميل" value="" />
                  {customers.map((customer) => (
                    <Picker.Item
                      key={customer.id}
                      label={customer.name}
                      value={customer.id}
                    />
                  ))}
                </Picker>
              </View>

              <Text style={styles.label}>نوع المعاملة *</Text>
              <View style={styles.directionButtons}>
                <TouchableOpacity
                  style={[
                    styles.directionButton,
                    newMovement.direction === 'credit' && styles.directionActive,
                  ]}
                  onPress={() =>
                    setNewMovement({ ...newMovement, direction: 'credit' })
                  }
                >
                  <ArrowDown
                    color={
                      newMovement.direction === 'credit' ? '#fff' : '#34C759'
                    }
                    size={20}
                  />
                  <Text
                    style={[
                      styles.directionText,
                      newMovement.direction === 'credit' &&
                        styles.directionTextActive,
                    ]}
                  >
                    دائن (استلام)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.directionButton,
                    newMovement.direction === 'debit' && styles.directionActive,
                  ]}
                  onPress={() =>
                    setNewMovement({ ...newMovement, direction: 'debit' })
                  }
                >
                  <ArrowUp
                    color={
                      newMovement.direction === 'debit' ? '#fff' : '#FF3B30'
                    }
                    size={20}
                  />
                  <Text
                    style={[
                      styles.directionText,
                      newMovement.direction === 'debit' &&
                        styles.directionTextActive,
                    ]}
                  >
                    مدين (صرف)
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>المبلغ *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={newMovement.amount}
                onChangeText={(text) =>
                  setNewMovement({ ...newMovement, amount: text })
                }
                keyboardType="decimal-pad"
              />

              <Text style={styles.label}>العملة *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={newMovement.currency}
                  onValueChange={(value) =>
                    setNewMovement({ ...newMovement, currency: value })
                  }
                >
                  {CURRENCIES.map((currency) => (
                    <Picker.Item
                      key={currency}
                      label={currency}
                      value={currency}
                    />
                  ))}
                </Picker>
              </View>

              <Text style={styles.label}>العمولة (اختياري)</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={newMovement.commission_amount}
                onChangeText={(text) =>
                  setNewMovement({ ...newMovement, commission_amount: text })
                }
                keyboardType="decimal-pad"
              />

              <Text style={styles.label}>ملاحظات (اختياري)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="أدخل ملاحظات..."
                value={newMovement.notes}
                onChangeText={(text) =>
                  setNewMovement({ ...newMovement, notes: text })
                }
                multiline
                numberOfLines={3}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setModalVisible(false);
                    setNewMovement({
                      customer_id: '',
                      amount: '',
                      currency: 'USD',
                      direction: 'credit',
                      commission_amount: '',
                      notes: '',
                    });
                  }}
                >
                  <Text style={styles.cancelButtonText}>إلغاء</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleAddMovement}
                >
                  <Text style={styles.saveButtonText}>حفظ</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
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
  listContainer: {
    padding: 16,
  },
  movementCard: {
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
  movementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  movementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  movementInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  movementDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  credit: {
    color: '#34C759',
  },
  debit: {
    color: '#FF3B30',
  },
  commission: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    paddingLeft: 52,
  },
  notes: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    paddingLeft: 52,
    fontStyle: 'italic',
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
  },
  modalScroll: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    marginTop: 100,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    marginTop: 8,
  },
  pickerContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 16,
  },
  directionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  directionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#f5f5f5',
    backgroundColor: '#fff',
  },
  directionActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  directionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  directionTextActive: {
    color: '#fff',
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
