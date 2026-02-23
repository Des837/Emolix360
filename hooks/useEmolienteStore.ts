import { useState, useEffect, useCallback } from 'react';
import { AppState, Transaction, Product, CartItem, UserProfile } from '../types';
import { dbService } from '../services/dbService';

// Based on market research from videos:
// Medicinal: Low cost base, high volume.
// Frutado: Higher cost due to fresh fruit, higher price.
// Especial: High margin add-ons (Maca, Polen).

const INITIAL_PRODUCTS: Product[] = [
  // Medicinales (Base Linaza/Cebada + Hierbas)
  { id: 'p1', name: 'Emoliente Clásico', category: 'MEDICINAL', cu: 0.60, pv: 2.00, icon: '🌿', taxRate: 0 },
  { id: 'p2', name: 'Emoliente c/ Sábila y Tocosh', category: 'MEDICINAL', cu: 0.80, pv: 2.50, icon: '🌵', taxRate: 0 },
  { id: 'p11', name: 'Extracto de Alfalfa', category: 'MEDICINAL', cu: 0.70, pv: 2.50, icon: '☘️', taxRate: 0 },
  { id: 'p12', name: 'Emoliente Mixto (Todo)', category: 'MEDICINAL', cu: 0.90, pv: 3.00, icon: '🍵', taxRate: 0 },
  
  // Frutados (Base + Fruta Licuada)
  { id: 'p3', name: 'Frutado de Fresa', category: 'FRUTADO', cu: 1.20, pv: 3.50, icon: '🍓', taxRate: 0 },
  { id: 'p4', name: 'Frutado de Maracuyá', category: 'FRUTADO', cu: 1.10, pv: 3.50, icon: '🍋', taxRate: 0 },
  { id: 'p5', name: 'Frutado Mixto (Tutifruti)', category: 'FRUTADO', cu: 1.30, pv: 4.00, icon: '🍹', taxRate: 0 },
  { id: 'p13', name: 'Frutado de Arándano', category: 'FRUTADO', cu: 1.40, pv: 4.00, icon: '🫐', taxRate: 0 },
  { id: 'p14', name: 'Frutado de Piña', category: 'FRUTADO', cu: 1.10, pv: 3.50, icon: '🍍', taxRate: 0 },

  // Especiales (Nutritivos)
  { id: 'p6', name: 'Especial (Maca/Polen/Algarrobina)', category: 'ESPECIAL', cu: 1.50, pv: 5.00, icon: '💪', taxRate: 0 },
  
  // Comida (Ticket promedio alto)
  { id: 'p7', name: 'Pan con Pollo', category: 'COMIDA', cu: 1.80, pv: 3.50, icon: '🥪', taxRate: 0 },
  { id: 'p8', name: 'Pan con Palta', category: 'COMIDA', cu: 1.50, pv: 3.00, icon: '🥑', taxRate: 0 },
  { id: 'p9', name: 'Pan con Queso', category: 'COMIDA', cu: 1.40, pv: 2.50, icon: '🧀', taxRate: 0 },
  { id: 'p10', name: 'Pan con Huevo', category: 'COMIDA', cu: 1.00, pv: 2.00, icon: '🥚', taxRate: 0 },
];

const INITIAL_STATE: AppState = {
  user: null,
  products: INITIAL_PRODUCTS,
  activeProductId: 'p1',
  cart: [],
  cv: 0,
  ut: 0,
  totalRevenue: 0, // Ingreso Bruto
  history: [],
  lastMessage: "👋 ¡Listo para la venta! Activa el 'Modo Combo' para registrar pedidos grandes.",
};

export const useEmolienteStore = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('emoliente_state_v3');
    const parsed = saved ? JSON.parse(saved) : INITIAL_STATE;
    // Migration helpers
    if (!parsed.cart) parsed.cart = [];
    if (parsed.totalRevenue === undefined) parsed.totalRevenue = 0;
    if (parsed.user === undefined) parsed.user = null;
    return parsed;
  });

  useEffect(() => {
    localStorage.setItem('emoliente_state_v3', JSON.stringify(state));
  }, [state]);

  const loginUser = (user: UserProfile) => {
    setState(prev => ({ ...prev, user }));
  };

  const logoutUser = () => {
    // 1. Snapshot current state before wiping
    const closedState = { ...state };
    
    // 2. Identify Top Product for the session (simple logic)
    const productCounts: Record<string, number> = {};
    closedState.history.forEach(t => {
      if(t.type === 'SALE' && t.productName) {
         productCounts[t.productName] = (productCounts[t.productName] || 0) + (t.quantity || 0);
      } else if (t.items) {
         t.items.forEach(i => {
           productCounts[i.name] = (productCounts[i.name] || 0) + 1;
         });
      }
    });
    
    const topProduct = Object.entries(productCounts).sort((a,b) => b[1] - a[1])[0]?.[0] || 'Varios';
    const totalExpenses = closedState.history
        .filter(t => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

    // 3. Save to Persistent DB if User is Logged In
    if (state.user) {
        dbService.saveDailyClose({
            date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
            totalRevenue: closedState.totalRevenue,
            totalProfit: closedState.ut,
            totalItems: closedState.cv,
            expenses: totalExpenses,
            topProduct: topProduct,
            transactions: closedState.history
        }, state.user.businessName);
    }

    // 4. Reset Active State and Logout
    setState({
        ...INITIAL_STATE,
        user: null, // Logout
        products: state.products, // Keep current prices/config
    });
  };

  const setActiveProduct = (id: string) => {
    setState(prev => ({ ...prev, activeProductId: id }));
  };

  const updateProduct = (updatedProduct: Product) => {
    setState(prev => ({
      ...prev,
      products: prev.products.map(p => p.id === updatedProduct.id ? updatedProduct : p)
    }));
  };

  // --- CART LOGIC ---
  const addToCart = useCallback((product: Product) => {
    setState(prev => ({
      ...prev,
      cart: [...prev.cart, {
        uniqueId: crypto.randomUUID(),
        productId: product.id,
        name: product.name,
        pv: product.pv,
        cu: product.cu,
        category: product.category
      }]
    }));
  }, []);

  const removeFromCart = useCallback((uniqueId: string) => {
    setState(prev => ({
      ...prev,
      cart: prev.cart.filter(item => item.uniqueId !== uniqueId)
    }));
  }, []);

  const clearCart = useCallback(() => {
    setState(prev => ({ ...prev, cart: [] }));
  }, []);

  const checkoutCart = useCallback(() => {
    setState(prev => {
      if (prev.cart.length === 0) return prev;

      const totalRevenue = prev.cart.reduce((sum, item) => sum + item.pv, 0);
      const totalCost = prev.cart.reduce((sum, item) => sum + item.cu, 0);
      const totalProfit = totalRevenue - totalCost;
      const itemCount = prev.cart.length;

      // Create a description listing items e.g. "Combo: 1x Clasico, 1x Pan Pollo"
      const counts = prev.cart.reduce((acc, item) => {
        acc[item.name] = (acc[item.name] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const descText = Object.entries(counts)
        .map(([name, count]) => `${count}x ${name}`)
        .join(', ');

      const newTransaction: Transaction = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        type: 'SALE',
        quantity: itemCount,
        items: [...prev.cart],
        amount: totalRevenue,
        description: `Combo: ${descText}`,
        snapshotCV: prev.cv + itemCount,
        snapshotUT: prev.ut + totalProfit,
        snapshotTR: prev.totalRevenue + totalRevenue
      };

      return {
        ...prev,
        cart: [],
        cv: prev.cv + itemCount,
        ut: prev.ut + totalProfit,
        totalRevenue: prev.totalRevenue + totalRevenue,
        history: [...prev.history, newTransaction],
        lastMessage: `✅ Venta Combo Registrada | Ingreso: S/ ${totalRevenue.toFixed(2)} | Ganancia: S/ ${totalProfit.toFixed(2)}`
      };
    });
  }, []);

  // --- SINGLE ITEM LOGIC ---
  const addSale = useCallback((quantity: number) => {
    setState(prev => {
      const activeProduct = prev.products.find(p => p.id === prev.activeProductId) || prev.products[0];
      
      const profitPerUnit = activeProduct.pv - activeProduct.cu;
      const totalProfit = profitPerUnit * quantity;
      const revenue = activeProduct.pv * quantity;
      
      const newTransaction: Transaction = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        type: 'SALE',
        productId: activeProduct.id,
        productName: activeProduct.name,
        quantity,
        amount: revenue,
        description: `Venta: ${quantity} x ${activeProduct.name}`,
        snapshotCV: prev.cv + quantity,
        snapshotUT: prev.ut + totalProfit,
        snapshotTR: prev.totalRevenue + revenue
      };

      return {
        ...prev,
        cv: prev.cv + quantity,
        ut: prev.ut + totalProfit,
        totalRevenue: prev.totalRevenue + revenue,
        history: [...prev.history, newTransaction],
        lastMessage: `✅ +${quantity} ${activeProduct.name} | Ingreso: S/ ${revenue.toFixed(2)}`
      };
    });
  }, []);

  const addExpense = useCallback((amount: number, description: string) => {
    setState(prev => {
      const newUT = prev.ut - amount;

      const newTransaction: Transaction = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        type: 'EXPENSE',
        amount,
        description: `Gasto: ${description}`,
        snapshotCV: prev.cv,
        snapshotUT: newUT,
        snapshotTR: prev.totalRevenue // Revenue doesn't change on expense
      };

      return {
        ...prev,
        ut: newUT,
        history: [...prev.history, newTransaction],
        lastMessage: `📉 Gasto registrado: S/ ${amount.toFixed(2)} (${description})`
      };
    });
  }, []);

  const resetDay = useCallback(() => {
    // 1. Snapshot current state before wiping
    const closedState = { ...state };
    
    // 2. Identify Top Product for the day
    const productCounts: Record<string, number> = {};
    closedState.history.forEach(t => {
      if(t.type === 'SALE' && t.productName) {
         productCounts[t.productName] = (productCounts[t.productName] || 0) + (t.quantity || 0);
      } else if (t.items) {
         t.items.forEach(i => {
           productCounts[i.name] = (productCounts[i.name] || 0) + 1;
         });
      }
    });
    
    const topProduct = Object.entries(productCounts).sort((a,b) => b[1] - a[1])[0]?.[0] || 'Varios';
    const totalExpenses = closedState.history
        .filter(t => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

    // 3. Save to Persistent DB if User is Logged In
    if (state.user) {
        dbService.saveDailyClose({
            date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
            totalRevenue: closedState.totalRevenue,
            totalProfit: closedState.ut,
            totalItems: closedState.cv,
            expenses: totalExpenses,
            topProduct: topProduct,
            transactions: closedState.history
        }, state.user.businessName);
    }

    // 4. Reset Active State
    setState({
        ...INITIAL_STATE,
        user: state.user, // Keep user logged in
        products: state.products, // Keep current prices
    });
    
    return closedState;
  }, [state]);

  const wipeSession = useCallback(() => {
    if (state.user) {
        dbService.clearHistory(state.user.businessName);
    }
    setState(prev => ({
        ...INITIAL_STATE,
        user: prev.user, // Keep user logged in
        products: prev.products, // Keep current prices
    }));
  }, [state.user]);

  const setLastMessage = (msg: string) => {
    setState(prev => ({ ...prev, lastMessage: msg }));
  };

  return {
    state,
    loginUser,
    logoutUser,
    setActiveProduct,
    updateProduct,
    addToCart,
    removeFromCart,
    clearCart,
    checkoutCart,
    addSale,
    addExpense,
    resetDay,
    wipeSession,
    setLastMessage
  };
};