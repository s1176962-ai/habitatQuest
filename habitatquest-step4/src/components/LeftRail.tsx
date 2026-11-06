import type { CardData, LearningRecord } from '../types';
import { illustrationFor } from '../mock/cards';
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
  const values = records.slice(-8).map((r) => r.total);
  return (
    <aside className="left-rail rail space-y-3">
      <div className="panel p-3">
        <div className="chip chip-accent mb-2">Step 4 · Voice Practice</div>
        <div className="text-[.7rem] muted leading-relaxed">
          从「认读」到「口头表达」：看图 → 听示范 → 跟读 → 判分 → Why/How 追问 → 口头回答。
        </div>
      </div>

      <div className="panel p-3">
        <div className="text-[.74rem] font-semibold mb-2">轮次进度 <span className="muted font-normal">{Math.min(round + 1, 8)} / 8</span></div>
        <div className="flex gap-1.5 flex-wrap">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className={`round-dot ${i < round ? 'done' : i === round ? 'current' : ''}`}>
              {i < round ? '✓' : i + 1}
            </div>
          ))}
        </div>
        <div className="text-[.66rem] muted mt-2">每会话 8 轮，对应 8 张图片卡。</div>
      </div>

      <div className="panel p-3">
        <div className="text-[.74rem] font-semibold mb-2">卡片历史</div>
        {history.length === 0 ? (
          <div className="text-[.68rem] muted">完成一轮后，这里会出现缩略图。</div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto scroll-thin pr-1">
            {history.map((h, i) => (
              <div key={i} className="relative" title={`${h.card.animal} · ${h.score} 分`}>
                <div className="thumb" dangerouslySetInnerHTML={{ __html: illustrationFor(h.card.illustration) }} />
                <span className="absolute bottom-0.5 right-0.5 text-[.58rem] px-1 rounded"
                  style={{ background: 'rgba(24,20,17,.72)', color: '#fff' }}>{h.score}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel p-3">
        <div className="text-[.74rem] font-semibold mb-1">我的进步</div>
        <ProgressLine values={values} height={76} />
        <div className="text-[.65rem] muted mt-1">
          {values.length ? `最近 ${values.length} 轮平均 ${Math.round(values.reduce((a, b) => a + b, 0) / values.length)} 分` : '暂无成绩'}
        </div>
      </div>

      <div className="panel-soft p-3">
        <div className="flex items-center gap-1.5 text-[.72rem] font-semibold mb-1"><Sparkles size={13} /> 键盘快捷键</div>
        <div className="text-[.66rem] muted leading-relaxed">
          <span className="kbd">空格</span> 按住录音 · <span className="kbd">Enter</span> 提交 · <span className="kbd">Esc</span> 关抽屉 / 跳过
        </div>
      </div>

      <div className="chip w-full justify-center">演示原型 · 本地运行</div>
    </aside>
  );
}
