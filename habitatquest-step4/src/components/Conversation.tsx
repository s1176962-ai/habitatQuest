import { useState } from 'react';
import { ArrowRight, ChevronDown, Eye, EyeOff, MessageCircle, Mic, Sparkles, Volume2 } from 'lucide-react';
import type { AnswerEval, CardData, ChatBubble, ScoreResult } from '../types';
import { renderPieces, t, tr, useI18n } from '../i18n';
import { SENTENCE_FRAMES } from '../mock/questionBank';
import { habitatName } from '../mock/cards';

export function PipAvatar({ size = 28 }: { size?: number }) {
  useI18n();
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-label={t('conv.pipAvatar')} style={{ flexShrink: 0 }}>
      <circle cx="20" cy="20" r="19" fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="1.2" />
      <path d="M9 16 L11 6 L18 12 Z" fill="#d98b4e" />
      <path d="M31 16 L29 6 L22 12 Z" fill="#d98b4e" />
      <ellipse cx="20" cy="22" rx="13" ry="12" fill="#e6a565" />
      <ellipse cx="20" cy="26" rx="7" ry="6" fill="#fdf2dd" />
      <circle cx="15.5" cy="20" r="2" fill="#3a3430" />
      <circle cx="24.5" cy="20" r="2" fill="#3a3430" />
      <path d="M20 24 l-2.5 2.5 q2.5 2.5 5 0 Z" fill="#3a3430" />
    </svg>
  );
}

export function ChatBubbles({ bubbles, hiddenText = false }: { bubbles: ChatBubble[]; hiddenText?: boolean }) {
  useI18n();
  if (!bubbles.length) return null;
  return (
    <div className="panel p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-[.74rem] font-semibold mb-1">
        <MessageCircle size={13} /> {t('conv.title')}
        <span className="chip ml-auto">{t('conv.tag')}</span>
      </div>
      <div className="max-h-72 overflow-y-auto scroll-thin pr-1 space-y-2">
        {bubbles.map((b) => {
          if (b.who === 'note') {
            const note = renderPieces(b.textI18n) || tr(b.text) || tr(b.note);
            return <div key={b.id} className="text-center text-[.65rem] muted py-0.5">— {note} —</div>;
          }
          const isPip = b.who === 'pip';
          return (
            <div key={b.id} className={`flex items-end gap-2 ${isPip ? '' : 'flex-row-reverse'}`}>
              {isPip ? <PipAvatar size={26} /> : (
                <div className="w-7 h-7 rounded-full grid place-items-center text-[.65rem] font-bold shrink-0"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>{t('conv.me')}</div>
              )}
              <div className={`bubble ${isPip ? 'bubble-ai' : 'bubble-me'} fade-in`}>
                <div className={`${isPip ? 'bubble-en' : ''} ${hiddenText && isPip ? 'invisible h-0 overflow-hidden' : ''}`}>{b.text}</div>
                {b.note && <div className="text-[.66rem] muted mt-1">{tr(b.note)}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function QuestionCard({
  question, listening, subtitle, onToggleSubtitle, onReplay, onStartAnswer, onSkip,
}: {
  question: string; listening: boolean; subtitle: boolean;
  onToggleSubtitle: () => void; onReplay: () => void; onStartAnswer: () => void; onSkip: () => void;
}) {
  useI18n();
  const [framesOpen, setFramesOpen] = useState(false);
  return (
    <div className="panel p-4 fade-in" style={{ borderColor: 'var(--accent)' }}>
      <div className="flex items-start gap-2">
        <PipAvatar />
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[.78rem] font-semibold">{t('conv.pipQuestion')}</span>
            <span className="chip chip-accent">{t('conv.causal')}</span>
            {listening && <span className="text-[.66rem]" style={{ color: 'var(--accent)' }}>{t('conv.playing')}</span>}
          </div>
          <div className={`bubble bubble-ai bubble-en mt-2 inline-block ${subtitle ? '' : 'invisible h-0 overflow-hidden'}`}>
            {question}
          </div>
          {!subtitle && <div className="text-[.68rem] muted mt-1">{t('conv.subtitleHidden')}</div>}
          <div className="flex gap-1.5 mt-2 flex-wrap">
            <button className="btn btn-sm" onClick={onReplay}><Volume2 size={12} /> {t('conv.replay')}</button>
            <button className="btn btn-sm" onClick={onToggleSubtitle}>{subtitle ? <EyeOff size={12} /> : <Eye size={12} />}{t(subtitle ? 'conv.hideSubtitle' : 'conv.showSubtitle')}</button>
            <button className="btn btn-sm btn-ghost" onClick={() => setFramesOpen((v) => !v)}>
              <Sparkles size={12} /> {t('conv.frames')} <ChevronDown size={11} className={framesOpen ? 'rotate-180' : ''} />
            </button>
          </div>
          {framesOpen && (
            <div className="mt-2 space-y-1">
              {SENTENCE_FRAMES.slice(0, 2).map((f) => (
                <div key={f} className="panel-soft px-2 py-1 text-[.7rem] font-mono">{f}</div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-2 mt-3 flex-wrap">
        <button className="btn btn-sm btn-primary" onClick={onStartAnswer}><Mic size={12} /> {t('conv.answerBtn')}</button>
        <button className="btn btn-sm btn-ghost" onClick={onSkip}>{t('conv.skipAnswer')}</button>
      </div>
    </div>
  );
}

/** Rebuilt from AnswerEval fields so the sentence follows the active language. */
export function AnswerEvalCard({ evaluation }: { evaluation: AnswerEval }) {
  useI18n();
  const parts = [
    t(evaluation.answered ? 'eval.answered' : 'eval.notAnswered'),
    t(evaluation.usedCausal ? 'eval.causal' : 'eval.tryCausal'),
    t(evaluation.longEnough ? 'eval.lengthOk' : 'eval.lengthShort', { n: evaluation.wordCount }),
    t(evaluation.fillerCount > 0 ? 'eval.fillers' : 'eval.fluent', { n: evaluation.fillerCount }),
  ];
  return (
    <div className="panel-soft p-3 text-[.72rem] fade-in">
      <div className="font-semibold mb-1">{t('conv.evalTitle')}</div>
      <div className="muted">{parts.join(' · ')}</div>
    </div>
  );
}

export function WrapCard({
  card, score, evaluation, newWords, isLast, onNext, onReport,
}: {
  card: CardData; score: ScoreResult | null; evaluation: AnswerEval | null;
  newWords: string[]; isLast: boolean; onNext: () => void; onReport: () => void;
}) {
  const { lang } = useI18n();
  const list = (newWords.length ? newWords : card.keywords).slice(0, 3);
  return (
    <div className="panel p-4 fade-in">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={15} style={{ color: 'var(--accent)' }} />
        <span className="font-display text-[1rem]">{t('wrap.title')}</span>
      </div>
      <div className="text-[.76rem] leading-relaxed">
        {t('wrap.newWords', { n: list.length })}<b>{list.join(' / ')}</b>{t('wrap.period')}
        {score && <> {t('wrap.readScore')} <b style={{ color: 'var(--accent)' }}>{score.total}</b>{t('wrap.period')}</>}
        {evaluation && <> {t(evaluation.answered ? 'wrap.answerOn' : 'wrap.answerOff')}</>}
      </div>
      <div className="text-[.7rem] muted mt-1.5">
        {t('wrap.reflection1')}<i>{card.adaptation}</i>{t('wrap.reflection2', {
          animal: card.animal, habitat: habitatName(card.habitat, lang),
        })}
      </div>
      <button className="btn btn-primary mt-3" onClick={isLast ? onReport : onNext}>
        {t(isLast ? 'wrap.report' : 'wrap.next')} <ArrowRight size={13} />
      </button>
    </div>
  );
}
