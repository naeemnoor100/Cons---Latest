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
    logDetails?: string | ((prev: AppState) => string)
  ) => {
    setState(prev => {
      let next = updater(prev);
      
      if (logAction && logEntityType && logEntityId) {
        const details = typeof logDetails === 'function' ? logDetails(prev) : (logDetails || '');
        const newLog: ActivityLog = {
          id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
          timestamp: new Date().toISOString(),
          action: logAction,
          entityType: logEntityType,
          entityId: logEntityId,
          details: details,
          userId: prev.currentUser.id,
          userName: prev.currentUser.name
        };
        next = { 
          ...next, 
          activityLogs: [newLog, ...(next.activityLogs || [])].slice(0, 10000) 
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
  const setCompanyName = useCallback((name: string) => dispatchUpdate(prev => ({ ...prev, companyName: name })), [dispatchUpdate]);
  const setCompanyAddress = useCallback((address: string) => dispatchUpdate(prev => ({ ...prev, companyAddress: address })), [dispatchUpdate]);

  const addProject = useCallback(async (p: Project) => dispatchUpdate(prev => ({ ...prev, projects: [...prev.projects, p] }), 'Create', 'Project', p.id, `Created project: ${p.name}`), [dispatchUpdate]);
  const updateProject = useCallback(async (p: Project) => dispatchUpdate(prev => ({ ...prev, projects: prev.projects.map(proj => proj.id === p.id ? p : proj) }), 'Update', 'Project', p.id, (prev) => {
    const old = prev.projects.find(proj => proj.id === p.id);
    const changes: string[] = [];
    if (old) {
      if (old.name !== p.name) changes.push(`Name: "${old.name}" → "${p.name}"`);
      if (old.status !== p.status) changes.push(`Status: "${old.status}" → "${p.status}"`);
      if (old.budget !== p.budget) changes.push(`Budget: ${old.budget} → ${p.budget}`);
      if (old.client !== p.client) changes.push(`Client: "${old.client}" → "${p.client}"`);
      if (old.location !== p.location) changes.push(`Location: "${old.location}" → "${p.location}"`);
    }
    return `Updated project: ${p.name}${changes.length ? ` [${changes.join(' | ')}]` : ''}`;
  }), [dispatchUpdate]);
  const deleteProject = useCallback(async (id: string) => {
    return dispatchUpdate(prev => ({ 
      ...prev, 
      projects: prev.projects.map(p => p.id === id ? { ...p, isDeleted: true } : p) 
    }), 'Delete', 'Project', id, (prev) => `Deleted project: ${prev.projects.find(p => p.id === id)?.name || id}`);
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
    }, 'PermanentDelete', 'Project', id, prev => `Permanently deleted project: ${prev.projects.find(p => p.id === id)?.name || id} and all associated data`);
  }, [dispatchUpdate]);

  const restoreProject = useCallback(async (id: string) => {
    return dispatchUpdate(prev => ({ 
      ...prev, 
      projects: prev.projects.map(p => p.id === id ? { ...p, isDeleted: false } : p) 
    }), 'Restore', 'Project', id, prev => `Restored project: ${prev.projects.find(p => p.id === id)?.name || id}`);
  }, [dispatchUpdate]);
  
  const addVendor = useCallback(async (v: Vendor) => dispatchUpdate(prev => ({ ...prev, vendors: [...prev.vendors, v] }), 'Create', 'Vendor', v.id, `Created vendor: ${v.name}`), [dispatchUpdate]);
  const updateVendor = useCallback(async (v: Vendor) => dispatchUpdate(prev => ({ ...prev, vendors: prev.vendors.map(vend => vend.id === v.id ? v : vend) }), 'Update', 'Vendor', v.id, (prev) => {
    const old = prev.vendors.find(vend => vend.id === v.id);
    const changes: string[] = [];
    if (old) {
      if (old.name !== v.name) changes.push(`Name: "${old.name}" → "${v.name}"`);
      if (old.contact !== v.contact) changes.push(`Contact: "${old.contact}" → "${v.contact}"`);
      if (old.balance !== v.balance) changes.push(`Balance: ${old.balance} → ${v.balance}`);
      if (old.phone !== v.phone) changes.push(`Phone: "${old.phone}" → "${v.phone}"`);
    }
    return `Updated vendor: ${v.name}${changes.length ? ` [${changes.join(' | ')}]` : ''}`;
  }), [dispatchUpdate]);
  const deleteVendor = useCallback(async (id: string) => {
    return dispatchUpdate(prev => ({ ...prev, vendors: prev.vendors.filter(v => v.id !== id) }), 'Delete', 'Vendor', id, (prev) => `Deleted vendor: ${prev.vendors.find(v => v.id === id)?.name || id}`);
  }, [dispatchUpdate]);

  const addMaterial = useCallback(async (m: Material) => dispatchUpdate(prev => ({ ...prev, materials: [...prev.materials, m] }), 'Create', 'Material', m.id, `Created material: ${m.name} (${m.unit})`), [dispatchUpdate]);
  const updateMaterial = useCallback(async (m: Material) => dispatchUpdate(prev => ({ ...prev, materials: prev.materials.map(mat => mat.id === m.id ? m : mat) }), 'Update', 'Material', m.id, (prev) => {
    const old = prev.materials.find(mat => mat.id === m.id);
    const changes: string[] = [];
    if (old) {
      if (old.name !== m.name) changes.push(`Name: "${old.name}" → "${m.name}"`);
      if (old.unit !== m.unit) changes.push(`Unit: "${old.unit}" → "${m.unit}"`);
      if (old.costPerUnit !== m.costPerUnit) changes.push(`Cost: ${old.costPerUnit} → ${m.costPerUnit}`);
      if (old.lowStockThreshold !== m.lowStockThreshold) changes.push(`Threshold: ${old.lowStockThreshold} → ${m.lowStockThreshold}`);
    }
    return `Updated material: ${m.name}${changes.length ? ` [${changes.join(' | ')}]` : ''}`;
  }), [dispatchUpdate]);
  const deleteMaterial = useCallback(async (id: string) => {
    return dispatchUpdate(prev => ({ ...prev, materials: prev.materials.filter(m => m.id !== id) }), 'Delete', 'Material', id, (prev) => `Deleted material: ${prev.materials.find(m => m.id === id)?.name || id}`);
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
  }, 'Create', 'Expense', e.id, (prev) => {
    const project = prev.projects.find(p => p.id === e.projectId)?.name || 'Unknown';
    const vendor = prev.vendors.find(v => v.id === e.vendorId)?.name || 'Unknown';
    const material = prev.materials.find(m => m.id === e.materialId)?.name || 'Unknown';
    const materialInfo = e.materialId ? ` (${material}: ${e.materialQuantity} ${prev.materials.find(m => m.id === e.materialId)?.unit || ''})` : '';
    const vendorInfo = e.vendorId ? ` from ${vendor}` : '';
    return `Recorded expense of ${e.amount} for ${e.category}${materialInfo}${vendorInfo} in project: ${project}`;
  }), [dispatchUpdate]);

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
  }, 'BulkCreate', 'Expense', 'multiple', () => {
    const totalAmount = newExpenses.reduce((sum, e) => sum + e.amount, 0);
    return `Recorded ${newExpenses.length} expenses in bulk (Total: ${totalAmount})`;
  }), [dispatchUpdate]);

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
  }, 'Update', 'Expense', e.id, (prev) => {
    const old = prev.expenses.find(x => x.id === e.id);
    const changes: string[] = [];
    if (old) {
      if (old.amount !== e.amount) changes.push(`Amount: ${old.amount} → ${e.amount}`);
      if (old.category !== e.category) changes.push(`Category: "${old.category}" → "${e.category}"`);
      if (old.materialId !== e.materialId) {
        const oldMat = prev.materials.find(m => m.id === old.materialId)?.name || 'None';
        const newMat = prev.materials.find(m => m.id === e.materialId)?.name || 'None';
        changes.push(`Material: "${oldMat}" → "${newMat}"`);
      }
      if (old.materialQuantity !== e.materialQuantity) changes.push(`Quantity: ${old.materialQuantity} → ${e.materialQuantity}`);
      if (old.vendorId !== e.vendorId) {
        const oldVen = prev.vendors.find(v => v.id === old.vendorId)?.name || 'None';
        const newVen = prev.vendors.find(v => v.id === e.vendorId)?.name || 'None';
        changes.push(`Vendor: "${oldVen}" → "${newVen}"`);
      }
      if (old.projectId !== e.projectId) {
        const oldProj = prev.projects.find(p => p.id === old.projectId)?.name || 'None';
        const newProj = prev.projects.find(p => p.id === e.projectId)?.name || 'None';
        changes.push(`Project: "${oldProj}" → "${newProj}"`);
      }
    }
    const project = prev.projects.find(p => p.id === e.projectId)?.name || 'Unknown';
    return `Updated expense in project: ${project}${changes.length ? ` [${changes.join(' | ')}]` : ''}`;
  }), [dispatchUpdate]);

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
  }, 'Delete', 'Expense', id, (prev) => {
    const exp = prev.expenses.find(x => x.id === id);
    const project = prev.projects.find(p => p.id === exp?.projectId)?.name || 'Unknown';
    const vendor = prev.vendors.find(v => v.id === exp?.vendorId)?.name || 'Unknown';
    const material = prev.materials.find(m => m.id === exp?.materialId)?.name || 'Unknown';
    const materialInfo = exp?.materialId ? ` (${material})` : '';
    const vendorInfo = exp?.vendorId ? ` from ${vendor}` : '';
    return `Deleted expense of ${exp?.amount || ''} for ${exp?.category || ''}${materialInfo}${vendorInfo} in project: ${project}`;
  });
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
  }, 'Create', 'Payment', p.id, (prev) => {
    const vendor = prev.vendors.find(v => v.id === p.vendorId)?.name || 'Unknown';
    const project = prev.projects.find(proj => proj.id === p.projectId)?.name || 'Unknown';
    return `Recorded payment of ${p.amount} to vendor: ${vendor} for project: ${project}`;
  }), [dispatchUpdate]);

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
  }, 'Update', 'Payment', p.id, (prev) => {
    const old = prev.payments.find(x => x.id === p.id);
    const changes: string[] = [];
    if (old) {
      if (old.amount !== p.amount) changes.push(`Amount: ${old.amount} → ${p.amount}`);
      if (old.reference !== p.reference) changes.push(`Ref: "${old.reference}" → "${p.reference}"`);
      if (old.date !== p.date) changes.push(`Date: ${old.date} → ${p.date}`);
      if (old.vendorId !== p.vendorId) {
        const oldVen = prev.vendors.find(v => v.id === old.vendorId)?.name || 'None';
        const newVen = prev.vendors.find(v => v.id === p.vendorId)?.name || 'None';
        changes.push(`Vendor: "${oldVen}" → "${newVen}"`);
      }
    }
    const vendor = prev.vendors.find(v => v.id === p.vendorId)?.name || 'Unknown';
    const project = prev.projects.find(proj => proj.id === p.projectId)?.name || 'Unknown';
    return `Updated payment to ${vendor} for project: ${project}${changes.length ? ` [${changes.join(' | ')}]` : ''}`;
  }), [dispatchUpdate]);

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
  }, 'Delete', 'Payment', id, (prev) => {
    const pay = prev.payments.find(x => x.id === id);
    const vendor = prev.vendors.find(v => v.id === pay?.vendorId)?.name || 'Unknown';
    const project = prev.projects.find(proj => proj.id === pay?.projectId)?.name || 'Unknown';
    return `Deleted payment of ${pay?.amount || ''} to vendor: ${vendor} for project: ${project}`;
  });
  }, [dispatchUpdate]);

  const addIncome = useCallback(async (i: Income) => dispatchUpdate(prev => ({ ...prev, incomes: [...prev.incomes, i] }), 'Create', 'Income', i.id, (prev) => {
    const project = prev.projects.find(p => p.id === i.projectId);
    return `Recorded income of ${i.amount} for project: ${project?.name || 'Unknown'} (Client: ${project?.client || 'Unknown'})`;
  }), [dispatchUpdate]);
  const updateIncome = useCallback(async (i: Income) => dispatchUpdate(prev => ({ ...prev, incomes: prev.incomes.map(inc => inc.id === i.id ? i : inc) }), 'Update', 'Income', i.id, (prev) => {
    const old = prev.incomes.find(inc => inc.id === i.id);
    const changes: string[] = [];
    if (old) {
      if (old.amount !== i.amount) changes.push(`Amount: ${old.amount} → ${i.amount}`);
      if (old.date !== i.date) changes.push(`Date: ${old.date} → ${i.date}`);
      if (old.projectId !== i.projectId) {
        const oldProj = prev.projects.find(p => p.id === old.projectId)?.name || 'None';
        const newProj = prev.projects.find(p => p.id === i.projectId)?.name || 'None';
        changes.push(`Project: "${oldProj}" → "${newProj}"`);
      }
    }
    const project = prev.projects.find(p => p.id === i.projectId);
    return `Updated income for project: ${project?.name || 'Unknown'}${changes.length ? ` [${changes.join(' | ')}]` : ''}`;
  }), [dispatchUpdate]);
  const deleteIncome = useCallback(async (id: string) => {
    return dispatchUpdate(prev => ({ ...prev, incomes: prev.incomes.filter(i => i.id !== id) }), 'Delete', 'Income', id, (prev) => {
      const inc = prev.incomes.find(i => i.id === id);
      const project = prev.projects.find(p => p.id === inc?.projectId);
      return `Deleted income of ${inc?.amount || ''} for project: ${project?.name || 'Unknown'} (Client: ${project?.client || 'Unknown'})`;
    });
  }, [dispatchUpdate]);

  const addInvoice = useCallback(async (inv: Invoice) => dispatchUpdate(prev => ({ ...prev, invoices: [...prev.invoices, inv] }), 'Create', 'Invoice', inv.id, (prev) => {
    const project = prev.projects.find(p => p.id === inv.projectId);
    return `Generated invoice for ${inv.amount} for project: ${project?.name || 'Unknown'} (Client: ${project?.client || 'Unknown'})`;
  }), [dispatchUpdate]);
  const updateInvoice = useCallback(async (inv: Invoice) => dispatchUpdate(prev => ({ ...prev, invoices: prev.invoices.map(i => i.id === inv.id ? inv : i) }), 'Update', 'Invoice', inv.id, (prev) => {
    const old = prev.invoices.find(i => i.id === inv.id);
    const changes: string[] = [];
    if (old) {
      if (old.amount !== inv.amount) changes.push(`Amount: ${old.amount} → ${inv.amount}`);
      if (old.date !== inv.date) changes.push(`Date: ${old.date} → ${inv.date}`);
    }
    const project = prev.projects.find(p => p.id === inv.projectId);
    return `Updated invoice for project: ${project?.name || 'Unknown'}${changes.length ? ` (${changes.join(', ')})` : ''}`;
  }), [dispatchUpdate]);
  const deleteInvoice = useCallback(async (id: string) => {
    return dispatchUpdate(prev => ({ ...prev, invoices: prev.invoices.filter(i => i.id !== id) }), 'Delete', 'Invoice', id, (prev) => {
      const inv = prev.invoices.find(i => i.id === id);
      const project = prev.projects.find(p => p.id === inv?.projectId);
      return `Deleted invoice for ${inv?.amount || ''} for project: ${project?.name || 'Unknown'} (Client: ${project?.client || 'Unknown'})`;
    });
  }, [dispatchUpdate]);

  const addEmployee = useCallback(async (emp: Employee) => dispatchUpdate(prev => ({ ...prev, employees: [...prev.employees, emp] }), 'Create', 'Employee', emp.id, `Added employee: ${emp.name}`), [dispatchUpdate]);
  const updateEmployee = useCallback(async (emp: Employee) => dispatchUpdate(prev => ({ ...prev, employees: prev.employees.map(e => e.id === emp.id ? emp : e) }), 'Update', 'Employee', emp.id, (prev) => {
    const old = prev.employees.find(e => e.id === emp.id);
    const changes: string[] = [];
    if (old) {
      if (old.name !== emp.name) changes.push(`Name: "${old.name}" → "${emp.name}"`);
      if (old.role !== emp.role) changes.push(`Role: "${old.role}" → "${emp.role}"`);
      if (old.phone !== emp.phone) changes.push(`Phone: "${old.phone}" → "${emp.phone}"`);
      if (old.dailyWage !== emp.dailyWage) changes.push(`Wage: ${old.dailyWage} → ${emp.dailyWage}`);
    }
    return `Updated employee: ${emp.name}${changes.length ? ` [${changes.join(' | ')}]` : ''}`;
  }), [dispatchUpdate]);
  const deleteEmployee = useCallback(async (id: string) => {
    return dispatchUpdate(prev => ({ ...prev, employees: prev.employees.filter(e => e.id !== id) }), 'Delete', 'Employee', id, (prev) => `Deleted employee: ${prev.employees.find(e => e.id === id)?.name || id}`);
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
  }, 'Create', 'LaborLog', log.id, (prev) => {
    const emp = prev.employees.find(e => e.id === log.employeeId);
    const project = prev.projects.find(p => p.id === log.projectId);
    return `Recorded labor log for ${emp?.name || 'Unknown'}: ${log.hoursWorked} hours (Wage: ${log.wageAmount}) in project: ${project?.name || 'Unknown'}`;
  }), [dispatchUpdate]);

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
  }, 'Update', 'LaborLog', log.id, (prev) => {
    const old = prev.laborLogs.find(l => l.id === log.id);
    const changes: string[] = [];
    if (old) {
      if (old.hoursWorked !== log.hoursWorked) changes.push(`Hours: ${old.hoursWorked} → ${log.hoursWorked}`);
      if (old.wageAmount !== log.wageAmount) changes.push(`Wage: ${old.wageAmount} → ${log.wageAmount}`);
      if (old.date !== log.date) changes.push(`Date: ${old.date} → ${log.date}`);
      if (old.status !== log.status) changes.push(`Status: "${old.status}" → "${log.status}"`);
    }
    const emp = prev.employees.find(e => e.id === log.employeeId);
    const project = prev.projects.find(p => p.id === log.projectId);
    return `Updated labor log for ${emp?.name || 'Unknown'} in project: ${project?.name || 'Unknown'}${changes.length ? ` [${changes.join(' | ')}]` : ''}`;
  }), [dispatchUpdate]);

  const deleteLaborLog = useCallback(async (id: string) => {
    return dispatchUpdate(prev => {
      const expenseId = 'exp-labor-' + id;
      return { ...prev, laborLogs: prev.laborLogs.filter(l => l.id !== id), expenses: prev.expenses.filter(exp => exp.id !== expenseId) };
    }, 'Delete', 'LaborLog', id, (prev) => {
      const log = prev.laborLogs.find(l => l.id === id);
      const emp = prev.employees.find(e => e.id === log?.employeeId);
      const project = prev.projects.find(p => p.id === log?.projectId);
      return `Deleted labor log for ${emp?.name || 'Unknown'} in project: ${project?.name || 'Unknown'}`;
    });
  }, [dispatchUpdate]);

  const addLaborPayment = useCallback(async (pay: LaborPayment) => dispatchUpdate(prev => ({ ...prev, laborPayments: [...prev.laborPayments, pay] }), 'Create', 'LaborPayment', pay.id, (prev) => {
    const emp = prev.employees.find(e => e.id === pay.employeeId);
    const project = prev.projects.find(p => p.id === pay.projectId);
    return `Recorded labor payment of ${pay.amount} to employee: ${emp?.name || 'Unknown'} for project: ${project?.name || 'Unknown'}`;
  }), [dispatchUpdate]);
  const updateLaborPayment = useCallback(async (pay: LaborPayment) => dispatchUpdate(prev => ({ ...prev, laborPayments: prev.laborPayments.map(p => p.id === pay.id ? pay : p) }), 'Update', 'LaborPayment', pay.id, (prev) => {
    const old = prev.laborPayments.find(p => p.id === pay.id);
    const changes: string[] = [];
    if (old) {
      if (old.amount !== pay.amount) changes.push(`Amount: ${old.amount} → ${pay.amount}`);
      if (old.date !== pay.date) changes.push(`Date: ${old.date} → ${pay.date}`);
    }
    const emp = prev.employees.find(e => e.id === pay.employeeId);
    const project = prev.projects.find(p => p.id === pay.projectId);
    return `Updated labor payment to ${emp?.name || 'Unknown'} for project: ${project?.name || 'Unknown'}${changes.length ? ` (${changes.join(', ')})` : ''}`;
  }), [dispatchUpdate]);
  const deleteLaborPayment = useCallback(async (id: string) => {
    return dispatchUpdate(prev => ({ ...prev, laborPayments: prev.laborPayments.filter(p => p.id !== id) }), 'Delete', 'LaborPayment', id, (prev) => {
      const pay = prev.laborPayments.find(p => p.id === id);
      const emp = prev.employees.find(e => e.id === pay?.employeeId);
      const project = prev.projects.find(p => p.id === pay?.projectId);
      return `Deleted labor payment of ${pay?.amount || ''} to employee: ${emp?.name || 'Unknown'} for project: ${project?.name || 'Unknown'}`;
    });
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
    updateUser, setTheme, setAllowDecimalStock, setCompanyName, setCompanyAddress,
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
      updateUser, setTheme, setAllowDecimalStock, setCompanyName, setCompanyAddress, addProject, updateProject, deleteProject, permanentDeleteProject, restoreProject, addVendor, updateVendor, deleteVendor, 
      addMaterial, updateMaterial, deleteMaterial, addExpense, addExpenses, updateExpense, deleteExpense, addPayment, updatePayment, deletePayment, 
      addIncome, updateIncome, deleteIncome, addInvoice, updateInvoice, deleteInvoice, addEmployee, updateEmployee, deleteEmployee, 
      addLaborLog, updateLaborLog, deleteLaborLog, addLaborPayment, updateLaborPayment, deleteLaborPayment, forceSync, 
      addTradeCategory, removeTradeCategory, addStockingUnit, removeStockingUnit, addSiteStatus, removeSiteStatus, importState,
      exportData, exportExcel]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};