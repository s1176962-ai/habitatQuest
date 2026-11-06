import { useState } from 'react';
import { ChevronDown, Copy, Eye, EyeOff, KeyRound, ShieldCheck, Trash2, X } from 'lucide-react';
import type { Config, ProviderId } from '../types';
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
  local: '本地通道：不产生任何网络请求',
  api: 'API 通道：只向你填写的 Base URL 发请求',
};

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
      onToast('已复制启动命令。请把 <你的密钥> 替换成真实密钥后，在项目目录的终端里运行。', 'ok');
    } catch { onToast('复制失败，请手动选中命令文本复制。', 'warn'); }
  };

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer fade-in" role="dialog" aria-label="设置">
        <div className="flex items-center justify-between px-4 py-3 border-b hairline shrink-0">
          <div>
            <h2 className="font-display text-[1.05rem]">设置</h2>
            <div className="text-[.68rem] muted">本机运行 · 无服务器 · 无账号</div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="关闭设置"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto scroll-thin px-4 pb-8">
          {/* External domain audit — checked at session start */}
          <div className="mt-3 panel-soft p-3">
            <div className="flex items-center gap-1.5 text-[.74rem] font-semibold mb-1.5">
              <ShieldCheck size={14} style={{ color: 'var(--ok)' }} /> 本次会话外部域名检测
            </div>
            {domains.length === 0 ? (
              <div className="text-[.72rem]" style={{ color: 'var(--ok)' }}>
                0 个外部域名 · 本地通道不会发起任何请求
              </div>
            ) : (
              <ul className="text-[.72rem] space-y-1">
                {domains.map((d) => <li key={d} className="font-mono">• {d}</li>)}
              </ul>
            )}
            <div className="text-[.65rem] muted mt-1.5 leading-relaxed">
              应用没有 CDN、字体、图片或遥测请求；所有资源随 Vite 本地打包。浏览器内置语音识别可能由浏览器厂商自行联网，应用本身不发起请求；断网时可用「输入我说的话」兜底。
            </div>
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
                <div className="text-[.78rem] font-semibold">{ch === 'local' ? 'A · 本地通道' : 'B · API 通道'}</div>
                <div className="text-[.64rem] muted mt-0.5">{ch === 'local' ? '无需 Key · 零成本' : '需要 Key · 消耗配额'}</div>
              </button>
            ))}
          </div>
          <div className="text-[.7rem] mt-2 px-1" style={{ color: config.channel === 'local' ? 'var(--ok)' : 'var(--warn)' }}>
            {CHANNEL_NOTE[config.channel]}
          </div>

          {/* Provider */}
          <div className="mt-3 space-y-2.5">
            <div>
              <label className="lbl">Provider 预设（选定后可编辑）</label>
              <select className="field" value={config.provider}
                onChange={(e) => applyPreset(e.target.value as ProviderId)}>
                <option value="openai-compatible">OpenAI 兼容 · gpt-4o-mini</option>
                <option value="gemini">Gemini · gemini-2.0-flash</option>
                <option value="custom">自定义 · OpenAI Chat Completions 格式</option>
              </select>
            </div>
            <div>
              <label className="lbl">Base URL</label>
              <input className="field font-mono text-[.72rem]" value={config.baseUrl}
                onChange={(e) => onConfig({ baseUrl: e.target.value })} placeholder="https://api.openai.com/v1" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="lbl">模型名</label>
                <input className="field font-mono text-[.72rem]" value={config.model} onChange={(e) => onConfig({ model: e.target.value })} /></div>
              <div><label className="lbl">STT 模型</label>
                <input className="field font-mono text-[.72rem]" value={config.sttModel} onChange={(e) => onConfig({ sttModel: e.target.value })} /></div>
              <div><label className="lbl">TTS 模型</label>
                <input className="field font-mono text-[.72rem]" value={config.ttsModel} onChange={(e) => onConfig({ ttsModel: e.target.value })} /></div>
              <div><label className="lbl">TTS 音色</label>
                <input className="field font-mono text-[.72rem]" value={config.ttsVoice} onChange={(e) => onConfig({ ttsVoice: e.target.value })} /></div>
            </div>
            <div>
              <label className="lbl">语速</label>
              <div className="flex gap-2">
                {[0.75, 1].map((r) => (
                  <button key={r} className={`btn btn-sm flex-1 ${config.rate === r ? 'btn-primary' : ''}`}
                    onClick={() => onConfig({ rate: r })}>{r}× {r === 1 ? '正常' : '慢速'}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Key */}
          <div className="mt-4 panel p-3">
            <div className="flex items-center gap-1.5 text-[.76rem] font-semibold mb-2"><KeyRound size={14} /> API Key</div>
            <form className="flex gap-1.5" onSubmit={(e) => e.preventDefault()}>
              <input
                className="field font-mono text-[.72rem]" type={showKey ? 'text' : 'password'}
                value={keyDraft} placeholder={masked || 'sk-••••••••3f2a'} autoComplete="off" spellCheck={false}
                onChange={(e) => { setKeyDraft(e.target.value); saveKey(e.target.value, config.keyStoreMode); }}
              />
              <button type="button" className="icon-btn shrink-0" onClick={() => setShowKey((v) => !v)} aria-label="显示/隐藏密钥">
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </form>
            <div className="text-[.65rem] muted mt-1.5">当前：{existingKey ? `${masked}（存于 ${keyLocation()}）` : '未保存密钥'}</div>

            <div className="mt-2">
              <label className="lbl">存储方式</label>
              <div className="flex gap-3 text-[.72rem]">
                {(['session', 'local'] as const).map((m) => (
                  <label key={m} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="keystore" checked={config.keyStoreMode === m}
                      onChange={() => { onConfig({ keyStoreMode: m }); migrateKey(m); }} />
                    {m === 'session' ? '仅本次会话（默认）' : '记住到本机'}
                  </label>
                ))}
              </div>
            </div>

            <div className="text-[.66rem] muted mt-2.5 leading-relaxed border-l-2 pl-2" style={{ borderColor: 'var(--accent)' }}>
              密钥仅保存在此浏览器的本地存储中，只用于向你填写的 API 地址发起请求。本应用没有服务器，不会上传、同步或记录你的密钥。
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3">
              <button className="btn btn-sm" disabled={testing} onClick={async () => {
                setTesting(true);
                try { await onTestConnection(); } finally { setTesting(false); }
              }}>{testing ? '测试中…' : '测试连接'}</button>
              <button className="btn btn-sm" onClick={() => {
                clearKey(); setKeyDraft('');
                onToast('密钥已从本机清除。', 'ok');
              }}><Trash2 size={12} /> 清除密钥</button>
              <button className="btn btn-sm" onClick={() => {
                downloadText('habitatquest-records.json', exportRecords());
                onToast('学习记录已导出为本机 JSON（不含密钥、不含录音）。', 'ok');
              }}>导出记录</button>
              <button className="btn btn-sm" onClick={() => { onClearRecords(); onToast('本机学习记录已清空。', 'ok'); }}>清空记录</button>
            </div>
          </div>

          {/* CORS / local relay */}
          <div className="mt-3 panel-soft p-3">
            <div className="text-[.76rem] font-semibold mb-1">浏览器直连与 CORS</div>
            <div className="text-[.68rem] muted leading-relaxed">
              默认直连你填写的 Base URL。若浏览器因 CORS 拦截请求，可启用下方「经本机代理转发」，并在项目目录运行一条命令启动只监听 127.0.0.1:8787 的转发脚本：密钥只在该进程内存里，不落盘、不记日志、不会转发到其它域名。
            </div>
            <label className="flex items-center gap-2 text-[.72rem] mt-2 cursor-pointer">
              <input type="checkbox" checked={config.proxyMode} onChange={(e) => onConfig({ proxyMode: e.target.checked })} />
              经本机代理转发（127.0.0.1:8787）
            </label>
            <div className="mt-2 p-2 rounded-lg font-mono text-[.62rem] break-all" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
              {proxyCommand(config)}
            </div>
            <button className="btn btn-sm mt-2 w-full" onClick={copyProxy}><Copy size={12} /> 复制一键启动命令</button>
          </div>

          {/* Switches */}
          <div className="mt-3 space-y-2 text-[.74rem]">
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" className="mt-1" checked={config.noSaveAudio}
                onChange={(e) => onConfig({ noSaveAudio: e.target.checked })} />
              <span>本次会话不保存录音（默认开）<span className="muted block text-[.65rem]">录音 blob 只留在内存，打分后立即释放；从不写入磁盘或 localStorage。</span></span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" className="mt-1" checked={config.aiImages}
                onChange={(e) => onConfig({ aiImages: e.target.checked })} />
              <span>AI 生成图片（每会话最多 2 张）<span className="muted block text-[.65rem]">失败或超额自动回落到内置 12 张本地 SVG 插画。</span></span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" className="mt-1" checked={config.duo}
                onChange={(e) => onConfig({ duo: e.target.checked })} />
              <span>双人练习（同桌轮流说同一张卡，分数并列展示）</span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" className="mt-1" checked={config.compactRails}
                onChange={(e) => onConfig({ compactRails: e.target.checked })} />
              <span>专注模式：收起左右侧栏<span className="muted block text-[.65rem]">只保留中间的练习卡片与步骤引导，界面更清爽；顶栏也有同样的切换按钮。</span></span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" className="mt-1" checked={config.showNetworkPanel}
                onChange={(e) => onConfig({ showNetworkPanel: e.target.checked })} />
              <span>右下角显示网络请求清单<span className="muted block text-[.65rem]">默认收成一个小胶囊，点击才展开；关掉后仍可用顶栏的网络按钮随时打开完整清单。</span></span>
            </label>
          </div>

          {/* Pricing */}
          <Section title="本地单价估算（可手填，不联网查价）">
            <div className="grid grid-cols-2 gap-2">
              {([
                ['promptPer1k', '输入 / 1K tok ¥'], ['completionPer1k', '输出 / 1K tok ¥'],
                ['ttsPer1kChars', 'TTS / 1K 字符 ¥'], ['sttPerMinute', 'STT / 分钟 ¥'],
                ['imageEach', '图片 / 张 ¥'],
              ] as const).map(([k, label]) => (
                <div key={k}>
                  <label className="lbl">{label}</label>
                  <input className="field text-[.72rem]" type="number" step="0.001" min="0"
                    value={config.prices[k]}
                    onChange={(e) => onConfig({ prices: { ...config.prices, [k]: Number(e.target.value) || 0 } })} />
                </div>
              ))}
            </div>
            <button className="btn btn-sm mt-2" onClick={() => onConfig({ prices: { ...DEFAULT_PRICES } })}>恢复参考值</button>
          </Section>

          {/* Pedagogy */}
          <Section title="教学设计依据（展示给老师看）" defaultOpen>
            <div className="space-y-2 text-[.7rem] leading-relaxed">
              <p><b>CLT 交际语言教学</b>：每轮都有真实信息差 —— AI 伙伴看不到学生的卡片，学生必须用英语把动物与适应特征描述出来；追问后必须真的回答，而不是念单词。</p>
              <p><b>社会建构主义</b>：固定「Pip」伙伴人设 + 连续对话气泡，学生与伙伴共同建构对适应的理解；双人练习让同桌轮流说同一张卡并并列展示分数。</p>
              <p><b>Upper Bloom's（分析与交流）</b>：追问只允许 Why / How 因果题，禁止 Yes/No 与语法选择题；最后一轮引导学生总结「我的动物为什么适合这个栖息地」。</p>
              <p><b>Kid-safe</b>：system prompt 锁定话题、CEFR A2–B1 简单英语；不询问姓名 / 学校 / 位置；界面无广告、无外链、不收集身份信息。</p>
              <p className="muted">脚手架：提供 It needs ... because ... / It can ... so that ... 句型支架，但不代替学生作答。</p>
            </div>
          </Section>

          <Section title="能力边界与运行约束">
            <div className="text-[.7rem] leading-relaxed space-y-2 muted">
              <p>评分基于<strong>文本对齐 + 识别置信度</strong>衡量可懂度与跟读准确度，<strong>不是音素级声学测评</strong>，不宣称专业发音测评。</p>
              <p>限额是<strong>客户端成本护栏</strong>，用于课堂演示与防误操作，不是安全边界；真正硬的额度请在 API 供应商控制台设置。</p>
              <p>麦克风只在安全上下文可用：必须 <code className="kbd">npm run dev</code> 后打开 <code className="kbd">http://localhost:5173</code>。直接双击 index.html（file://）会自动切换为音频文件上传 / 文本输入兜底。</p>
            </div>
          </Section>

          <button className="btn w-full mt-4" onClick={() => { onNewSession(); onClose(); }}>
            重新开始一组 8 张卡
          </button>
        </div>
      </aside>
    </>
  );
}
