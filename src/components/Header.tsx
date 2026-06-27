/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BookOpen, Award, History, PlusCircle, Volume2 } from 'lucide-react';

interface HeaderProps {
  activeTab: 'library' | 'test' | 'history' | 'import';
  setActiveTab: (tab: 'library' | 'test' | 'history' | 'import') => void;
  wordCount: number;
  sessionCount: number;
  isTesting: boolean;
  onExitTest: () => void;
}

export default function Header({
  activeTab,
  setActiveTab,
  wordCount,
  sessionCount,
  isTesting,
  onExitTest,
}: HeaderProps) {
  const handleTabChange = (tab: 'library' | 'test' | 'history' | 'import') => {
    if (isTesting && tab !== 'test') {
      if (confirm('当前正在背诵测试中，离开将不保存本次学习记录。确定要离开吗？')) {
        onExitTest();
        setActiveTab(tab);
      }
    } else {
      setActiveTab(tab);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E8E4D9] bg-[#FDFCF9]/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#7D8471]/15 border border-[#7D8471]/30 flex items-center justify-center text-[#7D8471]">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-serif text-xl font-bold text-[#4A4F41] tracking-wide flex items-center gap-1.5">
              日本語単語帳
              <span className="text-xs font-sans px-2 py-0.5 rounded-full bg-[#F1EFE9] text-[#7D8471] font-bold">
                背诵检测版
              </span>
            </h1>
            <p className="text-xs text-[#9A9587] font-sans">
              智能循环复习 · 极简和风设计 · 学习统计报表
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-[#F1EFE9]/80 p-1 rounded-xl border border-[#E8E4D9]">
          <button
            onClick={() => handleTabChange('library')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === 'library'
                ? 'bg-white text-[#7D8471] shadow-sm font-semibold'
                : 'text-[#9A9587] hover:text-[#4A4F41] hover:bg-white/40'
            }`}
          >
            <BookOpen className="w-4 h-4 text-[#7D8471]" />
            <span>词库</span>
          </button>

          <button
            onClick={() => handleTabChange('test')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative ${
              activeTab === 'test'
                ? 'bg-white text-[#A68A73] shadow-sm font-semibold'
                : 'text-[#9A9587] hover:text-[#4A4F41] hover:bg-white/40'
            }`}
          >
            <Award className="w-4 h-4 text-[#A68A73]" />
            <span>检测背诵</span>
            {isTesting && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#A68A73] rounded-full animate-pulse" />
            )}
          </button>

          <button
            onClick={() => handleTabChange('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === 'history'
                ? 'bg-white text-[#4A4F41] shadow-sm font-semibold'
                : 'text-[#9A9587] hover:text-[#4A4F41] hover:bg-white/40'
            }`}
          >
            <History className="w-4 h-4 text-[#7D8471]" />
            <span>学习报告</span>
          </button>

          <button
            onClick={() => handleTabChange('import')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === 'import'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-[#9A9587] hover:text-[#4A4F41] hover:bg-white/40'
            }`}
          >
            <PlusCircle className="w-4 h-4 text-[#A68A73]" />
            <span>导入单词</span>
          </button>
        </nav>

        {/* Quick Stats Summary */}
        <div className="hidden lg:flex items-center gap-5 text-xs text-[#9A9587] font-mono">
          <div className="bg-[#F1EFE9]/60 rounded-lg px-3 py-1.5 border border-[#E8E4D9] flex items-center gap-1.5">
            <span className="text-[#9A9587]">词库总数</span>
            <strong className="text-[#4A4F41] font-semibold">{wordCount}</strong>
          </div>
          <div className="bg-[#F1EFE9]/60 rounded-lg px-3 py-1.5 border border-[#E8E4D9] flex items-center gap-1.5">
            <span className="text-[#9A9587]">已完结会话</span>
            <strong className="text-[#4A4F41] font-semibold">{sessionCount}</strong>
          </div>
        </div>
      </div>
    </header>
  );
}
