// ============================================
// Mock data for Buddhist texts
// ============================================

export interface BuddhistText {
  id: string;
  title: string;
  translator: string;
  volumes: number;
  canon: string;
  description: string;
}

export interface Category {
  id: string;
  label: string;
}

export interface RecentlyRead {
  id: string;
  title: string;
  lastReadAt: string; // ISO date string
  progress?: number; // 0-100
}

export const featuredTexts: BuddhistText[] = [
  {
    id: 'T0235',
    title: '金刚般若波罗蜜经',
    translator: '鸠摩罗什',
    volumes: 1,
    canon: 'T',
    description: '般若经典核心，阐述空性智慧',
  },
  {
    id: 'T0251',
    title: '般若波罗蜜多心经',
    translator: '玄奘',
    volumes: 1,
    canon: 'T',
    description: '般若心要，仅二百六十字',
  },
  {
    id: 'T0262',
    title: '妙法莲华经',
    translator: '鸠摩罗什',
    volumes: 7,
    canon: 'T',
    description: '大乘佛教最重要之经典',
  },
  {
    id: 'T0279',
    title: '佛说阿弥陀经',
    translator: '鸠摩罗什',
    volumes: 1,
    canon: 'T',
    description: '净土宗根本经典',
  },
  {
    id: 'T0237',
    title: '维摩诘所说经',
    translator: '鸠摩罗什',
    volumes: 3,
    canon: 'T',
    description: '阐述在家菩萨之修行',
  },
  {
    id: 'T0278',
    title: '大方广佛华严经',
    translator: '实叉难陀',
    volumes: 80,
    canon: 'T',
    description: '佛教重要经典，阐述法界缘起',
  },
];
