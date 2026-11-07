import { useState, useSyncExternalStore } from 'react';
import { ChevronDown, Gauge, Moon, PanelLeftClose, PanelLeftOpen, RotateCcw, Settings2, Sun, Users, Wifi, WifiOff } from 'lucide-react';
import type { Config } from '../types';
import { t, tr, useI18n } from '../i18n';
import { LIMITS, getQuotaSnapshot, subscribeQuota, usageSummary } from '../lib/quota';
import { domainStatusText, getNetworkLogSnapshot, subscribeNetwork } from '../lib/network';
import type { Toast } from './Toasts';

interface Props {
  config: Config;
  onOpenSettings: () => void;
  onToggleTheme: () => void;
  onToggleDuo: () => void;
  onToggleNetwork: () => void;
  onToggleRails: () => void;
  onToggleLanguage: () => void;
  onNewSession: () => void;
  onToast: (text: string, tone?: Toast['tone']) => void;
}

export function TopBar({
  config, onOpenSettings, onToggleTheme, onToggleDuo, onToggleNetwork,
  onToggleRails, onToggleLanguage, onNewSession,
}: Props) {
  useI18n();
  const [openUsage, setOpenUsage] = useState(false);
  useSyncExternalStore(subscribeQuota, getQuotaSnapshot);
  const log = useSyncExternalStore(subscribeNetwork, getNetworkLogSnapshot);
  const usage = usageSummary();
  const local = config.channel === 'local';
  const statusText = domainStatusText(config);
  const barColor = usage.level === 'danger' ? 'var(--bad)' : usage.level === 'warn' ? 'var(--warn)' : 'var(--ok)';
  const isZh = config.language === 'zh';

  return (
    <header className="sticky top-0 z-40 border-b hairline" style={{ background: 'color-mix(in srgb, var(--background) 88%, transparent)', backdropFilter: 'blur(12px)' }}>
      <div className="max-w-[1600px] mx-auto px-4 py-2.5 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: 'var(--accent)', color: '#fff' }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 18c3-8 6-12 9-12s6 4 9 12" /><circle cx="12" cy="5" r="1.6" fill="currentColor" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-[1.02rem] leading-tight truncate">HabitatQuest <span className="muted font-normal">· {t('top.brandSuffix')}</span></h1>
            <div className="text-[.66rem] muted leading-tight">{t('top.subtitle')}</div>
          </div>
        </div>

        <span className={`status-strip ${local ? 'status-local' : 'status-api'}`} title={t('top.statusTitle')}>
          {local ? <WifiOff size={12} /> : <Wifi size={12} />}
          <span className="dot" />{statusText}
        </span>

        <div className="flex-1" />

        {/* Always-visible usage meter */}
        <div className="relative">
          <button
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border hairline hover:border-accent transition-colors"
            style={{ background: 'var(--surface)' }}
            onClick={() => setOpenUsage((v) => !v)}
            aria-expanded={openUsage}
            title={t('top.usageTitle')}
          >
            <Gauge size={14} style={{ color: barColor }} />
            <div className="w-24 sm:w-32">
              <div className="flex justify-between text-[.64rem] muted mb-1 whitespace-nowrap">
                <span>{t('top.round', { n: usage.round, max: LIMITS.MAX_ROUNDS })}</span>
                <span>{t('top.approx', { v: usage.estCostCny.toFixed(2) })}</span>
              </div>
              <div className="meter-track"><div className="meter-fill" style={{ width: `${usage.percent * 100}%`, background: barColor }} /></div>
            </div>
            <ChevronDown size={12} className="muted" />
          </button>

          {openUsage && (
            <div className="popover panel p-3 fade-in" style={{ boxShadow: 'var(--shadow-lg)' }}>
              <div className="flex items-center justify-between mb-2">
                <strong className="text-[.8rem]">{t('top.usageDetails')}</strong>
                <span className="chip" style={{ color: barColor }}>{t('top.peak', { v: Math.round(usage.percent * 100) })}</span>
              </div>
              <div className="text-[.7rem] muted mb-2">
                {t('top.remaining')} <b style={{ color: 'var(--ink)' }}>{usage.remainingTokens.toLocaleString()}</b> {t('top.tokensSession', { cost: usage.estCostCny.toFixed(3) })}
              </div>
              <table className="tbl">
                <thead><tr><th>{t('top.th.item')}</th><th>{t('top.th.used')}</th><th>{t('top.th.limit')}</th><th /></tr></thead>
                <tbody>
                  {usage.items.map((i) => (
                    <tr key={i.label}>
                      <td>{tr(i.label)}</td>
                      <td>{i.unit === '¥' ? i.used.toFixed(3) : Math.round(i.used * 10) / 10}</td>
                      <td className="muted">{i.limit}</td>
                      <td style={{ width: 62 }}>
                        <div className="meter-track" style={{ height: 4 }}>
                          <div style={{ width: `${i.percent * 100}%`, height: '100%', background: i.percent >= .8 ? 'var(--warn)' : 'var(--ok)' }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-[.65rem] muted mt-2 leading-relaxed">{t('top.estimateNote')}</div>
              {usage.level === 'danger' && (
                <div className="mt-2 p-2 rounded-lg text-[.72rem]" style={{ background: 'color-mix(in srgb, var(--bad) 12%, transparent)', color: 'var(--bad)' }}>
                  {t('top.quotaDanger')}
                  <button className="btn btn-sm mt-2 w-full" onClick={() => { onNewSession(); setOpenUsage(false); }}>
                    <RotateCcw size={12} /> {t('top.newRound')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="lang-switch" role="group" aria-label={t('app.language')} title={t('app.switchLanguage')}>
          <button type="button" className={isZh ? 'active' : ''} aria-pressed={isZh}
            onClick={() => { if (!isZh) onToggleLanguage(); }}>中</button>
          <button type="button" className={!isZh ? 'active' : ''} aria-pressed={!isZh}
            onClick={() => { if (isZh) onToggleLanguage(); }}>EN</button>
        </div>

        <button className="icon-btn" onClick={onToggleNetwork} title={t('top.networkLog', { n: log.length })} aria-label={t('net.title')}>
          <Wifi size={15} />
          {log.length > 0 && <span className="absolute -top-1 -right-1 text-[.58rem] rounded-full px-1" style={{ background: 'var(--accent)', color: '#fff' }}>{log.length}</span>}
        </button>
        <button
          className={`icon-btn ${config.compactRails ? 'chip-accent' : ''}`}
          onClick={onToggleRails}
          title={config.compactRails ? t('top.railsExpand') : t('top.railsCollapse')}
          aria-label={t('top.railsToggle')} aria-pressed={config.compactRails}
        >
          {config.compactRails ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
        </button>
        <button
          className={`icon-btn ${config.duo ? 'chip-accent' : ''}`}
          onClick={onToggleDuo} title={t('top.duo')} aria-pressed={config.duo}
        >
          <Users size={15} />
        </button>
        <button className="icon-btn" onClick={onToggleTheme} title={t('top.theme')} aria-label={t('top.theme')}>
          {config.theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        <button className="icon-btn" onClick={onOpenSettings} title={t('top.settings')} aria-label={t('top.settings')}>
          <Settings2 size={15} />
        </button>
        <span className="chip chip-accent hidden sm:inline-flex whitespace-nowrap">{t('top.tagPractice')}</span>
        <span className="chip hidden lg:inline-flex whitespace-nowrap">{t('top.tagDemo')}</span>
      </div>
      {usage.level === 'warn' && (
        <div className="px-4 pb-1.5 text-[.68rem]" style={{ color: 'var(--warn)' }}>
          {t('top.warn80', { item: tr(usage.dominant) })}
        </div>
      )}
    </header>
  );
}
