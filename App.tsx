
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FinancialEntry, DashboardData, TransactionStatus } from './types';
import FinancialCard from './components/FinancialCard';
import { getFinancialInsights } from './services/geminiService';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, Tooltip, Cell, CartesianGrid, Area } from 'recharts';

type TabType = 'overview' | 'assets' | 'obligations' | 'prediction';
type Theme = 'dark' | 'light';

interface TabConfig {
  id: TabType;
  label: string;
  icon: React.ReactNode;
}

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

  const [aiInsight, setAiInsight] = useState<string>('');
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

  const updateEntry = (section: keyof DashboardData, id: string, label: string, amount: number) => {
    setData(prev => ({ 
      ...prev, 
      [section]: prev[section].map(e => e.id === id ? { ...e, label, amount } : e) 
    }));
  };

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

  const fetchInsights = useCallback(async () => {
    setIsLoadingInsight(true);
    try {
      const insight = await getFinancialInsights(data);
      setAiInsight(insight);
    } catch (e) {
      setAiInsight("Error loading AI predictions.");
    } finally {
      setIsLoadingInsight(false);
    }
  }, [data]);

  useEffect(() => {
    fetchInsights();
  }, [activeTab === 'prediction']); // Refresh specifically for prediction view

  const chartData = useMemo(() => [
    { name: 'Funds', amount: stats.usable, avg: stats.usable * 0.94 },
    { name: 'Due', amount: stats.unpaidExpenses, avg: stats.unpaidExpenses * 1.12 },
    { name: 'Savings', amount: stats.savings, avg: stats.savings * 0.88 },
    { name: 'Target', amount: stats.totalExpenses, avg: stats.totalExpenses * 1.05 },
  ], [stats]);

  // Prediction Data Calculation
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

  const COLORS = ['#6366f1', '#f43f5e', '#10b981', '#fbbf24'];

  const TABS: TabConfig[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
    },
    {
      id: 'assets',
      label: 'Assets',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
    },
    {
      id: 'obligations',
      label: 'Obligations',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
    },
    {
      id: 'prediction',
      label: 'Prediction',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
    }
  ];

  return (
    <div className="min-h-screen transition-colors duration-300 dark:bg-slate-950 bg-slate-100 text-slate-900 dark:text-slate-200 font-sans selection:bg-indigo-500/30">
      <header className="px-4 md:px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center border-b dark:border-slate-900 border-slate-200 sticky top-0 z-50 dark:bg-slate-950/80 bg-slate-100/80 backdrop-blur-md gap-6 transition-colors duration-300">
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/40 shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
          </div>
          <div className="flex-grow">
            <h1 className="text-xl font-bold tracking-tight dark:text-white text-slate-900 leading-none">FinTrack Pro</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Intelligent Wealth Suite</p>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={toggleTheme} className="p-2.5 rounded-xl dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all active:scale-95" title="Toggle Theme">
              {theme === 'dark' ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.95 16.95l.707.707M7.05 7.05l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z"></path></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>}
            </button>
          </div>
        </div>
        <nav className="flex flex-wrap dark:bg-slate-900/50 bg-white/50 p-1.5 rounded-2xl border dark:border-slate-800 border-slate-200 w-full md:w-auto transition-all duration-300 gap-1.5">
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} title={tab.label} className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800/50'}`}>
              <span className={`transition-transform duration-300 ${activeTab === tab.id ? 'scale-110' : 'scale-100 opacity-60'}`}>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-8 pb-32">
        {activeTab === 'overview' && (
          <section key="overview" className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-in">
            <div className="md:col-span-12 lg:col-span-4 bento-card rounded-3xl p-6 flex flex-col justify-between overflow-hidden relative group transition-colors duration-300">
               <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-600/10 blur-3xl group-hover:bg-indigo-600/20 transition-all"></div>
               <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-6">Financial Vitality</h2>
               <div className="space-y-4">
                  <div>
                    <div className="text-4xl font-mono font-bold dark:text-white text-slate-900 leading-tight">₱{stats.usable.toLocaleString()}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Immediate Cash</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-6 border-t dark:border-slate-800 border-slate-200">
                    <div>
                      <div className="text-lg font-mono font-bold text-rose-500">₱{stats.unpaidExpenses.toLocaleString()}</div>
                      <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Unpaid Liability</div>
                    </div>
                    <div>
                      <div className="text-lg font-mono font-bold text-emerald-600">₱{stats.savings.toLocaleString()}</div>
                      <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Savings Liquid</div>
                    </div>
                  </div>
               </div>
            </div>
            <div className="md:col-span-12 lg:col-span-4 bento-card rounded-3xl p-6 flex flex-col justify-between overflow-hidden relative group transition-colors duration-300 bg-emerald-500/5 border-emerald-500/20">
               <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-600/10 blur-3xl group-hover:bg-emerald-600/20 transition-all"></div>
               <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-500 mb-6 flex items-center"><svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>Total Savings</h2>
               <div className="space-y-4">
                  <div>
                    <div className="text-4xl font-mono font-bold dark:text-emerald-400 text-emerald-600 leading-tight">₱{stats.totalSavings.toLocaleString()}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Accounts + Contributions</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-6 border-t dark:border-slate-800 border-slate-200">
                    <div>
                      <div className="text-lg font-mono font-bold text-slate-700 dark:text-slate-300">₱{stats.savings.toLocaleString()}</div>
                      <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Main Accounts</div>
                    </div>
                    <div>
                      <div className="text-lg font-mono font-bold text-indigo-500">₱{stats.contributions.toLocaleString()}</div>
                      <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Target Allocations</div>
                    </div>
                  </div>
               </div>
            </div>
            <div className="md:col-span-12 lg:col-span-4 bento-card rounded-3xl p-6 dark:bg-gradient-to-br dark:from-indigo-900/20 dark:to-slate-900/40 bg-indigo-50/30 relative overflow-hidden group min-h-[220px]">
              <div className="absolute top-2 right-2 glow-pulse"><div className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.8)]"></div></div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-4 flex items-center"><svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>AI Financial Strategist</h2>
              <div className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 font-medium overflow-y-auto max-h-[160px] pr-2 scrollbar-thin">
                {isLoadingInsight ? <div className="space-y-3"><div className="h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full w-full animate-pulse"></div><div className="h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full w-4/5 animate-pulse"></div></div> : <div className="prose dark:prose-invert prose-slate prose-sm max-w-none">{aiInsight || "Initiate analysis to receive your strategy."}</div>}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'prediction' && (
          <section key="prediction" className="space-y-8 animate-in">
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Prediction Chart */}
                <div className="lg:col-span-8 bento-card rounded-3xl p-6 min-h-[400px] flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">90-Day Liquidity Projection</h2>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Based on current Burn Rate</p>
                    </div>
                  </div>
                  <div className="flex-grow w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={predictionData}>
                        <defs>
                          <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: theme === 'dark' ? '#475569' : '#94a3b8'}} />
                        <Tooltip cursor={{stroke: '#8b5cf6', strokeWidth: 2}} contentStyle={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', border: 'none', borderRadius: '12px', fontSize: '12px' }} formatter={(val: any) => [`₱${Number(val).toLocaleString()}`, 'Projected Balance']}/>
                        <Area type="monotone" dataKey="balance" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorBalance)" />
                        <Line type="step" dataKey="balance" stroke="#d946ef" strokeWidth={2} dot={{ r: 4, fill: '#d946ef' }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Safety Score Bento */}
                <div className="lg:col-span-4 bento-card rounded-3xl p-6 flex flex-col items-center justify-center text-center">
                   <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-8">Quarter-End Safety Score</h3>
                   <div className="relative w-40 h-40 flex items-center justify-center mb-6">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="80" cy="80" r="70" fill="none" stroke="currentColor" strokeWidth="12" className="text-slate-200 dark:text-slate-800" />
                        <circle cx="80" cy="80" r="70" fill="none" stroke="#8b5cf6" strokeWidth="12" strokeDasharray={440} strokeDashoffset={440 - (440 * (predictionData[2].safety / 100))} strokeLinecap="round" className="transition-all duration-1000" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                         <span className="text-4xl font-mono font-bold text-slate-900 dark:text-white">{Math.round(predictionData[2].safety)}%</span>
                         <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Resilience</span>
                      </div>
                   </div>
                   <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[200px]">
                      Predicted ability to cover all standard obligations using immediate cash in 3 months.
                   </p>
                </div>
             </div>

             {/* Forecast Cards */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {predictionData.map((month, idx) => (
                 <div key={idx} className="bento-card rounded-2xl p-6 border-t-4 border-indigo-500/50">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{idx === 0 ? 'Month 1' : idx === 1 ? 'Month 2' : 'Quarter Target'}</div>
                    <div className="text-xl font-bold dark:text-white text-slate-900 mb-1">{month.name} Forecast</div>
                    <div className="text-2xl font-mono font-bold text-indigo-600 dark:text-indigo-400">₱{month.balance.toLocaleString()}</div>
                    <div className="mt-4 flex items-center space-x-2">
                       <div className="flex-grow h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500" style={{width: `${month.safety}%`}}></div>
                       </div>
                       <span className="text-[10px] font-bold text-slate-500">{Math.round(month.safety)}%</span>
                    </div>
                 </div>
               ))}
             </div>

             {/* AI Strategic Analysis */}
             <div className="bento-card rounded-3xl p-8 dark:bg-indigo-950/20 bg-indigo-50/50 relative overflow-hidden group">
                <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-indigo-500/10 blur-3xl rounded-full"></div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-6 flex items-center">
                   <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                   Predictive AI Strategic Analysis
                </h3>
                <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {isLoadingInsight ? (
                    <div className="space-y-4">
                       <div className="h-3 bg-slate-300 dark:bg-slate-700 rounded-full w-full animate-pulse"></div>
                       <div className="h-3 bg-slate-300 dark:bg-slate-700 rounded-full w-5/6 animate-pulse"></div>
                       <div className="h-3 bg-slate-300 dark:bg-slate-700 rounded-full w-4/6 animate-pulse"></div>
                    </div>
                  ) : (
                    <div className="prose dark:prose-invert prose-slate max-w-none">
                      {aiInsight || "Analyzing trajectories..."}
                    </div>
                  )}
                </div>
             </div>
          </section>
        )}

        {activeTab === 'assets' && (
          <div key="assets" className="space-y-6 animate-in">
            <div className="flex items-center space-x-3 px-2"><div className="w-1.5 h-5 bg-emerald-500 rounded-full"></div><h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Core Assets & Liquidity</h3></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FinancialCard title="Cash Reserves" totalLabel="Available" entries={data.accountBalances} accentColor="border-indigo-600" onAdd={(l, a) => addEntry('accountBalances', l, a)} onDelete={(id) => deleteEntry('accountBalances', id)} onUpdateEntry={(id, l, a) => updateEntry('accountBalances', id, l, a)} />
              <FinancialCard title="Locked Savings" totalLabel="Balance" entries={data.savingsAccounts} accentColor="border-emerald-500" onAdd={(l, a) => addEntry('savingsAccounts', l, a)} onDelete={(id) => deleteEntry('savingsAccounts', id)} onUpdateEntry={(id, l, a) => updateEntry('savingsAccounts', id, l, a)} />
              <FinancialCard title="Receivables" totalLabel="Incoming" entries={data.receivables} accentColor="border-amber-500" hasStatus onAdd={(l, a) => addEntry('receivables', l, a)} onDelete={(id) => deleteEntry('receivables', id)} onUpdateStatus={(id, s) => updateStatus('receivables', id, s)} onUpdateEntry={(id, l, a) => updateEntry('receivables', id, l, a)} />
            </div>
          </div>
        )}

        {activeTab === 'obligations' && (
          <div key="obligations" className="space-y-6 animate-in">
            <div className="flex items-center space-x-3 px-2"><div className="w-1.5 h-5 bg-rose-500 rounded-full"></div><h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Ongoing Obligations</h3></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <FinancialCard title="Debt & Loans" totalLabel="Owed" entries={data.loans} accentColor="border-rose-600" hasStatus onAdd={(l, a) => addEntry('loans', l, a)} onDelete={(id) => deleteEntry('loans', id)} onUpdateStatus={(id, s) => updateStatus('loans', id, s)} onUpdateEntry={(id, l, a) => updateEntry('loans', id, l, a)} />
              <FinancialCard title="Mandatory" totalLabel="Due" entries={data.mandatories} accentColor="border-slate-400" hasStatus onAdd={(l, a) => addEntry('mandatories', l, a)} onDelete={(id) => deleteEntry('mandatories', id)} onUpdateStatus={(id, s) => updateStatus('mandatories', id, s)} onUpdateEntry={(id, l, a) => updateEntry('mandatories', id, l, a)} />
              <FinancialCard title="Utilities" totalLabel="Billed" entries={data.utilities} accentColor="border-sky-500" hasStatus onAdd={(l, a) => addEntry('utilities', l, a)} onDelete={(id) => deleteEntry('utilities', id)} onUpdateStatus={(id, s) => updateStatus('utilities', id, s)} onUpdateEntry={(id, l, a) => updateEntry('utilities', id, l, a)} />
              <FinancialCard title="Subs & Recur" totalLabel="Month" entries={data.subscriptions} accentColor="border-red-600" hasStatus onAdd={(l, a) => addEntry('subscriptions', l, a)} onDelete={(id) => deleteEntry('subscriptions', id)} onUpdateStatus={(id, s) => updateStatus('subscriptions', id, s)} onUpdateEntry={(id, l, a) => updateEntry('subscriptions', id, l, a)} />
            </div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl px-4">
        <div className="dark:bg-slate-900/90 bg-white/90 backdrop-blur-2xl border dark:border-slate-700/50 border-slate-200/60 p-4 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-between gap-4 ring-1 ring-white/5 transition-all">
          <div className="flex flex-col items-center flex-1 min-w-0"><span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Net Flow</span><span className={`font-mono text-sm sm:text-base font-bold truncate ${stats.remainingBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>₱{stats.remainingBalance.toLocaleString()}</span></div>
          <div className="h-8 w-px dark:bg-slate-800 bg-slate-200 shrink-0"></div>
          <div className="flex flex-col items-center flex-1 min-w-0"><span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Total Out</span><span className="font-mono text-sm sm:text-base font-bold dark:text-white text-slate-900 truncate">₱{stats.totalExpenses.toLocaleString()}</span></div>
          <div className="h-8 w-px dark:bg-slate-800 bg-slate-200 shrink-0"></div>
          <div className="flex flex-col items-center flex-1 min-w-0"><span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Safety</span><span className="font-mono text-sm sm:text-base font-bold text-indigo-600">{Math.min(999, Math.round((stats.usable / (stats.totalExpenses || 1)) * 100))}%</span></div>
        </div>
      </footer>
    </div>
  );
};

export default App;
