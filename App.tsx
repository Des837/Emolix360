import React, { useState, useRef, useEffect } from 'react';
import { useEmolienteStore } from './hooks/useEmolienteStore';
import { dbService } from './services/dbService';
import { StatCard } from './components/StatCard';
import { HistoryLog } from './components/HistoryLog';
import { CostCalculator } from './components/CostCalculator';
import { AuthScreen } from './components/AuthScreen';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { generateAIResponse } from './services/geminiService';
import { 
  TrendingUp, 
  Send, 
  ShoppingBag,
  Settings,
  X,
  Sparkles,
  Loader2,
  Utensils,
  PlusCircle,
  Trash2,
  Receipt,
  Layers,
  Banknote,
  LogOut,
  BarChart3
} from 'lucide-react';
import { ProductCategory } from './types';

// Common aliases for command parsing
const EXPENSE_ALIASES = ['gasto', 'compra', 'g'];

const App: React.FC = () => {
  const { 
    state, 
    loginUser,
    logoutUser,
    setActiveProduct, 
    updateProduct, 
    addSale, 
    addExpense, 
    setLastMessage,
    addToCart,
    removeFromCart,
    checkoutCart,
    clearCart,
    wipeSession
  } = useEmolienteStore();

  const [inputValue, setInputValue] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  
  const [showAuth, setShowAuth] = useState(!state.user);
  
  // New State for Combo Mode
  const [isComboMode, setIsComboMode] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of logs on update
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state.history, state.lastMessage]);

  // If user logs in successfully, close auth
  useEffect(() => {
    if (state.user) setShowAuth(false);
  }, [state.user]);

  const activeProduct = state.products.find(p => p.id === state.activeProductId) || state.products[0];

  // Calculated Totals for Cart
  const cartTotalPV = state.cart.reduce((sum, item) => sum + item.pv, 0);

  // --- AUTH HANDLER ---
  const handleAuth = (name: string, pass: string) => {
    const result = dbService.loginOrRegister(name, pass);
    if ('error' in result) {
        setAuthError(result.error);
    } else {
        setAuthError(null);
        loginUser(result);
    }
  };

  const handleGuest = () => {
    setShowAuth(false);
  };

  const handleCommand = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const rawInput = inputValue.trim();
    if (!rawInput) return;

    setInputValue(''); // Clear input immediately
    
    const parts = rawInput.split(' ');
    const command = parts[0].toLowerCase();
    const arg1 = parts[1];

    // --- 1. EXPENSES ---
    if (EXPENSE_ALIASES.includes(command)) {
      const amount = parseFloat(arg1);
      const desc = parts.slice(2).join(' ') || 'Insumos varios';
      
      if (!isNaN(amount) && amount > 0) {
        addExpense(amount, desc);
        return;
      }
    }

    // --- 2. FALLBACK: AI QUERY ---
    setIsProcessingAI(true);
    setLastMessage("🤔 Consultando experto...");
    
    const aiResponse = await generateAIResponse(rawInput, state, 'ANALYSIS');
    setLastMessage(aiResponse);
    setIsProcessingAI(false);
  };

  const handleQuickAdd = (n: number) => {
    addSale(n);
  };

  const handleProductClick = (product: any) => {
    if (isComboMode) {
      addToCart(product);
      // Small vibration for haptic feedback if supported
      if (navigator.vibrate) navigator.vibrate(50);
    } else {
      setActiveProduct(product.id);
    }
  };

  const getCategoryColor = (cat: ProductCategory) => {
    switch(cat) {
      case 'MEDICINAL': return 'text-green-400';
      case 'FRUTADO': return 'text-orange-400';
      case 'ESPECIAL': return 'text-purple-400';
      case 'COMIDA': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  // --- RENDER AUTH SCREEN IF NOT LOGGED IN ---
  if (showAuth && !state.user) {
    return <AuthScreen onAuth={handleAuth} onGuest={handleGuest} error={authError} />;
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-emoliente-dark flex flex-col relative shadow-2xl overflow-hidden font-sans">
      
      {/* Analytics Modal */}
      {showAnalytics && (
        <AnalyticsDashboard 
          state={state} 
          onClose={() => setShowAnalytics(false)} 
          onClearData={wipeSession}
          onRequestLogin={() => {
            setShowAnalytics(false);
            setShowAuth(true);
          }}
        />
      )}

      {/* Header */}
      <header className="p-4 bg-emoliente-bg border-b border-gray-800 flex justify-between items-center sticky top-0 z-20 shadow-md">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emoliente-green/10 rounded-lg border border-emoliente-green/20">
            <Utensils className="w-5 h-5 text-emoliente-green" />
          </div>
          <div>
            <h1 className="font-bold text-gray-100 leading-tight tracking-tight truncate max-w-[120px]">
              {state.user ? state.user.businessName : 'Modo Invitado'}
            </h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">
              {state.user ? 'Gestión Profesional' : 'Sin Sincronización'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
            {!state.user && (
              <button 
                onClick={() => setShowAuth(true)}
                className="px-3 py-1.5 bg-emoliente-green text-white text-[10px] font-bold rounded-full mr-1 animate-pulse"
              >
                Suscribirse
              </button>
            )}

            <button 
                onClick={() => setShowAnalytics(true)}
                className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                title="Ver Reportes"
            >
                <BarChart3 className="w-5 h-5" />
            </button>
            
            <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-full transition-all ${showSettings ? 'bg-emoliente-green text-white rotate-90' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
            title="Configurar Precios"
            >
            <Settings className="w-5 h-5" />
            </button>
            {state.user && (
              <button
                onClick={logoutUser}
                className="p-2 rounded-full text-gray-500 hover:text-red-400 hover:bg-gray-800"
                title="Salir"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-48 custom-scrollbar">
        
        {/* Costing / Product Settings Overlay */}
        {showSettings && (
          <div className="bg-card-bg p-4 rounded-xl border border-gray-700 mb-4 animate-in fade-in slide-in-from-top-4 shadow-2xl">
             <div className="flex justify-between items-center mb-3">
               <h3 className="font-bold text-gray-200">Ingeniería de Menú</h3>
               <button onClick={() => {setShowSettings(false); setEditingProduct(null);}}><X className="w-4 h-4" /></button>
             </div>
             
             {editingProduct ? (
               <CostCalculator 
                  product={state.products.find(p => p.id === editingProduct)!}
                  onSave={updateProduct}
                  onClose={() => setEditingProduct(null)}
               />
             ) : (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 mb-2">Toca un producto para ajustar sus costos (Olla vs Vaso).</p>
                  <div className="max-h-64 overflow-y-auto pr-1 custom-scrollbar space-y-2">
                    {state.products.map(p => (
                      <div key={p.id} onClick={() => setEditingProduct(p.id)} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700 active:scale-95 transition-transform cursor-pointer hover:bg-gray-700">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{p.icon}</span>
                          <div>
                            <p className="font-bold text-sm text-gray-200">{p.name}</p>
                            <p className={`text-[10px] uppercase font-bold ${getCategoryColor(p.category)}`}>{p.category}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="block font-mono text-emoliente-green font-bold text-sm">PV: S/ {p.pv.toFixed(2)}</span>
                          <span className="block text-[10px] text-gray-500">Costo: S/ {p.cu.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
             )}
          </div>
        )}

        {/* Global Stats - REORGANIZED LAYOUT */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard 
            label="Ingreso Total" 
            value={`S/ ${state.totalRevenue.toFixed(2)}`} 
            icon={<Banknote />} 
            color="blue" 
            highlight 
          />
          <StatCard 
            label="Utilidad Neta" 
            value={`S/ ${state.ut.toFixed(2)}`} 
            icon={<TrendingUp />} 
            color="green" 
            highlight 
          />
        </div>
        
        {/* Sales Counter - Full Width */}
        <div className="grid grid-cols-1 gap-3">
          <StatCard 
            label="Ventas Hoy (Cantidad Items)" 
            value={state.cv} 
            icon={<ShoppingBag />} 
            color="amber" 
          />
        </div>

        {/* AI / System Feedback */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg p-4 border-l-4 border-emoliente-green shadow-lg">
          <div className="flex items-start gap-3">
            <div className="mt-1">
              {isProcessingAI ? (
                <Loader2 className="w-5 h-5 text-emoliente-green animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5 text-emoliente-green" />
              )}
            </div>
            <div className="flex-1">
               <p className="text-sm text-gray-300 whitespace-pre-line leading-relaxed font-medium">
                 {state.lastMessage}
               </p>
            </div>
          </div>
        </div>

        {/* History */}
        <HistoryLog transactions={state.history} />
        
        {/* Invisible element to scroll to */}
        <div ref={bottomRef} className="h-4" />
      </main>

      {/* Fixed Bottom Action Area */}
      <div className={`absolute bottom-0 left-0 right-0 z-30 shadow-[0_-4px_30px_rgba(0,0,0,0.6)] backdrop-blur-sm transition-colors duration-300 ${isComboMode ? 'bg-gray-900/95 border-t-2 border-emoliente-amber' : 'bg-emoliente-bg/95 border-t border-gray-800'}`}>
        
        {/* MODE TOGGLE */}
        <div className="flex justify-between items-center px-4 py-2 border-b border-gray-700/50">
           <div className="flex items-center gap-2">
             <Layers className={`w-4 h-4 ${isComboMode ? 'text-emoliente-amber' : 'text-gray-500'}`} />
             <span className={`text-xs font-bold uppercase ${isComboMode ? 'text-emoliente-amber' : 'text-gray-500'}`}>
                {isComboMode ? 'Modo Combo / Pedido' : 'Modo Rápido'}
             </span>
           </div>
           <button 
             onClick={() => {
                setIsComboMode(!isComboMode);
                if(isComboMode && state.cart.length > 0) {
                    // Alert user if needed, or just keep cart
                }
             }}
             className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isComboMode ? 'bg-emoliente-amber' : 'bg-gray-700'}`}
           >
             <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isComboMode ? 'translate-x-6' : 'translate-x-1'}`} />
           </button>
        </div>

        {/* 1. Product Tabs (Horizontal Scroll) */}
        {/* Logic: If Combo Mode, clicking adds to cart. If Single, it selects active. */}
        <div className="flex overflow-x-auto p-3 gap-3 hide-scrollbar border-b border-gray-800/50">
          {state.products.map(p => (
            <button
              key={p.id}
              onClick={() => handleProductClick(p)}
              className={`flex flex-col items-center gap-1 min-w-[70px] p-2 rounded-xl transition-all duration-200 border relative ${
                !isComboMode && state.activeProductId === p.id 
                ? 'bg-gray-700 border-emoliente-green shadow-lg -translate-y-1' 
                : 'bg-gray-800/50 border-transparent hover:bg-gray-800 text-gray-400'
              } ${isComboMode ? 'active:scale-90 active:bg-emoliente-amber/20' : ''}`}
            >
              <span className="text-xl filter drop-shadow-md">{p.icon}</span>
              <span className={`text-[9px] font-bold uppercase leading-none text-center ${!isComboMode && state.activeProductId === p.id ? 'text-white' : 'text-gray-500'}`}>{p.name.split(' ')[0]}</span>
              {isComboMode && <PlusCircle className="absolute top-1 right-1 w-3 h-3 text-emoliente-amber opacity-70" />}
            </button>
          ))}
        </div>

        <div className="p-4 pb-6">
          
          {/* INTERFACE SWITCH: COMBO MODE vs SINGLE MODE */}
          {isComboMode ? (
            <div className="space-y-3">
               {/* Cart Summary */}
               <div className="bg-black/30 rounded-lg p-3 min-h-[100px] border border-gray-700 relative">
                  {state.cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 py-4">
                        <ShoppingBag className="w-6 h-6 mb-2 opacity-50" />
                        <p className="text-xs">Toca los productos arriba para armar el combo</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                        <div className="max-h-[100px] overflow-y-auto pr-1 custom-scrollbar">
                           {state.cart.map((item, idx) => (
                             <div key={item.uniqueId} className="flex justify-between items-center text-sm border-b border-gray-800 pb-1 mb-1 last:border-0">
                                <span className="text-gray-300 flex items-center gap-2">
                                  {state.products.find(p => p.id === item.productId)?.icon} {item.name}
                                </span>
                                <div className="flex items-center gap-3">
                                   <span className="font-mono text-gray-400">S/ {item.pv.toFixed(2)}</span>
                                   <button onClick={() => removeFromCart(item.uniqueId)} className="text-red-400 hover:text-red-300">
                                     <Trash2 className="w-4 h-4" />
                                   </button>
                                </div>
                             </div>
                           ))}
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-gray-600">
                           <button onClick={clearCart} className="text-[10px] text-red-400 underline">Limpiar</button>
                           <div className="text-right">
                              <span className="text-xs text-gray-400 mr-2">TOTAL A COBRAR:</span>
                              <span className="text-xl font-bold font-mono text-emoliente-amber">S/ {cartTotalPV.toFixed(2)}</span>
                           </div>
                        </div>
                    </div>
                  )}
               </div>

               <button 
                 onClick={checkoutCart}
                 disabled={state.cart.length === 0}
                 className="w-full py-3 rounded-xl bg-emoliente-amber text-white font-bold text-lg shadow-lg shadow-amber-900/50 disabled:opacity-50 disabled:shadow-none hover:bg-amber-600 transition-all active:scale-95 flex items-center justify-center gap-2"
               >
                 <Receipt className="w-5 h-5" /> REGISTRAR VENTA
               </button>
            </div>
          ) : (
            /* SINGLE MODE (Standard) */
            <>
                {/* Total Visualizer for Quick Mode */}
                <div className="flex justify-between items-end mb-2 px-1">
                   <p className="text-[10px] text-gray-400 uppercase tracking-wider">Registro Rápido</p>
                   <p className="text-[10px] text-emoliente-green font-bold uppercase tracking-wider">Cobrar:</p>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                    <button 
                    onClick={() => handleQuickAdd(1)}
                    className="group relative flex flex-col items-center justify-center p-3 rounded-xl bg-gray-700 hover:bg-gray-600 active:bg-emoliente-green active:scale-95 transition-all duration-100 border-b-4 border-gray-900 active:border-b-0 active:translate-y-1 overflow-hidden"
                    >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                    <span className="text-sm font-bold text-white z-10 opacity-70 mb-1">+1</span>
                    <span className="text-xl font-mono font-bold text-emoliente-green z-10 mb-1">S/ {(activeProduct.pv * 1).toFixed(2)}</span>
                    <span className="text-[9px] uppercase text-gray-400 font-bold z-10 truncate w-full text-center">{activeProduct.name}</span>
                    </button>
                    
                    <button 
                    onClick={() => handleQuickAdd(2)}
                    className="group relative flex flex-col items-center justify-center p-3 rounded-xl bg-gray-700 hover:bg-gray-600 active:bg-emoliente-green active:scale-95 transition-all duration-100 border-b-4 border-gray-900 active:border-b-0 active:translate-y-1 overflow-hidden"
                    >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                    <span className="text-sm font-bold text-white z-10 opacity-70 mb-1">+2</span>
                    <span className="text-xl font-mono font-bold text-emoliente-green z-10 mb-1">S/ {(activeProduct.pv * 2).toFixed(2)}</span>
                    <span className="text-[9px] uppercase text-gray-400 font-bold z-10">Para llevar</span>
                    </button>

                    <button 
                    onClick={() => handleQuickAdd(3)}
                    className="group relative flex flex-col items-center justify-center p-3 rounded-xl bg-gray-700 hover:bg-gray-600 active:bg-emoliente-green active:scale-95 transition-all duration-100 border-b-4 border-gray-900 active:border-b-0 active:translate-y-1 overflow-hidden"
                    >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                    <span className="text-sm font-bold text-white z-10 opacity-70 mb-1">+3</span>
                    <span className="text-xl font-mono font-bold text-emoliente-green z-10 mb-1">S/ {(activeProduct.pv * 3).toFixed(2)}</span>
                    <span className="text-[9px] uppercase text-gray-400 font-bold z-10">Promo</span>
                    </button>
                </div>

                {/* Command Input */}
                <form onSubmit={handleCommand} className="relative group">
                    <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={`Escribe: GASTO 5 Gas...`}
                    className="w-full bg-black/40 border border-gray-600 text-white rounded-xl py-3 pl-4 pr-12 focus:outline-none focus:border-emoliente-green focus:ring-1 focus:ring-emoliente-green placeholder-gray-500 font-mono text-sm transition-all"
                    />
                    <button 
                    type="submit"
                    disabled={!inputValue.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-emoliente-green rounded-lg text-white hover:bg-green-600 disabled:opacity-50 disabled:bg-gray-600 transition-colors shadow-lg"
                    >
                    {isProcessingAI ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4" />}
                    </button>
                </form>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default App;