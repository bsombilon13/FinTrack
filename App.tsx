
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FinancialEntry, DashboardData, TransactionStatus } from './types';
import FinancialCard from './components/FinancialCard';
import { getFinancialInsights, InsightView } from './services/geminiService';
import { generateFinancialReport } from './services/pdfService';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Area, Cell, Legend, LabelList } from 'recharts';

type TabType = 'overview' | 'assets' | 'obligations' | 'prediction' | 'forecast';
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
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isAiConnected, setIsAiConnected] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
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
          return JSON.parse(saved);
        } catch (e) {
          console.error("Failed to parse saved financial data:", e);
        }
      }
    }
    return DEFAULT_DATA;
  });

  const [overviewInsight, setOverviewInsight] = useState<string>('');
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);

  useEffect(() => {
    localStorage.setItem('fintrack-data', JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    document.documentElement.className = theme;
    localStorage.setItem('fintrack-theme', theme);
  }, [theme]);

  // Use current aistudio context to determine AI availability
  useEffect(() => {
    const checkConnection = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setIsAiConnected(hasKey || !!process.env.API_KEY);
      }
    };
    checkConnection();
  }, []);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  const generateId = () => Math.random().toString(36).substr(2, 9);
  const calculateTotal = (entries: FinancialEntry[]) => entries.reduce((a, b) => a + b.amount, 0);

  // UNIFIED COMPUTATION ENGINE
  const stats = useMemo(() => {
    const liquidCash = calculateTotal(data.accountBalances);
    const vaultSavings = calculateTotal(data.savingsAccounts);
    const totalReceivables = calculateTotal(data.receivables);
    const unpaidReceivables = data.receivables.filter(e => e.status !== TransactionStatus.PAID).reduce((acc, e) => acc + e.amount, 0);

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
    const unpaidMonthlyCommitments = commitmentCategories.flat().filter(e => e.status !== TransactionStatus.PAID).reduce((acc, e) => acc + e.amount, 0);
    const totalDebtBalanceValue = data.loans.reduce((acc, e) => acc + (e.totalAmount !== undefined ? e.totalAmount : e.amount), 0);

    const deployableFunds = (liquidCash + unpaidReceivables) - unpaidMonthlyCommitments;
    const liquidAssets = liquidCash + unpaidReceivables;
    const netMonthlyCashFlow = (liquidCash + totalReceivables) - totalMonthlyCommitments;
    const safetyFactorValue = totalMonthlyCommitments > 0 ? (liquidCash / totalMonthlyCommitments) * 100 : 0;
    
    const savingsAllocation = calculateTotal(data.savingsContribution);
    const savingsRate = liquidAssets > 0 ? (savingsAllocation / liquidAssets) * 100 : 0;

    return {
      liquidCash,
      totalReceivables,
      unpaidReceivables,
      vaultSavings,
      liquidAssets,
      totalMonthlyCommitments,
      unpaidMonthlyCommitments,
      deployableFunds,
      netMonthlyCashFlow,
      safetyFactorValue,
      savingsAllocation,
      savingsRate,
      totalDebtBalanceValue,
      categoryTotals
    };
  }, [data]);

  const detailedForecast = useMemo(() => {
    const now = new Date();
    const months = [];
    let currentBalance = stats.liquidCash;
    const monthlyInflow = stats.unpaidReceivables;
    const monthlyOutflow = stats.totalMonthlyCommitments;

    for (let i = 0; i < 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      const inflow = i === 0 ? monthlyInflow : (stats.unpaidReceivables * 0.5);
      const outflow = monthlyOutflow;
      const net = inflow - outflow;
      currentBalance += net;
      months.push({ id: i, name: monthName, inflow, outflow, net, balance: currentBalance });
    }
    return months;
  }, [stats]);

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      await generateFinancialReport(data, stats, detailedForecast);
    } catch (error) {
      console.error("PDF Export Error:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const categoryChartData = useMemo(() => [
    { name: 'Current Cash', amount: stats.liquidCash, avg: stats.liquidCash * 0.95 },
    { name: 'Incoming', amount: stats.unpaidReceivables, avg: stats.unpaidReceivables * 1.1 },
    { name: 'Commitments', amount: stats.unpaidMonthlyCommitments, avg: stats.unpaidMonthlyCommitments * 1.05 },
    { name: 'Vault', amount: stats.vaultSavings, avg: stats.vaultSavings * 0.9 },
  ], [stats]);

  const handleOpenKeySelection = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setIsAiConnected(true);
    }
  };

  const fetchOverviewInsight = useCallback(async (isRetry = false) => {
    setIsLoadingInsight(true);
    try {
      const insight = await getFinancialInsights(data, 'overview');
      setOverviewInsight(insight);
      setIsAiConnected(true);
    } catch (e: any) {
      console.error("AI Insight Error:", e);
      // Handle the case where the API key is invalid or model is missing by prompting for a key
      if (e.message.includes("Requested entity was not found") || e.message === "API_KEY_MISSING") {
        setIsAiConnected(false);
        if (window.aistudio) {
          await window.aistudio.openSelectKey();
          // After calling openSelectKey, assume successful selection and proceed as per guidelines
          setIsAiConnected(true);
          if (!isRetry) fetchOverviewInsight(true);
        }
      } else {
        setOverviewInsight("AI Strategy hub offline. View quantitative breakdown instead.");
      }
    } finally {
      setIsLoadingInsight(false);
    }
  }, [data]);

  useEffect(() => {
    if (activeTab === 'overview' && !overviewInsight) fetchOverviewInsight();
  }, [activeTab, fetchOverviewInsight, overviewInsight]);

  const addEntry = (section: keyof DashboardData, label: string, amount: number, totalAmount?: number) => {
    const newEntry: FinancialEntry = { id: generateId(), label, amount, totalAmount, status: TransactionStatus.UNPAID };
    setData(prev => ({ ...prev, [section]: [...prev[section], newEntry] }));
  };

  const deleteEntry = (section: keyof DashboardData, id: string) => {
    setData(prev => ({ ...prev, [section]: prev[section].filter(e => e.id !== id) }));
  };

  const updateStatus = (section: keyof DashboardData, id: string, status: TransactionStatus) => {
    setData(prev => ({ ...prev, [section]: prev[section].map(e => e.id === id ? { ...e, status } : e) }));
  };

  const updateEntry = (id: string, label: string, amount: number, totalAmount?: number) => {
    setData(prev => {
      const newData = { ...prev };
      (Object.keys(newData) as Array<keyof DashboardData>).forEach(section => {
        newData[section] = (newData[section] as FinancialEntry[]).map(e => e.id === id ? { ...e, label, amount, totalAmount } : e);
      });
      return newData;
    });
  };

  const predictionData = useMemo(() => {
    const monthlyNet = stats.netMonthlyCashFlow;
    const now = new Date();
    const months = [];
    for(let i=0; i<=3; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const name = i === 0 ? "Current" : date.toLocaleString('default', { month: 'short' });
      const projected = stats.liquidCash + (monthlyNet * i);
      const safety = stats.totalMonthlyCommitments > 0 ? Math.min(100, (projected / stats.totalMonthlyCommitments) * 100) : 100;
      months.push({ name, balance: projected, safety });
    }
    return months;
  }, [stats]);

  const TABS: TabConfig[] = [
    { id: 'overview', label: 'Overview', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg> },
    { id: 'assets', label: 'Assets', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> },
    { id: 'obligations', label: 'Obligations', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg> },
    { id: 'prediction', label: 'Analysis', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> },
    { id: 'forecast', label: 'Forecast', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg> }
  ];

  return (
    <div className="min-h-screen dark:bg-slate-950 bg-slate-50 text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-500/30 overflow-x-hidden transition-colors duration-500">
      <header className="px-6 py-6 md:py-5 flex flex-col md:flex-row justify-between items-center border-b dark:border-slate-900 border-slate-200 sticky top-0 z-50 dark:bg-slate-950/80 bg-white/90 backdrop-blur-xl gap-6 transition-all duration-300">
        <div className="flex items-center justify-between w-full md:w-auto min-w-0">
          <div className="flex items-center space-x-4 min-w-0">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-600/30 shrink-0">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
            </div>
            <div className="min-w-0 truncate">
              <h1 className="text-2xl font-black tracking-tight dark:text-white text-slate-900 leading-none truncate">FinTrack Pro</h1>
              <div className="flex items-center mt-2 space-x-2">
                <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-[0.2em] leading-none truncate">Intelligence Suite</span>
              </div>
            </div>
          </div>
          
          <div className="md:hidden flex items-center space-x-3">
             {!isAiConnected && (
               <button 
                onClick={handleOpenKeySelection}
                className="p-3 rounded-xl border border-amber-500/50 text-amber-500 hover:bg-amber-500 hover:text-white transition-all active:scale-95"
                title="Connect AI Key"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
              </button>
             )}
             <button 
              onClick={handleExportPdf} 
              disabled={isExporting}
              className="p-3 rounded-xl border border-indigo-500/50 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all active:scale-95 disabled:opacity-50"
            >
              {isExporting ? <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>}
            </button>
            <button onClick={toggleTheme} className="p-3 rounded-xl dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 text-slate-500 hover:text-indigo-600 transition-all active:scale-95">
              {theme === 'dark' ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.95 16.95l.707.707M7.05 7.05l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z"></path></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>}
            </button>
          </div>
        </div>
        
        <nav className="flex flex-col md:flex-row dark:bg-slate-900/60 bg-slate-100/60 p-1.5 rounded-2xl border dark:border-slate-800 border-slate-200 w-full md:w-auto gap-1 transition-all duration-300">
          {TABS.map((tab) => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)} 
              className={`flex items-center space-x-3.5 md:space-x-2.5 px-6 md:px-5 py-4 md:py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300 w-full md:w-auto ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              <span className={`transition-all duration-300 ${activeTab === tab.id ? 'scale-110' : 'opacity-60'}`}>{tab.icon}</span>
              <span className="flex-grow md:flex-grow-0 text-left md:text-center">{tab.label}</span>
              {activeTab === tab.id && (
                <svg className="w-4 h-4 md:hidden opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path></svg>
              )}
            </button>
          ))}
        </nav>

        <div className="hidden md:flex items-center space-x-4 shrink-0">
          {!isAiConnected && (
            <button 
              onClick={handleOpenKeySelection}
              className="flex items-center space-x-2 px-5 py-3 rounded-xl border-2 border-amber-600/20 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-widest hover:bg-amber-600 hover:text-white transition-all active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
              <span>Connect AI</span>
            </button>
          )}
          <button 
            onClick={handleExportPdf} 
            disabled={isExporting}
            className="flex items-center space-x-2 px-5 py-3 rounded-xl border-2 border-indigo-600/20 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all active:scale-95 disabled:opacity-50"
          >
            {isExporting ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            )}
            <span>{isExporting ? 'Generating...' : 'Export PDF'}</span>
          </button>
          <button onClick={toggleTheme} className="p-3 rounded-xl dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 text-slate-500 hover:text-indigo-600 transition-all active:scale-95">
            {theme === 'dark' ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.95 16.95l.707.707M7.05 7.05l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z"></path></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>}
          </button>
        </div>
      </header>

      <main className="max-w-[1720px] mx-auto p-4 md:p-8 lg:p-12 space-y-12 pb-32 overflow-x-hidden">
        {activeTab === 'overview' && (
          <section key="overview" className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-10 animate-in">
            {isLoadingInsight && (
              <div className="md:col-span-12 bg-indigo-500/10 border border-indigo-500/20 rounded-[3rem] p-10 flex items-center justify-center space-x-4">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <span className="text-xs font-black uppercase tracking-[0.3em] text-indigo-500">Strategizing...</span>
              </div>
            )}
            
            <div className="md:col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-10">
              <div className={`bento-card rounded-[3.5rem] p-10 lg:p-14 flex flex-col justify-center min-h-[250px] lg:min-h-[320px] relative border-t-[12px] transition-all duration-500 ${stats.deployableFunds >= 0 ? 'border-indigo-600 shadow-2xl shadow-indigo-600/10' : 'border-rose-600 shadow-2xl shadow-rose-600/10'}`}>
                <div className={`absolute top-0 right-0 w-80 h-80 blur-[120px] opacity-20 ${stats.deployableFunds >= 0 ? 'bg-indigo-500' : 'bg-rose-500'}`}></div>
                <div className="flex items-center mb-10">
                  <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.5em]">Deployable Funds</span>
                  <InfoTooltip formula="(Liquid Cash + Unpaid Receivables) - Unpaid Commitments. Your true spending capacity." />
                </div>
                <div className="flex flex-col gap-2">
                  <span className={`text-5xl sm:text-6xl lg:text-7xl font-mono font-bold tracking-tighter leading-none ${stats.deployableFunds >= 0 ? 'dark:text-white text-slate-950' : 'text-rose-600'}`}>
                    ₱{stats.deployableFunds.toLocaleString()}
                  </span>
                  <div className="mt-4 flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${stats.deployableFunds >= 0 ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`}></div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Current Liquidity Profile</span>
                  </div>
                </div>
              </div>

              <div className="bento-card rounded-[3.5rem] p-10 lg:p-14 flex flex-col justify-center min-h-[250px] lg:min-h-[320px] relative border-t-[12px] border-slate-400 shadow-2xl shadow-slate-400/5">
                <div className="absolute top-0 right-0 w-80 h-80 bg-slate-400 opacity-10 blur-[120px]"></div>
                <div className="flex items-center mb-10">
                  <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.5em]">Net Flow Total Out</span>
                  <InfoTooltip formula="Sum of ALL category monthly requirements (Paid + Unpaid). Your full monthly overhead." />
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-5xl sm:text-6xl lg:text-7xl font-mono font-bold dark:text-white text-slate-950 tracking-tighter leading-none">
                    ₱{stats.totalMonthlyCommitments.toLocaleString()}
                  </span>
                  <div className="mt-4 flex items-center space-x-2 opacity-60">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
                    <span className="text-[10px] font-bold uppercase tracking-widest">Monthly Capital Drain</span>
                  </div>
                </div>
              </div>

              <div className={`bento-card rounded-[3.5rem] p-10 lg:p-14 flex flex-col justify-center min-h-[250px] lg:min-h-[320px] relative border-t-[12px] transition-all duration-500 ${stats.safetyFactorValue >= 100 ? 'border-emerald-600 shadow-emerald-500/10' : stats.safetyFactorValue >= 50 ? 'border-amber-500 shadow-amber-500/10' : 'border-rose-600 shadow-rose-500/10'}`}>
                <div className={`absolute top-0 right-0 w-80 h-80 blur-[120px] opacity-20 ${stats.safetyFactorValue >= 100 ? 'bg-emerald-500' : stats.safetyFactorValue >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}></div>
                <div className="flex items-center mb-10">
                  <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.5em]">Safety Factor</span>
                  <InfoTooltip formula="(Liquid Cash / Total Monthly Requirement) * 100. Measures what % of your total monthly needs is covered by current cash." />
                </div>
                <div className="flex flex-col gap-2">
                  <span className={`text-5xl sm:text-6xl lg:text-7xl font-mono font-bold tracking-tighter leading-none ${stats.safetyFactorValue >= 100 ? 'text-emerald-500' : stats.safetyFactorValue >= 50 ? 'text-amber-500' : 'text-rose-600'}`}>
                    {stats.safetyFactorValue.toFixed(0)}%
                  </span>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Coverage Index</span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-slate-500">{(stats.safetyFactorValue / 100).toFixed(1)} Months</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-12 lg:col-span-8 xl:col-span-9 bento-card rounded-[3rem] p-10 lg:p-14 min-h-[550px] flex flex-col">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 gap-6">
                <div className="min-w-0">
                  <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Capital Benchmarks</h2>
                  <p className="text-[11px] text-slate-400 font-bold uppercase mt-2 tracking-widest truncate">Immediate Obligations vs Available Assets</p>
                </div>
              </div>
              <div className="flex-grow w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={categoryChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700, fill: theme === 'dark' ? '#94a3b8' : '#64748b'}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 600, fill: theme === 'dark' ? '#475569' : '#94a3b8'}} tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`} />
                    <Tooltip cursor={{fill: theme === 'dark' ? 'rgba(30, 41, 59, 0.4)' : 'rgba(226, 232, 240, 0.4)'}} contentStyle={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '24px', padding: '20px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }} itemStyle={{fontSize: '13px', fontWeight: 'bold'}} formatter={(value: any) => [`₱${Number(value).toLocaleString()}`]} />
                    <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '20px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                    <Bar name="Current Amount" dataKey="amount" radius={[16, 16, 0, 0]} barSize={80}>
                      {categoryChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={theme === 'dark' ? '#6366f1' : '#4f46e5'} fillOpacity={0.9} />)}
                      <LabelList dataKey="amount" position="top" formatter={(val: number) => `₱${(val / 1000).toFixed(1)}k`} style={{ fontSize: '10px', fontWeight: 'bold', fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} />
                    </Bar>
                    <Line name="Risk Threshold" type="monotone" dataKey="avg" stroke="#f43f5e" strokeWidth={5} dot={{ r: 7, fill: '#f43f5e', strokeWidth: 4, stroke: theme === 'dark' ? '#0f172a' : '#fff' }} strokeDasharray="10 8" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="md:col-span-12 lg:col-span-4 xl:col-span-3 flex flex-col gap-6 lg:gap-10">
              <div className="bento-card rounded-[2.5rem] p-10 border-l-[10px] border-indigo-600 shadow-xl shadow-indigo-600/5 flex flex-col justify-center">
                <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] mb-4 block">Active Liquidity</span>
                <span className="text-3xl xl:text-4xl font-mono font-bold dark:text-white text-slate-900 break-all">₱{stats.liquidAssets.toLocaleString()}</span>
              </div>
              <div className="bento-card rounded-[2.5rem] p-10 border-l-[10px] border-rose-600 shadow-xl shadow-rose-600/5 flex flex-col justify-center">
                <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] mb-4 block text-rose-500">Debt Matrix</span>
                <div className="flex flex-col gap-2">
                   <span className="text-3xl xl:text-4xl font-mono font-bold dark:text-white text-slate-950 break-all">₱{stats.totalDebtBalanceValue.toLocaleString()}</span>
                   <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                      <span className="text-xl font-mono font-bold text-rose-500 shrink-0 mr-2">₱{stats.unpaidMonthlyCommitments.toLocaleString()}</span>
                      <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest shrink-0">Due</span>
                   </div>
                </div>
              </div>
              <div className="bento-card rounded-[2.5rem] p-10 border-l-[10px] border-emerald-600 shadow-xl shadow-emerald-500/5 flex flex-col justify-center">
                <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] mb-4 block">Vault Balance</span>
                <span className="text-3xl xl:text-4xl font-mono font-bold text-emerald-500 break-all">₱{stats.vaultSavings.toLocaleString()}</span>
              </div>
            </div>

            {overviewInsight && (
              <div className="md:col-span-12 bento-card rounded-[3rem] p-10 lg:p-14 bg-indigo-600 text-white shadow-2xl shadow-indigo-600/30">
                <div className="flex items-center space-x-3 mb-8">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-[0.4em]">AI Strategic Insight</h3>
                </div>
                <div className="prose prose-invert max-w-none text-indigo-50/90 font-medium leading-relaxed">
                  <div className="whitespace-pre-wrap">{overviewInsight}</div>
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === 'forecast' && (
          <section key="forecast" className="space-y-12 animate-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b dark:border-slate-900 border-slate-200 pb-8">
              <div className="space-y-2">
                <h2 className="text-xs font-black uppercase tracking-[0.4em] text-indigo-500">Monthly Performance Forecast</h2>
                <p className="text-2xl font-black dark:text-white text-slate-950">Next 6-Month Trajectory</p>
              </div>
              <div className="flex items-center space-x-4">
                 <div className="flex items-center space-x-2">
                   <div className="w-3 h-3 rounded bg-emerald-500"></div>
                   <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Projected Surplus</span>
                 </div>
                 <div className="flex items-center space-x-2">
                   <div className="w-3 h-3 rounded bg-rose-500"></div>
                   <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Operating Loss</span>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {detailedForecast.map((month) => (
                <div key={month.id} className="bento-card rounded-[3rem] p-8 lg:p-10 flex flex-col relative overflow-hidden group">
                  <div className={`absolute top-0 right-0 w-40 h-40 blur-[80px] opacity-10 ${month.net >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                  
                  <div className="flex justify-between items-center mb-10">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">{month.name}</span>
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${month.net >= 0 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                      {month.net >= 0 ? 'Cash Positive' : 'Cash Burn'}
                    </span>
                  </div>

                  <div className="space-y-6 mb-10">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Expected In</span>
                      <span className="font-mono text-base font-bold text-emerald-500">+₱{month.inflow.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Projected Out</span>
                      <span className="font-mono text-base font-bold text-rose-500">-₱{month.outflow.toLocaleString()}</span>
                    </div>
                    <div className={`flex justify-between items-center pt-4 border-t ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
                      <span className="text-xs font-black uppercase tracking-widest dark:text-slate-300 text-slate-600">Net Monthly</span>
                      <span className={`font-mono text-xl font-black ${month.net >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {month.net >= 0 ? '+' : ''}₱{month.net.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className={`mt-auto p-6 rounded-2xl ${theme === 'dark' ? 'bg-slate-900/40' : 'bg-slate-100/40'} border ${theme === 'dark' ? 'border-slate-800/50' : 'border-slate-200/50'}`}>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Projected End Balance</span>
                    <span className="text-2xl font-mono font-bold dark:text-white text-slate-900 leading-none">
                      ₱{month.balance.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'prediction' && (
          <section key="prediction" className="space-y-10 animate-in overflow-x-hidden">
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 bento-card rounded-[2.5rem] p-10 lg:p-14 min-h-[550px] flex flex-col">
                  <div className="flex justify-between items-center mb-10">
                    <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 truncate">90-Day Path</h2>
                    <span className="text-[10px] font-mono font-bold px-4 py-1.5 bg-indigo-500/10 text-indigo-500 rounded-full shrink-0 border border-indigo-500/20 uppercase tracking-widest ml-2">Prediction</span>
                  </div>
                  <div className="flex-grow w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={predictionData}>
                        <defs>
                          <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 800, fill: theme === 'dark' ? '#64748b' : '#94a3b8'}} />
                        <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '24px' }} formatter={(val: any) => [`₱${Number(val).toLocaleString()}`, 'Balance']}/>
                        <Area type="monotone" dataKey="balance" stroke="#8b5cf6" strokeWidth={5} fill="url(#colorForecast)" />
                        <Line type="monotone" dataKey="balance" stroke="#6366f1" strokeWidth={3} dot={{r: 6, fill: '#6366f1', strokeWidth: 3, stroke: theme === 'dark' ? '#0f172a' : '#fff'}} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="lg:col-span-4 flex flex-col gap-8 lg:gap-10">
                   <div className="bento-card rounded-[2.5rem] p-10 dark:bg-slate-900 bg-white border border-slate-200 dark:border-slate-800 flex flex-col">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400 mb-8 truncate">Efficiency</h3>
                      <div className="space-y-8">
                        <div>
                          <div className="flex justify-between text-xs font-bold mb-3 uppercase tracking-[0.2em] truncate">
                            <span>Savings</span>
                            <span className="text-emerald-500 ml-2">{stats.savingsRate.toFixed(1)}%</span>
                          </div>
                          <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 transition-all duration-1000 ease-out" style={{width: `${Math.min(100, stats.savingsRate)}%`}}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs font-bold mb-3 uppercase tracking-[0.2em] truncate">
                            <span>Liability</span>
                            <span className="text-indigo-500 ml-2">{stats.liquidAssets > 0 ? ((stats.totalMonthlyCommitments / stats.liquidAssets) * 100).toFixed(1) : 0}%</span>
                          </div>
                          <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 transition-all duration-1000 ease-out" style={{width: `${Math.min(100, stats.liquidAssets > 0 ? (stats.totalMonthlyCommitments / stats.liquidAssets) * 100 : 0)}%`}}></div>
                          </div>
                        </div>
                      </div>
                   </div>
                   <div className={`bento-card rounded-[2.5rem] p-10 border-l-[12px] ${stats.netMonthlyCashFlow >= 0 ? 'border-emerald-600' : 'border-rose-600'} flex flex-col justify-center`}>
                      <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400 mb-6">Velocity</h3>
                      <span className={`text-4xl xl:text-5xl font-mono font-bold ${stats.netMonthlyCashFlow >= 0 ? 'text-emerald-500' : 'text-rose-500'} break-all`}>
                        ₱{stats.netMonthlyCashFlow.toLocaleString()}
                      </span>
                   </div>
                </div>
             </div>
          </section>
        )}

        {activeTab === 'assets' && (
          <div key="assets" className="space-y-8 animate-in overflow-x-hidden">
            <div className="flex items-center space-x-4 px-3"><div className="w-2 h-7 bg-emerald-500 rounded-full"></div><h3 className="text-base font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em]">Capital Pools</h3></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 overflow-x-hidden">
              <FinancialCard title="Liquid Cash" totalLabel="Available" entries={data.accountBalances} accentColor="border-indigo-600" onAdd={(l, a) => addEntry('accountBalances', l, a)} onDelete={(id) => deleteEntry('accountBalances', id)} onUpdateEntry={updateEntry} />
              <FinancialCard title="Vault Savings" totalLabel="Stashed" entries={data.savingsAccounts} accentColor="border-emerald-500" onAdd={(l, a) => addEntry('savingsAccounts', l, a)} onDelete={(id) => deleteEntry('savingsAccounts', id)} onUpdateEntry={updateEntry} />
              <FinancialCard 
                title="Revenue" 
                totalLabel="Unpaid" 
                entries={data.receivables} 
                accentColor="border-amber-500" 
                hasStatus 
                onAdd={(l, a) => addEntry('receivables', l, a)} 
                onDelete={(id) => deleteEntry('receivables', id)} 
                onUpdateStatus={(id, s) => updateStatus('receivables', id, s)} 
                onUpdateEntry={updateEntry}
                customTotal={stats.unpaidReceivables}
                secondaryTotal={stats.totalReceivables}
                secondaryTotalLabel="Overall"
              />
            </div>
          </div>
        )}

        {activeTab === 'obligations' && (
          <div key="obligations" className="space-y-8 animate-in overflow-x-hidden">
            <div className="flex items-center space-x-4 px-3"><div className="w-2 h-7 bg-rose-500 rounded-full"></div><h3 className="text-base font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em]">Monthly Commitments</h3></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8 overflow-x-hidden">
              <FinancialCard title="Loans & Debt" totalLabel="Unpaid" entries={data.loans} accentColor="border-rose-600" isDebt hasStatus onAdd={(l, a, t) => addEntry('loans', l, a, t)} onDelete={(id) => deleteEntry('loans', id)} onUpdateStatus={(id, s) => updateStatus('loans', id, s)} onUpdateEntry={(id, l, a, t) => updateEntry(id, l, a, t)} secondaryTotal={stats.categoryTotals.loans} secondaryTotalLabel="Overall" />
              <FinancialCard title="Utilities" totalLabel="Unpaid" entries={data.utilities} accentColor="border-sky-500" hasStatus onAdd={(l, a) => addEntry('utilities', l, a)} onDelete={(id) => deleteEntry('utilities', id)} onUpdateStatus={(id, s) => updateStatus('utilities', id, s)} onUpdateEntry={updateEntry} secondaryTotal={stats.categoryTotals.utilities} secondaryTotalLabel="Overall" />
              <FinancialCard title="Mandatory" totalLabel="Unpaid" entries={data.mandatories} accentColor="border-slate-500" hasStatus onAdd={(l, a) => addEntry('mandatories', l, a)} onDelete={(id) => deleteEntry('mandatories', id)} onUpdateStatus={(id, s) => updateStatus('mandatories', id, s)} onUpdateEntry={updateEntry} secondaryTotal={stats.categoryTotals.mandatories} secondaryTotalLabel="Overall" />
              <FinancialCard title="Subscriptions" totalLabel="Unpaid" entries={data.subscriptions} accentColor="border-red-600" hasStatus onAdd={(l, a) => addEntry('subscriptions', l, a)} onDelete={(id) => deleteEntry('subscriptions', id)} onUpdateStatus={(id, s) => updateStatus('subscriptions', id, s)} onUpdateEntry={updateEntry} secondaryTotal={stats.categoryTotals.subscriptions} secondaryTotalLabel="Overall" />
              <FinancialCard title="Plans" totalLabel="Unpaid" entries={data.plans} accentColor="border-indigo-400" hasStatus onAdd={(l, a) => addEntry('plans', l, a)} onDelete={(id) => deleteEntry('plans', id)} onUpdateStatus={(id, s) => updateStatus('plans', id, s)} onUpdateEntry={updateEntry} secondaryTotal={stats.categoryTotals.plans} secondaryTotalLabel="Overall" />
              <FinancialCard title="Savings Goals" totalLabel="Unpaid" entries={data.savingsContribution} accentColor="border-emerald-400" hasStatus onAdd={(l, a) => addEntry('savingsContribution', l, a)} onDelete={(id) => deleteEntry('savingsContribution', id)} onUpdateStatus={(id, s) => updateStatus('savingsContribution', id, s)} onUpdateEntry={updateEntry} secondaryTotal={stats.categoryTotals.savings} secondaryTotalLabel="Overall" />
              <FinancialCard title="Other" totalLabel="Unpaid" entries={data.otherExpenses} accentColor="border-amber-400" hasStatus onAdd={(l, a) => addEntry('otherExpenses', l, a)} onDelete={(id) => deleteEntry('otherExpenses', id)} onUpdateStatus={(id, s) => updateStatus('otherExpenses', id, s)} onUpdateEntry={updateEntry} secondaryTotal={stats.categoryTotals.expenses} secondaryTotalLabel="Overall" />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
