// Offline check for /api/dsh-dumps/latest: synthetic sessions in a throwaway
// DSH_HOME, then the real host module's routes. No live server involved.
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const home = mkdtempSync(join(tmpdir(), 'dsh-latest-'));
process.env.DSH_HOME = home;
const dumps = join(home, 'dumps');
mkdirSync(join(home, 'llm-dumps'), { recursive: true });
writeFileSync(
  join(home, 'llm-dumps', 'config.json'),
  JSON.stringify({ outputDir: dumps, fold: true }),
);

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

function writeSession(id, requests) {
  const dir = join(dumps, id);
  mkdirSync(dir, { recursive: true });
  const objects = new Map();
  let previous = [];
  const lines = [];
  requests.forEach((messages, index) => {
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
        at: new Date(Date.now() - (requests.length - index) * 1000).toISOString(),
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
  writeFileSync(
    join(dumps, id, 'responses.jsonl'),
    rows.map((row) => JSON.stringify(row)).join('\n') + '\n',
  );
}

const system = { role: 'system', content: [{ type: 'text', text: 'sys' }], id: 'sys' };
const user = (text, id) => ({ role: 'user', content: [{ type: 'text', text }], id, source: { kind: 'user' } });
const injected = (text, kind, id) => ({ role: 'user', content: [{ type: 'text', text }], id, source: { kind } });
const assistant = (id, blocks) => ({ role: 'assistant', content: blocks, id, source: { kind: 'model' } });
const tool = (id, text) => ({ role: 'tool', content: [{ type: 'text', text }], id });
const checkpoint = (id, text) => ({
  role: 'user',
  content: [{ type: 'text', text }],
  id,
  source: { kind: 'compact-checkpoint', form: 'snapshot' },
});

// --- session A: plain turn with an injected message after the prompt -------
const u1 = user('first question', 'u1');
const a1 = assistant('a1', [{ type: 'text', text: 'first answer' }]);
const u2 = user('second question', 'u2');
const t2 = injected('Time sampled while preparing turn 2', 'time-context', 'time2');
const a2 = assistant('a2', [{ type: 'text', text: 'second answer' }]);
writeSession('simple', [
  [system, u1],
  [system, u1, a1, u2, t2],
]);
writeResponses('simple', [
  { seq: 2, blocks: [{ type: 'text', text: 'second answer' }], reason: { kind: 'stop' }, interrupted: false },
]);

// --- session B: turn split by a compaction --------------------------------
const b1 = user('long task', 'b1');
const bA = assistant('bA', [{ type: 'text', text: 'working' }]);
const bT = tool('bT', 'tool output');
const bKeep = assistant('bKeep', [{ type: 'text', text: 'kept verbatim' }]);
const bCkpt = checkpoint('ck1', 'This is a checkpoint');
writeSession('merged', [
  [system, b1, bA, bT],
  [system, bCkpt, bKeep, assistant('bNew', [{ type: 'text', text: 'after compaction' }])],
]);
writeResponses('merged', [
  { seq: 1, blocks: [{ type: 'text', text: 'working' }] },
  { seq: 2, blocks: [{ type: 'text', text: 'final after compaction' }] },
]);

// --- session C: boundary without a checkpoint header ----------------------
writeSession('forked', [
  [system, user('q', 'c1')],
  [system, assistant('c2', [{ type: 'text', text: 'rewritten history' }])],
]);

// --- session D: no human message at all -----------------------------------
writeSession('no-user', [
  [system, injected('Agent X sent a message', 'agent-message', 'd1')],
  [system, assistant('d2', [{ type: 'text', text: 'reply to agent' }])],
]);

// --- session E: a turn whose only output is a tool call --------------------
writeSession('tool-only', [
  [system, user('run it', 'e1')],
  [system, user('run it', 'e1'), assistant('e2', [{ type: 'tool-call', id: 'c1', name: 'x', arguments: '{}' }]), tool('e3', 'out')],
]);

// ------------------------------------------------------------------ routes

const mod = await import('../lib/index.js');
const routes = new Map();
mod.apply({
  webServer: { register(route) { routes.set(route.path, route); return () => {}; } },
  effect(fn) { fn(); },
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
  const res = { writeHead(value) { status = value; }, end(value) { payload = value; } };
  await route.handler(req, res);
  return { status, body: payload ? JSON.parse(payload) : null };
}

const latest = (id, lang = 'en') => call('/api/dsh-dumps/latest', { method: 'POST', url: '/api/dsh-dumps/latest', body: { id, lang } });
const read = (path) => readFileSync(path, 'utf8');
const setPrefs = (patch) =>
  call('/api/dsh-dumps/prefs', { method: 'POST', url: '/api/dsh-dumps/prefs', body: { export: patch } });

// default prefs: user input on, tools on, injected off
const simple = await latest('simple');
check('simple: status', simple.status, 200);
const simpleMd = read(simple.body.file);
check('simple: starts at the last prompt', simpleMd.includes('### User\n\nsecond question'), true);
check('simple: keeps the tail reply', simpleMd.includes('### Assistant\n\nsecond answer'), true);
check('simple: drops the earlier turn', simpleMd.includes('first question'), false);
check('simple: drops injected by default', simpleMd.includes('Time sampled'), false);
check('simple: no compaction banner', simple.body.joinedCompaction, false);

const injectedOn = await setPrefs({ includeInjected: true });
check('prefs: write returns merged value', injectedOn.body.prefs.export.includeInjected, true);
check('prefs: other keys survive the merge', injectedOn.body.prefs.export.includeTools, true);
const simpleInjected = await latest('simple');
const simpleInjectedMd = read(simpleInjected.body.file);
check('simple: injected included when enabled', simpleInjectedMd.includes('### Context · time-context'), true);

// back to defaults before the remaining cases
const reset = await setPrefs({ includeInjected: false, includeUserInput: true, includeTools: true, format: 'md' });
check('prefs: reset to defaults', JSON.stringify(reset.body.prefs.export), JSON.stringify({
  includeUserInput: true,
  includeTools: true,
  includeInjected: false,
  format: 'md',
}));

const merged = await latest('merged');
check('merged: status', merged.status, 200);
check('merged: joined flag', merged.body.joinedCompaction, true);
const mergedMd = read(merged.body.file);
check('merged: compaction banner', mergedMd.includes('joined automatically'), true);
check('merged: kept the pre-compaction prompt', mergedMd.includes('### User\n\nlong task'), true);
check('merged: kept the pre-compaction tool', mergedMd.includes('### Tool result\n\ntool output'), true);
check('merged: dropped the checkpoint', mergedMd.includes('This is a checkpoint'), false);
check('merged: has the post-compaction reply', mergedMd.includes('after compaction'), true);
check('merged: has the tail reply', mergedMd.includes('final after compaction'), true);
check('merged: retained message not duplicated', mergedMd.split('kept verbatim').length - 1, 1);

const forked = await latest('forked');
check('forked: refused', forked.status, 409);
check('forked: code', forked.body.code, 'FORK');

const noUser = await latest('no-user');
check('no-user: refused', noUser.status, 409);
check('no-user: code', noUser.body.code, 'NO_USER');

const missing = await latest('does-not-exist');
check('missing: 404', missing.status, 404);

// everything filtered out is a settings mistake, not an empty file
await setPrefs({ includeUserInput: false, includeTools: false, includeInjected: false, format: 'md' });
const empty = await latest('tool-only');
check('empty: refused', empty.status, 409);
check('empty: code', empty.body.code, 'EMPTY');
await setPrefs({ includeUserInput: true, includeTools: true, includeInjected: false });

// user input off: only the prompt line disappears, the rest stays
await setPrefs({ includeUserInput: false, includeTools: true, includeInjected: false });
const noPrompt = await latest('simple');
const noPromptMd = read(noPrompt.body.file);
check('no-prompt: prompt removed', noPromptMd.includes('second question'), false);
check('no-prompt: assistant kept', noPromptMd.includes('second answer'), true);
check('no-prompt: no User heading', noPromptMd.includes('### User'), false);

// tools off: tool blocks/results disappear
const toolTurn = await latest('merged');
await setPrefs({ includeUserInput: true, includeTools: false });
const noTools = await latest('merged');
const noToolsMd = read(noTools.body.file);
check('no-tools: tool result removed', noToolsMd.includes('tool output'), false);
check('no-tools: assistant text kept', noToolsMd.includes('working'), true);
check('no-tools: baseline had the tool', read(toolTurn.body.file).includes('tool output'), true);

// Every heading must carry a body: a message whose blocks were all filtered
// out must not leave an empty section behind.
const headingsWithoutBody = noToolsMd.split('\n').reduce((count, line, index, all) => {
  if (!line.startsWith('### ')) return count;
  const next = all.slice(index + 1).find((candidate) => candidate.trim() !== '' && !candidate.startsWith('### '));
  return next === undefined ? count + 1 : count;
}, 0);
check('no-tools: no empty sections', headingsWithoutBody, 0);

// json format
await setPrefs({ format: 'json', includeUserInput: true, includeTools: true, includeInjected: false });
const json = await latest('simple');
const parsed = JSON.parse(read(json.body.file));
check('json: extension', json.body.file.endsWith('.json'), true);
check('json: turn fields', [parsed.requestSeq, parsed.joinedCompaction, parsed.messages.length], [2, false, 2]);
check('json: keeps source', parsed.messages[0].source.kind, 'user');
check('json: tail appended', parsed.messages[1].content[0].text, 'second answer');

// language of the exported text
await setPrefs({ format: 'md' });
const zh = await latest('simple', 'zh');
check('zh: localized heading', read(zh.body.file).includes('### 助手'), true);
const en = await latest('simple', 'en');
check('en: localized heading', read(en.body.file).includes('### Assistant'), true);

// capture config: read-modify-write keeps unknown keys, rejects an empty path
const capturePath = join(home, 'llm-dumps', 'config.json');
writeFileSync(
  capturePath,
  JSON.stringify({ outputDir: dumps, fold: true, legacyKey: 42 }, null, 2),
);
const captureGet = await call('/api/dsh-dumps/capture', { url: '/api/dsh-dumps/capture' });
check('capture: read', captureGet.body.capture.outputDir, dumps);
const nextDir = join(home, 'dumps-next');
const capturePost = await call('/api/dsh-dumps/capture', {
  method: 'POST',
  url: '/api/dsh-dumps/capture',
  body: { outputDir: nextDir },
});
check('capture: outputDir updated', capturePost.body.capture.outputDir, nextDir);
check('capture: fold is gone', capturePost.body.capture.fold, undefined);
const captureRaw = JSON.parse(readFileSync(capturePath, 'utf8'));
check('capture: unknown key preserved', captureRaw.legacyKey, 42);
const captureBad = await call('/api/dsh-dumps/capture', {
  method: 'POST',
  url: '/api/dsh-dumps/capture',
  body: { outputDir: '   ' },
});
check('capture: empty path rejected', captureBad.status, 400);

// directory roots for the in-app picker
const roots = await call('/api/dsh-dumps/roots', { url: '/api/dsh-dumps/roots' });
check('roots: status', roots.status, 200);
check('roots: platform', typeof roots.body.platform, 'string');
check('roots: at least one', roots.body.roots.length > 0, true);
check('roots: home is a string', typeof roots.body.home, 'string');

console.log(failures.length === 0 ? '\nALL PASS' : `\n${failures.length} FAILURE(S)\n` + failures.join('\n'));
process.exitCode = failures.length === 0 ? 0 : 1;
