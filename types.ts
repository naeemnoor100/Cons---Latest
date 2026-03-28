
export type UserRole = 'Admin' | 'Project Manager' | 'Finance';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete';
export type ModuleName = 'projects' | 'materials' | 'expenses' | 'incomes' | 'invoices' | 'payments' | 'labor' | 'vendors' | 'reports' | 'settings';

export type UserPermissions = {
  [key in ModuleName]?: PermissionAction[];
};

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  permissions?: UserPermissions;
  password?: string;
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
  isDeleted?: boolean;
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
  isActive?: boolean;
}

export type MaterialUnit = string;

export interface StockHistoryEntry {
  id: string;
  date: string;
  type: 'Purchase' | 'Usage' | 'Transfer';
  quantity: number;
  projectId?: string;
  vendorId?: string;
  employeeId?: string;
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
  lowStockThreshold?: number;
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
  employeeId?: string;
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
  currentSiteId?: string;
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
  projectId: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  userId: string;
  userName: string;
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
  activityLogs: ActivityLog[];
  users: User[];
  tradeCategories: string[];
  stockingUnits: string[];
  siteStatuses: string[];
  allowDecimalStock: boolean;
  companyName?: string;
  companyAddress?: string;
  currentUser: User;
  theme: 'light' | 'dark';
  syncId?: string;
  lastUpdated?: number;
}

export interface AppContextType extends AppState {
  updateUser: (u: User) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setAllowDecimalStock: (val: boolean) => void;
  setCompanyName: (name: string) => void;
  setCompanyAddress: (address: string) => void;
  addProject: (p: Project) => Promise<void>;
  updateProject: (p: Project) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  permanentDeleteProject: (id: string) => Promise<void>;
  restoreProject: (id: string) => Promise<void>;
  addVendor: (v: Vendor) => Promise<void>;
  updateVendor: (v: Vendor) => Promise<void>;
  deleteVendor: (id: string) => Promise<void>;
  addMaterial: (m: Material) => Promise<void>;
  updateMaterial: (m: Material) => Promise<void>;
  deleteMaterial: (id: string) => Promise<void>;
  addExpense: (e: Expense) => Promise<void>;
  addExpenses: (e: Expense[]) => Promise<void>;
  updateExpense: (e: Expense) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addPayment: (p: Payment) => Promise<void>;
  updatePayment: (p: Payment) => Promise<void>;
  deletePayment: (id: string) => Promise<void>;
  addIncome: (i: Income) => Promise<void>;
  updateIncome: (i: Income) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
  addInvoice: (inv: Invoice) => Promise<void>;
  updateInvoice: (inv: Invoice) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  addEmployee: (emp: Employee) => Promise<void>;
  updateEmployee: (emp: Employee) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  addLaborLog: (log: LaborLog) => Promise<void>;
  updateLaborLog: (log: LaborLog) => Promise<void>;
  deleteLaborLog: (id: string) => Promise<void>;
  addLaborPayment: (pay: LaborPayment) => Promise<void>;
  updateLaborPayment: (pay: LaborPayment) => Promise<void>;
  deleteLaborPayment: (id: string) => Promise<void>;
  forceSync: () => Promise<void>;
  addTradeCategory: (cat: string) => void;
  removeTradeCategory: (cat: string) => void;
  addStockingUnit: (unit: string) => void;
  removeStockingUnit: (unit: string) => void;
  addSiteStatus: (status: string) => void;
  removeSiteStatus: (status: string) => void;
  importState: (newState: AppState) => Promise<void>;
  exportData: () => void;
  exportExcel: () => void;
  isLoading: boolean;
  isSyncing: boolean;
  syncError: boolean;
  lastSynced: Date;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  lastActionName: string;
  isProjectLocked: (projectId: string) => boolean;
}
