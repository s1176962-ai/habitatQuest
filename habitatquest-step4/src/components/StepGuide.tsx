import { Fragment } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import type { Phase } from '../types';
import { t, useI18n } from '../i18n';

/** Always-visible answer to "where am I, and how do I get to the next level?" */
const STEPS: { labelKey: string; phases: Phase[] }[] = [
  { labelKey: 'guide.step1', phases: ['card', 'listening'] },
  { labelKey: 'guide.step2', phases: ['recording', 'scoring'] },
  { labelKey: 'guide.step3', phases: ['feedback'] },
  { labelKey: 'guide.step4', phases: ['question', 'answering'] },
  { labelKey: 'guide.step5', phases: ['wrap'] },
];

const NEXT_HINT: Record<Phase, string> = {
  card: 'guide.hint.card',
  listening: 'guide.hint.listening',
  recording: 'guide.hint.recording',
  scoring: 'guide.hint.scoring',
  feedback: 'guide.hint.feedback',
  question: 'guide.hint.question',
  answering: 'guide.hint.answering',
  wrap: 'guide.hint.wrap',
};

export function StepGuide({ phase, round, total }: { phase: Phase; round: number; total: number }) {
  useI18n();
  const active = Math.max(0, STEPS.findIndex((s) => s.phases.includes(phase)));

  return (
    <div className="panel step-guide" aria-label={t('guide.aria')}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="chip chip-accent shrink-0">{t('guide.round', { n: round + 1, total })}</span>
        <div className="steps">
          {STEPS.map((s, i) => (
            <Fragment key={s.labelKey}>
              {i > 0 && <span className="step-sep">›</span>}
              <span className={`step ${i === active ? 'current' : ''} ${i < active ? 'done' : ''}`}>
                <span className="step-num">{i < active ? <Check size={10} strokeWidth={3} /> : i + 1}</span>
                {t(s.labelKey)}
              </span>
            </Fragment>
          ))}
        </div>
      </div>
      <div className="step-hint">
        <ChevronRight size={13} style={{ color: 'var(--accent)', flex: 'none' }} />
        <span><b>{t('guide.next')}</b>{t(NEXT_HINT[phase])}</span>
      </div>
    </div>
  );
}
