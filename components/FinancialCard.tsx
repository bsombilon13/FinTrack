
import React, { useState, useEffect } from 'react';
import { FinancialEntry, TransactionStatus } from '../types';

interface FinancialCardProps {
  title: string;
  entries: FinancialEntry[];
  onAdd: (label: string, amount: number) => void;
  onDelete: (id: string) => void;
  onUpdateStatus?: (id: string, status: TransactionStatus) => void;
  onUpdateEntry: (id: string, label: string, amount: number) => void;
  totalLabel: string;
  accentColor?: string;
  hasStatus?: boolean;
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
  hasStatus = false
}) => {
  const [newLabel, setNewLabel] = useState('');
  const [newAmount, setNewAmount] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editAmount, setEditAmount] = useState('');
  
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
    if (newLabel.trim() !== '' && !isNaN(amount) && amount >= 0) {
      onAdd(newLabel.trim(), amount);
      setNewLabel('');
      setNewAmount('');
    }
  };

  const startEditing = (entry: FinancialEntry) => {
    setEditingId(entry.id);
    setEditLabel(entry.label);
    setEditAmount(entry.amount.toString());
    resetConfirmations();
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditLabel('');
    setEditAmount('');
  };

  const saveEdit = (id: string) => {
    const amount = parseFloat(editAmount);
    if (editLabel.trim() !== '' && !isNaN(amount) && amount >= 0) {
      onUpdateEntry(id, editLabel.trim(), amount);
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

  const total = entries.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className={`bento-card rounded-2xl p-5 flex flex-col h-full border-l-[6px] ${accentColor}`}>
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">{title}</h3>
        <span className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-800/60 px-2.5 py-1 rounded-full">
          {entries.length} {entries.length === 1 ? 'item' : 'items'}
        </span>
      </div>
      
      <div className="flex-grow space-y-3 mb-6 overflow-y-auto max-h-72 pr-1.5 custom-scrollbar">
        {entries.length === 0 && (
          <p className="text-slate-400 dark:text-slate-600 text-xs italic text-center py-8">No records found.</p>
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
                  <label className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 block mb-1 uppercase tracking-wider">Item Label</label>
                  <input 
                    type="text" 
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border-2 border-indigo-500 rounded-lg px-3 py-2 text-sm dark:text-slate-100 text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-sm transition-all"
                    placeholder="E.g. Rent, Freelance Payment"
                    required
                    autoFocus
                  />
                </div>
                <div className="flex items-end space-x-2">
                  <div className="relative flex-grow">
                    <label className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 block mb-1 uppercase tracking-wider">Amount</label>
                    <input 
                      type="number" 
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border-2 border-indigo-500 rounded-lg px-3 py-2 text-sm dark:text-slate-100 text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-sm transition-all font-mono"
                      placeholder="0.00"
                      min="0"
                      step="any"
                      required
                    />
                  </div>
                  <button 
                    onClick={() => saveEdit(entry.id)} 
                    className="bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 rounded-lg shadow-lg shadow-emerald-500/20 transition-all hover:scale-105"
                    aria-label="Save changes"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                  </button>
                  <button 
                    onClick={cancelEditing} 
                    className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 p-2.5 rounded-lg transition-all hover:bg-slate-300 dark:hover:bg-slate-700"
                    aria-label="Cancel editing"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
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
                    <span className="text-sm font-semibold dark:text-slate-100 text-slate-800 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{entry.label}</span>
                    {justSavedId === entry.id && (
                      <span className="ml-2 animate-bounce">
                        <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                      </span>
                    )}
                  </div>
                  {hasStatus && (
                    <span className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${
                      entry.status === TransactionStatus.PAID ? 'text-emerald-600 dark:text-emerald-400' : 
                      entry.status === TransactionStatus.PENDING ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {entry.status}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center space-x-3">
                  <span className={`font-mono text-sm font-bold transition-all ${confirmingDeleteId === entry.id || confirmingStatusId === entry.id ? 'opacity-30 blur-[2px]' : 'opacity-100'} ${justSavedId === entry.id ? 'text-emerald-500' : 'dark:text-slate-100 text-slate-900'}`}>
                    ₱{entry.amount.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                  </span>
                  
                  <div className="flex items-center space-x-1">
                    {hasStatus && onUpdateStatus && (
                      <div className="flex items-center">
                        {confirmingStatusId === entry.id ? (
                          <div className="flex items-center bg-emerald-100 dark:bg-emerald-900/30 rounded-lg px-1.5 py-0.5 border border-emerald-500/30 animate-pulse">
                            <button onClick={() => handleStatusClick(entry)} className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:scale-110" title="Confirm Status Update">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                            </button>
                            <button onClick={resetConfirmations} className="p-1.5 text-slate-500 hover:text-slate-700" title="Cancel">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleStatusClick(entry)}
                            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 opacity-40 group-hover:opacity-100 transition-all hover:text-indigo-500"
                            title="Update Status"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                          </button>
                        )}
                      </div>
                    )}

                    <div className="flex items-center">
                      {confirmingDeleteId === entry.id ? (
                        <div className="flex items-center bg-rose-100 dark:bg-rose-900/30 rounded-lg px-2 py-0.5 border border-rose-500/30">
                          <button onClick={() => handleDeleteClick(entry.id)} className="p-1 text-rose-600 dark:text-rose-400 hover:text-rose-700 font-bold text-[10px] tracking-tighter">
                            DELETE?
                          </button>
                          <button onClick={resetConfirmations} className="p-1 text-slate-500 hover:text-slate-700" title="Cancel">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleDeleteClick(entry.id)}
                          className="p-2 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg text-slate-400 opacity-40 group-hover:opacity-100 transition-all hover:text-rose-500"
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

      <div className="mt-auto space-y-4">
        <form onSubmit={handleAdd} className="flex flex-col space-y-2.5 p-3 bg-slate-50/50 dark:bg-slate-900/20 rounded-xl border border-slate-200/50 dark:border-slate-800/40">
          <input 
            type="text" 
            placeholder="Item description..." 
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-medium dark:text-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
            required
          />
          <div className="flex space-x-2">
            <input 
              type="number" 
              placeholder="0.00" 
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              className="flex-grow bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-mono dark:text-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
              min="0"
              step="any"
              required
            />
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 rounded-lg transition-all shadow-md shadow-indigo-600/20 flex-shrink-0 active:scale-95 font-bold text-xs uppercase tracking-widest">
              Add
            </button>
          </div>
        </form>
        
        <div className="flex justify-between items-center pt-4 border-t-2 border-slate-200 dark:border-slate-800/60 transition-colors">
          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-[0.2em]">{totalLabel}</span>
          <span className="font-mono text-xl font-bold dark:text-white text-slate-900">
            ₱{total.toLocaleString(undefined, { minimumFractionDigits: 0 })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default FinancialCard;
