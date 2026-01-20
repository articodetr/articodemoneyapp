import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';

interface QuickAddMovementSheetProps {
  visible: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  customerAccountNumber: string;
  currentBalances?: any[];
  onSuccess: () => void;
}

export default function QuickAddMovementSheet({
  visible,
  onClose,
  customerName,
}: QuickAddMovementSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.title}>إضافة حركة جديدة</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.content}>
            <Text style={styles.placeholder}>
              إضافة حركة لـ {customerName}
            </Text>
            <Text style={styles.placeholder}>هذه الميزة قيد التطوير</Text>
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
    paddingBottom: 40,
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
    padding: 20,
    alignItems: 'center',
  },
  placeholder: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 8,
    textAlign: 'center',
  },
});
