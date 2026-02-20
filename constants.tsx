import { AppState, User, Project, Vendor, Material, Expense, Income } from './types';

export const MOCK_USER: User = {
  id: 'u1',
  name: 'Administrator',
  email: 'admin@buildmaster.pro',
  role: 'Admin',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop'
};

export const INITIAL_STATE: AppState = {
  currentUser: MOCK_USER,
  theme: 'light',
  syncId: 'BUILDMASTER_PRO_DATABASE_ACTIVE', // Auto-enabled global sync key
  projects: [],
  vendors: [],
  materials: [],
  expenses: [],
  payments: [],
  incomes: [],
  invoices: [],
  tradeCategories: ['Material', 'Labor', 'Equipment', 'Overhead', 'Permit', 'Fuel', 'Security'],
  stockingUnits: ['Bag', 'Ton', 'KG', 'Piece', 'Cubic Meter', 'Litre', 'Feet'],
  siteStatuses: ['Upcoming', 'Active', 'On Hold', 'Completed', 'Cancelled'],
  allowDecimalStock: true
};