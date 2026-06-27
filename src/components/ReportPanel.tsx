/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Calendar, Award, Clock, Percent, AlertCircle, ArrowLeft, Download, FileText, ChevronRight, BarChart3, HelpCircle } from 'lucide-react';
import { HistoryRecord } from '../types';

interface ReportPanelProps {
  historyRecords: HistoryRecord[];
  onClearHistory: () => void;
  // If the user just completed a test, we can automatically display that record
  justCompletedRecord: HistoryRecord | null;
  onCloseDetail: () => void;
  onRetest: (deckId: string) => void;
}

export default function ReportPanel({
  historyRecords,
  onClearHistory,
  justCompletedRecord,
  onCloseDetail,
  onRetest,
}: ReportPanelProps) {
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(
    justCompletedRecord ? justCompletedRecord.id : null
  );

  const selectedRecord = historyRecords.find((r) => r.id === selectedRecordId) || justCompletedRecord;

  // Format milliseconds to M分S秒
  const formatTimeSpent = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins > 0) {
      return `${mins}分${secs}秒`;
    }
    return `${secs}秒`;
  };

  // Calculate global aggregate statistics
  const totalSessions = historyRecords.length;
  const totalWordsPracticed = historyRecords.reduce((sum, r) => sum + r.totalWords, 0);
  const avgAccuracy = totalSessions > 0
    ? Math.round(historyRecords.reduce((sum, r) => sum + r.accuracy, 0) / totalSessions)
    : 0;
  const totalTimeMs = historyRecords.reduce((sum, r) => sum + r.timeSpentMs, 0);

  // Compile a global list of most forgotten words across all historical sessions
  const getGlobalForgottenWords = () => {
    const wordMap: { [key: string]: { kanji: string; kana: string; meaning: string; totalFails: number } } = {};
    
    historyRecords.forEach((record) => {
      record.forgottenRankList.forEach((word) => {
        if (word.totalFails > 0) {
          const key = `${word.kanji}_${word.kana}`;
          if (!wordMap[key]) {
            wordMap[key] = {
              kanji: word.kanji,
              kana: word.kana,
              meaning: word.meaning,
              totalFails: 0,
            };
          }
          wordMap[key].totalFails += word.totalFails;
        }
      });
    });

    return Object.values(wordMap).sort((a, b) => b.totalFails - a.totalFails).slice(0, 10);
  };

  const globalForgottenWords = getGlobalForgottenWords();

  // Export Record to CSV
  const handleExportCSV = (record: HistoryRecord) => {
    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF'; // Add UTF-8 BOM
    csvContent += '汉字/词汇,假名读音,中文释义,总错误/遗忘次数\n';

    record.forgottenRankList.forEach((word) => {
      // Escape commas
      const kanji = `"${word.kanji.replace(/"/g, '""')}"`;
      const kana = `"${word.kana.replace(/"/g, '""')}"`;
      const meaning = `"${word.meaning.replace(/"/g, '""')}"`;
      csvContent += `${kanji},${kana},${meaning},${word.totalFails}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `日语背诵结算表_${record.groupName.replace(/\s+/g, '_')}_${record.date.replace(/[/:\s]/g, '')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Record to Markdown Study Sheet
  const handleExportMarkdown = (record: HistoryRecord) => {
    let mdContent = `# 日语背诵检测学习报告\n\n`;
    mdContent += `**词组名称**: ${record.groupName}\n`;
    mdContent += `**背诵日期**: ${record.date}\n`;
    mdContent += `**单词总数**: ${record.totalWords} 词\n`;
    mdContent += `**首次拼写正确率**: ${record.accuracy}%\n`;
    mdContent += `**学习总用时**: ${formatTimeSpent(record.timeSpentMs)}\n`;
    mdContent += `**高频错词**: ${record.mostForgottenWord} (错误/遗忘 ${record.mostForgottenCount} 次)\n\n`;
    mdContent += `## 单词背诵详情清单\n\n`;
    mdContent += `| 序号 | 单词汉字/原型 | 假名读音 | 中文释义 | 错误次数 |\n`;
    mdContent += `| --- | --- | --- | --- | --- |\n`;

    record.forgottenRankList.forEach((word, index) => {
      mdContent += `| ${index + 1} | ${word.kanji} | ${word.kana} | ${word.meaning} | ${word.totalFails} |\n`;
    });

    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `日语背诵报告_${record.groupName.replace(/\s+/g, '_')}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // SINGLE RECORD VIEW (DETAILED REPORT)
  if (selectedRecord) {
    const mostForgottenList = selectedRecord.forgottenRankList.filter((w) => w.totalFails > 0);
    const perfectCount = selectedRecord.totalWords - mostForgottenList.length;

    return (
      <div className="max-w-4xl mx-auto px-4 py-6" id="session-report-detail">
        <button
          onClick={() => {
            setSelectedRecordId(null);
            onCloseDetail();
          }}
          className="mb-6 flex items-center gap-1.5 text-xs text-[#9A9587] hover:text-[#4A4F41] transition-all font-medium cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>返回学习报告首页</span>
        </button>

        {/* Dynamic Study Certificate layout */}
        <div className="bg-white border border-[#E8E4D9] rounded-3xl overflow-hidden shadow-md mb-8">
          {/* Certificate header bar */}
          <div className="bg-[#4A4F41] text-[#FDFCF9] p-6 text-center relative border-b-4 border-[#353A2F]">
            <span className="text-[10px] uppercase tracking-widest font-bold text-[#A68A73] block mb-1">
              STUDY COMPLETION REPORT
            </span>
            <h3 className="font-serif text-2xl font-bold tracking-wide">日本語単語帳 · 结课报告</h3>
            <div className="absolute right-4 top-4 hidden sm:block">
              <Award className="w-12 h-12 text-white/10" />
            </div>
          </div>

          <div className="p-6 md:p-8">
            <div className="text-center max-w-lg mx-auto mb-8">
              <p className="text-[#9A9587] text-xs">背诵时间：{selectedRecord.date}</p>
              <h4 className="font-serif text-xl font-bold text-[#4A4F41] mt-2">
                恭喜您，已完成「{selectedRecord.groupName}」背诵检测！
              </h4>
              <p className="text-[#9A9587] text-xs mt-2 leading-relaxed">
                所有单词均已拼写通过，并达到 100% 掌握状态。下表是您本次检测中各维度的详尽学习行为 analysis。
              </p>
            </div>

            {/* Score Grid Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-[#FDFCF9]/60 p-4 rounded-xl border border-[#E8E4D9] text-center flex flex-col justify-center">
                <div className="w-8 h-8 rounded-full bg-[#F1EFE9] text-[#7D8471] flex items-center justify-center mx-auto mb-2">
                  <Calendar className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-semibold text-[#9A9587]">单词数量</span>
                <strong className="text-[#4A4F41] text-lg mt-1 font-serif">{selectedRecord.totalWords} 词</strong>
              </div>

              <div className="bg-[#FDFCF9]/60 p-4 rounded-xl border border-[#E8E4D9] text-center flex flex-col justify-center">
                <div className="w-8 h-8 rounded-full bg-[#F1EFE9] text-[#7D8471] flex items-center justify-center mx-auto mb-2">
                  <Percent className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-semibold text-[#9A9587]">第一遍正确率</span>
                <strong className={`text-lg mt-1 font-serif ${
                  selectedRecord.accuracy >= 80 ? 'text-[#7D8471]' : 'text-[#A68A73]'
                }`}>{selectedRecord.accuracy}%</strong>
              </div>

              <div className="bg-[#FDFCF9]/60 p-4 rounded-xl border border-[#E8E4D9] text-center flex flex-col justify-center">
                <div className="w-8 h-8 rounded-full bg-[#F1EFE9] text-[#A68A73] flex items-center justify-center mx-auto mb-2">
                  <Clock className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-semibold text-[#9A9587]">本次耗时</span>
                <strong className="text-[#4A4F41] text-md mt-1.5 font-mono">{formatTimeSpent(selectedRecord.timeSpentMs)}</strong>
              </div>

              <div className="bg-[#FDFCF9]/60 p-4 rounded-xl border border-[#E8E4D9] text-center flex flex-col justify-center">
                <div className="w-8 h-8 rounded-full bg-[#F1EFE9] text-[#A68A73] flex items-center justify-center mx-auto mb-2">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-semibold text-[#9A9587]">最难攻克单词</span>
                <strong className="text-[#4A4F41] text-sm mt-2 line-clamp-1 font-serif" title={selectedRecord.mostForgottenWord}>
                  {selectedRecord.mostForgottenWord}
                </strong>
              </div>
            </div>

            {/* Actions for current record */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between border-b border-[#E8E4D9] pb-6 mb-6">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleExportCSV(selectedRecord)}
                  className="bg-[#FDFCF9] hover:bg-[#F1EFE9] text-[#7D8471] border border-[#E8E4D9] px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>导出 CSV 结算表</span>
                </button>
                <button
                  onClick={() => handleExportMarkdown(selectedRecord)}
                  className="bg-[#FDFCF9] hover:bg-[#F1EFE9] text-[#7D8471] border border-[#E8E4D9] px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>导出 Markdown 复习表</span>
                </button>
              </div>

              <button
                onClick={() => onRetest(selectedRecord.groupId)}
                className="w-full sm:w-auto bg-[#7D8471] hover:bg-[#6A705F] text-white px-5 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer"
              >
                再次挑战此词库
              </button>
            </div>

            {/* Word details table */}
            <div>
              <h4 className="font-serif text-md font-bold text-[#4A4F41] mb-4 flex items-center gap-2">
                <BarChart3 className="w-4.5 h-4.5 text-[#7D8471]" />
                词汇检测报告详情清单
              </h4>

              <div className="overflow-x-auto border border-[#E8E4D9] rounded-xl bg-white">
                <table className="w-full text-left text-xs text-[#3D3D3D] border-collapse">
                  <thead className="bg-[#F1EFE9] text-[#4A4F41] font-bold uppercase border-b border-[#E8E4D9]">
                    <tr>
                      <th className="p-3">词汇 / 假名</th>
                      <th className="p-3">中文释义</th>
                      <th className="p-3 text-center">首次拼写情况</th>
                      <th className="p-3 text-right">错误/遗忘次数</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {selectedRecord.forgottenRankList.map((word, idx) => (
                      <tr key={idx} className="hover:bg-[#F9F8F4]/40">
                        <td className="p-3">
                          <span className="font-serif font-bold text-[#4A4F41] text-sm block">
                            {word.kanji}
                          </span>
                          {word.kana && word.kana !== word.kanji && (
                            <span className="text-[10px] text-[#9A9587] font-mono">
                              {word.kana}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-[#3D3D3D] font-sans">{word.meaning}</td>
                        <td className="p-3 text-center">
                          {word.totalFails === 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#7D8471]/10 text-[#7D8471] border border-[#7D8471]/20">
                              一次通过
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#A68A73]/10 text-[#A68A73] border border-[#A68A73]/20">
                              循环纠正
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-[#4A4F41]">
                          {word.totalFails > 0 ? (
                            <span className="text-[#A68A73] bg-[#A68A73]/5 px-1.5 py-0.5 rounded">
                              {word.totalFails} 次
                            </span>
                          ) : (
                            <span className="text-stone-300">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // GENERAL STATISTICS & LISTS VIEW
  return (
    <div className="max-w-4xl mx-auto px-4 py-6" id="history-reports-dashboard">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl font-bold text-[#4A4F41]">学习统计与历史报告</h2>
          <p className="text-[#9A9587] text-xs mt-1">
            追踪您的日语背诵历史会话，发现您的拼写弱项，快速形成针对性错词本。
          </p>
        </div>

        {historyRecords.length > 0 && (
          <button
            onClick={() => {
              if (confirm('确定要清除所有学习历史记录吗？此操作无法撤销。')) {
                onClearHistory();
              }
            }}
            className="text-xs text-[#9A9587] hover:text-[#4A4F41] border border-[#E8E4D9] hover:border-[#9A9587] px-3 py-1.5 rounded-lg transition-all self-start cursor-pointer"
          >
            清除所有记录
          </button>
        )}
      </div>

      {historyRecords.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8E4D9] p-12 text-center shadow-sm">
          <BarChart3 className="w-10 h-10 text-[#9A9587] mx-auto mb-3 stroke-[1.5]" />
          <h4 className="font-serif text-md font-semibold text-[#4A4F41]">暂无学习历史记录</h4>
          <p className="text-xs text-[#9A9587] mt-2 max-w-sm mx-auto leading-relaxed">
            您还没有完整的背诵测试历史。请前往「检测背诵」挑选一本词书进行一次练习，完成后此页面将生成您完整的研究报告。
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Dashboard Summary Widgets */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-[#E8E4D9] shadow-sm">
              <span className="text-[10px] font-semibold text-[#9A9587] uppercase tracking-wider block">累计会话</span>
              <strong className="text-[#4A4F41] text-2xl font-serif mt-1 block">{totalSessions} 次</strong>
              <span className="text-[10px] text-[#9A9587] mt-1 block">已完结词书测试数</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E8E4D9] shadow-sm">
              <span className="text-[10px] font-semibold text-[#9A9587] uppercase tracking-wider block">累计背诵</span>
              <strong className="text-[#4A4F41] text-2xl font-serif mt-1 block">{totalWordsPracticed} 词</strong>
              <span className="text-[10px] text-[#9A9587] mt-1 block">总循环测试词汇总合</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E8E4D9] shadow-sm">
              <span className="text-[10px] font-semibold text-[#9A9587] uppercase tracking-wider block">平均拼写正确率</span>
              <strong className="text-[#7D8471] text-2xl font-serif mt-1 block">{avgAccuracy}%</strong>
              <span className="text-[10px] text-[#9A9587] mt-1 block">首次成功拼写平均率</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E8E4D9] shadow-sm">
              <span className="text-[10px] font-semibold text-[#9A9587] uppercase tracking-wider block">学习总耗时</span>
              <strong className="text-[#4A4F41] text-xl font-mono mt-2 block">{formatTimeSpent(totalTimeMs)}</strong>
              <span className="text-[10px] text-[#9A9587] mt-1 block">专注学习总时间</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Global Forgotten Words List (Weaknesses) */}
            <div className="lg:col-span-2 bg-[#FDFCF9]/80 p-5 rounded-2xl border border-[#E8E4D9]">
              <h3 className="font-serif text-sm font-bold text-[#4A4F41] mb-3 flex items-center justify-between">
                <span>我的高频错词榜 (TOP 10)</span>
                <span className="text-[10px] text-[#A68A73] bg-[#A68A73]/10 px-2 py-0.5 rounded-full font-sans">错词纠本</span>
              </h3>

              {globalForgottenWords.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#9A9587]">
                  <p>太棒了！您的拼写完美率高，</p>
                  <p className="mt-0.5">尚未产生任何高频遗忘单词。</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {globalForgottenWords.map((word, index) => (
                    <div
                      key={index}
                      className="p-2.5 bg-white rounded-xl border border-[#E8E4D9] shadow-sm text-xs flex justify-between items-center"
                    >
                      <div>
                        <div className="font-serif font-bold text-[#4A4F41] text-sm">
                          {word.kanji}
                          {word.kana && word.kana !== word.kanji && (
                            <span className="font-sans font-normal text-[10px] text-[#7D8471] ml-1.5 bg-[#F1EFE9] px-1 py-0.5 rounded">
                              {word.kana}
                            </span>
                          )}
                        </div>
                        <p className="text-[#9A9587] mt-0.5 truncate max-w-[150px]">{word.meaning}</p>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-[#9A9587] block">累计错漏</span>
                        <strong className="text-xs text-[#A68A73] font-mono">{word.totalFails} 次</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sessions History List */}
            <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-[#E8E4D9] shadow-sm flex flex-col">
              <h3 className="font-serif text-sm font-bold text-[#4A4F41] mb-3">历史测试记录清单</h3>

              <div className="flex-1 space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {historyRecords.map((record) => (
                  <div
                    key={record.id}
                    onClick={() => setSelectedRecordId(record.id)}
                    className="p-3.5 rounded-xl border border-stone-200 hover:border-[#7D8471] hover:bg-[#F9F8F4]/50 cursor-pointer transition-all flex items-center justify-between text-xs gap-3 group"
                  >
                    <div>
                      <h4 className="font-serif font-bold text-[#4A4F41] group-hover:text-[#7D8471] transition-colors text-sm">
                        {record.groupName}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[#9A9587] mt-1 text-[11px]">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {record.date}
                        </span>
                        <span>·</span>
                        <span>{record.totalWords} 词</span>
                        <span>·</span>
                        <span className="font-mono">{formatTimeSpent(record.timeSpentMs)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] text-[#9A9587] block">首次正确率</span>
                        <strong className={`font-mono ${
                          record.accuracy >= 80 ? 'text-[#7D8471]' : 'text-[#A68A73]'
                        }`}>{record.accuracy}%</strong>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#9A9587] group-hover:text-[#7D8471] transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
