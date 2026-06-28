/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Word } from '../types';

/**
 * Utility to parse raw text input into structured Word objects.
 * Supports various formats:
 * - 綺麗（きれい）　漂亮 (Japanese full-width parentheses & spaces)
 * - 綺麗(きれい) 漂亮 (Half-width parentheses & spaces)
 * - 美味しい [おいしい] 好吃 (Brackets)
 * - 先生/せんせい/老师 (Slashes)
 * - 食べる - たべる - 吃 (Hyphens)
 * - 勉強 学习 (No kana, just Kanji and Meaning)
 * - ありがとう 谢谢 (Kana-only and Meaning)
 */
export function parseWordList(text: string): Word[] {
  if (!text) return [];

  const lines = text.split('\n');
  const parsedWords: Word[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // Normalization: replace multiple whitespace characters (including IDEographic spaces) with a single space
    const line = rawLine
      .replace(/[\u3000\t]+/g, ' ') // Replace full-width space and tabs with single space
      .trim();

    let kanji = '';
    let kana = '';
    let meaning = '';

    // 1. Try to find bracket matches: e.g. 綺麗（きれい） or 綺麗(きれい) or 綺麗[きれい] or 綺麗【きれい】
    const bracketRegex = /([^\s(（[【]+)[(（[【]([^)）\]】]+)[)）\]】](.*)/;
    const bracketMatch = line.match(bracketRegex);

    if (bracketMatch) {
      kanji = bracketMatch[1].trim();
      kana = bracketMatch[2].trim();
      // Meaning is the remainder, strip leading colons, hyphens, slashes, or spaces
      meaning = bracketMatch[3].trim().replace(/^[:：\-\s/]+/, '').trim();
    } else {
      // 2. Try splitting by common delimiters: slash (/), hyphen (-), colon (:) or space
      let parts: string[] = [];
      if (line.includes('/')) {
        parts = line.split('/').map(p => p.trim());
      } else if (line.includes(' - ')) {
        parts = line.split(' - ').map(p => p.trim());
      } else if (line.includes('：')) {
        parts = line.split('：').map(p => p.trim());
      } else if (line.includes(':')) {
        parts = line.split(':').map(p => p.trim());
      } else {
        // Split by whitespace
        parts = line.split(/\s+/).map(p => p.trim());
      }

      // Filter out empty parts
      parts = parts.filter(p => p !== '');

      if (parts.length >= 3) {
        kanji = parts[0];
        kana = parts[1];
        meaning = parts.slice(2).join(' ');
      } else if (parts.length === 2) {
        const firstPart = parts[0];
        meaning = parts[1];

        // If the first part is pure hiragana/katakana, set both kanji and kana to it
        const isPureKana = /^[\u3040-\u309F\u30A0-\u30FF\uFF66-\uFF9F]+$/.test(firstPart);
        if (isPureKana) {
          kanji = firstPart;
          kana = firstPart;
        } else {
          kanji = firstPart;
          kana = ''; // will fallback to kanji during check or remain blank
        }
      } else if (parts.length === 1) {
        // Just one part, treat as kanji and meaning is unknown
        kanji = parts[0];
        kana = '';
        meaning = '（未提供释义）';
      }
    }

    // Clean up
    if (kanji) {
      parsedWords.push({
        id: `word_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 5)}`,
        kanji: kanji,
        kana: kana || kanji, // fallback to kanji if kana is empty
        meaning: meaning || '（无释义）',
        raw: rawLine
      });
    }
  }

  return parsedWords;
}

/**
 * Checks if a user's answer is correct for a given word.
 * It is correct if it exactly matches:
 * 1. The Kanji (e.g. "綺麗")
 * 2. The Kana (e.g. "きれい")
 * 3. The combined full string representation (e.g. "綺麗（きれい）" or "綺麗きれい")
 */
export function checkAnswer(word: Word, userAnswer: string): boolean {
  const answer = userAnswer.trim().toLowerCase();
  if (!answer) return false;

  const targetKanji = word.kanji.toLowerCase();
  const targetKana = word.kana.toLowerCase();
  
  // Normalization for matching: remove brackets and spaces
  const cleanAnswer = answer.replace(/[\s(（)）[\]【】]/g, '');
  const cleanCombined1 = (targetKanji + targetKana).replace(/[\s(（)）[\]【】]/g, '');
  const cleanCombined2 = (targetKana + targetKanji).replace(/[\s(（)）[\]【】]/g, '');

  return (
    answer === targetKanji ||
    answer === targetKana ||
    cleanAnswer === cleanCombined1 ||
    cleanAnswer === cleanCombined2 ||
    // Partial kana support if brackets were typed
    answer === `${targetKanji}(${targetKana})` ||
    answer === `${targetKanji}（${targetKana}）`
  );
}
