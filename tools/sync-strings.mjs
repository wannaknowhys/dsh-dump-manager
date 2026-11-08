// Generate the browser half's copy of the string table from lib/strings.js.
// The client file is a plain script loaded by `window.__ModuleLoader__`, so it
// cannot import the module; this script rewrites the marked block in place.
import { readFileSync, writeFileSync } from 'node:fs';
import { STRINGS } from '../lib/strings.js';

const path = new URL('../lib/client.js', import.meta.url);
const text = readFileSync(path, 'utf8');

const begin = '    // >>> STRINGS (generated from lib/strings.js by tools/sync-strings.mjs) >>>';
const end = '    // <<< STRINGS <<<';
const from = text.indexOf(begin);
const to = text.indexOf(end);
if (from < 0 || to < begin) {
  console.error('markers not found in client.js');
  process.exit(2);
}

const json = JSON.stringify(STRINGS, null, 2)
  .split('\n')
  .map((line) => '    ' + line)
  .join('\n');

const block = `${begin}\n    const STRINGS = ${json};\n${end}`;
writeFileSync(path, text.slice(0, from) + block + text.slice(to + end.length), 'utf8');
console.log(`synced ${Object.keys(STRINGS.en).length} en / ${Object.keys(STRINGS.zh).length} zh keys`);
