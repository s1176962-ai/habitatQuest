import { Award, RotateCcw, Trash2, TrendingUp, X } from 'lucide-react';
import type { LearningRecord } from '../types';
import { HABITAT_META } from '../mock/cards';
import { ProgressLine } from './Charts';

export function GrowthReport({
  records, onRestart, onClear, onClose,
}: {
  records: LearningRecord[];
  onRestart: () => void;
  onClear: () => void;
  onClose: () => void;
}) {
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

  return (
    <div className="drawer-backdrop" style={{ display: 'grid', placeItems: 'center', padding: '1rem' }}>
      <div className="panel fade-in w-full max-w-[620px] max-h-[92vh] overflow-y-auto scroll-thin p-5" style={{ boxShadow: 'var(--shadow-lg)' }} role="dialog" aria-label="成长报告">
        <div className="flex items-start justify-between">
          <div>
            <div className="chip chip-accent mb-1"><Award size={11} /> Step 4 · Growth Report</div>
            <h2 className="font-display text-[1.5rem]">本会话成长报告</h2>
            <div className="text-[.7rem] muted">8 轮口语练习 · 数据只存在这台电脑的浏览器里</div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="关闭"><X size={16} /></button>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          {[
            ['平均分', String(avg)], ['最高分', String(best)], ['首轮 → 末轮', `${delta >= 0 ? '+' : ''}${delta}`],
          ].map(([k, v]) => (
            <div key={k} className="panel-soft p-3 text-center">
              <div className="text-[.66rem] muted">{k}</div>
              <div className="font-display text-[1.5rem]" style={{ color: 'var(--accent)' }}>{v}</div>
            </div>
          ))}
        </div>

        <div className="panel-soft p-3 mt-3">
          <div className="flex items-center gap-1.5 text-[.76rem] font-semibold mb-1"><TrendingUp size={13} /> 总分折线</div>
          <ProgressLine values={scores.slice(-8)} height={130} showLabels />
          <div className="text-[.65rem] muted mt-1">自研 SVG 绘制，未引入任何图表库。</div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          <div className="panel-soft p-3">
            <div className="text-[.76rem] font-semibold mb-2">最常读错的 5 个词</div>
            {topMissed.length ? topMissed.map(([w, n]) => (
              <div key={w} className="flex justify-between text-[.72rem] py-0.5">
                <span className="font-mono" style={{ color: 'var(--bad)' }}>{w}</span><span className="muted">{n} 次</span>
              </div>
            )) : <div className="text-[.7rem] muted">没有漏读的词，很棒！</div>}
          </div>
          <div className="panel-soft p-3">
            <div className="text-[.76rem] font-semibold mb-2">掌握最好的栖息地</div>
            {bestHabitat ? (
              <>
                <div className="font-display text-[1.1rem]">{HABITAT_META[bestHabitat.h as keyof typeof HABITAT_META]?.label || bestHabitat.h}</div>
                <div className="text-[.7rem] muted mt-1">平均 {Math.round(bestHabitat.avg)} 分 · {HABITAT_META[bestHabitat.h as keyof typeof HABITAT_META]?.zh}</div>
              </>
            ) : <div className="text-[.7rem] muted">暂无数据</div>}
            <div className="text-[.68rem] muted mt-3 leading-relaxed border-t hairline pt-2">
              Upper Bloom's：你已经从「说出动物」走到「解释它为什么适合这里」—— 这正是分析与交流层。
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4 flex-wrap">
          <button className="btn btn-primary" onClick={onRestart}><RotateCcw size={13} /> 再来一组</button>
          <button className="btn" onClick={onClear}><Trash2 size={13} /> 清空记录</button>
          <button className="btn btn-ghost" onClick={onClose}>返回练习</button>
        </div>
      </div>
    </div>
  );
}
