import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { AppState, Project, Vendor, Material, Expense, Payment, Income, User, StockHistoryEntry, Invoice, Worker, Attendance } from './types';
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
  addWorker: (w: Worker) => Promise<void>;
  updateWorker: (w: Worker) => Promise<void>;
  deleteWorker: (id: string) => Promise<void>;
  markAttendance: (a: Attendance) => Promise<void>;
  bulkMarkAttendance: (records: Attendance[]) => Promise<void>;
  deleteAttendance: (id: string) => Promise<void>;
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

  const loadFromDB = useCallback(async (customSyncId?: string) => {
    const activeSyncId = customSyncId || state.syncId;
    if (!activeSyncId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_PATH}?action=sync&syncId=${activeSyncId}`);
      if (!response.ok) {
        setSyncError(true);
        return;
      }
      
      const text = await response.text();
      if (text.trim().startsWith('<?php') || text.trim().startsWith('<!DOCTYPE')) {
        setSyncError(true);
        return;
      }

      try {
        const cloudData = JSON.parse(text);
        if (cloudData && !cloudData.error && cloudData.status !== 'new') {
          setState(prev => ({ ...prev, ...cloudData, syncId: INITIAL_STATE.syncId }));
          setSyncError(false);
        }
      } catch (jsonErr) {
        setSyncError(true);
      }
    } catch (e) {
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
        setState({ ...parsed, syncId: INITIAL_STATE.syncId });
      } catch (e) {}
    }
    loadFromDB(INITIAL_STATE.syncId);
  }, []);

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
          if (!res.ok) throw new Error("Server communication error");
        }
        setSyncError(false);
      } catch (e) {
        setSyncError(true);
      } finally {
        setIsSyncing(false);
        setLastSynced(new Date());
      }
    }, 500);
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
      const type: 'Purchase' | 'Usage' | 'Transfer' = e.inventoryAction === 'Transfer' ? 'Transfer' : 
                   (e.inventoryAction === 'Purchase' || (!e.inventoryAction && !!e.vendorId) ? 'Purchase' : 'Usage');
      nextMaterials = nextMaterials.map(m => {
        if (m.id === e.materialId) {
          const hist: StockHistoryEntry = { 
            id: 'sh-exp-' + e.id, date: e.date, type: type, quantity: e.materialQuantity!, projectId: e.projectId, vendorId: e.vendorId, note: e.notes, unitPrice: type === 'Purchase' ? (e.amount / e.materialQuantity!) : (e.unitPrice || m.costPerUnit), parentPurchaseId: type !== 'Purchase' ? e.parentPurchaseId : undefined
          };
          const newHistory = [...(m.history || []), hist];
          const totalPurchased = newHistory.filter(h => h.type === 'Purchase' && h.quantity > 0).reduce((sum, h) => sum + h.quantity, 0);
          const totalUsed = Math.abs(newHistory.filter(h => h.type === 'Usage' && h.quantity < 0).reduce((sum, h) => sum + h.quantity, 0));
          return { ...m, totalPurchased, totalUsed, history: newHistory };
        }
        return m;
      });
    }
    return { ...prev, expenses: [...prev.expenses, e], vendors: nextVendors, materials: nextMaterials };
  });

  const updateExpense = async (e: Expense) => dispatchUpdate(prev => {
    const oldExp = prev.expenses.find(x => x.id === e.id);
    let nextVendors = [...prev.vendors];

    if (oldExp && oldExp.vendorId && oldExp.inventoryAction === 'Purchase') {
      nextVendors = nextVendors.map(v => v.id === oldExp.vendorId ? { ...v, balance: Math.max(0, v.balance - oldExp.amount) } : v);
    }
    if (e.vendorId && e.inventoryAction === 'Purchase') {
      nextVendors = nextVendors.map(v => v.id === e.vendorId ? { ...v, balance: v.balance + e.amount } : v);
    }

    let nextMaterials = prev.materials.map(m => {
      if (m.id === e.materialId || (oldExp && m.id === oldExp.materialId)) {
        const historyId = 'sh-exp-' + e.id;
        const currentHistory = m.history || [];
        
        let newHistory;
        if (m.id === e.materialId) {
          const existing = currentHistory.find(h => h.id === historyId);
          if (existing) {
            newHistory = currentHistory.map(h => {
              if (h.id === historyId) {
                const type: 'Purchase' | 'Usage' | 'Transfer' = e.inventoryAction === 'Transfer' ? 'Transfer' : (e.inventoryAction === 'Purchase' ? 'Purchase' : 'Usage');
                return {
                  ...h,
                  type: type,
                  date: e.date,
                  quantity: e.materialQuantity || 0,
                  projectId: e.projectId,
                  vendorId: e.vendorId,
                  note: e.notes,
                  unitPrice: e.unitPrice || (type === 'Purchase' && e.materialQuantity ? e.amount / e.materialQuantity : m.costPerUnit)
                };
              }
              return h;
            });
          } else {
             const type: 'Purchase' | 'Usage' | 'Transfer' = e.inventoryAction === 'Transfer' ? 'Transfer' : (e.inventoryAction === 'Purchase' ? 'Purchase' : 'Usage');
             const hist: StockHistoryEntry = { 
                id: historyId, date: e.date, type: type, quantity: e.materialQuantity!, projectId: e.projectId, vendorId: e.vendorId, note: e.notes, unitPrice: type === 'Purchase' ? (e.amount / e.materialQuantity!) : (e.unitPrice || m.costPerUnit), parentPurchaseId: type !== 'Purchase' ? e.parentPurchaseId : undefined
             };
             newHistory = [...currentHistory, hist];
          }
        } else {
          newHistory = currentHistory.filter(h => h.id !== historyId);
        }

        const totalPurchased = newHistory.filter(h => h.type === 'Purchase' && h.quantity > 0).reduce((sum, h) => sum + h.quantity, 0);
        const totalUsed = Math.abs(newHistory.filter(h => h.type === 'Usage' && h.quantity < 0).reduce((sum, h) => sum + h.quantity, 0));

        return { ...m, history: newHistory, totalPurchased, totalUsed };
      }
      return m;
    });

    return { 
      ...prev, 
      expenses: prev.expenses.map(x => x.id === e.id ? e : x),
      materials: nextMaterials,
      vendors: nextVendors
    };
  });

  const deleteExpense = async (id: string) => dispatchUpdate(prev => {
    const expToDelete = prev.expenses.find(x => x.id === id);
    if (!expToDelete) return prev;

    let nextMaterials = [...prev.materials];
    if (expToDelete.materialId) {
      nextMaterials = nextMaterials.map(m => {
        if (m.id === expToDelete.materialId) {
          const historyId = 'sh-exp-' + id;
          const newHistory = (m.history || []).filter(h => h.id !== historyId);
          const totalPurchased = newHistory.filter(h => h.type === 'Purchase' && h.quantity > 0).reduce((sum, h) => sum + h.quantity, 0);
          const totalUsed = Math.abs(newHistory.filter(h => h.type === 'Usage' && h.quantity < 0).reduce((sum, h) => sum + h.quantity, 0));
          return { ...m, history: newHistory, totalPurchased, totalUsed };
        }
        return m;
      });
    }

    let nextVendors = [...prev.vendors];
    if (expToDelete.vendorId && expToDelete.inventoryAction === 'Purchase') {
      nextVendors = nextVendors.map(v => v.id === expToDelete.vendorId ? { ...v, balance: Math.max(0, v.balance - expToDelete.amount) } : v);
    }

    return { 
      ...prev, 
      expenses: prev.expenses.filter(x => x.id !== id),
      materials: nextMaterials,
      vendors: nextVendors
    };
  });

  const addPayment = async (p: Payment) => dispatchUpdate(prev => {
    const nextVendors = prev.vendors.map(v => v.id === p.vendorId ? { ...v, balance: Math.max(0, v.balance - p.amount) } : v);
    
    if (!p.materialBatchId) {
      let remainingAmountToAllocate = p.amount;
      const allocatedPayments: Payment[] = [];
      const masterPaymentId = p.id;
      
      const purchaseBills = prev.expenses.filter(e => e.vendorId === p.vendorId && e.inventoryAction === 'Purchase');
      
      const billBalances = purchaseBills.map(bill => {
        const paidForBill = prev.payments
          .filter(pay => pay.materialBatchId === 'sh-exp-' + bill.id)
          .reduce((sum, pay) => sum + pay.amount, 0);
        return { bill, remaining: bill.amount - paidForBill };
      }).filter(b => b.remaining > 0.01);

      billBalances.sort((a, b) => a.remaining - b.remaining);

      for (const b of billBalances) {
        if (remainingAmountToAllocate <= 0) break;
        
        const payAmount = Math.min(remainingAmountToAllocate, b.remaining);
        allocatedPayments.push({
          ...p,
          id: p.id + '-' + b.bill.id,
          amount: payAmount,
          materialBatchId: 'sh-exp-' + b.bill.id,
          reference: p.reference + ' (Auto-Adjusted)',
          masterPaymentId,
          isAllocation: true
        });
        remainingAmountToAllocate -= payAmount;
      }

      if (remainingAmountToAllocate > 0.01) {
        allocatedPayments.push({
          ...p,
          id: p.id + '-advance',
          amount: remainingAmountToAllocate,
          reference: p.reference + ' (Advance)',
          masterPaymentId,
          isAllocation: true
        });
      }

      return {
        ...prev,
        payments: [...prev.payments, p, ...allocatedPayments],
        vendors: nextVendors
      };
    }

    return {
      ...prev,
      payments: [...prev.payments, p],
      vendors: nextVendors
    };
  });

  const updatePayment = async (p: Payment) => dispatchUpdate(prev => {
    const actualOldPay = prev.payments.find(x => x.id === p.id);
    let nextVendors = [...prev.vendors];
    
    // Step 1: Revert old master payment from vendor balance
    if (actualOldPay) {
      nextVendors = nextVendors.map(v => v.id === actualOldPay.vendorId ? { ...v, balance: v.balance + actualOldPay.amount } : v);
    }

    // Step 2: Remove old child allocations associated with this master payment
    const paymentsWithoutOldAllocations = prev.payments.filter(x => x.id !== p.id && x.masterPaymentId !== p.id);

    // Step 3: Apply new payment to vendor balance
    nextVendors = nextVendors.map(v => v.id === p.vendorId ? { ...v, balance: Math.max(0, v.balance - p.amount) } : v);

    // Step 4: Re-calculate allocations based on the new amount (if no specific batch linked)
    let newAllocations: Payment[] = [];
    if (!p.materialBatchId) {
      let remainingToAlloc = p.amount;
      const masterPaymentId = p.id;
      
      const purchaseBills = prev.expenses.filter(e => e.vendorId === p.vendorId && e.inventoryAction === 'Purchase');
      const billBalances = purchaseBills.map(bill => {
        // Find existing payments for this bill, excluding the ones we just removed from state conceptually
        const paidForBill = paymentsWithoutOldAllocations
          .filter(pay => pay.materialBatchId === 'sh-exp-' + bill.id)
          .reduce((sum, pay) => sum + pay.amount, 0);
        return { bill, remaining: bill.amount - paidForBill };
      }).filter(b => b.remaining > 0.01);

      billBalances.sort((a, b) => a.remaining - b.remaining);

      for (const b of billBalances) {
        if (remainingToAlloc <= 0) break;
        const payAmount = Math.min(remainingToAlloc, b.remaining);
        newAllocations.push({
          ...p,
          id: p.id + '-' + b.bill.id,
          amount: payAmount,
          materialBatchId: 'sh-exp-' + b.bill.id,
          reference: p.reference + ' (Auto-Adjusted)',
          masterPaymentId,
          isAllocation: true
        });
        remainingToAlloc -= payAmount;
      }

      if (remainingToAlloc > 0.01) {
        newAllocations.push({
          ...p,
          id: p.id + '-advance',
          amount: remainingToAlloc,
          reference: p.reference + ' (Advance)',
          masterPaymentId,
          isAllocation: true
        });
      }
    }

    return { 
      ...prev, 
      payments: [...paymentsWithoutOldAllocations, p, ...newAllocations],
      vendors: nextVendors
    };
  });

  const deletePayment = async (id: string) => dispatchUpdate(prev => {
    const payToDelete = prev.payments.find(x => x.id === id);
    let nextVendors = [...prev.vendors];
    
    const nextPayments = prev.payments.filter(x => x.id !== id && x.masterPaymentId !== id);

    if (payToDelete) {
      if (!payToDelete.isAllocation) {
        nextVendors = nextVendors.map(v => v.id === payToDelete.vendorId ? { ...v, balance: v.balance + payToDelete.amount } : v);
      }
    }
    
    return { 
      ...prev, 
      payments: nextPayments,
      vendors: nextVendors
    };
  });

  const addIncome = async (i: Income) => dispatchUpdate(prev => ({ ...prev, incomes: [...prev.incomes, i] }));
  const updateIncome = async (i: Income) => dispatchUpdate(prev => ({ ...prev, incomes: prev.incomes.map(inc => inc.id === i.id ? i : inc) }));
  const deleteIncome = async (id: string) => dispatchUpdate(prev => ({ ...prev, incomes: prev.incomes.filter(i => i.id !== id) }));

  const addInvoice = async (inv: Invoice) => dispatchUpdate(prev => ({ ...prev, invoices: [...prev.invoices, inv] }));
  const updateInvoice = async (inv: Invoice) => dispatchUpdate(prev => ({ ...prev, invoices: prev.invoices.map(i => i.id === inv.id ? i : i) }));
  const deleteInvoice = async (id: string) => dispatchUpdate(prev => ({ ...prev, invoices: prev.invoices.filter(i => i.id !== id) }));

  const addWorker = async (w: Worker) => dispatchUpdate(prev => ({ ...prev, workers: [...prev.workers, w] }));
  const updateWorker = async (w: Worker) => dispatchUpdate(prev => ({ ...prev, workers: prev.workers.map(x => x.id === w.id ? w : x) }));
  const deleteWorker = async (id: string) => dispatchUpdate(prev => ({ ...prev, workers: prev.workers.filter(x => x.id !== id), attendance: prev.attendance.filter(a => a.workerId !== id) }));
  
  const markAttendance = async (a: Attendance) => dispatchUpdate(prev => ({ ...prev, attendance: [...prev.attendance, a] }));
  const bulkMarkAttendance = async (records: Attendance[]) => dispatchUpdate(prev => ({ ...prev, attendance: [...prev.attendance, ...records] }));
  const deleteAttendance = async (id: string) => dispatchUpdate(prev => ({ ...prev, attendance: prev.attendance.filter(x => x.id !== id) }));

  const forceSync = async () => loadFromDB();

  const addTradeCategory = (cat: string) => dispatchUpdate(prev => ({ ...prev, tradeCategories: [...prev.tradeCategories, cat] }));
  const removeTradeCategory = (cat: string) => dispatchUpdate(prev => ({ ...prev, tradeCategories: prev.tradeCategories.filter(c => c !== cat) }));
  const addStockingUnit = (unit: string) => dispatchUpdate(prev => ({ ...prev, stockingUnits: [...prev.stockingUnits, unit] }));
  const removeStockingUnit = (unit: string) => dispatchUpdate(prev => ({ ...prev, stockingUnits: prev.stockingUnits.filter(u => u !== unit) }));
  const addSiteStatus = (status: string) => dispatchUpdate(prev => ({ ...prev, siteStatuses: [...prev.siteStatuses, status] }));
  const removeSiteStatus = (status: string) => dispatchUpdate(prev => ({ ...prev, siteStatuses: prev.siteStatuses.filter(s => s !== status) }));

  const importState = async (newState: AppState) => {
    const normalizedState = { ...newState, syncId: INITIAL_STATE.syncId };
    setState(normalizedState);
    localStorage.setItem('buildtrack_pro_state_v2', JSON.stringify(normalizedState));
    try {
      await fetch(`${API_PATH}?action=save_state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizedState)
      });
      setSyncError(false);
    } catch (e) {
      setSyncError(true);
    }
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
    addWorker, updateWorker, deleteWorker, markAttendance, bulkMarkAttendance, deleteAttendance,
    forceSync,
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