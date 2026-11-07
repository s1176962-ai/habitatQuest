import { useSyncExternalStore } from 'react';
import { Activity, ChevronDown, ChevronUp, X } from 'lucide-react';
import type { Config } from '../types';
import { t, tr, useI18n } from '../i18n';
import { clearNetworkLog, domainStatusText, getNetworkLogSnapshot, subscribeNetwork } from '../lib/network';
import { getQuotaSnapshot, subscribeQuota } from '../lib/quota';

/**
 * Privacy self-audit. Collapsed by default into a small pill so it never
 * covers the practice stage; the full log opens on demand, and can be hidden
 * entirely from Settings (the top-bar button still opens it).
 *
 * Log rows store i18n keys (purpose / status / note) so an already-rendered
 * log follows a language switch. Plain strings (HTTP codes, legacy rows) pass
 * through tr() unchanged.
 */
export function NetworkPanel({ open, onToggle, config }: { open: boolean; onToggle: () => void; config: Config }) {
  useI18n();
  const log = useSyncExternalStore(subscribeNetwork, getNetworkLogSnapshot);
  useSyncExternalStore(subscribeQuota, getQuotaSnapshot);
  const totalTokens = log.reduce((s, e) => s + e.promptTokens + e.completionTokens, 0);
  const localCount = log.filter((e) => e.channel === 'local').length;
  const indicatorColor = config.channel === 'local' ? 'var(--ok)' : 'var(--warn)';

  if (!open && !config.showNetworkPanel) return null;

  if (!open) {
    return (
      <button className="network-mini" onClick={onToggle} aria-label={t('net.expand')} title={t('net.expandTitle')}>
        <Activity size={13} style={{ color: indicatorColor }} />
        <span className="mini-label">{t('net.mini')}</span>
        <span className="chip">{t('net.entries', { n: log.length })}</span>
        <ChevronUp size={12} className="muted" />
      </button>
    );
  }

  return (
    <div className="network-panel panel fade-in" style={{ boxShadow: 'var(--shadow-lg)' }}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button className="flex items-center gap-2 flex-1 min-w-0" onClick={onToggle} aria-expanded={open} title={t('net.collapse')}>
          <Activity size={15} style={{ color: indicatorColor }} />
          <span className="text-[.76rem] font-semibold text-left">{t('net.title')}</span>
          <span className="chip">{t('net.entries', { n: log.length })}</span>
          <ChevronDown size={14} className="muted" />
        </button>
        <button className="icon-btn shrink-0" style={{ width: '1.6rem', height: '1.6rem' }} onClick={onToggle} aria-label={t('net.collapseAria')} title={t('net.toPill')}><X size={12} /></button>
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
              {t('net.empty')}<br />{t('net.emptySub')}
            </div>
          ) : (
            <table className="tbl">
              <thead><tr>
                <th>{t('net.th.id')}</th><th>{t('net.th.time')}</th><th>{t('net.th.domain')}</th>
                <th>{t('net.th.purpose')}</th><th>{t('net.th.tokens')}</th><th>{t('net.th.status')}</th>
              </tr></thead>
              <tbody>
                {log.map((e) => {
                  const pending = e.status === 'net.status.pending' || e.status === '请求中…';
                  return (
                    <tr key={e.id} title={tr(e.note, e.noteVars)}>
                      <td className="muted">{e.id}</td>
                      <td className="muted">{e.time}</td>
                      <td className="font-mono text-[.66rem]">{e.domain}</td>
                      <td>{tr(e.purpose)}</td>
                      <td>{e.promptTokens}{e.completionTokens ? ` / ${e.completionTokens}` : ' / —'}</td>
                      <td style={{ color: e.ok ? 'var(--ok)' : pending ? 'var(--muted)' : 'var(--bad)' }}>
                        {tr(e.status)}{e.ok ? ' ✓' : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="flex items-center justify-between mt-2 text-[.68rem] muted">
          <span>{t('net.localCount', { n: localCount, tokens: totalTokens.toLocaleString() })}</span>
          <button className="btn btn-sm btn-ghost" onClick={() => clearNetworkLog()}><X size={11} /> {t('net.clear')}</button>
        </div>
        <div className="text-[.62rem] muted mt-1.5 leading-relaxed">{t('net.logNote')}</div>
      </div>
    </div>
  );
}
