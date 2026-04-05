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
    title: '金剛般若波羅蜜經',
    translator: '鳩摩羅什',
    volumes: 1,
    canon: 'T',
    description: '般若經典核心，闡述空性智慧',
  },
  {
    id: 'T0251',
    title: '般若波羅蜜多心經',
    translator: '玄奘',
    volumes: 1,
    canon: 'T',
    description: '般若心要，僅二百六十字',
  },
  {
    id: 'T0262',
    title: '妙法蓮華經',
    translator: '鳩摩羅什',
    volumes: 7,
    canon: 'T',
    description: '大乘佛教最重要之經典',
  },
  {
    id: 'T0279',
    title: '佛說阿彌陀經',
    translator: '鳩摩羅什',
    volumes: 1,
    canon: 'T',
    description: '淨土宗根本經典',
  },
  {
    id: 'T0237',
    title: '維摩詰所說經',
    translator: '鳩摩羅什',
    volumes: 3,
    canon: 'T',
    description: '闡述在家菩薩之修行',
  },
  {
    id: 'T0278',
    title: '大方廣佛華嚴經',
    translator: '實叉難陀',
    volumes: 80,
    canon: 'T',
    description: '佛教重要經典，闡述法界緣起',
  },
];
