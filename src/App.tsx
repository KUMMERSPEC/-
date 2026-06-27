/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BookOpen, Award, Plus, Trash2, ArrowRight, Play, CheckCircle, Volume2, Search, ArrowUpDown, RefreshCw, Calendar } from 'lucide-react';
import { WordGroup, Word, StudySession, HistoryRecord } from './types';
import { DEFAULT_DECKS } from './data/defaultDecks';
import Header from './components/Header';
import ImportPanel from './components/ImportPanel';
import TestPanel from './components/TestPanel';
import ReportPanel from './components/ReportPanel';

export default function App() {
  const [activeTab, setActiveTab] = useState<'library' | 'test' | 'history' | 'import'>('library');
  
  // Data State persisted in LocalStorage
  const [customGroups, setCustomGroups] = useState<WordGroup[]>([]);
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);

  // Testing Active Session States
  const [isTesting, setIsTesting] = useState(false);
  const [activeSession, setActiveSession] = useState<StudySession | null>(null);
  const [justCompletedRecord, setJustCompletedRecord] = useState<HistoryRecord | null>(null);

  // Library View State
  const [previewingDeckId, setPreviewingDeckId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Load from LocalStorage
  useEffect(() => {
    const storedCustom = localStorage.getItem('nihongo_custom_groups');
    const storedHistory = localStorage.getItem('nihongo_history_records');
    
    if (storedCustom) {
      try {
        setCustomGroups(JSON.parse(storedCustom));
      } catch (e) {
        console.error('Error loading custom groups:', e);
      }
    }
    if (storedHistory) {
      try {
        setHistoryRecords(JSON.parse(storedHistory));
      } catch (e) {
        console.error('Error loading history:', e);
      }
    }
  }, []);

  // Save to LocalStorage helpers
  const saveCustomGroups = (updated: WordGroup[]) => {
    setCustomGroups(updated);
    localStorage.setItem('nihongo_custom_groups', JSON.stringify(updated));
  };

  const saveHistoryRecords = (updated: HistoryRecord[]) => {
    setHistoryRecords(updated);
    localStorage.setItem('nihongo_history_records', JSON.stringify(updated));
  };

  // 1. Add custom imported group
  const handleAddGroup = (newGroup: WordGroup) => {
    const updated = [newGroup, ...customGroups];
    saveCustomGroups(updated);
    // Auto switch to library tab to show the new deck
    setActiveTab('library');
    setPreviewingDeckId(newGroup.id);
  };

  // 2. Delete imported group
  const handleDeleteGroup = (groupId: string) => {
    const updated = customGroups.filter((g) => g.id !== groupId);
    saveCustomGroups(updated);
    if (previewingDeckId === groupId) {
      setPreviewingDeckId(null);
    }
  };

  // 3. Clear entire history
  const handleClearHistory = () => {
    saveHistoryRecords([]);
    setJustCompletedRecord(null);
  };

  // 4. Session complete handler
  const handleSessionComplete = (record: HistoryRecord) => {
    const updated = [record, ...historyRecords];
    saveHistoryRecords(updated);
    setJustCompletedRecord(record);
    // Redirect user to the history/report tab to view their shiny new results!
    setActiveTab('history');
  };

  // 5. Retest from report button shortcut
  const handleRetest = (deckId: string) => {
    setActiveTab('test');
    setJustCompletedRecord(null);
  };

  // 6. Vocal audio helper (Text-to-Speech)
  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Combine default decks and custom imported decks for browsing
  const allDecks = [...DEFAULT_DECKS, ...customGroups];
  const activePreviewDeck = allDecks.find((d) => d.id === previewingDeckId) || allDecks[0];

  // Quick statistics
  const totalUniqueWords = allDecks.reduce((sum, deck) => sum + deck.words.length, 0);
  const totalSessionsCompleted = historyRecords.length;

  return (
    <div className="min-h-screen bg-[#F9F8F4] text-[#3D3D3D] selection:bg-[#F1EFE9] selection:text-[#7D8471] pb-12">
      {/* Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          // If moving away from history, clear the single-session focus state
          if (tab !== 'history') {
            setJustCompletedRecord(null);
          }
        }}
        wordCount={totalUniqueWords}
        sessionCount={totalSessionsCompleted}
        isTesting={isTesting}
        onExitTest={() => {
          setIsTesting(false);
          setActiveSession(null);
        }}
      />

      {/* VIEWPORT BODY */}
      <main className="max-w-6xl mx-auto py-4">
        
        {/* TAB 1: LIBRARY OVERVIEW (词库库) */}
        {activeTab === 'library' && (
          <div className="px-4 py-4" id="library-tab-content">
            {/* Banner block */}
            <div className="bg-[#4A4F41] text-[#FDFCF9] p-6 sm:p-8 rounded-3xl mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b-4 border-[#353A2F] shadow-sm relative overflow-hidden">
              <div className="relative z-10 max-w-xl">
                <span className="text-[10px] text-[#A68A73] font-bold uppercase tracking-widest font-mono">
                  Welcome to Nihongo Cards
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-wide mt-1">
                  和风明净 · 单词背诵检测馆
                </h2>
                <p className="text-[#E8E4D9] text-xs mt-2 leading-relaxed">
                  这里是您的个人专属日语馆。点击任意词书即可开始自由浏览、听音、复习温习。准备好后，点击「进入背诵测试」即可开始深度拼写考核，检验默写成果。
                </p>
              </div>

              <button
                onClick={() => setActiveTab('import')}
                className="relative z-10 shrink-0 bg-[#A68A73] hover:bg-[#91765F] text-white font-serif font-bold text-xs py-3 px-6 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>导入我自己的单词书</span>
              </button>

              {/* Decorative design stamp */}
              <div className="absolute -right-8 -bottom-8 text-[140px] text-white/[0.02] select-none font-serif font-bold italic leading-none pointer-events-none">
                語
              </div>
            </div>

            {/* Split Grid Layout for Library: Left sidebar with Decks list, Right with word lists preview */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Left sidebar: Decks browsing list */}
              <div className="lg:col-span-2 flex flex-col gap-4">
                <h3 className="font-serif text-md font-bold text-[#4A4F41] flex items-center justify-between">
                  <span>选择词汇书目录</span>
                  <span className="text-xs font-sans font-normal text-[#9A9587]">共 {allDecks.length} 本词书</span>
                </h3>

                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {allDecks.map((deck) => {
                    const isSelected = activePreviewDeck.id === deck.id;
                    return (
                      <div
                        key={deck.id}
                        onClick={() => setPreviewingDeckId(deck.id)}
                        className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-white border-[#7D8471] shadow-sm ring-2 ring-[#7D8471]/15'
                            : 'bg-[#FDFCF9]/60 border-[#E8E4D9] hover:bg-white hover:border-[#7D8471]/40'
                        }`}
                      >
                        <div className="flex justify-between items-center text-[10px] text-[#9A9587] font-mono">
                          <span>{deck.isCustom ? '⭐ 自定义' : '📚 系统内置'}</span>
                          <span className="bg-[#F1EFE9] px-1.5 py-0.5 rounded-full font-bold text-[#7D8471]">
                            {deck.words.length} 词
                          </span>
                        </div>
                        <h4 className="font-serif font-bold text-[#4A4F41] text-sm mt-2 line-clamp-1">
                          {deck.name}
                        </h4>
                        <p className="text-[#9A9587] text-xs mt-1 line-clamp-2 leading-relaxed">
                          {deck.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right panel: Vocabulary grid/list preview before testing */}
              {activePreviewDeck && (
                <div className="lg:col-span-3 bg-white border border-[#E8E4D9] rounded-3xl p-6 shadow-sm flex flex-col gap-5">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E8E4D9] pb-4">
                    <div>
                      <span className="text-[10px] text-[#7D8471] font-bold uppercase tracking-wider block">
                        VOCABULARY PREVIEW · 词书精修浏览
                      </span>
                      <h3 className="font-serif text-lg font-bold text-[#4A4F41] mt-1">
                        {activePreviewDeck.name}
                      </h3>
                      <p className="text-xs text-[#9A9587] mt-1">{activePreviewDeck.description}</p>
                    </div>

                    <button
                      onClick={() => {
                        setActiveTab('test');
                        setJustCompletedRecord(null);
                      }}
                      className="bg-[#7D8471] hover:bg-[#6A705F] text-white font-serif font-semibold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current text-[#A68A73]" />
                      <span>立即开始背诵检测</span>
                    </button>
                  </div>

                  {/* Word sheet row list */}
                  <div className="flex-1 max-h-[420px] overflow-y-auto pr-1 space-y-2">
                    {activePreviewDeck.words.length === 0 ? (
                      <div className="py-16 text-center text-[#9A9587] text-xs">
                        当前选中的自定义词书中暂不包含单词
                      </div>
                    ) : (
                      activePreviewDeck.words.map((word, index) => (
                        <div
                          key={word.id}
                          className="group p-3 hover:bg-[#FDFCF9]/80 border border-transparent hover:border-[#E8E4D9] rounded-xl transition-all flex justify-between items-center gap-3"
                        >
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] text-[#9A9587] font-mono w-4 text-center">
                              {(index + 1).toString().padStart(2, '0')}
                            </span>
                            
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <strong className="font-serif text-[#4A4F41] text-md font-semibold tracking-wide">
                                  {word.kanji}
                                </strong>
                                {word.kana && word.kana !== word.kanji && (
                                  <span className="text-[10px] text-[#7D8471] bg-[#F1EFE9] px-1.5 py-0.5 rounded font-mono font-medium">
                                    {word.kana}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[#3D3D3D] mt-1 font-sans">{word.meaning}</p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleSpeak(word.kanji)}
                            className="p-1.5 rounded-lg text-[#9A9587] hover:text-[#7D8471] hover:bg-[#F1EFE9] transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                            title="真人发音"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ACTIVE TEST ARENA (单词背诵测试) */}
        {activeTab === 'test' && (
          <TestPanel
            decks={allDecks}
            isTesting={isTesting}
            setIsTesting={setIsTesting}
            activeSession={activeSession}
            setActiveSession={setActiveSession}
            onSessionComplete={handleSessionComplete}
          />
        )}

        {/* TAB 3: STUDY REPORT & HISTORY LOGS (学习报告) */}
        {activeTab === 'history' && (
          <ReportPanel
            historyRecords={historyRecords}
            onClearHistory={handleClearHistory}
            justCompletedRecord={justCompletedRecord}
            onCloseDetail={() => setJustCompletedRecord(null)}
            onRetest={handleRetest}
          />
        )}

        {/* TAB 4: IMPORT WORD LISTS (手动导入 / AI 生成) */}
        {activeTab === 'import' && (
          <ImportPanel
            onAddGroup={handleAddGroup}
            customGroups={customGroups}
            onDeleteGroup={handleDeleteGroup}
          />
        )}

      </main>
    </div>
  );
}
