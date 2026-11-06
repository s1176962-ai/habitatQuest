import { useCallback, useEffect, useRef, useState } from 'react';
import { FileAudio, Keyboard, Mic, Play, RotateCcw, Send, VolumeX } from 'lucide-react';
import type { Channel, Phase, RecordedTake } from '../types';
import { formatClock, safeContext } from '../lib/audio';
import { startSpeechRecognition, takeLocalTranscript, type RecognitionHandle } from '../lib/speech';
import type { Toast } from './Toasts';

const MAX_SEC = 10;
const SILENCE_MS = 1200;

interface Props {
  phase: Phase;
  channel: Channel;
  mode: 'read' | 'answer';
  take: RecordedTake | null;
  busy?: boolean;
  rerecordLeft: number;
  onTake: (t: RecordedTake) => void;
  onSubmit: (t: RecordedTake) => void;
  onResetTake: () => void;
  onToast: (text: string, tone?: Toast['tone']) => void;
}

export function Recorder({ phase, channel, mode, take, busy, rerecordLeft, onTake, onSubmit, onResetTake, onToast }: Props) {
  const env = safeContext();
  const [micOk, setMicOk] = useState(env.micAvailable && !env.isFileProtocol);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [levels, setLevels] = useState<number[]>(() => new Array(32).fill(0));
  const [tapMode, setTapMode] = useState(false);
  const [tapOn, setTapOn] = useState(false);
  const [interim, setInterim] = useState('');
  const [typed, setTyped] = useState('');
  const [showFallback, setShowFallback] = useState(!micOk);
  const [lowVolume, setLowVolume] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const mrRef = useRef<MediaRecorder | null>(null);
  const recogRef = useRef<RecognitionHandle | null>(null);
  const rafRef = useRef(0);
  const startAtRef = useRef(0);
  const lastLoudRef = useRef(0);
  const chunksRef = useRef<Blob[]>([]);
  const recordingRef = useRef(false);
  const cancelledRef = useRef(false);
  const frameRef = useRef(0);

  const cleanupHardware = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    try { mrRef.current?.state !== 'inactive' && mrRef.current?.stop(); } catch { /* ignore */ }
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
    try { void ctxRef.current?.close(); } catch { /* ignore */ }
    streamRef.current = null; ctxRef.current = null; mrRef.current = null;
    recogRef.current = null;
  }, []);

  useEffect(() => () => cleanupHardware(), [cleanupHardware]);

  const stop = useCallback(() => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    setRecording(false);
    setTapOn(false);
    cancelAnimationFrame(rafRef.current);
    try { recogRef.current?.stop(); } catch { /* ignore */ }
    try { if (mrRef.current?.state !== 'inactive') mrRef.current?.stop(); } catch { /* ignore */ }
  }, []);

  const start = useCallback(async () => {
    if (recordingRef.current || busy) return;
    cancelledRef.current = false;
    setInterim(''); setLowVolume(false); setSeconds(0);
    if (!micOk) { setShowFallback(true); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      ctxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = .72;
      src.connect(analyser);

      const preferred = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
        .find((m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m));
      const mr = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
      mrRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        const dur = Math.min(MAX_SEC, (Date.now() - startAtRef.current) / 1000);
        try { stream.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
        void ctx.close().catch(() => {});
        streamRef.current = null; ctxRef.current = null; mrRef.current = null;
        if (cancelledRef.current) return;
        const localTr = channel === 'local' ? takeLocalTranscript() : { text: '' };
        onTake({
          blob, url: blob.size ? URL.createObjectURL(blob) : null,
          durationSec: Math.max(.6, dur),
          transcript: localTr.text, confidence: localTr.confidence,
          source: 'mic',
        });
      };
      mr.start(100);
      startAtRef.current = Date.now();
      lastLoudRef.current = Date.now();
      recordingRef.current = true;
      setRecording(true);

      if (channel === 'local') recogRef.current = startSpeechRecognition(setInterim);
      else recogRef.current = null;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const loop = () => {
        if (!recordingRef.current) return;
        analyser.getByteFrequencyData(data);
        frameRef.current++;
        const step = Math.max(1, Math.floor(data.length / 32));
        const next = Array.from({ length: 32 }, (_, i) => Math.min(1, (data[i * step] || 0) / 170));
        const avg = next.reduce((a, b) => a + b, 0) / 32;
        if (avg > .07) lastLoudRef.current = Date.now();
        const elapsed = (Date.now() - startAtRef.current) / 1000;
        if (frameRef.current % 3 === 0) { setLevels(next); setSeconds(elapsed); setLowVolume(avg < .025); }
        if (elapsed >= MAX_SEC) { stop(); return; }
        if (elapsed > 1.4 && Date.now() - lastLoudRef.current > SILENCE_MS) { stop(); return; }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch {
      setMicOk(false); setShowFallback(true);
      onToast('麦克风被拒绝或不可用，已自动切换为「上传录音 / 输入文字」兜底，流程不中断。', 'warn');
    }
  }, [busy, channel, micOk, onTake, onToast, stop]);

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (tapMode) {
      if (tapOn) stop(); else { setTapOn(true); void start(); }
    } else void start();
  };
  const onPointerUp = () => { if (!tapMode && recordingRef.current) stop(); };
  const onPointerCancel = () => { if (!tapMode && recordingRef.current) stop(); };

  // Keyboard: hold Space to record, Enter to submit, Esc handled by App.
  useEffect(() => {
    const isTyping = () => {
      const el = document.activeElement;
      return !!el && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
    };
    const down = (e: KeyboardEvent) => {
      if (isTyping()) return;
      if (e.code === 'Space' && !recordingRef.current && !e.repeat) { e.preventDefault(); void start(); }
      if (e.key === 'Enter' && take && !recordingRef.current && !busy) { e.preventDefault(); onSubmit(take); }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isTyping() && !tapMode && recordingRef.current) { e.preventDefault(); stop(); }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [start, stop, take, busy, tapMode, onSubmit]);

  const cancel = () => {
    cancelledRef.current = true;
    try { recogRef.current?.abort(); } catch { /* ignore */ }
    stop(); onResetTake(); setInterim(''); setLevels(new Array(32).fill(0)); setSeconds(0);
  };

  const submitTyped = () => {
    const text = typed.trim();
    if (text.split(/\s+/).length < 2) { onToast('请至少输入两个英文单词，例如 "It has thick fur."', 'warn'); return; }
    onTake({
      blob: null, url: null,
      durationSec: Math.max(2, Math.min(10, text.split(/\s+/).length / 2.2)),
      transcript: text, source: 'typed',
    });
    onToast('已用输入的文字作为识别结果（离线兜底，不计入重录次数）。', 'ok');
  };

  const onFile = (f: File) => {
    const url = URL.createObjectURL(f);
    const audio = new Audio(url);
    const done = (dur: number) => onTake({
      blob: f, url, durationSec: Math.min(MAX_SEC, Math.max(.6, dur || 5)),
      transcript: typed.trim(), source: 'file',
    });
    audio.onloadedmetadata = () => done(isFinite(audio.duration) ? audio.duration : 5);
    audio.onerror = () => done(5);
  };

  const title = mode === 'read' ? '按住录音，描述这只动物' : '按住录音，回答 Pip 的问题';
  const circumference = 2 * Math.PI * 44;

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
        <div className="text-[.8rem] font-semibold">{title}</div>
        <div className="flex items-center gap-1.5 text-[.66rem] muted">
          <Keyboard size={12} /> 按住 <span className="kbd">空格</span> 录音 · 松开结束 · 最长 {MAX_SEC}s
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
        <div className="flex flex-col items-center gap-1 shrink-0">
          <div className="relative">
            <svg className="rec-ring" viewBox="0 0 100 100" aria-hidden>
              <circle cx="50" cy="50" r="44" fill="none" stroke="var(--line)" strokeWidth="5" />
              <circle cx="50" cy="50" r="44" fill="none" stroke="var(--accent)" strokeWidth="5" strokeLinecap="round"
                strokeDasharray={circumference} strokeDashoffset={circumference * Math.min(1, seconds / MAX_SEC)}
                transform="rotate(-90 50 50)" />
            </svg>
            <button
              className={`rec-btn ${recording ? 'is-recording' : ''}`}
              disabled={busy || showFallback && !micOk}
              onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel}
              aria-label="按住录音"
            >
              {recording ? <VolumeX size={26} /> : <Mic size={26} />}
            </button>
          </div>
          <span className="text-[.68rem] muted font-mono">{formatClock(Math.max(0, MAX_SEC - seconds))}</span>
        </div>

        <div className="flex-1 min-w-[180px]">
          <div className="waveform" aria-hidden>
            {levels.map((v, i) => (
              <span key={i} style={{ height: `${Math.max(3, v * 38)}px` }} />
            ))}
          </div>
          <div className="text-center text-[.7rem] mt-1" style={{ color: recording ? 'var(--accent)' : 'var(--muted)' }}>
            {recording
              ? (lowVolume ? '请靠近麦克风…' : `录音中 ${seconds.toFixed(1)}s · 静音 1.2s 自动收尾`)
              : take ? '录音完成，可回放或提交' : '按住大圆按钮或空格开始'}
          </div>
          {interim && <div className="text-center text-[.68rem] muted mt-1 truncate">识别中：{interim}</div>}
          <div className="flex justify-center gap-1.5 mt-2 flex-wrap">
            <button className="btn btn-sm" onClick={() => setTapMode((v) => !v)}>
              {tapMode ? '切回按住模式' : '触屏：点一下开始 / 再点结束'}
            </button>
            {(recording || take) && <button className="btn btn-sm" onClick={cancel}><RotateCcw size={12} /> 取消 / 重录 ({rerecordLeft})</button>}
            <button className="btn btn-sm" onClick={() => setShowFallback((v) => !v)}>
              <FileAudio size={12} /> 上传 / 输入兜底
            </button>
          </div>
        </div>
      </div>

      {showFallback && (
        <div className="mt-3 panel-soft p-3">
          <div className="text-[.72rem] font-semibold mb-1">麦克风不可用？功能不中断</div>
          <div className="text-[.66rem] muted mb-2 leading-relaxed">
            file:// 打开、麦克风被拒或断网时，可以上传一段录音，或直接输入你所说的英文。浏览器内置语音识别在完全离线时不可用，输入文字是课堂断网演示的可靠兜底。
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <label className="btn btn-sm" style={{ cursor: 'pointer' }}>
              <FileAudio size={12} /> 选择录音文件
              <input type="file" accept="audio/*" capture className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
            </label>
            <input className="field flex-1 min-w-[180px]" value={typed}
              onChange={(e) => setTyped(e.target.value)} placeholder="It has thick fur because it is cold." />
            <button className="btn btn-sm btn-primary" onClick={submitTyped}>用文字提交</button>
          </div>
        </div>
      )}

      {take && !recording && (
        <div className="mt-3 border-t hairline pt-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-[.72rem]">
              <span className="muted">识别结果：</span>
              <span className="font-medium">{take.transcript || <span style={{ color: 'var(--bad)' }}>没听清，再试一次（不计入重录次数）</span>}</span>
              <span className="chip ml-2">{take.source === 'mic' ? '麦克风' : take.source === 'file' ? '上传文件' : '文字兜底'} · {take.durationSec.toFixed(1)}s</span>
            </div>
            {take.url && <audio controls src={take.url} style={{ height: 30, maxWidth: 210 }} aria-label="回放我的录音" />}
          </div>
          <div className="flex gap-2 mt-2 flex-wrap">
            <button className="btn btn-sm btn-primary" disabled={!take.transcript || busy} onClick={() => onSubmit(take)}>
              <Send size={12} /> {busy ? 'AI 正在处理…' : mode === 'read' ? '提交给 AI 打分' : '提交我的回答'}
            </button>
            {!take.transcript && <button className="btn btn-sm" onClick={onResetTake}><Play size={12} /> 再试一次</button>}
          </div>
        </div>
      )}
    </div>
  );
}
