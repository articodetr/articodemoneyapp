import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { X, Search, UserPlus } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useDataRefresh } from '@/contexts/DataRefreshContext';

interface SearchResult {
  id: string;
  username: string;
  full_name: string;
  account_number: number;
}

export default function AddCustomerModal() {
  const router = useRouter();
  const { triggerRefresh } = useDataRefresh();
  const [activeTab, setActiveTab] = useState<'registered' | 'local'>('registered');

  // Registered customer tab state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAddingRegistered, setIsAddingRegistered] = useState(false);

  // Local customer tab state
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [isAddingLocal, setIsAddingLocal] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('تنبيه', 'الرجاء إدخال اسم المستخدم أو رقم الحساب');
      return;
    }

    setIsSearching(true);
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) throw new Error('Not authenticated');

      // Check if searching by account number
      const isAccountNumber = /^\d+$/.test(searchQuery.trim());

      let query = supabase
        .from('search_profiles')
        .select('id, username, full_name, account_number');

      if (isAccountNumber) {
        query = query.eq('account_number', parseInt(searchQuery.trim()));
      } else {
        query = query.ilike('username', `%${searchQuery.trim()}%`);
      }

      const { data, error } = await query.limit(10);

      if (error) throw error;

      // Filter out current user from results
      const filteredResults = (data || []).filter(result => result.id !== currentUser.user.id);
      setSearchResults(filteredResults);

      if (filteredResults.length === 0) {
        Alert.alert('نتيجة البحث', 'لم يتم العثور على نتائج');
      }
    } catch (error) {
      console.error('Error searching:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء البحث');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddRegisteredCustomer = async (profile: SearchResult) => {
    setIsAddingRegistered(true);
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) throw new Error('Not authenticated');

      // Check if already added
      const { data: existing } = await supabase
        .from('user_customers')
        .select('id')
        .eq('owner_id', currentUser.user.id)
        .eq('registered_user_id', profile.id)
        .maybeSingle() as any;

      if (existing) {
        Alert.alert('تنبيه', 'هذا العميل مضاف بالفعل إلى قائمتك');
        return;
      }

      // Add to user_customers
      const { error: insertError } = await supabase
        .from('user_customers')
        .insert({
          owner_id: currentUser.user.id,
          kind: 'registered',
          registered_user_id: profile.id,
        } as any);

      if (insertError) throw insertError;

      Alert.alert('نجح', `تم إضافة ${profile.full_name} إلى قائمة عملائك`);
      triggerRefresh();
      router.back();
    } catch (error) {
      console.error('Error adding registered customer:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء إضافة العميل');
    } finally {
      setIsAddingRegistered(false);
    }
  };

  const handleAddLocalCustomer = async () => {
    if (!displayName.trim()) {
      Alert.alert('تنبيه', 'الرجاء إدخال اسم العميل');
      return;
    }

    setIsAddingLocal(true);
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) throw new Error('Not authenticated');

      // Create local customer
      const { data: localCustomer, error: localError } = await supabase
        .from('local_customers')
        .insert({
          owner_id: currentUser.user.id,
          display_name: displayName.trim(),
          phone: phone.trim() || null,
          note: note.trim() || null,
        } as any)
        .select()
        .single() as any;

      if (localError) throw localError;

      // Add to user_customers
      const { error: linkError } = await supabase
        .from('user_customers')
        .insert({
          owner_id: currentUser.user.id,
          kind: 'local',
          local_customer_id: localCustomer.id,
        } as any);

      if (linkError) throw linkError;

      Alert.alert('نجح', `تم إضافة ${displayName.trim()} إلى قائمة عملائك`);
      triggerRefresh();
      router.back();
    } catch (error) {
      console.error('Error adding local customer:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء إضافة العميل');
    } finally {
      setIsAddingLocal(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <X size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إضافة عميل</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'local' && styles.activeTab]}
          onPress={() => setActiveTab('local')}
        >
          <Text style={[styles.tabText, activeTab === 'local' && styles.activeTabText]}>
            عميل غير مسجّل
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'registered' && styles.activeTab]}
          onPress={() => setActiveTab('registered')}
        >
          <Text style={[styles.tabText, activeTab === 'registered' && styles.activeTabText]}>
            عميل مسجّل
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {activeTab === 'registered' ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>البحث عن عميل مسجّل</Text>
            <Text style={styles.sectionDescription}>
              ابحث باستخدام اسم المستخدم أو رقم الحساب
            </Text>

            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="اسم المستخدم أو رقم الحساب"
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                textAlign="right"
                autoCapitalize="none"
                onSubmitEditing={handleSearch}
              />
              <TouchableOpacity
                style={styles.searchButton}
                onPress={handleSearch}
                disabled={isSearching}
              >
                {isSearching ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Search size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>

            {searchResults.length > 0 && (
              <View style={styles.resultsContainer}>
                {searchResults.map((result) => (
                  <TouchableOpacity
                    key={result.id}
                    style={styles.resultCard}
                    onPress={() => handleAddRegisteredCustomer(result)}
                    disabled={isAddingRegistered}
                  >
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultName}>{result.full_name}</Text>
                      <Text style={styles.resultUsername}>@{result.username}</Text>
                      <Text style={styles.resultAccount}>
                        رقم الحساب: {result.account_number}
                      </Text>
                    </View>
                    {isAddingRegistered ? (
                      <ActivityIndicator size="small" color="#10B981" />
                    ) : (
                      <UserPlus size={24} color="#10B981" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>إضافة عميل غير مسجّل</Text>
            <Text style={styles.sectionDescription}>
              أضف عميل ليس لديه حساب في النظام
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                اسم العميل <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="أدخل اسم العميل"
                placeholderTextColor="#9CA3AF"
                value={displayName}
                onChangeText={setDisplayName}
                textAlign="right"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>رقم الهاتف (اختياري)</Text>
              <TextInput
                style={styles.input}
                placeholder="أدخل رقم الهاتف"
                placeholderTextColor="#9CA3AF"
                value={phone}
                onChangeText={setPhone}
                textAlign="right"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>ملاحظات (اختياري)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="أضف ملاحظات"
                placeholderTextColor="#9CA3AF"
                value={note}
                onChangeText={setNote}
                textAlign="right"
                multiline
                numberOfLines={3}
              />
            </View>

            <TouchableOpacity
              style={[styles.addButton, isAddingLocal && styles.addButtonDisabled]}
              onPress={handleAddLocalCustomer}
              disabled={isAddingLocal}
            >
              {isAddingLocal ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.addButtonText}>إضافة العميل</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  tabContainer: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  activeTab: {
    backgroundColor: '#10B981',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'right',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'right',
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchButton: {
    backgroundColor: '#10B981',
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsContainer: {
    gap: 12,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  resultInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  resultUsername: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  resultAccount: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'right',
  },
  required: {
    color: '#EF4444',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    height: 96,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  addButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
