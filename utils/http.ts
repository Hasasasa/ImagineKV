export interface FetchWithTimeoutOptions extends RequestInit {
  timeoutMs?: number;
  reachabilityHint?: string;
}

export const fetchWithTimeout = async (
  input: RequestInfo | URL,
  { timeoutMs = 30000, reachabilityHint, ...init }: FetchWithTimeoutOptions = {}
): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const urlStr =
    typeof input === 'string' ? input : (input as URL).toString?.() || String(input);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      const err: any = new Error(
        `请求超时（${Math.round(timeoutMs / 1000)}s），请检查网络/网关或调低输出量`
      );
      err.url = urlStr;
      throw err;
    }
    const hint = reachabilityHint || '地址不可达 / CORS 未放通 / 证书错误 / 网络中断';
    const err: any = new Error(`fetch 失败：${e?.message || e}（可能原因：${hint}）`);
    err.url = urlStr;
    err.cause = e;
    throw err;
  } finally {
    clearTimeout(timer);
  }
};

export const ensureOk = async (res: Response, url: string): Promise<Response> => {
  if (res.ok) return res;
  const body = await res.text();
  const err: any = new Error(`请求失败(${res.status}): ${body}`);
  err.url = url;
  err.status = res.status;
  err.body = body;
  throw err;
};
