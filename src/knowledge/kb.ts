import fs from 'fs';
import path from 'path';

export interface KBEntry {
  id?: string;
  product?: string;
  patterns?: string[];
  answer?: string;
  response?: string; // fallback
  pattern?: string; // fallback
}

export function defaultKBPath(cwd: string = process.cwd()): string {
  return path.join(cwd, 'data', 'kb.json');
}

export function loadKBFromFile(filePath: string): KBEntry[] {
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? (parsed as KBEntry[]) : [];
  } catch {
    return [];
  }
}

export function retrieveKB(query: string | undefined, entries: KBEntry[]): string[] {
  const matches: string[] = [];
  if (!query) return [];

  const lowerQuery = query.toLowerCase();

  for (const entry of entries) {
    let entryPatterns: string[] = [];

    if (Array.isArray(entry.patterns)) {
      entryPatterns = entry.patterns;
    } else if (typeof entry.pattern === 'string') {
      entryPatterns = [entry.pattern];
    }

    for (const pattern of entryPatterns) {
      const patternLower = pattern.toLowerCase();
      let isMatch = false;

      const hasRegexChars = /[.*+?^${}()|[\]\\]/.test(patternLower);

      if (hasRegexChars) {
        try {
          const regex = new RegExp(patternLower, 'i');
          isMatch = regex.test(lowerQuery);
        } catch {
          const simplified = patternLower.replace(/[.*+?^${}()|[\]\\]/g, '');
          isMatch = simplified ? lowerQuery.includes(simplified) : false;
        }
      } else {
        isMatch = lowerQuery.includes(patternLower);
      }

      if (isMatch) {
        const response = entry.answer || entry.response || '';
        if (response) {
          matches.push(response);
        }
        break;
      }
    }
  }

  return matches;
}
