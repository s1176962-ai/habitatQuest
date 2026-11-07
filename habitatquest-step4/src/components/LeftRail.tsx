import type { CardData, LearningRecord } from '../types';
import { t, useI18n } from '../i18n';
import { animalName, illustrationFor } from '../mock/cards';
import { ProgressLine } from './Charts';
import { Sparkles } from 'lucide-react';

export function LeftRail({
  round, cards, history, records,
}: {
  round: number;
  cards: CardData[];
  history: { card: CardData; score: number }[];
  records: LearningRecord[];
}) {
  const { lang } = useI18n();
  const values = records.slice(-8).map((r) => r.total);
  return (
    <aside className="left-rail rail space-y-3">
      <div className="panel p-3">
        <div className="chip chip-accent mb-2">{t('top.tagPractice')}</div>
        <div className="text-[.7rem] muted leading-relaxed">{t('rail.intro')}</div>
      </div>

      <div className="panel p-3">
        <div className="text-[.74rem] font-semibold mb-2">{t('rail.progress')} <span className="muted font-normal">{Math.min(round + 1, cards.length || 8)} / {cards.length || 8}</span></div>
        <div className="flex gap-1.5 flex-wrap">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className={`round-dot ${i < round ? 'done' : i === round ? 'current' : ''}`}>
              {i < round ? '✓' : i + 1}
            </div>
          ))}
        </div>
        <div className="text-[.66rem] muted mt-2">{t('rail.roundHint')}</div>
      </div>

      <div className="panel p-3">
        <div className="text-[.74rem] font-semibold mb-2">{t('rail.history')}</div>
        {history.length === 0 ? (
          <div className="text-[.68rem] muted">{t('rail.historyEmpty')}</div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto scroll-thin pr-1">
            {history.map((h, i) => (
              <div key={i} className="relative" title={t('rail.historyTitle', { animal: animalName(h.card, lang), n: h.score })}>
                <div className="thumb" dangerouslySetInnerHTML={{ __html: illustrationFor(h.card.illustration) }} />
                <span className="absolute bottom-0.5 right-0.5 text-[.58rem] px-1 rounded"
                  style={{ background: 'rgba(24,20,17,.72)', color: '#fff' }}>{h.score}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel p-3">
        <div className="text-[.74rem] font-semibold mb-1">{t('rail.myProgress')}</div>
        <ProgressLine values={values} height={76} />
        <div className="text-[.65rem] muted mt-1">
          {values.length
            ? t('rail.avg', { n: values.length, v: Math.round(values.reduce((a, b) => a + b, 0) / values.length) })
            : t('rail.noScores')}
        </div>
      </div>

      <div className="panel-soft p-3">
        <div className="flex items-center gap-1.5 text-[.72rem] font-semibold mb-1"><Sparkles size={13} /> {t('rail.shortcuts')}</div>
        <div className="text-[.66rem] muted leading-relaxed">
          <span className="kbd">{t('rail.space')}</span> {t('rail.holdRecord')} <span className="kbd">{t('rail.enter')}</span> {t('rail.submit')} <span className="kbd">{t('rail.esc')}</span> {t('rail.closeSkip')}
        </div>
      </div>

      <div className="chip w-full justify-center">{t('rail.tagDemo')}</div>
    </aside>
  );
}
