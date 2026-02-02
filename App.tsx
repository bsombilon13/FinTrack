
import React, { useState, useEffect, useMemo } from 'react';
import { FinancialEntry, DashboardData, TransactionStatus, Transaction, TransactionType } from './types';
import FinancialCard from './components/FinancialCard';
import { generateFinancialReport } from './services/pdfService';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Area, Cell, Legend, LabelList } from 'recharts';

type TabType = 'overview' | 'assets' | 'obligations' | 'transactions' | 'forecast';
type TransactionFormMode = 'movement' | 'settle' | 'add_obligation';
type Theme = 'dark' | 'light';

interface TabConfig {
  id: TabType;
  label: string;
  icon: React.ReactNode;
}

const InfoTooltip: React.FC<{ formula: string }> = ({ formula }) => (
  <div className="group relative inline-block ml-2 align-middle">
    <div className="p-1 rounded-full hover:bg-indigo-500/10 transition-colors cursor-help">
      <svg className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-72 p-4 bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-xl text-white text-xs rounded-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 shadow-2xl z-[100] border border-slate-700/50 transform translate-y-2 group-hover:translate-y-0 leading-relaxed">
      <div className="flex items-center space-x-2 mb-2.5 border-b border-slate-700/50 pb-2">
        <svg className="w-4 h-4 text-indigo-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path></svg>
        <span className="uppercase text-indigo-300 font-extrabold tracking-[0.15em] text-[10px]">Financial Calculation</span>
      </div>
      <p className="font-medium text-slate-200 whitespace-pre-wrap">{formula}</p>
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900/95 dark:border-t-slate-800/95"></div>
    </div>
  </div>
);

const DEFAULT_DATA: DashboardData = {
  savingsAccounts: [
    { id: '3', label: 'BPI Savings', amount: 25000 },
    { id: '4', label: 'Digital Bank (Maya)', amount: 12000 },
  ],
  accountBalances: [
    { id: '5', label: 'BDO Checkings', amount: 8500 },
  ],
  receivables: [
    { id: '6', label: 'Client A Project', amount: 5000, status: TransactionStatus.PENDING },
  ],
  loans: [
    { id: '7', label: 'Credit Card (Main)', amount: 1200, totalAmount: 12000, status: TransactionStatus.UNPAID },
  ],
  subscriptions: [
    { id: '8', label: 'Netflix', amount: 549, status: TransactionStatus.UNPAID },
    { id: '9', label: 'Spotify', amount: 149, status: TransactionStatus.UNPAID },
  ],
  savingsContribution: [
    { id: '10', label: 'Emergency Fund', amount: 2000, status: TransactionStatus.UNPAID },
  ],
  utilities: [
    { id: '11', label: 'Meralco', amount: 3500, status: TransactionStatus.UNPAID },
    { id: '12', label: 'Maynilad', amount: 800, status: TransactionStatus.UNPAID },
  ],
  plans: [
    { id: '13', label: 'Insurance Plan', amount: 3200, status: TransactionStatus.UNPAID },
  ],
  mandatories: [
    { id: '14', label: 'SSS/PhilHealth', amount: 1500, status: TransactionStatus.UNPAID },
  ],
  otherExpenses: [
    { id: '15', label: 'Groceries', amount: 6000, status: TransactionStatus.UNPAID },
    { id: '16', label: 'Transport', amount: 2000, status: TransactionStatus.UNPAID },
  ],
  transactions: [],
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [transactionFormMode, setTransactionFormMode] = useState<TransactionFormMode>('movement');
  const [isExporting, setIsExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<TransactionType | 'All'>('All');
  
  // Forms
  const [txDesc, setTxDesc] = useState('');
  const [txType, setTxType] = useState<TransactionType>(TransactionType.DEBIT);
  const [txAmount, setTxAmount] = useState('');
  const [txSource, setTxSource] = useState(''); 
  const [txRevenueId, setTxRevenueId] = useState('');
  const [txCustomRevenueLabel, setTxCustomRevenueLabel] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Settle Form
  const [payObligationId, setPayObligationId] = useState('');
  const [paySourceId, setPaySourceId] = useState('');
  const [payTargetId, setPayTargetId] = useState(''); 
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);

  // Add Obligation Form
  const [newOblLabel, setNewOblLabel] = useState('');
  const [newOblAmount, setNewOblAmount] = useState('');
  const [newOblTotalAmount, setNewOblTotalAmount] = useState('');
  const [newOblCategory, setNewOblCategory] = useState<keyof DashboardData>('utilities');

  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fintrack-theme');
      if (saved) return saved as Theme;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  });

  const [data, setData] = useState<DashboardData>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fintrack-data');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return { ...DEFAULT_DATA, ...parsed, transactions: parsed.transactions || [] };
        } catch (e) {
          console.error("Failed to parse saved financial data:", e);
        }
      }
    }
    return DEFAULT_DATA;
  });

  useEffect(() => {
    localStorage.setItem('fintrack-data', JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    document.documentElement.className = theme;
    localStorage.setItem('fintrack-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  const generateId = () => Math.random().toString(36).substr(2, 9);
  const calculateTotal = (entries: FinancialEntry[] = []) => entries.reduce((a, b) => a + (b?.amount || 0), 0);

  const stats = useMemo(() => {
    const liquidCash = calculateTotal(data.accountBalances);
    const vaultSavings = calculateTotal(data.savingsAccounts);
    const totalReceivables = calculateTotal(data.receivables);
    const unpaidReceivables = (data.receivables || []).filter(e => e.status !== TransactionStatus.PAID).reduce((acc, e) => acc + (e.amount || 0), 0);

    const categoryTotals = {
      loans: calculateTotal(data.loans),
      utilities: calculateTotal(data.utilities),
      subscriptions: calculateTotal(data.subscriptions),
      mandatories: calculateTotal(data.mandatories),
      plans: calculateTotal(data.plans),
      expenses: calculateTotal(data.otherExpenses),
      savings: calculateTotal(data.savingsContribution),
    };

    const commitmentCategories = [
      data.loans, data.utilities, data.subscriptions, 
      data.mandatories, data.plans, data.otherExpenses, data.savingsContribution
    ];
    
    const totalMonthlyCommitments = Object.values(categoryTotals).reduce((acc, val) => acc + val, 0);
    const unpaidMonthlyCommitments = commitmentCategories.flat().filter(e => e && e.status !== TransactionStatus.PAID).reduce((acc, e) => acc + (e.amount || 0), 0);
    const totalDebtBalanceValue = (data.loans || []).reduce((acc, e) => acc + (e.totalAmount !== undefined ? e.totalAmount : (e.amount || 0)), 0);

    const deployableFunds = (liquidCash + unpaidReceivables) - unpaidMonthlyCommitments;
    const liquidAssets = liquidCash + unpaidReceivables;
    const netMonthlyCashFlow = (liquidCash + totalReceivables) - totalMonthlyCommitments;
    const safetyFactorValue = totalMonthlyCommitments > 0 ? (liquidCash / totalMonthlyCommitments) * 100 : 0;
    
    const totalAssets = liquidCash + vaultSavings + totalReceivables;

    return {
      liquidCash, totalReceivables, unpaidReceivables, vaultSavings, liquidAssets,
      totalMonthlyCommitments, unpaidMonthlyCommitments, deployableFunds,
      netMonthlyCashFlow, safetyFactorValue, totalDebtBalanceValue, categoryTotals,
      totalAssets
    };
  }, [data]);

  const detailedForecast = useMemo(() => {
    const now = new Date();
    const months = [];
    let currentBalance = stats.liquidCash;
    
    for (let i = 0; i < 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const name = date.toLocaleString('default', { month: 'short' });
      const fullName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      
      const inflow = i === 0 ? stats.unpaidReceivables : (stats.unpaidReceivables * 0.4); 
      const outflow = stats.totalMonthlyCommitments;
      const net = inflow - outflow;
      currentBalance += net;

      months.push({ 
        id: i, 
        name, 
        fullName, 
        inflow: Math.max(0, inflow), 
        outflow: Math.max(0, outflow), 
        net, 
        balance: currentBalance 
      });
    }
    return months;
  }, [stats]);

  const filteredTransactions = useMemo(() => {
    return (data.transactions || []).filter(tx => {
      const matchesSearch = 
        tx.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
        tx.sourceLabel.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'All' || tx.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [data.transactions, searchQuery, filterType]);

  const filteredTotals = useMemo(() => {
    return filteredTransactions.reduce((acc, tx) => {
      if (tx.type === TransactionType.CREDIT) acc.credits += tx.amount;
      else acc.debits += tx.amount;
      return acc;
    }, { credits: 0, debits: 0 });
  }, [filteredTransactions]);

  const isSavingsGoalSelected = useMemo(() => {
    return (data.savingsContribution || []).some(o => o.id === payObligationId);
  }, [data.savingsContribution, payObligationId]);

  const handleExportPdf = async () => {
    setIsExporting(true);
    try { await generateFinancialReport(data, stats, detailedForecast); } 
    catch (e) { console.error(e); } finally { setIsExporting(false); }
  };

  const categoryChartData = useMemo(() => [
    { name: 'Current Cash', amount: stats.liquidCash, avg: stats.liquidCash * 0.95 },
    { name: 'Incoming', amount: stats.unpaidReceivables, avg: stats.unpaidReceivables * 1.1 },
    { name: 'Commitments', amount: stats.unpaidMonthlyCommitments, avg: stats.unpaidMonthlyCommitments * 1.05 },
    { name: 'Vault', amount: stats.vaultSavings, avg: stats.vaultSavings * 0.9 },
  ], [stats]);

  const addEntry = (section: keyof DashboardData, label: string, amount: number, totalAmount?: number) => {
    const newEntry: FinancialEntry = { id: generateId(), label, amount, totalAmount, status: TransactionStatus.UNPAID };
    setData(prev => ({ ...prev, [section]: [...(Array.isArray(prev[section]) ? prev[section] : []), newEntry] }));
  };

  const deleteEntry = (section: keyof DashboardData, id: string) => {
    setData(prev => ({ ...prev, [section]: (Array.isArray(prev[section]) ? prev[section] : []).filter((e: any) => e.id !== id) }));
  };

  const updateStatus = (section: keyof DashboardData, id: string, status: TransactionStatus) => {
    setData(prev => ({ ...prev, [section]: (Array.isArray(prev[section]) ? prev[section] : []).map((e: any) => e.id === id ? { ...e, status } : e) }));
  };

  const updateEntry = (id: string, label: string, amount: number, totalAmount?: number) => {
    setData(prev => {
      const newData = { ...prev };
      (Object.keys(newData) as Array<keyof DashboardData>).forEach(section => {
        if (Array.isArray(newData[section]) && section !== 'transactions') {
           newData[section] = (newData[section] as any[]).map((e: any) => e.id === id ? { ...e, label, amount, totalAmount } : e);
        }
      });
      return newData;
    });
  };

  const handleAddGeneralMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(txAmount);
    if (!txDesc || isNaN(amount) || !txSource) return;

    const sourceEntry = [...(data.accountBalances || []), ...(data.savingsAccounts || [])].find(a => a.id === txSource);
    if (!sourceEntry) return;

    const newTx: Transaction = {
      id: generateId(), description: txDesc, type: txType,
      amount, date: txDate, sourceId: txSource, sourceLabel: sourceEntry.label
    };

    setData(prev => {
      const updated = { ...prev };
      const updateAsset = (entries: FinancialEntry[] = []) => 
        entries.map(e => e.id === txSource 
          ? { ...e, amount: txType === TransactionType.CREDIT ? e.amount + amount : e.amount - amount } 
          : e
        );
      
      updated.accountBalances = updateAsset(prev.accountBalances);
      updated.savingsAccounts = updateAsset(prev.savingsAccounts);

      if (txType === TransactionType.CREDIT) {
        if (txRevenueId === 'custom' && txCustomRevenueLabel) {
          const newRevenue: FinancialEntry = { id: generateId(), label: txCustomRevenueLabel, amount, status: TransactionStatus.PAID };
          updated.receivables = [newRevenue, ...(prev.receivables || [])];
        } else if (txRevenueId) {
          updated.receivables = (prev.receivables || []).map(r => r.id === txRevenueId ? { ...r, status: TransactionStatus.PAID } : r);
        }
      }
      updated.transactions = [newTx, ...(prev.transactions || [])];
      return updated;
    });
    setTxDesc(''); setTxAmount(''); setTxSource(''); setTxRevenueId(''); setTxCustomRevenueLabel('');
  };

  const handleSettleObligation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payObligationId || !paySourceId) return;

    const sourceEntry = [...(data.accountBalances || []), ...(data.savingsAccounts || [])].find(a => a.id === paySourceId);
    const obligationCategories: Array<keyof DashboardData> = ['loans', 'subscriptions', 'savingsContribution', 'utilities', 'plans', 'mandatories', 'otherExpenses'];
    
    let targetObligation: FinancialEntry | undefined;
    let targetCategory: string = '';
    for (const cat of obligationCategories) {
      targetObligation = (data[cat as keyof DashboardData] as FinancialEntry[] || []).find(o => o.id === payObligationId);
      if (targetObligation) {
        targetCategory = cat;
        break;
      }
    }

    if (!sourceEntry || !targetObligation) return;

    const amount = targetObligation.amount;
    const newTx: Transaction = {
      id: generateId(),
      description: `Payment: ${targetObligation.label}`,
      type: TransactionType.DEBIT,
      amount, date: payDate, sourceId: paySourceId, sourceLabel: sourceEntry.label
    };

    setData(prev => {
      const updated = { ...prev };
      const updateAssetSubtract = (entries: FinancialEntry[] = []) => entries.map(e => e.id === paySourceId ? { ...e, amount: e.amount - amount } : e);
      updated.accountBalances = updateAssetSubtract(prev.accountBalances);
      updated.savingsAccounts = updateAssetSubtract(prev.savingsAccounts);

      if (targetCategory === 'savingsContribution' && payTargetId) {
        updated.savingsAccounts = (updated.savingsAccounts || []).map(a => a.id === payTargetId ? { ...a, amount: a.amount + amount } : a);
      }

      obligationCategories.forEach(cat => {
        updated[cat as keyof DashboardData] = (prev[cat as keyof DashboardData] as FinancialEntry[] || []).map(o => {
          if (o.id === payObligationId) {
            const updatedEntry = { ...o, status: TransactionStatus.PAID };
            if (cat === 'loans' && updatedEntry.totalAmount !== undefined) {
              updatedEntry.totalAmount = Math.max(0, updatedEntry.totalAmount - amount);
            }
            return updatedEntry;
          }
          return o;
        }) as any;
      });

      updated.transactions = [newTx, ...(prev.transactions || [])];
      return updated;
    });
    setPayObligationId(''); setPaySourceId(''); setPayTargetId('');
  };

  const handleAddObligationFromTransactions = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(newOblAmount);
    const totalAmount = newOblCategory === 'loans' ? parseFloat(newOblTotalAmount) : undefined;
    
    if (newOblLabel.trim() && !isNaN(amount)) {
      addEntry(newOblCategory, newOblLabel.trim(), amount, totalAmount);
      setNewOblLabel(''); setNewOblAmount(''); setNewOblTotalAmount('');
      alert(`Added "${newOblLabel}" to ${newOblCategory.toUpperCase()}. Switch to Obligations tab to see it.`);
    }
  };

  const deleteTransaction = (id: string) => {
    const tx = (data.transactions || []).find(t => t.id === id);
    if (!tx) return;
    setData(prev => {
      const reverse = (entries: FinancialEntry[] = []) => entries.map(e => e.id === tx.sourceId ? { ...e, amount: tx.type === TransactionType.CREDIT ? e.amount - tx.amount : e.amount + tx.amount } : e);
      return { ...prev, accountBalances: reverse(prev.accountBalances), savingsAccounts: reverse(prev.savingsAccounts), transactions: (prev.transactions || []).filter(t => t.id !== id) };
    });
  };

  const TABS: TabConfig[] = [
    { id: 'overview', label: 'Overview', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg> },
    { id: 'assets', label: 'Assets', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> },
    { id: 'obligations', label: 'Obligations', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg> },
    { id: 'transactions', label: 'Transactions', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg> },
    { id: 'forecast', label: 'Forecast', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg> }
  ];

  return (
    <div className="min-h-screen dark:bg-slate-950 bg-slate-50 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-500">
      <header className="px-6 py-5 flex flex-col md:flex-row justify-between items-center border-b dark:border-slate-900 border-slate-200 sticky top-0 z-50 dark:bg-slate-950/80 bg-white/90 backdrop-blur-xl gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-600/30">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
          </div>
          <div><h1 className="text-2xl font-black tracking-tight leading-none">FinTrack Pro</h1><span className="text-[10px] text-slate-500 uppercase tracking-widest mt-2 block">Management Suite</span></div>
        </div>
        <nav className="flex flex-col md:flex-row dark:bg-slate-900/60 bg-slate-100/60 p-1.5 rounded-2xl border dark:border-slate-800 border-slate-200 gap-1">
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center space-x-2.5 px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'}`}>
              {tab.icon}<span>{tab.label}</span>
            </button>
          ))}
        </nav>
        <div className="flex items-center space-x-4">
          <button onClick={handleExportPdf} disabled={isExporting} className="flex items-center space-x-2 px-5 py-3 rounded-xl border-2 border-indigo-600/20 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">
            <span>{isExporting ? 'Generating...' : 'Export PDF'}</span>
          </button>
          <button onClick={toggleTheme} className="p-3 rounded-xl dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <main className="max-w-[1720px] mx-auto p-4 md:p-12 space-y-12 pb-32">
        {activeTab === 'overview' && (
          <section key="overview" className="space-y-10 animate-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className={`bento-card rounded-[2.5rem] px-10 py-7 border-t-[10px] ${stats.deployableFunds >= 0 ? 'border-indigo-600' : 'border-rose-600'}`}>
                <div className="flex items-center mb-4"><span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em]">Deployable Funds</span><InfoTooltip formula="(Liquid + Unpaid Rev) - Unpaid Commitments" /></div>
                <span className={`text-4xl font-mono font-bold tracking-tighter ${stats.deployableFunds >= 0 ? '' : 'text-rose-600'}`}>₱{stats.deployableFunds.toLocaleString()}</span>
              </div>
              <div className="bento-card rounded-[2.5rem] px-10 py-7 border-t-[10px] border-slate-400">
                <div className="flex items-center mb-4"><span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em]">Net Flow Total Out</span><InfoTooltip formula="Sum of all monthly overhead requirements" /></div>
                <span className="text-4xl font-mono font-bold tracking-tighter">₱{stats.totalMonthlyCommitments.toLocaleString()}</span>
              </div>
              <div className={`bento-card rounded-[2.5rem] px-10 py-7 border-t-[10px] ${stats.safetyFactorValue >= 100 ? 'border-emerald-600' : 'border-rose-600'}`}>
                <div className="flex items-center mb-4"><span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em]">Safety Factor</span><InfoTooltip formula="(Liquid Cash / Monthly Needs) * 100" /></div>
                <span className={`text-4xl font-mono font-bold tracking-tighter ${stats.safetyFactorValue >= 100 ? 'text-emerald-500' : 'text-rose-600'}`}>{stats.safetyFactorValue.toFixed(0)}%</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 bento-card rounded-[3rem] p-12 h-[600px] flex flex-col">
                <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-500 mb-12">Capital Benchmarks</h2>
                <div className="flex-grow w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={categoryChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700, fill: theme === 'dark' ? '#94a3b8' : '#64748b'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} tickFormatter={(v) => `₱${(v/1000)}k`} />
                      <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#fff', borderRadius: '16px' }} />
                      <Bar dataKey="amount" radius={[10, 10, 0, 0]} barSize={60} fill="#6366f1" />
                      <Line dataKey="avg" stroke="#f43f5e" strokeWidth={4} dot={{ r: 6, fill: '#f43f5e' }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="lg:col-span-4 flex flex-col gap-6">
                <div className="bento-card rounded-[2.5rem] px-8 py-7 border-l-[10px] border-emerald-500 flex-grow flex flex-col justify-center">
                  <div className="flex items-center mb-4"><span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em]">Vault Savings</span><InfoTooltip formula="Total amount stashed in savings accounts" /></div>
                  <span className="text-4xl font-mono font-bold tracking-tighter text-emerald-500">₱{stats.vaultSavings.toLocaleString()}</span>
                  <p className="mt-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest">Reserved & Secured Reserves</p>
                </div>
                <div className="bento-card rounded-[2.5rem] px-8 py-7 border-l-[10px] border-amber-500 flex-grow flex flex-col justify-center">
                  <div className="flex items-center mb-4"><span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em]">Total Revenue</span><InfoTooltip formula="Aggregate of all receivables (paid & pending)" /></div>
                  <span className="text-4xl font-mono font-bold tracking-tighter text-amber-500">₱{stats.totalReceivables.toLocaleString()}</span>
                  <p className="mt-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest">Projected Realizable Inflow</p>
                </div>
                <div className="bento-card rounded-[2.5rem] px-8 py-7 border-l-[10px] border-rose-600 flex-grow flex flex-col justify-center">
                  <div className="flex items-center mb-4"><span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em]">Total Liabilities</span><InfoTooltip formula="Total combined amount of all monthly obligations" /></div>
                  <span className="text-4xl font-mono font-bold tracking-tighter text-rose-600">₱{stats.totalMonthlyCommitments.toLocaleString()}</span>
                  <p className="mt-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest">Cumulative Overhead Debt</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'forecast' && (
          <section key="forecast" className="space-y-12 animate-in">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-8 bento-card rounded-[3rem] p-12 h-[550px] flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8">
                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 block mb-1">Estimated End-of-Run</span>
                    <span className="text-3xl font-mono font-bold text-indigo-500">₱{detailedForecast[detailedForecast.length - 1].balance.toLocaleString()}</span>
                  </div>
                </div>
                <div className="mb-10">
                  <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-500">Balance Trajectory</h2>
                  <p className="text-[11px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Projected liquidity over next 6 months</p>
                </div>
                <div className="flex-grow w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={detailedForecast}>
                      <defs>
                        <linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700, fill: theme === 'dark' ? '#94a3b8' : '#64748b'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} tickFormatter={(v) => `₱${(v/1000)}k`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#fff', border: 'none', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} 
                        formatter={(val) => `₱${Number(val).toLocaleString()}`}
                      />
                      <Area type="monotone" dataKey="balance" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorBal)" dot={{ r: 4, fill: '#6366f1' }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="lg:col-span-4 flex flex-col gap-6">
                <div className="bento-card rounded-[2.5rem] p-8 border-l-[10px] border-emerald-500 h-full flex flex-col justify-center">
                   <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-4">Monthly Potential Gain</h3>
                   <span className="text-4xl font-mono font-bold text-emerald-500">₱{Math.max(0, stats.netMonthlyCashFlow).toLocaleString()}</span>
                   <p className="text-[11px] text-slate-400 mt-4 leading-relaxed font-medium uppercase tracking-wider">Estimated monthly surplus after all obligations and income realizations.</p>
                </div>
                <div className="bento-card rounded-[2.5rem] p-8 border-l-[10px] border-rose-500 h-full flex flex-col justify-center">
                   <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-4">Risk Exposure</h3>
                   <span className="text-4xl font-mono font-bold text-rose-500">₱{stats.unpaidMonthlyCommitments.toLocaleString()}</span>
                   <p className="text-[11px] text-slate-400 mt-4 leading-relaxed font-medium uppercase tracking-wider">Total capital required to settle all active pending monthly obligations.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {detailedForecast.map((month) => (
                <div key={month.id} className="bento-card rounded-[3rem] p-8 lg:p-10 flex flex-col relative overflow-hidden group hover:scale-[1.02] transition-all">
                  <div className="flex justify-between items-center mb-8">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">{month.fullName}</span>
                    <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase ${month.net >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                      {month.net >= 0 ? 'Surplus' : 'Deficit'}
                    </span>
                  </div>
                  <div className="space-y-6 mb-10">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Est. Inbound</span>
                      <span className="font-mono text-base font-bold text-emerald-500">+₱{month.inflow.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Est. Outbound</span>
                      <span className="font-mono text-base font-bold text-rose-500">-₱{month.outflow.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className={`mt-auto p-6 rounded-2xl ${theme === 'dark' ? 'bg-slate-900/40' : 'bg-slate-100/40'} border ${theme === 'dark' ? 'border-slate-800/50' : 'border-slate-200/50'}`}>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Projected End Balance</span>
                    <span className="text-2xl font-mono font-bold leading-none">₱{month.balance.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'transactions' && (
          <section key="transactions" className="space-y-10 animate-in">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
              <div className="xl:col-span-4 flex flex-col">
                <div className={`bento-card rounded-[2.5rem] p-8 border-t-[10px] shadow-xl transition-colors duration-500 ${
                  transactionFormMode === 'movement' ? 'border-indigo-600' : 
                  transactionFormMode === 'settle' ? 'border-emerald-600' : 'border-rose-600'
                }`}>
                  {/* Form Toggle Buttons */}
                  <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl mb-8 gap-1">
                    <button onClick={() => setTransactionFormMode('movement')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${transactionFormMode === 'movement' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'}`}>Movement</button>
                    <button onClick={() => setTransactionFormMode('settle')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${transactionFormMode === 'settle' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'}`}>Settle</button>
                    <button onClick={() => setTransactionFormMode('add_obligation')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${transactionFormMode === 'add_obligation' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'}`}>New Obl.</button>
                  </div>

                  {transactionFormMode === 'movement' && (
                    <div className="animate-in">
                      <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-500 mb-8">Record Movement</h2>
                      <form onSubmit={handleAddGeneralMovement} className="space-y-6">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</label>
                          <input type="text" placeholder="e.g. Salary, Groceries..." value={txDesc} onChange={(e) => setTxDesc(e.target.value)} className="w-full bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500 transition-all" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Type</label>
                            <select value={txType} onChange={(e) => setTxType(e.target.value as TransactionType)} className="w-full bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none cursor-pointer">
                              <option value={TransactionType.DEBIT}>Debit (Out)</option>
                              <option value={TransactionType.CREDIT}>Credit (In)</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Amount</label>
                            <input type="number" placeholder="0.00" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} className="w-full bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:border-indigo-500 transition-all" required />
                          </div>
                        </div>
                        {txType === TransactionType.CREDIT && (
                          <div className="space-y-4 animate-in">
                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inbound Source</label>
                              <select value={txRevenueId} onChange={(e) => setTxRevenueId(e.target.value)} className="w-full bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none cursor-pointer" required>
                                <option value="">Select source...</option>
                                <option value="custom">+ New Income Source</option>
                                {(data.receivables || []).filter(r => r.status !== TransactionStatus.PAID).map(r => (
                                  <option key={r.id} value={r.id}>{r.label} (₱{r.amount.toLocaleString()})</option>
                                ))}
                              </select>
                            </div>
                            {txRevenueId === 'custom' && (
                              <div className="space-y-1"><label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">New Source Label</label><input type="text" placeholder="e.g. Gift, Bonus..." value={txCustomRevenueLabel} onChange={(e) => setTxCustomRevenueLabel(e.target.value)} className="w-full bg-indigo-50/50 dark:bg-indigo-950/20 border-2 border-indigo-200 dark:border-indigo-900/40 rounded-xl px-4 py-2.5 text-sm outline-none" required /></div>
                            )}
                          </div>
                        )}
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Account</label>
                          <select value={txSource} onChange={(e) => setTxSource(e.target.value)} className="w-full bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none cursor-pointer" required>
                            <option value="">Select account...</option>
                            <optgroup label="Liquid">{(data.accountBalances || []).map(a => <option key={a.id} value={a.id}>{a.label}</option>)}</optgroup>
                            <optgroup label="Vaults">{(data.savingsAccounts || []).map(a => <option key={a.id} value={a.id}>{a.label}</option>)}</optgroup>
                          </select>
                        </div>
                        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3 rounded-xl shadow-lg active:scale-95 transition-all text-[10px] uppercase tracking-widest">Record</button>
                      </form>
                    </div>
                  )}

                  {transactionFormMode === 'settle' && (
                    <div className="animate-in">
                      <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-500 mb-8">Settle Obligation</h2>
                      <form onSubmit={handleSettleObligation} className="space-y-6">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Obligation</label>
                          <select value={payObligationId} onChange={(e) => setPayObligationId(e.target.value)} className="w-full bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none cursor-pointer" required>
                            <option value="">Pending Obligations...</option>
                            {['loans', 'utilities', 'subscriptions', 'mandatories', 'plans', 'savingsContribution', 'otherExpenses'].map(cat => (
                              <optgroup key={cat} label={cat.toUpperCase()}>
                                {(data[cat as keyof DashboardData] as FinancialEntry[] || []).filter(o => o.status !== TransactionStatus.PAID).map(o => (
                                  <option key={o.id} value={o.id}>{o.label} (₱{o.amount.toLocaleString()})</option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payment Source</label>
                          <select value={paySourceId} onChange={(e) => setPaySourceId(e.target.value)} className="w-full bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none cursor-pointer" required>
                            <option value="">Select account...</option>
                            {(data.accountBalances || []).map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                            {(data.savingsAccounts || []).map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                          </select>
                        </div>
                        {isSavingsGoalSelected && (
                          <div className="space-y-1 animate-in">
                            <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Destination Vault</label>
                            <select value={payTargetId} onChange={(e) => setPayTargetId(e.target.value)} className="w-full bg-indigo-50/50 dark:bg-indigo-950/20 border-2 border-indigo-200 dark:border-indigo-900/40 rounded-xl px-4 py-2.5 text-sm outline-none cursor-pointer" required>
                              <option value="">Select vault...</option>
                              {(data.savingsAccounts || []).map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                            </select>
                          </div>
                        )}
                        <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl shadow-lg active:scale-95 transition-all text-[10px] uppercase tracking-widest">Confirm Payment</button>
                      </form>
                    </div>
                  )}

                  {transactionFormMode === 'add_obligation' && (
                    <div className="animate-in">
                      <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-500 mb-8">New Obligation</h2>
                      <form onSubmit={handleAddObligationFromTransactions} className="space-y-6">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</label>
                          <select value={newOblCategory} onChange={(e) => setNewOblCategory(e.target.value as any)} className="w-full bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none cursor-pointer">
                            <option value="loans">Loans & Debt</option>
                            <option value="utilities">Utilities</option>
                            <option value="subscriptions">Subscriptions</option>
                            <option value="mandatories">Mandatories</option>
                            <option value="plans">Plans</option>
                            <option value="savingsContribution">Savings Contribution</option>
                            <option value="otherExpenses">Other Expenses</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Label / Name</label>
                          <input type="text" placeholder="e.g. Electricity, Car Loan..." value={newOblLabel} onChange={(e) => setNewOblLabel(e.target.value)} className="w-full bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-rose-500 transition-all" required />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Monthly Amount</label>
                            <input type="number" placeholder="0.00" value={newOblAmount} onChange={(e) => setNewOblAmount(e.target.value)} className="w-full bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono outline-none" required />
                          </div>
                          {newOblCategory === 'loans' && (
                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Debt Balance</label>
                              <input type="number" placeholder="0.00" value={newOblTotalAmount} onChange={(e) => setNewOblTotalAmount(e.target.value)} className="w-full bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono outline-none" />
                            </div>
                          )}
                        </div>
                        <button type="submit" className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black py-3 rounded-xl shadow-lg active:scale-95 transition-all text-[10px] uppercase tracking-widest">Add Obligation</button>
                      </form>
                    </div>
                  )}
                </div>
              </div>

              <div className="xl:col-span-8 flex flex-col space-y-8">
                {/* Summary Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="bento-card rounded-[2rem] p-6 border-l-[8px] border-emerald-500">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 block mb-2">Total Credits (Filtered)</span>
                    <span className="text-2xl font-mono font-bold text-emerald-500">₱{filteredTotals.credits.toLocaleString()}</span>
                  </div>
                  <div className="bento-card rounded-[2rem] p-6 border-l-[8px] border-rose-500">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 block mb-2">Total Debits (Filtered)</span>
                    <span className="text-2xl font-mono font-bold text-rose-500">₱{filteredTotals.debits.toLocaleString()}</span>
                  </div>
                </div>

                <div className="bento-card rounded-[2.5rem] p-10 flex flex-col min-h-[500px]">
                  <div className="flex justify-between items-center mb-10">
                    <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-500">Capital Ledger</h2>
                    <div className="flex gap-4">
                      <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none" />
                      <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)} className="px-4 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none cursor-pointer">
                        <option value="All">All Types</option>
                        <option value={TransactionType.CREDIT}>Credits</option>
                        <option value={TransactionType.DEBIT}>Debits</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex-grow overflow-x-auto no-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead><tr className="border-b dark:border-slate-800 border-slate-100"><th className="pb-6 text-[10px] font-black uppercase text-slate-400">Date</th><th className="pb-6 text-[10px] font-black uppercase text-slate-400">Description</th><th className="pb-6 text-[10px] font-black uppercase text-slate-400">Source</th><th className="pb-6 text-[10px] font-black uppercase text-slate-400">Type</th><th className="pb-6 text-[10px] font-black uppercase text-slate-400 text-right">Amount</th><th className="pb-6 text-[10px] font-black uppercase text-slate-400"></th></tr></thead>
                      <tbody className="divide-y dark:divide-slate-800/40 divide-slate-100/40">
                        {filteredTransactions.map((tx) => (
                          <tr key={tx.id} className="group hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-all">
                            <td className="py-5 font-mono text-[11px] text-slate-500">{tx.date}</td>
                            <td className="py-5 text-sm font-black">{tx.description}</td>
                            <td className="py-5"><span className="text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">{tx.sourceLabel}</span></td>
                            <td className="py-5"><span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full border ${tx.type === TransactionType.CREDIT ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>{tx.type}</span></td>
                            <td className={`py-5 text-right font-mono text-sm font-bold ${tx.type === TransactionType.CREDIT ? 'text-emerald-500' : 'text-rose-500'}`}>{tx.type === TransactionType.CREDIT ? '+' : '-'}₱{tx.amount.toLocaleString()}</td>
                            <td className="py-5 text-right"><button onClick={() => deleteTransaction(tx.id)} className="p-2 opacity-0 group-hover:opacity-100 hover:text-rose-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'assets' && (
          <div key="assets" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 animate-in">
            <FinancialCard title="Liquid Cash" totalLabel="Available" entries={data.accountBalances || []} accentColor="border-indigo-600" onAdd={(l, a) => addEntry('accountBalances', l, a)} onDelete={(id) => deleteEntry('accountBalances', id)} onUpdateEntry={updateEntry} />
            <FinancialCard title="Vault Savings" totalLabel="Stashed" entries={data.savingsAccounts || []} accentColor="border-emerald-500" onAdd={(l, a) => addEntry('savingsAccounts', l, a)} onDelete={(id) => deleteEntry('savingsAccounts', id)} onUpdateEntry={updateEntry} />
            <FinancialCard title="Revenue" totalLabel="Unpaid" entries={data.receivables || []} accentColor="border-amber-500" hasStatus onAdd={(l, a) => addEntry('receivables', l, a)} onDelete={(id) => deleteEntry('receivables', id)} onUpdateStatus={(id, s) => updateStatus('receivables', id, s)} onUpdateEntry={updateEntry} customTotal={stats.unpaidReceivables} secondaryTotal={stats.totalReceivables} />
          </div>
        )}

        {activeTab === 'obligations' && (
          <div key="obligations" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 animate-in">
            <FinancialCard title="Loans & Debt" totalLabel="Unpaid" entries={data.loans || []} accentColor="border-rose-600" isDebt hasStatus onAdd={(l, a, t) => addEntry('loans', l, a, t)} onDelete={(id) => deleteEntry('loans', id)} onUpdateStatus={(id, s) => updateStatus('loans', id, s)} onUpdateEntry={(id, l, a, t) => updateEntry(id, l, a, t)} secondaryTotal={stats.categoryTotals.loans} />
            <FinancialCard title="Utilities" totalLabel="Unpaid" entries={data.utilities || []} accentColor="border-sky-500" hasStatus onAdd={(l, a) => addEntry('utilities', l, a)} onDelete={(id) => deleteEntry('utilities', id)} onUpdateStatus={(id, s) => updateStatus('utilities', id, s)} onUpdateEntry={updateEntry} secondaryTotal={stats.categoryTotals.utilities} />
            <FinancialCard title="Mandatory" totalLabel="Unpaid" entries={data.mandatories || []} accentColor="border-slate-500" hasStatus onAdd={(l, a) => addEntry('mandatories', l, a)} onDelete={(id) => deleteEntry('mandatories', id)} onUpdateStatus={(id, s) => updateStatus('mandatories', id, s)} onUpdateEntry={updateEntry} secondaryTotal={stats.categoryTotals.mandatories} />
            <FinancialCard title="Subscriptions" totalLabel="Unpaid" entries={data.subscriptions || []} accentColor="border-red-600" hasStatus onAdd={(l, a) => addEntry('subscriptions', l, a)} onDelete={(id) => deleteEntry('subscriptions', id)} onUpdateStatus={(id, s) => updateStatus('subscriptions', id, s)} onUpdateEntry={updateEntry} secondaryTotal={stats.categoryTotals.subscriptions} />
            <FinancialCard title="Plans" totalLabel="Unpaid" entries={data.plans || []} accentColor="border-indigo-400" hasStatus onAdd={(l, a) => addEntry('plans', l, a)} onDelete={(id) => deleteEntry('plans', id)} onUpdateStatus={(id, s) => updateStatus('plans', id, s)} onUpdateEntry={updateEntry} secondaryTotal={stats.categoryTotals.plans} />
            <FinancialCard title="Savings Goals" totalLabel="Unpaid" entries={data.savingsContribution || []} accentColor="border-emerald-400" hasStatus onAdd={(l, a) => addEntry('savingsContribution', l, a)} onDelete={(id) => deleteEntry('savingsContribution', id)} onUpdateStatus={(id, s) => updateStatus('savingsContribution', id, s)} onUpdateEntry={updateEntry} secondaryTotal={stats.categoryTotals.savings} />
            <FinancialCard title="Other" totalLabel="Unpaid" entries={data.otherExpenses || []} accentColor="border-amber-400" hasStatus onAdd={(l, a) => addEntry('otherExpenses', l, a)} onDelete={(id) => deleteEntry('otherExpenses', id)} onUpdateStatus={(id, s) => updateStatus('otherExpenses', id, s)} onUpdateEntry={updateEntry} secondaryTotal={stats.categoryTotals.expenses} />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
