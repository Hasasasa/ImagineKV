import React, { useState, useEffect } from 'react';
import { Settings, CheckCircle2, AlertCircle } from 'lucide-react';
import logoUrl from '../logo/logo.png';

interface HeaderProps {
  onOpenSettings: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenSettings }) => {
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    // Check local storage for custom key
    const checkKey = () => {
        const key = localStorage.getItem('custom_api_key');
        setHasKey(!!key);
    };
    checkKey();
    // Listen for storage events in case it changes in another tab/window
    window.addEventListener('storage', checkKey);
    return () => window.removeEventListener('storage', checkKey);
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white w-10 h-10 rounded-lg shadow-sm border border-slate-200 overflow-hidden flex items-center justify-center">
            <img src={logoUrl} alt="ImagineKV" className="w-12 h-12 object-contain -ml-1" />
          </div>
          <h1 className="font-bold text-xl tracking-tight text-slate-900">
            ImagineKV
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-xs font-medium mr-2">
            {hasKey ? (
                <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 服务已就绪
                </span>
            ) : (
                <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
                    <AlertCircle className="w-3.5 h-3.5" /> 未配置 API
                </span>
            )}
          </div>
          <button
            onClick={onOpenSettings}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
              hasKey
                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                : 'bg-indigo-600 text-white shadow-md shadow-indigo-200 hover:bg-indigo-700'
            }`}
          >
            <Settings className="w-4 h-4" />
            {hasKey ? '配置设置' : '配置 API'}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
