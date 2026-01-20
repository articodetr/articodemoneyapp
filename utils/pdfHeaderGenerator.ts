interface PDFHeaderOptions {
  title?: string;
  logoUrl?: string;
  primaryColor?: string;
  darkColor?: string;
  height?: number;
  showPhone?: boolean;
  shopName?: string;
  shopPhone?: string;
}

export function generatePDFHeaderHTML(options: PDFHeaderOptions = {}): string {
  const {
    title = 'سند قبض',
    logoUrl,
    primaryColor = '#059669',
    darkColor = '#047857',
    height = 180,
    showPhone = true,
    shopName = 'التطبيق المحاسبي',
    shopPhone = '',
  } = options;

  const logoSection = logoUrl
    ? `<img src="${logoUrl}" alt="Logo" style="width: 80px; height: 80px; object-fit: contain;">`
    : `<div style="font-size: 48px; font-weight: bold; color: white; font-family: 'Arial', sans-serif;">${shopName}</div>`;

  return `
    <div class="pdf-header">
      <div class="header-background"></div>
      <div class="header-content">
        <div class="header-left">
          ${
            showPhone && shopPhone
              ? `
            <div class="contact-box">
              <div class="contact-label">تواصل معنا</div>
              <div class="contact-value">${shopPhone}</div>
            </div>
          `
              : ''
          }
        </div>

        <div class="header-center">
          ${logoSection}
          <div class="header-title">${title}</div>
        </div>

        <div class="header-right">
          <div class="company-name-ar">${shopName}</div>
        </div>
      </div>
    </div>
  `;
}

export function generatePDFHeaderStyles(): string {
  return `
    .pdf-header {
      position: relative;
      width: 100%;
      min-height: 180px;
      margin-bottom: 30px;
      overflow: hidden;
    }

    .header-background {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, #059669 0%, #10B981 50%, #34D399 100%);
      z-index: 0;
    }

    .header-content {
      position: relative;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 30px 40px;
      z-index: 1;
    }

    .header-left, .header-right {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      color: white;
    }

    .contact-box {
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
      padding: 12px 20px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      text-align: center;
      min-width: 140px;
    }

    .contact-label {
      font-size: 12px;
      opacity: 0.9;
      margin-bottom: 4px;
      font-weight: 500;
    }

    .contact-value {
      font-size: 16px;
      font-weight: bold;
      letter-spacing: 0.5px;
    }

    .header-center {
      flex: 2;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .header-title {
      font-size: 28px;
      font-weight: bold;
      color: white;
      text-align: center;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }

    .company-name-ar {
      font-size: 20px;
      font-weight: bold;
      color: white;
      text-align: center;
      direction: rtl;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }

    @media print {
      .pdf-header {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        page-break-inside: avoid;
      }

      .header-background {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  `;
}
