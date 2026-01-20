import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X, ArrowUp, ArrowDown, Plus, Save, Printer } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useDataRefresh } from '@/contexts/DataRefreshContext';

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'دولار أمريكي' },
  { code: 'YER', symbol: 'ر.ى', name: 'ريال يمني' },
  { code: 'SAR', symbol: 'ر.س', name: 'ريال سعودي' },
  { code: 'EGP', symbol: 'ج.م', name: 'جنيه مصري' },
  { code: 'EUR', symbol: '€', name: 'يورو' },
  { code: 'AED', symbol: 'د.إ', name: 'درهم إماراتي' },
  { code: 'QAR', symbol: 'ر.ق', name: 'ريال قطري' },
];

interface QuickAddMovementSheetProps {
  visible: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  customerAccountNumber: string;
  currentBalances?: any[];
  onSuccess: () => void;
}

type MovementType = 'incoming' | 'outgoing';

export default function QuickAddMovementSheet({
  visible,
  onClose,
  customerId,
  customerName,
  onSuccess,
}: QuickAddMovementSheetProps) {
  const { triggerRefresh } = useDataRefresh();
  const [movementType, setMovementType] = useState<MovementType>('incoming');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [note, setNote] = useState('');
  const [commissionEnabled, setCommissionEnabled] = useState(false);
  const [commissionAmount, setCommissionAmount] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [previousBalance, setPreviousBalance] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [userCustomerId, setUserCustomerId] = useState<string>('');

  useEffect(() => {
    if (visible) {
      loadUserCustomerId();
    }
  }, [visible, customerId]);

  useEffect(() => {
    if (visible && userCustomerId) {
      loadPreviousBalance();
    }
  }, [visible, userCustomerId, currency]);

  const loadUserCustomerId = async () => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) return;

      const { data: userCustomer } = await supabase
        .from('user_customers')
        .select('id')
        .eq('owner_id', currentUser.user.id)
        .or(`registered_user_id.eq.${customerId},local_customer_id.eq.${customerId}`)
        .maybeSingle() as any;

      if (userCustomer) {
        setUserCustomerId(userCustomer.id);
      }
    } catch (error) {
      console.error('Error loading user customer ID:', error);
    }
  };

  const loadPreviousBalance = async () => {
    if (!userCustomerId) return;

    setIsLoadingBalance(true);
    try {
      const { data } = await supabase
        .from('customer_balances_by_currency')
        .select('balance')
        .eq('user_customer_id', userCustomerId)
        .eq('currency', currency)
        .maybeSingle() as any;

      setPreviousBalance(data ? Number(data.balance) : 0);
    } catch (error) {
      console.error('Error loading balance:', error);
      setPreviousBalance(0);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const resetForm = () => {
    setMovementType('incoming');
    setAmount('');
    setCurrency('USD');
    setNote('');
    setCommissionEnabled(false);
    setCommissionAmount('');
    setPreviousBalance(0);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const getCurrencySymbol = (code: string) => {
    return CURRENCIES.find((c) => c.code === code)?.symbol || code;
  };

  const calculateNewBalance = () => {
    const amountValue = parseFloat(amount) || 0;
    const signedAmount = movementType === 'incoming' ? amountValue : -amountValue;
    return previousBalance + signedAmount;
  };

  const validateForm = () => {
    const amountValue = parseFloat(amount);

    if (!amount || isNaN(amountValue) || amountValue <= 0) {
      Alert.alert('خطأ', 'الرجاء إدخال مبلغ صحيح أكبر من صفر');
      return false;
    }

    if (movementType === 'incoming' && commissionEnabled) {
      const commissionValue = parseFloat(commissionAmount);
      if (!commissionAmount || isNaN(commissionValue) || commissionValue <= 0) {
        Alert.alert('خطأ', 'الرجاء إدخال قيمة عمولة صحيحة أكبر من صفر');
        return false;
      }
      if (commissionValue >= amountValue) {
        Alert.alert('خطأ', 'العمولة يجب أن تكون أقل من المبلغ الأساسي');
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    if (!userCustomerId) {
      Alert.alert('خطأ', 'لم يتم العثور على معرف العميل');
      return;
    }

    setIsSaving(true);
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) throw new Error('Not authenticated');

      const amountValue = parseFloat(amount);
      const signedAmount = movementType === 'incoming' ? amountValue : -amountValue;

      const mainMovement = {
        owner_id: currentUser.user.id,
        user_customer_id: userCustomerId,
        currency,
        amount: amountValue,
        signed_amount: signedAmount,
        note: note.trim() || null,
      };

      const { error: mainError } = await supabase
        .from('customer_movements')
        .insert(mainMovement);

      if (mainError) throw mainError;

      if (movementType === 'incoming' && commissionEnabled) {
        const commissionValue = parseFloat(commissionAmount);

        const { data: profitLossCustomerId, error: profitLossError } = await supabase
          .rpc('get_or_create_profit_loss_customer', {
            p_owner_id: currentUser.user.id,
          }) as any;

        if (profitLossError) throw profitLossError;

        const commissionMovement = {
          owner_id: currentUser.user.id,
          user_customer_id: profitLossCustomerId,
          currency,
          amount: commissionValue,
          signed_amount: commissionValue,
          note: `عمولة من حركة ${customerName}`,
        };

        const { error: commissionError } = await supabase
          .from('customer_movements')
          .insert(commissionMovement);

        if (commissionError) throw commissionError;
      }

      triggerRefresh();
      onSuccess();
      Alert.alert('نجح', 'تم إضافة الحركة بنجاح');
      handleClose();
    } catch (error) {
      console.error('Error saving movement:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء حفظ الحركة');
    } finally {
      setIsSaving(false);
    }
  };

  const newBalance = calculateNewBalance();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.title}>إضافة حركة</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionLabel}>
              <Text style={styles.required}>* </Text>نوع الحركة
            </Text>
            <View style={styles.typeButtons}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  movementType === 'incoming' && styles.typeButtonIncomingActive,
                ]}
                onPress={() => {
                  setMovementType('incoming');
                  if (movementType !== 'incoming') {
                    setCommissionEnabled(false);
                    setCommissionAmount('');
                  }
                }}
              >
                <ArrowUp
                  size={20}
                  color={movementType === 'incoming' ? '#FFFFFF' : '#10B981'}
                />
                <Text
                  style={[
                    styles.typeButtonText,
                    movementType === 'incoming' && styles.typeButtonTextActive,
                  ]}
                >
                  له
                </Text>
                <Text
                  style={[
                    styles.typeButtonSubtext,
                    movementType === 'incoming' && styles.typeButtonSubtextActive,
                  ]}
                >
                  وارد
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeButton,
                  movementType === 'outgoing' && styles.typeButtonOutgoingActive,
                ]}
                onPress={() => {
                  setMovementType('outgoing');
                  setCommissionEnabled(false);
                  setCommissionAmount('');
                }}
              >
                <ArrowDown
                  size={20}
                  color={movementType === 'outgoing' ? '#FFFFFF' : '#EF4444'}
                />
                <Text
                  style={[
                    styles.typeButtonTextRed,
                    movementType === 'outgoing' && styles.typeButtonTextActive,
                  ]}
                >
                  عليه
                </Text>
                <Text
                  style={[
                    styles.typeButtonSubtextRed,
                    movementType === 'outgoing' && styles.typeButtonSubtextActive,
                  ]}
                >
                  صادر
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionLabel}>
              <Text style={styles.required}>* </Text>المبلغ
            </Text>
            <View style={styles.amountRow}>
              <TouchableOpacity
                style={styles.currencyButton}
                onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
              >
                <Text style={styles.currencySymbol}>{getCurrencySymbol(currency)}</Text>
                <Text style={styles.currencyCode}>{currency}</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor="#9CA3AF"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                textAlign="center"
              />
            </View>

            {showCurrencyPicker && (
              <View style={styles.currencyPicker}>
                {CURRENCIES.map((curr) => (
                  <TouchableOpacity
                    key={curr.code}
                    style={styles.currencyOption}
                    onPress={() => {
                      setCurrency(curr.code);
                      setShowCurrencyPicker(false);
                    }}
                  >
                    <Text style={styles.currencyOptionText}>
                      {curr.symbol} {curr.name}
                    </Text>
                    {currency === curr.code && (
                      <View style={styles.currencySelectedDot} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {movementType === 'incoming' && !commissionEnabled && (
              <TouchableOpacity
                style={styles.addCommissionButton}
                onPress={() => setCommissionEnabled(true)}
              >
                <Plus size={16} color="#3B82F6" />
                <Text style={styles.addCommissionText}>إضافة عمولة</Text>
              </TouchableOpacity>
            )}

            {movementType === 'incoming' && commissionEnabled && (
              <View style={styles.commissionSection}>
                <View style={styles.commissionHeader}>
                  <TouchableOpacity
                    onPress={() => {
                      setCommissionEnabled(false);
                      setCommissionAmount('');
                    }}
                  >
                    <X size={20} color="#EF4444" />
                  </TouchableOpacity>
                  <Text style={styles.commissionLabel}>عمولة</Text>
                </View>
                <View style={styles.amountRow}>
                  <TouchableOpacity style={styles.currencyButton} disabled>
                    <Text style={styles.currencySymbol}>
                      {getCurrencySymbol(currency)}
                    </Text>
                    <Text style={styles.currencyCode}>{currency}</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    value={commissionAmount}
                    onChangeText={setCommissionAmount}
                    keyboardType="decimal-pad"
                    textAlign="center"
                  />
                </View>
              </View>
            )}

            <Text style={styles.sectionLabel}>ملاحظة (اختياري)</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="أضف ملاحظة"
              placeholderTextColor="#9CA3AF"
              value={note}
              onChangeText={setNote}
              textAlign="right"
              multiline
            />

            {amount && parseFloat(amount) > 0 && (
              <View style={styles.previewSection}>
                <Text style={styles.previewTitle}>معاينة الأثر</Text>
                <View style={styles.previewRow}>
                  <Text style={styles.previewValue}>
                    {getCurrencySymbol(currency)} {previousBalance.toFixed(2)}
                  </Text>
                  <Text style={styles.previewLabel}>الرصيد قبل:</Text>
                </View>
                <View style={styles.previewRow}>
                  <Text
                    style={[
                      styles.previewValue,
                      newBalance > 0
                        ? styles.previewValuePositive
                        : styles.previewValueNegative,
                    ]}
                  >
                    {getCurrencySymbol(currency)} {newBalance.toFixed(2)}
                  </Text>
                  <Text style={styles.previewLabel}>الرصيد بعد:</Text>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Save size={20} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>حفظ</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.printButton}
              onPress={() => Alert.alert('طباعة', 'ميزة الطباعة قيد التطوير')}
            >
              <Printer size={18} color="#3B82F6" />
              <Text style={styles.printButtonText}>حفظ + طباعة</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionLabel: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    textAlign: 'right',
  },
  required: {
    color: '#EF4444',
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  typeButtonIncomingActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  typeButtonOutgoingActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  typeButtonTextRed: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  typeButtonSubtext: {
    fontSize: 12,
    color: '#6EE7B7',
  },
  typeButtonSubtextRed: {
    fontSize: 12,
    color: '#FCA5A5',
  },
  typeButtonSubtextActive: {
    color: '#DCFCE7',
  },
  amountRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  amountInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  currencyButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  currencyCode: {
    fontSize: 11,
    color: '#E0E7FF',
  },
  currencyPicker: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    overflow: 'hidden',
  },
  currencyOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  currencyOptionText: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'right',
  },
  currencySelectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4F46E5',
  },
  addCommissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginBottom: 12,
  },
  addCommissionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  commissionSection: {
    marginBottom: 16,
  },
  commissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commissionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  noteInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 60,
    marginBottom: 16,
  },
  previewSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'right',
    marginBottom: 12,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  previewValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  previewValuePositive: {
    color: '#10B981',
  },
  previewValueNegative: {
    color: '#EF4444',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  saveButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  printButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  printButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
});
