import { useState } from 'react';
import { ArrowRight, ChevronDown, Eye, EyeOff, MessageCircle, Mic, Sparkles, Volume2 } from 'lucide-react';
import type { AnswerEval, CardData, ChatBubble, ScoreResult } from '../types';
import { SENTENCE_FRAMES } from '../mock/questionBank';

export function PipAvatar({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-label="Pip 头像" style={{ flexShrink: 0 }}>
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
  if (!bubbles.length) return null;
  return (
    <div className="panel p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-[.74rem] font-semibold mb-1">
        <MessageCircle size={13} /> 与 Pip 的对话
        <span className="chip ml-auto">共同建构理解</span>
      </div>
      <div className="max-h-72 overflow-y-auto scroll-thin pr-1 space-y-2">
        {bubbles.map((b) => {
          if (b.who === 'note') {
            return <div key={b.id} className="text-center text-[.65rem] muted py-0.5">— {b.text} —</div>;
          }
          const isPip = b.who === 'pip';
          return (
            <div key={b.id} className={`flex items-end gap-2 ${isPip ? '' : 'flex-row-reverse'}`}>
              {isPip ? <PipAvatar size={26} /> : (
                <div className="w-7 h-7 rounded-full grid place-items-center text-[.65rem] font-bold shrink-0"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>我</div>
              )}
              <div className={`bubble ${isPip ? 'bubble-ai' : 'bubble-me'} fade-in`}>
                <div className={`${isPip ? 'bubble-en' : ''} ${hiddenText && isPip ? 'invisible h-0 overflow-hidden' : ''}`}>{b.text}</div>
                {b.zh && <div className="text-[.66rem] muted mt-1">{b.zh}</div>}
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
  const [framesOpen, setFramesOpen] = useState(false);
  return (
    <div className="panel p-4 fade-in" style={{ borderColor: 'var(--accent)' }}>
      <div className="flex items-start gap-2">
        <PipAvatar />
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[.78rem] font-semibold">Pip 追问</span>
            <span className="chip chip-accent">Why / How · 因果推理</span>
            {listening && <span className="text-[.66rem]" style={{ color: 'var(--accent)' }}>播放中…</span>}
          </div>
          <div className={`bubble bubble-ai bubble-en mt-2 inline-block ${subtitle ? '' : 'invisible h-0 overflow-hidden'}`}>
            {question}
          </div>
          {!subtitle && <div className="text-[.68rem] muted mt-1">英文字幕已隐藏 · 练纯听力</div>}
          <div className="flex gap-1.5 mt-2 flex-wrap">
            <button className="btn btn-sm" onClick={onReplay}><Volume2 size={12} /> 再听问题</button>
            <button className="btn btn-sm" onClick={onToggleSubtitle}>{subtitle ? <EyeOff size={12} /> : <Eye size={12} />}{subtitle ? '隐藏字幕' : '显示字幕'}</button>
            <button className="btn btn-sm btn-ghost" onClick={() => setFramesOpen((v) => !v)}>
              <Sparkles size={12} /> 句型支架 <ChevronDown size={11} className={framesOpen ? 'rotate-180' : ''} />
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
        <button className="btn btn-sm btn-primary" onClick={onStartAnswer}><Mic size={12} /> 按住录音回答</button>
        <button className="btn btn-sm btn-ghost" onClick={onSkip}>跳过回答</button>
      </div>
    </div>
  );
}

export function AnswerEvalCard({ evaluation }: { evaluation: AnswerEval }) {
  return (
    <div className="panel-soft p-3 text-[.72rem] fade-in">
      <div className="font-semibold mb-1">开放式回答评价（不按目标句判发音）</div>
      <div className="muted">{evaluation.summary}</div>
    </div>
  );
}

export function WrapCard({
  card, score, evaluation, newWords, isLast, onNext, onReport,
}: {
  card: CardData; score: ScoreResult | null; evaluation: AnswerEval | null;
  newWords: string[]; isLast: boolean; onNext: () => void; onReport: () => void;
}) {
  const list = (newWords.length ? newWords : card.keywords).slice(0, 3);
  return (
    <div className="panel p-4 fade-in">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={15} style={{ color: 'var(--accent)' }} />
        <span className="font-display text-[1rem]">本轮小结</span>
      </div>
      <div className="text-[.76rem] leading-relaxed">
        本轮你用了 {list.length} 个新词：<b>{list.join(' / ')}</b>。
        {score && <> 跟读得分 <b style={{ color: 'var(--accent)' }}>{score.total}</b>。</>}
        {evaluation && <> 口头回答{evaluation.answered ? '切题' : '还需要更贴近问题'}。</>}
      </div>
      <div className="text-[.7rem] muted mt-1.5">
        想一想：为什么 <i>{card.adaptation}</i> 让 {card.animal} 适合 {card.habitatLabel}？这就是最后一轮要总结的「适应」。
      </div>
      <button className="btn btn-primary mt-3" onClick={isLast ? onReport : onNext}>
        {isLast ? '查看本会话成长报告' : '下一张卡'} <ArrowRight size={13} />
      </button>
    </div>
  );
}
