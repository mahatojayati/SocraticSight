import React from 'react';
import { Eye, GraduationCap, Menu } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 p-4 shadow-lg z-10 shrink-0">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={onMenuClick}
            className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Menu size={24} />
          </button>
          <div className="bg-indigo-600/20 p-2 rounded-xl border border-indigo-500/30">
            <Eye className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white hidden sm:block">SocraticSight</h1>
            <h1 className="text-xl font-bold tracking-tight text-white sm:hidden">Socratic</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700">
           <GraduationCap className="w-4 h-4 text-indigo-400" />
           <span className="text-xs text-slate-300 hidden sm:inline">Gemini 3 Pro Active</span>
        </div>
      </div>
    </header>
  );
};
