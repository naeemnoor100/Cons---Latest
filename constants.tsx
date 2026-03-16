import { AppState, User } from './types';

export const MOCK_USER: User = {
  id: 'u1',
  name: 'Administrator',
  email: 'admin@buildmaster.pro',
  role: 'Admin',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop',
  permissions: {
    projects: ['view', 'create', 'edit', 'delete'],
    materials: ['view', 'create', 'edit', 'delete'],
    expenses: ['view', 'create', 'edit', 'delete'],
    incomes: ['view', 'create', 'edit', 'delete'],
    invoices: ['view', 'create', 'edit', 'delete'],
    payments: ['view', 'create', 'edit', 'delete'],
    labor: ['view', 'create', 'edit', 'delete'],
    vendors: ['view', 'create', 'edit', 'delete'],
    reports: ['view', 'create', 'edit', 'delete'],
    settings: ['view', 'create', 'edit', 'delete']
  }
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
  employees: [],
  laborLogs: [],
  laborPayments: [],
  activityLogs: [],
  users: [MOCK_USER],
  tradeCategories: ['Material', 'Labor', 'Equipment', 'Overhead', 'Permit', 'Fuel', 'Security'],
  stockingUnits: ['Bag', 'Ton', 'KG', 'Piece', 'Cubic Meter', 'Litre', 'Feet'],
  siteStatuses: ['Upcoming', 'Active', 'On Hold', 'Completed', 'Cancelled'],
  allowDecimalStock: true
};