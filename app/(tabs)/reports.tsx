import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { DollarSign, TrendingUp, TrendingDown, Users } from 'lucide-react-native';

interface Balance {
  currency: string;
  balance: number;
}

interface Report {
  totalCustomers: number;
  totalMovements: number;
  balancesByCurrency: Balance[];
  totalCredits: number;
  totalDebits: number;
}

export default function ReportsScreen() {
  const [report, setReport] = useState<Report>({
    totalCustomers: 0,
    totalMovements: 0,
    balancesByCurrency: [],
    totalCredits: 0,
    totalDebits: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    try {
      const [customersRes, movementsRes, balancesRes] = await Promise.all([
        supabase.from('customers').select('id', { count: 'exact' }),
        supabase.from('account_movements').select('*'),
        supabase.from('customer_balances').select('*'),
      ]);

      const movements = (movementsRes.data || []) as any[];
      const credits = movements
        .filter((m) => m.direction === 'credit')
        .reduce((sum, m) => sum + m.amount, 0);
      const debits = movements
        .filter((m) => m.direction === 'debit')
        .reduce((sum, m) => sum + m.amount, 0);

      const balancesByCurrency: { [key: string]: number } = {};
      (balancesRes.data || []).forEach((item: any) => {
        if (!balancesByCurrency[item.currency]) {
          balancesByCurrency[item.currency] = 0;
        }
        balancesByCurrency[item.currency] += item.balance;
      });

      const balances = Object.entries(balancesByCurrency).map(
        ([currency, balance]) => ({
          currency,
          balance,
        })
      );

      setReport({
        totalCustomers: customersRes.count || 0,
        totalMovements: movements.length,
        balancesByCurrency: balances,
        totalCredits: credits,
        totalDebits: debits,
      });
    } catch (error) {
      console.error('Error loading report:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReport();
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
        <Text style={styles.title}>التقارير</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ملخص عام</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#E3F2FD' }]}>
              <Users color="#2196F3" size={24} />
            </View>
            <Text style={styles.statValue}>{report.totalCustomers}</Text>
            <Text style={styles.statLabel}>إجمالي العملاء</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#F3E5F5' }]}>
              <DollarSign color="#9C27B0" size={24} />
            </View>
            <Text style={styles.statValue}>{report.totalMovements}</Text>
            <Text style={styles.statLabel}>إجمالي المعاملات</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#E8F5E9' }]}>
              <TrendingUp color="#4CAF50" size={24} />
            </View>
            <Text style={[styles.statValue, { color: '#4CAF50' }]}>
              {report.totalCredits.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>إجمالي الائتمان</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#FFEBEE' }]}>
              <TrendingDown color="#F44336" size={24} />
            </View>
            <Text style={[styles.statValue, { color: '#F44336' }]}>
              {report.totalDebits.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>إجمالي المدين</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>الأرصدة حسب العملة</Text>

        {report.balancesByCurrency.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>لا توجد أرصدة</Text>
          </View>
        ) : (
          report.balancesByCurrency.map((item, index) => (
            <View key={index} style={styles.balanceCard}>
              <View style={styles.balanceHeader}>
                <View style={styles.currencyBadge}>
                  <Text style={styles.currencyText}>{item.currency}</Text>
                </View>
                <Text
                  style={[
                    styles.balanceAmount,
                    item.balance >= 0 ? styles.positive : styles.negative,
                  ]}
                >
                  {item.balance >= 0 ? '+' : ''}
                  {item.balance.toLocaleString()}
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: '100%',
                      backgroundColor:
                        item.balance >= 0 ? '#4CAF50' : '#F44336',
                    },
                  ]}
                />
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>الإحصائيات</Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>صافي الرصيد</Text>
          <Text
            style={[
              styles.infoValue,
              report.totalCredits - report.totalDebits >= 0
                ? styles.positive
                : styles.negative,
            ]}
          >
            {(report.totalCredits - report.totalDebits).toLocaleString()}
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>معدل المعاملة</Text>
          <Text style={styles.infoValue}>
            {report.totalCustomers > 0
              ? (report.totalMovements / report.totalCustomers).toFixed(2)
              : '0'}
          </Text>
        </View>
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
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#000',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
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
    textAlign: 'center',
  },
  balanceCard: {
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
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  currencyBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  currencyText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  balanceAmount: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  positive: {
    color: '#4CAF50',
  },
  negative: {
    color: '#F44336',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
  },
  infoValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
});
