import { Fragment } from 'react';
import type { WordResult } from '../types';
import { t, useI18n } from '../i18n';

export function WordLine({
  text, activeWord = -1, results, onWordClick, scanning = false, hidden = false,
}: {
  text: string;
  activeWord?: number;
  results?: WordResult[] | null;
  onWordClick?: (w: WordResult) => void;
  scanning?: boolean;
  hidden?: boolean;
}) {
  useI18n();
  if (hidden) {
    return (
      <div className="target-line text-center muted" style={{ letterSpacing: '.18em' }} aria-label={t('word.hiddenAria')}>
        • • • • • • • • • • • •
      </div>
    );
  }
  const plain = text.trim().split(/\s+/);
  const showResults = !!(results && results.length);
  return (
    <div className="target-line text-center">
      {(showResults ? results! : plain.map((word) => ({ word, status: 'plain' as const }))).map((item, i) => (
        <Fragment key={i}>
          <span
            className={`word ${showResults ? `word-${(item as WordResult).status}` : ''} ${activeWord === i && !showResults ? 'active' : ''} ${scanning ? 'scan' : ''}`}
            style={scanning ? { animationDelay: `${i * 55}ms` } : undefined}
            onClick={showResults && ['off', 'miss'].includes((item as WordResult).status)
              ? () => onWordClick?.(item as WordResult) : undefined}
            title={showResults && ['off', 'miss'].includes((item as WordResult).status)
              ? t('word.hintTitle', { ipa: (item as WordResult).ipa || '' }) : undefined}
          >
            {item.word}
          </span>
          {' '}
        </Fragment>
      ))}
    </div>
  );
}
