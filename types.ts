
export enum LogicType {
  STATIC = 'STATIC',
  VARIABLE = 'VARIABLE', // Custom {{key}}
  DATE = 'DATE',
  CURRENCY_ENG = 'CURRENCY_ENG',
  CURRENCY_CHI = 'CURRENCY_CHI',
  CURRENCY_NUM = 'CURRENCY_NUM', // Arabic Numerals (e.g. 1,234.56)
  CUSTOMER_NAME = 'CUSTOMER_NAME', // Legacy, can map to client name
}

export type Role = 'user' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role: Role;
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface PrintRecord {
  id: string;
  template_id: string;
  user_id: string;
  data: Record<string, string>;
  created_at: string;
}

export interface CanvasObject {
  id: string;
  type: 'text' | 'image';
  x: number;
  y: number;
  width: number;
  height?: number; // Optional for text (auto-calc), required for image
  text?: string; // Only for text
  rawValue?: string; // Only for text
  src?: string; // Only for image (base64)
  variableKey?: string; // For LogicType.VARIABLE and currencies
  fontSize?: number; // Only for text
  fontFamily?: string; // Only for text
  align?: 'left' | 'center' | 'right'; // Only for text
  logicType?: LogicType; // Only for text
  dateFormat?: string;
  opacity?: number; // 0 to 1
}

export interface CanvasSettings {
  width: number;
  height: number;
  unit: 'mm' | 'in';
  widthUnit: number;
  heightUnit: number;
  dpi: number;
}

export interface Template {
  id: string;
  user_id?: string; // Optional for new creates before save
  name: string;
  objects: CanvasObject[];
  settings: CanvasSettings;
  is_public: boolean;
  updatedAt: string;
}