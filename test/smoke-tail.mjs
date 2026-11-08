// Offline test for the tail entry: the reply to the newest request is read
// from responses.jsonl, flagged, and exported with the "recorded from the
// response stream" note — the one reply no request snapshot can hold.
//
//   node test/smoke-tail.mjs
//
// Runs on synthetic dumps in a throwaway DSH_HOME; no live server involved.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const home = mkdtempSync(join(tmpdir(), 'dsh-tail-'));
process.env.DSH_HOME = home;
const dumps = join(home, 'dumps');
mkdirSync(join(home, 'llm-dumps'), { recursive: true });
writeFileSync(join(home, 'llm-dumps', 'config.json'), JSON.stringify({ outputDir: dumps }));

const failures = [];
function check(label, actual, expected) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) failures.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  console.log(`${pass ? 'ok  ' : 'FAIL'} ${label}${pass ? '' : ` (${JSON.stringify(actual)})`}`);
}

function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') {
    return (
      '{' +
      Object.keys(value)
        .sort()
        .map((key) => JSON.stringify(key) + ':' + canonical(value[key]))
        .join(',') +
      '}'
    );
  }
  return JSON.stringify(value);
}
const hash = (value) => createHash('sha1').update(canonical(value), 'utf8').digest('hex');

/** Write one folded session directory the way dsh-llm-dump lays it out. */
function writeSession(id, snapshots) {
  const dir = join(dumps, id);
  mkdirSync(dir, { recursive: true });
  const objects = new Map();
  const lines = [];
  let previous = [];
  snapshots.forEach((messages, index) => {
    const hashes = messages.map((message) => {
      const key = hash(message);
      objects.set(key, message);
      return key;
    });
    let prefixLen = 0;
    while (prefixLen < Math.min(previous.length, hashes.length) && previous[prefixLen] === hashes[prefixLen]) {
      prefixLen += 1;
    }
    lines.push(
      JSON.stringify({
        at: new Date(Date.now() - (snapshots.length - index) * 1000).toISOString(),
        seq: index + 1,
        sessionId: id,
        provider: 'p',
        model: 'm',
        messageCount: messages.length,
        toolCount: 0,
        prefixLen,
        suffix: hashes.slice(prefixLen),
        tools: null,
        top: {},
        sha1: hash({ index }),
      }),
    );
    previous = hashes;
  });
  writeFileSync(
    join(dir, 'objects.jsonl'),
    [...objects].map(([key, value]) => JSON.stringify({ h: key, v: value })).join('\n') + '\n',
  );
  writeFileSync(join(dir, 'requests.jsonl'), lines.join('\n') + '\n');
}

function writeResponses(id, rows) {
  writeFileSync(join(dumps, id, 'responses.jsonl'), rows.map((row) => JSON.stringify(row)).join('\n') + '\n');
}

const system = { role: 'system', content: [{ type: 'text', text: 'sys' }], id: 'sys' };
const user = (text, id) => ({ role: 'user', content: [{ type: 'text', text }], id, source: { kind: 'user' } });
const assistant = (id, blocks) => ({ role: 'assistant', content: blocks, id, source: { kind: 'model' } });

// --- session A: a plain turn whose reply only exists in the response file ---
const u1 = user('first question', 'u1');
const a1 = assistant('a1', [{ type: 'text', text: 'first answer' }]);
const u2 = user('second question', 'u2');
writeSession('simple', [
  [system, u1],
  [system, u1, a1, u2],
]);
writeResponses('simple', [
  { seq: 1, blocks: [{ type: 'text', text: 'first answer' }], reason: { kind: 'stop' }, interrupted: false },
  {
    seq: 2,
    request: 'sha',
    at: new Date().toISOString(),
    ms: 12,
    reason: { kind: 'stop' },
    usage: { inputTokens: 1, outputTokens: 2 },
    blocks: [{ type: 'text', text: 'second answer' }],
    interrupted: false,
  },
]);

// --- session B: the newest stream was cut short ---------------------------
writeSession('interrupted', [[system, user('q', 'b1')]]);
writeResponses('interrupted', [
  { seq: 1, blocks: [{ type: 'text', text: 'partial' }], reason: null, interrupted: true },
]);

const mod = await import('../lib/index.js');
const routes = new Map();
mod.apply({
  webServer: {
    register(route) {
      routes.set(route.path, route);
      return () => {};
    },
  },
  effect(fn) {
    fn();
  },
});

async function call(path, { method = 'GET', url, body } = {}) {
  const route = routes.get(path);
  if (!route) throw new Error('no route ' + path);
  const req = {
    method,
    url,
    socket: { remoteAddress: '127.0.0.1' },
    async *[Symbol.asyncIterator]() {
      if (body !== undefined) yield Buffer.from(JSON.stringify(body), 'utf8');
    },
  };
  let status = 0;
  let payload = '';
  const res = {
    writeHead(value) {
      status = value;
    },
    end(value) {
      payload = value;
    },
  };
  await route.handler(req, res);
  return { status, body: payload ? JSON.parse(payload) : null };
}

const read = (path) => readFileSync(path, 'utf8');

const stream = await call('/api/dsh-dumps/stream', { url: '/api/dsh-dumps/stream?id=simple' });
check('stream status', stream.status, 200);
check(
  'entry types',
  stream.body.entries.map((entry) => entry.type),
  ['system', 'user', 'assistant', 'user', 'assistant'],
);
check('only the newest reply is flagged', stream.body.entries.map((entry) => entry.tail === true), [
  false,
  false,
  false,
  false,
  true,
]);
check('tail summary', stream.body.entries[4].summary, 'second answer');

const detail = await call('/api/dsh-dumps/entry', { url: '/api/dsh-dumps/entry?id=simple&i=4' });
check('tail detail blocks', detail.body.entry.content.content.map((block) => block.type), ['text']);

const all = stream.body.entries.map((entry) => entry.index);
const zh = await call('/api/dsh-dumps/export', {
  method: 'POST',
  url: '/api/dsh-dumps/export',
  body: { kind: 'transcript', id: 'simple', entries: all, lang: 'zh' },
});
check('export status', zh.status, 200);
const zhText = read(zh.body.files[0]);
check('export contains the newest reply', zhText.includes('second answer'), true);
check('export explains the tail (zh)', zhText.includes('记录自响应流'), true);

const en = await call('/api/dsh-dumps/export', {
  method: 'POST',
  url: '/api/dsh-dumps/export',
  body: { kind: 'transcript', id: 'simple', entries: all, lang: 'en' },
});
check('export explains the tail (en)', read(en.body.files[0]).includes('Recorded from the response stream'), true);

const cut = await call('/api/dsh-dumps/stream', { url: '/api/dsh-dumps/stream?id=interrupted' });
check('interrupted tail flagged', cut.body.entries.at(-1).interrupted, true);
const cutExport = await call('/api/dsh-dumps/export', {
  method: 'POST',
  url: '/api/dsh-dumps/export',
  body: { kind: 'transcript', id: 'interrupted', entries: cut.body.entries.map((entry) => entry.index), lang: 'zh' },
});
check('interrupted export names the abnormal end', read(cutExport.body.files[0]).includes('流未正常结束'), true);

if (existsSync(join(home, 'exports')) === false) failures.push('exports folder was not created');

if (failures.length === 0) rmSync(home, { recursive: true, force: true });
else console.error('kept ' + home);

console.log(failures.length === 0 ? '\nALL PASS' : `\n${failures.length} FAILURE(S)\n` + failures.join('\n'));
process.exitCode = failures.length === 0 ? 0 : 1;
