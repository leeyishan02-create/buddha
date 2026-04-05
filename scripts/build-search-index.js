#!/usr/bin/env node
/**
 * Build script: Downloads CBETA metadata from GitHub and generates a local search index.
 * 
 * Source: https://github.com/DILA-edu/cbeta-metadata/blob/master/textref/cbeta.csv
 * Output: lib/cbeta/search-index.json
 * 
 * This script runs during `npm run build` or can be run manually with `node scripts/build-search-index.js`
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const CSV_URL = 'https://raw.githubusercontent.com/DILA-edu/cbeta-metadata/master/textref/cbeta.csv';
const OUTPUT_PATH = path.join(__dirname, '..', 'lib', 'cbeta', 'search-index.json');

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',');
  const records = [];
  
  for (let i = 1; i < lines.length; i++) {
    // Handle quoted fields with commas
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    const record = {};
    headers.forEach((header, idx) => {
      record[header] = values[idx] || '';
    });
    records.push(record);
  }
  
  return records;
}

function generateSearchIndex(records) {
  // Filter to only Taisho Tripitaka (T-prefixed IDs) for v1.0
  const taishoTexts = records.filter(r => r.primary_id && r.primary_id.startsWith('T'));
  
  const searchIndex = taishoTexts.map(r => ({
    id: r.primary_id,
    title: r.title,
    dynasty: r.dynasty || '',
    author: r.author || '',
    edition: r.edition || '',
    searchableText: `${r.primary_id} ${r.title} ${r.dynasty} ${r.author} ${r.edition}`.toLowerCase(),
  }));
  
  return {
    generatedAt: new Date().toISOString(),
    totalTexts: searchIndex.length,
    texts: searchIndex,
  };
}

function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Follow redirect
        https.get(res.headers.location, resolve).on('error', reject);
        return;
      }
      
      if (res.statusCode !== 200) {
        reject(new Error(`Download failed with status ${res.statusCode}`));
        return;
      }
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function main() {
  console.log('📥 Downloading CBETA metadata from GitHub...');
  
  try {
    const csvText = await download(CSV_URL);
    console.log(`✅ Downloaded ${csvText.length} bytes`);
    
    console.log('📋 Parsing CSV...');
    const records = parseCSV(csvText);
    console.log(`✅ Parsed ${records.length} records`);
    
    console.log('🔍 Generating search index...');
    const index = generateSearchIndex(records);
    console.log(`✅ Generated index with ${index.totalTexts} Taisho texts`);
    
    // Ensure output directory exists
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    
    // Write search index
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(index, null, 2), 'utf8');
    console.log(`✅ Search index written to ${OUTPUT_PATH}`);
    
    // Show sample
    console.log('\n📝 Sample entries:');
    index.texts.slice(0, 5).forEach(t => {
      console.log(`  ${t.id}: ${t.title} (${t.author || '無作者'})`);
    });
    
  } catch (error) {
    console.error('❌ Failed to build search index:', error.message);
    console.log('\n⚠️  Using fallback mock data...');
    
    // Fallback: create a minimal index with our known texts
    const fallbackIndex = {
      generatedAt: new Date().toISOString(),
      totalTexts: 6,
      texts: [
        { id: 'T0235', title: '金剛般若波羅蜜經', dynasty: '後秦', author: '鳩摩羅什', edition: '大正藏', searchableText: 't0235 金剛般若波羅蜜經 後秦 鳩摩羅什 大正藏' },
        { id: 'T0251', title: '般若波羅蜜多心經', dynasty: '唐', author: '玄奘', edition: '大正藏', searchableText: 't0251 般若波羅蜜多心經 唐 玄奘 大正藏' },
        { id: 'T0262', title: '妙法蓮華經', dynasty: '後秦', author: '鳩摩羅什', edition: '大正藏', searchableText: 't0262 妙法蓮華經 後秦 鳩摩羅什 大正藏' },
        { id: 'T0279', title: '佛說阿彌陀經', dynasty: '後秦', author: '鳩摩羅什', edition: '大正藏', searchableText: 't0279 佛說阿彌陀經 後秦 鳩摩羅什 大正藏' },
        { id: 'T0237', title: '維摩詰所說經', dynasty: '後秦', author: '鳩摩羅什', edition: '大正藏', searchableText: 't0237 維摩詰所說經 後秦 鳩摩羅什 大正藏' },
        { id: 'T0278', title: '大方廣佛華嚴經', dynasty: '唐', author: '實叉難陀', edition: '大正藏', searchableText: 't0278 大方廣佛華嚴經 唐 實叉難陀 大正藏' },
      ],
    };
    
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(fallbackIndex, null, 2), 'utf8');
    console.log('✅ Fallback search index created');
  }
}

main();
