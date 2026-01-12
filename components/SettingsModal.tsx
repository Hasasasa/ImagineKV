import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Key as KeyIcon, Loader2, RotateCcw, Save, Server, Wifi, X } from 'lucide-react';
import { testApiConnection } from '../services/geminiService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const READY_KEY = 'service_ready';
const READY_AT_KEY = 'service_ready_at';
const CONFIG_EVENT = 'imaginekv:config-changed';
const AUTH_MODE_KEY = 'custom_auth_mode';

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [authMode, setAuthMode] = useState<'apiKey' | 'bearer'>('bearer');
  const [testState, setTestState] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    setApiKey(localStorage.getItem('custom_api_key') || '');
    setBaseUrl(localStorage.getItem('custom_base_url') || 'https://generativelanguage.googleapis.com');
    setAuthMode((localStorage.getItem(AUTH_MODE_KEY) as any) || 'bearer');

    const isReady = localStorage.getItem(READY_KEY) === 'true';
    setTestState(isReady ? 'success' : 'idle');
    setTestMessage(isReady ? '服务已就绪' : '');
  }, [isOpen]);

  const handleSave = () => {
    if (!apiKey.trim()) {
      alert('请输入 API Key');
      return;
    }

    const nextApiKey = apiKey.trim();
    const nextBaseUrl = baseUrl.trim() || 'https://generativelanguage.googleapis.com';
    const prevApiKey = localStorage.getItem('custom_api_key') || '';
    const prevBaseUrl = localStorage.getItem('custom_base_url') || 'https://generativelanguage.googleapis.com';
    const prevAuthMode = (localStorage.getItem(AUTH_MODE_KEY) as any) || 'bearer';

    const configChanged = prevApiKey !== nextApiKey || prevBaseUrl !== nextBaseUrl || prevAuthMode !== authMode;

    localStorage.setItem('custom_api_key', nextApiKey);
    localStorage.setItem('custom_base_url', nextBaseUrl);
    localStorage.setItem(AUTH_MODE_KEY, authMode);
    if (configChanged) {
      localStorage.setItem(READY_KEY, 'false');
      localStorage.removeItem(READY_AT_KEY);
    }
    window.dispatchEvent(new Event(CONFIG_EVENT));

    onClose();
  };

  const handleReset = () => {
    if (confirm('确定要重置为默认官方地址吗？')) {
      setBaseUrl('https://generativelanguage.googleapis.com');
    }
  };

  const handleTest = async () => {
    const effectiveBaseUrl = baseUrl.trim() || 'https://generativelanguage.googleapis.com';
    if (!apiKey.trim()) {
      setTestState('error');
      setTestMessage('请先填写 API Key');
      localStorage.setItem(READY_KEY, 'false');
      localStorage.removeItem(READY_AT_KEY);
      window.dispatchEvent(new Event(CONFIG_EVENT));
      return;
    }

    localStorage.setItem('custom_api_key', apiKey.trim());
    localStorage.setItem('custom_base_url', effectiveBaseUrl);
    localStorage.setItem(AUTH_MODE_KEY, authMode);
    localStorage.setItem(READY_KEY, 'false');
    localStorage.removeItem(READY_AT_KEY);
    window.dispatchEvent(new Event(CONFIG_EVENT));

    setTestState('testing');
    setTestMessage(`正在测试连接：${effectiveBaseUrl}`);
    try {
      await testApiConnection();
      localStorage.setItem(READY_KEY, 'true');
      localStorage.setItem(READY_AT_KEY, String(Date.now()));
      window.dispatchEvent(new Event(CONFIG_EVENT));
      setTestState('success');
      setTestMessage('服务已就绪');
    } catch (e: any) {
      localStorage.setItem(READY_KEY, 'false');
      localStorage.removeItem(READY_AT_KEY);
      window.dispatchEvent(new Event(CONFIG_EVENT));
      setTestState('error');
      setTestMessage(e?.message ? `测试失败（${effectiveBaseUrl}）：${e.message}` : `测试失败（${effectiveBaseUrl}）`);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <Server className="w-5 h-5 text-indigo-600" />
            API 服务配置
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <KeyIcon className="w-3.5 h-3.5" /> API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
            />
            <p className="text-[10px] text-slate-400">请输入您的 Gemini API Key 或第三方中转 Key</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Server className="w-3.5 h-3.5" /> Base URL (接口地址)
              </label>
              <button onClick={handleReset} className="text-[10px] text-indigo-600 hover:underline flex items-center gap-1">
                <RotateCcw className="w-3 h-3" /> 重置默认
              </button>
            </div>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://generativelanguage.googleapis.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-600 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
            />
            <p className="text-[10px] text-slate-400">
              默认为官方地址。如使用中转/代理，请输入完整 Base URL（通常不带 /v1beta 等后缀）
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">鉴权方式</label>
            <select
              value={authMode}
              onChange={(e) => setAuthMode(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
            >
              <option value="bearer">Authorization: Bearer &lt;API_KEY&gt;（第三方）</option>
              <option value="apiKey">官方 Key（x-goog-api-key）</option>
            </select>
            <p className="text-[10px] text-slate-400">
              你截图的第三方网关需要 Bearer；若使用官方地址再切换为官方 Key。
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={handleTest}
              disabled={testState === 'testing'}
              className="w-full px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-60"
            >
              {testState === 'testing' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
              {testState === 'testing' ? '测试中...' : '测试连接'}
            </button>
            {testMessage ? (
              <div className="mt-2 flex items-center gap-2 text-xs">
                {testState === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : testState === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                ) : null}
                <span className={testState === 'error' ? 'text-rose-600' : testState === 'success' ? 'text-emerald-700' : 'text-slate-500'}>
                  {testMessage}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> 保存配置
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SettingsModal;
