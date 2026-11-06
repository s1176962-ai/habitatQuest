import { Fragment } from 'react';
import type { WordResult } from '../types';

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
  if (hidden) {
    return (
      <div className="target-line text-center muted" style={{ letterSpacing: '.18em' }} aria-label="文字已隐藏，练习纯听力">
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
              ? `${(item as WordResult).ipa || ''} 点击查看口型提示与慢速示范` : undefined}
          >
            {item.word}
          </span>
          {' '}
        </Fragment>
      ))}
    </div>
  );
}
