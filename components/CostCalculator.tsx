import React, { useState, useEffect } from 'react';
import { Calculator, Save, AlertTriangle, Info, Utensils, Coffee, Landmark, Plus, Trash2, List, ChevronDown, ChevronUp } from 'lucide-react';
import { Product, Ingredient } from '../types';

interface CostCalculatorProps {
  product: Product;
  onSave: (updatedProduct: Product) => void;
  onClose: () => void;
}

export const CostCalculator: React.FC<CostCalculatorProps> = ({ product, onSave, onClose }) => {
  const isFood = product.category === 'COMIDA';
  const details = product.costDetails;

  // --- A. COSTOS FIJOS DEL LOTE (LA OLLA / EL RELLENO) ---
  // Si ya existen detalles, usamos la suma de ingredientes o el valor guardado, sino defaults
  const initialBatchCost = details?.batchCosts?.length 
    ? details.batchCosts.reduce((acc, i) => acc + i.cost, 0) 
    : (details?.batchCosts ? 0 : (isFood ? 25 : 25));

  const [batchCost, setBatchCost] = useState(initialBatchCost); 
  const [gasDaily, setGasDaily] = useState(details?.gasCost ?? 5.00); 
  const [batchYield, setBatchYield] = useState(details?.batchYield ?? (isFood ? 15 : 50)); 

  // Detailed Ingredients State
  const [ingredients, setIngredients] = useState<Ingredient[]>(details?.batchCosts || []);
  const [showIngredients, setShowIngredients] = useState(false);
  const [newIngName, setNewIngName] = useState('');
  const [newIngCost, setNewIngCost] = useState('');

  // --- B. COSTOS VARIABLES POR UNIDAD (DIRECTOS) ---
  const [addOnsCost, setAddOnsCost] = useState(details?.addOnsCost ?? (isFood ? 0.40 : 0.20)); 
  const [packagingCost, setPackagingCost] = useState(details?.packagingCost ?? (isFood ? 0.05 : 0.15)); 
  const [specificIngredientCost, setSpecificIngredientCost] = useState(details?.specificCost ?? 0.00); 

  // --- C. COSTOS ADMINISTRATIVOS / IMPUESTOS ---
  const [taxRate, setTaxRate] = useState(product.taxRate || 0);

  // Results
  const [calculatedCU, setCalculatedCU] = useState(0);
  const [margin, setMargin] = useState(0);
  const [newPV, setNewPV] = useState(product.pv);

  useEffect(() => {
    // Initialize suggested values ONLY if no details were present
    if (!details) {
      if (product.category === 'FRUTADO' && specificIngredientCost === 0) {
        setSpecificIngredientCost(0.50); 
      } else if (product.category === 'ESPECIAL' && specificIngredientCost === 0) {
        setSpecificIngredientCost(0.80);
      } else if (isFood) {
        if (batchCost === 25) setBatchCost(18); 
      }
    }
  }, []);

  // Update batchCost when ingredients change
  useEffect(() => {
    if (ingredients.length > 0) {
      const total = ingredients.reduce((sum, item) => sum + item.cost, 0);
      setBatchCost(total);
    }
  }, [ingredients]);

  useEffect(() => {
    // 1. Costo Base por Unidad = (Costo Lote + Gas) / Rendimiento
    const baseCostPerUnit = (batchCost + gasDaily) / (batchYield || 1);
    
    // 2. Cálculo Impuesto (Monto) basado en el Precio de Venta
    const taxAmount = newPV * (taxRate / 100);

    // 3. Costo Total Unitario = Base + (Pan/Limón) + Empaque + Extras + Impuesto
    const totalCU = baseCostPerUnit + addOnsCost + packagingCost + specificIngredientCost + taxAmount;
    
    setCalculatedCU(totalCU);
    
    // Margen Bruto
    if (newPV > 0) {
      setMargin(((newPV - totalCU) / newPV) * 100);
    }
  }, [batchCost, gasDaily, batchYield, addOnsCost, packagingCost, specificIngredientCost, newPV, taxRate]);

  const handleSave = () => {
    onSave({
      ...product,
      cu: parseFloat(calculatedCU.toFixed(2)),
      pv: newPV,
      taxRate: taxRate,
      costDetails: {
        batchCosts: ingredients,
        batchYield,
        gasCost: gasDaily,
        addOnsCost,
        packagingCost,
        specificCost: specificIngredientCost
      }
    });
    onClose();
  };

  const addIngredient = () => {
    if (!newIngName.trim() || !newIngCost) return;
    const cost = parseFloat(newIngCost);
    if (isNaN(cost) || cost <= 0) return;
    
    setIngredients([...ingredients, { id: crypto.randomUUID(), name: newIngName, cost }]);
    setNewIngName('');
    setNewIngCost('');
  };

  const removeIngredient = (id: string) => {
    setIngredients(ingredients.filter(i => i.id !== id));
  };

  // Etiquetas Dinámicas
  const labels = {
    batchTitle: isFood ? "Costo Relleno (Por Lote/Kilo)" : "Costos Base (La Olla)",
    batchInput: isFood ? "Costo Insumo Total" : "Costo Total Insumos Olla",
    batchYield: isFood ? "Rendimiento (Panes por Lote)" : "Rendimiento (Vasos por Olla)",
    gasInput: isFood ? "Gas/Energía (Cocción)" : "Gas (Diario/Olla)",
    
    unitTitle: "Costos por Unidad (Directo)",
    addOnsInput: isFood ? "Costo del Pan (Unidad)" : "Limón/Azúcar/Miel",
    packagingInput: isFood ? "Servilleta/Bolsa" : "Descartables (Vaso)",
    specificInput: isFood ? "Salsas/Extras" : (product.category === 'FRUTADO' ? 'Costo Fruta (Merma incl.)' : 'Insumo Específico'),
  };

  return (
    <div className="bg-card-bg rounded-xl border border-gray-700 p-4 space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar">
      <div className="flex items-center gap-2 mb-2 border-b border-gray-700 pb-2">
        {isFood ? <Utensils className="w-5 h-5 text-emoliente-amber" /> : <Coffee className="w-5 h-5 text-emoliente-green" />}
        <div>
          <h3 className="font-bold text-gray-100">Costeo: {product.name}</h3>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">{product.category}</p>
        </div>
      </div>

      {/* SECCIÓN 1: EL LOTE (OLLA O RELLENO) */}
      <div className="space-y-3 p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
        <div className="flex justify-between items-center">
          <h4 className={`text-xs font-bold uppercase flex items-center gap-1 ${isFood ? 'text-emoliente-amber' : 'text-emoliente-green'}`}>
            <Info className="w-3 h-3" /> {labels.batchTitle}
          </h4>
          <button 
            onClick={() => setShowIngredients(!showIngredients)}
            className="text-[10px] flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
          >
            {showIngredients ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showIngredients ? 'Ocultar Detalles' : 'Detallar Insumos'}
          </button>
        </div>

        {/* Detailed Ingredients List */}
        {showIngredients && (
          <div className="bg-black/20 rounded p-2 mb-2 animate-in fade-in slide-in-from-top-2">
             <p className="text-[10px] text-gray-500 mb-2">Agrega cada ingrediente que entra en la olla/preparación:</p>
             <div className="space-y-2 mb-3">
               {ingredients.map(ing => (
                 <div key={ing.id} className="flex justify-between items-center text-xs bg-gray-800/50 p-1.5 rounded border border-gray-700">
                    <span className="text-gray-300">{ing.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-gray-200">S/ {ing.cost.toFixed(2)}</span>
                      <button onClick={() => removeIngredient(ing.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-3 h-3" /></button>
                    </div>
                 </div>
               ))}
               {ingredients.length === 0 && (
                 <div className="text-center py-2">
                   <p className="text-[10px] text-gray-600 italic mb-2">No hay ingredientes detallados aún.</p>
                   <button 
                     onClick={() => {
                       const suggestions = isFood 
                         ? [
                             { id: crypto.randomUUID(), name: 'Pechuga de Pollo', cost: 12.00 },
                             { id: crypto.randomUUID(), name: 'Apio / Verduras', cost: 2.00 },
                             { id: crypto.randomUUID(), name: 'Mayonesa / Aderezos', cost: 4.00 }
                           ]
                         : [
                             { id: crypto.randomUUID(), name: 'Linaza', cost: 5.00 },
                             { id: crypto.randomUUID(), name: 'Cebada Tostada', cost: 3.00 },
                             { id: crypto.randomUUID(), name: 'Cola de Caballo', cost: 2.00 },
                             { id: crypto.randomUUID(), name: 'Boldo / Uña de Gato', cost: 2.00 },
                             { id: crypto.randomUUID(), name: 'Hierba Luisa / Manzanilla', cost: 2.00 }
                           ];
                       setIngredients(suggestions);
                     }}
                     className="text-[10px] text-blue-400 hover:text-blue-300 underline"
                   >
                     Cargar Sugeridos
                   </button>
                 </div>
               )}
             </div>
             
             <div className="flex gap-2 items-center">
               <input 
                 type="text" 
                 placeholder="Ej. Linaza / Pollo" 
                 value={newIngName}
                 onChange={e => setNewIngName(e.target.value)}
                 className="flex-1 bg-black/30 border border-gray-600 rounded p-1.5 text-xs text-white focus:border-blue-400 outline-none"
               />
               <div className="relative w-20">
                 <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-500 text-[10px]">S/</span>
                 <input 
                   type="number" 
                   placeholder="0.00" 
                   value={newIngCost}
                   onChange={e => setNewIngCost(e.target.value)}
                   className="w-full bg-black/30 border border-gray-600 rounded p-1.5 pl-4 text-xs text-white focus:border-blue-400 outline-none"
                 />
               </div>
               <button 
                 onClick={addIngredient}
                 disabled={!newIngName.trim() || !newIngCost}
                 className="p-1.5 bg-blue-600 rounded text-white hover:bg-blue-500 disabled:opacity-50 disabled:bg-gray-600"
               >
                 <Plus className="w-4 h-4" />
               </button>
             </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] text-gray-400 mb-1">{labels.batchInput}</label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">S/</span>
              <input 
                type="number" 
                step="0.5" 
                value={batchCost} 
                onChange={e => setBatchCost(parseFloat(e.target.value) || 0)} 
                readOnly={ingredients.length > 0}
                className={`w-full bg-black/30 border border-gray-600 rounded p-2 pl-6 text-sm text-white focus:border-emoliente-amber outline-none ${ingredients.length > 0 ? 'opacity-70 cursor-not-allowed' : ''}`} 
              />
              {ingredients.length > 0 && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-blue-400 bg-blue-400/10 px-1 rounded">Auto</span>}
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 mb-1">{labels.gasInput}</label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">S/</span>
              <input type="number" step="0.5" value={gasDaily} onChange={e => setGasDaily(parseFloat(e.target.value) || 0)} className="w-full bg-black/30 border border-gray-600 rounded p-2 pl-6 text-sm text-white focus:border-emoliente-amber outline-none" />
            </div>
          </div>
          <div className="col-span-2">
            <label className="block text-[10px] text-gray-400 mb-1">{labels.batchYield}</label>
            <input type="number" value={batchYield} onChange={e => setBatchYield(parseFloat(e.target.value) || 1)} className="w-full bg-black/30 border border-gray-600 rounded p-2 text-sm text-white focus:border-emoliente-amber outline-none" />
            <p className="text-[10px] text-gray-500 mt-1 text-right italic">
              Costo Base {isFood ? 'Relleno' : 'Emoliente'}: S/ {((batchCost + gasDaily) / (batchYield || 1)).toFixed(2)} c/u
            </p>
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: POR UNIDAD (DIRECTO) */}
      <div className="space-y-3 p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
        <h4 className="text-xs font-bold text-gray-300 uppercase flex items-center gap-1">
          <Info className="w-3 h-3" /> {labels.unitTitle}
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] text-gray-400 mb-1">{labels.addOnsInput}</label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">S/</span>
              <input type="number" step="0.05" value={addOnsCost} onChange={e => setAddOnsCost(parseFloat(e.target.value) || 0)} className="w-full bg-black/30 border border-gray-600 rounded p-2 pl-6 text-sm text-white focus:border-gray-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 mb-1">{labels.packagingInput}</label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">S/</span>
              <input type="number" step="0.01" value={packagingCost} onChange={e => setPackagingCost(parseFloat(e.target.value) || 0)} className="w-full bg-black/30 border border-gray-600 rounded p-2 pl-6 text-sm text-white focus:border-gray-500 outline-none" />
            </div>
          </div>
          
          <div className="col-span-2">
             <label className="block text-[10px] text-gray-200 mb-1 font-bold">
               {labels.specificInput}
             </label>
             <div className="relative">
               <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">S/</span>
               <input type="number" step="0.10" value={specificIngredientCost} onChange={e => setSpecificIngredientCost(parseFloat(e.target.value) || 0)} className="w-full bg-emoliente-green/10 border border-emoliente-green/50 rounded p-2 pl-6 text-sm text-white font-bold focus:border-emoliente-green outline-none" />
             </div>
             {product.category === 'FRUTADO' && (
                <p className="text-[10px] text-gray-500 mt-1">
                 Incluye merma (cáscara/pepas).
                </p>
             )}
          </div>
        </div>
      </div>

      {/* SECCIÓN 3: IMPUESTOS / RUS */}
      <div className="space-y-3 p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
        <div className="flex justify-between items-center">
          <h4 className="text-xs font-bold text-gray-300 uppercase flex items-center gap-1">
            <Landmark className="w-3 h-3" /> Cargas Admin. / Impuestos
          </h4>
          <span className="text-[10px] text-gray-400 bg-gray-700 px-2 py-0.5 rounded">
            S/ {(newPV * (taxRate / 100)).toFixed(2)} por venta
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 items-end">
           <div>
             <label className="block text-[10px] text-gray-400 mb-1">Tasa % (RUS / IGV)</label>
             <div className="relative">
               <input 
                 type="number" 
                 step="0.5" 
                 value={taxRate} 
                 onChange={e => setTaxRate(parseFloat(e.target.value) || 0)} 
                 className="w-full bg-black/30 border border-gray-600 rounded p-2 text-sm text-white focus:border-blue-400 outline-none" 
               />
               <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">%</span>
             </div>
           </div>
           <div className="flex gap-2">
              <button 
                onClick={() => setTaxRate(1.5)}
                className={`flex-1 py-2 text-[10px] rounded border transition-colors ${taxRate === 1.5 ? 'bg-blue-500/20 border-blue-500 text-blue-200' : 'border-gray-600 text-gray-400 hover:bg-gray-700'}`}
              >
                RUS (1.5%)
              </button>
              <button 
                onClick={() => setTaxRate(18)}
                className={`flex-1 py-2 text-[10px] rounded border transition-colors ${taxRate === 18 ? 'bg-blue-500/20 border-blue-500 text-blue-200' : 'border-gray-600 text-gray-400 hover:bg-gray-700'}`}
              >
                IGV (18%)
              </button>
           </div>
        </div>
      </div>

      {/* RESULTADO FINAL */}
      <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
        <div className="flex justify-between items-end mb-2">
           <div>
             <span className="text-gray-400 text-xs">Costo Total (+Imp)</span>
             <p className="text-2xl font-mono font-bold text-red-400">S/ {calculatedCU.toFixed(2)}</p>
           </div>
           <div className="text-right">
             <span className="text-gray-400 text-xs block mb-1">Precio Venta (PV)</span>
             <div className="relative w-24 ml-auto">
               <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">S/</span>
               <input type="number" step="0.10" value={newPV} onChange={e => setNewPV(parseFloat(e.target.value) || 0)} className="w-full bg-gray-800 border border-gray-600 rounded p-1 pl-5 text-right font-bold text-white text-sm" />
             </div>
           </div>
        </div>
        
        <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden flex">
          <div 
            className={`h-full transition-all duration-500 ${margin < 30 ? 'bg-red-500' : margin < 50 ? 'bg-yellow-500' : 'bg-green-500'}`} 
            style={{ width: `${Math.min(margin, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
           <span className="text-[10px] text-gray-500">Rentabilidad Neta</span>
           <span className={`text-xs font-bold ${margin < 30 ? 'text-red-400' : margin < 50 ? 'text-yellow-400' : 'text-green-400'}`}>
             {margin.toFixed(1)}% {margin < 30 && <AlertTriangle className="inline w-3 h-3 ml-1" />}
           </span>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button onClick={onClose} className="flex-1 py-3 rounded-lg bg-gray-700 text-white text-sm hover:bg-gray-600 transition-colors">Cancelar</button>
        <button onClick={handleSave} className="flex-1 py-3 rounded-lg bg-emoliente-green text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-emoliente-green/90 transition-colors shadow-lg shadow-emoliente-green/20">
          <Save className="w-4 h-4" /> Guardar
        </button>
      </div>
    </div>
  );
};