/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Word {
  id: string;
  kanji: string;    // e.g. "綺麗"
  kana: string;     // e.g. "きれい"
  meaning: string;  // e.g. "漂亮"
  raw: string;      // Raw text line used to parse it
}

export interface WordGroup {
  id: string;
  name: string;
  description: string;
  words: Word[];
  isCustom: boolean;
}

export interface WordStat {
  wordId: string;
  kanji: string;
  kana: string;
  meaning: string;
  incorrectCount: number;
  forgottenCount: number;
  firstTryResult: 'correct' | 'incorrect' | 'forgotten' | null;
  isFinished: boolean; // Has the user eventually successfully typed this correct in this session?
}

export interface StudySession {
  groupId: string;
  groupName: string;
  totalWordsCount: number;
  startTime: number; // epoch timestamp
  endTime?: number;
  stats: { [wordId: string]: WordStat };
}

export interface HistoryRecord {
  id: string;
  groupId: string;
  groupName: string;
  date: string;
  totalWords: number;
  accuracy: number; // overall % of correct on first try
  timeSpentMs: number;
  mostForgottenWord: string;
  mostForgottenCount: number;
  forgottenRankList: Array<{
    kanji: string;
    kana: string;
    meaning: string;
    totalFails: number;
  }>;
}
