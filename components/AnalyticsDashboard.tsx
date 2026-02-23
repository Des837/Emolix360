import React, { useMemo, useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { AppState, DailySummary, Transaction } from '../types';
import { 
  BarChart3, 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Target,
  Zap,
  ShoppingBag,
  Award,
  AlertCircle,
  PieChart as PieChartIcon,
  List,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  ArrowUp,
  ArrowDown,
  Activity,
  ZapOff,
  Trash2,
  X
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  PieChart, 
  Pie, 
  Cell, 
  Legend,
  LineChart,
  Line,
  ReferenceLine,
  BarChart,
  Bar
} from 'recharts';

interface AnalyticsDashboardProps {
  state: AppState;
  onClose: () => void;
  onRequestLogin?: () => void;
  onClearData?: () => void;
}

type ViewMode = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
type TabMode = 'OVERVIEW' | 'PRODUCTS' | 'AUDIT' | 'INSIGHTS';

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ state, onClose, onRequestLogin, onClearData }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('DAY');
  const [activeTab, setActiveTab] = useState<TabMode>('OVERVIEW');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Update clock every minute for the "Live" feel
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleClearData = () => {
    setShowClearConfirm(true);
  };

  const confirmClear = () => {
    onClearData?.();
    setShowClearConfirm(false);
  };

  // --- PREMIUM LOCK CHECK ---
  const isLocked = !state.user;

  // ... (rest of the logic)
  
  // --- 1. ROBUST DATA ENGINE (DYNAMIC AGGREGATION) ---
  const { chartData, kpis, productRanking, forecast, allTransactionsSorted, peakStats, pieDataEmoliente, pieDataFood, comparison, hourlyTrend, dashboardStats } = useMemo(() => {
    
    // Step A: Gather ALL transactions
    const closedHistorySummaries = state.user ? dbService.getHistory(state.user.businessName) : [];
    const historicTransactions = closedHistorySummaries.flatMap(d => d.transactions || []);
    const activeTransactions = state.history;
    
    const allTransactionsMap = new Map<string, Transaction>();
    [...historicTransactions, ...activeTransactions].forEach(t => {
        allTransactionsMap.set(t.id, t);
    });
    
    const allTransactionsSorted = Array.from(allTransactionsMap.values())
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const today = new Date();
    
    // --- PEAK ANALYSIS (Global) ---
    const hourlyStats: Record<number, number> = {};
    const dailyStats: Record<number, number> = {}; // 0-6 (Sun-Sat)

    allTransactionsSorted.forEach(t => {
        if (t.type === 'SALE') {
            const d = new Date(t.timestamp);
            const h = d.getHours();
            const day = d.getDay();
            const amt = t.amount || 0;
            
            hourlyStats[h] = (hourlyStats[h] || 0) + amt;
            dailyStats[day] = (dailyStats[day] || 0) + amt;
        }
    });

    const bestHour = Object.entries(hourlyStats).sort((a,b) => b[1] - a[1])[0];
    const bestDay = Object.entries(dailyStats).sort((a,b) => b[1] - a[1])[0];
    
    const daysMap = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    const peakStats = {
        bestHour: bestHour ? `${bestHour[0]}:00 - ${parseInt(bestHour[0])+1}:00` : 'N/A',
        bestDay: bestDay ? daysMap[parseInt(bestDay[0])] : 'N/A',
        bestHourRev: bestHour ? bestHour[1] : 0,
        bestDayRev: bestDay ? bestDay[1] : 0
    };

    // --- FILTERING & GROUPING FOR CHART ---
    let relevantTransactions = allTransactionsSorted;
    let groupingKey: (d: Date) => string;
    let allKeys: string[] = [];

    if (viewMode === 'DAY') {
        // Filter: Today
        relevantTransactions = allTransactionsSorted.filter(t => {
            const d = new Date(t.timestamp);
            return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
        });
        groupingKey = (d) => `${d.getHours()}`; // 0, 1, ... 23
        // Fill all hours
        allKeys = Array.from({length: 24}, (_, i) => `${i}`);

    } else if (viewMode === 'WEEK') {
        // Filter: Last 7 Days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 6); // Inclusive
        sevenDaysAgo.setHours(0,0,0,0);
        
        relevantTransactions = allTransactionsSorted.filter(t => new Date(t.timestamp) >= sevenDaysAgo);
        groupingKey = (d) => d.toLocaleDateString('en-CA'); // YYYY-MM-DD
        
        // Fill last 7 days
        for(let i=6; i>=0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            allKeys.push(d.toLocaleDateString('en-CA'));
        }

    } else if (viewMode === 'MONTH') {
        // Filter: This Month
        relevantTransactions = allTransactionsSorted.filter(t => {
            const d = new Date(t.timestamp);
            return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
        });
        groupingKey = (d) => d.toLocaleDateString('en-CA');
        
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        allKeys = Array.from({length: daysInMonth}, (_, i) => {
            const d = new Date(today.getFullYear(), today.getMonth(), i + 1);
            return d.toLocaleDateString('en-CA');
        });

    } else { // YEAR
        // Filter: This Year
        relevantTransactions = allTransactionsSorted.filter(t => {
            const d = new Date(t.timestamp);
            return d.getFullYear() === today.getFullYear();
        });
        groupingKey = (d) => `${d.getMonth()}`; // 0-11
        allKeys = Array.from({length: 12}, (_, i) => `${i}`);
    }

    // Aggregation
    const groupedData: Record<string, { revenue: number, profit: number, label: string }> = {};
    
    // Init with 0
    allKeys.forEach(k => {
        let label = k;
        if (viewMode === 'DAY') label = `${k}:00`;
        else if (viewMode === 'YEAR') {
             const d = new Date(today.getFullYear(), parseInt(k), 1);
             label = d.toLocaleDateString('es-PE', { month: 'short' });
        } else if (viewMode === 'WEEK' || viewMode === 'MONTH') {
             // Need to parse YYYY-MM-DD back to date for label
             const parts = k.split('-');
             const d = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
             label = viewMode === 'WEEK' ? d.toLocaleDateString('es-PE', { weekday: 'narrow', day: 'numeric' }) : d.getDate().toString();
        }

        groupedData[k] = { revenue: 0, profit: 0, label };
    });

    relevantTransactions.forEach(t => {
        const d = new Date(t.timestamp);
        const k = groupingKey(d);
        
        if (groupedData[k]) {
            if (t.type === 'SALE') {
                const rev = t.amount || 0;
                let profit = 0;
                if (t.productId) {
                    const prod = state.products.find(p => p.id === t.productId);
                    if (prod) profit = (prod.pv - prod.cu) * (t.quantity || 1);
                } else if (t.items) {
                    t.items.forEach(i => profit += (i.pv - i.cu));
                }
                
                groupedData[k].revenue += rev;
                groupedData[k].profit += profit;
            } else if (t.type === 'EXPENSE') {
                groupedData[k].profit -= (t.amount || 0);
            }
        }
    });

    const chartData = allKeys.map(k => ({
        label: groupedData[k].label,
        value: groupedData[k].revenue,
        profit: groupedData[k].profit
    }));

    // KPIs (based on current view)
    const totalRev = chartData.reduce((sum, d) => sum + d.value, 0);
    const totalProf = chartData.reduce((sum, d) => sum + d.profit, 0);
    
    // Ranking (based on current view)
    const productStats: Record<string, { qty: number, revenue: number }> = {};
    relevantTransactions.forEach(t => {
        if (t.type === 'SALE') {
             if (t.items) {
                t.items.forEach(i => {
                    if (!productStats[i.name]) productStats[i.name] = { qty: 0, revenue: 0 };
                    productStats[i.name].qty += 1;
                    productStats[i.name].revenue += i.pv;
                });
            } else if (t.productName) {
                 if (!productStats[t.productName]) productStats[t.productName] = { qty: 0, revenue: 0 };
                 productStats[t.productName].qty += (t.quantity || 1);
                 productStats[t.productName].revenue += (t.amount || 0);
            }
        }
    });
    
    const ranking = Object.entries(productStats)
        .map(([name, stat]) => ({ name, ...stat }))
        .sort((a, b) => b.revenue - a.revenue);

    // Forecast (Simple linear projection for Month view)
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const currentDay = today.getDate();
    const avgDailyRev = totalRev / (viewMode === 'DAY' ? 1 : (viewMode === 'WEEK' ? 7 : currentDay));
    const projectedMonthEnd = (avgDailyRev * daysInMonth);

    // --- PIE CHARTS DATA ---
    const emoMap = new Map<string, number>();
    const foodMap = new Map<string, number>();

    relevantTransactions.forEach(t => {
      if (t.type === 'SALE') {
        const processItem = (name: string, cat: string, qty: number) => {
           if (['MEDICINAL', 'FRUTADO', 'ESPECIAL'].includes(cat)) {
             emoMap.set(name, (emoMap.get(name) || 0) + qty);
           } else if (cat === 'COMIDA') {
             foodMap.set(name, (foodMap.get(name) || 0) + qty);
           }
        };

        if (t.items) {
          t.items.forEach(i => processItem(i.name, i.category, 1));
        } else if (t.productId) {
           const p = state.products.find(prod => prod.id === t.productId);
           if (p) processItem(p.name, p.category, t.quantity || 1);
        }
      }
    });

    const pieDataEmoliente = Array.from(emoMap.entries()).map(([name, value]) => ({ name, value }));
    const pieDataFood = Array.from(foodMap.entries()).map(([name, value]) => ({ name, value }));

    // --- COMPARISON & VELOCITY DATA ---
    
    // 1. Hourly Stats (Always for Today)
    const todayHourlyStats: Record<number, number> = {};
    const todayTrans = allTransactionsSorted.filter(t => {
        const d = new Date(t.timestamp);
        const now = new Date();
        return d.getDate() === now.getDate() && 
               d.getMonth() === now.getMonth() && 
               d.getFullYear() === now.getFullYear();
    });

    todayTrans.forEach(t => {
        if (t.type === 'SALE') {
            const h = new Date(t.timestamp).getHours();
            todayHourlyStats[h] = (todayHourlyStats[h] || 0) + (t.amount || 0);
        }
    });

    // 2. Comparison vs Yesterday (Approximation based on history)
    let yesterdayRev = 0;
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toLocaleDateString('en-CA'); // Use local date string to match DB format
    
    // Find in DB history
    const hist = closedHistorySummaries.find(h => h.date === yesterdayStr);
    if (hist) yesterdayRev = hist.totalRevenue;
    
    const growth = yesterdayRev > 0 ? ((totalRev - yesterdayRev) / yesterdayRev) * 100 : 100;

    // 3. Hourly Velocity (Last 8 active hours)
    const recentHours = Object.entries(todayHourlyStats)
        .map(([hour, val]) => ({ hour: parseInt(hour), value: val }))
        .sort((a,b) => a.hour - b.hour)
        .slice(-8); // Last 8 hours with activity

    // 4. Category Stats & Expense Stats
    const catMap = new Map<string, number>();
    const expMap = new Map<string, number>();
    let totalOrders = 0;
    let totalExpenses = 0;

    relevantTransactions.forEach(t => {
        if (t.type === 'SALE') {
            totalOrders++;
            if (t.items) {
                t.items.forEach(i => {
                    catMap.set(i.category, (catMap.get(i.category) || 0) + i.pv);
                });
            } else if (t.productId) {
                const p = state.products.find(prod => prod.id === t.productId);
                if (p) catMap.set(p.category, (catMap.get(p.category) || 0) + (t.amount || 0));
            }
        } else if (t.type === 'EXPENSE') {
            totalExpenses += (t.amount || 0);
            const cat = t.description || 'General';
            expMap.set(cat, (expMap.get(cat) || 0) + (t.amount || 0));
        }
    });

    const categoryStats = Array.from(catMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a,b) => b.value - a.value);

    const expenseStats = Array.from(expMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a,b) => b.value - a.value);

    return {
        chartData,
        allTransactionsSorted,
        kpis: {
            totalRev,
            totalProf,
            margin: totalRev > 0 ? (totalProf / totalRev) * 100 : 0,
            avgTicket: relevantTransactions.length > 0 ? totalRev / relevantTransactions.length : 0
        },
        productRanking: ranking,
        forecast: { monthEnd: projectedMonthEnd },
        peakStats,
        pieDataEmoliente,
        pieDataFood,
        comparison: { yesterdayRev, growth },
        hourlyTrend: recentHours,
        dashboardStats: {
            totalOrders,
            totalExpenses,
            categoryStats,
            expenseStats
        }
    };

  }, [state.history, state.user, state.products, viewMode]);

  const maxChartValue = Math.max(...chartData.map(d => d.value), 10);

  // Filter for Audit Tab
  const filteredTransactions = useMemo(() => {
    if (!searchTerm) return allTransactionsSorted;
    return allTransactionsSorted.filter(t => 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allTransactionsSorted, searchTerm]);

  return (
    <div className="fixed inset-0 z-50 bg-emoliente-dark flex flex-col animate-in slide-in-from-bottom-10">
      
      {/* --- PREMIUM LOCK OVERLAY --- */}
      {isLocked && (
        <div className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
           <div className="bg-card-bg border border-emoliente-green rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emoliente-green to-transparent" />
              
              <div className="w-16 h-16 bg-emoliente-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
                 <Target className="w-8 h-8 text-emoliente-green" />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">Gerencia en Vivo</h3>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                Esta función avanzada permite visualizar tus ganancias, proyecciones y auditoría en tiempo real.
                <br/><br/>
                <span className="text-emoliente-green font-bold">Suscríbete para sincronizar y proteger tu historial.</span>
              </p>
              
              <div className="space-y-3">
                <button 
                  onClick={onRequestLogin}
                  className="w-full py-3 bg-emoliente-green hover:bg-green-600 text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-green-900/20"
                >
                  Suscribirse / Iniciar Sesión
                </button>
                <button 
                  onClick={onClose}
                  className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl transition-all"
                >
                  Volver
                </button>
              </div>
           </div>
        </div>
      )}

      {/* --- CLEAR DATA CONFIRMATION MODAL --- */}
      {showClearConfirm && (
        <div className="absolute inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
           <div className="bg-card-bg border border-red-500/30 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent" />
              
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                 <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">¿Limpiar Todo?</h3>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                Esta acción eliminará <span className="text-red-400 font-bold">todos los registros de ventas y gastos</span> de la sesión actual.
                <br/><br/>
                Esta acción no se puede deshacer.
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setShowClearConfirm(false)}
                  className="py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmClear}
                  className="py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-red-900/20"
                >
                  Sí, Limpiar
                </button>
              </div>
           </div>
        </div>
      )}

      {/* --- HEADER --- */}
      <div className={`p-4 bg-emoliente-bg border-b border-gray-800 flex justify-between items-center shadow-lg ${isLocked ? 'blur-sm pointer-events-none' : ''}`}>
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="text-emoliente-amber" /> Gerencia En Vivo
          </h2>
          <div className="flex items-center gap-2 mt-1">
             <span className="relative flex h-2 w-2">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emoliente-green opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2 w-2 bg-emoliente-green"></span>
             </span>
             <p className="text-[10px] text-gray-400 font-mono tracking-wide uppercase">
               Actualizado: {currentTime.toLocaleTimeString()}
             </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            {onClearData && (
                <button 
                    onClick={handleClearData}
                    className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors border border-red-500/20"
                    title="Limpiar Todo"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            )}
            <button onClick={onClose} className="px-4 py-2 bg-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-700 transition-colors">
                Cerrar
            </button>
        </div>
      </div>

      {/* --- TABS --- */}
      <div className={`flex border-b border-gray-800 bg-gray-900/50 overflow-x-auto ${isLocked ? 'blur-sm pointer-events-none' : ''}`}>
          <button 
            onClick={() => setActiveTab('OVERVIEW')}
            className={`flex-1 min-w-[80px] py-3 text-xs md:text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'OVERVIEW' ? 'text-emoliente-green border-b-2 border-emoliente-green bg-emoliente-green/5' : 'text-gray-500'}`}
          >
            <Zap className="w-4 h-4" /> Resumen
          </button>
          <button 
            onClick={() => setActiveTab('PRODUCTS')}
            className={`flex-1 min-w-[80px] py-3 text-xs md:text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'PRODUCTS' ? 'text-emoliente-amber border-b-2 border-emoliente-amber bg-emoliente-amber/5' : 'text-gray-500'}`}
          >
            <ShoppingBag className="w-4 h-4" /> Productos
          </button>
          <button 
            onClick={() => setActiveTab('AUDIT')}
            className={`flex-1 min-w-[80px] py-3 text-xs md:text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'AUDIT' ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-400/5' : 'text-gray-500'}`}
          >
            <List className="w-4 h-4" /> Historial
          </button>
          <button 
            onClick={() => setActiveTab('INSIGHTS')}
            className={`flex-1 min-w-[80px] py-3 text-xs md:text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'INSIGHTS' ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-400/5' : 'text-gray-500'}`}
          >
            <Activity className="w-4 h-4" /> Tablero
          </button>
      </div>

      <div className={`flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6 bg-gradient-to-b from-emoliente-dark to-black ${isLocked ? 'blur-sm pointer-events-none' : ''}`}>
        
        {/* === TAB 1: OVERVIEW === */}
        {activeTab === 'OVERVIEW' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Time Filter Pill */}
                <div className="flex justify-center mb-2">
                    <div className="flex bg-gray-800 p-1 rounded-full">
                    {(['DAY', 'WEEK', 'MONTH', 'YEAR'] as ViewMode[]).map((mode) => (
                        <button
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${viewMode === mode ? 'bg-gray-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                        >
                        {mode === 'DAY' ? 'Hoy' : mode === 'WEEK' ? 'Semana' : mode === 'MONTH' ? 'Mes' : 'Año'}
                        </button>
                    ))}
                    </div>
                </div>

                {/* Big KPIs */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 relative overflow-hidden">
                        <p className="text-xs text-gray-400 uppercase font-bold mb-1">Venta {viewMode === 'DAY' ? 'Hoy' : 'Periodo'}</p>
                        <p className="text-2xl font-mono text-white font-bold">S/ {kpis.totalRev.toFixed(0)}</p>
                        <div className="absolute right-0 bottom-0 p-3 opacity-10">
                            <DollarSign className="w-12 h-12 text-white" />
                        </div>
                    </div>
                    <div className="p-5 bg-gradient-to-br from-emoliente-green/10 to-green-900/20 rounded-2xl border border-emoliente-green/30 relative overflow-hidden">
                        <p className="text-xs text-green-200/70 uppercase font-bold mb-1">Ganancia Neta</p>
                        <p className="text-2xl font-mono text-emoliente-green font-bold">S/ {kpis.totalProf.toFixed(0)}</p>
                        <p className="text-[10px] text-green-300 mt-1 flex items-center gap-1"><TrendingUp className="w-3 h-3"/> {kpis.margin.toFixed(0)}% Margen</p>
                    </div>
                </div>

                {/* Peak Performance Insights */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-800/50 p-3 rounded-xl border border-gray-700">
                        <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Mejor Hora</p>
                        <p className="text-lg font-bold text-white">{peakStats.bestHour}</p>
                        <p className="text-[9px] text-emoliente-green">S/ {peakStats.bestHourRev.toFixed(0)} en ventas</p>
                    </div>
                    <div className="bg-gray-800/50 p-3 rounded-xl border border-gray-700">
                        <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Mejor Día</p>
                        <p className="text-lg font-bold text-white">{peakStats.bestDay}</p>
                        <p className="text-[9px] text-emoliente-green">S/ {peakStats.bestDayRev.toFixed(0)} en ventas</p>
                    </div>
                </div>

                {/* Main Chart - Recharts Area Chart */}
                <div className="bg-card-bg rounded-2xl border border-gray-700 p-5 shadow-lg relative overflow-hidden">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-emoliente-amber" /> Evolución Financiera
                        </h3>
                    </div>
                    
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#9ca3af" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#9ca3af" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorProf" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#65a30d" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#65a30d" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                <XAxis 
                                    dataKey="label" 
                                    stroke="#6b7280" 
                                    fontSize={10} 
                                    tickLine={false}
                                    axisLine={false}
                                    interval={viewMode === 'DAY' ? 2 : 'preserveStartEnd'}
                                />
                                <YAxis 
                                    stroke="#6b7280" 
                                    fontSize={10} 
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `S/${value}`}
                                />
                                <RechartsTooltip 
                                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '0.5rem', fontSize: '12px' }}
                                    itemStyle={{ color: '#e5e7eb' }}
                                    formatter={(value: number) => [`S/ ${value.toFixed(2)}`]}
                                    labelStyle={{ color: '#9ca3af', marginBottom: '0.25rem' }}
                                />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                                <Area 
                                    type="monotone" 
                                    dataKey="value" 
                                    name="Ingreso Ventas" 
                                    stroke="#9ca3af" 
                                    fillOpacity={1} 
                                    fill="url(#colorRev)" 
                                    strokeWidth={2}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="profit" 
                                    name="Utilidad Neta" 
                                    stroke="#65a30d" 
                                    fillOpacity={1} 
                                    fill="url(#colorProf)" 
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        )}

        {/* === TAB 2: PRODUCTS === */}
        {activeTab === 'PRODUCTS' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                
                {/* Pie Charts Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Emolientes Pie */}
                    <div className="bg-card-bg rounded-xl border border-gray-700 p-4 flex flex-col items-center">
                        <h4 className="text-xs font-bold text-gray-300 mb-2 uppercase tracking-wider">Mix Emolientes</h4>
                        <div className="h-40 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieDataEmoliente}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={35}
                                        outerRadius={55}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {pieDataEmoliente.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={['#65a30d', '#d97706', '#a855f7'][index % 3]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip 
                                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '0.5rem', fontSize: '10px' }}
                                        itemStyle={{ color: '#e5e7eb' }}
                                        formatter={(value: number) => [`${value} Unid.`, 'Cantidad']}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex gap-2 justify-center flex-wrap mt-2">
                             {pieDataEmoliente.slice(0, 3).map((entry, i) => (
                                 <div key={i} className="flex items-center gap-1 text-[9px] text-gray-400">
                                     <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#65a30d', '#d97706', '#a855f7'][i % 3] }}></div>
                                     <span className="truncate max-w-[60px]">{entry.name}</span>
                                 </div>
                             ))}
                        </div>
                    </div>

                    {/* Food Pie */}
                    <div className="bg-card-bg rounded-xl border border-gray-700 p-4 flex flex-col items-center">
                        <h4 className="text-xs font-bold text-gray-300 mb-2 uppercase tracking-wider">Mix Comida</h4>
                        <div className="h-40 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieDataFood}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={35}
                                        outerRadius={55}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {pieDataFood.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={['#eab308', '#f97316', '#ef4444'][index % 3]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip 
                                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '0.5rem', fontSize: '10px' }}
                                        itemStyle={{ color: '#e5e7eb' }}
                                        formatter={(value: number) => [`${value} Unid.`, 'Cantidad']}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex gap-2 justify-center flex-wrap mt-2">
                             {pieDataFood.slice(0, 3).map((entry, i) => (
                                 <div key={i} className="flex items-center gap-1 text-[9px] text-gray-400">
                                     <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#eab308', '#f97316', '#ef4444'][i % 3] }}></div>
                                     <span className="truncate max-w-[60px]">{entry.name}</span>
                                 </div>
                             ))}
                        </div>
                    </div>
                </div>

                {/* Ranking List */}
                <div className="bg-card-bg rounded-xl border border-gray-700 overflow-hidden">
                    <div className="p-3 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
                        <h3 className="font-bold text-gray-200 text-sm">Ranking Detallado</h3>
                        <span className="text-[10px] text-gray-500 bg-gray-900 px-2 py-1 rounded-full">Top Performers</span>
                    </div>
                    
                    <div className="divide-y divide-gray-800">
                        {productRanking.length > 0 ? productRanking.map((prod, idx) => (
                            <div key={idx} className="p-3 hover:bg-gray-800/30 transition-colors">
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${idx < 3 ? 'bg-emoliente-amber text-black' : 'bg-gray-700 text-gray-400'}`}>
                                            {idx + 1}
                                        </div>
                                        <span className="text-sm font-medium text-gray-200">{prod.name}</span>
                                    </div>
                                    <span className="text-sm font-bold text-emoliente-green font-mono">S/ {prod.revenue.toFixed(2)}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-blue-500 rounded-full" 
                                            style={{ width: `${(prod.revenue / productRanking[0].revenue) * 100}%` }} 
                                        />
                                    </div>
                                    <span className="text-[10px] text-gray-500 w-12 text-right">{prod.qty} Unid.</span>
                                </div>
                            </div>
                        )) : (
                            <div className="p-8 text-center text-gray-500 text-xs">Aún no hay ventas registradas en este periodo.</div>
                        )}
                    </div>
                </div>

                <div className="p-3 bg-blue-900/10 border border-blue-500/20 rounded-xl flex gap-3">
                    <Award className="w-5 h-5 text-blue-400 flex-shrink-0" />
                    <div>
                        <p className="text-xs font-bold text-blue-300 mb-1">Producto Estrella</p>
                        <p className="text-xs text-gray-400">
                            El producto <strong>{productRanking[0]?.name || 'N/A'}</strong> domina tu ranking.
                        </p>
                    </div>
                </div>
            </div>
        )}

        {/* === TAB 3: AUDIT (REAL-TIME HISTORY) === */}
        {activeTab === 'AUDIT' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 h-full flex flex-col">
                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input 
                      type="text" 
                      placeholder="Buscar por producto, monto o tipo..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-purple-400 transition-colors"
                    />
                </div>

                {/* List Container */}
                <div className="flex-1 bg-card-bg rounded-xl border border-gray-700 overflow-hidden flex flex-col">
                    <div className="p-3 bg-gray-800/50 border-b border-gray-700 flex justify-between items-center">
                        <h3 className="font-bold text-gray-200 text-sm flex items-center gap-2">
                           <List className="w-4 h-4 text-purple-400" /> Registro de Base de Datos
                        </h3>
                        <span className="text-[10px] text-gray-400 bg-gray-900 px-2 py-1 rounded">
                           {filteredTransactions.length} Movimientos
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                        {filteredTransactions.length > 0 ? (
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-900/50 sticky top-0 z-10 text-[10px] uppercase text-gray-500 font-bold">
                                    <tr>
                                        <th className="p-3">Hora</th>
                                        <th className="p-3">Descripción</th>
                                        <th className="p-3 text-right">Monto</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-gray-800">
                                    {filteredTransactions.map((t) => {
                                        const date = new Date(t.timestamp);
                                        const dateStr = date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' });
                                        const timeStr = date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                                        
                                        return (
                                            <tr key={t.id} className="hover:bg-gray-800/50 transition-colors">
                                                <td className="p-3 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="font-mono text-white font-bold">{timeStr}</span>
                                                        <span className="text-[9px] text-gray-500">{dateStr}</span>
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`p-1.5 rounded-full ${t.type === 'SALE' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                           {t.type === 'SALE' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                                                        </div>
                                                        <span className="text-gray-300 truncate max-w-[140px] md:max-w-xs block" title={t.description}>
                                                            {t.description}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-3 text-right">
                                                    <span className={`font-mono font-bold ${t.type === 'SALE' ? 'text-emoliente-green' : 'text-red-400'}`}>
                                                       {t.type === 'SALE' ? '+' : '-'} S/ {(t.amount || 0).toFixed(2)}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-8 text-center text-gray-500 text-xs italic">
                                No se encontraron registros con ese criterio.
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="p-3 bg-purple-900/10 border border-purple-500/20 rounded-xl flex gap-3">
                    <Filter className="w-5 h-5 text-purple-400 flex-shrink-0" />
                    <div>
                        <p className="text-xs font-bold text-purple-300 mb-1">Auditoría Transparente</p>
                        <p className="text-xs text-gray-400">
                            Este registro muestra la data cruda de la base de datos sin agrupar, permitiéndote verificar cada centavo ingresado o gastado.
                        </p>
                    </div>
                </div>
            </div>
        )}

        {/* === TAB 4: DASHBOARD (GRID LAYOUT) === */}
        {activeTab === 'INSIGHTS' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 pb-20">
                
                {/* ROW 1: TOP KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* KPI 1: Total Orders */}
                    <div className="bg-card-bg p-4 rounded-xl border border-gray-700 shadow-lg relative overflow-hidden group hover:border-gray-600 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-xs text-gray-400 uppercase font-bold">Ordenes Totales</p>
                            <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                                <ShoppingBag className="w-4 h-4" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold text-white font-mono">{dashboardStats.totalOrders}</h3>
                        <p className="text-[10px] text-gray-500 mt-1">Transacciones realizadas</p>
                    </div>

                    {/* KPI 2: Customers (Proxy via Orders for now) */}
                    <div className="bg-card-bg p-4 rounded-xl border border-gray-700 shadow-lg relative overflow-hidden group hover:border-gray-600 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-xs text-gray-400 uppercase font-bold">Ticket Promedio</p>
                            <div className="p-1.5 bg-purple-500/10 rounded-lg text-purple-400 group-hover:bg-purple-500/20 transition-colors">
                                <Target className="w-4 h-4" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold text-white font-mono">S/ {kpis.avgTicket.toFixed(2)}</h3>
                        <p className="text-[10px] text-gray-500 mt-1">Promedio por venta</p>
                    </div>

                    {/* KPI 3: Revenue */}
                    <div className="bg-card-bg p-4 rounded-xl border border-gray-700 shadow-lg relative overflow-hidden group hover:border-gray-600 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-xs text-gray-400 uppercase font-bold">Ingresos Totales</p>
                            <div className="p-1.5 bg-emoliente-green/10 rounded-lg text-emoliente-green group-hover:bg-emoliente-green/20 transition-colors">
                                <DollarSign className="w-4 h-4" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold text-white font-mono">S/ {kpis.totalRev.toFixed(0)}</h3>
                        <div className="flex items-center gap-1 mt-1">
                             {comparison.growth >= 0 ? <ArrowUp className="w-3 h-3 text-green-500" /> : <ArrowDown className="w-3 h-3 text-red-500" />}
                             <span className={`text-[10px] font-bold ${comparison.growth >= 0 ? 'text-green-500' : 'text-red-500'}`}>{Math.abs(comparison.growth).toFixed(1)}%</span>
                             <span className="text-[10px] text-gray-500">vs ayer</span>
                        </div>
                    </div>

                    {/* KPI 4: Profit */}
                    <div className="bg-card-bg p-4 rounded-xl border border-gray-700 shadow-lg relative overflow-hidden group hover:border-gray-600 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-xs text-gray-400 uppercase font-bold">Ganancia Neta</p>
                            <div className="p-1.5 bg-yellow-500/10 rounded-lg text-yellow-400 group-hover:bg-yellow-500/20 transition-colors">
                                <Award className="w-4 h-4" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold text-white font-mono">S/ {kpis.totalProf.toFixed(0)}</h3>
                        <p className="text-[10px] text-gray-500 mt-1">{kpis.margin.toFixed(0)}% Margen Operativo</p>
                    </div>
                </div>

                {/* ROW 2: CHARTS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* Chart 1: Sales Trend (Line) */}
                    <div className="bg-card-bg p-4 rounded-xl border border-gray-700 shadow-lg flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-xs font-bold text-gray-300 uppercase flex items-center gap-2">
                                <Activity className="w-3 h-3 text-blue-400" /> Tendencia de Ventas
                            </h4>
                        </div>
                        <div className="flex-1 min-h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                    <XAxis dataKey="label" hide />
                                    <YAxis hide />
                                    <RechartsTooltip 
                                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                                        formatter={(val: number) => [`S/ ${val}`, 'Venta']}
                                    />
                                    <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={1} fill="url(#colorVal)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Chart 2: Category Distribution (Bar) */}
                    <div className="bg-card-bg p-4 rounded-xl border border-gray-700 shadow-lg flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-xs font-bold text-gray-300 uppercase flex items-center gap-2">
                                <PieChartIcon className="w-3 h-3 text-purple-400" /> Ventas por Categoría
                            </h4>
                        </div>
                        <div className="flex-1 min-h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={dashboardStats.categoryStats} margin={{ left: 0, right: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 10, fill: '#9ca3af'}} />
                                    <RechartsTooltip 
                                        cursor={{fill: '#374151', opacity: 0.4}}
                                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                                        formatter={(val: number) => [`S/ ${val.toFixed(0)}`, 'Venta']}
                                    />
                                    <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Chart 3: Popular Products (Pie) */}
                    <div className="bg-card-bg p-4 rounded-xl border border-gray-700 shadow-lg flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-xs font-bold text-gray-300 uppercase flex items-center gap-2">
                                <Award className="w-3 h-3 text-yellow-400" /> Top Productos
                            </h4>
                        </div>
                        <div className="flex-1 min-h-[200px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={productRanking.slice(0, 5)}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={40}
                                        outerRadius={70}
                                        paddingAngle={5}
                                        dataKey="revenue"
                                    >
                                        {productRanking.slice(0, 5).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={['#eab308', '#f97316', '#ef4444', '#ec4899', '#a855f7'][index % 5]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip 
                                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                                        formatter={(val: number) => [`S/ ${val.toFixed(0)}`, 'Venta']}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Legend Overlay */}
                            <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-2 flex-wrap">
                                {productRanking.slice(0, 3).map((p, i) => (
                                    <div key={i} className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#eab308', '#f97316', '#ef4444'][i] }}></div>
                                        <span className="text-[9px] text-gray-400 truncate max-w-[50px]">{p.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ROW 3: BOTTOM SECTION */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* Expense Breakdown */}
                    <div className="bg-card-bg p-4 rounded-xl border border-gray-700 shadow-lg">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-xs font-bold text-gray-300 uppercase flex items-center gap-2">
                                <ArrowDownLeft className="w-3 h-3 text-red-400" /> Gastos ({dashboardStats.expenseStats.length})
                            </h4>
                            <span className="text-xs font-mono text-red-400 font-bold">- S/ {dashboardStats.totalExpenses.toFixed(0)}</span>
                        </div>
                        <div className="space-y-3">
                            {dashboardStats.expenseStats.length > 0 ? dashboardStats.expenseStats.slice(0, 4).map((exp, idx) => (
                                <div key={idx} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                        <span className="text-xs text-gray-300">{exp.name}</span>
                                    </div>
                                    <span className="text-xs font-mono text-gray-400">S/ {exp.value.toFixed(0)}</span>
                                </div>
                            )) : (
                                <p className="text-xs text-gray-500 italic text-center py-4">Sin gastos registrados</p>
                            )}
                        </div>
                    </div>

                    {/* Product List Table */}
                    <div className="md:col-span-2 bg-card-bg p-4 rounded-xl border border-gray-700 shadow-lg overflow-hidden">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-xs font-bold text-gray-300 uppercase flex items-center gap-2">
                                <List className="w-3 h-3 text-gray-400" /> Detalle de Productos
                            </h4>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="text-[10px] uppercase text-gray-500 font-bold border-b border-gray-700">
                                    <tr>
                                        <th className="pb-2">Producto</th>
                                        <th className="pb-2 text-right">Ordenes</th>
                                        <th className="pb-2 text-right">Ingresos</th>
                                        <th className="pb-2 text-right">% Total</th>
                                    </tr>
                                </thead>
                                <tbody className="text-xs divide-y divide-gray-800">
                                    {productRanking.slice(0, 5).map((prod, idx) => (
                                        <tr key={idx} className="group hover:bg-gray-800/50 transition-colors">
                                            <td className="py-2 text-gray-300 font-medium">{prod.name}</td>
                                            <td className="py-2 text-right text-gray-400">{prod.qty}</td>
                                            <td className="py-2 text-right text-emoliente-green font-mono">S/ {prod.revenue.toFixed(2)}</td>
                                            <td className="py-2 text-right text-gray-500">
                                                {((prod.revenue / kpis.totalRev) * 100).toFixed(1)}%
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>

                <div className="text-center pt-4">
                    <p className="text-[10px] text-gray-600 font-mono">
                        Panel de Control en Vivo • {new Date().toLocaleDateString()}
                    </p>
                </div>

            </div>
        )}

      </div>
    </div>
  );
};