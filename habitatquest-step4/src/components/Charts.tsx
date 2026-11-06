import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Animated 0–100 score ring. Hand-drawn SVG, no chart library. */
export function ScoreRing({ value, size = 148, caption }: { value: number; size?: number; caption?: string }) {
  const [shown, setShown] = useState(reducedMotion() ? value : 0);
  const pathRef = useRef<SVGCircleElement>(null);
  const r = 56;
  const circumference = 2 * Math.PI * r;

  useEffect(() => {
    if (reducedMotion()) { setShown(value); return; }
    const obj = { v: 0 };
    const tween = gsap.to(obj, {
      v: value, duration: 1.1, ease: 'power2.out',
      onUpdate: () => {
        setShown(Math.round(obj.v));
        if (pathRef.current) pathRef.current.style.strokeDashoffset = String(circumference * (1 - obj.v / 100));
      },
    });
    return () => { tween.kill(); };
  }, [value, circumference]);

  const color = value >= 90 ? 'var(--ok)' : value >= 75 ? 'var(--accent)' : value >= 60 ? 'var(--warn)' : 'var(--bad)';
  const level = value >= 90 ? 'Excellent' : value >= 75 ? 'Good job' : value >= 60 ? 'Keep going' : 'Try again';

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox="0 0 140 140" aria-label={`score ${value}`}>
        <circle cx="70" cy="70" r={r} fill="none" stroke="var(--line)" strokeWidth="11" />
        <circle
          ref={pathRef} cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="11"
          strokeLinecap="round" strokeDasharray={circumference}
          strokeDashoffset={circumference} transform="rotate(-90 70 70)"
        />
        <text x="70" y="72" textAnchor="middle" fontSize="34" fontWeight="700" fill="var(--ink)" fontFamily="var(--font-display)">
          {shown}
        </text>
        <text x="70" y="92" textAnchor="middle" fontSize="10" fill="var(--muted)">/ 100</text>
      </svg>
      <div className="-mt-2 text-[.78rem] font-semibold" style={{ color }}>{level}</div>
      {caption && <div className="text-[.68rem] muted mt-0.5">{caption}</div>}
    </div>
  );
}

export function DimensionBar({ label, value, weight }: { label: string; value: number; weight: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    if (reducedMotion()) { ref.current.style.width = `${value}%`; return; }
    const tween = gsap.fromTo(ref.current, { width: '0%' }, { width: `${value}%`, duration: .85, ease: 'power2.out', delay: .15 });
    return () => { tween.kill(); };
  }, [value]);
  const color = value >= 80 ? 'var(--ok)' : value >= 60 ? 'var(--warn)' : 'var(--bad)';
  return (
    <div>
      <div className="flex justify-between text-[.7rem] mb-1">
        <span className="font-semibold">{label} <span className="muted font-normal">{weight}</span></span>
        <span className="muted">{value}</span>
      </div>
      <div className="meter-track"><div ref={ref} style={{ width: 0, background: color }} className="h-full rounded-full" /></div>
    </div>
  );
}

/** Self-made SVG line chart for the progress rail + growth report. */
export function ProgressLine({
  values, width = 220, height = 78, showLabels = false,
}: { values: number[]; width?: number; height?: number; showLabels?: boolean }) {
  const pad = 10;
  const max = 100, min = 0;
  const pts = values.map((v, i) => {
    const x = values.length === 1 ? width / 2 : pad + (i * (width - pad * 2)) / (values.length - 1);
    const y = height - pad - ((v - min) / (max - min)) * (height - pad * 2);
    return { x, y, v };
  });
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = pts.length > 1 ? `${line} L${pts[pts.length - 1].x},${height - pad} L${pts[0].x},${height - pad} Z` : '';
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="score trend">
      <defs>
        <linearGradient id="plfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity=".28" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 50, 100].map((v) => {
        const y = height - pad - (v / 100) * (height - pad * 2);
        return <line key={v} x1={pad} y1={y} x2={width - pad} y2={y} stroke="var(--line)" strokeWidth="1" strokeDasharray="3 4" />;
      })}
      {area && <path d={area} fill="url(#plfill)" />}
      {pts.length > 1 && <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3.4" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2" />
          {showLabels && (
            <text x={p.x} y={p.y - 9} textAnchor="middle" fontSize="9" fill="var(--muted)">{p.v}</text>
          )}
        </g>
      ))}
      {!pts.length && <text x={width / 2} y={height / 2} textAnchor="middle" fontSize="10" fill="var(--muted)">还没有成绩，完成第一轮就会出现曲线</text>}
    </svg>
  );
}
