/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WordGroup } from '../types';
import { parseWordList } from '../utils/wordParser';

const n5AdjectivesText = `綺麗（きれい） 漂亮、干净
美味しい（おいしい） 好吃、美味
高い（たかい） 高的、贵的
寒い（さむい） 寒冷的（天气）
暑い（あつい） 炎热的（天气）
忙しい（いそがしい） 忙碌的
面白い（おもしろい） 有趣的、滑稽的
易しい（やさしい） 易懂的、简单的
新しい（あたらしい） 新的
静か（しずか） 安静的、幽静的`;

const travelEssentialsText = `ありがとう 谢谢
すみません 不好意思、对不起
いくら 多少钱
トイレ 洗手间、厕所
これ 这个
駅（えき） 车站
ホテル 酒店、旅馆
切符（きっぷ） 车票、门票
どこ 哪里
日本語（にほんご） 日语`;

const dailyVerbsText = `食べる（たべる） 吃
飲む（のむ） 喝
行く（いく） 去
来る（くる） 来
見る（みる） 看、观赏
話す（はなす） 说、说话、交谈
買う（かう） 买、购买
書く（かく） 写、书写
起きる（おきる） 起床、发生
寝る（ねる） 睡觉`;

export const DEFAULT_DECKS: WordGroup[] = [
  {
    id: 'n5_adjectives',
    name: 'N5 基础形容词',
    description: '掌握最常用的日语基础形容词，包括「い」形容词和「な」形容词。',
    words: parseWordList(n5AdjectivesText),
    isCustom: false,
  },
  {
    id: 'travel_essentials',
    name: '日本旅行实用词汇',
    description: '去日本旅游时最常用的高频词汇与短语，帮助你轻松点餐与问路。',
    words: parseWordList(travelEssentialsText),
    isCustom: false,
  },
  {
    id: 'daily_verbs',
    name: '日常生活核心动词',
    description: '涵盖吃、喝、行、看等最高频的日语基础动词，打下牢固语法根基。',
    words: parseWordList(dailyVerbsText),
    isCustom: false,
  },
];
