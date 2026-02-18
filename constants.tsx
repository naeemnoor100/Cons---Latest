
import { AppState, User, Project, Vendor, Material, Expense, Income, Worker, Attendance } from './types';

export const MOCK_USER: User = {
  id: 'u1',
  name: 'Ahmed Khan',
  email: 'ahmed@buildtrack.pro',
  role: 'Admin',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop'
};

export const INITIAL_STATE: AppState = {
  currentUser: MOCK_USER,
  theme: 'light',
  projects: [
    {
      id: 'godown-001',
      name: 'Central Godown (Main Store)',
      client: 'Internal',
      location: 'Central Logistics Hub',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      budget: 0,
      status: 'Active',
      description: 'Primary material reception and distribution hub.',
      isGodown: true
    }
  ],
  vendors: [],
  materials: [],
  expenses: [],
  payments: [],
  incomes: [],
  invoices: [],
  workers: [],
  attendance: [],
  tradeCategories: ['Material', 'Labor', 'Equipment', 'Overhead', 'Permit', 'Fuel', 'Security'],
  stockingUnits: ['Bag', 'Ton', 'KG', 'Piece', 'Cubic Meter', 'Litre', 'Feet'],
  siteStatuses: ['Upcoming', 'Active', 'On Hold', 'Completed', 'Cancelled'],
  allowDecimalStock: true
};
