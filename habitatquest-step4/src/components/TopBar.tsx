import { useState, useSyncExternalStore } from 'react';
import { ChevronDown, Gauge, Moon, PanelLeftClose, PanelLeftOpen, RotateCcw, Settings2, Sun, Users, Wifi, WifiOff } from 'lucide-react';
import type { Config } from '../types';
import { getConfig } from '../lib/storage';
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
  onNewSession: () => void;
  onToast: (text: string, tone?: Toast['tone']) => void;
}

export function TopBar({ config, onOpenSettings, onToggleTheme, onToggleDuo, onToggleNetwork, onToggleRails, onNewSession, onToast }: Props) {
  const [openUsage, setOpenUsage] = useState(false);
  useSyncExternalStore(subscribeQuota, getQuotaSnapshot);
  const log = useSyncExternalStore(subscribeNetwork, getNetworkLogSnapshot);
  const usage = usageSummary();
  const local = config.channel === 'local';
  const statusText = domainStatusText(config);
  const barColor = usage.level === 'danger' ? 'var(--bad)' : usage.level === 'warn' ? 'var(--warn)' : 'var(--ok)';

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
            <h1 className="font-display text-[1.02rem] leading-tight truncate">HabitatQuest <span className="muted font-normal">· Step 4</span></h1>
            <div className="text-[.66rem] muted leading-tight">口语练习 AI 助手 · 演示原型 · 本地运行</div>
          </div>
        </div>

        <span className={`status-strip ${local ? 'status-local' : 'status-api'}`} title="点击右下角查看网络请求清单">
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
            title="查看用量明细"
          >
            <Gauge size={14} style={{ color: barColor }} />
            <div className="w-24 sm:w-32">
              <div className="flex justify-between text-[.64rem] muted mb-1 whitespace-nowrap">
                <span>本轮 {usage.round}/{LIMITS.MAX_ROUNDS}</span>
                <span>约 ¥{usage.estCostCny.toFixed(2)}</span>
              </div>
              <div className="meter-track"><div className="meter-fill" style={{ width: `${usage.percent * 100}%`, background: barColor }} /></div>
            </div>
            <ChevronDown size={12} className="muted" />
          </button>

          {openUsage && (
            <div className="popover panel p-3 fade-in" style={{ boxShadow: 'var(--shadow-lg)' }}>
              <div className="flex items-center justify-between mb-2">
                <strong className="text-[.8rem]">用量明细</strong>
                <span className="chip" style={{ color: barColor }}>最高占用 {Math.round(usage.percent * 100)}%</span>
              </div>
              <div className="text-[.7rem] muted mb-2">
                剩余 <b style={{ color: 'var(--ink)' }}>{usage.remainingTokens.toLocaleString()}</b> tokens · 本会话估算 ¥{usage.estCostCny.toFixed(3)}
              </div>
              <table className="tbl">
                <thead><tr><th>项目</th><th>已用</th><th>上限</th><th /></tr></thead>
                <tbody>
                  {usage.items.map((i) => (
                    <tr key={i.label}>
                      <td>{i.label}</td>
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
              <div className="text-[.65rem] muted mt-2 leading-relaxed">
                估算：tokens ≈ ⌈字符/4⌉；有真实 usage 时以真实值覆盖。单价可在设置里修改，仅本地估算、不联网查价。
              </div>
              {usage.level === 'danger' && (
                <div className="mt-2 p-2 rounded-lg text-[.72rem]" style={{ background: 'color-mix(in srgb, var(--bad) 12%, transparent)', color: 'var(--bad)' }}>
                  本轮额度已用完 · 可切换本地通道继续练习
                  <button className="btn btn-sm mt-2 w-full" onClick={() => { onNewSession(); setOpenUsage(false); }}>
                    <RotateCcw size={12} /> 开始新一轮
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <button className="icon-btn" onClick={onToggleNetwork} title={`网络请求清单（${log.length}）`} aria-label="网络请求清单">
          <Wifi size={15} />
          {log.length > 0 && <span className="absolute -top-1 -right-1 text-[.58rem] rounded-full px-1" style={{ background: 'var(--accent)', color: '#fff' }}>{log.length}</span>}
        </button>
        <button
          className={`icon-btn ${config.compactRails ? 'chip-accent' : ''}`}
          onClick={onToggleRails}
          title={config.compactRails ? '展开左右侧栏' : '收起左右侧栏（专注模式，只看练习卡片）'}
          aria-label="切换侧栏" aria-pressed={config.compactRails}
        >
          {config.compactRails ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
        </button>
        <button
          className={`icon-btn ${config.duo ? 'chip-accent' : ''}`}
          onClick={onToggleDuo} title="双人练习（同桌轮流说同一张卡）" aria-pressed={config.duo}
        >
          <Users size={15} />
        </button>
        <button className="icon-btn" onClick={onToggleTheme} title="切换明暗主题" aria-label="切换主题">
          {config.theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        <button className="icon-btn" onClick={onOpenSettings} title="设置" aria-label="设置">
          <Settings2 size={15} />
        </button>
        <span className="chip chip-accent hidden sm:inline-flex whitespace-nowrap">Step 4 · Voice Practice</span>
        <span className="chip hidden lg:inline-flex whitespace-nowrap">演示原型 · 本地运行</span>
      </div>
      {usage.level === 'warn' && (
        <div className="px-4 pb-1.5 text-[.68rem]" style={{ color: 'var(--warn)' }}>
          用量已达 80%：{usage.dominant} 接近上限，建议留意。
        </div>
      )}
    </header>
  );
}
