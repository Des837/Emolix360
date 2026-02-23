import { GoogleGenAI } from "@google/genai";
import { AppState, Transaction } from "../types";

const SYSTEM_INSTRUCTION = `
Rol: Eres un experto consultor de negocios de "Emoliente y Desayunos" en Perú.
Conocimiento Específico:
- Emoliente Medicinal: Base de cebada tostada, cola de caballo, linaza. Agregados clave: Sábila (Aloe), Tocosh (antibiótico natural), Uña de Gato (inflamación), Sangre de Grado, Boldo (hígado).
- Emoliente Frutado: Mezclas modernas con fresa, maracuyá, piña, aguaymanto. Importante: La fruta fresca sube el costo y tiene merma.
- Estrategia: Recomienda "Combos" (Pan + Emoliente) para subir el ticket promedio. Sugiere controlar el desperdicio de la fruta.
- Tono: Motivador, jerga peruana respetuosa ("maestro", "caserita", "emprendedor"), enfocado en el "bolsillo" (ganancia).

Misión:
1. Si es comando ANALYSIS: Da un consejo rápido sobre los datos actuales. Ejemplo: "Tu margen en frutados está bajo, revisa el precio de la fresa en el mercado".
2. Si es comando CIERRE: Analiza la rentabilidad del día. Diferencia entre venta de medicinales vs frutados si es posible.

Datos entrada:
- Lista de productos con su categoría (MEDICINAL, FRUTADO, etc), Costo Unitario (CU) y Precio (PV).
- Ventas totales (CV) y Utilidad (UT).
`;

export const generateAIResponse = async (
  prompt: string,
  state: AppState,
  context: "COMMAND" | "ANALYSIS" | "CLOSE"
): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      return "⚠️ Error: API Key no configurada.";
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Agrupar productos para el contexto de la IA
    const productsByCategory = state.products.reduce((acc, p) => {
      acc[p.category] = acc[p.category] || [];
      acc[p.category].push(`${p.name} (Costo:S/${p.cu.toFixed(2)}, Venta:S/${p.pv.toFixed(2)})`);
      return acc;
    }, {} as Record<string, string[]>);

    const stateSummary = `
      REPORTE DE NEGOCIO AL MOMENTO:
      - Utilidad Neta Hoy: S/ ${state.ut.toFixed(2)}
      - Total Vasos/Items: ${state.cv}
      
      MENÚ ACTUAL Y COSTOS:
      ${Object.entries(productsByCategory).map(([cat, items]) => `[${cat}]: ${items.join(', ')}`).join('\n')}

      ÚLTIMOS MOVIMIENTOS:
      ${JSON.stringify(state.history.slice(state.history.length - 5))}
    `;

    const fullPrompt = `${stateSummary}\n\nPREGUNTA DEL EMPRENDEDOR: ${prompt}`;

    const modelId = context === 'CLOSE' ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';

    const response = await ai.models.generateContent({
      model: modelId,
      contents: fullPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.6, // Un poco más preciso para negocios
        maxOutputTokens: 700,
      }
    });

    return response.text || "No se pudo generar respuesta.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error de conexión con la IA. Verifica tu internet o API Key.";
  }
};