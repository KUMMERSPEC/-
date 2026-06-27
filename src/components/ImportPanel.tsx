/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Plus, HelpCircle, AlertCircle, RefreshCw, Wand2, Sparkles, Trash2, Edit2, BookOpen, Check } from 'lucide-react';
import { WordGroup, Word } from '../types';
import { parseWordList } from '../utils/wordParser';

interface ImportPanelProps {
  onAddGroup: (newGroup: WordGroup) => void;
  customGroups: WordGroup[];
  onDeleteGroup: (groupId: string) => void;
}

export default function ImportPanel({ onAddGroup, customGroups, onDeleteGroup }: ImportPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<'manual' | 'ai'>('manual');
  
  // Manual Import states
  const [deckName, setDeckName] = useState('');
  const [deckDesc, setDeckDesc] = useState('');
  const [rawText, setRawText] = useState('');
  const [previewWords, setPreviewWords] = useState<Word[]>([]);
  
  // AI Generator states
  const [aiTopic, setAiTopic] = useState('');
  const [aiWordCount, setAiWordCount] = useState(12);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiPreviewWords, setAiPreviewWords] = useState<Word[]>([]);
  const [aiDeckName, setAiDeckName] = useState('');

  // Built-in AI presets
  const AI_PRESETS = [
    { title: '居酒屋美食点餐', prompt: '日本居酒屋点餐常用食物、饮品及客套用语' },
    { title: '动漫高频中二词汇', prompt: '日本热血动漫中最常见的经典帅气中二词汇' },
    { title: 'JLPT N2 核心副词', prompt: '日语能力考 N2 核心高频常考副词（如：すっかり、ぎっしり）' },
    { title: '互联网/IT 行业日语', prompt: '日本 IT 与软件开发职场最常用的外来语及专业词汇' },
    { title: '日本日常出行与交通', prompt: '在日本乘坐新干线、地铁、问路时最实用的场景词汇' }
  ];

  // Update real-time preview for manual import
  useEffect(() => {
    if (rawText.trim()) {
      setPreviewWords(parseWordList(rawText));
    } else {
      setPreviewWords([]);
    }
  }, [rawText]);

  // Handle Manual Save
  const handleManualSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deckName.trim()) {
      alert('请输入词汇表名称');
      return;
    }
    if (previewWords.length === 0) {
      alert('未检测到可导入的单词。请按格式输入单词。');
      return;
    }

    const newGroup: WordGroup = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: deckName.trim(),
      description: deckDesc.trim() || `手动导入的词库，共 ${previewWords.length} 个单词`,
      words: previewWords,
      isCustom: true
    };

    onAddGroup(newGroup);
    
    // Clear states
    setDeckName('');
    setDeckDesc('');
    setRawText('');
    setPreviewWords([]);
    alert(`成功导入词书「${newGroup.name}」，共 ${newGroup.words.length} 个单词！`);
  };

  // Run AI Generator
  const handleAIGenerate = async () => {
    const topic = aiTopic.trim();
    if (!topic) {
      setAiError('请输入生成主题或选择预设模板');
      return;
    }

    setIsGenerating(true);
    setAiError(null);
    setAiPreviewWords([]);

    try {
      const response = await fetch('/api/generate-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, count: aiWordCount })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || '生成失败，请重试');
      }

      setAiPreviewWords(data.words);
      setAiDeckName(`AI: ${topic}`);
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || '网络请求出错，请确保您的 API 密匙已配置且有效。');
    } finally {
      setIsGenerating(false);
    }
  };

  // Save AI Generated deck
  const handleSaveAIDeck = () => {
    if (aiPreviewWords.length === 0) return;
    const nameToUse = aiDeckName.trim() || `AI 生成: ${aiTopic}`;

    const newGroup: WordGroup = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: nameToUse,
      description: `由 AI 智能生成的「${aiTopic}」主题词汇表。`,
      words: aiPreviewWords,
      isCustom: true
    };

    onAddGroup(newGroup);
    
    // Reset AI states
    setAiTopic('');
    setAiPreviewWords([]);
    setAiDeckName('');
    alert(`成功保存 AI 生成的词书「${nameToUse}」！`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6" id="import-panel-container">
      {/* Tab Selectors */}
      <div className="flex border-b border-[#E8E4D9] mb-6">
        <button
          onClick={() => setActiveSubTab('manual')}
          className={`flex items-center gap-2 px-6 py-3 font-medium text-sm border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'manual'
              ? 'border-[#7D8471] text-[#4A4F41] bg-[#7D8471]/5 font-semibold'
              : 'border-transparent text-[#9A9587] hover:text-[#4A4F41]'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>手动输入导入</span>
        </button>
        <button
          onClick={() => setActiveSubTab('ai')}
          className={`flex items-center gap-2 px-6 py-3 font-medium text-sm border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'ai'
              ? 'border-[#7D8471] text-[#4A4F41] bg-[#7D8471]/5 font-semibold'
              : 'border-transparent text-[#9A9587] hover:text-[#4A4F41]'
          }`}
        >
          <Sparkles className="w-4 h-4 text-[#A68A73] animate-pulse" />
          <span>AI 智能词书生成</span>
        </button>
      </div>

      {/* MANUAL IMPORT MODE */}
      {activeSubTab === 'manual' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Inputs */}
          <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-[#E8E4D9] shadow-sm flex flex-col gap-4">
            <h3 className="font-serif text-lg font-bold text-[#4A4F41]">手动导入新词书</h3>
            <form onSubmit={handleManualSave} className="space-y-4 flex flex-col">
              <div>
                <label className="block text-xs font-semibold text-[#4A4F41] mb-1">词汇书名称 *</label>
                <input
                  type="text"
                  placeholder="如：标日初级上册第10课"
                  value={deckName}
                  onChange={e => setDeckName(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-[#E8E4D9] focus:outline-none focus:border-[#7D8471] bg-[#F9F8F4] placeholder-[#C2BEB3] transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4A4F41] mb-1">简介 / 备注（可选）</label>
                <input
                  type="text"
                  placeholder="如：主要复习方位词与动词变形"
                  value={deckDesc}
                  onChange={e => setDeckDesc(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-[#E8E4D9] focus:outline-none focus:border-[#7D8471] bg-[#F9F8F4] placeholder-[#C2BEB3] transition-colors"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-[#4A4F41]">单词列表输入 *</label>
                  <div className="group relative">
                    <span className="flex items-center gap-1 text-[11px] text-[#9A9587] hover:text-[#4A4F41] cursor-help">
                      <HelpCircle className="w-3.5 h-3.5" />
                      格式说明
                    </span>
                    <div className="absolute right-0 bottom-6 hidden group-hover:block w-72 p-3 bg-[#4A4F41] text-white rounded-lg text-xs leading-relaxed shadow-xl z-50">
                      支持多种极简排版（一行一个单词）：
                      <ul className="list-disc pl-4 mt-1 space-y-1">
                        <li><code className="text-[#A68A73]">綺麗（きれい） 漂亮</code></li>
                        <li><code className="text-[#A68A73]">美味しい(おいしい) 好吃</code></li>
                        <li><code className="text-[#A68A73]">先生/せんせい/老师</code></li>
                        <li><code className="text-[#A68A73]">勉強 学习</code> (支持汉字拼写加意思)</li>
                        <li><code className="text-[#A68A73]">ありがとう 谢谢</code> (支持纯假名拼写)</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <textarea
                  placeholder="每行输入一个单词。格式示例：&#10;綺麗（きれい）　漂亮&#10;美味しい（おいしい）　好吃&#10;食べる（たべる）　吃"
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  rows={10}
                  className="w-full p-4 text-sm rounded-xl border-2 border-[#E8E4D9] focus:outline-none focus:border-[#7D8471] bg-[#F9F8F4] placeholder-[#C2BEB3] font-mono leading-relaxed transition-colors"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={previewWords.length === 0}
                className="w-full mt-2 bg-[#4A4F41] hover:bg-[#353A2F] text-white py-3 rounded-xl text-sm font-semibold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>保存并添加到词库 (已解析 {previewWords.length} 词)</span>
              </button>
            </form>
          </div>

          {/* Realtime Preview */}
          <div className="lg:col-span-2 bg-[#FDFCF9]/60 rounded-2xl border border-[#E8E4D9] p-5 flex flex-col">
            <h3 className="font-serif text-sm font-bold text-[#4A4F41] mb-3 flex items-center justify-between">
              <span>实时解析预览</span>
              <span className="text-xs font-sans font-normal text-[#7D8471] bg-white/80 px-2 py-0.5 rounded-full border border-[#E8E4D9]">
                {previewWords.length} 词成功
              </span>
            </h3>

            {previewWords.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-[#9A9587] py-12 text-center">
                <BookOpen className="w-8 h-8 mb-2 stroke-[1.5]" />
                <p className="text-xs">在左侧输入单词后</p>
                <p className="text-[11px] mt-0.5">此板面将自动显示解析出的汉字、假名及解释</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto max-h-[360px] pr-1 space-y-2">
                {previewWords.map((word, index) => (
                  <div
                    key={word.id}
                    className="p-2.5 bg-white rounded-xl border border-[#E8E4D9] shadow-sm text-xs flex justify-between gap-2 items-start"
                  >
                    <div>
                      <div className="font-semibold text-[#4A4F41] flex items-center gap-1.5 flex-wrap">
                        <span className="font-serif text-sm">{word.kanji}</span>
                        {word.kana && word.kana !== word.kanji && (
                          <span className="text-[#7D8471] bg-[#F1EFE9] px-1.5 py-0.5 rounded text-[10px]">
                            {word.kana}
                          </span>
                        )}
                      </div>
                      <div className="text-[#9A9587] mt-1 font-sans">{word.meaning}</div>
                    </div>
                    <span className="text-[10px] text-[#C2BEB3] font-mono">#{index + 1}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI GENERATOR MODE */}
      {activeSubTab === 'ai' && (
        <div className="bg-white p-6 rounded-2xl border border-[#E8E4D9] shadow-sm">
          <div className="max-w-2xl flex flex-col gap-5">
            <div>
              <h3 className="font-serif text-lg font-bold text-[#4A4F41] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#A68A73]" />
                AI 智能一键生成词书
              </h3>
              <p className="text-xs text-[#9A9587] mt-1">
                利用高级 Gemini 智能模型，只需输入一个简单的日常或考试主题，即可生成排版完美、释义精准的日语检测词汇书。
              </p>
            </div>

            {/* Quick Presets */}
            <div>
              <span className="block text-xs font-semibold text-[#4A4F41] mb-2">推荐灵感主题库（点击直接填入）</span>
              <div className="flex flex-wrap gap-2">
                {AI_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setAiTopic(preset.prompt);
                      setAiPreviewWords([]);
                    }}
                    className="text-xs px-3 py-1.5 rounded-full border border-[#E8E4D9] hover:border-[#7D8471] hover:bg-[#7D8471]/5 text-[#4A4F41] transition-all cursor-pointer"
                  >
                    {preset.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-[#4A4F41] mb-1">生成主题描述</label>
                <input
                  type="text"
                  placeholder="例如：日本旅行中点拉面和寿司时的常用日语"
                  value={aiTopic}
                  onChange={e => setAiTopic(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-[#E8E4D9] focus:outline-none focus:border-[#7D8471] bg-[#F9F8F4] placeholder-[#C2BEB3] transition-colors"
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs font-semibold text-[#4A4F41] mb-1">单词数量</label>
                <select
                  value={aiWordCount}
                  onChange={e => setAiWordCount(Number(e.target.value))}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-[#E8E4D9] focus:outline-none focus:border-[#7D8471] bg-[#F9F8F4] text-[#4A4F41] transition-colors"
                >
                  <option value={8}>8 个 (精简)</option>
                  <option value={12}>12 个 (标准)</option>
                  <option value={15}>15 个 (进阶)</option>
                  <option value={20}>20 个 (挑战)</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleAIGenerate}
              disabled={isGenerating || !aiTopic.trim()}
              className="bg-[#4A4F41] hover:bg-[#353A2F] disabled:bg-stone-300 text-white py-3 px-6 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 self-start cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>AI 正在脑力风暴生成中... (大约需要5-8秒)</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 text-[#A68A73]" />
                  <span>启动 AI 智能一键生成</span>
                </>
              )}
            </button>

            {/* Error state */}
            {aiError && (
              <div className="p-4 bg-[#F1EFE9] rounded-xl border border-[#E8E4D9] text-[#4A4F41] text-xs flex gap-2 items-start leading-relaxed animate-shake">
                <AlertCircle className="w-4.5 h-4.5 text-[#A68A73] shrink-0" />
                <div>
                  <span className="font-semibold block text-[#4A4F41] mb-1">AI 接口提示</span>
                  <p className="mb-2">{aiError}</p>
                  <p className="text-[#9A9587] font-sans text-[11px]">
                    若您没有配对 API 密匙，建议使用左侧的「手动输入导入」。您可将手头现有的词汇直接复制进去，体验完美的循环背诵检测！
                  </p>
                </div>
              </div>
            )}

            {/* Generated results Preview */}
            {aiPreviewWords.length > 0 && (
              <div className="mt-4 p-5 bg-[#FDFCF9] rounded-2xl border border-[#E8E4D9] animate-celebrate">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <span className="text-[10px] text-[#A68A73] font-bold tracking-wider uppercase">GENERATION SUCCESS</span>
                    <input
                      type="text"
                      value={aiDeckName}
                      onChange={e => setAiDeckName(e.target.value)}
                      className="block font-serif text-lg font-bold text-[#4A4F41] border-b border-[#E8E4D9] hover:border-[#7D8471] focus:border-[#7D8471] bg-transparent py-0.5 focus:outline-none"
                      title="点击重命名此词书"
                    />
                    <p className="text-[11px] text-[#9A9587] mt-1">已由 AI 完美生成，可点击上方文字直接重命名您的新词书</p>
                  </div>
                  <button
                    onClick={handleSaveAIDeck}
                    className="bg-[#7D8471] hover:bg-[#6A705F] text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>确认导入词库</span>
                  </button>
                </div>

                {/* Table preview */}
                <div className="overflow-x-auto border border-[#E8E4D9] rounded-xl bg-white max-h-[300px] overflow-y-auto">
                  <table className="w-full text-left text-xs text-[#3D3D3D] border-collapse">
                    <thead className="bg-[#F1EFE9] text-[#4A4F41] font-bold sticky top-0 uppercase border-b border-[#E8E4D9]">
                      <tr>
                        <th className="p-3">单词汉字 / 原型</th>
                        <th className="p-3">假名读音</th>
                        <th className="p-3">中文释义</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {aiPreviewWords.map((word) => (
                        <tr key={word.id} className="hover:bg-[#F9F8F4]/40">
                          <td className="p-3 font-serif font-semibold text-[#4A4F41] text-sm">{word.kanji}</td>
                          <td className="p-3 font-mono text-[#7D8471]">{word.kana}</td>
                          <td className="p-3 text-[#3D3D3D]">{word.meaning}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* USER'S CUSTOM DECKS LIST */}
      <div className="mt-10" id="imported-decks-section">
        <h3 className="font-serif text-lg font-bold text-[#4A4F41] mb-4">我导入的自定义词库</h3>
        {customGroups.length === 0 ? (
          <div className="bg-[#FDFCF9] rounded-2xl border-2 border-dashed border-[#E8E4D9] p-8 text-center text-[#9A9587]">
            <BookOpen className="w-8 h-8 mx-auto mb-2 stroke-[1.5]" />
            <p className="text-sm font-semibold text-[#4A4F41]">尚未导入任何自定义词库</p>
            <p className="text-xs mt-1">请通过上方的手动输入或 AI 生成，创建专属于您的复习词汇书吧！</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customGroups.map((group) => (
              <div
                key={group.id}
                className="bg-white p-5 rounded-2xl border border-[#E8E4D9] hover:border-[#7D8471] transition-all flex justify-between gap-4 items-start shadow-sm"
              >
                <div>
                  <h4 className="font-serif text-md font-bold text-[#4A4F41] flex items-center gap-1.5">
                    {group.name}
                    <span className="text-[10px] font-sans font-normal px-2.5 py-0.5 rounded-full bg-[#7D8471]/10 border border-[#7D8471]/20 text-[#7D8471]">
                      {group.words.length} 词
                    </span>
                  </h4>
                  <p className="text-xs text-[#9A9587] mt-1.5 line-clamp-2 leading-relaxed">
                    {group.description}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (confirm(`确认要删除词书「${group.name}」吗？`)) {
                      onDeleteGroup(group.id);
                    }
                  }}
                  className="p-1.5 rounded-lg text-[#9A9587] hover:text-[#A68A73] hover:bg-[#A68A73]/10 transition-all cursor-pointer"
                  title="删除此词书"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
