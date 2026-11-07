import { ArrowRight, BookOpen, Lightbulb, RotateCcw, SkipForward, Volume2, X } from 'lucide-react';
import type { Phase, Player, ScoreResult, WordResult } from '../types';
import { PHASE_LABEL } from '../types';
import { renderPieces, t, tr, useI18n } from '../i18n';
import { SENTENCE_FRAMES } from '../mock/questionBank';
import { DimensionBar, ScoreRing } from './Charts';
import { WordLine } from './WordLine';

/** Values are i18n keys, resolved at render time so a switch re-renders them. */
const STATUS_LABEL: Record<WordResult['status'], string> = {
  ok: 'score.status.ok', off: 'score.status.off',
  miss: 'score.status.miss', extra: 'score.status.extra',
};

const LEVEL_KEY: Record<ScoreResult['level'], string> = {
  'Excellent': 'score.level.excellent',
  'Good job': 'score.level.good',
  'Keep going': 'score.level.keep',
  'Try again': 'score.level.try',
};

export function ScorePanel({
  score, duo, duoEnabled, player, hintWord, onWordClick, onCloseHint, onSlowWord, phase,
}: {
  score: ScoreResult | null;
  duo: Partial<Record<Player, ScoreResult>>;
  duoEnabled: boolean;
  player: Player;
  hintWord: WordResult | null;
  onWordClick: (w: WordResult) => void;
  onCloseHint: () => void;
  onSlowWord: (w: WordResult) => void;
  phase: string;
}) {
  useI18n();
  return (
    <aside className="right-rail rail space-y-3">
      <div className="panel p-3">
        <div className="text-[.76rem] font-semibold mb-1">{t('score.title')}</div>
        {score ? (
          <>
            <ScoreRing value={score.total} size={148} caption={t('score.ringCaption', {
              engine: t(score.engine === 'local' ? 'score.engine.local' : 'score.engine.api'),
              wpm: score.wpm, sec: score.durationSec.toFixed(1),
            })} />
            <div className="space-y-2.5 mt-3">
              <DimensionBar label={t('score.dim.accuracy')} value={score.accuracy} weight="50%" />
              <DimensionBar label={t('score.dim.fluency')} value={score.fluency} weight="25%" />
              <DimensionBar label={t('score.dim.completeness')} value={score.completeness} weight="25%" />
            </div>
            {duoEnabled && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(['A', 'B'] as Player[]).map((p) => (
                  <div key={p} className="panel-soft p-2 text-center" style={{ borderColor: p === player ? 'var(--accent)' : undefined }}>
                    <div className="text-[.65rem] muted">{t('score.student', { p })}</div>
                    <div className="font-display text-[1.2rem]" style={{ color: duo[p] ? 'var(--accent)' : 'var(--muted)' }}>
                      {duo[p] ? duo[p]!.total : '—'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-[.7rem] muted leading-relaxed py-4">
            {t('score.placeholder')}
            <div className="mt-2 chip">{t('score.phase', { phase: tr(PHASE_LABEL[phase as Phase] ?? phase) })}</div>
          </div>
        )}
      </div>

      <div className="panel p-3">
        <div className="text-[.76rem] font-semibold mb-2">{t('score.wordTitle')}</div>
        {score ? (
          <>
            <div className="flex flex-wrap gap-1">
              {score.words.map((w, i) => (
                <button key={i}
                  className={`word word-${w.status} text-[.7rem] px-1.5 py-0.5 border hairline rounded-md`}
                  style={{ background: 'var(--surface-2)', cursor: w.status === 'off' || w.status === 'miss' ? 'pointer' : 'default' }}
                  onClick={() => (w.status === 'off' || w.status === 'miss') && onWordClick(w)}
                  title={t(STATUS_LABEL[w.status])}>
                  {w.word}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-2 text-[.62rem] muted flex-wrap">
              <span style={{ color: 'var(--ok)' }}>{t('score.legend.green')}</span>
              <span style={{ color: 'var(--warn)' }}>{t('score.legend.yellow')}</span>
              <span style={{ color: 'var(--bad)' }}>{t('score.legend.red')}</span>
              <span>{t('score.legend.grey')}</span>
            </div>
            <div className="text-[.66rem] muted mt-2 leading-relaxed">{t('score.hintClick')}</div>
          </>
        ) : <div className="text-[.7rem] muted">{t('score.waiting')}</div>}
      </div>

      {hintWord && (
        <div className="panel p-3 fade-in" style={{ borderColor: 'var(--accent)' }}>
          <div className="flex justify-between items-start">
            <div>
              <div className="font-display text-[1.1rem]">{hintWord.word}</div>
              <div className="chip chip-accent mt-1">{hintWord.ipa || '/·/'}</div>
            </div>
            <button className="icon-btn" onClick={onCloseHint} aria-label={t('score.close')}><X size={14} /></button>
          </div>
          <div className="text-[.72rem] mt-2 leading-relaxed"><Lightbulb size={12} className="inline mr-1" />{tr(hintWord.hint)}</div>
          <button className="btn btn-sm btn-primary w-full mt-2" onClick={() => onSlowWord(hintWord)}>
            <Volume2 size={12} /> {t('score.slowDemo')}
          </button>
        </div>
      )}

      <div className="panel p-3">
        <div className="flex items-center gap-1.5 text-[.76rem] font-semibold mb-2"><BookOpen size={13} /> {t('score.framesTitle')}</div>
        <div className="space-y-1.5">
          {SENTENCE_FRAMES.map((f) => <div key={f} className="panel-soft px-2 py-1.5 text-[.7rem] font-mono">{f}</div>)}
        </div>
        <div className="text-[.64rem] muted mt-2 leading-relaxed">{t('score.framesNote')}</div>
      </div>
    </aside>
  );
}

/** Center-column feedback block: coloured sentence, advice, next-step actions. */
export function FeedbackPanel({
  score, target, rerecordLeft, onRetry, onQuestion, onSkip, onWordClick,
}: {
  score: ScoreResult; target: string; rerecordLeft: number;
  onRetry: () => void; onQuestion: () => void; onSkip: () => void; onWordClick: (w: WordResult) => void;
}) {
  useI18n();
  // Locally generated advice stores i18n key fragments; API-side advice is a
  // plain string and passes through tr() unchanged.
  const advice = renderPieces(score.adviceI18n) || tr(score.advice);
  return (
    <div className="panel p-4 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <div className="text-[.82rem] font-semibold">
          {t('score.feedbackTitle')} <span className="chip chip-accent ml-1">{t('score.points', { n: score.total })} · {t(LEVEL_KEY[score.level])}</span>
          {score.engine === 'local' && <span className="chip ml-1">{t('score.engine.local')}</span>}
        </div>
        <div className="text-[.68rem] muted">{t('score.wpmLine', { wpm: score.wpm, sec: score.durationSec.toFixed(1) })}</div>
      </div>
      <div className="panel-soft p-3 rounded-xl">
        <WordLine text={target} results={score.words} onWordClick={onWordClick} scanning />
      </div>
      <div className="mt-2 text-[.76rem] leading-relaxed flex gap-1.5">
        <Lightbulb size={14} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
        <span>{advice}</span>
      </div>
      <div className="flex gap-2 mt-3 flex-wrap">
        <button className="btn btn-sm" disabled={rerecordLeft <= 0} onClick={onRetry}>
          <RotateCcw size={12} /> {t('score.retry', { n: rerecordLeft })}
        </button>
        <button className="btn btn-sm btn-primary" onClick={onQuestion}><Volume2 size={12} /> {t('score.listenQuestion')} <ArrowRight size={12} /></button>
        <button className="btn btn-sm btn-ghost" onClick={onSkip}><SkipForward size={12} /> {t('score.skip')}</button>
      </div>
    </div>
  );
}
