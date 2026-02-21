
export type UserRole = 'Admin' | 'Accountant' | 'Site Manager';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export type ProjectStatus = string;

export interface Project {
  id: string;
  name: string;
  client: string;
  location: string;
  startDate: string;
  endDate: string;
  budget: number;
  status: ProjectStatus;
  description?: string;
  contactNumber?: string;
  isGodown?: boolean;
}

export type VendorCategory = string;

export interface Vendor {
  id: string;
  name: string;
  phone: string;
  address: string;
  category: VendorCategory;
  email?: string;
  balance: number;
}

export type MaterialUnit = string;

export interface StockHistoryEntry {
  id: string;
  date: string;
  type: 'Purchase' | 'Usage' | 'Transfer';
  quantity: number;
  projectId?: string;
  vendorId?: string;
  note?: string;
  unitPrice?: number;
  parentPurchaseId?: string;
}

export interface Material {
  id: string;
  name: string;
  unit: MaterialUnit;
  costPerUnit: number;
  totalPurchased: number;
  totalUsed: number;
  history?: StockHistoryEntry[];
}

export type PaymentMethod = 'Cash' | 'Bank' | 'Online';

export interface Payment {
  id: string;
  date: string;
  vendorId: string;
  projectId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  materialBatchId?: string;
  masterPaymentId?: string;
  isAllocation?: boolean;
}

export interface Expense {
  id: string;
  date: string;
  projectId: string;
  vendorId?: string;
  materialId?: string;
  materialQuantity?: number;
  unitPrice?: number;
  amount: number;
  paymentMethod: PaymentMethod;
  notes: string;
  invoiceUrl?: string;
  category: string;
  inventoryAction?: 'Purchase' | 'Usage' | 'Transfer';
  parentPurchaseId?: string;
}

export interface Invoice {
  id: string;
  projectId: string;
  date: string;
  amount: number;
  description: string;
  status: 'Draft' | 'Sent' | 'Paid' | 'Cancelled';
  dueDate: string;
}

export interface Income {
  id: string;
  projectId: string;
  date: string;
  amount: number;
  description: string;
  method: PaymentMethod;
  invoiceId?: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  phone: string;
  dailyWage: number;
  status: 'Active' | 'Inactive';
  joiningDate: string;
}

export interface LaborLog {
  id: string;
  date: string;
  employeeId: string;
  projectId: string;
  hoursWorked: number;
  wageAmount: number;
  status: 'Present' | 'Absent' | 'Half-day';
  notes?: string;
}

export interface LaborPayment {
  id: string;
  employeeId: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
}

export interface AppState {
  projects: Project[];
  vendors: Vendor[];
  materials: Material[];
  expenses: Expense[];
  incomes: Income[];
  invoices: Invoice[];
  payments: Payment[];
  employees: Employee[];
  laborLogs: LaborLog[];
  laborPayments: LaborPayment[];
  tradeCategories: string[];
  stockingUnits: string[];
  siteStatuses: string[];
  allowDecimalStock: boolean;
  currentUser: User;
  theme: 'light' | 'dark';
  syncId?: string;
  lastUpdated?: number;
}
