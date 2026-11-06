import { Fragment } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import type { Phase } from '../types';

/** Always-visible answer to "where am I, and how do I get to the next level?" */
const STEPS: { label: string; phases: Phase[] }[] = [
  { label: '听示范', phases: ['card', 'listening'] },
  { label: '跟读录音', phases: ['recording', 'scoring'] },
  { label: '看发音分', phases: ['feedback'] },
  { label: '回答 Why/How', phases: ['question', 'answering'] },
  { label: '小结 · 下一关', phases: ['wrap'] },
];

const NEXT_HINT: Record<Phase, string> = {
  card: '点下面那个大按钮（或直接点图片卡）听英语示范，然后就能开始录音。',
  listening: '示范正在播放，播完会自动进入录音；也可以点「跳过示范，去录音」。',
  recording: '按住录音按钮跟读并描述这张卡；没有麦克风就用「上传 / 输入兜底」。',
  scoring: '正在逐词比对发音，几秒后出成绩。',
  feedback: '看完成绩和逐词诊断，点「听 AI 伙伴提问」继续。',
  question: '听完 Pip 的 Why / How 问题，点「按住录音回答」说出你的理由。',
  answering: '用英语解释原因，提交后就能看到本轮小结。',
  wrap: '点「下一张卡」进入下一关；第 8 张卡结束后可以查看成长报告。',
};

export function StepGuide({ phase, round, total }: { phase: Phase; round: number; total: number }) {
  const active = Math.max(0, STEPS.findIndex((s) => s.phases.includes(phase)));

  return (
    <div className="panel step-guide" aria-label="本轮进度与下一步">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="chip chip-accent shrink-0">第 {round + 1} / {total} 关</span>
        <div className="steps">
          {STEPS.map((s, i) => (
            <Fragment key={s.label}>
              {i > 0 && <span className="step-sep">›</span>}
              <span className={`step ${i === active ? 'current' : ''} ${i < active ? 'done' : ''}`}>
                <span className="step-num">{i < active ? <Check size={10} strokeWidth={3} /> : i + 1}</span>
                {s.label}
              </span>
            </Fragment>
          ))}
        </div>
      </div>
      <div className="step-hint">
        <ChevronRight size={13} style={{ color: 'var(--accent)', flex: 'none' }} />
        <span><b>下一步：</b>{NEXT_HINT[phase]}</span>
      </div>
    </div>
  );
}
