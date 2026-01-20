import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { DollarSign, Users, TrendingUp, TrendingDown } from 'lucide-react-native';

interface Stats {
  totalCustomers: number;
  totalMovements: number;
  totalDebts: number;
  recentMovements: any[];
}

export default function HomeScreen() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalCustomers: 0,
    totalMovements: 0,
    totalDebts: 0,
    recentMovements: [],
  });
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const loadStats = async () => {
    try {
      const [customersRes, movementsRes, recentRes] = await Promise.all([
        supabase.from('customers').select('id', { count: 'exact' }),
        supabase.from('account_movements').select('id', { count: 'exact' }),
        supabase
          .from('account_movements')
          .select('*, customers(name)')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      setStats({
        totalCustomers: customersRes.count || 0,
        totalMovements: movementsRes.count || 0,
        totalDebts: 0,
        recentMovements: recentRes.data || [],
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>مرحباً، {profile?.full_name || 'المستخدم'}</Text>
        <Text style={styles.title}>الطرف</Text>
        <Text style={styles.subtitle}>نظام إدارة التحويلات المالية</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <Users color="#007AFF" size={24} />
          </View>
          <Text style={styles.statValue}>{stats.totalCustomers}</Text>
          <Text style={styles.statLabel}>إجمالي العملاء</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <TrendingUp color="#34C759" size={24} />
          </View>
          <Text style={styles.statValue}>{stats.totalMovements}</Text>
          <Text style={styles.statLabel}>إجمالي المعاملات</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>آخر المعاملات</Text>
        {stats.recentMovements.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>لا توجد معاملات بعد</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/(tabs)/transactions')}
            >
              <Text style={styles.addButtonText}>إضافة معاملة جديدة</Text>
            </TouchableOpacity>
          </View>
        ) : (
          stats.recentMovements.map((movement) => (
            <View key={movement.id} style={styles.movementCard}>
              <View style={styles.movementHeader}>
                <Text style={styles.movementCustomer}>
                  {movement.customers?.name || 'غير محدد'}
                </Text>
                <Text
                  style={[
                    styles.movementAmount,
                    movement.direction === 'credit'
                      ? styles.credit
                      : styles.debit,
                  ]}
                >
                  {movement.direction === 'credit' ? '+' : '-'}
                  {movement.amount} {movement.currency}
                </Text>
              </View>
              <Text style={styles.movementDate}>
                {new Date(movement.created_at).toLocaleDateString('ar')}
              </Text>
              {movement.notes && (
                <Text style={styles.movementNotes}>{movement.notes}</Text>
              )}
            </View>
          ))
        )}
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>إجراءات سريعة</Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(tabs)/customers')}
        >
          <Users color="#007AFF" size={20} />
          <Text style={styles.actionButtonText}>إدارة العملاء</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(tabs)/transactions')}
        >
          <TrendingUp color="#007AFF" size={20} />
          <Text style={styles.actionButtonText}>معاملة جديدة</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(tabs)/reports')}
        >
          <DollarSign color="#007AFF" size={20} />
          <Text style={styles.actionButtonText}>التقارير المالية</Text>
        </TouchableOpacity>
      </View>
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
    padding: 24,
    paddingTop: 60,
    paddingBottom: 32,
  },
  greeting: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
    opacity: 0.95,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.9,
  },
  statsGrid: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#000',
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  movementCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  movementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  movementCustomer: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  movementAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  credit: {
    color: '#34C759',
  },
  debit: {
    color: '#FF3B30',
  },
  movementDate: {
    fontSize: 12,
    color: '#666',
  },
  movementNotes: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  quickActions: {
    padding: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    gap: 12,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
});
