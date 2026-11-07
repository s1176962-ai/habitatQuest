import { useState } from 'react';
import { ChevronDown, Copy, Eye, EyeOff, KeyRound, ShieldCheck, Trash2, X } from 'lucide-react';
import type { Config, Lang, ProviderId } from '../types';
import { t, tr, useI18n } from '../i18n';
import {
  DEFAULT_PRICES, PROVIDER_PRESETS, clearKey, downloadText, exportRecords,
  keyLocation, maskKey, readKey, saveKey, migrateKey,
} from '../lib/storage';
import { externalDomains, proxyCommand } from '../lib/network';
import type { Toast } from './Toasts';

interface Props {
  open: boolean;
  config: Config;
  onClose: () => void;
  onConfig: (patch: Partial<Config>) => void;
  onToast: (text: string, tone?: Toast['tone']) => void;
  onTestConnection: () => Promise<void>;
  onClearRecords: () => void;
  onNewSession: () => void;
}

const CHANNEL_NOTE = {
  local: 'set.channelNote.local',
  api: 'set.channelNote.api',
} as const;

function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b hairline py-3">
      <button className="w-full flex justify-between items-center text-[.78rem] font-semibold" onClick={() => setOpen((v) => !v)}>
        {title}<ChevronDown size={14} className={`muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="mt-2.5">{children}</div>}
    </div>
  );
}

export function SettingsDrawer({ open, config, onClose, onConfig, onToast, onTestConnection, onClearRecords, onNewSession }: Props) {
  useI18n();
  const [keyDraft, setKeyDraft] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  if (!open) return null;

  const existingKey = readKey();
  const domains = externalDomains(config);
  const masked = maskKey(existingKey);

  const applyPreset = (id: ProviderId) => {
    if (id === 'local') { onConfig({ provider: id, channel: 'local' }); return; }
    const p = PROVIDER_PRESETS[id];
    onConfig({
      provider: id, baseUrl: p.baseUrl, model: p.model, ttsModel: p.ttsModel,
      ttsVoice: p.ttsVoice, sttModel: p.sttModel,
    });
  };

  const copyProxy = async () => {
    try {
      await navigator.clipboard.writeText(proxyCommand(config));
      onToast(t('set.proxyCopied'), 'ok');
    } catch { onToast(t('set.copyFailed'), 'warn'); }
  };

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer fade-in" role="dialog" aria-label={t('set.aria')}>
        <div className="flex items-center justify-between px-4 py-3 border-b hairline shrink-0">
          <div>
            <h2 className="font-display text-[1.05rem]">{t('set.title')}</h2>
            <div className="text-[.68rem] muted">{t('set.subtitle')}</div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label={t('set.close')}><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto scroll-thin px-4 pb-8">
          {/* Language — mirrored by the 中 / EN switch in the top bar */}
          <div className="mt-3 panel p-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <div className="text-[.76rem] font-semibold">{t('set.language')}</div>
                <div className="text-[.65rem] muted mt-0.5 leading-relaxed">{t('set.languageNote')}</div>
              </div>
              <div className="lang-switch" role="group" aria-label={t('app.language')}>
                {(['zh', 'en'] as Lang[]).map((l) => (
                  <button key={l} type="button" className={config.language === l ? 'active' : ''}
                    aria-pressed={config.language === l} onClick={() => onConfig({ language: l })}>
                    {l === 'zh' ? '中文' : 'English'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* External domain audit — checked at session start */}
          <div className="mt-3 panel-soft p-3">
            <div className="flex items-center gap-1.5 text-[.74rem] font-semibold mb-1.5">
              <ShieldCheck size={14} style={{ color: 'var(--ok)' }} /> {t('set.auditTitle')}
            </div>
            {domains.length === 0 ? (
              <div className="text-[.72rem]" style={{ color: 'var(--ok)' }}>{t('set.auditNone')}</div>
            ) : (
              <ul className="text-[.72rem] space-y-1">
                {domains.map((d) => <li key={d} className="font-mono">• {d}</li>)}
              </ul>
            )}
            <div className="text-[.65rem] muted mt-1.5 leading-relaxed">{t('set.auditNote')}</div>
          </div>

          {/* Channel switch */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(['local', 'api'] as const).map((ch) => (
              <button
                key={ch}
                className="panel p-2.5 text-left transition-all"
                style={{
                  borderColor: config.channel === ch ? 'var(--accent)' : 'var(--line)',
                  background: config.channel === ch ? 'var(--accent-soft)' : 'var(--surface)',
                }}
                onClick={() => onConfig({ channel: ch })}
              >
                <div className="text-[.78rem] font-semibold">{ch === 'local' ? t('set.channel.local') : t('set.channel.api')}</div>
                <div className="text-[.64rem] muted mt-0.5">{ch === 'local' ? t('set.channel.localSub') : t('set.channel.apiSub')}</div>
              </button>
            ))}
          </div>
          <div className="text-[.7rem] mt-2 px-1" style={{ color: config.channel === 'local' ? 'var(--ok)' : 'var(--warn)' }}>
            {t(CHANNEL_NOTE[config.channel])}
          </div>

          {/* Provider */}
          <div className="mt-3 space-y-2.5">
            <div>
              <label className="lbl">{t('set.providerLabel')}</label>
              <select className="field" value={config.provider}
                onChange={(e) => applyPreset(e.target.value as ProviderId)}>
                <option value="openai-compatible">{t('set.provider.openai')}</option>
                <option value="gemini">{t('set.provider.gemini')}</option>
                <option value="custom">{t('set.provider.custom')}</option>
              </select>
            </div>
            <div>
              <label className="lbl">{t('set.baseUrl')}</label>
              <input className="field font-mono text-[.72rem]" value={config.baseUrl}
                onChange={(e) => onConfig({ baseUrl: e.target.value })} placeholder="https://api.openai.com/v1" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="lbl">{t('set.model')}</label>
                <input className="field font-mono text-[.72rem]" value={config.model} onChange={(e) => onConfig({ model: e.target.value })} /></div>
              <div><label className="lbl">{t('set.sttModel')}</label>
                <input className="field font-mono text-[.72rem]" value={config.sttModel} onChange={(e) => onConfig({ sttModel: e.target.value })} /></div>
              <div><label className="lbl">{t('set.ttsModel')}</label>
                <input className="field font-mono text-[.72rem]" value={config.ttsModel} onChange={(e) => onConfig({ ttsModel: e.target.value })} /></div>
              <div><label className="lbl">{t('set.ttsVoice')}</label>
                <input className="field font-mono text-[.72rem]" value={config.ttsVoice} onChange={(e) => onConfig({ ttsVoice: e.target.value })} /></div>
            </div>
            <div>
              <label className="lbl">{t('set.rate')}</label>
              <div className="flex gap-2">
                {[0.75, 1].map((r) => (
                  <button key={r} className={`btn btn-sm flex-1 ${config.rate === r ? 'btn-primary' : ''}`}
                    onClick={() => onConfig({ rate: r })}>{r}× {r === 1 ? t('set.rateNormal') : t('set.rateSlow')}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Key */}
          <div className="mt-4 panel p-3">
            <div className="flex items-center gap-1.5 text-[.76rem] font-semibold mb-2"><KeyRound size={14} /> {t('set.apiKey')}</div>
            <form className="flex gap-1.5" onSubmit={(e) => e.preventDefault()}>
              <input
                className="field font-mono text-[.72rem]" type={showKey ? 'text' : 'password'}
                value={keyDraft} placeholder={masked || 'sk-••••••••3f2a'} autoComplete="off" spellCheck={false}
                onChange={(e) => { setKeyDraft(e.target.value); saveKey(e.target.value, config.keyStoreMode); }}
              />
              <button type="button" className="icon-btn shrink-0" onClick={() => setShowKey((v) => !v)} aria-label={t('set.showHideKey')}>
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </form>
            <div className="text-[.65rem] muted mt-1.5">
              {t('set.keyCurrent')}{existingKey
                ? `${masked}${t('set.keyStoredIn', { where: tr(keyLocation()) })}`
                : t('set.keyNotSaved')}
            </div>

            <div className="mt-2">
              <label className="lbl">{t('set.keyStoreMode')}</label>
              <div className="flex gap-3 text-[.72rem]">
                {(['session', 'local'] as const).map((m) => (
                  <label key={m} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="keystore" checked={config.keyStoreMode === m}
                      onChange={() => { onConfig({ keyStoreMode: m }); migrateKey(m); }} />
                    {m === 'session' ? t('set.keySession') : t('set.keyLocal')}
                  </label>
                ))}
              </div>
            </div>

            <div className="text-[.66rem] muted mt-2.5 leading-relaxed border-l-2 pl-2" style={{ borderColor: 'var(--accent)' }}>
              {t('set.keyPrivacy')}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3">
              <button className="btn btn-sm" disabled={testing} onClick={async () => {
                setTesting(true);
                try { await onTestConnection(); } finally { setTesting(false); }
              }}>{testing ? t('set.testing') : t('set.test')}</button>
              <button className="btn btn-sm" onClick={() => {
                clearKey(); setKeyDraft('');
                onToast(t('set.keyCleared'), 'ok');
              }}><Trash2 size={12} /> {t('set.clearKey')}</button>
              <button className="btn btn-sm" onClick={() => {
                downloadText('habitatquest-records.json', exportRecords());
                onToast(t('set.recordsExported'), 'ok');
              }}>{t('set.exportRecords')}</button>
              <button className="btn btn-sm" onClick={() => { onClearRecords(); onToast(t('set.recordsCleared'), 'ok'); }}>{t('set.clearRecords')}</button>
            </div>
          </div>

          {/* CORS / local relay */}
          <div className="mt-3 panel-soft p-3">
            <div className="text-[.76rem] font-semibold mb-1">{t('set.corsTitle')}</div>
            <div className="text-[.68rem] muted leading-relaxed">{t('set.corsDesc')}</div>
            <label className="flex items-center gap-2 text-[.72rem] mt-2 cursor-pointer">
              <input type="checkbox" checked={config.proxyMode} onChange={(e) => onConfig({ proxyMode: e.target.checked })} />
              {t('set.proxyMode')}
            </label>
            <div className="mt-2 p-2 rounded-lg font-mono text-[.62rem] break-all" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
              {proxyCommand(config)}
            </div>
            <button className="btn btn-sm mt-2 w-full" onClick={copyProxy}><Copy size={12} /> {t('set.copyProxy')}</button>
          </div>

          {/* Switches */}
          <div className="mt-3 space-y-2 text-[.74rem]">
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" className="mt-1" checked={config.noSaveAudio}
                onChange={(e) => onConfig({ noSaveAudio: e.target.checked })} />
              <span>{t('set.noSaveAudio')}<span className="muted block text-[.65rem]">{t('set.noSaveAudioSub')}</span></span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" className="mt-1" checked={config.aiImages}
                onChange={(e) => onConfig({ aiImages: e.target.checked })} />
              <span>{t('set.aiImages')}<span className="muted block text-[.65rem]">{t('set.aiImagesSub')}</span></span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" className="mt-1" checked={config.duo}
                onChange={(e) => onConfig({ duo: e.target.checked })} />
              <span>{t('set.duo')}</span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" className="mt-1" checked={config.compactRails}
                onChange={(e) => onConfig({ compactRails: e.target.checked })} />
              <span>{t('set.compactRails')}<span className="muted block text-[.65rem]">{t('set.compactRailsSub')}</span></span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" className="mt-1" checked={config.showNetworkPanel}
                onChange={(e) => onConfig({ showNetworkPanel: e.target.checked })} />
              <span>{t('set.showNetworkPanel')}<span className="muted block text-[.65rem]">{t('set.showNetworkPanelSub')}</span></span>
            </label>
          </div>

          {/* Pricing */}
          <Section title={t('set.pricesTitle')}>
            <div className="grid grid-cols-2 gap-2">
              {([
                ['promptPer1k', 'set.price.prompt'], ['completionPer1k', 'set.price.completion'],
                ['ttsPer1kChars', 'set.price.tts'], ['sttPerMinute', 'set.price.stt'],
                ['imageEach', 'set.price.image'],
              ] as const).map(([k, label]) => (
                <div key={k}>
                  <label className="lbl">{t(label)}</label>
                  <input className="field text-[.72rem]" type="number" step="0.001" min="0"
                    value={config.prices[k]}
                    onChange={(e) => onConfig({ prices: { ...config.prices, [k]: Number(e.target.value) || 0 } })} />
                </div>
              ))}
            </div>
            <button className="btn btn-sm mt-2" onClick={() => onConfig({ prices: { ...DEFAULT_PRICES } })}>{t('set.restorePrices')}</button>
          </Section>

          {/* Pedagogy */}
          <Section title={t('set.pedagogyTitle')} defaultOpen>
            <div className="space-y-2 text-[.7rem] leading-relaxed">
              <p><b>{t('set.pedagogy.clt')}</b>{t('set.pedagogy.cltBody')}</p>
              <p><b>{t('set.pedagogy.social')}</b>{t('set.pedagogy.socialBody')}</p>
              <p><b>{t('set.pedagogy.bloom')}</b>{t('set.pedagogy.bloomBody')}</p>
              <p><b>{t('set.pedagogy.kidsafe')}</b>{t('set.pedagogy.kidsafeBody')}</p>
              <p className="muted">{t('set.pedagogy.scaffold')}</p>
            </div>
          </Section>

          <Section title={t('set.limitsTitle')}>
            <div className="text-[.7rem] leading-relaxed space-y-2 muted">
              <p>{t('set.limits.score')}<strong>{t('set.limits.scoreBold')}</strong>{t('set.limits.scoreMid')}<strong>{t('set.limits.scoreNot')}</strong>{t('set.limits.scoreEnd')}</p>
              <p>{t('set.limits.quota')}<strong>{t('set.limits.quotaBold')}</strong>{t('set.limits.quotaEnd')}</p>
              <p>{t('set.limits.mic1')}<code className="kbd">npm run dev</code>{t('set.limits.mic2')}<code className="kbd">http://localhost:5173</code>{t('set.limits.mic3')}</p>
            </div>
          </Section>

          <button className="btn w-full mt-4" onClick={() => { onNewSession(); onClose(); }}>
            {t('set.newSession')}
          </button>
        </div>
      </aside>
    </>
  );
}
