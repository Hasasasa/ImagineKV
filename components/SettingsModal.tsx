import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Server, Key as KeyIcon, RotateCcw, Globe, TestTube2 } from 'lucide-react';
import { testApiConnection } from '../services/apiTestService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [requestMode, setRequestMode] = useState<'official' | 'third_party'>('official');
  const [thirdPartyUrl, setThirdPartyUrl] = useState('');
  const [thirdPartyProtocol, setThirdPartyProtocol] = useState<'gemini' | 'openai'>('gemini');
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setApiKey(localStorage.getItem('custom_api_key') || '');
      setBaseUrl(localStorage.getItem('custom_base_url') || 'https://generativelanguage.googleapis.com');
      setRequestMode((localStorage.getItem('api_request_mode') as any) || 'official');
      setThirdPartyUrl(localStorage.getItem('third_party_url') || '');
      setThirdPartyProtocol((localStorage.getItem('third_party_protocol') as any) || 'gemini');
    }
  }, [isOpen]);

  const handleSave = () => {
    if (!apiKey.trim()) {
      alert("请输入 API Key");
      return;
    }
    if (requestMode === 'third_party' && !thirdPartyUrl.trim()) {
      alert("请输入第三方请求网址");
      return;
    }
    localStorage.setItem('custom_api_key', apiKey.trim());
    localStorage.setItem('custom_base_url', baseUrl.trim() || 'https://generativelanguage.googleapis.com');
    localStorage.setItem('api_request_mode', requestMode);
    localStorage.setItem('third_party_url', thirdPartyUrl.trim());
    localStorage.setItem('third_party_protocol', thirdPartyProtocol);
    onClose();
    window.location.reload(); // Simple reload to ensure service picks up new config
  };

  const handleReset = () => {
    if(confirm('确定要重置为默认官方地址吗？')) {
        setBaseUrl('https://generativelanguage.googleapis.com');
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      await testApiConnection({
        mode: requestMode,
        apiKey,
        baseUrl,
        thirdPartyUrl,
        thirdPartyProtocol,
      });
      alert('测试成功：API 可用');
    } catch (e: any) {
      alert('测试失败：' + (e?.message || String(e)));
    } finally {
      setIsTesting(false);
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
              <Globe className="w-3.5 h-3.5" /> 请求模式
            </label>
            <div className="relative">
              <select
                value={requestMode}
                onChange={(e) => setRequestMode(e.target.value as any)}
                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              >
                <option value="official">官方请求</option>
                <option value="third_party">第三方请求</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <p className="text-[10px] text-slate-400">
              选择“第三方请求”时，需要填写第三方网址。
            </p>
          </div>

          {requestMode === 'third_party' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Server className="w-3.5 h-3.5" /> 第三方协议
              </label>
              <div className="relative">
                <select
                  value={thirdPartyProtocol}
                  onChange={(e) => setThirdPartyProtocol(e.target.value as any)}
                  className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                >
                  <option value="gemini">Gemini 原生（generateContent）</option>
                  <option value="openai">OpenAI 格式（/v1/*）</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <p className="text-[10px] text-slate-400">
                OpenAI 格式通常用于 OneAPI/OpenRouter 等兼容接口：`/v1/chat/completions`、`/v1/images/generations`。
              </p>
            </div>
          )}
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
            <p className="text-[10px] text-slate-400">
              请输入您的 Gemini API Key 或第三方中转 Key
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Server className="w-3.5 h-3.5" /> {requestMode === 'official' ? 'Base URL (接口地址)' : '第三方网址'}
                </label>
                {requestMode === 'official' && (
                  <button onClick={handleReset} className="text-[10px] text-indigo-600 hover:underline flex items-center gap-1">
                      <RotateCcw className="w-3 h-3" /> 重置默认
                  </button>
                )}
            </div>
            <input
              type="text"
              value={requestMode === 'official' ? baseUrl : thirdPartyUrl}
              onChange={(e) => requestMode === 'official' ? setBaseUrl(e.target.value) : setThirdPartyUrl(e.target.value)}
              placeholder={requestMode === 'official' ? 'https://generativelanguage.googleapis.com' : 'https://your-proxy.example.com'}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-600 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
            />
            <p className="text-[10px] text-slate-400">
              {requestMode === 'official'
                ? '默认为官方地址。如使用中转/代理，请输入完整的 Base URL（通常不带 /v1beta 等后缀）'
                : '请输入完整的第三方基础 URL（通常不带 /v1beta 等后缀）'}
            </p>
          </div>
        </div>

        <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
            取消
          </button>
          <button 
            onClick={handleTest}
            disabled={isTesting}
            className="px-4 py-2 bg-white text-slate-700 text-sm font-bold rounded-lg border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <TestTube2 className="w-4 h-4" /> {isTesting ? '测试中...' : '测试'}
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
