import { ArrowRight, BookOpen, Lightbulb, RotateCcw, SkipForward, Volume2, X } from 'lucide-react';
import type { Player, ScoreResult, WordResult } from '../types';
import { SENTENCE_FRAMES } from '../mock/questionBank';
import { DimensionBar, ScoreRing } from './Charts';
import { WordLine } from './WordLine';

const STATUS_LABEL: Record<WordResult['status'], string> = { ok: '读准', off: '轻微偏差', miss: '漏读/错读', extra: '多余词' };

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
  return (
    <aside className="right-rail rail space-y-3">
      <div className="panel p-3">
        <div className="text-[.76rem] font-semibold mb-1">本轮评分</div>
        {score ? (
          <>
            <ScoreRing value={score.total} size={148} caption={`${score.engine === 'local' ? '本地评分' : 'API 评分'} · ${score.wpm} WPM · ${score.durationSec.toFixed(1)}s`} />
            <div className="space-y-2.5 mt-3">
              <DimensionBar label="准确度" value={score.accuracy} weight="50%" />
              <DimensionBar label="流利度" value={score.fluency} weight="25%" />
              <DimensionBar label="完整度" value={score.completeness} weight="25%" />
            </div>
            {duoEnabled && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(['A', 'B'] as Player[]).map((p) => (
                  <div key={p} className="panel-soft p-2 text-center" style={{ borderColor: p === player ? 'var(--accent)' : undefined }}>
                    <div className="text-[.65rem] muted">{p} 同学</div>
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
            完成跟读后，这里会出现分数环、三个子维度和逐词诊断。
            <div className="mt-2 chip">当前阶段：{phase}</div>
          </div>
        )}
      </div>

      <div className="panel p-3">
        <div className="text-[.76rem] font-semibold mb-2">逐词诊断</div>
        {score ? (
          <>
            <div className="flex flex-wrap gap-1">
              {score.words.map((w, i) => (
                <button key={i}
                  className={`word word-${w.status} text-[.7rem] px-1.5 py-0.5 border hairline rounded-md`}
                  style={{ background: 'var(--surface-2)', cursor: w.status === 'off' || w.status === 'miss' ? 'pointer' : 'default' }}
                  onClick={() => (w.status === 'off' || w.status === 'miss') && onWordClick(w)}
                  title={STATUS_LABEL[w.status]}>
                  {w.word}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-2 text-[.62rem] muted flex-wrap">
              <span style={{ color: 'var(--ok)' }}>● 绿 读准</span>
              <span style={{ color: 'var(--warn)' }}>● 黄 轻微偏差</span>
              <span style={{ color: 'var(--bad)' }}>● 红 漏读/错读</span>
              <span>● 灰 多余词</span>
            </div>
            <div className="text-[.66rem] muted mt-2 leading-relaxed">点红色 / 黄色单词，看音标、口型提示并听 0.75× 慢速示范。</div>
          </>
        ) : <div className="text-[.7rem] muted">等待跟读结果…</div>}
      </div>

      {hintWord && (
        <div className="panel p-3 fade-in" style={{ borderColor: 'var(--accent)' }}>
          <div className="flex justify-between items-start">
            <div>
              <div className="font-display text-[1.1rem]">{hintWord.word}</div>
              <div className="chip chip-accent mt-1">{hintWord.ipa || '/·/'}</div>
            </div>
            <button className="icon-btn" onClick={onCloseHint} aria-label="关闭"><X size={14} /></button>
          </div>
          <div className="text-[.72rem] mt-2 leading-relaxed"><Lightbulb size={12} className="inline mr-1" />{hintWord.hint}</div>
          <button className="btn btn-sm btn-primary w-full mt-2" onClick={() => onSlowWord(hintWord)}>
            <Volume2 size={12} /> 0.75× 慢速示范（计入配额）
          </button>
        </div>
      )}

      <div className="panel p-3">
        <div className="flex items-center gap-1.5 text-[.76rem] font-semibold mb-2"><BookOpen size={13} /> 句型支架</div>
        <div className="space-y-1.5">
          {SENTENCE_FRAMES.map((f) => <div key={f} className="panel-soft px-2 py-1.5 text-[.7rem] font-mono">{f}</div>)}
        </div>
        <div className="text-[.64rem] muted mt-2 leading-relaxed">脚手架只给句型，不替你作答 —— 真实信息差才能练出表达。</div>
      </div>
    </aside>
  );
}

/** Center-column feedback block: coloured sentence, advice, next-step actions. */
export function FeedbackPanel({
  score, target, advice, rerecordLeft, onRetry, onQuestion, onSkip, onWordClick,
}: {
  score: ScoreResult; target: string; advice: string; rerecordLeft: number;
  onRetry: () => void; onQuestion: () => void; onSkip: () => void; onWordClick: (w: WordResult) => void;
}) {
  return (
    <div className="panel p-4 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <div className="text-[.82rem] font-semibold">
          发音诊断 <span className="chip chip-accent ml-1">{score.total} 分 · {score.level}</span>
          {score.engine === 'local' && <span className="chip ml-1">本地评分</span>}
        </div>
        <div className="text-[.68rem] muted">{score.wpm} WPM · 录音 {score.durationSec.toFixed(1)}s</div>
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
          <RotateCcw size={12} /> 再练一次 ({rerecordLeft})
        </button>
        <button className="btn btn-sm btn-primary" onClick={onQuestion}><Volume2 size={12} /> 听 AI 伙伴提问 <ArrowRight size={12} /></button>
        <button className="btn btn-sm btn-ghost" onClick={onSkip}><SkipForward size={12} /> 跳过</button>
      </div>
    </div>
  );
}
