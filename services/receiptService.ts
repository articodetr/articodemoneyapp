import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { generateReceiptHTML } from '@/utils/receiptGenerator';
import { getReceiptLogoBase64 } from '@/utils/logoHelper';
import { getShopSettings } from './logoService';

interface ReceiptData {
  receiptNumber: string;
  customerName: string;
  accountNumber: string;
  amount: number;
  currency: string;
  currencySymbol: string;
  date: Date;
  movementType: 'incoming' | 'outgoing';
  notes?: string;
  commission?: number;
}

const QR_CODE_PLACEHOLDER = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' fill='white'/%3E%3Crect x='10' y='10' width='20' height='20' fill='black'/%3E%3Crect x='40' y='10' width='20' height='20' fill='black'/%3E%3Crect x='70' y='10' width='20' height='20' fill='black'/%3E%3Crect x='10' y='40' width='20' height='20' fill='black'/%3E%3Crect x='40' y='40' width='20' height='20' fill='black'/%3E%3Crect x='70' y='40' width='20' height='20' fill='black'/%3E%3Crect x='10' y='70' width='20' height='20' fill='black'/%3E%3Crect x='40' y='70' width='20' height='20' fill='black'/%3E%3Crect x='70' y='70' width='20' height='20' fill='black'/%3E%3C/svg%3E`;

export async function generateAndShareReceipt(
  receiptData: ReceiptData,
): Promise<boolean> {
  try {
    const logoBase64 = await getReceiptLogoBase64();
    const shopSettings = await getShopSettings();

    const html = generateReceiptHTML(
      {
        ...receiptData,
        shopName: shopSettings?.shop_name || 'التطبيق المحاسبي',
        shopPhone: shopSettings?.shop_phone || '',
      },
      QR_CODE_PLACEHOLDER,
      logoBase64,
    );

    const { uri } = await Print.printToFileAsync({ html });

    const canShare = await Sharing.isAvailableAsync();

    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'مشاركة السند',
        UTI: 'com.adobe.pdf',
      });
    } else {
      console.error('Sharing is not available on this device');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error generating and sharing receipt:', error);
    return false;
  }
}

export async function printReceipt(receiptData: ReceiptData): Promise<boolean> {
  try {
    const logoBase64 = await getReceiptLogoBase64();
    const shopSettings = await getShopSettings();

    const html = generateReceiptHTML(
      {
        ...receiptData,
        shopName: shopSettings?.shop_name || 'التطبيق المحاسبي',
        shopPhone: shopSettings?.shop_phone || '',
      },
      QR_CODE_PLACEHOLDER,
      logoBase64,
    );

    await Print.printAsync({ html });

    return true;
  } catch (error) {
    console.error('Error printing receipt:', error);
    return false;
  }
}
