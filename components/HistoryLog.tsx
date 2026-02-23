import React from 'react';
import { Transaction } from '../types';
import { ArrowUpRight, ArrowDownLeft, Receipt, RefreshCcw, Lock } from 'lucide-react';

interface HistoryLogProps {
  transactions: Transaction[];
}

export const HistoryLog: React.FC<HistoryLogProps> = ({ transactions }) => {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 italic text-sm">
        No hay movimientos hoy. ¡Empieza a vender!
      </div>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'SALE': return <ArrowUpRight className="w-4 h-4 text-emoliente-green" />;
      case 'EXPENSE': return <ArrowDownLeft className="w-4 h-4 text-red-400" />;
      case 'ADJUSTMENT': return <RefreshCcw className="w-4 h-4 text-blue-400" />;
      case 'CLOSE': return <Lock className="w-4 h-4 text-emoliente-amber" />;
      default: return <Receipt className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-2">Historial Reciente</h3>
      <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
        {transactions.slice().reverse().map((t) => (
          <div key={t.id} className="flex items-center justify-between p-3 bg-card-bg rounded-lg border border-gray-800 text-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-800 rounded-full">
                {getIcon(t.type)}
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-gray-200">{t.description}</span>
                <span className="text-xs text-gray-500">
                  {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
            <div className="text-right">
               {t.type === 'SALE' && (
                 <span className="block font-mono font-bold text-emoliente-green">+{t.quantity}</span>
               )}
               {t.type === 'EXPENSE' && (
                 <span className="block font-mono font-bold text-red-400">- S/ {t.amount?.toFixed(2)}</span>
               )}
               {(t.type === 'ADJUSTMENT' || t.type === 'CLOSE') && (
                 <span className="block font-mono text-gray-400">INFO</span>
               )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};