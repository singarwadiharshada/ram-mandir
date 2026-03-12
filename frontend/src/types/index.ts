export type ServiceCategory = 'महाप्रसाद' | 'अभिषेक' | 'इतर';
export type UnitType = 'kg' |'gram'| 'piece' | 'liter';
export type UserRole = 'super_admin' | 'admin';

export interface PrasadItem {
  _id: string;
  name: string;
  category: ServiceCategory;
  unit: UnitType;
  required: number;
  received: number;
  createdAt: string;
  updatedAt: string;
}

export interface Donation {
  _id: string;
  donorName: string;
  mobile: string;
  service: ServiceCategory;
  // For Mahaprasad
  item?: string | PrasadItem;  // Item ID or populated item
  itemName?: string;           // Populated item name
  quantity?: number;
  unit?: UnitType;
  // For "इतर" category
  sevaId?: string;             // Service ID for "इतर" category
  serviceName?: string;        // Populated service name for "इतर" category
  // For all categories with amount
  amount: number;
  address?: string;
  date: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Service {
  _id: string;
  name: string;
  category: ServiceCategory;
  minAmount: number;
  maxAmount?: number;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Admin {
  _id: string;
  username: string;
  email: string;
  role: UserRole;
  lastLogin?: string;
  isActive: boolean;
  createdBy?: string;
  createdAt?: string;
}

export interface DonationStats {
  totalDonations: number;
  totalAmount: number;
  todayDonations: number;
  avgAmount: number;
  categoryStats?: Array<{ _id: ServiceCategory; count: number; amount: number }>;
}

export interface ItemStats {
  total: number;
  fulfilled: number;
  pending: number;
  totalRequired: number;
  totalReceived: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  isSuperAdmin: boolean;
}