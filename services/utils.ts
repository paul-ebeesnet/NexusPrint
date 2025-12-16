
// Simple UUID generator
export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

// --- Currency Logic ---

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
const TEENS = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const convertGroup = (n: number): string => {
  let str = '';
  if (n >= 100) {
    str += ONES[Math.floor(n / 100)] + ' Hundred ';
    n %= 100;
  }
  if (n >= 20) {
    str += TENS[Math.floor(n / 10)] + ' ';
    n %= 10;
  }
  if (n >= 10) {
    str += TEENS[n - 10] + ' ';
    n = 0;
  }
  if (n > 0) {
    str += ONES[n] + ' ';
  }
  return str.trim();
};

export const numberToEnglish = (amount: number | string): string => {
  const num = parseFloat(amount.toString());
  if (isNaN(num)) return 'Zero Dollars Only';
  if (num === 0) return 'Zero Dollars Only';

  const parts = num.toFixed(2).split('.');
  let integerPart = parseInt(parts[0]);
  const decimalPart = parseInt(parts[1]);

  let result = '';
  
  // Billions
  if (integerPart >= 1000000000) {
    result += convertGroup(Math.floor(integerPart / 1000000000)) + ' Billion ';
    integerPart %= 1000000000;
  }
  // Millions
  if (integerPart >= 1000000) {
    result += convertGroup(Math.floor(integerPart / 1000000)) + ' Million ';
    integerPart %= 1000000;
  }
  // Thousands
  if (integerPart >= 1000) {
    result += convertGroup(Math.floor(integerPart / 1000)) + ' Thousand ';
    integerPart %= 1000;
  }
  // Hundreds/Tens/Ones
  if (integerPart > 0) {
    result += convertGroup(integerPart);
  }

  result = result.trim() + ' Dollars';

  if (decimalPart > 0) {
    result += ' And ' + convertGroup(decimalPart) + ' Cents';
  } else {
    result += ' Only';
  }

  return result;
};

// Simplified Chinese Currency Logic (Traditional)
const CH_NUMS = ['零', '壹', '貳', '參', '肆', '伍', '陸', '柒', '捌', '玖'];
const CH_UNITS = ['', '拾', '佰', '仟'];
const CH_GROUPS = ['', '萬', '億', '兆'];

export const numberToChinese = (amount: number | string): string => {
  let num = parseFloat(amount.toString());
  if (isNaN(num)) return '零圓整';
  
  const str = num.toFixed(2);
  const [intStr, decStr] = str.split('.');
  
  let result = '';
  
  // Integer part
  let zeroCount = 0;
  let groupIndex = 0;
  let len = intStr.length;
  
  // Process 4 digits at a time from right to left
  for (let i = len; i > 0; i -= 4) {
    let groupResult = '';
    let start = Math.max(0, i - 4);
    let chunk = intStr.substring(start, i);
    let chunkNum = parseInt(chunk);
    
    if (chunkNum === 0) {
       if (result !== '' && i !== len) zeroCount++; 
    } else {
        // Process internal chunk
        let chunkZero = 0;
        for (let j = 0; j < chunk.length; j++) {
            const digit = parseInt(chunk[j]);
            const unitIdx = chunk.length - 1 - j; // Power of 10 relative to chunk
            
            if (digit !== 0) {
                if (chunkZero > 0) groupResult += CH_NUMS[0];
                groupResult += CH_NUMS[digit] + CH_UNITS[unitIdx];
                chunkZero = 0;
            } else {
                chunkZero++;
            }
        }
        
        // Append group unit
        result = groupResult + CH_GROUPS[groupIndex] + result;
        // Check if we need a zero before this group (if previous group was empty or had leading zeros logic - simplified here)
        if (zeroCount > 0) {
             result = CH_NUMS[0] + result;
             zeroCount = 0;
        }
    }
    groupIndex++;
  }
  
  if (result === '') result = CH_NUMS[0];
  result += '圓';
  
  // Decimal part
  const jiao = parseInt(decStr[0]);
  const fen = parseInt(decStr[1]);
  
  if (jiao === 0 && fen === 0) {
      result += '整';
  } else {
      if (jiao > 0) result += CH_NUMS[jiao] + '角';
      else if (jiao === 0 && fen > 0) result += CH_NUMS[0]; // zero jiao
      
      if (fen > 0) result += CH_NUMS[fen] + '分';
  }

  // Cleanup double zeros
  return result.replace(/零+/g, '零').replace(/零圓/, '圓').replace(/^圓/, '零圓');
};

export const formatCurrency = (amount: number | string): string => {
  const num = parseFloat(amount.toString());
  if (isNaN(num)) return amount.toString();
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// --- Date Utils ---

export const formatDate = (date: Date, formatStr: string): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  
  switch (formatStr) {
    case 'YYYY-MM-DD': return `${yyyy}-${mm}-${dd}`;
    case 'DD/MM/YYYY': return `${dd}/${mm}/${yyyy}`;
    case 'MM/DD/YYYY': return `${mm}/${dd}/${yyyy}`;
    case 'DD Month YYYY': return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    default: return `${yyyy}-${mm}-${dd}`;
  }
};

// --- Unit Conversion ---
// 1 inch = 96 px (CSS standard)
// 1 mm = 3.7795 px
export const MM_TO_PX = 3.7795;
export const IN_TO_PX = 96;

export const convertToPx = (value: number, unit: 'mm' | 'in'): number => {
  return Math.round(value * (unit === 'mm' ? MM_TO_PX : IN_TO_PX));
};