import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { AppState, Project, Vendor, Material, Expense, Payment, Income, User, StockHistoryEntry, Invoice } from './types';
import { INITIAL_STATE } from './constants';

const API_PATH = 'api.php';

interface AppContextType extends AppState {
  updateUser: (u: User) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setAllowDecimalStock: (val: boolean) => void;
  addProject: (p: Project) => Promise<void>;
  updateProject: (p: Project) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addVendor: (v: Vendor) => Promise<void>;
  updateVendor: (v: Vendor) => Promise<void>;
  deleteVendor: (id: string) => Promise<void>;
  addMaterial: (m: Material) => Promise<void>;
  updateMaterial: (m: Material) => Promise<void>;
  deleteMaterial: (id: string) => Promise<void>;
  addExpense: (e: Expense) => Promise<void>;
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
  enableCloudSync: (key: string) => Promise<void>;
  disableCloudSync: () => void;
  forceSync: () => Promise<void>;
  addTradeCategory: (cat: string) => void;
  removeTradeCategory: (cat: string) => void;
  addStockingUnit: (unit: string) => void;
  removeStockingUnit: (unit: string) => void;
  addSiteStatus: (status: string) => void;
  removeSiteStatus: (status: string) => void;
  importState: (newState: AppState) => Promise<void>;
  isLoading: boolean;
  isSyncing: boolean;
  syncError: boolean;
  lastSynced: Date;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  lastActionName: string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const [lastSynced, setLastSynced] = useState(new Date());
  const syncDebounceRef = useRef<number | null>(null);

  // Load from MySQL
  const loadFromDB = useCallback(async (customSyncId?: string) => {
    const activeSyncId = customSyncId || state.syncId;
    if (!activeSyncId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_PATH}?action=sync&syncId=${activeSyncId}`);
      if (response.ok) {
        const cloudData = await response.json();
        if (cloudData && !cloudData.error && cloudData.status !== 'new') {
          setState({ ...INITIAL_STATE, ...cloudData, syncId: activeSyncId });
          setSyncError(false);
        } else {
          const saved = localStorage.getItem('buildtrack_pro_state_v2');
          if (saved) setState(JSON.parse(saved));
        }
      }
    } catch (e) {
      console.error("MySQL Load Error:", e);
      setSyncError(true);
    } finally {
      setIsLoading(false);
      setLastSynced(new Date());
    }
  }, [state.syncId]);

  useEffect(() => {
    const saved = localStorage.getItem('buildtrack_pro_state_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.syncId) {
          loadFromDB(parsed.syncId);
          return;
        }
        setState(parsed);
      } catch (e) {}
    }
    setIsLoading(false);
  }, []);

  // Save to MySQL
  const saveToDB = useCallback((nextState: AppState) => {
    if (syncDebounceRef.current) window.clearTimeout(syncDebounceRef.current);
    
    syncDebounceRef.current = window.setTimeout(async () => {
      setIsSyncing(true);
      try {
        localStorage.setItem('buildtrack_pro_state_v2', JSON.stringify(nextState));
        
        if (nextState.syncId) {
          const res = await fetch(`${API_PATH}?action=save_state`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nextState)
          });
          if (!res.ok) throw new Error("Sync Failed");
        }
        setSyncError(false);
      } catch (e) {
        setSyncError(true);
      } finally {
        setIsSyncing(false);
        setLastSynced(new Date());
      }
    }, 1500);
  }, []);

  const dispatchUpdate = useCallback((updater: (prev: AppState) => AppState) => {
    setState(prev => {
      const next = updater(prev);
      saveToDB(next);
      return next;
    });
  }, [saveToDB]);

  const updateUser = (u: User) => dispatchUpdate(prev => ({ ...prev, currentUser: u }));
  const setTheme = (theme: 'light' | 'dark') => {
    dispatchUpdate(prev => ({ ...prev, theme }));
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };
  const setAllowDecimalStock = (val: boolean) => dispatchUpdate(prev => ({ ...prev, allowDecimalStock: val }));

  const addProject = async (p: Project) => dispatchUpdate(prev => ({ ...prev, projects: [...prev.projects, p] }));
  const updateProject = async (p: Project) => dispatchUpdate(prev => ({ ...prev, projects: prev.projects.map(proj => proj.id === p.id ? p : proj) }));
  const deleteProject = async (id: string) => dispatchUpdate(prev => ({ ...prev, projects: prev.projects.filter(p => p.id !== id) }));
  
  const addVendor = async (v: Vendor) => dispatchUpdate(prev => ({ ...prev, vendors: [...prev.vendors, v] }));
  const updateVendor = async (v: Vendor) => dispatchUpdate(prev => ({ ...prev, vendors: prev.vendors.map(vend => vend.id === v.id ? v : vend) }));
  const deleteVendor = async (id: string) => dispatchUpdate(prev => ({ ...prev, vendors: prev.vendors.filter(v => v.id !== id) }));

  const addMaterial = async (m: Material) => dispatchUpdate(prev => ({ ...prev, materials: [...prev.materials, m] }));
  const updateMaterial = async (m: Material) => dispatchUpdate(prev => ({ ...prev, materials: prev.materials.map(mat => mat.id === m.id ? m : mat) }));
  const deleteMaterial = async (id: string) => dispatchUpdate(prev => ({ ...prev, materials: prev.materials.filter(m => m.id !== id) }));

  const addExpense = async (e: Expense) => dispatchUpdate(prev => {
    let nextVendors = [...prev.vendors];
    if (e.vendorId && e.inventoryAction === 'Purchase') {
      nextVendors = nextVendors.map(v => v.id === e.vendorId ? { ...v, balance: v.balance + e.amount } : v);
    }
    let nextMaterials = [...prev.materials];
    if (e.materialId && e.materialQuantity) {
      const isPurchase = e.inventoryAction === 'Purchase' || (!e.inventoryAction && !!e.vendorId);
      nextMaterials = nextMaterials.map(m => {
        if (m.id === e.materialId) {
          const hist: StockHistoryEntry = { 
            id: 'sh-exp-' + e.id, date: e.date, type: isPurchase ? 'Purchase' : 'Usage', quantity: e.materialQuantity!, projectId: e.projectId, vendorId: e.vendorId, note: e.notes, unitPrice: isPurchase ? (e.amount / e.materialQuantity!) : m.costPerUnit, parentPurchaseId: isPurchase ? undefined : e.parentPurchaseId
          };
          return {
            ...m,
            totalPurchased: isPurchase ? m.totalPurchased + e.materialQuantity! : m.totalPurchased,
            totalUsed: !isPurchase ? m.totalUsed + Math.abs(e.materialQuantity!) : m.totalUsed,
            history: [...(m.history || []), hist]
          };
        }
        return m;
      });
    }
    return { ...prev, expenses: [...prev.expenses, e], vendors: nextVendors, materials: nextMaterials };
  });

  const updateExpense = async (e: Expense) => dispatchUpdate(prev => ({ ...prev, expenses: prev.expenses.map(x => x.id === e.id ? e : x) }));
  const deleteExpense = async (id: string) => dispatchUpdate(prev => ({ ...prev, expenses: prev.expenses.filter(x => x.id !== id) }));

  const addPayment = async (p: Payment) => dispatchUpdate(prev => ({
    ...prev,
    payments: [...prev.payments, p],
    vendors: prev.vendors.map(v => v.id === p.vendorId ? { ...v, balance: Math.max(0, v.balance - p.amount) } : v)
  }));
  const updatePayment = async (p: Payment) => dispatchUpdate(prev => ({ ...prev, payments: prev.payments.map(x => x.id === p.id ? p : x) }));
  const deletePayment = async (id: string) => dispatchUpdate(prev => ({ ...prev, payments: prev.payments.filter(x => x.id !== id) }));

  const addIncome = async (i: Income) => dispatchUpdate(prev => ({ ...prev, incomes: [...prev.incomes, i] }));
  const updateIncome = async (i: Income) => dispatchUpdate(prev => ({ ...prev, incomes: prev.incomes.map(inc => inc.id === i.id ? i : inc) }));
  const deleteIncome = async (id: string) => dispatchUpdate(prev => ({ ...prev, incomes: prev.incomes.filter(i => i.id !== id) }));

  const addInvoice = async (inv: Invoice) => dispatchUpdate(prev => ({ ...prev, invoices: [...prev.invoices, inv] }));
  const updateInvoice = async (inv: Invoice) => dispatchUpdate(prev => ({ ...prev, invoices: prev.invoices.map(i => i.id === inv.id ? inv : i) }));
  const deleteInvoice = async (id: string) => dispatchUpdate(prev => ({ ...prev, invoices: prev.invoices.filter(i => i.id !== id) }));

  const enableCloudSync = async (key: string) => {
    setState(prev => ({ ...prev, syncId: key }));
    await loadFromDB(key);
  };
  const disableCloudSync = () => dispatchUpdate(prev => ({ ...prev, syncId: undefined }));
  const forceSync = async () => loadFromDB();

  const addTradeCategory = (cat: string) => dispatchUpdate(prev => ({ ...prev, tradeCategories: [...prev.tradeCategories, cat] }));
  const removeTradeCategory = (cat: string) => dispatchUpdate(prev => ({ ...prev, tradeCategories: prev.tradeCategories.filter(c => c !== cat) }));
  const addStockingUnit = (unit: string) => dispatchUpdate(prev => ({ ...prev, stockingUnits: [...prev.stockingUnits, unit] }));
  const removeStockingUnit = (unit: string) => dispatchUpdate(prev => ({ ...prev, stockingUnits: prev.stockingUnits.filter(u => u !== unit) }));
  const addSiteStatus = (status: string) => dispatchUpdate(prev => ({ ...prev, siteStatuses: [...prev.siteStatuses, status] }));
  const removeSiteStatus = (status: string) => dispatchUpdate(prev => ({ ...prev, siteStatuses: prev.siteStatuses.filter(s => s !== status) }));

  const importState = async (newState: AppState) => {
    setState(newState);
    saveToDB(newState);
  };

  const value = useMemo(() => ({
    ...state,
    updateUser, setTheme, setAllowDecimalStock,
    addProject, updateProject, deleteProject,
    addVendor, updateVendor, deleteVendor,
    addMaterial, updateMaterial, deleteMaterial,
    addExpense, updateExpense, deleteExpense,
    addPayment, updatePayment, deletePayment,
    addIncome, updateIncome, deleteIncome,
    addInvoice, updateInvoice, deleteInvoice,
    enableCloudSync, disableCloudSync, forceSync,
    addTradeCategory, removeTradeCategory,
    addStockingUnit, removeStockingUnit,
    addSiteStatus, removeSiteStatus,
    importState,
    isLoading, isSyncing, syncError, lastSynced,
    undo: () => {}, redo: () => {}, canUndo: false, canRedo: false, lastActionName: ''
  }), [state, isLoading, isSyncing, syncError, lastSynced]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};