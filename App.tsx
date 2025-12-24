
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FinancialEntry, DashboardData, TransactionStatus } from './types';
import FinancialCard from './components/FinancialCard';
import { getFinancialInsights, InsightView } from './services/geminiService';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Area, Cell } from 'recharts';

type TabType = 'overview' | 'assets' | 'obligations' | 'prediction';
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
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-3 bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white text-[11px] rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 shadow-2xl z-[100] border border-slate-700/50 transform translate-y-2 group-hover:translate-y-0">
      <div className="flex items-center space-x-2 mb-2 border-b border-slate-700/50 pb-2">
        <svg className="w-3.5 h-3.5 text-indigo-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path></svg>
        <span className="uppercase text-indigo-300 font-bold tracking-widest text-[9px]">Computation Logic</span>
      </div>
      <p className="leading-relaxed font-medium text-slate-200">{formula}</p>
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
    { id: '7', label: 'Credit Card (Main)', amount: 12000, status: TransactionStatus.UNPAID },
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
  const [predictionInsight, setPredictionInsight] = useState<string>('');
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);

  useEffect(() => {
    localStorage.setItem('fintrack-data', JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    document.documentElement.className = theme;
    localStorage.setItem('fintrack-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  const generateId = () => Math.random().toString(36).substr(2, 9);

  const calculateTotal = (entries: FinancialEntry[]) => entries.reduce((a, b) => a + b.amount, 0);

  const stats = useMemo(() => {
    const savings = calculateTotal(data.savingsAccounts);
    const contributions = calculateTotal(data.savingsContribution);
    const usable = calculateTotal(data.accountBalances);
    const allExpenses = [
      ...data.loans, ...data.subscriptions, ...data.savingsContribution,
      ...data.utilities, ...data.plans, ...data.mandatories, ...data.otherExpenses
    ];
    const totalExpenses = calculateTotal(allExpenses);
    const unpaidExpenses = calculateTotal(allExpenses.filter(e => e.status !== TransactionStatus.PAID));
    
    return {
      savings,
      contributions,
      totalSavings: savings + contributions,
      usable, 
      totalExpenses, 
      unpaidExpenses,
      remainingBalance: usable - totalExpenses,
    };
  }, [data]);

  const categoryChartData = useMemo(() => [
    { name: 'Funds', amount: stats.usable, avg: stats.usable * 0.92 },
    { name: 'Due', amount: stats.unpaidExpenses, avg: stats.unpaidExpenses * 1.15 },
    { name: 'Savings', amount: stats.savings, avg: stats.savings * 0.85 },
    { name: 'Target', amount: stats.totalExpenses, avg: stats.totalExpenses * 1.05 },
  ], [stats]);

  const handleKeySelection = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
      return true;
    }
    return false;
  };

  const fetchInsights = useCallback(async (view: InsightView) => {
    setIsLoadingInsight(true);
    try {
      if (window.aistudio && !(await window.aistudio.hasSelectedApiKey()) && !process.env.API_KEY) {
        await handleKeySelection();
      }

      const insight = await getFinancialInsights(data, view);
      if (view === 'overview') setOverviewInsight(insight);
      else setPredictionInsight(insight);
    } catch (e: any) {
      console.error("Fetch Insight Error:", e);
      let errorMsg = "AI Analysis failed to load.";
      
      if (e.message === "API_KEY_MISSING" || e.message === "MODEL_NOT_FOUND") {
        errorMsg = "Please connect your Gemini API Key to use AI features.";
        await handleKeySelection();
      } else {
        errorMsg = e.message || errorMsg;
      }
      
      if (view === 'overview') setOverviewInsight(errorMsg);
      else setPredictionInsight(errorMsg);
    } finally {
      setIsLoadingInsight(false);
    }
  }, [data]);

  useEffect(() => {
    if (activeTab === 'overview' && !overviewInsight) {
      fetchInsights('overview');
    } else if (activeTab === 'prediction' && !predictionInsight) {
      fetchInsights('prediction');
    }
  }, [activeTab, fetchInsights]);

  const addEntry = (section: keyof DashboardData, label: string, amount: number) => {
    const newEntry: FinancialEntry = { id: generateId(), label, amount, status: TransactionStatus.UNPAID };
    setData(prev => ({ ...prev, [section]: [...prev[section], newEntry] }));
  };

  const deleteEntry = (section: keyof DashboardData, id: string) => {
    setData(prev => ({ ...prev, [section]: prev[section].filter(e => e.id !== id) }));
  };

  const updateStatus = (section: keyof DashboardData, id: string, status: TransactionStatus) => {
    setData(prev => ({ ...prev, [section]: prev[section].map(e => e.id === id ? { ...e, status } : e) }));
  };

  const updateEntry = (id: string, label: string, amount: number) => {
    setData(prev => {
      const newData = { ...prev };
      (Object.keys(newData) as Array<keyof DashboardData>).forEach(section => {
        newData[section] = (newData[section] as FinancialEntry[]).map(e => e.id === id ? { ...e, label, amount } : e);
      });
      return newData;
    });
  };

  const predictionData = useMemo(() => {
    const monthlyNet = stats.remainingBalance;
    const now = new Date();
    const months = [];
    for(let i=1; i<=3; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const name = date.toLocaleString('default', { month: 'short' });
      const balance = stats.usable + (monthlyNet * i);
      months.push({ name, balance, safety: Math.max(0, Math.min(100, (balance / (stats.totalExpenses || 1)) * 100)) });
    }
    return months;
  }, [stats]);

  const TABS: TabConfig[] = [
    { id: 'overview', label: 'Overview', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg> },
    { id: 'assets', label: 'Assets', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> },
    { id: 'obligations', label: 'Obligations', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg> },
    { id: 'prediction', label: 'Prediction', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> }
  ];

  return (
    <div className="min-h-screen transition-colors duration-300 dark:bg-slate-950 bg-slate-100 text-slate-900 dark:text-slate-200 font-sans selection:bg-indigo-500/30">
      <header className="px-4 md:px-6 py-4 flex flex-col md:flex-row justify-between items-stretch md:items-center border-b dark:border-slate-900 border-slate-200 sticky top-0 z-50 dark:bg-slate-950/80 bg-slate-100/80 backdrop-blur-md gap-4 transition-colors duration-300">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/40 shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
            </div>
            <div className="flex-grow">
              <h1 className="text-xl font-bold tracking-tight dark:text-white text-slate-900 leading-none">FinTrack Pro</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Intelligent Wealth Suite</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 md:hidden">
            <button 
              onClick={() => fetchInsights(activeTab === 'prediction' ? 'prediction' : 'overview')} 
              disabled={isLoadingInsight}
              className="p-2.5 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 disabled:opacity-50"
            >
              {isLoadingInsight ? <div className="animate-spin h-4 w-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full"></div> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>}
            </button>
            <button onClick={toggleTheme} className="p-2.5 rounded-xl dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 text-slate-500 dark:text-slate-400">
              {theme === 'dark' ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.95 16.95l.707.707M7.05 7.05l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z"></path></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>}
            </button>
          </div>
        </div>
        
        <div className="flex-grow flex items-center justify-center md:justify-end overflow-hidden">
          <nav className="flex flex-nowrap overflow-x-auto no-scrollbar dark:bg-slate-900/50 bg-white/50 p-1.5 rounded-2xl border dark:border-slate-800 border-slate-200 w-full md:w-auto transition-all duration-300 gap-1 min-w-0">
            {TABS.map((tab) => (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id)} 
                className={`flex items-center space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300 shrink-0 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800/50'}`}
              >
                <span className={`transition-transform duration-300 ${activeTab === tab.id ? 'scale-110' : 'scale-100 opacity-60'}`}>{tab.icon}</span>
                <span className="inline">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="hidden md:flex items-center space-x-3 shrink-0">
          <button 
            onClick={() => fetchInsights(activeTab === 'prediction' ? 'prediction' : 'overview')} 
            disabled={isLoadingInsight} 
            className="flex items-center space-x-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 px-4 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          >
            {isLoadingInsight ? <div className="animate-spin h-3 w-3 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full"></div> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>}
            <span className="hidden lg:inline">Refresh AI</span>
          </button>
          <button onClick={toggleTheme} className="p-2.5 rounded-xl dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-all active:scale-95">
            {theme === 'dark' ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.95 16.95l.707.707M7.05 7.05l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z"></path></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>}
          </button>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-8 pb-32">
        {activeTab === 'overview' && (
          <section key="overview" className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-in">
            {/* Core Health Metrics Row - PROMINENT AT TOP */}
            <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
              <div className={`bento-card rounded-[2rem] p-8 flex flex-col justify-center min-h-[180px] relative overflow-hidden group border-t-4 shadow-xl transition-all duration-500 ${stats.remainingBalance >= 0 ? 'border-emerald-600 shadow-emerald-500/10' : 'border-rose-600 shadow-rose-500/10'}`}>
                <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] group-hover:blur-[80px] transition-all duration-500 ${stats.remainingBalance >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}></div>
                <div className="flex items-center mb-4">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-[0.25em]">Net Cash Flow</span>
                  <InfoTooltip formula="Available Usable Funds - All Current Monthly Obligations (Loans, Subs, Bills, etc.)" />
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className={`text-4xl sm:text-5xl lg:text-6xl font-mono font-bold tracking-tighter transition-transform duration-500 group-hover:scale-[1.02] ${stats.remainingBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    ₱{stats.remainingBalance.toLocaleString()}
                  </span>
                  {stats.remainingBalance < 0 && <span className="text-rose-500 text-xs font-bold uppercase animate-pulse">Deficit</span>}
                </div>
              </div>

              <div className="bento-card rounded-[2rem] p-8 flex flex-col justify-center min-h-[180px] relative overflow-hidden group border-t-4 border-slate-500 shadow-xl shadow-slate-500/10">
                <div className="absolute top-0 right-0 w-32 h-32 bg-slate-500/10 blur-[60px] group-hover:bg-slate-500/20 transition-all duration-500"></div>
                <div className="flex items-center mb-4">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-[0.25em]">Total Outflow</span>
                  <InfoTooltip formula="Sum of all recorded expenses: Loans, Mandatory contributions, Utilities, Subscriptions, and Savings targets." />
                </div>
                <span className="text-4xl sm:text-5xl lg:text-6xl font-mono font-bold dark:text-white text-slate-900 tracking-tighter transition-transform duration-500 group-hover:scale-[1.02]">
                  ₱{stats.totalExpenses.toLocaleString()}
                </span>
              </div>

              <div className={`bento-card rounded-[2rem] p-8 flex flex-col justify-center min-h-[180px] relative overflow-hidden group border-t-4 shadow-xl transition-all duration-500 ${stats.usable / (stats.totalExpenses || 1) >= 1 ? 'border-indigo-600 shadow-indigo-500/10' : 'border-amber-500 shadow-amber-500/10'}`}>
                <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] group-hover:blur-[80px] transition-all duration-500 ${stats.usable / (stats.totalExpenses || 1) >= 1 ? 'bg-indigo-500/10' : 'bg-amber-500/10'}`}></div>
                <div className="flex items-center mb-4">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-[0.25em]">Safety Ratio</span>
                  <InfoTooltip formula="(Available Usable Funds / Total Monthly Expenses) * 100. Higher is better." />
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className={`text-4xl sm:text-5xl lg:text-6xl font-mono font-bold tracking-tighter transition-transform duration-500 group-hover:scale-[1.02] ${stats.usable / (stats.totalExpenses || 1) >= 1 ? 'text-indigo-600' : 'text-amber-500'}`}>
                    {Math.min(999, Math.round((stats.usable / (stats.totalExpenses || 1)) * 100))}%
                  </span>
                  <span className="text-slate-400 text-xs font-bold uppercase">Index</span>
                </div>
              </div>
            </div>

            {/* Benchmark Chart */}
            <div className="md:col-span-12 lg:col-span-8 bento-card rounded-3xl p-6 min-h-[400px] flex flex-col">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">Category Analysis</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Comparing Current Period to 3-Month Historical Average</p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1.5">
                    <div className="w-3 h-3 bg-indigo-500 rounded-sm"></div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase">Current</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <div className="w-3 h-3 border-t-2 border-rose-500"></div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase">3M Benchmark</span>
                  </div>
                </div>
              </div>
              <div className="flex-grow w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={categoryChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: theme === 'dark' ? '#475569' : '#94a3b8'}} />
                    <Tooltip 
                      cursor={{fill: 'transparent'}}
                      contentStyle={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', border: 'none', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}
                      formatter={(value: any, name: string) => [
                        `₱${Number(value).toLocaleString()}`, 
                        name === 'amount' ? 'Current' : '3M Average'
                      ]}
                    />
                    <Bar dataKey="amount" radius={[8, 8, 0, 0]} barSize={48}>
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={theme === 'dark' ? '#6366f1' : '#4f46e5'} fillOpacity={0.8} />
                      ))}
                    </Bar>
                    <Line type="monotone" dataKey="avg" stroke="#f43f5e" strokeWidth={3} dot={{ r: 5, fill: '#f43f5e', strokeWidth: 2, stroke: '#fff' }} strokeDasharray="6 4" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="md:col-span-12 lg:col-span-4 space-y-6">
              <div className="bento-card rounded-3xl p-6 dark:bg-indigo-950/20 bg-indigo-50/20 backdrop-blur-2xl relative overflow-hidden h-full flex flex-col border border-indigo-500/20">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-6 flex items-center justify-between">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    Strategic Advisor
                  </div>
                  {!isLoadingInsight && <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>}
                </h2>
                <div className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 font-medium overflow-y-auto no-scrollbar flex-grow pr-2">
                  {isLoadingInsight && (!overviewInsight || overviewInsight.includes("FAILED")) ? (
                     <div className="space-y-4 animate-pulse">
                        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-full"></div>
                        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-5/6"></div>
                        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-4/6"></div>
                        <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded w-full mt-4"></div>
                     </div>
                  ) : (
                    <div className="prose dark:prose-invert prose-slate prose-sm max-w-none">
                      {overviewInsight || "Insights will appear here shortly..."}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Secondary metrics Row */}
            <div className="md:col-span-4 bento-card rounded-2xl p-6 flex flex-col justify-center min-h-[100px] group border-l-2 border-indigo-500/30">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Liquid Assets</span>
              <span className="text-2xl font-mono font-bold dark:text-white text-slate-900">₱{stats.usable.toLocaleString()}</span>
            </div>
            
            <div className="md:col-span-4 bento-card rounded-2xl p-6 flex flex-col justify-center min-h-[100px] group border-l-2 border-rose-500/30">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Active Debt</span>
              <span className="text-2xl font-mono font-bold text-rose-500">₱{stats.unpaidExpenses.toLocaleString()}</span>
            </div>

            <div className="md:col-span-4 bento-card rounded-2xl p-6 flex flex-col justify-center min-h-[100px] group border-l-2 border-emerald-500/30">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Managed Savings</span>
              <span className="text-2xl font-mono font-bold text-emerald-500">₱{stats.totalSavings.toLocaleString()}</span>
            </div>
          </section>
        )}

        {activeTab === 'prediction' && (
          <section key="prediction" className="space-y-8 animate-in">
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 bento-card rounded-3xl p-6 min-h-[400px] flex flex-col">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-6">90-Day Liquidity Forecast</h2>
                  <div className="flex-grow w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={predictionData}>
                        <defs>
                          <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: theme === 'dark' ? '#475569' : '#94a3b8'}} />
                        <Tooltip cursor={{stroke: '#8b5cf6'}} contentStyle={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', border: 'none', borderRadius: '12px' }} formatter={(val: any) => [`₱${Number(val).toLocaleString()}`, 'Forecast']}/>
                        <Area type="monotone" dataKey="balance" stroke="#8b5cf6" strokeWidth={3} fill="url(#colorForecast)" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="lg:col-span-4 bento-card rounded-3xl p-6 dark:bg-indigo-950/20 bg-indigo-50/50 flex flex-col">
                   <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-6 flex items-center">
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                      AI Prediction Deep-Dive
                   </h3>
                   <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 h-full overflow-y-auto pr-2 no-scrollbar">
                     {isLoadingInsight && (!predictionInsight || predictionInsight.includes("FAILED")) ? (
                       <div className="space-y-4 animate-pulse">
                          <div className="h-3 bg-indigo-200 dark:bg-indigo-900/50 rounded w-full"></div>
                          <div className="h-3 bg-indigo-200 dark:bg-indigo-900/50 rounded w-5/6"></div>
                          <div className="h-3 bg-indigo-200 dark:bg-indigo-900/50 rounded w-4/6"></div>
                          <div className="h-20 bg-indigo-200 dark:bg-indigo-900/50 rounded w-full"></div>
                       </div>
                     ) : (
                       <div className="prose dark:prose-invert prose-slate prose-sm max-w-none">
                         {predictionInsight || "Analyzing trajectory..."}
                       </div>
                     )}
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {predictionData.map((month, idx) => (
                 <div key={idx} className="bento-card rounded-2xl p-6 border-t-4 border-indigo-500/50">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Month {idx + 1} Target</div>
                    <div className="text-xl font-bold dark:text-white text-slate-900 mb-1">{month.name} Forecast</div>
                    <div className="text-2xl font-mono font-bold text-indigo-600 dark:text-indigo-400">₱{month.balance.toLocaleString()}</div>
                    <div className="mt-4 flex items-center space-x-2">
                       <div className="flex-grow h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500" style={{width: `${month.safety}%`}}></div>
                       </div>
                       <span className="text-[10px] font-bold text-slate-500">{Math.round(month.safety)}% Resilience</span>
                    </div>
                 </div>
               ))}
             </div>
          </section>
        )}

        {activeTab === 'assets' && (
          <div key="assets" className="space-y-6 animate-in">
            <div className="flex items-center space-x-3 px-2"><div className="w-1.5 h-5 bg-emerald-500 rounded-full"></div><h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Core Assets & Liquidity</h3></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FinancialCard title="Cash Reserves" totalLabel="Available" entries={data.accountBalances} accentColor="border-indigo-600" onAdd={(l, a) => addEntry('accountBalances', l, a)} onDelete={(id) => deleteEntry('accountBalances', id)} onUpdateEntry={updateEntry} />
              <FinancialCard title="Locked Savings" totalLabel="Balance" entries={data.savingsAccounts} accentColor="border-emerald-500" onAdd={(l, a) => addEntry('savingsAccounts', l, a)} onDelete={(id) => deleteEntry('savingsAccounts', id)} onUpdateEntry={updateEntry} />
              <FinancialCard title="Receivables" totalLabel="Incoming" entries={data.receivables} accentColor="border-amber-500" hasStatus onAdd={(l, a) => addEntry('receivables', l, a)} onDelete={(id) => deleteEntry('receivables', id)} onUpdateStatus={(id, s) => updateStatus('receivables', id, s)} onUpdateEntry={updateEntry} />
            </div>
          </div>
        )}

        {activeTab === 'obligations' && (
          <div key="obligations" className="space-y-6 animate-in">
            <div className="flex items-center space-x-3 px-2"><div className="w-1.5 h-5 bg-rose-500 rounded-full"></div><h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Ongoing Obligations</h3></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <FinancialCard title="Debt & Loans" totalLabel="Owed" entries={data.loans} accentColor="border-rose-600" hasStatus onAdd={(l, a) => addEntry('loans', l, a)} onDelete={(id) => deleteEntry('loans', id)} onUpdateStatus={(id, s) => updateStatus('loans', id, s)} onUpdateEntry={updateEntry} />
              <FinancialCard title="Mandatory" totalLabel="Due" entries={data.mandatories} accentColor="border-slate-400" hasStatus onAdd={(l, a) => addEntry('mandatories', l, a)} onDelete={(id) => deleteEntry('mandatories', id)} onUpdateStatus={(id, s) => updateStatus('mandatories', id, s)} onUpdateEntry={updateEntry} />
              <FinancialCard title="Utilities" totalLabel="Billed" entries={data.utilities} accentColor="border-sky-500" hasStatus onAdd={(l, a) => addEntry('utilities', l, a)} onDelete={(id) => deleteEntry('utilities', id)} onUpdateStatus={(id, s) => updateStatus('utilities', id, s)} onUpdateEntry={updateEntry} />
              <FinancialCard title="Subs & Recur" totalLabel="Month" entries={data.subscriptions} accentColor="border-red-600" hasStatus onAdd={(l, a) => addEntry('subscriptions', l, a)} onDelete={(id) => deleteEntry('subscriptions', id)} onUpdateStatus={(id, s) => updateStatus('subscriptions', id, s)} onUpdateEntry={updateEntry} />
            </div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl px-4 pointer-events-none md:block hidden opacity-60">
        <div className="dark:bg-slate-900/60 bg-white/60 backdrop-blur-xl border dark:border-slate-700/50 border-slate-200/60 p-3 rounded-2xl shadow-2xl flex items-center justify-center gap-4 ring-1 ring-white/5 transition-all">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center">
            <svg className="w-3 h-3 mr-2 text-indigo-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"></path></svg>
            FinTrack Intelligence Hub v2.7
          </span>
        </div>
      </footer>
    </div>
  );
};

export default App;
