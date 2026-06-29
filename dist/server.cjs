var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json());
var aiClient = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined. Please configure it in the Secrets panel.");
    }
    aiClient = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
app.post("/api/generate-words", async (req, res) => {
  const { topic, count = 12 } = req.body;
  if (!topic || typeof topic !== "string") {
    return res.status(400).json({ error: "\u8BF7\u63D0\u4F9B\u8BCD\u6C47\u4E3B\u9898\uFF08Topic\uFF09" });
  }
  try {
    const ai = getGeminiClient();
    const prompt = `Generate exactly ${count} high-quality, practical Japanese vocabulary words related to the topic: "${topic}".
    The words should be suitable for learners. Include the kanji, the hiragana/katakana reading (kana), and the clear Chinese translation (meaning).
    If a word doesn't have a Kanji form (like loanwords or native kana words, e.g., '\u30AB\u30E1\u30E9' or '\u3042\u308A\u304C\u3068\u3046'), use the kana representation in both the "kanji" and "kana" fields.`;
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an elite, professional Japanese language instructor. You generate clear, accurate vocabulary lists with Kanji, Kana readings, and accurate Chinese translations.",
        responseMimeType: "application/json",
        responseSchema: {
          type: import_genai.Type.ARRAY,
          items: {
            type: import_genai.Type.OBJECT,
            properties: {
              kanji: {
                type: import_genai.Type.STRING,
                description: "The Kanji representation of the word (e.g., '\u7DBA\u9E97' or '\u98DF\u3079\u308B'). If no kanji, use kana."
              },
              kana: {
                type: import_genai.Type.STRING,
                description: "The Hiragana or Katakana reading of the word (e.g., '\u304D\u308C\u3044' or '\u305F\u3079\u308B')."
              },
              meaning: {
                type: import_genai.Type.STRING,
                description: "The accurate Chinese meaning/translation of the word (e.g., '\u6F02\u4EAE' or '\u5403')."
              }
            },
            required: ["kanji", "kana", "meaning"]
          }
        }
      }
    });
    const jsonText = response.text?.trim() || "[]";
    const words = JSON.parse(jsonText);
    const wordsWithIds = words.map((w, idx) => ({
      id: `ai_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
      kanji: w.kanji || "",
      kana: w.kana || "",
      meaning: w.meaning || "",
      raw: `${w.kanji}\uFF08${w.kana}\uFF09 ${w.meaning}`
    }));
    res.json({ success: true, words: wordsWithIds });
  } catch (error) {
    console.error("Gemini word generation error:", error);
    res.status(500).json({
      error: error.message || "\u751F\u6210\u5355\u8BCD\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5 API \u914D\u7F6E\u6216\u91CD\u8BD5\u3002"
    });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
  });
}
startServer();
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
//# sourceMappingURL=server.cjs.map
