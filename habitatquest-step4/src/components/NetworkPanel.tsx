import { useSyncExternalStore } from 'react';
import { Activity, ChevronDown, ChevronUp, X } from 'lucide-react';
import type { Config } from '../types';
import { clearNetworkLog, domainStatusText, getNetworkLogSnapshot, subscribeNetwork } from '../lib/network';
import { getQuotaSnapshot, subscribeQuota } from '../lib/quota';

/**
 * Privacy self-audit. Collapsed by default into a small pill so it never
 * covers the practice stage; the full log opens on demand, and can be hidden
 * entirely from Settings (the top-bar button still opens it).
 */
export function NetworkPanel({ open, onToggle, config }: { open: boolean; onToggle: () => void; config: Config }) {
  const log = useSyncExternalStore(subscribeNetwork, getNetworkLogSnapshot);
  useSyncExternalStore(subscribeQuota, getQuotaSnapshot);
  const totalTokens = log.reduce((s, e) => s + e.promptTokens + e.completionTokens, 0);
  const localCount = log.filter((e) => e.channel === 'local').length;
  const indicatorColor = config.channel === 'local' ? 'var(--ok)' : 'var(--warn)';

  if (!open && !config.showNetworkPanel) return null;

  if (!open) {
    return (
      <button className="network-mini" onClick={onToggle} aria-label="展开网络请求清单" title="展开网络请求清单（可在设置里彻底隐藏）">
        <Activity size={13} style={{ color: indicatorColor }} />
        <span className="mini-label">网络请求</span>
        <span className="chip">{log.length} 条</span>
        <ChevronUp size={12} className="muted" />
      </button>
    );
  }

  return (
    <div className="network-panel panel fade-in" style={{ boxShadow: 'var(--shadow-lg)' }}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button className="flex items-center gap-2 flex-1 min-w-0" onClick={onToggle} aria-expanded={open} title="收起">
          <Activity size={15} style={{ color: indicatorColor }} />
          <span className="text-[.76rem] font-semibold text-left">网络请求清单</span>
          <span className="chip">{log.length} 条</span>
          <ChevronDown size={14} className="muted" />
        </button>
        <button className="icon-btn shrink-0" style={{ width: '1.6rem', height: '1.6rem' }} onClick={onToggle} aria-label="收起网络请求清单" title="收起为小胶囊"><X size={12} /></button>
      </div>

      <div className="px-3 pb-2">
        <div className={`status-strip w-full justify-center ${config.channel === 'local' ? 'status-local' : 'status-api'}`}>
          {domainStatusText(config)}
        </div>
      </div>

      <div className="px-3 pb-3">
        <div className="max-h-52 overflow-auto scroll-thin panel-soft p-2">
          {log.length === 0 ? (
            <div className="text-[.72rem] muted p-3 text-center leading-relaxed">
              本次会话没有任何外发请求。<br />本地通道的朗读 / 识别 / 判分全部在浏览器内完成。
            </div>
          ) : (
            <table className="tbl">
              <thead><tr><th>#</th><th>时间</th><th>目标域名</th><th>用途</th><th>token 入/出</th><th>状态</th></tr></thead>
              <tbody>
                {log.map((e) => (
                  <tr key={e.id} title={e.note || ''}>
                    <td className="muted">{e.id}</td>
                    <td className="muted">{e.time}</td>
                    <td className="font-mono text-[.66rem]">{e.domain}</td>
                    <td>{e.purpose}</td>
                    <td>{e.promptTokens}{e.completionTokens ? ` / ${e.completionTokens}` : ' / —'}</td>
                    <td style={{ color: e.ok ? 'var(--ok)' : e.status === '请求中…' ? 'var(--muted)' : 'var(--bad)' }}>
                      {e.status}{e.ok ? ' ✓' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="flex items-center justify-between mt-2 text-[.68rem] muted">
          <span>本地通道请求数：{localCount} · 本次会话累计：{totalTokens.toLocaleString()} tokens</span>
          <button className="btn btn-sm btn-ghost" onClick={() => clearNetworkLog()}><X size={11} /> 清空</button>
        </div>
        <div className="text-[.62rem] muted mt-1.5 leading-relaxed">
          日志不记录 Authorization 头、请求体或密钥；目标域名始终只能是设置里填写的那一个（或经 127.0.0.1 代理转发到它）。
        </div>
      </div>
    </div>
  );
}
