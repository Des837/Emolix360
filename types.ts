export type TransactionType = 'SALE' | 'EXPENSE' | 'ADJUSTMENT' | 'CLOSE';

export type ProductCategory = 'MEDICINAL' | 'FRUTADO' | 'ESPECIAL' | 'COMIDA';

export interface Ingredient {
  id: string;
  name: string;
  cost: number;
}

export interface CostDetails {
  batchCosts: Ingredient[]; // Lista de insumos de la olla/relleno
  batchYield: number;       // Rendimiento del lote
  gasCost: number;          // Costo de gas/energía
  addOnsCost: number;       // Costos variables (pan, limón)
  packagingCost: number;    // Descartables
  specificCost: number;     // Costo específico (fruta, extras)
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  cu: number; // Costo Unitario total
  pv: number; // Precio Venta
  icon: string;
  taxRate?: number; // Porcentaje de impuesto (ej. 1.5 para RUS, 18 para IGV)
  costDetails?: CostDetails; // Detalle de estructura de costos
}

export interface CartItem {
  uniqueId: string; // ID único para este item en el carrito (para poder borrar uno específico si hay duplicados)
  productId: string;
  name: string;
  pv: number;
  cu: number;
  category: ProductCategory;
}

export interface Transaction {
  id: string;
  timestamp: string; // ISO string
  type: TransactionType;
  productId?: string;
  productName?: string;
  quantity?: number; // For sales
  items?: CartItem[]; // Para ventas combinadas (Combos)
  amount?: number; // Monetary value (costs or adjustments)
  description: string;
  snapshotCV: number;
  snapshotUT: number;
  snapshotTR?: number; // Snapshot Total Revenue
}

export interface UserProfile {
  businessName: string;
  passwordHash: string; // Simple hash representation
  createdAt: string;
}

export interface DailySummary {
  date: string; // YYYY-MM-DD
  totalRevenue: number;
  totalProfit: number;
  totalItems: number;
  expenses: number;
  topProduct: string;
  transactions: Transaction[];
}

export interface AppState {
  user: UserProfile | null; // Auth State
  products: Product[];
  activeProductId: string;
  cart: CartItem[]; // Estado del pedido actual (Combo)
  cv: number; // Contador Vasos (Total Global del día actual)
  ut: number; // Utilidad Total (Global del día actual)
  totalRevenue: number; // Ingreso Bruto Total del día actual
  history: Transaction[];
  lastMessage: string | null;
}