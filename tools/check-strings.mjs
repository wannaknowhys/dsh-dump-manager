// Assert the two copies of the string table agree and both languages are complete.
import { readFileSync } from 'node:fs';
import { STRINGS } from '../lib/strings.js';

const failures = [];
const check = (label, condition, detail) => {
  if (!condition) failures.push(`${label}${detail ? ': ' + detail : ''}`);
  console.log(`${condition ? 'ok  ' : 'FAIL'} ${label}`);
};

const en = Object.keys(STRINGS.en).sort();
const zh = Object.keys(STRINGS.zh).sort();
check('en and zh carry the same keys', JSON.stringify(en) === JSON.stringify(zh), JSON.stringify({
  onlyEn: en.filter((key) => !(key in STRINGS.zh)),
  onlyZh: zh.filter((key) => !(key in STRINGS.en)),
}));
check('every key is filled in both languages', en.every((key) => STRINGS.en[key] && STRINGS.zh[key]));
check('key count', en.length > 0, String(en.length));

// The client copy is generated; a stale block means someone edited one side.
const path = new URL('../lib/client.js', import.meta.url);
const text = readFileSync(path, 'utf8');
const begin = '    // >>> STRINGS (generated from lib/strings.js by tools/sync-strings.mjs) >>>';
const end = '    // <<< STRINGS <<<';
const from = text.indexOf(begin);
const to = text.indexOf(end);
check('client copy exists', from >= 0 && to > from);

if (from >= 0 && to > from) {
  const expected = `${begin}\n    const STRINGS = ${JSON.stringify(STRINGS, null, 2)
    .split('\n')
    .map((line) => '    ' + line)
    .join('\n')};\n${end}`;
  check('client copy is up to date (run tools/sync-strings.mjs)', text.slice(from, to + end.length) === expected);
}

console.log(failures.length === 0 ? '\nALL PASS' : `\n${failures.length} FAILURE(S)\n` + failures.join('\n'));
process.exitCode = failures.length === 0 ? 0 : 1;
