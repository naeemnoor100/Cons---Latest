import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { AppState, Project, Vendor, Material, Expense, Payment, Income, User, StockHistoryEntry, Invoice, Employee, LaborLog, LaborPayment, ActivityLog } from './types';
import { INITIAL_STATE } from './constants';
import { AppContext } from './AppContext';
import * as XLSX from 'xlsx';

const API_PATH = '/api.php';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [past, setPast] = useState<AppState[]>([]);
  const [future, setFuture] = useState<AppState[]>([]);
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
          setState(prev => {
            const merged = { ...prev, ...cloudData, syncId: INITIAL_STATE.syncId };
            // Ensure arrays are never null or undefined
            merged.projects = merged.projects || [];
            merged.vendors = merged.vendors || [];
            merged.materials = merged.materials || [];
            merged.expenses = merged.expenses || [];
            merged.payments = merged.payments || [];
            merged.incomes = merged.incomes || [];
            merged.invoices = merged.invoices || [];
            merged.employees = merged.employees || [];
            merged.laborLogs = merged.laborLogs || [];
            merged.laborPayments = merged.laborPayments || [];
            merged.users = merged.users || prev.users || INITIAL_STATE.users;
            merged.currentUser = merged.currentUser || prev.currentUser || INITIAL_STATE.currentUser;
            return merged;
          });
          setSyncError(false);
        }
      } catch {
        setSyncError(true);
      }
    } catch {
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
        const merged = { ...INITIAL_STATE, ...parsed, syncId: INITIAL_STATE.syncId };
        merged.projects = merged.projects || [];
        merged.vendors = merged.vendors || [];
        merged.materials = merged.materials || [];
        merged.expenses = merged.expenses || [];
        merged.payments = merged.payments || [];
        merged.incomes = merged.incomes || [];
        merged.invoices = merged.invoices || [];
        merged.employees = merged.employees || [];
        merged.laborLogs = merged.laborLogs || [];
        merged.laborPayments = merged.laborPayments || [];
        merged.users = merged.users || INITIAL_STATE.users;
        merged.currentUser = merged.currentUser || INITIAL_STATE.currentUser;
        setState(merged);
      } catch {
        setSyncError(true);
      }
    }
    loadFromDB(INITIAL_STATE.syncId);
  }, [loadFromDB]);

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
      } catch {
        setSyncError(true);
      } finally {
        setIsSyncing(false);
        setLastSynced(new Date());
      }
    }, 500);
  }, []);

  const dispatchUpdate = useCallback((
    updater: (prev: AppState) => AppState, 
    logAction?: string, 
    logEntityType?: string, 
    logEntityId?: string, 
    logDetails?: string
  ) => {
    setState(prev => {
      let next = updater(prev);
      
      if (logAction && logEntityType && logEntityId) {
        const newLog: ActivityLog = {
          id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
          timestamp: new Date().toISOString(),
          action: logAction,
          entityType: logEntityType,
          entityId: logEntityId,
          details: logDetails || '',
          userId: prev.currentUser.id,
          userName: prev.currentUser.name
        };
        next = { 
          ...next, 
          activityLogs: [newLog, ...(next.activityLogs || [])].slice(0, 9999) 
        };
      }

      setPast(p => [...p, prev].slice(-20)); // Keep last 20 actions
      setFuture([]);
      saveToDB(next);
      return next;
    });
  }, [saveToDB]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    
    setPast(newPast);
    setFuture(f => [state, ...f]);
    setState(previous);
    saveToDB(previous);
  }, [past, state, saveToDB]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);
    
    setFuture(newFuture);
    setPast(p => [...p, state]);
    setState(next);
    saveToDB(next);
  }, [future, state, saveToDB]);

  const updateUser = useCallback((u: User) => dispatchUpdate(prev => ({ ...prev, currentUser: u })), [dispatchUpdate]);
  const setTheme = useCallback((theme: 'light' | 'dark') => {
    dispatchUpdate(prev => ({ ...prev, theme }));
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [dispatchUpdate]);
  const setAllowDecimalStock = useCallback((val: boolean) => dispatchUpdate(prev => ({ ...prev, allowDecimalStock: val })), [dispatchUpdate]);

  const addProject = useCallback(async (p: Project) => dispatchUpdate(prev => ({ ...prev, projects: [...prev.projects, p] }), 'Create', 'Project', p.id, `Created project: ${p.name}`), [dispatchUpdate]);
  const updateProject = useCallback(async (p: Project) => dispatchUpdate(prev => ({ ...prev, projects: prev.projects.map(proj => proj.id === p.id ? p : proj) }), 'Update', 'Project', p.id, `Updated project: ${p.name}`), [dispatchUpdate]);
  const deleteProject = useCallback(async (id: string) => {
    return dispatchUpdate(prev => ({ 
      ...prev, 
      projects: prev.projects.map(p => p.id === id ? { ...p, isDeleted: true } : p) 
    }), 'Delete', 'Project', id, `Deleted project`);
  }, [dispatchUpdate]);

  const permanentDeleteProject = useCallback(async (id: string) => {
    return dispatchUpdate(prev => {
      // Remove project
      const nextProjects = prev.projects.filter(p => p.id !== id);
      
      // Cascading delete
      const nextExpenses = prev.expenses.filter(e => e.projectId !== id);
      const nextIncomes = prev.incomes.filter(i => i.projectId !== id);
      const nextInvoices = prev.invoices.filter(inv => inv.projectId !== id);
      const nextLaborLogs = prev.laborLogs.filter(l => l.projectId !== id);
      
      // For payments and laborPayments, they might not have projectId directly.
      // Need to check if they are linked to expenses or laborLogs that were deleted.
      // Or if they are linked to the project.
      // Looking at the types, payments have vendorId, not projectId.
      // LaborPayments have employeeId, not projectId.
      
      // Let's assume for now we only delete things directly linked to projectId.
      // If there are other links, we might need a more complex approach.
      
      return { 
        ...prev, 
        projects: nextProjects,
        expenses: nextExpenses,
        incomes: nextIncomes,
        invoices: nextInvoices,
        laborLogs: nextLaborLogs
      };
    }, 'PermanentDelete', 'Project', id, `Permanently deleted project and associated data`);
  }, [dispatchUpdate]);

  const restoreProject = useCallback(async (id: string) => {
    return dispatchUpdate(prev => ({ 
      ...prev, 
      projects: prev.projects.map(p => p.id === id ? { ...p, isDeleted: false } : p) 
    }), 'Restore', 'Project', id, `Restored project`);
  }, [dispatchUpdate]);
  
  const addVendor = useCallback(async (v: Vendor) => dispatchUpdate(prev => ({ ...prev, vendors: [...prev.vendors, v] }), 'Create', 'Vendor', v.id, `Created vendor: ${v.name}`), [dispatchUpdate]);
  const updateVendor = useCallback(async (v: Vendor) => dispatchUpdate(prev => ({ ...prev, vendors: prev.vendors.map(vend => vend.id === v.id ? v : vend) }), 'Update', 'Vendor', v.id, `Updated vendor: ${v.name}`), [dispatchUpdate]);
  const deleteVendor = useCallback(async (id: string) => {
    return dispatchUpdate(prev => ({ ...prev, vendors: prev.vendors.filter(v => v.id !== id) }), 'Delete', 'Vendor', id, `Deleted vendor`);
  }, [dispatchUpdate]);

  const addMaterial = useCallback(async (m: Material) => dispatchUpdate(prev => ({ ...prev, materials: [...prev.materials, m] }), 'Create', 'Material', m.id, `Created material: ${m.name}`), [dispatchUpdate]);
  const updateMaterial = useCallback(async (m: Material) => dispatchUpdate(prev => ({ ...prev, materials: prev.materials.map(mat => mat.id === m.id ? m : mat) }), 'Update', 'Material', m.id, `Updated material: ${m.name}`), [dispatchUpdate]);
  const deleteMaterial = useCallback(async (id: string) => {
    return dispatchUpdate(prev => ({ ...prev, materials: prev.materials.filter(m => m.id !== id) }), 'Delete', 'Material', id, `Deleted material`);
  }, [dispatchUpdate]);

  const addExpense = useCallback(async (e: Expense) => dispatchUpdate(prev => {
    let nextVendors = [...prev.vendors];
    if (e.vendorId && (e.inventoryAction === 'Purchase' || !e.inventoryAction)) {
      nextVendors = nextVendors.map(v => v.id === e.vendorId ? { ...v, balance: v.balance + e.amount } : v);
    }
    let nextMaterials = [...prev.materials];
    if (e.materialId && e.materialQuantity) {
      const type: 'Purchase' | 'Usage' | 'Transfer' = e.inventoryAction === 'Transfer' ? 'Transfer' : 
                   (e.inventoryAction === 'Purchase' || (!e.inventoryAction && !!e.vendorId) ? 'Purchase' : 'Usage');
      nextMaterials = nextMaterials.map(m => {
        if (m.id === e.materialId) {
          const hist: StockHistoryEntry = { 
            id: 'sh-exp-' + e.id, 
            date: e.date, 
            type: type, 
            quantity: e.materialQuantity!, 
            projectId: e.projectId, 
            vendorId: e.vendorId, 
            employeeId: e.employeeId,
            note: e.notes, 
            unitPrice: type === 'Purchase' ? (e.amount / e.materialQuantity!) : (e.unitPrice || m.costPerUnit), 
            parentPurchaseId: type !== 'Purchase' ? e.parentPurchaseId : undefined
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
  }, 'Create', 'Expense', e.id, `Recorded expense of ${e.amount} for ${e.category}`), [dispatchUpdate]);

  const addExpenses = useCallback(async (newExpenses: Expense[]) => dispatchUpdate(prev => {
    let nextVendors = [...prev.vendors];
    let nextMaterials = [...prev.materials];
    const nextExpenses = [...prev.expenses];

    newExpenses.forEach(e => {
      if (e.vendorId && (e.inventoryAction === 'Purchase' || !e.inventoryAction)) {
        nextVendors = nextVendors.map(v => v.id === e.vendorId ? { ...v, balance: v.balance + e.amount } : v);
      }
      if (e.materialId && e.materialQuantity) {
        const type: 'Purchase' | 'Usage' | 'Transfer' = e.inventoryAction === 'Transfer' ? 'Transfer' : 
                     (e.inventoryAction === 'Purchase' || (!e.inventoryAction && !!e.vendorId) ? 'Purchase' : 'Usage');
        nextMaterials = nextMaterials.map(m => {
          if (m.id === e.materialId) {
            const hist: StockHistoryEntry = { 
              id: 'sh-exp-' + e.id, 
              date: e.date, 
              type: type, 
              quantity: e.materialQuantity!, 
              projectId: e.projectId, 
              vendorId: e.vendorId, 
              employeeId: e.employeeId,
              note: e.notes, 
              unitPrice: type === 'Purchase' ? (e.amount / e.materialQuantity!) : (e.unitPrice || m.costPerUnit), 
              parentPurchaseId: type !== 'Purchase' ? e.parentPurchaseId : undefined
            };
            const newHistory = [...(m.history || []), hist];
            const totalPurchased = newHistory.filter(h => h.type === 'Purchase' && h.quantity > 0).reduce((sum, h) => sum + h.quantity, 0);
            const totalUsed = Math.abs(newHistory.filter(h => h.type === 'Usage' && h.quantity < 0).reduce((sum, h) => sum + h.quantity, 0));
            return { ...m, totalPurchased, totalUsed, history: newHistory };
          }
          return m;
        });
      }
      nextExpenses.push(e);
    });

    return { ...prev, expenses: nextExpenses, vendors: nextVendors, materials: nextMaterials };
  }, 'BulkCreate', 'Expense', 'multiple', `Recorded ${newExpenses.length} expenses in bulk`), [dispatchUpdate]);

  const updateExpense = useCallback(async (e: Expense) => dispatchUpdate(prev => {
    const oldExp = prev.expenses.find(x => x.id === e.id);
    let nextVendors = [...prev.vendors];

    if (oldExp && oldExp.vendorId && (oldExp.inventoryAction === 'Purchase' || !oldExp.inventoryAction)) {
      nextVendors = nextVendors.map(v => v.id === oldExp.vendorId ? { ...v, balance: v.balance - oldExp.amount } : v);
    }
    if (e.vendorId && (e.inventoryAction === 'Purchase' || !e.inventoryAction)) {
      nextVendors = nextVendors.map(v => v.id === e.vendorId ? { ...v, balance: v.balance + e.amount } : v);
    }

    const expensesToUpdate = [e];
    
    if (e.inventoryAction === 'Purchase' && e.materialQuantity) {
      const newUnitPrice = e.amount / e.materialQuantity;
      
      const findDescendants = (parentId: string, currentPrice: number) => {
        const children = prev.expenses.filter(x => x.parentPurchaseId === parentId);
        children.forEach(child => {
          const updatedChild = { ...child, unitPrice: currentPrice };
          if (child.inventoryAction === 'Usage') {
            updatedChild.amount = Math.abs(child.materialQuantity || 0) * currentPrice;
          }
          expensesToUpdate.push(updatedChild);
          
          if (child.inventoryAction === 'Transfer' && (child.materialQuantity || 0) > 0) {
            findDescendants(child.id, currentPrice);
          }
        });
      };
      
      findDescendants(e.id, newUnitPrice);
    }

    let nextMaterials = [...prev.materials];
    
    expensesToUpdate.forEach(exp => {
      const oldExpForThis = prev.expenses.find(x => x.id === exp.id);
      nextMaterials = nextMaterials.map(m => {
        if (m.id === exp.materialId || (oldExpForThis && m.id === oldExpForThis.materialId)) {
          const historyId = 'sh-exp-' + exp.id;
          const currentHistory = m.history || [];
          
          let newHistory;
          if (m.id === exp.materialId) {
            const existing = currentHistory.find(h => h.id === historyId);
            if (existing) {
              newHistory = currentHistory.map(h => {
                if (h.id === historyId) {
                  const type: 'Purchase' | 'Usage' | 'Transfer' = exp.inventoryAction === 'Transfer' ? 'Transfer' : (exp.inventoryAction === 'Purchase' || (!exp.inventoryAction && !!exp.vendorId) ? 'Purchase' : 'Usage');
                  return {
                    ...h,
                    type: type,
                    date: exp.date,
                    quantity: exp.materialQuantity || 0,
                    projectId: exp.projectId,
                    vendorId: exp.vendorId,
                    employeeId: exp.employeeId,
                    note: exp.notes,
                    unitPrice: exp.unitPrice || (type === 'Purchase' && exp.materialQuantity ? exp.amount / exp.materialQuantity : m.costPerUnit)
                  };
                }
                return h;
              });
            } else {
               const type: 'Purchase' | 'Usage' | 'Transfer' = exp.inventoryAction === 'Transfer' ? 'Transfer' : (exp.inventoryAction === 'Purchase' || (!exp.inventoryAction && !!exp.vendorId) ? 'Purchase' : 'Usage');
               const hist: StockHistoryEntry = { 
                  id: historyId, 
                  date: exp.date, 
                  type: type, 
                  quantity: exp.materialQuantity!, 
                  projectId: exp.projectId, 
                  vendorId: exp.vendorId, 
                  employeeId: exp.employeeId,
                  note: exp.notes, 
                  unitPrice: type === 'Purchase' ? (exp.amount / exp.materialQuantity!) : (exp.unitPrice || m.costPerUnit), 
                  parentPurchaseId: type !== 'Purchase' ? exp.parentPurchaseId : undefined
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
    });

    const nextExpenses = prev.expenses.map(x => {
      const updated = expensesToUpdate.find(u => u.id === x.id);
      return updated ? updated : x;
    });

    return { 
      ...prev, 
      expenses: nextExpenses,
      materials: nextMaterials,
      vendors: nextVendors
    };
  }, 'Update', 'Expense', e.id, `Updated expense of ${e.amount}`), [dispatchUpdate]);

  const deleteExpense = useCallback(async (id: string) => {
    return dispatchUpdate(prev => {
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
    if (expToDelete.vendorId && (expToDelete.inventoryAction === 'Purchase' || !expToDelete.inventoryAction)) {
      nextVendors = nextVendors.map(v => v.id === expToDelete.vendorId ? { ...v, balance: v.balance - expToDelete.amount } : v);
    }

    return { 
      ...prev, 
      expenses: prev.expenses.filter(x => x.id !== id),
      materials: nextMaterials,
      vendors: nextVendors
    };
  }, 'Delete', 'Expense', id, `Deleted expense`);
  }, [dispatchUpdate]);

  const addPayment = useCallback(async (p: Payment) => dispatchUpdate(prev => {
    const nextVendors = prev.vendors.map(v => v.id === p.vendorId ? { ...v, balance: v.balance - p.amount } : v);
    
    if (!p.materialBatchId) {
      let remainingAmountToAllocate = p.amount;
      const allocatedPayments: Payment[] = [];
      const masterPaymentId = p.id;
      
      const purchaseBills = prev.expenses.filter(e => e.vendorId === p.vendorId && (e.inventoryAction === 'Purchase' || !e.inventoryAction));
      
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
  }, 'Create', 'Payment', p.id, `Recorded payment of ${p.amount}`), [dispatchUpdate]);

  const updatePayment = useCallback(async (p: Payment) => dispatchUpdate(prev => {
    if (p.amount <= 0) {
      const actualOldPay = prev.payments.find(x => x.id === p.id);
      let nextVendors = [...prev.vendors];
      if (actualOldPay && !actualOldPay.isAllocation) {
        nextVendors = nextVendors.map(v => v.id === actualOldPay.vendorId ? { ...v, balance: v.balance + actualOldPay.amount } : v);
      }
      return {
        ...prev,
        payments: prev.payments.filter(x => x.id !== p.id && x.masterPaymentId !== p.id),
        vendors: nextVendors
      };
    }

    const actualOldPay = prev.payments.find(x => x.id === p.id);
    let nextVendors = [...prev.vendors];
    
    // Step 1: Revert old master payment from vendor balance
    if (actualOldPay) {
      nextVendors = nextVendors.map(v => v.id === actualOldPay.vendorId ? { ...v, balance: v.balance + actualOldPay.amount } : v);
    }

    // Step 2: Remove old child allocations associated with this master payment
    const paymentsWithoutOldAllocations = prev.payments.filter(x => x.id !== p.id && x.masterPaymentId !== p.id);

    // Step 3: Apply new payment to vendor balance
    nextVendors = nextVendors.map(v => v.id === p.vendorId ? { ...v, balance: v.balance - p.amount } : v);

    // Step 4: Re-calculate allocations based on the new amount (if no specific batch linked)
    const newAllocations: Payment[] = [];
    if (!p.materialBatchId) {
      let remainingToAlloc = p.amount;
      const masterPaymentId = p.id;
      
      const purchaseBills = prev.expenses.filter(e => e.vendorId === p.vendorId && (e.inventoryAction === 'Purchase' || !e.inventoryAction));
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
  }, 'Update', 'Payment', p.id, `Updated payment of ${p.amount}`), [dispatchUpdate]);

  const deletePayment = useCallback(async (id: string) => {
    return dispatchUpdate(prev => {
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
  }, 'Delete', 'Payment', id, `Deleted payment`);
  }, [dispatchUpdate]);

  const addIncome = useCallback(async (i: Income) => dispatchUpdate(prev => ({ ...prev, incomes: [...prev.incomes, i] }), 'Create', 'Income', i.id, `Recorded income of ${i.amount}`), [dispatchUpdate]);
  const updateIncome = useCallback(async (i: Income) => dispatchUpdate(prev => ({ ...prev, incomes: prev.incomes.map(inc => inc.id === i.id ? i : inc) }), 'Update', 'Income', i.id, `Updated income of ${i.amount}`), [dispatchUpdate]);
  const deleteIncome = useCallback(async (id: string) => {
    return dispatchUpdate(prev => ({ ...prev, incomes: prev.incomes.filter(i => i.id !== id) }), 'Delete', 'Income', id, `Deleted income`);
  }, [dispatchUpdate]);

  const addInvoice = useCallback(async (inv: Invoice) => dispatchUpdate(prev => ({ ...prev, invoices: [...prev.invoices, inv] }), 'Create', 'Invoice', inv.id, `Generated invoice for ${inv.amount}`), [dispatchUpdate]);
  const updateInvoice = useCallback(async (inv: Invoice) => dispatchUpdate(prev => ({ ...prev, invoices: prev.invoices.map(i => i.id === inv.id ? inv : i) }), 'Update', 'Invoice', inv.id, `Updated invoice for ${inv.amount}`), [dispatchUpdate]);
  const deleteInvoice = useCallback(async (id: string) => {
    return dispatchUpdate(prev => ({ ...prev, invoices: prev.invoices.filter(i => i.id !== id) }), 'Delete', 'Invoice', id, `Deleted invoice`);
  }, [dispatchUpdate]);

  const addEmployee = useCallback(async (emp: Employee) => dispatchUpdate(prev => ({ ...prev, employees: [...prev.employees, emp] }), 'Create', 'Employee', emp.id, `Added employee: ${emp.name}`), [dispatchUpdate]);
  const updateEmployee = useCallback(async (emp: Employee) => dispatchUpdate(prev => ({ ...prev, employees: prev.employees.map(e => e.id === emp.id ? emp : e) }), 'Update', 'Employee', emp.id, `Updated employee: ${emp.name}`), [dispatchUpdate]);
  const deleteEmployee = useCallback(async (id: string) => {
    return dispatchUpdate(prev => ({ ...prev, employees: prev.employees.filter(e => e.id !== id) }), 'Delete', 'Employee', id, `Deleted employee`);
  }, [dispatchUpdate]);

  const addLaborLog = useCallback(async (log: LaborLog) => dispatchUpdate(prev => {
    const employee = prev.employees.find(e => e.id === log.employeeId);
    const expense: Expense = {
      id: 'exp-labor-' + log.id,
      date: log.date,
      projectId: log.projectId,
      amount: log.wageAmount,
      paymentMethod: 'Cash',
      category: 'Labor',
      notes: `Labor Wage: ${employee?.name || 'Unknown'} (${log.status})`
    };
    return { ...prev, laborLogs: [...prev.laborLogs, log], expenses: [...prev.expenses, expense] };
  }, 'Create', 'LaborLog', log.id, `Recorded labor log for ${log.hoursWorked} hours`), [dispatchUpdate]);

  const updateLaborLog = useCallback(async (log: LaborLog) => dispatchUpdate(prev => {
    const expenseId = 'exp-labor-' + log.id;
    const employee = prev.employees.find(e => e.id === log.employeeId);
    const nextExpenses = prev.expenses.map(exp => {
      if (exp.id === expenseId) {
        return {
          ...exp,
          date: log.date,
          projectId: log.projectId,
          amount: log.wageAmount,
          notes: `Labor Wage: ${employee?.name || 'Unknown'} (${log.status})`
        };
      }
      return exp;
    });
    return { ...prev, laborLogs: prev.laborLogs.map(l => l.id === log.id ? log : l), expenses: nextExpenses };
  }, 'Update', 'LaborLog', log.id, `Updated labor log for ${log.hoursWorked} hours`), [dispatchUpdate]);

  const deleteLaborLog = useCallback(async (id: string) => {
    return dispatchUpdate(prev => {
      const expenseId = 'exp-labor-' + id;
      return { ...prev, laborLogs: prev.laborLogs.filter(l => l.id !== id), expenses: prev.expenses.filter(exp => exp.id !== expenseId) };
    }, 'Delete', 'LaborLog', id, `Deleted labor log`);
  }, [dispatchUpdate]);

  const addLaborPayment = useCallback(async (pay: LaborPayment) => dispatchUpdate(prev => ({ ...prev, laborPayments: [...prev.laborPayments, pay] }), 'Create', 'LaborPayment', pay.id, `Recorded labor payment of ${pay.amount}`), [dispatchUpdate]);
  const updateLaborPayment = useCallback(async (pay: LaborPayment) => dispatchUpdate(prev => ({ ...prev, laborPayments: prev.laborPayments.map(p => p.id === pay.id ? pay : p) }), 'Update', 'LaborPayment', pay.id, `Updated labor payment of ${pay.amount}`), [dispatchUpdate]);
  const deleteLaborPayment = useCallback(async (id: string) => {
    return dispatchUpdate(prev => ({ ...prev, laborPayments: prev.laborPayments.filter(p => p.id !== id) }), 'Delete', 'LaborPayment', id, `Deleted labor payment`);
  }, [dispatchUpdate]);

  const forceSync = useCallback(async () => loadFromDB(), [loadFromDB]);

  const addTradeCategory = useCallback((cat: string) => dispatchUpdate(prev => ({ ...prev, tradeCategories: [...prev.tradeCategories, cat] })), [dispatchUpdate]);
  const removeTradeCategory = useCallback((cat: string) => dispatchUpdate(prev => ({ ...prev, tradeCategories: prev.tradeCategories.filter(c => c !== cat) })), [dispatchUpdate]);
  const addStockingUnit = useCallback((unit: string) => dispatchUpdate(prev => ({ ...prev, stockingUnits: [...prev.stockingUnits, unit] })), [dispatchUpdate]);
  const removeStockingUnit = useCallback((unit: string) => dispatchUpdate(prev => ({ ...prev, stockingUnits: prev.stockingUnits.filter(u => u !== unit) })), [dispatchUpdate]);
  const addSiteStatus = useCallback((status: string) => dispatchUpdate(prev => ({ ...prev, siteStatuses: [...prev.siteStatuses, status] })), [dispatchUpdate]);
  const removeSiteStatus = useCallback((status: string) => dispatchUpdate(prev => ({ ...prev, siteStatuses: prev.siteStatuses.filter(s => s !== status) })), [dispatchUpdate]);

  const importState = useCallback(async (newState: AppState) => {
    const normalizedState = { ...INITIAL_STATE, ...newState, syncId: INITIAL_STATE.syncId };
    normalizedState.projects = normalizedState.projects || [];
    normalizedState.vendors = normalizedState.vendors || [];
    normalizedState.materials = normalizedState.materials || [];
    normalizedState.expenses = normalizedState.expenses || [];
    normalizedState.payments = normalizedState.payments || [];
    normalizedState.incomes = normalizedState.incomes || [];
    normalizedState.invoices = normalizedState.invoices || [];
    normalizedState.employees = normalizedState.employees || [];
    normalizedState.laborLogs = normalizedState.laborLogs || [];
    normalizedState.laborPayments = normalizedState.laborPayments || [];
    normalizedState.users = normalizedState.users || INITIAL_STATE.users;
    normalizedState.currentUser = normalizedState.currentUser || INITIAL_STATE.currentUser;
    
    setState(normalizedState);
    localStorage.setItem('buildtrack_pro_state_v2', JSON.stringify(normalizedState));
    try {
      await fetch(`${API_PATH}?action=save_state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizedState)
      });
      setSyncError(false);
    } catch {
      setSyncError(true);
    }
  }, []);

  const exportData = useCallback(() => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BuildMasterPro_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [state]);

  const exportExcel = useCallback(() => {
    const wb = XLSX.utils.book_new();
    const addSheet = (data: unknown[], name: string) => {
      if (data && data.length > 0) {
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, name);
      }
    };

    addSheet(state.projects, 'Projects');
    addSheet(state.vendors, 'Vendors');
    addSheet(state.materials, 'Materials');
    addSheet(state.expenses, 'Expenses');
    addSheet(state.incomes, 'Incomes');
    addSheet(state.invoices, 'Invoices');
    addSheet(state.payments, 'Payments');
    addSheet(state.employees, 'Employees');
    addSheet(state.laborLogs, 'LaborLogs');
    addSheet(state.laborPayments, 'LaborPayments');

    if (wb.SheetNames.length === 0) {
      const ws = XLSX.utils.json_to_sheet([{ Message: "No data available" }]);
      XLSX.utils.book_append_sheet(wb, ws, 'Empty');
    }

    XLSX.writeFile(wb, `buildtrack_pro_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  }, [state]);

  const isProjectLocked = useCallback((projectId: string) => {
    const project = state.projects.find(p => p.id === projectId);
    return project?.status === 'Completed';
  }, [state.projects]);

  const value = useMemo(() => ({
    ...state,
    updateUser, setTheme, setAllowDecimalStock,
    addProject, updateProject, deleteProject, permanentDeleteProject, restoreProject,
    addVendor, updateVendor, deleteVendor,
    addMaterial, updateMaterial, deleteMaterial,
    addExpense, addExpenses, updateExpense, deleteExpense,
    addPayment, updatePayment, deletePayment,
    addIncome, updateIncome, deleteIncome,
    addInvoice, updateInvoice, deleteInvoice,
    addEmployee, updateEmployee, deleteEmployee,
    addLaborLog, updateLaborLog, deleteLaborLog,
    addLaborPayment, updateLaborPayment, deleteLaborPayment,
    forceSync,
    addTradeCategory, removeTradeCategory,
    addStockingUnit, removeStockingUnit,
    addSiteStatus, removeSiteStatus,
    importState,
    exportData, exportExcel,
    isProjectLocked,
    isLoading, isSyncing, syncError, lastSynced,
    undo, redo, canUndo: past.length > 0, canRedo: future.length > 0, lastActionName: ''
  }), [state, isLoading, isSyncing, syncError, lastSynced, past.length, future.length, undo, redo, isProjectLocked, 
      updateUser, setTheme, setAllowDecimalStock, addProject, updateProject, deleteProject, permanentDeleteProject, restoreProject, addVendor, updateVendor, deleteVendor, 
      addMaterial, updateMaterial, deleteMaterial, addExpense, addExpenses, updateExpense, deleteExpense, addPayment, updatePayment, deletePayment, 
      addIncome, updateIncome, deleteIncome, addInvoice, updateInvoice, deleteInvoice, addEmployee, updateEmployee, deleteEmployee, 
      addLaborLog, updateLaborLog, deleteLaborLog, addLaborPayment, updateLaborPayment, deleteLaborPayment, forceSync, 
      addTradeCategory, removeTradeCategory, addStockingUnit, removeStockingUnit, addSiteStatus, removeSiteStatus, importState,
      exportData, exportExcel]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};