
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
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-72 p-4 bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-xl text-white text-xs rounded-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 shadow-2xl z-[100] border border-slate-700/50 transform translate-y-2 group-hover:translate-y-0 leading-relaxed">
      <div className="flex items-center space-x-2 mb-2.5 border-b border-slate-700/50 pb-2">
        <svg className="w-4 h-4 text-indigo-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path></svg>
        <span className="uppercase text-indigo-300 font-extrabold tracking-[0.15em] text-[10px]">Financial Calculation</span>
      </div>
      <p className="font-medium text-slate-200">{formula}</p>
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
  const [isAiConnected, setIsAiConnected] = useState(false);
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

  const [predictionInsight, setPredictionInsight] = useState<string>('');
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);

  useEffect(() => {
    localStorage.setItem('fintrack-data', JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    document.documentElement.className = theme;
    localStorage.setItem('fintrack-theme', theme);
  }, [theme]);

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
      setIsAiConnected(true);
      return true;
    }
    return false;
  };

  const fetchInsights = useCallback(async (view: InsightView, isRetry = false) => {
    setIsLoadingInsight(true);
    try {
      const insight = await getFinancialInsights(data, view);
      if (view === 'prediction') setPredictionInsight(insight);
      setIsAiConnected(true);
    } catch (e: any) {
      if ((e.message === "API_KEY_MISSING" || e.message === "MODEL_NOT_FOUND") && !isRetry) {
        setIsAiConnected(false);
        const success = await handleKeySelection();
        if (success) {
          fetchInsights(view, true);
          return;
        }
      }
      const errorMsg = "AI features require an active Gemini API connection.";
      if (view === 'prediction') setPredictionInsight(errorMsg);
    } finally {
      setIsLoadingInsight(false);
    }
  }, [data]);

  useEffect(() => {
    if (activeTab === 'prediction' && !predictionInsight) fetchInsights('prediction');
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
    { id: 'overview', label: 'Overview', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg> },
    { id: 'assets', label: 'Assets', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> },
    { id: 'obligations', label: 'Obligations', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg> },
    { id: 'prediction', label: 'Prediction', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> }
  ];

  return (
    <div className="min-h-screen dark:bg-slate-950 bg-slate-50 text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-500/30">
      <header className="px-6 py-5 flex flex-col md:flex-row justify-between items-center border-b dark:border-slate-900 border-slate-200 sticky top-0 z-50 dark:bg-slate-950/80 bg-white/90 backdrop-blur-xl gap-4">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-600/30 shrink-0">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight dark:text-white text-slate-900 leading-none">FinTrack Pro</h1>
              <div className="flex items-center mt-2 space-x-2">
                <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-[0.2em] leading-none">Wealth Intelligence</span>
                <span className={`h-2 w-2 rounded-full ${isAiConnected ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></span>
              </div>
            </div>
          </div>
        </div>
        
        <nav className="flex flex-nowrap overflow-x-auto no-scrollbar dark:bg-slate-900/60 bg-slate-100/60 p-1.5 rounded-2xl border dark:border-slate-800 border-slate-200 w-full md:w-auto gap-1">
          {TABS.map((tab) => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)} 
              className={`flex items-center space-x-2.5 px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-200 shrink-0 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              <span className={`transition-transform duration-300 ${activeTab === tab.id ? 'scale-110' : 'opacity-60'}`}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="hidden md:flex items-center space-x-4">
          {!isAiConnected && (
            <button 
              onClick={handleKeySelection}
              className="flex items-center space-x-2 bg-amber-500 hover:bg-amber-600 text-white px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-xl shadow-amber-500/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
              <span>Connect AI</span>
            </button>
          )}
          <button 
            onClick={() => fetchInsights(activeTab === 'prediction' ? 'prediction' : 'overview')} 
            disabled={isLoadingInsight} 
            className="flex items-center space-x-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50"
          >
            {isLoadingInsight ? <div className="animate-spin h-4 w-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full"></div> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>}
          </button>
          <button onClick={toggleTheme} className="p-3 rounded-xl dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 text-slate-500 hover:text-indigo-600 transition-all active:scale-95">
            {theme === 'dark' ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.95 16.95l.707.707M7.05 7.05l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z"></path></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>}
          </button>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto p-6 md:p-8 space-y-10 pb-32">
        {activeTab === 'overview' && (
          <section key="overview" className="grid grid-cols-1 md:grid-cols-12 gap-8 animate-in">
            {/* Health Metrics Summary */}
            <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className={`bento-card rounded-[2.5rem] p-10 flex flex-col justify-center min-h-[220px] relative overflow-hidden border-t-8 transition-all duration-500 ${stats.remainingBalance >= 0 ? 'border-emerald-600 shadow-emerald-500/10' : 'border-rose-600 shadow-rose-500/10'}`}>
                <div className={`absolute top-0 right-0 w-48 h-48 blur-[80px] opacity-20 ${stats.remainingBalance >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                <div className="flex items-center mb-6">
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-[0.3em]">Monthly Net Cash</span>
                  <InfoTooltip formula="Total Usable Funds minus all monthly expenses." />
                </div>
                <div className="flex items-baseline space-x-3">
                  <span className={`text-5xl sm:text-6xl lg:text-7xl font-mono font-bold tracking-tighter ${stats.remainingBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    ₱{stats.remainingBalance.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="bento-card rounded-[2.5rem] p-10 flex flex-col justify-center min-h-[220px] relative overflow-hidden border-t-8 border-slate-400">
                <div className="absolute top-0 right-0 w-48 h-48 bg-slate-400 opacity-10 blur-[80px]"></div>
                <div className="flex items-center mb-6">
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-[0.3em]">Total Liabilities</span>
                  <InfoTooltip formula="Sum of all monthly outgoing payments." />
                </div>
                <span className="text-5xl sm:text-6xl lg:text-7xl font-mono font-bold dark:text-white text-slate-900 tracking-tighter">
                  ₱{stats.totalExpenses.toLocaleString()}
                </span>
              </div>

              <div className={`bento-card rounded-[2.5rem] p-10 flex flex-col justify-center min-h-[220px] relative overflow-hidden border-t-8 ${stats.usable / (stats.totalExpenses || 1) >= 1 ? 'border-indigo-600 shadow-indigo-500/10' : 'border-amber-500 shadow-amber-500/10'}`}>
                <div className={`absolute top-0 right-0 w-48 h-48 blur-[80px] opacity-20 ${stats.usable / (stats.totalExpenses || 1) >= 1 ? 'bg-indigo-500' : 'bg-amber-500'}`}></div>
                <div className="flex items-center mb-6">
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-[0.3em]">Resilience Score</span>
                  <InfoTooltip formula="(Usable Cash / Total Monthly Obligations) × 100." />
                </div>
                <div className="flex items-baseline space-x-3">
                  <span className={`text-5xl sm:text-6xl lg:text-7xl font-mono font-bold tracking-tighter ${stats.usable / (stats.totalExpenses || 1) >= 1 ? 'text-indigo-600' : 'text-amber-500'}`}>
                    {Math.min(999, Math.round((stats.usable / (stats.totalExpenses || 1)) * 100))}%
                  </span>
                </div>
              </div>
            </div>

            {/* Analysis Chart and Secondary Stats Row Integrated */}
            <div className="md:col-span-12 lg:col-span-7 bento-card rounded-[2rem] p-8 min-h-[480px] flex flex-col">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Benchmark Insights</h2>
                  <p className="text-[11px] text-slate-400 font-bold uppercase mt-2">Comparison of Assets vs Obligation Targets</p>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-3.5 h-3.5 bg-indigo-500 rounded-sm"></div>
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Present</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3.5 h-3.5 border-t-2 border-rose-500"></div>
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Benchmark</span>
                  </div>
                </div>
              </div>
              <div className="flex-grow w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={categoryChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 800, fill: theme === 'dark' ? '#64748b' : '#94a3b8'}} />
                    <YAxis hide />
                    <Tooltip 
                      cursor={{fill: 'transparent'}}
                      contentStyle={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '16px', padding: '12px' }}
                      itemStyle={{fontSize: '12px', fontWeight: 'bold'}}
                      formatter={(value: any) => [`₱${Number(value).toLocaleString()}`]}
                    />
                    <Bar dataKey="amount" radius={[12, 12, 0, 0]} barSize={56}>
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={theme === 'dark' ? '#6366f1' : '#4f46e5'} fillOpacity={0.9} />
                      ))}
                    </Bar>
                    <Line type="monotone" dataKey="avg" stroke="#f43f5e" strokeWidth={4} dot={{ r: 6, fill: '#f43f5e', strokeWidth: 3, stroke: theme === 'dark' ? '#0f172a' : '#fff' }} strokeDasharray="8 6" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="md:col-span-12 lg:col-span-5 flex flex-col gap-6">
              <div className="bento-card rounded-3xl p-8 flex flex-col justify-center flex-grow border-l-8 border-indigo-600/60 shadow-lg shadow-indigo-600/5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.25em]">Liquid Assets</span>
                  <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </div>
                </div>
                <span className="text-3xl lg:text-4xl font-mono font-bold dark:text-white text-slate-900 tracking-tight">₱{stats.usable.toLocaleString()}</span>
                <p className="text-[10px] text-slate-400 mt-3 font-bold uppercase tracking-widest">Immediate cash on hand</p>
              </div>

              <div className="bento-card rounded-3xl p-8 flex flex-col justify-center flex-grow border-l-8 border-rose-600/60 shadow-lg shadow-rose-600/5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.25em]">Active Debt</span>
                  <div className="w-8 h-8 bg-rose-500/10 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </div>
                </div>
                <span className="text-3xl lg:text-4xl font-mono font-bold text-rose-500 tracking-tight">₱{stats.unpaidExpenses.toLocaleString()}</span>
                <p className="text-[10px] text-slate-400 mt-3 font-bold uppercase tracking-widest">Pending monthly payments</p>
              </div>

              <div className="bento-card rounded-3xl p-8 flex flex-col justify-center flex-grow border-l-8 border-emerald-600/60 shadow-lg shadow-emerald-600/5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.25em]">Managed Savings</span>
                  <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                  </div>
                </div>
                <span className="text-3xl lg:text-4xl font-mono font-bold text-emerald-500 tracking-tight">₱{stats.totalSavings.toLocaleString()}</span>
                <p className="text-[10px] text-slate-400 mt-3 font-bold uppercase tracking-widest">Total wealth in safety accounts</p>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'prediction' && (
          <section key="prediction" className="space-y-10 animate-in">
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-7 bento-card rounded-[2rem] p-10 min-h-[480px] flex flex-col">
                  <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500 mb-8">90-Day Liquidity Forecast</h2>
                  <div className="flex-grow w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={predictionData}>
                        <defs>
                          <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 800, fill: theme === 'dark' ? '#64748b' : '#94a3b8'}} />
                        <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '16px' }} formatter={(val: any) => [`₱${Number(val).toLocaleString()}`, 'Projected Balance']}/>
                        <Area type="monotone" dataKey="balance" stroke="#8b5cf6" strokeWidth={4} fill="url(#colorForecast)" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="lg:col-span-5 bento-card rounded-[2rem] p-10 dark:bg-indigo-950/20 bg-indigo-50/50 border border-indigo-500/20 shadow-xl flex flex-col">
                   <h3 className="text-xs font-black uppercase tracking-[0.25em] text-indigo-600 dark:text-indigo-400 mb-10 flex items-center">
                      <svg className="w-6 h-6 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                      Trajectory Deep-Dive
                   </h3>
                   <div className="flex-grow overflow-y-auto no-scrollbar prose dark:prose-invert">
                     {isLoadingInsight ? (
                       <div className="space-y-6 animate-pulse">
                          <div className="h-4 bg-indigo-200 dark:bg-indigo-900/40 rounded w-full"></div>
                          <div className="h-4 bg-indigo-200 dark:bg-indigo-900/40 rounded w-5/6"></div>
                          <div className="h-24 bg-indigo-200/50 dark:bg-indigo-900/20 rounded-2xl w-full"></div>
                       </div>
                     ) : (
                       <div className="prose">
                         {predictionInsight || (
                           <div className="flex flex-col items-center justify-center py-10 text-center space-y-6">
                             <p className="text-slate-500 font-bold uppercase tracking-widest text-[11px]">Prediction Hub offline</p>
                             {!isAiConnected && (
                               <button onClick={handleKeySelection} className="text-xs font-black uppercase tracking-widest px-8 py-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/25">
                                 Connect Forecast Engine
                               </button>
                             )}
                           </div>
                         )}
                       </div>
                     )}
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               {predictionData.map((month, idx) => (
                 <div key={idx} className="bento-card rounded-[2rem] p-8 border-t-8 border-indigo-500/50">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Projected Goal: {month.name}</div>
                    <div className="text-3xl font-mono font-bold dark:text-white text-slate-900 mb-4">₱{month.balance.toLocaleString()}</div>
                    <div className="mt-6 flex items-center space-x-3">
                       <div className="flex-grow h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500" style={{width: `${month.safety}%`}}></div>
                       </div>
                       <span className="text-[11px] font-black text-indigo-500 uppercase tracking-widest">{Math.round(month.safety)}% Capacity</span>
                    </div>
                 </div>
               ))}
             </div>
          </section>
        )}

        {activeTab === 'assets' && (
          <div key="assets" className="space-y-8 animate-in">
            <div className="flex items-center space-x-4 px-3"><div className="w-2 h-7 bg-emerald-500 rounded-full"></div><h3 className="text-base font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em]">Capital & Reserves</h3></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FinancialCard title="Liquid Cash" totalLabel="Available" entries={data.accountBalances} accentColor="border-indigo-600" onAdd={(l, a) => addEntry('accountBalances', l, a)} onDelete={(id) => deleteEntry('accountBalances', id)} onUpdateEntry={updateEntry} />
              <FinancialCard title="Vault Savings" totalLabel="Total Balance" entries={data.savingsAccounts} accentColor="border-emerald-500" onAdd={(l, a) => addEntry('savingsAccounts', l, a)} onDelete={(id) => deleteEntry('savingsAccounts', id)} onUpdateEntry={updateEntry} />
              <FinancialCard title="Expected Cash" totalLabel="Total Incoming" entries={data.receivables} accentColor="border-amber-500" hasStatus onAdd={(l, a) => addEntry('receivables', l, a)} onDelete={(id) => deleteEntry('receivables', id)} onUpdateStatus={(id, s) => updateStatus('receivables', id, s)} onUpdateEntry={updateEntry} />
            </div>
          </div>
        )}

        {activeTab === 'obligations' && (
          <div key="obligations" className="space-y-8 animate-in">
            <div className="flex items-center space-x-4 px-3"><div className="w-2 h-7 bg-rose-500 rounded-full"></div><h3 className="text-base font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em]">Monthly Commitments</h3></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              <FinancialCard title="Debt Repayment" totalLabel="Total Owed" entries={data.loans} accentColor="border-rose-600" hasStatus onAdd={(l, a) => addEntry('loans', l, a)} onDelete={(id) => deleteEntry('loans', id)} onUpdateStatus={(id, s) => updateStatus('loans', id, s)} onUpdateEntry={updateEntry} />
              <FinancialCard title="Mandatory Costs" totalLabel="Total Due" entries={data.mandatories} accentColor="border-slate-500" hasStatus onAdd={(l, a) => addEntry('mandatories', l, a)} onDelete={(id) => deleteEntry('mandatories', id)} onUpdateStatus={(id, s) => updateStatus('mandatories', id, s)} onUpdateEntry={updateEntry} />
              <FinancialCard title="Essential Utilities" totalLabel="Monthly Cost" entries={data.utilities} accentColor="border-sky-500" hasStatus onAdd={(l, a) => addEntry('utilities', l, a)} onDelete={(id) => deleteEntry('utilities', id)} onUpdateStatus={(id, s) => updateStatus('utilities', id, s)} onUpdateEntry={updateEntry} />
              <FinancialCard title="Subscriptions" totalLabel="Monthly Total" entries={data.subscriptions} accentColor="border-red-600" hasStatus onAdd={(l, a) => addEntry('subscriptions', l, a)} onDelete={(id) => deleteEntry('subscriptions', id)} onUpdateStatus={(id, s) => updateStatus('subscriptions', id, s)} onUpdateEntry={updateEntry} />
            </div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-3rem)] max-w-lg px-4 pointer-events-none md:block hidden opacity-80">
        <div className="dark:bg-slate-900/70 bg-white/70 backdrop-blur-2xl border dark:border-slate-800 border-slate-200/60 p-4 rounded-[1.5rem] shadow-2xl flex items-center justify-center gap-4 ring-1 ring-white/10">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center">
            <svg className="w-4 h-4 mr-3 text-indigo-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"></path></svg>
            FinTrack Pro v2.9 Integrated Dashboard
          </span>
        </div>
      </footer>
    </div>
  );
};

export default App;
