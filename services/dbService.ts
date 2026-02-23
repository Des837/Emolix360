import { DailySummary, UserProfile } from "../types";

const DB_PREFIX = 'emoliente_smart_db_';

// Simula una base de datos usando LocalStorage pero estructurada
export const dbService = {
  
  // --- AUTH ---
  loginOrRegister: (businessName: string, password: string): UserProfile | { error: string } => {
    const key = `${DB_PREFIX}user_${businessName.toLowerCase().replace(/\s+/g, '_')}`;
    const stored = localStorage.getItem(key);

    if (stored) {
      // Login attempt
      const user = JSON.parse(stored) as UserProfile;
      if (user.passwordHash === password) { // En producción usaríamos un hash real
        return user;
      } else {
        return { error: 'Contraseña incorrecta' };
      }
    } else {
      // Register new
      const newUser: UserProfile = {
        businessName,
        passwordHash: password,
        createdAt: new Date().toISOString()
      };
      localStorage.setItem(key, JSON.stringify(newUser));
      return newUser;
    }
  },

  // --- HISTORICAL DATA ---
  saveDailyClose: (summary: DailySummary, businessName: string) => {
    const key = `${DB_PREFIX}history_${businessName.toLowerCase().replace(/\s+/g, '_')}`;
    const currentHistoryStr = localStorage.getItem(key);
    const currentHistory: DailySummary[] = currentHistoryStr ? JSON.parse(currentHistoryStr) : [];
    
    // Check if entry for today exists, MERGE or push
    const index = currentHistory.findIndex(h => h.date === summary.date);
    if (index >= 0) {
      // Merge with existing day
      const existing = currentHistory[index];
      existing.totalRevenue += summary.totalRevenue;
      existing.totalProfit += summary.totalProfit;
      existing.totalItems += summary.totalItems;
      existing.expenses += summary.expenses;
      
      // Merge transactions (avoid duplicates if any, though unlikely with UUIDs)
      const existingIds = new Set(existing.transactions.map(t => t.id));
      const newTransactions = summary.transactions.filter(t => !existingIds.has(t.id));
      existing.transactions = [...existing.transactions, ...newTransactions];
      
      // Update top product (simple override or recalculate - here we override for simplicity as dashboard recalculates)
      existing.topProduct = summary.topProduct || existing.topProduct;

      currentHistory[index] = existing;
    } else {
      currentHistory.push(summary);
    }

    localStorage.setItem(key, JSON.stringify(currentHistory));
  },

  getHistory: (businessName: string): DailySummary[] => {
    const key = `${DB_PREFIX}history_${businessName.toLowerCase().replace(/\s+/g, '_')}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  },

  clearHistory: (businessName: string) => {
    const key = `${DB_PREFIX}history_${businessName.toLowerCase().replace(/\s+/g, '_')}`;
    localStorage.removeItem(key);
  },

  // --- ANALYTICS CALCULATIONS ---
  getAnalytics: (businessName: string) => {
    const history = dbService.getHistory(businessName);
    
    // Sort by date
    history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const totalRevenueAllTime = history.reduce((sum, day) => sum + day.totalRevenue, 0);
    const totalProfitAllTime = history.reduce((sum, day) => sum + day.totalProfit, 0);
    
    // Last 7 days trend
    const last7Days = history.slice(-7);
    
    // Product aggregation (needs deep parsing of transactions if detailed)
    // For simplicity, we track the "topProduct" string stored in daily summary
    const productPopularity: Record<string, number> = {};
    history.forEach(day => {
        if(day.topProduct) {
            productPopularity[day.topProduct] = (productPopularity[day.topProduct] || 0) + 1;
        }
    });

    return {
      history,
      totalRevenueAllTime,
      totalProfitAllTime,
      last7Days,
      daysTracked: history.length
    };
  }
};