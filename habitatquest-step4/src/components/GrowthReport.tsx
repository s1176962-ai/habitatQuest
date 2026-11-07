import { Award, RotateCcw, Trash2, TrendingUp, X } from 'lucide-react';
import type { HabitatId, LearningRecord } from '../types';
import { t, useI18n } from '../i18n';
import { habitatName } from '../mock/cards';
import { ProgressLine } from './Charts';

export function GrowthReport({
  records, onRestart, onClear, onClose,
}: {
  records: LearningRecord[];
  onRestart: () => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const { lang } = useI18n();
  const scores = records.map((r) => r.total);
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const best = scores.length ? Math.max(...scores) : 0;
  const first = scores[0] ?? 0;
  const last = scores[scores.length - 1] ?? 0;
  const delta = last - first;

  const counts = new Map<string, number>();
  records.forEach((r) => r.missedWords.forEach((w) => counts.set(w, (counts.get(w) || 0) + 1)));
  const topMissed = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const byHabitat = new Map<string, number[]>();
  records.forEach((r) => byHabitat.set(r.habitat, [...(byHabitat.get(r.habitat) || []), r.total]));
  const bestHabitat = [...byHabitat.entries()]
    .map(([h, v]) => ({ h, avg: v.reduce((a, b) => a + b, 0) / v.length }))
    .sort((a, b) => b.avg - a.avg)[0];

  const stats: { key: string; v: string }[] = [
    { key: 'report.stat.avg', v: String(avg) },
    { key: 'report.stat.best', v: String(best) },
    { key: 'report.stat.delta', v: `${delta >= 0 ? '+' : ''}${delta}` },
  ];

  return (
    <div className="drawer-backdrop" style={{ display: 'grid', placeItems: 'center', padding: '1rem' }}>
      <div className="panel fade-in w-full max-w-[620px] max-h-[92vh] overflow-y-auto scroll-thin p-5" style={{ boxShadow: 'var(--shadow-lg)' }} role="dialog" aria-label={t('report.aria')}>
        <div className="flex items-start justify-between">
          <div>
            <div className="chip chip-accent mb-1"><Award size={11} /> {t('report.tag')}</div>
            <h2 className="font-display text-[1.5rem]">{t('report.title')}</h2>
            <div className="text-[.7rem] muted">{t('report.subtitle')}</div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label={t('report.close')}><X size={16} /></button>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          {stats.map(({ key, v }) => (
            <div key={key} className="panel-soft p-3 text-center">
              <div className="text-[.66rem] muted">{t(key)}</div>
              <div className="font-display text-[1.5rem]" style={{ color: 'var(--accent)' }}>{v}</div>
            </div>
          ))}
        </div>

        <div className="panel-soft p-3 mt-3">
          <div className="flex items-center gap-1.5 text-[.76rem] font-semibold mb-1"><TrendingUp size={13} /> {t('report.chart')}</div>
          <ProgressLine values={scores.slice(-8)} height={130} showLabels />
          <div className="text-[.65rem] muted mt-1">{t('report.chartNote')}</div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          <div className="panel-soft p-3">
            <div className="text-[.76rem] font-semibold mb-2">{t('report.topMissed')}</div>
            {topMissed.length ? topMissed.map(([w, n]) => (
              <div key={w} className="flex justify-between text-[.72rem] py-0.5">
                <span className="font-mono" style={{ color: 'var(--bad)' }}>{w}</span><span className="muted">{t('report.times', { n })}</span>
              </div>
            )) : <div className="text-[.7rem] muted">{t('report.noMissed')}</div>}
          </div>
          <div className="panel-soft p-3">
            <div className="text-[.76rem] font-semibold mb-2">{t('report.bestHabitat')}</div>
            {bestHabitat ? (
              <>
                <div className="font-display text-[1.1rem]">{habitatName(bestHabitat.h as HabitatId, lang)}</div>
                <div className="text-[.7rem] muted mt-1">
                  {t('report.habitatAvg', {
                    n: Math.round(bestHabitat.avg),
                    // Bilingual gloss: the other language's name as teaching support.
                    name: habitatName(bestHabitat.h as HabitatId, lang === 'zh' ? 'en' : 'zh'),
                  })}
                </div>
              </>
            ) : <div className="text-[.7rem] muted">{t('report.noData')}</div>}
            <div className="text-[.68rem] muted mt-3 leading-relaxed border-t hairline pt-2">{t('report.bloom')}</div>
          </div>
        </div>

        <div className="flex gap-2 mt-4 flex-wrap">
          <button className="btn btn-primary" onClick={onRestart}><RotateCcw size={13} /> {t('report.again')}</button>
          <button className="btn" onClick={onClear}><Trash2 size={13} /> {t('report.clear')}</button>
          <button className="btn btn-ghost" onClick={onClose}>{t('report.back')}</button>
        </div>
      </div>
    </div>
  );
}
