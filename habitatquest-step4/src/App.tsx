import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Loader2, Mic } from 'lucide-react';
import type {
  AnswerEval, CardData, ChatBubble, Config, I18nPiece, Lang, LearningRecord, Msg, Phase,
  Player, RecordedTake, ScoreResult, TTSResult, WordResult,
} from './types';
import { setLang, t, tr, useI18n } from './i18n';
import {
  appendRecord, clearRecords as clearStoredRecords, getConfig, readKey, readRecords,
  saveConfig,
} from './lib/storage';
import {
  LIMITS, consume, getQuotaSnapshot, nextRound, precheck, resetSessionCounters,
  subscribeQuota, usageSummary,
} from './lib/quota';
import {
  NetworkError, QuotaError, clearNetworkLog, externalDomains,
} from './lib/network';
import {
  charIndexToWord, playAudioUrl, revoke, speak, truncateToSentence, wordAtTime,
  type SpeakHandle,
} from './lib/audio';
import { localScore, keywordHits } from './lib/scoring/local';
import { mergeScore, validateFollowUp, validateScore } from './lib/scoring/refine';
import { getProvider } from './providers';
import { pickSessionCards } from './mock/cards';
import { isCausalQuestion, nextQuestion, resetQuestionBank } from './mock/questionBank';
import {
  PIP_SYSTEM_PROMPT, TASK_A_RULES, TASK_B_RULES, evaluateAnswer, partnerReply,
} from './mock/partner';
import { TopBar } from './components/TopBar';
import { SettingsDrawer } from './components/SettingsDrawer';
import { NetworkPanel } from './components/NetworkPanel';
import { LeftRail } from './components/LeftRail';
import { CardStage } from './components/CardStage';
import { StepGuide } from './components/StepGuide';
import { Recorder } from './components/Recorder';
import { FeedbackPanel, ScorePanel } from './components/ScorePanel';
import { AnswerEvalCard, ChatBubbles, QuestionCard, WrapCard } from './components/Conversation';
import { GrowthReport } from './components/GrowthReport';
import { ToastList, type Toast } from './components/Toasts';

export default function App() {
  /* ------------------------------ settings ------------------------------ */
  const [config, setConfigState] = useState<Config>(() => getConfig());
  const configRef = useRef(config);
  // Subscribes App to language changes; t() itself reads the current store.
  useI18n();
  const onConfig = useCallback((patch: Partial<Config>) => {
    if (patch.language) setLang(patch.language);
    setConfigState({ ...saveConfig(patch) });
  }, []);
  useEffect(() => {
    configRef.current = config;
    document.documentElement.dataset.theme = config.theme;
    document.documentElement.lang = config.language === 'zh' ? 'zh-CN' : 'en';
    document.title = t('app.title');
    setLang(config.language);
  }, [config]);

  /* ------------------------------ session ------------------------------- */
  const [cards, setCards] = useState<CardData[]>(() => pickSessionCards(8));
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('card');
  const card = cards[round] || cards[0];
  const cardRef = useRef(card);
  useEffect(() => { cardRef.current = card; }, [card]);

  useSyncExternalStore(subscribeQuota, getQuotaSnapshot);
  const quota = getQuotaSnapshot();
  const relistenLeft = Math.max(0, LIMITS.PER_ROUND.relisten - quota.perRound.relisten);
  const rerecordLeft = Math.max(0, LIMITS.PER_ROUND.reRecord - quota.perRound.reRecord);

  /* -------------------------------- TTS --------------------------------- */
  const [listening, setListening] = useState(false);
  const [questionPlaying, setQuestionPlaying] = useState(false);
  const [activeWord, setActiveWord] = useState(-1);
  const [showText, setShowText] = useState(true);
  const ttsHandle = useRef<SpeakHandle | null>(null);
  const ttsUrl = useRef<string | null>(null);
  const ttsWatchdog = useRef<number>(0);
  const slow = config.rate < 1;

  const stopTTS = useCallback(() => {
    window.clearTimeout(ttsWatchdog.current);
    ttsHandle.current?.stop(); ttsHandle.current = null;
    revoke(ttsUrl.current); ttsUrl.current = null;
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    setListening(false); setQuestionPlaying(false); setActiveWord(-1);
  }, []);

  const playTTS = useCallback(async (
    text: string, rate: number, onDone?: () => void, quiet = false,
  ) => {
    stopTTS();
    const cfg = configRef.current;
    const channel = cfg.channel;
    const safe = truncateToSentence(text, LIMITS.SINGLE.ttsChars);
    let result: TTSResult;
    try {
      result = await getProvider().tts(safe, { rate, voice: cfg.ttsVoice });
    } catch (err) {
      // Any API failure degrades to the offline browser voice — loop never breaks.
      if (err instanceof QuotaError) toast(err.message, 'warn');
      else if (err instanceof NetworkError && err.corsLikely) {
        toast(t('toast.corsFallback'), 'warn');
      } else if (err instanceof NetworkError) toast(err.message, 'warn');
      result = { mode: 'speech', text: safe, rate };
    }

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(ttsWatchdog.current);
      if (!quiet) { setListening(false); setActiveWord(-1); }
      setQuestionPlaying(false);
      revoke(ttsUrl.current); ttsUrl.current = null;
      onDone?.();
    };
    // Some environments ship no system voices and never fire onend/onerror.
    // A watchdog keeps the 8-phase loop moving instead of hanging forever.
    const maxMs = Math.min(16000, Math.max(3600, safe.split(/\s+/).length * 430 / rate));
    window.clearTimeout(ttsWatchdog.current);
    ttsWatchdog.current = window.setTimeout(finish, maxMs);
    if (!quiet) { setListening(true); setActiveWord(-1); }

    if (result.mode === 'audio' && result.audioUrl) {
      ttsUrl.current = result.audioUrl;
      ttsHandle.current = playAudioUrl(result.audioUrl, {
        rate,
        onTime: (sec) => { if (!quiet) setActiveWord(wordAtTime(result.words, sec)); },
        onEnd: finish, onError: finish,
      });
    } else {
      ttsHandle.current = speak(result.text || safe, {
        rate, voice: cfg.ttsVoice,
        onBoundary: (ci) => { if (!quiet) setActiveWord(charIndexToWord(safe, ci)); },
        onEnd: finish, onError: finish,
      });
    }
  }, [stopTTS]);

  /* ------------------------------ toasts -------------------------------- */
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback((text: string, tone: Toast['tone'] = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => {
      // Re-firing the same notice (e.g. repeated typed fallback) refreshes the
      // existing toast instead of stacking identical cards over the content.
      const unique = t.filter((x) => x.text !== text);
      return [...unique.slice(-2), { id, text, tone }];
    });
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5400);
  }, []);
  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  /* --------------------------- recording state -------------------------- */
  const [take, setTake] = useState<RecordedTake | null>(null);
  const [busy, setBusy] = useState(false);
  const takeRef = useRef<RecordedTake | null>(null);
  useEffect(() => { takeRef.current = take; }, [take]);

  const resetTake = useCallback(() => {
    revoke(takeRef.current?.url);
    setTake(null);
  }, []);
  const onTake = useCallback((t: RecordedTake) => {
    revoke(takeRef.current?.url);
    setTake(t);
  }, []);

  /* ------------------------------- score -------------------------------- */
  const [score, setScore] = useState<ScoreResult | null>(null);
  const [duoScores, setDuoScores] = useState<Partial<Record<Player, ScoreResult>>>({});
  const [player, setPlayer] = useState<Player>('A');
  const [hintWord, setHintWord] = useState<WordResult | null>(null);
  const [records, setRecords] = useState<LearningRecord[]>(() => readRecords());
  const [history, setHistory] = useState<{ card: CardData; score: number }[]>([]);
  const [sessionRecords, setSessionRecords] = useState<LearningRecord[]>([]);

  /* ---------------------------- conversation ---------------------------- */
  const [question, setQuestion] = useState('');
  const [subtitle, setSubtitle] = useState(true);
  const [answerEval, setAnswerEval] = useState<AnswerEval | null>(null);
  const [newWords, setNewWords] = useState<string[]>([]);
  const [bubbles, setBubbles] = useState<ChatBubble[]>([]);
  const bubbleId = useRef(1);
  const addBubble = useCallback((
    who: ChatBubble['who'], text: string, note?: string, textI18n?: I18nPiece[],
  ) => {
    setBubbles((b) => [...b, { id: bubbleId.current++, who, text, note, textI18n }]);
  }, []);

  /* -------------------------------- UI ---------------------------------- */
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [networkOpen, setNetworkOpen] = useState(false);
  const [report, setReport] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageGenerated, setImageGenerated] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);

  /* --------------------------- TTS entry points ------------------------- */
  const startListening = useCallback(async (relisten: boolean) => {
    if (relisten) {
      const gate = precheck('relisten', 1, configRef.current.channel);
      if (!gate.ok) { toast(gate.reasonKey ? tr(gate.reasonKey, gate.reasonVars) : gate.reason || tr('quota.relistenUsed'), 'warn'); return; }
      consume('relisten', 1, configRef.current.channel);
    }
    setPhase('listening');
    await playTTS(cardRef.current.target, configRef.current.rate, () => setPhase('recording'));
  }, [playTTS, toast]);

  const onCardClick = useCallback(() => {
    if (phase === 'card') void startListening(false);
    else if (phase === 'listening') void startListening(true);
  }, [phase, startListening]);

  const replayQuestion = useCallback(() => {
    if (!question) return;
    setQuestionPlaying(true);
    void playTTS(question, configRef.current.rate, undefined, true);
  }, [question, playTTS]);

  const onSlowWord = useCallback((w: WordResult) => {
    void playTTS(w.word, 0.75, undefined, true);
    toast(t('toast.slowWord', { word: w.word }), 'info');
  }, [playTTS, toast]);

  /* ------------------------------ scoring ------------------------------- */
  const sttIfNeeded = useCallback(async (takeArg: RecordedTake): Promise<{ text: string; words?: RecordedTake['words']; confidence?: number }> => {
    if (configRef.current.channel === 'api' && takeArg.blob) {
      try {
        const r = await getProvider().stt(takeArg.blob);
        if (r.text) return { text: r.text, words: r.words, confidence: r.confidence };
      } catch { toast(t('toast.cloudSttFallback'), 'warn'); }
    }
    return { text: takeArg.transcript, words: takeArg.words, confidence: takeArg.confidence };
  }, [toast]);

  const submitRead = useCallback(async (takeArg: RecordedTake) => {
    if (!takeArg.transcript) { toast(t('toast.notClear'), 'warn'); return; }
    const t0 = Date.now();
    setBusy(true); setPhase('scoring');
    const c = cardRef.current;
    const speech = await sttIfNeeded(takeArg);
    const local = localScore({
      target: c.target, transcript: speech.text, confidence: speech.confidence,
      words: speech.words, durationSec: takeArg.durationSec, keywords: c.keywords,
    });
    let final = local;
    if (configRef.current.channel === 'api') {
      const gate = precheck('scoring', 1, 'api');
      if (gate.ok) {
        try {
          consume('scoring', 1, 'api');
          const messages: Msg[] = [
            { role: 'system', content: `${PIP_SYSTEM_PROMPT}\n${TASK_A_RULES}\n${t('prompt.adviceRule', { lang: t('prompt.adviceLang') })}` },
            { role: 'user', content: JSON.stringify({
              target: c.target, transcript: speech.text,
              localScore: { total: local.total, accuracy: local.accuracy, fluency: local.fluency, completeness: local.completeness },
              keywords: c.keywords,
            }) },
          ];
          const { content } = await getProvider().chat(messages, { maxTokens: LIMITS.SINGLE.scoreMaxTokens, timeoutMs: LIMITS.SINGLE.timeoutMs });
          const parsed = validateScore(content);
          if (parsed) final = mergeScore(local, parsed);
        } catch { /* silent degradation to local scoring; badge stays "Local scoring" */ }
      }
    }
    const wait = Math.max(0, 950 - (Date.now() - t0));
    if (wait) await new Promise((r) => setTimeout(r, wait));

    setScore(final);
    setDuoScores((d) => ({ ...d, [player]: final }));
    const rec: LearningRecord = {
      t: Date.now(), round: round + 1, cardId: c.id, animal: c.animal, habitat: c.habitat,
      total: final.total,
      missedWords: final.words.filter((w) => w.status === 'miss' || w.status === 'off').map((w) => w.word),
      player,
    };
    setRecords(appendRecord(rec));
    setSessionRecords((s) => [...s, rec]);
    setHistory((h) => [...h, { card: c, score: final.total }]);
    addBubble('note', '', undefined, [{
      key: final.engine === 'local' ? 'conv.readDoneLocal' : 'conv.readDoneApi',
      vars: { score: final.total },
    }]);
    setPhase('feedback');
    setBusy(false);
  }, [addBubble, player, round, sttIfNeeded, toast]);

  const retryPractice = useCallback(() => {
    const gate = precheck('reRecord', 1, configRef.current.channel);
    if (!gate.ok) { toast(gate.reasonKey ? tr(gate.reasonKey, gate.reasonVars) : gate.reason || tr('quota.rerecordUsed'), 'warn'); return; }
    consume('reRecord', 1, configRef.current.channel);
    resetTake(); setScore(null); setHintWord(null); setPhase('recording');
  }, [resetTake, toast]);

  const gotoQuestion = useCallback(async () => {
    stopTTS();
    setPhase('question'); setHintWord(null);
    const c = cardRef.current;
    let q = nextQuestion(c.habitat, c.id);
    if (configRef.current.channel === 'api') {
      const gate = precheck('question', 1, 'api');
      if (gate.ok) {
        try {
          consume('question', 1, 'api');
          const messages: Msg[] = [
            { role: 'system', content: `${PIP_SYSTEM_PROMPT}\n${TASK_B_RULES}` },
            { role: 'user', content: JSON.stringify({
              animal: c.animal, habitat: c.habitat, habitatLabel: c.habitatLabel,
              adaptation: c.adaptation, cardId: c.id, lastAnswer: score?.transcript || '',
            }) },
          ];
          const { content } = await getProvider().chat(messages, { maxTokens: LIMITS.SINGLE.questionMaxTokens, timeoutMs: LIMITS.SINGLE.timeoutMs });
          const parsed = validateFollowUp(content);
          if (parsed && isCausalQuestion(parsed.question)) q = parsed.question;
        } catch { /* fall back to built-in bank */ }
      }
    }
    setQuestion(q);
    addBubble('pip', q, 'conv.questionNote');
    setQuestionPlaying(true);
    void playTTS(q, configRef.current.rate, undefined, true);
  }, [addBubble, playTTS, score, stopTTS]);

  const startAnswering = useCallback(() => { stopTTS(); resetTake(); setPhase('answering'); }, [resetTake, stopTTS]);

  const submitAnswer = useCallback(async (takeArg: RecordedTake) => {
    if (!takeArg.transcript) { toast(t('toast.notClear'), 'warn'); return; }
    setBusy(true);
    const c = cardRef.current;
    const speech = await sttIfNeeded(takeArg);
    const ev = evaluateAnswer(question, speech.text, c);
    let reply = partnerReply(c, speech.text, ev);
    if (configRef.current.channel === 'api') {
      const gate = precheck('answerScoring', 1, 'api');
      if (gate.ok) {
        try {
          consume('answerScoring', 1, 'api');
          const messages: Msg[] = [
            { role: 'system', content: `${PIP_SYSTEM_PROMPT}\n${TASK_B_RULES}` },
            { role: 'user', content: JSON.stringify({
              animal: c.animal, habitat: c.habitat, habitatLabel: c.habitatLabel,
              adaptation: c.adaptation, cardId: c.id, answer: speech.text, question,
            }) },
          ];
          const { content } = await getProvider().chat(messages, { maxTokens: LIMITS.SINGLE.questionMaxTokens, timeoutMs: LIMITS.SINGLE.timeoutMs });
          const parsed = validateFollowUp(content);
          if (parsed?.reply) reply = parsed.reply;
        } catch { /* local natural reply */ }
      }
    }
    addBubble('me', speech.text);
    addBubble('pip', reply, 'conv.replyNote');
    setAnswerEval(ev);
    const hits = keywordHits(speech.text, c.keywords);
    setNewWords(hits.length ? hits : c.keywords.slice(0, 3));
    setPhase('wrap'); setBusy(false);
  }, [addBubble, question, sttIfNeeded, toast]);

  const skipAnswer = useCallback(() => {
    addBubble('note', '', undefined, [{ key: 'conv.skipRound' }]);
    setAnswerEval(null); setNewWords(cardRef.current.keywords.slice(0, 3)); setPhase('wrap');
  }, [addBubble]);

  /* ------------------------------ navigation ---------------------------- */
  const nextCard = useCallback(() => {
    stopTTS(); resetTake();
    if (round + 1 >= cards.length) { setReport(true); return; }
    nextRound();
    revoke(imageUrl); setImageUrl(null); setImageGenerated(false);
    setRound((r) => r + 1);
    setPhase('card'); setScore(null); setDuoScores({}); setPlayer('A');
    setQuestion(''); setBubbles([]); setAnswerEval(null); setHintWord(null);
    setShowText(true); setSubtitle(true);
  }, [cards.length, imageUrl, resetTake, round, stopTTS]);

  const startNewSession = useCallback(() => {
    stopTTS(); resetTake();
    resetSessionCounters(); resetQuestionBank();
    revoke(imageUrl);
    setCards(pickSessionCards(8, Date.now() % 99991));
    setRound(0); setPhase('card'); setReport(false);
    setScore(null); setDuoScores({}); setPlayer('A');
    setQuestion(''); setBubbles([]); setAnswerEval(null); setHintWord(null);
    setImageUrl(null); setImageGenerated(false); setHistory([]); setSessionRecords([]);
    setShowText(true); setSubtitle(true);
    toast(t('toast.newSession'), 'ok');
  }, [imageUrl, resetTake, stopTTS, toast]);

  const clearAllRecords = useCallback(() => {
    clearStoredRecords(); setRecords([]); setHistory([]); setSessionRecords([]);
  }, []);

  /* ------------------------------ images -------------------------------- */
  const onUploadImage = useCallback((f: File) => {
    revoke(imageUrl);
    setImageUrl(URL.createObjectURL(f)); setImageGenerated(false);
    toast(t('toast.imageUploaded'), 'ok');
  }, [imageUrl, toast]);

  const onGenerateImage = useCallback(async () => {
    const c = cardRef.current;
    const gate = precheck('image', 1, 'api');
    if (!gate.ok) { toast(gate.reasonKey ? tr(gate.reasonKey, gate.reasonVars) : gate.reason || tr('quota.imageUsed'), 'warn'); return; }
    setImageBusy(true);
    try {
      const provider = getProvider();
      if (!provider.image) throw new Error('no image adapter');
      const url = await provider.image(c.imagePrompt);
      consume('image', 1, 'api');
      revoke(imageUrl);
      setImageUrl(url); setImageGenerated(true);
      toast(t('toast.imageGenerated'), 'ok');
    } catch (e) {
      toast(e instanceof NetworkError ? t('toast.imageFail') : t('toast.imageUnsupported'), 'warn');
    } finally { setImageBusy(false); }
  }, [imageUrl, toast]);

  /* --------------------------- test connection -------------------------- */
  const onTestConnection = useCallback(async () => {
    if (configRef.current.channel === 'local') {
      toast(t('toast.localTest'), 'ok'); return;
    }
    if (!readKey()) { toast(t('toast.needKey'), 'warn'); return; }
    const t0 = performance.now();
    try {
      await getProvider().chat(
        [{ role: 'system', content: PIP_SYSTEM_PROMPT }, { role: 'user', content: 'Reply with exactly: OK' }],
        { maxTokens: 8, timeoutMs: LIMITS.SINGLE.timeoutMs },
      );
      const ms = Math.round(performance.now() - t0);
      const u = usageSummary();
      const q = getQuotaSnapshot();
      toast(t('toast.testOk', {
        ms, tokens: u.remainingTokens.toLocaleString(), calls: q.daily.apiCalls,
      }), 'ok');
    } catch (e) {
      if (e instanceof QuotaError) toast(e.message, 'warn');
      else if (e instanceof NetworkError) {
        toast(`${e.message}${e.corsLikely ? t('toast.proxyAdvice') : ''}`, 'bad');
      } else toast(t('toast.testFail'), 'bad');
    }
  }, [toast]);

  /* ------------------------------- keys --------------------------------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (settingsOpen) { setSettingsOpen(false); return; }
      if (networkOpen) { setNetworkOpen(false); return; }
      if (report) { setReport(false); return; }
      if (phase === 'feedback') { void gotoQuestion(); return; }
      if (phase === 'question') { skipAnswer(); return; }
      if (phase === 'wrap') { nextCard(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settingsOpen, networkOpen, report, phase, gotoQuestion, skipAnswer, nextCard]);

  useEffect(() => () => {
    stopTTS();
    revoke(takeRef.current?.url);
    revoke(imageUrl);
  }, [stopTTS, imageUrl]);

  /* ------------------------------ render -------------------------------- */
  const duoPending = config.duo && player === 'A' && !duoScores.B && phase === 'feedback';
  const domains = useMemo(() => externalDomains(config), [config]);
  const scoreProps = {
    score, duo: duoScores, duoEnabled: config.duo, player, hintWord,
    onWordClick: setHintWord, onCloseHint: () => setHintWord(null), onSlowWord, phase,
  };

  return (
    <div className="app-shell">
      <TopBar
        config={config}
        onOpenSettings={() => setSettingsOpen(true)}
        onToggleTheme={() => onConfig({ theme: config.theme === 'dark' ? 'light' : 'dark' })}
        onToggleDuo={() => onConfig({ duo: !config.duo })}
        onToggleNetwork={() => setNetworkOpen((v) => !v)}
        onToggleRails={() => onConfig({ compactRails: !config.compactRails })}
        onToggleLanguage={() => onConfig({ language: config.language === 'zh' ? 'en' : 'zh' })}
        onNewSession={startNewSession}
        onToast={toast}
      />

      <div className={`app-body ${config.compactRails ? 'compact' : ''}`}>
        <LeftRail round={round} cards={cards} history={history} records={records} />

        <main className="min-w-0 space-y-3">
          <StepGuide phase={phase} round={round} total={cards.length} />

          <CardStage
            card={card} phase={phase} config={config}
            imageUrl={imageUrl} imageBusy={imageBusy} generated={imageGenerated}
            showText={showText} slow={slow} listening={listening} activeWord={activeWord}
            relistenLeft={relistenLeft}
            onCardClick={onCardClick}
            onRelisten={() => void startListening(true)}
            onStopTts={stopTTS}
            onSkipTts={() => { stopTTS(); setPhase('recording'); }}
            onToggleSlow={() => onConfig({ rate: slow ? 1 : 0.75 })}
            onToggleText={() => setShowText((v) => !v)}
            onUpload={onUploadImage}
            onGenerateImage={() => void onGenerateImage()}
            onClearImage={() => { revoke(imageUrl); setImageUrl(null); setImageGenerated(false); }}
            onToast={toast}
          />

          {phase === 'scoring' && (
            <div className="panel p-6 text-center fade-in">
              <Loader2 size={26} className="mx-auto mb-2 animate-spin" style={{ color: 'var(--accent)' }} />
              <div className="font-display text-[1.05rem]">{t('toast.scoringTitle')}</div>
              <div className="text-[.72rem] muted mt-1">{t('toast.scoringSub')}</div>
              <div className="flex justify-center gap-1 mt-3 flex-wrap max-w-md mx-auto">
                {card.target.split(/\s+/).map((w, i) => (
                  <span key={i} className="word scan text-[.72rem]" style={{ animationDelay: `${i * 55}ms` }}>{w}</span>
                ))}
              </div>
            </div>
          )}

          {(phase === 'recording' || phase === 'answering') && (
            <>
              <Recorder
                phase={phase} channel={config.channel}
                mode={phase === 'answering' ? 'answer' : 'read'}
                take={take} busy={busy} rerecordLeft={rerecordLeft}
                onTake={onTake} onResetTake={resetTake}
                onSubmit={phase === 'answering' ? (t) => void submitAnswer(t) : (t) => void submitRead(t)}
                onToast={toast}
              />
              {phase === 'answering' && <ChatBubbles bubbles={bubbles} hiddenText={!subtitle} />}
            </>
          )}

          {phase === 'feedback' && score && (
            <>
              <FeedbackPanel
                score={score} target={card.target}
                rerecordLeft={rerecordLeft}
                onRetry={retryPractice} onQuestion={() => void gotoQuestion()} onSkip={() => void gotoQuestion()}
                onWordClick={setHintWord}
              />
              {duoPending && (
                <div className="panel p-3 flex items-center justify-between gap-2 flex-wrap fade-in">
                  <div className="text-[.74rem]"><b>{t('toast.duoTitle')}</b> <span className="muted">{t('toast.duoText', { score: duoScores.A?.total ?? 0 })}</span></div>
                  <button className="btn btn-sm btn-primary" onClick={() => {
                    setPlayer('B'); resetTake(); setScore(null); setHintWord(null); setPhase('recording');
                  }}><Mic size={12} /> {t('toast.duoSwitch')}</button>
                </div>
              )}
              {config.duo && duoScores.A && duoScores.B && (
                <div className="chip chip-ok">{t('toast.duoDone', { a: duoScores.A.total, b: duoScores.B.total })}</div>
              )}
            </>
          )}

          {phase === 'question' && (
            <>
              <QuestionCard
                question={question} listening={questionPlaying} subtitle={subtitle}
                onToggleSubtitle={() => setSubtitle((v) => !v)}
                onReplay={replayQuestion}
                onStartAnswer={startAnswering}
                onSkip={skipAnswer}
              />
              <ChatBubbles bubbles={bubbles} hiddenText={!subtitle} />
            </>
          )}

          {phase === 'wrap' && (
            <>
              {answerEval && <AnswerEvalCard evaluation={answerEval} />}
              <ChatBubbles bubbles={bubbles} hiddenText={!subtitle} />
              <WrapCard
                card={card} score={score} evaluation={answerEval} newWords={newWords}
                isLast={round + 1 >= cards.length}
                onNext={nextCard} onReport={() => setReport(true)}
              />
            </>
          )}

          <div className="right-rail-mobile mt-3">
            <ScorePanel {...scoreProps} />
          </div>
        </main>

        <ScorePanel {...scoreProps} />
      </div>

      <NetworkPanel open={networkOpen} onToggle={() => setNetworkOpen((v) => !v)} config={config} />

      <SettingsDrawer
        open={settingsOpen} config={config}
        onClose={() => setSettingsOpen(false)}
        onConfig={onConfig} onToast={toast}
        onTestConnection={onTestConnection}
        onClearRecords={clearAllRecords}
        onNewSession={startNewSession}
      />

      {report && (
        <GrowthReport
          records={sessionRecords.length ? sessionRecords : records.slice(-8)}
          onRestart={startNewSession}
          onClear={() => { clearAllRecords(); clearNetworkLog(); toast(t('toast.recordsCleared'), 'ok'); }}
          onClose={() => setReport(false)}
        />
      )}

      <ToastList toasts={toasts} onDismiss={dismissToast} />

      {/* session-start domain audit: kept in the DOM for easy inspection */}
      <div hidden data-external-domains={domains.join(',')} data-session-start={new Date().toISOString()} />
    </div>
  );
}
