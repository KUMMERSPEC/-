/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, AlertTriangle, CheckCircle, Volume2, HelpCircle, CornerDownLeft, ArrowRight, ArrowLeft } from 'lucide-react';
import { WordGroup, Word, StudySession, WordStat, HistoryRecord } from '../types';
import { checkAnswer } from '../utils/wordParser';

interface TestPanelProps {
  decks: WordGroup[];
  isTesting: boolean;
  setIsTesting: (testing: boolean) => void;
  activeSession: StudySession | null;
  setActiveSession: (session: StudySession | null) => void;
  onSessionComplete: (record: HistoryRecord) => void;
  defaultDeckId?: string | null;
  autoStart?: boolean;
  onStartedTesting?: () => void;
}

export default function TestPanel({
  decks,
  isTesting,
  setIsTesting,
  activeSession,
  setActiveSession,
  onSessionComplete,
  defaultDeckId,
  autoStart,
  onStartedTesting,
}: TestPanelProps) {
  // Selection Mode State
  const [selectedDeckId, setSelectedDeckId] = useState<string>('');

  // Active Test States
  const [testQueue, setTestQueue] = useState<Word[]>([]);
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [userInput, setUserInput] = useState('');
  const [isRevealed, setIsRevealed] = useState(false); // Whether the answer has been revealed (Don't remember)
  const [inputStatus, setInputStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  // Timer States
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Completed words (successfully entered in this session)
  const [completedWordIds, setCompletedWordIds] = useState<Set<string>>(new Set());

  // Track the history of first attempts to ensure we only record 'firstTryResult' on the very first encounter
  const [encounteredWordIds, setEncounteredWordIds] = useState<Set<string>>(new Set());

  // Select a default deck if none selected, or synchronize with defaultDeckId
  useEffect(() => {
    if (defaultDeckId) {
      setSelectedDeckId(defaultDeckId);
    } else if (decks.length > 0 && !selectedDeckId) {
      setSelectedDeckId(decks[0].id);
    }
  }, [decks, defaultDeckId]);

  // Handle active session timer
  useEffect(() => {
    if (isTesting && activeSession) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setElapsedSeconds(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTesting, activeSession]);

  // Auto-focus input when word changes or is revealed/reset
  useEffect(() => {
    if (isTesting && inputRef.current && inputStatus === 'idle') {
      inputRef.current.focus();
    }
  }, [isTesting, currentWord, isRevealed, inputStatus]);

  const selectedDeck = decks.find((d) => d.id === selectedDeckId);

  // Initialize test session
  const handleStartTest = (deckToStart?: WordGroup) => {
    const targetDeck = deckToStart || selectedDeck;
    if (!targetDeck || targetDeck.words.length === 0) {
      alert('请选择一个有效的且包含单词的词库');
      return;
    }

    // Shuffle the starting words for a better experience
    const shuffledWords = [...targetDeck.words].sort(() => Math.random() - 0.5);

    const initialStats: { [wordId: string]: WordStat } = {};
    shuffledWords.forEach((word) => {
      initialStats[word.id] = {
        wordId: word.id,
        kanji: word.kanji,
        kana: word.kana,
        meaning: word.meaning,
        incorrectCount: 0,
        forgottenCount: 0,
        firstTryResult: null,
        isFinished: false,
      };
    });

    const newSession: StudySession = {
      groupId: targetDeck.id,
      groupName: targetDeck.name,
      totalWordsCount: targetDeck.words.length,
      startTime: Date.now(),
      stats: initialStats,
    };

    if (deckToStart) {
      setSelectedDeckId(deckToStart.id);
    }
    setTestQueue(shuffledWords);
    setCurrentWord(shuffledWords[0]);
    setUserInput('');
    setIsRevealed(false);
    setInputStatus('idle');
    setCompletedWordIds(new Set());
    setEncounteredWordIds(new Set());
    setActiveSession(newSession);
    setIsTesting(true);
    setElapsedSeconds(0);
  };

  // Auto-start test if we navigated from "Start Test" button
  useEffect(() => {
    if (autoStart && defaultDeckId && !isTesting) {
      const deck = decks.find((d) => d.id === defaultDeckId);
      if (deck && deck.words.length > 0) {
        handleStartTest(deck);
        if (onStartedTesting) {
          onStartedTesting();
        }
      }
    }
  }, [autoStart, defaultDeckId, isTesting, decks]);

  // Text-To-Speech Pronunciation helper
  const handleSpeak = (text: string, kana?: string) => {
    if ('speechSynthesis' in window) {
      // Cancel previous utterances to avoid queuing delay
      window.speechSynthesis.cancel();
      // Use phonetic kana reading to ensure exact correct pronunciation (e.g. 後 -> うしろ vs あと)
      const speechText = kana || text;
      const utterance = new SpeechSynthesisUtterance(speechText);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.85; // Slightly slower for clear learning
      window.speechSynthesis.speak(utterance);
    }
  };

  // Check user answer
  const handleSubmitAnswer = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentWord || !activeSession || inputStatus !== 'idle') return;

    const trimmedInput = userInput.trim();
    if (!trimmedInput) return;

    const isCorrect = checkAnswer(currentWord, trimmedInput);
    const wordId = currentWord.id;
    const isFirstEncounter = !encounteredWordIds.has(wordId);

    // Update encountered list
    if (isFirstEncounter) {
      setEncounteredWordIds((prev) => {
        const next = new Set(prev);
        next.add(wordId);
        return next;
      });
    }

    if (isCorrect) {
      // Correct Answer!
      setInputStatus('success');
      handleSpeak(currentWord.kanji, currentWord.kana);

      // Update Session Stats
      const currentStats = { ...activeSession.stats };
      const wordStat = { ...currentStats[wordId] };

      if (isFirstEncounter && !isRevealed) {
        wordStat.firstTryResult = 'correct';
      }
      wordStat.isFinished = true;
      currentStats[wordId] = wordStat;
      setActiveSession({ ...activeSession, stats: currentStats });

      // After a brief flash of green, advance to the next word
      setTimeout(() => {
        // Mark as completed in session
        setCompletedWordIds((prev) => {
          const next = new Set(prev);
          next.add(wordId);
          return next;
        });

        // Remove from current queue
        const remainingQueue = testQueue.filter((w) => w.id !== wordId);
        setTestQueue(remainingQueue);

        if (remainingQueue.length === 0) {
          // SESSION SUCCESS AND COMPLETE!
          handleFinishSession(currentStats);
        } else {
          // Next word
          setCurrentWord(remainingQueue[0]);
          setUserInput('');
          setIsRevealed(false);
          setInputStatus('idle');
        }
      }, 700);

    } else {
      // Wrong Answer!
      setInputStatus('error');
      
      const currentStats = { ...activeSession.stats };
      const wordStat = { ...currentStats[wordId] };
      wordStat.incorrectCount += 1;

      if (isFirstEncounter) {
        wordStat.firstTryResult = 'incorrect';
      }
      currentStats[wordId] = wordStat;
      setActiveSession({ ...activeSession, stats: currentStats });

      // After error vibration, reset input state to allow trying again, or letting them click 'Forgot'
      setTimeout(() => {
        setInputStatus('idle');
      }, 1000);
    }
  };

  // Don't remember / Reveal Answer
  const handleRevealAnswer = () => {
    if (!currentWord || !activeSession || isRevealed) return;

    setIsRevealed(true);
    handleSpeak(currentWord.kanji, currentWord.kana);

    const wordId = currentWord.id;
    const isFirstEncounter = !encounteredWordIds.has(wordId);

    if (isFirstEncounter) {
      setEncounteredWordIds((prev) => {
        const next = new Set(prev);
        next.add(wordId);
        return next;
      });
    }

    // Update stats
    const currentStats = { ...activeSession.stats };
    const wordStat = { ...currentStats[wordId] };
    wordStat.forgottenCount += 1;

    if (isFirstEncounter) {
      wordStat.firstTryResult = 'forgotten';
    }
    currentStats[wordId] = wordStat;
    setActiveSession({ ...activeSession, stats: currentStats });
  };

  // Skip / Acknowledge Revealed Word and Repeat Later
  const handleAcknowledgeAndNext = () => {
    if (!currentWord || !testQueue.length) return;

    // Push the current word to the END of the queue so it loops back
    const currentWordToRequeue = currentWord;
    const updatedQueue = [...testQueue.slice(1), currentWordToRequeue];

    setTestQueue(updatedQueue);
    setCurrentWord(updatedQueue[0]);
    setUserInput('');
    setIsRevealed(false);
    setInputStatus('idle');
  };

  // Finish session, either by completion or voluntary exit
  const handleFinishSession = (finalStats = activeSession?.stats) => {
    if (!activeSession || !finalStats) return;

    const endTime = Date.now();
    const durationMs = endTime - activeSession.startTime;

    // Calculations
    const uniqueWordIds = Object.keys(finalStats);
    let correctFirstTryCount = 0;
    let mostForgottenWord = '无';
    let maxFails = 0;

    const forgottenRankList = uniqueWordIds.map((id) => {
      const stat = finalStats[id];
      const totalFails = stat.incorrectCount + stat.forgottenCount;
      if (stat.firstTryResult === 'correct') {
        correctFirstTryCount++;
      }
      if (totalFails > maxFails) {
        maxFails = totalFails;
        mostForgottenWord = stat.kanji;
      }
      return {
        kanji: stat.kanji,
        kana: stat.kana,
        meaning: stat.meaning,
        totalFails: totalFails,
      };
    }).sort((a, b) => b.totalFails - a.totalFails);

    const accuracy = uniqueWordIds.length > 0 
      ? Math.round((correctFirstTryCount / uniqueWordIds.length) * 100) 
      : 0;

    const newRecord: HistoryRecord = {
      id: `record_${Date.now()}`,
      groupId: activeSession.groupId,
      groupName: activeSession.groupName,
      date: new Date().toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      totalWords: uniqueWordIds.length,
      accuracy,
      timeSpentMs: durationMs,
      mostForgottenWord: maxFails > 0 ? mostForgottenWord : '无',
      mostForgottenCount: maxFails,
      forgottenRankList,
    };

    onSessionComplete(newRecord);
    
    // Clear Active state
    setIsTesting(false);
    setActiveSession(null);
  };

  const handleQuitTestEarly = () => {
    if (confirm('确认提前退出并结算当前进度吗？退出后可生成已测试单词的结算报告。')) {
      handleFinishSession();
    }
  };

  // Format seconds to MM:SS
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // SELECTION INTERFACE
  if (!isTesting) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8" id="test-selector-container">
        <div className="text-center mb-8">
          <h2 className="font-serif text-2xl font-bold text-[#4A4F41] tracking-wide">请选择要背诵检测的词书</h2>
          <p className="text-[#9A9587] text-sm mt-1">
            点击任意词书卡片，即可一键立即开始智能循环背诵检测！
          </p>
        </div>

        {decks.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E8E4D9] p-8 text-center max-w-lg mx-auto shadow-sm">
            <AlertTriangle className="w-8 h-8 text-[#A68A73] mx-auto mb-2" />
            <p className="text-sm font-semibold text-[#4A4F41]">当前词库中无单词</p>
            <p className="text-xs text-[#9A9587] mt-1.5">
              内置的初始词汇书由于没有导入，或者您删除了它们。请前往「导入单词」中快速导入或点击 AI 智能生成单词！
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {decks.map((deck) => {
              return (
                <div
                  key={deck.id}
                  onClick={() => handleStartTest(deck)}
                  className="group cursor-pointer rounded-2xl p-5 border text-left transition-all duration-200 flex flex-col justify-between h-48 bg-white border-[#E8E4D9] hover:border-[#7D8471] hover:ring-2 hover:ring-[#7D8471]/15 hover:shadow-md"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-[11px] font-mono text-[#9A9587]">
                        {deck.isCustom ? '⭐ 自定义词库' : '📚 系统预设'}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#F1EFE9] text-[#7D8471]">
                        {deck.words.length} 词
                      </span>
                    </div>
                    <h4 className="font-serif text-md font-bold text-[#4A4F41] mt-3 line-clamp-1 group-hover:text-[#7D8471] transition-colors">
                      {deck.name}
                    </h4>
                    <p className="text-xs text-[#9A9587] mt-2 line-clamp-3 leading-relaxed">
                      {deck.description}
                    </p>
                  </div>

                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#E8E4D9]">
                    <span className="text-[10px] text-[#7D8471] font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                      点击立即开始背诵 <ArrowRight className="w-3 h-3" />
                    </span>
                    <span className="text-xs font-semibold text-[#7D8471] font-serif">
                      进入检测
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ACTIVE RECITATION TEST ARENA
  if (!currentWord || !activeSession) return null;

  const totalWords = activeSession.totalWordsCount;
  const masteredCount = completedWordIds.size;
  const loopCount = testQueue.length;
  const progressPercent = Math.round((masteredCount / totalWords) * 100);

  return (
    <div className="max-w-xl mx-auto px-4 py-3 sm:py-8" id="test-arena-container">
      {/* Top Session Indicators */}
      <div className="flex justify-between items-center mb-3 sm:mb-4 text-[11px] sm:text-xs font-mono text-[#9A9587]">
        <div className="flex items-center gap-1.5 bg-[#F1EFE9]/60 border border-[#E8E4D9] px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full">
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#7D8471] rounded-full animate-pulse" />
          <span>正在检测：<strong>{activeSession.groupName}</strong></span>
        </div>
        <div className="font-semibold text-[#4A4F41] flex items-center gap-1 bg-[#F1EFE9]/60 border border-[#E8E4D9] px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full">
          <span>用时</span>
          <span className="text-[#A68A73] font-mono font-bold text-xs sm:text-sm">{formatTime(elapsedSeconds)}</span>
        </div>
      </div>

      {/* Modern Circle Progress Header */}
      <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-[#E8E4D9] shadow-sm mb-3 sm:mb-6">
        <div className="flex justify-between items-center text-[11px] sm:text-xs mb-1">
          <span className="font-semibold text-[#4A4F41]">本次测试总进度</span>
          <span className="font-mono text-[#9A9587]">
            已掌握 {masteredCount} / {totalWords} 词
          </span>
        </div>
        {/* Progress Bar */}
        <div className="w-full bg-[#F1EFE9] h-2 sm:h-2.5 rounded-full overflow-hidden border border-[#E8E4D9]/40">
          <div
            className="bg-[#7D8471] h-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between items-center mt-1.5 text-[9px] sm:text-[10px] text-[#9A9587]">
          <span>待掌握循环中：{loopCount} 词</span>
          <span>通关进度：{progressPercent}%</span>
        </div>
      </div>

      {/* THE WORD CARD */}
      <div
        className={`bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 border-2 shadow-sm sm:shadow-md transition-all duration-300 relative overflow-hidden flex flex-col ${
          inputStatus === 'success'
            ? 'border-[#7D8471] bg-[#7D8471]/5'
            : inputStatus === 'error'
            ? 'border-[#A68A73] animate-shake bg-[#A68A73]/5'
            : 'border-[#E8E4D9]'
        }`}
      >
        {/* Card Header Background Stamp */}
        <div className="absolute right-3 top-2 text-[45px] sm:text-[70px] select-none pointer-events-none text-[#F1EFE9] font-serif font-bold leading-none opacity-40 sm:opacity-50">
          {loopCount}
        </div>

        {/* 1. MEANING (PROMPT) */}
        <div className="text-center py-2 sm:py-4">
          <span className="text-[10px] sm:text-xs uppercase tracking-widest text-[#9A9587] font-bold block mb-1">中文释义</span>
          <h2 className="font-serif text-xl sm:text-3xl font-extrabold text-[#4A4F41] leading-tight">
            {currentWord.meaning}
          </h2>
        </div>

        <div className="my-3 sm:my-6 border-t border-dashed border-[#E8E4D9]" />

        {/* 2. REVEALED PANEL OR INPUT BOX */}
        {!isRevealed ? (
          <form onSubmit={handleSubmitAnswer} className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-center text-[10px] sm:text-xs font-semibold text-[#9A9587] mb-1.5 sm:mb-2.5">
                请在下方输入日语单词：
              </label>
              
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="假名（如：きれい）或 汉字（如：綺麗）"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  disabled={inputStatus === 'success'}
                  className={`w-full text-center font-serif text-lg sm:text-xl py-3 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl border-2 focus:outline-none transition-all ${
                    inputStatus === 'success'
                      ? 'border-[#7D8471] bg-[#7D8471]/10 text-[#4A4F41] font-bold'
                      : inputStatus === 'error'
                      ? 'border-[#A68A73] bg-[#A68A73]/10 text-[#4A4F41] font-semibold'
                      : 'border-[#E8E4D9] focus:border-[#7D8471] bg-[#F9F8F4] placeholder-[#C2BEB3]'
                  }`}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />

                {/* Input Help hint icon */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 group">
                  <HelpCircle className="w-4 h-4 text-[#9A9587] hover:text-[#4A4F41] cursor-help" />
                  <div className="absolute right-0 bottom-7 hidden group-hover:block w-52 sm:w-56 p-2 bg-[#4A4F41] text-white rounded-lg text-[10px] leading-relaxed z-50 shadow-lg text-left font-sans">
                    使用中文键盘拼音输入日语汉字，或调出日语键盘输入纯假名均可判定正确！
                  </div>
                </div>
              </div>
            </div>

            {/* Input Action buttons */}
            <div className="grid grid-cols-5 gap-2 sm:gap-3 pt-1">
              <button
                type="button"
                onClick={handleRevealAnswer}
                className="col-span-2 py-2.5 sm:py-3 px-2 sm:px-4 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold border border-[#E8E4D9] hover:bg-[#F9F8F4] text-[#9A9587] bg-white transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                <span>不记得 (看答案)</span>
              </button>
              
              <button
                type="submit"
                disabled={!userInput.trim() || inputStatus === 'success'}
                className="col-span-3 bg-[#7D8471] hover:bg-[#6A705F] disabled:bg-stone-200 text-white py-2.5 sm:py-3 px-2 sm:px-4 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 shadow-sm cursor-pointer"
              >
                <span>提交验证</span>
                <CornerDownLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        ) : (
          /* REVEALED STATE (ANSWER CARD) */
          <div className="space-y-4 sm:space-y-6 text-center animate-celebrate">
            <div className="p-4 sm:p-5 bg-[#F9F8F4] border border-[#E8E4D9] rounded-xl sm:rounded-2xl">
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-[#7D8471] block mb-1">
                正确拼写
              </span>
              
              <div className="flex items-center justify-center gap-2">
                <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#4A4F41]">
                  {currentWord.kanji}
                </h3>
                <button
                  onClick={() => handleSpeak(currentWord.kanji, currentWord.kana)}
                  className="p-1 sm:p-1.5 rounded-lg text-[#9A9587] hover:text-[#7D8471] hover:bg-white border border-[#E8E4D9] shadow-sm transition-all"
                  title="点击播放真人发音"
                >
                  <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>

              {currentWord.kana && currentWord.kana !== currentWord.kanji && (
                <p className="text-xs font-mono text-[#7D8471] mt-1.5 bg-[#F1EFE9] py-0.5 px-2.5 rounded-md inline-block">
                  读音：{currentWord.kana}
                </p>
              )}
            </div>

            <div className="p-3 sm:p-4 bg-[#F1EFE9] border border-[#E8E4D9] rounded-xl text-[#4A4F41] text-[11px] sm:text-xs flex gap-1.5 sm:gap-2 items-start text-left leading-relaxed">
              <AlertTriangle className="w-4 h-4 text-[#A68A73] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-[#4A4F41] mb-0.5">温习提示</span>
                此单词已标记为「遗忘/错误」并已<b>置于循环队列尾部</b>。点击下方「继续」进行复习，稍后它将再次出现，直到您拼写正确为止。
              </div>
            </div>

            <button
              onClick={handleAcknowledgeAndNext}
              className="w-full bg-[#A68A73] hover:bg-[#91765F] text-white font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>我记住了，继续下一个</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        )}

        {/* Real-time Visual Success Feedback Overlay */}
        {inputStatus === 'success' && (
          <div className="absolute inset-0 bg-[#7D8471]/5 backdrop-blur-[1px] flex items-center justify-center animate-celebrate animate-duration-300">
            <div className="bg-white px-4 py-2.5 sm:px-5 sm:py-3.5 rounded-xl sm:rounded-2xl border border-[#7D8471] flex items-center gap-1.5 sm:gap-2 shadow-lg">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#7D8471] shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-[#4A4F41] font-serif">回答正确！音形掌握</span>
            </div>
          </div>
        )}
      </div>

      {/* Settle Early button */}
      <div className="mt-4 sm:mt-8 flex justify-between items-center px-1">
        <button
          onClick={() => {
            if (confirm('是否确定结束背诵？您也可以重新选择词书。')) {
              setIsTesting(false);
              setActiveSession(null);
            }
          }}
          className="text-[11px] sm:text-xs text-[#9A9587] hover:text-[#4A4F41] flex items-center gap-1 hover:underline transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>重新选择词书</span>
        </button>

        <button
          onClick={handleQuitTestEarly}
          className="text-[10px] sm:text-xs bg-[#E8E4D9] text-[#7D8471] hover:bg-[#DED9CC] border-none px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl font-bold uppercase tracking-wider transition-colors cursor-pointer"
        >
          结束背诵并查看结算报告
        </button>
      </div>
    </div>
  );
}
