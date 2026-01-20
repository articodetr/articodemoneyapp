import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { numberToArabicTextWithCurrency } from './numberToArabicText';
import { generatePDFHeaderHTML, generatePDFHeaderStyles } from './pdfHeaderGenerator';

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
  shopName?: string;
  shopPhone?: string;
}

function generateQRCodeData(receipt: ReceiptData): string {
  const data = {
    receipt: receipt.receiptNumber,
    customer: receipt.customerName,
    amount: receipt.amount,
    currency: receipt.currency,
    date: format(receipt.date, 'yyyy-MM-dd'),
    type: receipt.movementType === 'incoming' ? 'قبض' : 'صرف',
  };

  return JSON.stringify(data);
}

export function generateReceiptHTML(
  receipt: ReceiptData,
  qrCodeUrl: string,
  logoUrl?: string,
): string {
  const amountInWords = numberToArabicTextWithCurrency(
    receipt.amount,
    receipt.currency,
  );

  const netAmount = receipt.commission
    ? receipt.amount - receipt.commission
    : receipt.amount;

  const receiptTypeText =
    receipt.movementType === 'incoming' ? 'سند قبض' : 'سند صرف';
  const receiptTypeColor =
    receipt.movementType === 'incoming' ? '#10B981' : '#EF4444';

  const header = generatePDFHeaderHTML({
    title: receiptTypeText,
    logoUrl,
    primaryColor: receiptTypeColor,
    showPhone: true,
    shopName: receipt.shopName || 'التطبيق المحاسبي',
    shopPhone: receipt.shopPhone || '',
  });

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${receiptTypeText} - ${receipt.receiptNumber}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Cairo', 'Arial', sans-serif;
      background: white;
      padding: 20px;
      direction: rtl;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    ${generatePDFHeaderStyles()}

    .receipt-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      border-radius: 12px;
      overflow: hidden;
    }

    .receipt-body {
      padding: 30px 40px;
    }

    .info-section {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-bottom: 30px;
    }

    .info-box {
      background: #F9FAFB;
      padding: 16px;
      border-radius: 8px;
      border-left: 4px solid ${receiptTypeColor};
    }

    .info-label {
      font-size: 12px;
      color: #6B7280;
      margin-bottom: 6px;
      font-weight: 600;
    }

    .info-value {
      font-size: 18px;
      color: #111827;
      font-weight: 700;
    }

    .amount-section {
      display: grid;
      grid-template-columns: repeat(${receipt.commission ? '4' : '2'}, 1fr);
      gap: 16px;
      margin: 30px 0;
    }

    .amount-card {
      background: linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%);
      padding: 20px;
      border-radius: 12px;
      text-align: center;
      border: 2px solid #D1D5DB;
    }

    .amount-card.primary {
      background: linear-gradient(135deg, ${receiptTypeColor} 0%, ${receiptTypeColor}dd 100%);
      color: white;
      border-color: ${receiptTypeColor};
    }

    .amount-label {
      font-size: 13px;
      opacity: 0.8;
      margin-bottom: 8px;
      font-weight: 600;
    }

    .amount-value {
      font-size: 24px;
      font-weight: bold;
    }

    .amount-in-words {
      background: #FEF3C7;
      padding: 20px;
      border-radius: 12px;
      margin: 30px 0;
      border: 2px solid #FCD34D;
    }

    .amount-in-words-label {
      font-size: 14px;
      color: #92400E;
      margin-bottom: 8px;
      font-weight: 600;
    }

    .amount-in-words-value {
      font-size: 20px;
      color: #78350F;
      font-weight: bold;
    }

    .notes-section {
      background: #F3F4F6;
      padding: 20px;
      border-radius: 12px;
      margin: 30px 0;
      min-height: 80px;
    }

    .notes-label {
      font-size: 14px;
      color: #6B7280;
      margin-bottom: 10px;
      font-weight: 600;
    }

    .notes-value {
      font-size: 16px;
      color: #111827;
      line-height: 1.6;
    }

    .qr-section {
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 30px 0;
      padding: 20px;
      background: #F9FAFB;
      border-radius: 12px;
    }

    .qr-code {
      width: 150px;
      height: 150px;
      border: 4px solid ${receiptTypeColor};
      border-radius: 12px;
      padding: 8px;
      background: white;
    }

    .footer {
      text-align: center;
      padding: 20px;
      background: #F9FAFB;
      border-top: 2px solid #E5E7EB;
      font-size: 13px;
      color: #6B7280;
    }

    @media print {
      body {
        padding: 0;
      }

      .receipt-container {
        box-shadow: none;
        border-radius: 0;
      }

      @page {
        size: A4;
        margin: 0;
      }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    ${header}

    <div class="receipt-body">
      <div class="info-section">
        <div class="info-box">
          <div class="info-label">رقم السند</div>
          <div class="info-value">${receipt.receiptNumber}</div>
        </div>
        <div class="info-box">
          <div class="info-label">التاريخ</div>
          <div class="info-value">${format(receipt.date, 'dd/MM/yyyy', { locale: ar })}</div>
        </div>
        <div class="info-box">
          <div class="info-label">اسم العميل</div>
          <div class="info-value">${receipt.customerName}</div>
        </div>
        <div class="info-box">
          <div class="info-label">رقم الحساب</div>
          <div class="info-value">${receipt.accountNumber}</div>
        </div>
      </div>

      <div class="amount-section">
        <div class="amount-card primary">
          <div class="amount-label">المبلغ</div>
          <div class="amount-value">${Math.round(receipt.amount)} ${receipt.currencySymbol}</div>
        </div>
        <div class="amount-card">
          <div class="amount-label">العملة</div>
          <div class="amount-value">${receipt.currency}</div>
        </div>
        ${
          receipt.commission
            ? `
          <div class="amount-card">
            <div class="amount-label">العمولة</div>
            <div class="amount-value">${Math.round(receipt.commission)} ${receipt.currencySymbol}</div>
          </div>
          <div class="amount-card primary">
            <div class="amount-label">الصافي</div>
            <div class="amount-value">${Math.round(netAmount)} ${receipt.currencySymbol}</div>
          </div>
        `
            : ''
        }
      </div>

      <div class="amount-in-words">
        <div class="amount-in-words-label">المبلغ بالحروف:</div>
        <div class="amount-in-words-value">${amountInWords}</div>
      </div>

      ${
        receipt.notes
          ? `
        <div class="notes-section">
          <div class="notes-label">ملاحظات:</div>
          <div class="notes-value">${receipt.notes}</div>
        </div>
      `
          : ''
      }

      <div class="qr-section">
        <img src="${qrCodeUrl}" alt="QR Code" class="qr-code" />
      </div>
    </div>

    <div class="footer">
      تم إنشاء هذا السند بتاريخ ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ar })}
    </div>
  </div>
</body>
</html>
  `;
}
