import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Settings } from 'lucide-react';
import logoUrl from '../logo/logo.png';

interface HeaderProps {
  onOpenSettings: () => void;
}

const CONFIG_EVENT = 'imaginekv:config-changed';

const Header: React.FC<HeaderProps> = ({ onOpenSettings }) => {
  const [hasKey, setHasKey] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const syncState = () => {
      const key = localStorage.getItem('custom_api_key');
      setHasKey(!!key);
      setIsReady(localStorage.getItem('service_ready') === 'true');
    };

    syncState();
    window.addEventListener('storage', syncState);
    window.addEventListener(CONFIG_EVENT, syncState as EventListener);
    return () => {
      window.removeEventListener('storage', syncState);
      window.removeEventListener(CONFIG_EVENT, syncState as EventListener);
    };
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 pl-5">
          <div className="bg-white p-2 rounded-lg shadow-lg border border-slate-200">
            <img
              src={logoUrl}
              alt="ImagineKV"
              className="w-5 h-5 object-cover scale-[2.0] origin-center object-left -translate-x-[2px]"
            />
          </div>
          <h1 className="font-bold text-xl tracking-tight text-slate-900">ImagineKV</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-xs font-medium mr-2">
            {hasKey && isReady ? (
              <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                <CheckCircle2 className="w-3.5 h-3.5" /> 服务已就绪
              </span>
            ) : hasKey ? (
              <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
                <AlertCircle className="w-3.5 h-3.5" /> 未完成测试
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
              hasKey ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-indigo-600 text-white shadow-md shadow-indigo-200 hover:bg-indigo-700'
            }`}
          >
            <Settings className="w-4 h-4" />
            {hasKey ? '配置' : '配置 API'}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;

