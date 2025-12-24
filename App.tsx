
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FinancialEntry, DashboardData, TransactionStatus } from './types';
import FinancialCard from './components/FinancialCard';
import { getFinancialInsights } from './services/geminiService';
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Cell, YAxis } from 'recharts';

const App: React.FC = () => {
  const [data, setData] = useState<DashboardData>({
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
  });

  const [aiInsight, setAiInsight] = useState<string>('');
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);

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
    const usable = calculateTotal(data.accountBalances);
    const receivables = calculateTotal(data.receivables);
    
    const allExpenses = [
      ...data.loans, ...data.subscriptions, ...data.savingsContribution,
      ...data.utilities, ...data.plans, ...data.mandatories, ...data.otherExpenses
    ];
    
    const totalExpenses = calculateTotal(allExpenses);
    const unpaidExpenses = calculateTotal(allExpenses.filter(e => e.status !== TransactionStatus.PAID));
    
    return {
      savings, usable, receivables, totalExpenses, unpaidExpenses,
      remainingBalance: usable - totalExpenses,
    };
  }, [data]);

  const fetchInsights = useCallback(async () => {
    setIsLoadingInsight(true);
    try {
      const insight = await getFinancialInsights(data);
      setAiInsight(insight);
    } catch (e) {
      setAiInsight("Error loading AI insights.");
    } finally {
      setIsLoadingInsight(false);
    }
  }, [data]);

  const handleExportCSV = () => {
    const headers = ["Category", "Label", "Amount", "Status"];
    const rows: string[][] = [];

    // Use type assertion to help TypeScript understand that values are FinancialEntry arrays.
    (Object.entries(data) as [keyof DashboardData, FinancialEntry[]][]).forEach(([category, entries]) => {
      entries.forEach((entry: FinancialEntry) => {
        rows.push([
          category.replace(/([A-Z])/g, ' $1').trim(), // Make category readable
          entry.label,
          entry.amount.toString(),
          entry.status || "N/A"
        ]);
      });
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `FinTrack_Export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const chartData = [
    { name: 'Funds', amount: stats.usable },
    { name: 'Due', amount: stats.unpaidExpenses },
    { name: 'Savings', amount: stats.savings },
    { name: 'Target', amount: stats.totalExpenses },
  ];

  const COLORS = ['#6366f1', '#f43f5e', '#10b981', '#fbbf24'];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Navbar */}
      <header className="px-6 py-4 flex justify-between items-center border-b border-slate-900 sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/40">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white leading-none">FinTrack Pro</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Intelligent Wealth Suite</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 sm:space-x-8">
          <div className="hidden lg:block">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-right mb-0.5">Global Liquidity</div>
            <div className={`text-xl font-mono font-bold text-right ${stats.remainingBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ₱{stats.remainingBalance.toLocaleString()}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button 
              onClick={handleExportCSV}
              className="p-2.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all active:scale-95"
              title="Export Data as CSV"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            </button>
            <button 
              onClick={fetchInsights}
              disabled={isLoadingInsight}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {isLoadingInsight ? <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></div> : <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/></svg>}
              <span className="hidden sm:inline">{isLoadingInsight ? 'Analyzing...' : 'AI Insights'}</span>
              <span className="sm:hidden">{isLoadingInsight ? '...' : 'AI'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto p-6 space-y-6">
        
        {/* Top Bento Row: Stats & Chart */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Main Net Position Bento */}
          <div className="md:col-span-4 bento-card rounded-3xl p-6 flex flex-col justify-between overflow-hidden relative group">
             <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-600/10 blur-3xl group-hover:bg-indigo-600/20 transition-all"></div>
             <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-6">Financial Vitality</h2>
             <div className="space-y-4">
                <div>
                  <div className="text-3xl font-mono font-bold text-white leading-tight">
                    ₱{stats.usable.toLocaleString()}
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Immediate Cash</div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                  <div>
                    <div className="text-sm font-mono font-bold text-rose-400">₱{stats.unpaidExpenses.toLocaleString()}</div>
                    <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Unpaid Liability</div>
                  </div>
                  <div>
                    <div className="text-sm font-mono font-bold text-emerald-400">₱{stats.savings.toLocaleString()}</div>
                    <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Locked Wealth</div>
                  </div>
                </div>
             </div>
          </div>

          {/* Visualization Bento */}
          <div className="md:col-span-4 bento-card rounded-3xl p-6 flex flex-col justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Portfolio Overview</h2>
            <div className="h-24 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <Tooltip 
                    cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px' }} 
                  />
                  <Bar dataKey="amount" radius={[6, 6, 6, 6]} barSize={32}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between items-center mt-4">
               {chartData.map((item, i) => (
                 <div key={item.name} className="flex flex-col items-center">
                   <div className="w-1.5 h-1.5 rounded-full mb-1.5" style={{backgroundColor: COLORS[i]}}></div>
                   <span className="text-[8px] font-bold text-slate-500 uppercase">{item.name}</span>
                 </div>
               ))}
            </div>
          </div>

          {/* AI Strategy Bento */}
          <div className="md:col-span-4 bento-card rounded-3xl p-6 bg-gradient-to-br from-indigo-900/20 to-slate-900/40 relative overflow-hidden group">
            <div className="absolute top-2 right-2 glow-pulse">
              <div className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.8)]"></div>
            </div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-3 flex items-center">
              <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
              AI Strategy Room
            </h2>
            <div className="text-[11px] leading-relaxed text-slate-300 font-medium overflow-y-auto max-h-24 pr-2 scrollbar-thin">
              {isLoadingInsight ? (
                <div className="space-y-2">
                  <div className="h-2 bg-slate-800 rounded-full w-full animate-pulse"></div>
                  <div className="h-2 bg-slate-800 rounded-full w-4/5 animate-pulse"></div>
                  <div className="h-2 bg-slate-800 rounded-full w-2/3 animate-pulse"></div>
                </div>
              ) : (
                <div className="prose prose-invert prose-xs">{aiInsight || "Click 'AI Insights' for your personalized financial flight plan."}</div>
              )}
            </div>
          </div>
        </section>

        {/* Assets Section Bento Grid */}
        <div className="space-y-4">
          <div className="flex items-center space-x-3 px-2">
             <div className="w-1 h-4 bg-emerald-500 rounded-full"></div>
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Core Assets & Liquidity</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FinancialCard 
              title="Cash Reserves" totalLabel="Available" entries={data.accountBalances} accentColor="border-indigo-600"
              onAdd={(l, a) => addEntry('accountBalances', l, a)} onDelete={(id) => deleteEntry('accountBalances', id)}
              onUpdateEntry={(id, l, a) => updateEntry('accountBalances', id, l, a)}
            />
            <FinancialCard 
              title="Locked Savings" totalLabel="Balance" entries={data.savingsAccounts} accentColor="border-emerald-500"
              onAdd={(l, a) => addEntry('savingsAccounts', l, a)} onDelete={(id) => deleteEntry('savingsAccounts', id)}
              onUpdateEntry={(id, l, a) => updateEntry('savingsAccounts', id, l, a)}
            />
            <FinancialCard 
              title="Receivables" totalLabel="Incoming" entries={data.receivables} accentColor="border-amber-500" hasStatus
              onAdd={(l, a) => addEntry('receivables', l, a)} onDelete={(id) => deleteEntry('receivables', id)} onUpdateStatus={(id, s) => updateStatus('receivables', id, s)}
              onUpdateEntry={(id, l, a) => updateEntry('receivables', id, l, a)}
            />
          </div>
        </div>

        {/* Obligations Section Bento Grid */}
        <div className="space-y-4">
           <div className="flex items-center space-x-3 px-2">
             <div className="w-1 h-4 bg-rose-500 rounded-full"></div>
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Ongoing Obligations</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-24">
            <FinancialCard 
              title="Debt & Loans" totalLabel="Owed" entries={data.loans} accentColor="border-rose-600" hasStatus
              onAdd={(l, a) => addEntry('loans', l, a)} onDelete={(id) => deleteEntry('loans', id)} onUpdateStatus={(id, s) => updateStatus('loans', id, s)}
              onUpdateEntry={(id, l, a) => updateEntry('loans', id, l, a)}
            />
            <FinancialCard 
              title="Mandatory" totalLabel="Due" entries={data.mandatories} accentColor="border-slate-600" hasStatus
              onAdd={(l, a) => addEntry('mandatories', l, a)} onDelete={(id) => deleteEntry('mandatories', id)} onUpdateStatus={(id, s) => updateStatus('mandatories', id, s)}
              onUpdateEntry={(id, l, a) => updateEntry('mandatories', id, l, a)}
            />
            <FinancialCard 
              title="Utilities" totalLabel="Billed" entries={data.utilities} accentColor="border-sky-500" hasStatus
              onAdd={(l, a) => addEntry('utilities', l, a)} onDelete={(id) => deleteEntry('utilities', id)} onUpdateStatus={(id, s) => updateStatus('utilities', id, s)}
              onUpdateEntry={(id, l, a) => updateEntry('utilities', id, l, a)}
            />
            <FinancialCard 
              title="Subs & Recur" totalLabel="Month" entries={data.subscriptions} accentColor="border-red-600" hasStatus
              onAdd={(l, a) => addEntry('subscriptions', l, a)} onDelete={(id) => deleteEntry('subscriptions', id)} onUpdateStatus={(id, s) => updateStatus('subscriptions', id, s)}
              onUpdateEntry={(id, l, a) => updateEntry('subscriptions', id, l, a)}
            />
            <FinancialCard 
              title="Goal Allocations" totalLabel="Target" entries={data.savingsContribution} accentColor="border-teal-500" hasStatus
              onAdd={(l, a) => addEntry('savingsContribution', l, a)} onDelete={(id) => deleteEntry('savingsContribution', id)} onUpdateStatus={(id, s) => updateStatus('savingsContribution', id, s)}
              onUpdateEntry={(id, l, a) => updateEntry('savingsContribution', id, l, a)}
            />
            <FinancialCard 
              title="Security Plans" totalLabel="Premium" entries={data.plans} accentColor="border-violet-600" hasStatus
              onAdd={(l, a) => addEntry('plans', l, a)} onDelete={(id) => deleteEntry('plans', id)} onUpdateStatus={(id, s) => updateStatus('plans', id, s)}
              onUpdateEntry={(id, l, a) => updateEntry('plans', id, l, a)}
            />
            <div className="lg:col-span-2">
              <FinancialCard 
                title="Miscellaneous" totalLabel="Estimate" entries={data.otherExpenses} accentColor="border-zinc-500" hasStatus
                onAdd={(l, a) => addEntry('otherExpenses', l, a)} onDelete={(id) => deleteEntry('otherExpenses', id)} onUpdateStatus={(id, s) => updateStatus('otherExpenses', id, s)}
                onUpdateEntry={(id, l, a) => updateEntry('otherExpenses', id, l, a)}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Futuristic Floating HUD Footer */}
      <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 px-8 py-3 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center space-x-10 ring-1 ring-white/5">
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Real Net</span>
              <span className={`font-mono text-base font-bold ${stats.remainingBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                ₱{stats.remainingBalance.toLocaleString()}
              </span>
            </div>
            <div className="h-6 w-px bg-slate-800"></div>
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Liabilities</span>
              <span className="font-mono text-base font-bold text-white">
                ₱{stats.totalExpenses.toLocaleString()}
              </span>
            </div>
            <div className="h-6 w-px bg-slate-800"></div>
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Coverage</span>
              <span className="font-mono text-base font-bold text-indigo-400">
                {Math.round((stats.usable / (stats.totalExpenses || 1)) * 100)}%
              </span>
            </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
