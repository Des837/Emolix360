import React, { useState } from 'react';
import { Store, ChevronRight, Lock, User } from 'lucide-react';

interface AuthScreenProps {
  onAuth: (name: string, pass: string) => void;
  onGuest: () => void;
  error?: string | null;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuth, onGuest, error }) => {
  const [name, setName] = useState('');
  const [pass, setPass] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && pass) onAuth(name, pass);
  };

  return (
    <div className="min-h-screen bg-emoliente-dark flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[60%] bg-gradient-to-br from-emoliente-green/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      
      <div className="z-10 w-full max-w-sm space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-gradient-to-tr from-emoliente-green to-emoliente-amber rounded-2xl mx-auto flex items-center justify-center shadow-2xl shadow-green-900/50 mb-6 rotate-3">
             <Store className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Emoliente Smart</h1>
          <p className="text-gray-400 text-sm">Plataforma de Gestión e Inteligencia Comercial</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-card-bg/50 backdrop-blur-md p-6 rounded-2xl border border-gray-700 shadow-xl">
           <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Nombre del Negocio</label>
                <div className="relative group">
                   <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-emoliente-green transition-colors" />
                   <input 
                     type="text" 
                     value={name}
                     onChange={e => setName(e.target.value)}
                     placeholder="Ej. Emolientes El Tío Juan"
                     className="w-full bg-black/40 border border-gray-600 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-emoliente-green focus:ring-1 focus:ring-emoliente-green transition-all"
                   />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Contraseña de Acceso</label>
                <div className="relative group">
                   <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-emoliente-amber transition-colors" />
                   <input 
                     type="password" 
                     value={pass}
                     onChange={e => setPass(e.target.value)}
                     placeholder="••••••"
                     className="w-full bg-black/40 border border-gray-600 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-emoliente-amber focus:ring-1 focus:ring-emoliente-amber transition-all"
                   />
                </div>
              </div>
           </div>

           {error && (
             <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-200 text-xs text-center animate-pulse">
               {error}
             </div>
           )}

           <button 
             type="submit"
             disabled={!name || !pass}
             className="w-full bg-gradient-to-r from-emoliente-green to-lime-600 hover:to-lime-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-lime-900/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none mt-4"
           >
             Entrar / Registrar <ChevronRight className="w-5 h-5" />
           </button>

           <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card-bg px-2 text-gray-500">O</span>
              </div>
           </div>

           <button 
             type="button"
             onClick={onGuest}
             className="w-full bg-gray-700/50 hover:bg-gray-700 text-gray-300 font-bold py-3 rounded-xl border border-gray-600 active:scale-95 transition-all text-sm"
           >
             Continuar como Invitado
           </button>

           <p className="text-[10px] text-center text-gray-500 mt-2">
             El modo invitado permite usar la app pero no guarda historial en la nube.
           </p>
        </form>
      </div>
    </div>
  );
};