/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy load Gemini Client to handle missing key gracefully on startup
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined. Please configure it in the Secrets panel.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// 1. API: Generate Words using Gemini
app.post('/api/generate-words', async (req, res) => {
  const { topic, count = 12 } = req.body;

  if (!topic || typeof topic !== 'string') {
    return res.status(400).json({ error: '请提供词汇主题（Topic）' });
  }

  try {
    const ai = getGeminiClient();
    const prompt = `Generate exactly ${count} high-quality, practical Japanese vocabulary words related to the topic: "${topic}".
    The words should be suitable for learners. Include the kanji, the hiragana/katakana reading (kana), and the clear Chinese translation (meaning).
    If a word doesn't have a Kanji form (like loanwords or native kana words, e.g., 'カメラ' or 'ありがとう'), use the kana representation in both the "kanji" and "kana" fields.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are an elite, professional Japanese language instructor. You generate clear, accurate vocabulary lists with Kanji, Kana readings, and accurate Chinese translations.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              kanji: {
                type: Type.STRING,
                description: "The Kanji representation of the word (e.g., '綺麗' or '食べる'). If no kanji, use kana.",
              },
              kana: {
                type: Type.STRING,
                description: "The Hiragana or Katakana reading of the word (e.g., 'きれい' or 'たべる').",
              },
              meaning: {
                type: Type.STRING,
                description: "The accurate Chinese meaning/translation of the word (e.g., '漂亮' or '吃').",
              },
            },
            required: ['kanji', 'kana', 'meaning'],
          },
        },
      },
    });

    const jsonText = response.text?.trim() || '[]';
    const words = JSON.parse(jsonText);
    
    // Add IDs on the server
    const wordsWithIds = words.map((w: any, idx: number) => ({
      id: `ai_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
      kanji: w.kanji || '',
      kana: w.kana || '',
      meaning: w.meaning || '',
      raw: `${w.kanji}（${w.kana}） ${w.meaning}`,
    }));

    res.json({ success: true, words: wordsWithIds });
  } catch (error: any) {
    console.error('Gemini word generation error:', error);
    res.status(500).json({
      error: error.message || '生成单词失败，请检查 API 配置或重试。',
    });
  }
});

// 2. Vite Integration for Frontend
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

startServer();
