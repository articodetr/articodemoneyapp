const ones = [
  '',
  'واحد',
  'اثنان',
  'ثلاثة',
  'أربعة',
  'خمسة',
  'ستة',
  'سبعة',
  'ثمانية',
  'تسعة',
];

const tens = [
  '',
  '',
  'عشرون',
  'ثلاثون',
  'أربعون',
  'خمسون',
  'ستون',
  'سبعون',
  'ثمانون',
  'تسعون',
];

const teens = [
  'عشرة',
  'أحد عشر',
  'اثنا عشر',
  'ثلاثة عشر',
  'أربعة عشر',
  'خمسة عشر',
  'ستة عشر',
  'سبعة عشر',
  'ثمانية عشر',
  'تسعة عشر',
];

const hundreds = [
  '',
  'مائة',
  'مئتان',
  'ثلاثمائة',
  'أربعمائة',
  'خمسمائة',
  'ستمائة',
  'سبعمائة',
  'ثمانمائة',
  'تسعمائة',
];

function convertHundreds(num: number): string {
  if (num === 0) return '';

  const hundred = Math.floor(num / 100);
  const remainder = num % 100;

  let result = hundreds[hundred];

  if (remainder === 0) {
    return result;
  }

  if (result) result += ' و';

  if (remainder < 10) {
    result += ones[remainder];
  } else if (remainder >= 10 && remainder < 20) {
    result += teens[remainder - 10];
  } else {
    const ten = Math.floor(remainder / 10);
    const one = remainder % 10;
    result += tens[ten];
    if (one > 0) {
      result += ' و' + ones[one];
    }
  }

  return result;
}

function convertThousands(num: number): string {
  if (num === 0) return '';

  const thousand = Math.floor(num / 1000);
  const remainder = num % 1000;

  let result = '';

  if (thousand === 1) {
    result = 'ألف';
  } else if (thousand === 2) {
    result = 'ألفان';
  } else if (thousand >= 3 && thousand <= 10) {
    result = convertHundreds(thousand) + ' آلاف';
  } else {
    result = convertHundreds(thousand) + ' ألف';
  }

  if (remainder > 0) {
    result += ' و' + convertHundreds(remainder);
  }

  return result;
}

function convertMillions(num: number): string {
  if (num === 0) return '';

  const million = Math.floor(num / 1000000);
  const remainder = num % 1000000;

  let result = '';

  if (million === 1) {
    result = 'مليون';
  } else if (million === 2) {
    result = 'مليونان';
  } else if (million >= 3 && million <= 10) {
    result = convertHundreds(million) + ' ملايين';
  } else {
    result = convertHundreds(million) + ' مليون';
  }

  if (remainder > 0) {
    result += ' و' + convertThousands(remainder);
  }

  return result;
}

export function numberToArabicText(num: number): string {
  if (num === 0) return 'صفر';

  num = Math.floor(num);

  if (num >= 1000000) {
    return convertMillions(num);
  } else if (num >= 1000) {
    return convertThousands(num);
  } else {
    return convertHundreds(num);
  }
}

export function getCurrencyNameInArabic(currencyCode: string): string {
  const currencies: { [key: string]: string } = {
    USD: 'دولار أمريكي',
    SAR: 'ريال سعودي',
    EUR: 'يورو',
    YER: 'ريال يمني',
    TRY: 'ليرة تركية',
    AED: 'درهم إماراتي',
    EGP: 'جنيه مصري',
  };

  return currencies[currencyCode] || currencyCode;
}

export function numberToArabicTextWithCurrency(
  num: number,
  currencyCode: string,
): string {
  const arabicNumber = numberToArabicText(num);
  const currencyName = getCurrencyNameInArabic(currencyCode);
  return `${arabicNumber} ${currencyName} لا غير`;
}
