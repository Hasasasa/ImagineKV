import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, AlertTriangle, Check } from 'lucide-react';

export interface ErrorModalPayload {
  title?: string;
  message?: string;
  url?: string;
  status?: number;
  body?: string;
  stack?: string;
  cause?: { name?: string; message?: string; stack?: string } | null;
  raw?: any;
}

interface ErrorModalProps {
  open: boolean;
  onClose: () => void;
  payload: ErrorModalPayload | null;
}

const buildText = (p: ErrorModalPayload): string => {
  const lines: string[] = [];
  lines.push(`【${p.title || '错误'}】`);
  if (p.message) lines.push(`message: ${p.message}`);
  if (p.url) lines.push(`url:     ${p.url}`);
  if (typeof p.status === 'number') lines.push(`status:  ${p.status}`);
  if (p.body) lines.push(`body:    ${p.body}`);
  if (p.cause) {
    lines.push('--- cause ---');
    if (p.cause.name) lines.push(`name:    ${p.cause.name}`);
    if (p.cause.message) lines.push(`message: ${p.cause.message}`);
    if (p.cause.stack) lines.push(`stack:\n${p.cause.stack}`);
  }
  if (p.stack) {
    lines.push('--- stack ---');
    lines.push(p.stack);
  }
  return lines.join('\n');
};

export const normalizeError = (e: any, title?: string): ErrorModalPayload => ({
  title: title || '错误',
  message: e?.message || String(e),
  url: e?.url,
  status: e?.status,
  body: e?.body,
  stack: e?.stack,
  cause: e?.cause
    ? {
        name: e.cause?.name,
        message: e.cause?.message,
        stack: e.cause?.stack,
      }
    : null,
  raw: e,
});

const ErrorModal: React.FC<ErrorModalProps> = ({ open, onClose, payload }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  if (!open || !payload) return null;

  const text = buildText(payload);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
      document.body.removeChild(ta);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-rose-50/50">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
            {payload.title || '错误'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 bg-slate-900">
          <pre className="font-mono text-[11px] text-slate-200 whitespace-pre-wrap break-all leading-relaxed">
{text}
          </pre>
        </div>

        <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50/50">
          <span className="text-[11px] text-slate-400">可以复制后发给开发者定位问题</span>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-white text-slate-700 text-sm font-bold rounded-lg border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              {copied ? <><Check className="w-4 h-4 text-emerald-500" /> 已复制</> : <><Copy className="w-4 h-4" /> 复制</>}
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-800 text-white text-sm font-bold rounded-lg hover:bg-slate-900 transition-all"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ErrorModal;
