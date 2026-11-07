import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Eye, EyeOff, ImagePlus, RefreshCcw, Sparkles, Square, Upload, Volume2 } from 'lucide-react';
import type { CardData, Config, Phase } from '../types';
import { t, useI18n } from '../i18n';
import { habitatName, illustrationFor } from '../mock/cards';
import { WordLine } from './WordLine';
import type { Toast } from './Toasts';

interface Props {
  card: CardData;
  phase: Phase;
  config: Config;
  imageUrl: string | null;
  imageBusy: boolean;
  generated: boolean;
  showText: boolean;
  slow: boolean;
  listening: boolean;
  activeWord: number;
  relistenLeft: number;
  onCardClick: () => void;
  onRelisten: () => void;
  onStopTts: () => void;
  onSkipTts: () => void;
  onToggleSlow: () => void;
  onToggleText: () => void;
  onUpload: (f: File) => void;
  onGenerateImage: () => void;
  onClearImage: () => void;
  onToast: (text: string, tone?: Toast['tone']) => void;
}

export function CardStage(p: Props) {
  const { card, phase } = p;
  const { lang } = useI18n();
  const cardRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!cardRef.current || reduced) return;
    const tl = gsap.fromTo(cardRef.current,
      { rotateY: -90, scale: .9, opacity: 0 },
      { rotateY: 0, scale: 1, opacity: 1, duration: .6, ease: 'power3.out' });
    return () => { tl.kill(); };
  }, [card.id, reduced]);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduced || phase !== 'card' || !tiltRef.current) return;
    const r = tiltRef.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - .5;
    const y = (e.clientY - r.top) / r.height - .5;
    tiltRef.current.style.transform = `rotateY(${x * 9}deg) rotateX(${-y * 9}deg)`;
  };
  const onLeave = () => { if (tiltRef.current) tiltRef.current.style.transform = ''; };

  const clickable = phase === 'card' || phase === 'listening';
  const svgHtml = illustrationFor(card.illustration);

  return (
    <div className="panel p-4 sm:p-5">
      {/* Card */}
      <div className="stage-card-wrap max-w-[460px] mx-auto" ref={tiltRef} onMouseMove={onMove} onMouseLeave={onLeave}>
        <div
          ref={cardRef}
          className={`stage-card ${clickable ? 'clickable' : ''}`}
          style={{ borderColor: card.color }}
          onClick={() => { if (clickable) p.onCardClick(); }}
          role={clickable ? 'button' : undefined}
          tabIndex={clickable ? 0 : undefined}
          onKeyDown={(e) => { if (clickable && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); p.onCardClick(); } }}
          aria-label={t('card.aria', { animal: card.animal })}
        >
          {p.imageUrl
            ? <img src={p.imageUrl} alt={card.animal} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : <div className="illustration" dangerouslySetInnerHTML={{ __html: svgHtml }} />}
          {phase === 'card' && <div className="card-glow" />}
          {phase === 'card' && (
            <div className="tap-hint"><Volume2 size={13} /> {t('card.tapHint')}</div>
          )}
          {p.generated && (
            <span className="absolute top-2 left-2 chip" style={{ background: 'rgba(255,255,255,.86)', color: '#2e2a26' }}>
              <Sparkles size={10} /> {t('card.aiImage')}
            </span>
          )}
        </div>
      </div>

      {/* Card meta + image sources */}
      <div className="max-w-[460px] mx-auto mt-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h2 className="font-display text-[1.18rem] leading-tight">{card.animal} <span className="muted text-[.85rem]">· {habitatName(card.habitat, lang)}</span></h2>
            <div className="text-[.68rem] muted">
              {lang === 'zh' && <>{card.chineseName} · </>}
              {t('card.difficulty')} {'★'.repeat(card.difficulty)}{'☆'.repeat(3 - card.difficulty)} · {t('card.adaptation')}{lang === 'zh' ? '' : ' '}{card.adaptation}
            </div>
          </div>
          <div className="flex gap-1">
            <button className="btn btn-sm" onClick={() => fileRef.current?.click()} title={t('card.uploadImageTitle')}><Upload size={12} /> {t('card.uploadImage')}</button>
            {p.config.channel === 'api' && (
              <button className="btn btn-sm" disabled={p.imageBusy} onClick={p.onGenerateImage} title={t('card.aiGenerateTitle')}>
                {p.imageBusy ? t('card.generating') : <><ImagePlus size={12} /> {t('card.aiGenerate')}</>}
              </button>
            )}
            {p.imageUrl && <button className="btn btn-sm" onClick={p.onClearImage} title={t('card.restoreImageTitle')}><RefreshCcw size={12} /></button>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) p.onUpload(f); e.target.value = ''; }} />
        </div>

        <div className="flex gap-1.5 flex-wrap mt-2">
          {card.keywords.map((k) => <span key={k} className="chip chip-accent">{k}</span>)}
        </div>
      </div>

      <div className="divider my-3" />

      {/* Target sentence / karaoke */}
      <div className="max-w-[620px] mx-auto">
        <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
          <span className="text-[.68rem] muted">{t('card.targetLabel')}</span>
          <div className="flex gap-1.5 flex-wrap">
            <button className={`btn btn-sm ${p.slow ? 'btn-primary' : ''}`} onClick={p.onToggleSlow} title={t('card.slowTitle')}>0.75×</button>
            <button className={`btn btn-sm ${!p.showText ? 'btn-primary' : ''}`} onClick={p.onToggleText}>
              {p.showText ? <EyeOff size={12} /> : <Eye size={12} />}{p.showText ? t('card.hideText') : t('card.showText')}
            </button>
            <button className="btn btn-sm" disabled={phase === 'card' || p.relistenLeft <= 0}
              onClick={p.onRelisten} title={t('card.relistenTitle', { n: p.relistenLeft })}>
              <Volume2 size={12} /> {t('card.relisten')} <span className="muted">({p.relistenLeft})</span>
            </button>
            {p.listening && <button className="btn btn-sm" onClick={p.onStopTts}><Square size={11} /> {t('card.stop')}</button>}
          </div>
        </div>

        <WordLine text={card.target} activeWord={p.activeWord} hidden={!p.showText} />

        {p.listening && (
          <div className="flex items-center justify-center gap-1 h-8 mt-1">
            {Array.from({ length: 16 }, (_, i) => (
              <span key={i} className="wave-dot" style={{ animationDelay: `${(i % 7) * 90}ms` }} />
            ))}
            <span className="text-[.68rem] muted ml-2">{t('card.playing')}</span>
          </div>
        )}
        {phase === 'card' && (
          <div className="cta-row">
            <button className="btn btn-primary btn-lg" onClick={p.onCardClick}>
              <Volume2 size={16} /> {t('card.ctaMain')}
            </button>
            <button className="btn btn-sm" onClick={p.onSkipTts} title={t('card.skipTitle')}>
              {t('card.skipDirect')}
            </button>
            <span className="text-[.66rem] muted w-full text-center">{t('card.alsoClick')}</span>
          </div>
        )}
        {phase === 'listening' && (
          <div className="cta-row">
            <button className="btn btn-sm btn-primary" onClick={p.onSkipTts}>{t('card.skipToRecord')}</button>
            <span className="text-[.68rem] muted">{t('card.autoNext')}</span>
          </div>
        )}
      </div>
    </div>
  );
}
