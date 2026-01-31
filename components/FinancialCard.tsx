
import React, { useState, useEffect } from 'react';
import { FinancialEntry, TransactionStatus } from '../types';

interface FinancialCardProps {
  title: string;
  entries: FinancialEntry[];
  onAdd: (label: string, amount: number, totalAmount?: number) => void;
  onDelete: (id: string) => void;
  onUpdateStatus?: (id: string, status: TransactionStatus) => void;
  onUpdateEntry: (id: string, label: string, amount: number, totalAmount?: number) => void;
  totalLabel: string;
  accentColor?: string;
  hasStatus?: boolean;
  isDebt?: boolean;
  customTotal?: number;
  secondaryTotal?: number;
  secondaryTotalLabel?: string;
}

const FinancialCard: React.FC<FinancialCardProps> = ({
  title,
  entries,
  onAdd,
  onDelete,
  onUpdateStatus,
  onUpdateEntry,
  totalLabel,
  accentColor = "border-slate-300 dark:border-slate-700",
  hasStatus = false,
  isDebt = false,
  customTotal,
  secondaryTotal,
  secondaryTotalLabel
}) => {
  const [newLabel, setNewLabel] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newTotalAmount, setNewTotalAmount] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editTotalAmount, setEditTotalAmount] = useState('');
  
  const [justSavedId, setJustSavedId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [confirmingStatusId, setConfirmingStatusId] = useState<string | null>(null);

  useEffect(() => {
    if (justSavedId) {
      const timer = setTimeout(() => setJustSavedId(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [justSavedId]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(newAmount);
    const totalAmount = isDebt ? parseFloat(newTotalAmount) : undefined;
    
    if (newLabel.trim() !== '' && !isNaN(amount) && amount >= 0) {
      onAdd(newLabel.trim(), amount, totalAmount);
      setNewLabel('');
      setNewAmount('');
      setNewTotalAmount('');
    }
  };

  const startEditing = (entry: FinancialEntry) => {
    setEditingId(entry.id);
    setEditLabel(entry.label);
    setEditAmount(entry.amount.toString());
    setEditTotalAmount(entry.totalAmount?.toString() || '');
    resetConfirmations();
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditLabel('');
    setEditAmount('');
    setEditTotalAmount('');
  };

  const saveEdit = (id: string) => {
    const amount = parseFloat(editAmount);
    const totalAmount = isDebt ? parseFloat(editTotalAmount) : undefined;
    
    if (editLabel.trim() !== '' && !isNaN(amount) && amount >= 0) {
      onUpdateEntry(id, editLabel.trim(), amount, totalAmount);
      setEditingId(null);
      setJustSavedId(id);
    }
  };

  const resetConfirmations = () => {
    setConfirmingDeleteId(null);
    setConfirmingStatusId(null);
  };

  const handleDeleteClick = (id: string) => {
    if (confirmingDeleteId === id) {
      onDelete(id);
      setConfirmingDeleteId(null);
    } else {
      resetConfirmations();
      setConfirmingDeleteId(id);
    }
  };

  const handleStatusClick = (entry: FinancialEntry) => {
    if (confirmingStatusId === entry.id && onUpdateStatus) {
      const nextStatus = entry.status === TransactionStatus.PAID ? TransactionStatus.UNPAID : TransactionStatus.PAID;
      onUpdateStatus(entry.id, nextStatus);
      setConfirmingStatusId(null);
      setJustSavedId(entry.id);
    } else {
      resetConfirmations();
      setConfirmingStatusId(entry.id);
    }
  };

  // Logic: If card has status, primary total only sums UNPAID items. Otherwise sums all.
  const displayTotal = customTotal !== undefined ? customTotal : entries
    .filter(e => !hasStatus || e.status !== TransactionStatus.PAID)
    .reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className={`bento-card rounded-2xl p-5 flex flex-col h-full min-h-[520px] border-l-[6px] ${accentColor}`}>
      <div className="flex justify-between items-center mb-5 shrink-0">
        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">{title}</h3>
        <span className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-800/60 px-2.5 py-1 rounded-full">
          {entries.length} {entries.length === 1 ? 'item' : 'items'}
        </span>
      </div>
      
      <div className="flex-grow space-y-3 mb-6 overflow-y-auto h-56 min-h-[14rem] pr-1.5 custom-scrollbar">
        {entries.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-40">
            <svg className="w-8 h-8 mb-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0l-8 8-8-8"></path></svg>
            <p className="text-xxs font-bold uppercase tracking-widest text-center">Empty</p>
          </div>
        )}
        {entries.map((entry) => (
          <div 
            key={entry.id} 
            className={`flex items-center justify-between group border-b border-slate-200/50 dark:border-slate-800/40 pb-3 last:border-0 min-h-[52px] transition-all duration-300 rounded-xl px-2 -mx-2 ${
              editingId === entry.id ? 'bg-indigo-50/70 dark:bg-indigo-900/15 ring-2 ring-indigo-500/30' : 
              justSavedId === entry.id ? 'bg-emerald-50/70 dark:bg-emerald-900/15 ring-2 ring-emerald-500/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800/20'
            }`}
          >
            {editingId === entry.id ? (
              <div className="flex flex-col flex-1 space-y-3 mr-2 animate-in py-1">
                <div className="relative">
                  <label className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 block mb-1 uppercase tracking-wider">Label</label>
                  <input 
                    type="text" 
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border-2 border-indigo-500 rounded-lg px-3 py-2 text-sm dark:text-slate-100 text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-sm transition-all"
                    required
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {isDebt && (
                    <div className="relative">
                      <label className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 block mb-1 uppercase tracking-wider">Total</label>
                      <input 
                        type="number" 
                        value={editTotalAmount}
                        onChange={(e) => setEditTotalAmount(e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border-2 border-indigo-500 rounded-lg px-3 py-2 text-sm dark:text-slate-100 text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-sm transition-all font-mono"
                        min="0"
                        step="any"
                      />
                    </div>
                  )}
                  <div className="relative flex-grow">
                    <label className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 block mb-1 uppercase tracking-wider">{isDebt ? 'Monthly' : 'Amount'}</label>
                    <input 
                      type="number" 
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border-2 border-indigo-500 rounded-lg px-3 py-2 text-sm dark:text-slate-100 text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-sm transition-all font-mono"
                      min="0"
                      step="any"
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                   <button 
                    onClick={() => saveEdit(entry.id)} 
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg shadow-lg shadow-emerald-500/20 transition-all text-[10px] font-bold uppercase tracking-widest"
                  >
                    Save
                  </button>
                  <button 
                    onClick={cancelEditing} 
                    className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1.5 rounded-lg transition-all hover:bg-slate-300 dark:hover:bg-slate-700 text-[10px] font-bold uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div 
                  className={`flex flex-col cursor-pointer transition-all flex-grow pr-2 ${confirmingDeleteId === entry.id || confirmingStatusId === entry.id ? 'opacity-30 blur-[2px]' : 'opacity-100'}`} 
                  onClick={() => startEditing(entry)}
                >
                  <div className="flex items-center">
                    <span className="text-sm font-semibold dark:text-slate-100 text-slate-800 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">{entry.label}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isDebt && entry.totalAmount !== undefined && (
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Total: ₱{entry.totalAmount.toLocaleString()}</span>
                    )}
                    {hasStatus && (
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${
                        entry.status === TransactionStatus.PAID ? 'text-emerald-600 dark:text-emerald-400' : 
                        entry.status === TransactionStatus.PENDING ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {entry.status}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 shrink-0">
                  <div className="flex flex-col items-end">
                    <span className={`font-mono text-sm font-bold transition-all ${confirmingDeleteId === entry.id || confirmingStatusId === entry.id ? 'opacity-30 blur-[2px]' : 'opacity-100'} ${justSavedId === entry.id ? 'text-emerald-500' : 'dark:text-slate-100 text-slate-900'}`}>
                      ₱{entry.amount.toLocaleString()}
                    </span>
                    {isDebt && <span className="text-[9px] text-slate-400 font-bold uppercase">Monthly</span>}
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    {hasStatus && onUpdateStatus && (
                      <div className="flex items-center">
                        {confirmingStatusId === entry.id ? (
                          <div className="flex items-center bg-emerald-100 dark:bg-emerald-900/30 rounded-lg px-1 py-0.5 border border-emerald-500/30">
                            <button onClick={() => handleStatusClick(entry)} className="p-1 text-emerald-600 dark:text-emerald-400 hover:scale-110">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                            </button>
                            <button onClick={resetConfirmations} className="p-1 text-slate-500 hover:text-slate-700">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleStatusClick(entry)}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 opacity-40 group-hover:opacity-100 transition-all hover:text-indigo-500"
                            title="Update Status"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                          </button>
                        )}
                      </div>
                    )}

                    <div className="flex items-center">
                      {confirmingDeleteId === entry.id ? (
                        <div className="flex items-center bg-rose-100 dark:bg-rose-900/30 rounded-lg px-1 py-0.5 border border-rose-500/30">
                          <button onClick={() => handleDeleteClick(entry.id)} className="p-1 text-rose-600 dark:text-rose-400 font-bold text-[9px] uppercase">
                            Del
                          </button>
                          <button onClick={resetConfirmations} className="p-1 text-slate-500 hover:text-slate-700">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleDeleteClick(entry.id)}
                          className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg text-slate-400 opacity-40 group-hover:opacity-100 transition-all hover:text-rose-500"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="mt-auto space-y-4 shrink-0">
        <form onSubmit={handleAdd} className="flex flex-col space-y-2 p-2.5 bg-slate-50/50 dark:bg-slate-900/20 rounded-xl border border-slate-200/50 dark:border-slate-800/40">
          <input 
            type="text" 
            placeholder="Description..." 
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs font-medium dark:text-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
            required
          />
          <div className="flex flex-col space-y-2">
            {isDebt && (
              <input 
                type="number" 
                placeholder="Total Debt" 
                value={newTotalAmount}
                onChange={(e) => setNewTotalAmount(e.target.value)}
                className="flex-grow bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono dark:text-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
                min="0"
                step="any"
              />
            )}
            <div className="flex space-x-2">
              <input 
                type="number" 
                placeholder={isDebt ? "Monthly Pay" : "Amount"} 
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="flex-grow bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono dark:text-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
                min="0"
                step="any"
                required
              />
              <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-all shadow-md shadow-indigo-600/20 flex-shrink-0 active:scale-95 font-bold text-xxs uppercase tracking-widest">
                Add
              </button>
            </div>
          </div>
        </form>
        
        <div className="pt-3 border-t-2 border-slate-200 dark:border-slate-800/60 transition-colors space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-[0.2em]">{totalLabel}</span>
            <span className="font-mono text-lg font-bold dark:text-white text-slate-900">
              ₱{displayTotal.toLocaleString(undefined, { minimumFractionDigits: 0 })}
            </span>
          </div>
          {secondaryTotal !== undefined && (
            <div className="flex justify-between items-center opacity-60">
              <span className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-[0.1em]">{secondaryTotalLabel || 'Overall'}</span>
              <span className="font-mono text-sm font-bold dark:text-white text-slate-900">
                ₱{secondaryTotal.toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinancialCard;
