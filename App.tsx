
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
    // Current Pools
    const liquidCash = calculateTotal(data.accountBalances);
    const receivables = calculateTotal(data.receivables);
    const vaultSavings = calculateTotal(data.savingsAccounts);

    // Monthly Commitment Flow
    const commitmentCategories = [
      data.loans, data.utilities, data.subscriptions, 
      data.mandatories, data.plans, data.otherExpenses, data.savingsContribution
    ];
    
    // Total of all monthly payables
    const totalMonthlyCommitments = commitmentCategories.reduce((acc, cat) => acc + calculateTotal(cat), 0);
    
    // Only those that are not marked as PAID
    const unpaidMonthlyCommitments = commitmentCategories.flat().filter(e => e.status !== TransactionStatus.PAID).reduce((acc, e) => acc + e.amount, 0);

    // Debt Matrix Logic (Long term balance)
    const totalDebtBalanceValue = data.loans.reduce((acc, e) => acc + (e.totalAmount !== undefined ? e.totalAmount : e.amount), 0);

    // Dynamic Calculations
    const liquidAssets = liquidCash + receivables;
    const netMonthlyCashFlow = liquidAssets - totalMonthlyCommitments;
    const deployableFunds = liquidAssets - unpaidMonthlyCommitments;
    const resilienceIndex = totalMonthlyCommitments > 0 ? (liquidCash / totalMonthlyCommitments) : 0;
    
    // Performance Ratios
    const savingsAllocation = calculateTotal(data.savingsContribution);
    const savingsRate = liquidAssets > 0 ? (savingsAllocation / liquidAssets) * 100 : 0;

    return {
      liquidCash,
      receivables,
      vaultSavings,
      liquidAssets,
      totalMonthlyCommitments,
      unpaidMonthlyCommitments,
      deployableFunds,
      netMonthlyCashFlow,
      resilienceIndex,
      savingsAllocation,
      savingsRate,
      totalDebtBalanceValue
    };
  }, [data]);

  const categoryChartData = useMemo(() => [
    { name: 'Current Cash', amount: stats.liquidCash, avg: stats.liquidCash * 0.95 },
    { name: 'Incoming', amount: stats.receivables, avg: stats.receivables * 1.1 },
    { name: 'Commitments', amount: stats.totalMonthlyCommitments, avg: stats.totalMonthlyCommitments * 1.05 },
    { name: 'Vault', amount: stats.vaultSavings, avg: stats.vaultSavings * 0.9 },
  ], [stats]);

  const fetchOverviewInsight = useCallback(async (isRetry = false) => {
    setIsLoadingInsight(true);
    try {
      const insight = await getFinancialInsights(data, 'overview');
      setOverviewInsight(insight);
      setIsAiConnected(true);
    } catch (e: any) {
      if ((e.message === "API_KEY_MISSING" || e.message === "MODEL_NOT_FOUND") && !isRetry) {
        setIsAiConnected(false);
      }
      setOverviewInsight("AI Strategy hub offline. View quantitative breakdown instead.");
    } finally {
      setIsLoadingInsight(false);
    }
  }, [data]);

  useEffect(() => {
    if (activeTab === 'overview' && !overviewInsight) fetchOverviewInsight();
  }, [activeTab, fetchOverviewInsight]);

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
    { id: 'overview', label: 'Overview', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg> },
    { id: 'assets', label: 'Assets', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> },
    { id: 'obligations', label: 'Obligations', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg> },
    { id: 'prediction', label: 'Prediction', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> }
  ];

  return (
    <div className="min-h-screen dark:bg-slate-950 bg-slate-50 text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      <header className="px-6 py-5 flex flex-col md:flex-row justify-between items-center border-b dark:border-slate-900 border-slate-200 sticky top-0 z-50 dark:bg-slate-950/80 bg-white/90 backdrop-blur-xl gap-4">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-600/30 shrink-0">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight dark:text-white text-slate-900 leading-none">FinTrack Pro</h1>
              <div className="flex items-center mt-2 space-x-2">
                <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-[0.2em] leading-none">Intelligence Suite</span>
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
          <button onClick={toggleTheme} className="p-3 rounded-xl dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 text-slate-500 hover:text-indigo-600 transition-all active:scale-95">
            {theme === 'dark' ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.95 16.95l.707.707M7.05 7.05l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z"></path></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>}
          </button>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto p-6 md:p-8 space-y-10 pb-32">
        {activeTab === 'overview' && (
          <section key="overview" className="grid grid-cols-1 md:grid-cols-12 gap-8 animate-in">
            {/* Health Pillars */}
            <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className={`bento-card rounded-[2.5rem] p-10 flex flex-col justify-center min-h-[220px] relative overflow-hidden border-t-8 transition-all duration-500 ${stats.deployableFunds >= 0 ? 'border-indigo-600 shadow-indigo-500/10' : 'border-rose-600 shadow-rose-500/10'}`}>
                <div className={`absolute top-0 right-0 w-48 h-48 blur-[80px] opacity-20 ${stats.deployableFunds >= 0 ? 'bg-indigo-500' : 'bg-rose-500'}`}></div>
                <div className="flex items-center mb-6">
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-[0.3em]">Deployable Funds</span>
                  <InfoTooltip formula="(Current Cash + Receivables) - Unpaid Monthly Commitments. Your actual spending capacity this month." />
                </div>
                <div className="flex items-baseline space-x-3">
                  <span className={`text-5xl sm:text-6xl lg:text-7xl font-mono font-bold tracking-tighter ${stats.deployableFunds >= 0 ? 'dark:text-white text-slate-900' : 'text-rose-600'}`}>
                    ₱{stats.deployableFunds.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="bento-card rounded-[2.5rem] p-10 flex flex-col justify-center min-h-[220px] relative overflow-hidden border-t-8 border-slate-400">
                <div className="absolute top-0 right-0 w-48 h-48 bg-slate-400 opacity-10 blur-[80px]"></div>
                <div className="flex items-center mb-6">
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-[0.3em]">Monthly Payable Debts</span>
                  <InfoTooltip formula="Sum of all Monthly Commitments (Loans, Utilities, Mandatories, Subs, Plans, Savings, and Other Expenses)." />
                </div>
                <div className="flex items-baseline space-x-3">
                  <span className="text-5xl sm:text-6xl lg:text-7xl font-mono font-bold dark:text-white text-slate-900 tracking-tighter">
                    ₱{stats.totalMonthlyCommitments.toLocaleString()}
                  </span>
                  <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest block">Requirement</span>
                </div>
              </div>

              <div className={`bento-card rounded-[2.5rem] p-10 flex flex-col justify-center min-h-[220px] relative overflow-hidden border-t-8 ${stats.resilienceIndex >= 1 ? 'border-emerald-600 shadow-emerald-500/10' : 'border-amber-500 shadow-amber-500/10'}`}>
                <div className={`absolute top-0 right-0 w-48 h-48 blur-[80px] opacity-20 ${stats.resilienceIndex >= 1 ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                <div className="flex items-center mb-6">
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-[0.3em]">Resilience Score</span>
                  <InfoTooltip formula="Cash on Hand / Total Monthly Commitments. Measures months of runway against all obligations." />
                </div>
                <div className="flex items-baseline space-x-3">
                  <span className={`text-5xl sm:text-6xl lg:text-7xl font-mono font-bold tracking-tighter ${stats.resilienceIndex >= 1 ? 'text-emerald-600' : 'text-amber-500'}`}>
                    {stats.resilienceIndex.toFixed(1)}
                  </span>
                  <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Runway</span>
                </div>
              </div>
            </div>

            {/* Visual Analytics */}
            <div className="md:col-span-12 lg:col-span-8 bento-card rounded-[2rem] p-8 min-h-[480px] flex flex-col">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Capital Benchmarks</h2>
                  <p className="text-[11px] text-slate-400 font-bold uppercase mt-2">Comparison of Liquidity vs Total Monthly Commitments</p>
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

            <div className="md:col-span-12 lg:col-span-4 flex flex-col gap-6">
              <div className="bento-card rounded-3xl p-8 border-l-8 border-indigo-600 shadow-xl shadow-indigo-600/5">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.25em] mb-4 block">Active Liquidity</span>
                <span className="text-3xl font-mono font-bold dark:text-white text-slate-900">₱{stats.liquidAssets.toLocaleString()}</span>
                <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-widest">Cash + Receivables</p>
              </div>

              <div className="bento-card rounded-3xl p-8 border-l-8 border-rose-600 shadow-xl shadow-rose-600/5">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.25em] mb-2 block text-rose-500">Debt Matrix</span>
                <div className="flex justify-between items-baseline mb-2">
                   <span className="text-3xl font-mono font-bold dark:text-white text-slate-900">₱{stats.totalDebtBalanceValue.toLocaleString()}</span>
                   <span className="text-[10px] font-black text-slate-400 uppercase">Grand Balance</span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-baseline">
                   <span className="text-xl font-mono font-bold text-rose-500">₱{stats.unpaidMonthlyCommitments.toLocaleString()}</span>
                   <span className="text-[10px] font-black text-rose-400 uppercase">Unpaid Commitments</span>
                </div>
              </div>

              <div className="bento-card rounded-3xl p-8 border-l-8 border-emerald-600 shadow-xl shadow-emerald-600/5">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.25em] mb-4 block">Vault Balance</span>
                <span className="text-3xl font-mono font-bold text-emerald-500">₱{stats.vaultSavings.toLocaleString()}</span>
                <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-widest">Untouchable capital</p>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'prediction' && (
          <section key="prediction" className="space-y-10 animate-in">
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 bento-card rounded-[2rem] p-10 min-h-[500px] flex flex-col">
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">90-Day Accumulation Path</h2>
                    <span className="text-[10px] font-mono font-bold px-3 py-1 bg-indigo-500/10 text-indigo-500 rounded-full">QUANTITATIVE MODEL</span>
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
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 800, fill: theme === 'dark' ? '#64748b' : '#94a3b8'}} />
                        <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '16px' }} formatter={(val: any) => [`₱${Number(val).toLocaleString()}`, 'Projected Reserves']}/>
                        <Area type="monotone" dataKey="balance" stroke="#8b5cf6" strokeWidth={4} fill="url(#colorForecast)" />
                        <Line type="monotone" dataKey="balance" stroke="#6366f1" strokeWidth={2} dot={{r: 4, fill: '#6366f1'}} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="lg:col-span-4 flex flex-col gap-8">
                   <div className="bento-card rounded-[2rem] p-8 dark:bg-slate-900 bg-white border border-slate-200 dark:border-slate-800 flex flex-col">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6">Efficiency Ratios</h3>
                      <div className="space-y-6">
                        <div>
                          <div className="flex justify-between text-xs font-bold mb-2 uppercase tracking-widest">
                            <span>Savings Allocation</span>
                            <span className="text-emerald-500">{stats.savingsRate.toFixed(1)}%</span>
                          </div>
                          <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 transition-all duration-1000" style={{width: `${Math.min(100, stats.savingsRate)}%`}}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs font-bold mb-2 uppercase tracking-widest">
                            <span>Liability Ratio</span>
                            <span className="text-indigo-500">{stats.liquidAssets > 0 ? ((stats.totalMonthlyCommitments / stats.liquidAssets) * 100).toFixed(1) : 0}%</span>
                          </div>
                          <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 transition-all duration-1000" style={{width: `${Math.min(100, stats.liquidAssets > 0 ? (stats.totalMonthlyCommitments / stats.liquidAssets) * 100 : 0)}%`}}></div>
                          </div>
                        </div>
                      </div>
                   </div>

                   <div className={`bento-card rounded-[2rem] p-8 border-l-8 ${stats.netMonthlyCashFlow >= 0 ? 'border-emerald-600' : 'border-rose-600'} flex flex-col`}>
                      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-4">Monthly Velocity</h3>
                      <span className={`text-4xl font-mono font-bold ${stats.netMonthlyCashFlow >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        ₱{stats.netMonthlyCashFlow.toLocaleString()}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-3 font-bold uppercase tracking-widest">
                        {stats.netMonthlyCashFlow >= 0 ? "Accumulating Wealth" : "Net Cash Drain"}
                      </p>
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               {predictionData.slice(1).map((month, idx) => (
                 <div key={idx} className="bento-card rounded-[2.5rem] p-10 border-t-8 border-indigo-500/50 shadow-2xl shadow-indigo-500/5">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Milestone: {month.name}</div>
                    <div className="text-4xl font-mono font-bold dark:text-white text-slate-900 mb-6">₱{month.balance.toLocaleString()}</div>
                    <div className="flex items-center space-x-3">
                       <div className="flex-grow h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500" style={{width: `${month.safety}%`}}></div>
                       </div>
                       <span className="text-[11px] font-black text-indigo-500 uppercase tracking-widest">{Math.round(month.safety)}% Coverage</span>
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-4">Projected Surplus vs Commitments</p>
                 </div>
               ))}
             </div>
          </section>
        )}

        {activeTab === 'assets' && (
          <div key="assets" className="space-y-8 animate-in">
            <div className="flex items-center space-x-4 px-3"><div className="w-2 h-7 bg-emerald-500 rounded-full"></div><h3 className="text-base font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em]">Capital Pools</h3></div>
            {/* Asset grid forced to wrap cleanly */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              <FinancialCard title="Liquid Cash" totalLabel="Available" entries={data.accountBalances} accentColor="border-indigo-600" onAdd={(l, a) => addEntry('accountBalances', l, a)} onDelete={(id) => deleteEntry('accountBalances', id)} onUpdateEntry={updateEntry} />
              <FinancialCard title="Vault Savings" totalLabel="Total Stashed" entries={data.savingsAccounts} accentColor="border-emerald-500" onAdd={(l, a) => addEntry('savingsAccounts', l, a)} onDelete={(id) => deleteEntry('savingsAccounts', id)} onUpdateEntry={updateEntry} />
              <FinancialCard title="Expected Revenue" totalLabel="Total Expected" entries={data.receivables} accentColor="border-amber-500" hasStatus onAdd={(l, a) => addEntry('receivables', l, a)} onDelete={(id) => deleteEntry('receivables', id)} onUpdateStatus={(id, s) => updateStatus('receivables', id, s)} onUpdateEntry={updateEntry} />
            </div>
          </div>
        )}

        {activeTab === 'obligations' && (
          <div key="obligations" className="space-y-8 animate-in">
            <div className="flex items-center space-x-4 px-3"><div className="w-2 h-7 bg-rose-500 rounded-full"></div><h3 className="text-base font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em]">Monthly Commitments</h3></div>
            {/* Obligation grid ensures auto width adjustment and wraps correctly to prevent horizontal scroll */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              <FinancialCard title="Loans & Debt" totalLabel="Monthly Payable" entries={data.loans} accentColor="border-rose-600" isDebt hasStatus onAdd={(l, a, t) => addEntry('loans', l, a, t)} onDelete={(id) => deleteEntry('loans', id)} onUpdateStatus={(id, s) => updateStatus('loans', id, s)} onUpdateEntry={(id, l, a, t) => updateEntry(id, l, a, t)} />
              <FinancialCard title="Utilities" totalLabel="Total Due" entries={data.utilities} accentColor="border-sky-500" hasStatus onAdd={(l, a) => addEntry('utilities', l, a)} onDelete={(id) => deleteEntry('utilities', id)} onUpdateStatus={(id, s) => updateStatus('utilities', id, s)} onUpdateEntry={updateEntry} />
              <FinancialCard title="Mandatory Costs" totalLabel="Tax/Health" entries={data.mandatories} accentColor="border-slate-500" hasStatus onAdd={(l, a) => addEntry('mandatories', l, a)} onDelete={(id) => deleteEntry('mandatories', id)} onUpdateStatus={(id, s) => updateStatus('mandatories', id, s)} onUpdateEntry={updateEntry} />
              <FinancialCard title="Subscriptions" totalLabel="Monthly Total" entries={data.subscriptions} accentColor="border-red-600" hasStatus onAdd={(l, a) => addEntry('subscriptions', l, a)} onDelete={(id) => deleteEntry('subscriptions', id)} onUpdateStatus={(id, s) => updateStatus('subscriptions', id, s)} onUpdateEntry={updateEntry} />
              <FinancialCard title="Strategic Plans" totalLabel="Total Plan" entries={data.plans} accentColor="border-indigo-400" hasStatus onAdd={(l, a) => addEntry('plans', l, a)} onDelete={(id) => deleteEntry('plans', id)} onUpdateStatus={(id, s) => updateStatus('plans', id, s)} onUpdateEntry={updateEntry} />
              <FinancialCard title="Savings Goals" totalLabel="Target Deposit" entries={data.savingsContribution} accentColor="border-emerald-400" hasStatus onAdd={(l, a) => addEntry('savingsContribution', l, a)} onDelete={(id) => deleteEntry('savingsContribution', id)} onUpdateStatus={(id, s) => updateStatus('savingsContribution', id, s)} onUpdateEntry={updateEntry} />
              <FinancialCard title="Other Expenses" totalLabel="Misc Total" entries={data.otherExpenses} accentColor="border-amber-400" hasStatus onAdd={(l, a) => addEntry('otherExpenses', l, a)} onDelete={(id) => deleteEntry('otherExpenses', id)} onUpdateStatus={(id, s) => updateStatus('otherExpenses', id, s)} onUpdateEntry={updateEntry} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
