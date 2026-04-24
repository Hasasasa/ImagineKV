import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Server, Key as KeyIcon, RotateCcw, Globe, TestTube2, Cpu, CheckCircle2 } from 'lucide-react';
import { testApiConnection } from '../services/apiTestService';
import ErrorModal, { ErrorModalPayload, normalizeError } from './ErrorModal';
import {
  DEFAULT_MODELS,
  MODEL_LABELS,
  MODEL_KINDS,
  PROTOCOLS,
  PROTOCOL_LABELS,
  ModelKind,
  ProtocolKind,
  modelStorageKey,
} from '../utils/models';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabKey = 'api' | 'model';

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState<TabKey>('api');

  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [requestMode, setRequestMode] = useState<'official' | 'third_party'>('official');
  const [thirdPartyUrl, setThirdPartyUrl] = useState('');
  const [thirdPartyProtocol, setThirdPartyProtocol] = useState<'gemini' | 'openai'>('gemini');
  const [isTesting, setIsTesting] = useState(false);
  const [errorPayload, setErrorPayload] = useState<ErrorModalPayload | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);

  type Models2D = Record<ProtocolKind, Record<ModelKind, string>>;

  const cloneDefaults = (): Models2D =>
    PROTOCOLS.reduce((acc, p) => {
      acc[p] = { ...DEFAULT_MODELS[p] };
      return acc;
    }, {} as Models2D);

  const [models, setModels] = useState<Models2D>(cloneDefaults);

  useEffect(() => {
    if (isOpen) {
      setTab('api');
      setApiKey(localStorage.getItem('custom_api_key') || '');
      setBaseUrl(localStorage.getItem('custom_base_url') || 'https://generativelanguage.googleapis.com');
      setRequestMode((localStorage.getItem('api_request_mode') as any) || 'official');
      setThirdPartyUrl(localStorage.getItem('third_party_url') || '');
      setThirdPartyProtocol((localStorage.getItem('third_party_protocol') as any) || 'gemini');
      const next = cloneDefaults();
      for (const p of PROTOCOLS) {
        for (const k of MODEL_KINDS) {
          const scoped = localStorage.getItem(modelStorageKey(k, p));
          if (scoped && scoped.trim()) {
            next[p][k] = scoped;
            continue;
          }
          if (p === 'gemini') {
            const legacy = localStorage.getItem(`model_${k}`);
            if (legacy && legacy.trim()) next[p][k] = legacy;
          }
        }
      }
      setModels(next);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (!apiKey.trim()) {
      alert('请输入 API Key');
      setTab('api');
      return;
    }
    if (requestMode === 'third_party' && !thirdPartyUrl.trim()) {
      alert('请输入第三方请求网址');
      setTab('api');
      return;
    }
    localStorage.setItem('custom_api_key', apiKey.trim());
    localStorage.setItem('custom_base_url', baseUrl.trim() || 'https://generativelanguage.googleapis.com');
    localStorage.setItem('api_request_mode', requestMode);
    localStorage.setItem('third_party_url', thirdPartyUrl.trim());
    localStorage.setItem('third_party_protocol', thirdPartyProtocol);

    for (const p of PROTOCOLS) {
      for (const k of MODEL_KINDS) {
        const v = (models[p][k] || '').trim();
        const key = modelStorageKey(k, p);
        if (v) localStorage.setItem(key, v);
        else localStorage.removeItem(key);
        if (p === 'gemini') localStorage.removeItem(`model_${k}`);
      }
    }

    onClose();
    window.location.reload();
  };

  const handleReset = () => {
    if (confirm('确定要重置为默认官方地址吗？')) {
      setBaseUrl('https://generativelanguage.googleapis.com');
    }
  };

  const handleResetModel = (protocol: ProtocolKind, kind: ModelKind) => {
    setModels((prev) => ({
      ...prev,
      [protocol]: { ...prev[protocol], [kind]: DEFAULT_MODELS[protocol][kind] },
    }));
  };

  const handleResetAllModels = () => {
    if (confirm('确定要把所有模型重置为默认值吗？')) {
      setModels(cloneDefaults());
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
      setSuccessOpen(true);
    } catch (e: any) {
      console.error('[SettingsModal] 测试失败', e);
      setErrorPayload(normalizeError(e, '测试失败'));
    } finally {
      setIsTesting(false);
    }
  };

  if (!isOpen) return null;

  const tabBtnClass = (key: TabKey) =>
    `flex-1 px-4 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
      tab === key
        ? 'bg-white text-slate-900 shadow-sm'
        : 'text-slate-500 hover:text-slate-700'
    }`;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <ErrorModal
        open={!!errorPayload}
        onClose={() => setErrorPayload(null)}
        payload={errorPayload}
      />
      {successOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-emerald-50/60">
              <h3 className="font-bold text-lg text-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                测试成功
              </h3>
              <button onClick={() => setSuccessOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 text-sm text-slate-600">
              API 可用，连接正常。
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
              <button
                onClick={() => setSuccessOpen(false)}
                className="px-5 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-black transition-all"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <Server className="w-5 h-5 text-slate-900" />
            API 服务配置
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pt-4">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            <button className={tabBtnClass('api')} onClick={() => setTab('api')}>
              <Globe className="w-4 h-4" /> API 配置
            </button>
            <button className={tabBtnClass('model')} onClick={() => setTab('model')}>
              <Cpu className="w-4 h-4" /> 模型配置
            </button>
          </div>
        </div>

        {tab === 'api' && (
          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" /> 请求模式
              </label>
              <div className="relative">
                <select
                  value={requestMode}
                  onChange={(e) => setRequestMode(e.target.value as any)}
                  className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-slate-900/15 focus:border-slate-900 outline-none transition-all"
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
                选择"第三方请求"时，需要填写第三方网址。
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
                    className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-slate-900/15 focus:border-slate-900 outline-none transition-all"
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
                  OpenAI 格式通常用于 OneAPI/OpenRouter 等兼容接口：/v1/chat/completions、/v1/images/generations。
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
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-slate-900/15 focus:border-slate-900 outline-none transition-all"
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
                  <button onClick={handleReset} className="text-[10px] text-slate-900 hover:underline flex items-center gap-1">
                    <RotateCcw className="w-3 h-3" /> 重置默认
                  </button>
                )}
              </div>
              <input
                type="text"
                value={requestMode === 'official' ? baseUrl : thirdPartyUrl}
                onChange={(e) => requestMode === 'official' ? setBaseUrl(e.target.value) : setThirdPartyUrl(e.target.value)}
                placeholder={requestMode === 'official' ? 'https://generativelanguage.googleapis.com' : 'https://your-proxy.example.com'}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-600 focus:ring-2 focus:ring-slate-900/15 focus:border-slate-900 outline-none transition-all"
              />
              <p className="text-[10px] text-slate-400">
                {requestMode === 'official'
                  ? '默认为官方地址。如使用中转/代理，请输入完整的 Base URL（通常不带 /v1beta 等后缀）'
                  : '请输入完整的第三方基础 URL（通常不带 /v1beta 等后缀）'}
              </p>
            </div>
          </div>
        )}

        {tab === 'model' && (
          <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs text-slate-500 leading-relaxed">
                两套协议独立配置，切换请求模式/协议后无需重填。当前生效的那一组会被标记为「使用中」。
              </p>
              <button
                onClick={handleResetAllModels}
                className="shrink-0 text-[10px] text-indigo-600 hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> 全部重置
              </button>
            </div>

            {PROTOCOLS.map((protocol) => {
              const effective =
                (requestMode === 'third_party' && thirdPartyProtocol === protocol) ||
                (requestMode !== 'third_party' && protocol === 'gemini');
              return (
                <div key={protocol} className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-700">{PROTOCOL_LABELS[protocol].title}</div>
                      <div className="text-[10px] text-slate-400">{PROTOCOL_LABELS[protocol].desc}</div>
                    </div>
                    {effective && (
                      <span className="text-[10px] font-bold text-white bg-slate-900 border border-slate-900 px-2 py-0.5 rounded-full">
                        使用中
                      </span>
                    )}
                  </div>
                  <div className="p-4 space-y-4 bg-white">
                    {MODEL_KINDS.map((kind) => (
                      <div key={kind} className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <Cpu className="w-3.5 h-3.5" /> {MODEL_LABELS[kind].title}
                          </label>
                          {models[protocol][kind] !== DEFAULT_MODELS[protocol][kind] && (
                            <button
                              onClick={() => handleResetModel(protocol, kind)}
                              className="text-[10px] text-slate-900 hover:underline flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" /> 重置
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={models[protocol][kind]}
                          onChange={(e) =>
                            setModels((prev) => ({
                              ...prev,
                              [protocol]: { ...prev[protocol], [kind]: e.target.value },
                            }))
                          }
                          placeholder={DEFAULT_MODELS[protocol][kind]}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-600 focus:ring-2 focus:ring-slate-900/15 focus:border-slate-900 outline-none transition-all"
                        />
                        <p className="text-[10px] text-slate-400">
                          {MODEL_LABELS[kind].desc}（默认：<span className="font-mono">{DEFAULT_MODELS[protocol][kind]}</span>）
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

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
            className="px-6 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-black shadow-md shadow-slate-300 transition-all flex items-center gap-2"
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
