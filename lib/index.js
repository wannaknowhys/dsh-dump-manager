// dsh-dump-manager (host) — entry-stream model over captured LLM dumps.
//
// A session's requests are snapshots of one growing conversation. The viewer
// shows the *entries* (system, tools, message, tool result) instead of the
// snapshots: each entry appears once, in order. Where a request rewrites history
// (compaction, rebuild) the stream breaks into segments; the UI renders a tab
// per segment.
//
// Routes (loopback only):
//   GET  /api/dsh-dumps/overview          -> sessions, dumps size, exports size
//   GET  /api/dsh-dumps/stream?id=        -> segments + entry summaries
//   GET  /api/dsh-dumps/entry?id=&i=      -> one entry's full content
//   POST /api/dsh-dumps/export            -> { kind: 'transcript'|'payload', id, entries: [i] }
//   POST /api/dsh-dumps/reveal            -> open a folder in Explorer
//   POST /api/dsh-dumps/delete            -> remove one session directory

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeLang, t } from './strings.js';

// --- writer/reader format compatibility -----------------------------------
//
// dsh-llm-dump advertises the data format it writes as `dsh.formatVersion` in
// its package.json: an integer, kept independent of the package's semver, so a
// UI-only release does not look like a format change. This reader checks it at
// startup and on every overview request, and never refuses to read: a newer
// writer is a warning, because most of the format is still understood.

export const SUPPORTED_FORMAT = { min: 1, max: 1 };

/**
 * Compare an advertised format version with what this build reads.
 * `null` means dsh-llm-dump is not installed, so there is nothing to compare.
 */
export function checkCompatibility(found, supported = SUPPORTED_FORMAT) {
  const range = { ...supported };
  if (found === null || !Number.isInteger(found) || found < 1) {
    return { ok: true, code: 'ABSENT', found: null, supported: range };
  }
  if (found > range.max) return { ok: false, code: 'NEWER', found, supported: range };
  if (found < range.min) return { ok: false, code: 'OLDER', found, supported: range };
  return { ok: true, code: 'OK', found, supported: range };
}

const SELF_ROOT = fileURLToPath(new URL('..', import.meta.url));

function sameFile(a, b) {
  try {
    return realpathSync(a) === realpathSync(b);
  } catch {
    return false;
  }
}

/**
 * Every place a `dsh-llm-dump` package.json may live, most specific first.
 *
 * `import.meta.url` is already resolved to the real package path (a `link:`
 * install is a symlink), so resolving from here does not see the profile's
 * node_modules. Scan the profiles instead, preferring the one whose
 * `dsh-dump-manager` entry is this very package.
 */
function llmDumpPackageCandidates() {
  const candidates = [];
  if (process.env.DSH_LLM_DUMP_PACKAGE) candidates.push(process.env.DSH_LLM_DUMP_PACKAGE);
  const home = process.env.DSH_HOME || join(homedir(), '.dsh');
  const profiles = join(home, 'profiles');
  const scanned = [];
  try {
    for (const entry of readdirSync(profiles, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const profile = join(profiles, entry.name);
      scanned.push({
        file: join(profile, 'node_modules', 'dsh-llm-dump', 'package.json'),
        own: sameFile(join(profile, 'node_modules', 'dsh-dump-manager'), SELF_ROOT),
      });
    }
  } catch {
    /* no profiles directory: a flat install is handled below */
  }
  scanned.sort((a, b) => Number(b.own) - Number(a.own));
  for (const item of scanned) candidates.push(item.file);
  candidates.push(join(home, 'node_modules', 'dsh-llm-dump', 'package.json'));
  return candidates;
}

function formatOf(file) {
  const pkg = JSON.parse(readFileSync(file, 'utf8'));
  const value = pkg?.dsh?.formatVersion;
  // The field only exists since the format did; an older writer is format 1.
  return Number.isInteger(value) ? value : 1;
}

/** The writer's declared format, or null when the package cannot be found. */
function readLlmDumpFormat() {
  try {
    const require = createRequire(import.meta.url);
    return formatOf(require.resolve('dsh-llm-dump/package.json'));
  } catch {
    /* a link install resolves to the real path; fall through to the scan */
  }
  for (const file of llmDumpPackageCandidates()) {
    try {
      return formatOf(file);
    } catch {
      /* try the next candidate */
    }
  }
  return null;
}

function compatibilityNow() {
  return checkCompatibility(readLlmDumpFormat());
}

function warnIncompatible(ctx, compatibility) {
  const { found, supported, code } = compatibility;
  const message =
    code === 'NEWER'
      ? `dump-manager: dsh-llm-dump writes data format ${found}; this build reads up to ${supported.max}, so newer dumps may render incorrectly. Update dsh-dump-manager.`
      : `dump-manager: dsh-llm-dump writes data format ${found}; this build expects at least ${supported.min}. Update dsh-llm-dump.`;
  try {
    ctx.logger?.warn?.(message);
  } catch {
    /* a logger failure must not stop the plugin */
  }
}

const DSH_HOME = process.env.DSH_HOME || join(homedir(), '.dsh');
const CONFIG_PATH = join(DSH_HOME, 'llm-dumps', 'config.json');

function outputDir() {
  try {
    const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
    if (typeof config.outputDir === 'string' && config.outputDir.length > 0) return config.outputDir;
  } catch {
    /* fall through to the default */
  }
  return join(DSH_HOME, 'llm-dumps');
}

function exportsDir() {
  return join(dirname(outputDir()), 'exports');
}

// --- UI preferences (owned here; the capture config belongs to llm-dump) ---

const PREFS_PATH = join(DSH_HOME, 'llm-dumps', 'ui.json');

const DEFAULT_PREFS = {
  export: { includeUserInput: true, includeTools: true, includeInjected: false, format: 'md' },
};

function normalizePrefs(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const picked = source.export && typeof source.export === 'object' ? source.export : {};
  const bool = (value, fallback) => (typeof value === 'boolean' ? value : fallback);
  return {
    export: {
      includeUserInput: bool(picked.includeUserInput, true),
      includeTools: bool(picked.includeTools, true),
      includeInjected: bool(picked.includeInjected, false),
      format: picked.format === 'json' ? 'json' : 'md',
    },
  };
}

function readPrefs() {
  try {
    return normalizePrefs(JSON.parse(readFileSync(PREFS_PATH, 'utf8')));
  } catch {
    return normalizePrefs(DEFAULT_PREFS);
  }
}

function writePrefs(patch) {
  const current = readPrefs();
  const incoming = patch && typeof patch === 'object' ? patch : {};
  const next = normalizePrefs({
    ...current,
    ...incoming,
    export: { ...current.export, ...(incoming.export && typeof incoming.export === 'object' ? incoming.export : {}) },
  });
  mkdirSync(dirname(PREFS_PATH), { recursive: true });
  const temporary = PREFS_PATH + '.tmp';
  writeFileSync(temporary, JSON.stringify(next, null, 2) + '\n', 'utf8');
  renameSync(temporary, PREFS_PATH);
  return next;
}

// --- capture configuration (owned by llm-dump; edited from this page) ----

const CAPTURE_PATH = join(DSH_HOME, 'llm-dumps', 'config.json');
const DEFAULT_CAPTURE = { outputDir: join(DSH_HOME, 'llm-dumps') };

function readCapture() {
  let raw = {};
  try {
    const parsed = JSON.parse(readFileSync(CAPTURE_PATH, 'utf8'));
    if (parsed && typeof parsed === 'object') raw = parsed;
  } catch {
    raw = {};
  }
  return {
    raw,
    value: {
      outputDir:
        typeof raw.outputDir === 'string' && raw.outputDir.trim() !== ''
          ? raw.outputDir
          : DEFAULT_CAPTURE.outputDir,
    },
  };
}

/** Read-modify-write: unknown keys survive and the replacement is atomic. */
function writeCapture(patch) {
  const { raw } = readCapture();
  const next = { ...raw };
  if (patch && typeof patch === 'object' && patch.outputDir !== undefined) {
    const value = String(patch.outputDir).trim();
    if (value === '') throw new Error('outputDir must not be empty');
    if (value.length > 1024) throw new Error('outputDir is too long');
    next.outputDir = value;
  }
  mkdirSync(dirname(CAPTURE_PATH), { recursive: true });
  const temporary = CAPTURE_PATH + '.tmp';
  writeFileSync(temporary, JSON.stringify(next, null, 2) + '\n', 'utf8');
  renameSync(temporary, CAPTURE_PATH);
  return readCapture().value;
}

// --- drive roots for the in-app directory browser ------------------------

let rootsCache = { at: 0, durationMs: 0, value: null, refreshing: false };

function probeRoots() {
  const started = Date.now();
  const roots = [];
  if (process.platform === 'win32') {
    for (let code = 65; code <= 90; code += 1) {
      const name = String.fromCharCode(code);
      const path = name + ':\\';
      try {
        if (existsSync(path)) roots.push({ name: name + ':', path });
      } catch {
        /* a probe that throws is simply not a drive */
      }
    }
  } else {
    roots.push({ name: '/', path: '/' });
  }
  rootsCache = {
    at: Date.now(),
    durationMs: Date.now() - started,
    refreshing: false,
    value: { home: homedir(), roots, platform: process.platform },
  };
  return rootsCache;
}

/**
 * Cached roots. Cheap probes (≤100 ms) are re-run inline so the reply carries
 * fresh data; expensive ones refresh in the background once their own cost has
 * elapsed since the last probe, so a dead network drive never stalls a request.
 */
function rootsSnapshot() {
  if (rootsCache.value === null) return { ...probeRoots(), stale: false };
  const interval = Math.max(5000, rootsCache.durationMs);
  const stale = Date.now() - rootsCache.at >= interval;
  if (!stale) return { ...rootsCache, stale: false };
  if (rootsCache.durationMs <= 100) return { ...probeRoots(), stale: false };
  if (!rootsCache.refreshing) {
    rootsCache.refreshing = true;
    setImmediate(() => {
      try {
        probeRoots();
      } catch {
        rootsCache.refreshing = false;
      }
    });
  }
  return { ...rootsCache, stale: true };
}

/** Shares of one SMB server; `fs` cannot list a bare UNC root, `net view` can. */
function listShares(host) {
  return new Promise((resolve, reject) => {
    if (process.platform !== 'win32') {
      reject(new Error('share enumeration is only available on Windows'));
      return;
    }
    const child = spawn('cmd.exe', ['/d', '/s', '/c', `chcp 65001 >nul & net view \\\\${host}`], {
      windowsHide: true,
    });
    let output = '';
    let problems = '';
    const timer = setTimeout(() => {
      try {
        child.kill();
      } catch {
        /* already gone */
      }
      reject(new Error('share enumeration timed out'));
    }, 5000);
    child.stdout.on('data', (chunk) => {
      output += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk) => {
      problems += chunk.toString('utf8');
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error((problems || output).trim().split(/\r?\n/)[0] || `net view exited with ${code}`));
        return;
      }
      const shares = [];
      let afterHeader = false;
      for (const line of output.split(/\r?\n/)) {
        if (!afterHeader) {
          if (/^-{5,}/.test(line.trim())) afterHeader = true;
          continue;
        }
        // Share rows are "name  <two or more spaces>  type ..."; trailing status
        // lines use single spaces and are skipped.
        const match = /^(\S+)\s{2,}\S+/.exec(line);
        if (match) shares.push({ name: match[1], path: `\\\\${host}\\${match[1]}` });
      }
      resolve(shares);
    });
  });
}

/** One cache entry per server, so several hosts coexist without evicting each other. */
const sharesCache = new Map();
const SHARES_MIN_TTL = 30000;
const SHARES_MAX_HOSTS = 32;

function rememberShares(key, entry) {
  sharesCache.delete(key);
  sharesCache.set(key, entry);
  while (sharesCache.size > SHARES_MAX_HOSTS) {
    const oldest = sharesCache.keys().next().value;
    sharesCache.delete(oldest);
  }
}

/**
 * Shared-host snapshot: a first look enumerates, later looks answer from cache
 * and refresh in the background once the entry is older than its TTL — at least
 * 30 s, or four times its own enumeration cost, whichever is larger.
 */
async function sharesSnapshot(host) {
  const key = host.toLowerCase();
  const cached = sharesCache.get(key);
  if (cached === undefined) {
    const started = Date.now();
    const shares = await listShares(host);
    rememberShares(key, { at: Date.now(), durationMs: Date.now() - started, shares, refreshing: false });
    return { shares, cached: false, stale: false };
  }
  const stale = Date.now() - cached.at >= Math.max(SHARES_MIN_TTL, cached.durationMs * 4);
  if (stale && !cached.refreshing) {
    cached.refreshing = true;
    const started = Date.now();
    listShares(host)
      .then((shares) => {
        rememberShares(key, { at: Date.now(), durationMs: Date.now() - started, shares, refreshing: false });
      })
      .catch(() => {
        const current = sharesCache.get(key);
        if (current !== undefined) current.refreshing = false;
      });
  }
  return { shares: cached.shares, cached: true, stale };
}

function readLines(path) {
  try {
    const text = readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
    return text.split('\n').filter((line) => line.trim());
  } catch {
    return [];
  }
}

function sessionMeta(id) {
  try {
    const raw = readFileSync(
      join(DSH_HOME, 'storages', 'session_projcache', 'sessions', `${id}.json`),
      'utf8',
    );
    const record = JSON.parse(raw).record ?? {};
    const titleRef = record?.rows?.title;
    let title = '';
    if (typeof titleRef === 'string') {
      const match = /val=([\s\S]*)\}\s*$/.exec(titleRef);
      title = (match ? match[1] : titleRef).trim();
    } else if (titleRef && typeof titleRef === 'object' && typeof titleRef.val === 'string') {
      title = titleRef.val.trim();
    }
    return { title, workspace: record?.identity?.cwd ?? '' };
  } catch {
    return { title: '', workspace: '' };
  }
}

function exportsStats() {
  const dir = exportsDir();
  if (!existsSync(dir)) return { bytes: 0, files: 0 };
  let bytes = 0;
  let files = 0;
  for (const file of readdirSync(dir, { withFileTypes: true })) {
    if (!file.isFile()) continue;
    bytes += statSync(join(dir, file.name)).size;
    files += 1;
  }
  return { bytes, files };
}

function indexSessions(root) {
  const sessions = [];
  let total = 0;
  if (!existsSync(root)) return { total, sessions };
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('_')) continue;
    const dir = join(root, entry.name);
    let bytes = 0;
    let lastAt = 0;
    let requests = 0;
    for (const file of readdirSync(dir, { withFileTypes: true })) {
      if (!file.isFile()) continue;
      const stat = statSync(join(dir, file.name));
      bytes += stat.size;
      lastAt = Math.max(lastAt, stat.mtimeMs);
      if (file.name === 'requests.jsonl') requests = readLines(join(dir, file.name)).length;
    }
    const meta = sessionMeta(entry.name);
    sessions.push({
      id: entry.name,
      title: meta.title,
      workspace: meta.workspace,
      bytes,
      requests,
      lastAt: lastAt > 0 ? new Date(lastAt).toISOString() : null,
    });
    total += bytes;
  }
  sessions.sort((a, b) => b.bytes - a.bytes);
  return { total, sessions };
}

function expandTop(top, objects) {
  const out = {};
  for (const [key, value] of Object.entries(top ?? {})) {
    if (value && typeof value === 'object' && typeof value.$dshRef === 'string') {
      out[key] = objects.get(value.$dshRef);
    } else {
      out[key] = value;
    }
  }
  return out;
}

/** Replay one session's folded dump into complete request snapshots. */
function loadRequests(root, id) {
  const dir = join(root, id);
  const objects = new Map();
  for (const line of readLines(join(dir, 'objects.jsonl'))) {
    try {
      const row = JSON.parse(line);
      objects.set(row.h, row.v);
    } catch {
      /* skip a corrupt line */
    }
  }
  const requests = [];
  let messages = [];
  for (const line of readLines(join(dir, 'requests.jsonl'))) {
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }
    const suffix = (row.suffix ?? []).map((hash) => objects.get(hash) ?? null);
    messages = messages.slice(0, row.prefixLen).concat(suffix);
    requests.push({
      seq: row.seq,
      at: row.at,
      model: row.model,
      provider: row.provider,
      prefixLen: row.prefixLen,
      messages,
      tools: row.tools ? objects.get(row.tools) : undefined,
      top: expandTop(row.top, objects),
    });
  }
  return requests;
}

/** Responses recorded from the wire, keyed by the request seq they answer. */
function loadResponses(root, id) {
  const rows = [];
  for (const line of readLines(join(root, id, 'responses.jsonl'))) {
    try {
      const row = JSON.parse(line);
      if (Number.isInteger(row?.seq)) rows.push(row);
    } catch {
      /* skip a corrupt line */
    }
  }
  return rows;
}

function textOf(block) {
  if (!block || typeof block !== 'object') return '';
  if (block.type === 'text') return block.text ?? '';
  if (block.type === 'reasoning') return block.text ?? '';
  if (block.type === 'tool-call') {
    const args = typeof block.arguments === 'string' ? block.arguments : JSON.stringify(block.arguments ?? {});
    return `→ ${block.name}(${args})`;
  }
  if (block.type === 'image') {
    const attachment = block.attachment ?? {};
    return `[image ${attachment.name ?? attachment.mediaType ?? ''} ${attachment.width ?? '?'}×${attachment.height ?? '?'}]`;
  }
  return '';
}

function messageBlocks(message) {
  return (message?.content ?? []).filter((block) => block && typeof block === 'object');
}

function preview(text, limit = 160) {
  const flat = String(text ?? '').replace(/\s+/g, ' ').trim();
  return flat.length > limit ? flat.slice(0, limit) + '…' : flat;
}

function entrySummary(type, message, tools) {
  if (type === 'tools') return `Tools · ${Array.isArray(tools) ? tools.length : 0} definitions`;
  if (type === 'system') {
    const chars = messageBlocks(message).map(textOf).join('\n').length;
    return `System prompt · ${chars.toLocaleString()} chars`;
  }
  const blocks = messageBlocks(message).filter((block) => block.type !== 'reasoning');
  const text = blocks.map(textOf).join(' ');
  if (!text.trim()) return type === 'tool' ? '(empty tool result)' : '(empty)';
  return preview(text);
}

/**
 * Build the entry stream of one session.
 *
 * Consecutive requests that only append messages form one segment; a request
 * whose prefix no longer matches the previous snapshot starts a new segment
 * (compaction or a rebuilt history). The first request of a segment contributes
 * its whole snapshot, later ones only the appended messages.
 */
function buildStream(root, id) {
  const requests = loadRequests(root, id);
  const segments = [];
  const entries = [];

  const push = (segment, entry) => {
    entries.push({ ...entry, index: entries.length, segment: segment.index });
    segment.entryCount += 1;
  };

  const pushMessage = (segment, message) => {
    const type =
      message.role === 'tool'
        ? 'tool'
        : message.role === 'assistant'
          ? 'assistant'
          : message.role === 'system'
            ? 'system'
            : 'user';
    push(segment, {
      type,
      key: `msg:${message.id ?? entries.length}`,
      summary: entrySummary(type, message),
      content: message,
    });
  };

  requests.forEach((request, position) => {
    const extendsPrevious =
      position > 0 && request.prefixLen === requests[position - 1].messages.length;
    let segment = segments[segments.length - 1];
    if (!extendsPrevious) {
      segment = {
        index: segments.length,
        fromSeq: request.seq,
        toSeq: request.seq,
        entryCount: 0,
        firstIndex: entries.length,
      };
      segments.push(segment);
    } else {
      segment.toSeq = request.seq;
    }

    const messages = request.messages;
    let start = extendsPrevious ? request.prefixLen : 0;

    if (!extendsPrevious) {
      if (messages[0]?.role === 'system') {
        push(segment, {
          type: 'system',
          key: `system:${messages[0].id ?? 0}`,
          summary: entrySummary('system', messages[0]),
          content: messages[0],
        });
        start = 1;
      }
      if (Array.isArray(request.tools)) {
        push(segment, {
          type: 'tools',
          key: `tools:${segment.index}`,
          summary: entrySummary('tools', null, request.tools),
          content: { tools: request.tools, toolHistory: request.top?.toolHistory },
        });
      }
    }

    for (let i = start; i < messages.length; i += 1) pushMessage(segment, messages[i]);
  });

  // The reply to the newest request is the one thing the request snapshots
  // cannot hold: it only exists as an answer until the next turn resends it.
  // Every older reply is already an entry above, so only this one is appended.
  const lastRequest = requests[requests.length - 1];
  if (lastRequest && Number.isInteger(lastRequest.seq)) {
    const response = loadResponses(root, id)
      .filter((row) => row.seq === lastRequest.seq)
      .pop();
    if (response) {
      const blocks = Array.isArray(response.blocks) ? response.blocks : [];
      const message = {
        role: 'assistant',
        content: blocks,
        source: {
          kind: 'model',
          provider: lastRequest.provider ?? null,
          model: lastRequest.model ?? null,
        },
      };
      const kind = response.reason?.kind ?? null;
      push(segments[segments.length - 1], {
        type: 'assistant',
        key: `resp:${lastRequest.seq}`,
        tail: true,
        interrupted: response.interrupted === true || kind === 'aborted' || kind === 'error',
        reason: response.reason ?? null,
        summary:
          blocks.length > 0
            ? entrySummary('assistant', message)
            : `(no content · ${kind ?? 'unknown'})`,
        content: message,
      });
    }
  }

  for (const entry of entries) entry.lastSeq = segments[entry.segment].toSeq;

  return {
    meta: sessionMeta(id),
    segments: segments.map((segment) => ({
      index: segment.index,
      fromSeq: segment.fromSeq,
      toSeq: segment.toSeq,
      entryCount: segment.entryCount,
    })),
    entries,
    requestCount: requests.length,
    requests,
  };
}

function wireEntry(entry) {
  return {
    index: entry.index,
    segment: entry.segment,
    type: entry.type,
    summary: entry.summary,
    lastSeq: entry.lastSeq,
    tail: entry.tail === true,
    interrupted: entry.interrupted === true,
  };
}

function tailNote(entry, lang) {
  if (entry.tail !== true) return '';
  const kind = entry.reason?.kind;
  const parts = [t(lang, 'md.tailNote')];
  if (entry.interrupted) parts.push(t(lang, 'md.tailInterrupted', { kind: kind ?? 'unknown' }));
  return '\n\n> ' + parts.join('; ');
}

function renderEntryMarkdown(entry, lang = 'en') {
  const content = entry.content;
  if (entry.type === 'system') {
    return `### ${t(lang, 'md.system')}\n\n${messageBlocks(content).map(textOf).join('\n\n')}`;
  }
  if (entry.type === 'tools') {
    const tools = Array.isArray(content?.tools) ? content.tools : [];
    return `### ${t(lang, 'md.tools', { count: tools.length })}\n\n${tools.map((tool) => tool.name).join(', ')}`;
  }
  const blocks = messageBlocks(content).filter((block) => block.type !== 'reasoning');
  const body = blocks.map(textOf).filter(Boolean).join('\n\n');
  if (entry.type === 'tool') {
    const title = content?.isError ? t(lang, 'md.toolResultError') : t(lang, 'md.toolResult');
    return `### ${title}\n\n${body}`;
  }
  if (entry.type === 'assistant') return `### ${t(lang, 'md.assistant')}${tailNote(entry, lang)}\n\n${body}`;
  return `### ${t(lang, 'md.user')}\n\n${body}`;
}

function payloadOf(request) {
  const body = { ...request.top, messages: request.messages };
  if (request.tools !== undefined) body.tools = request.tools;
  return JSON.stringify(body);
}

// --- newest turn ---------------------------------------------------------

function sha1(text) {
  return createHash('sha1').update(text, 'utf8').digest('hex');
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

/** Stable identity for dedupe: the durable message id when present, content otherwise. */
function messageKey(message) {
  if (message && typeof message === 'object' && typeof message.id === 'string' && message.id) {
    return 'id:' + message.id;
  }
  return 'h:' + sha1(canonical(message));
}

/** A real conversation call, as opposed to a one-shot prompt (session title, …). */
function isConversationRequest(request) {
  return (
    request.messages.some((message) => message && message.role === 'assistant') ||
    request.messages.some((message) => message && message.role === 'user' && message.source?.kind === 'user')
  );
}

function lastUserIndex(messages) {
  let found = -1;
  messages.forEach((message, index) => {
    if (message && message.role === 'user' && message.source?.kind === 'user') found = index;
  });
  return found;
}

class ExportError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/**
 * Rebuild the newest turn from the last conversation request's snapshot.
 *
 * The snapshot already holds the whole visible history, so the turn is a slice
 * of it plus the recorded reply. Only when the user's message was compacted
 * away does the turn span segments; every boundary crossed must then be a
 * recognizable compaction, otherwise the history was rewritten and we refuse
 * instead of guessing.
 */
function buildLatestTurn(root, id, lang) {
  const requests = loadRequests(root, id);
  if (requests.length === 0) throw new ExportError('NO_DUMP', t(lang, 'err.noDump'));

  let end = requests.length - 1;
  while (end >= 0 && !isConversationRequest(requests[end])) end -= 1;
  if (end < 0) throw new ExportError('NO_USER', t(lang, 'err.noUser'));

  const target = requests[end];
  let startRequest = end;
  let startIndex = lastUserIndex(target.messages);
  if (startIndex < 0) {
    while (startRequest >= 0 && lastUserIndex(requests[startRequest].messages) < 0) startRequest -= 1;
    if (startRequest < 0) throw new ExportError('NO_USER', t(lang, 'err.noUser'));
    startIndex = lastUserIndex(requests[startRequest].messages);
  }

  const messages = requests[startRequest].messages.slice(startIndex);
  const seen = new Set(messages.map(messageKey));
  let joined = false;

  for (let i = startRequest + 1; i <= end; i += 1) {
    const request = requests[i];
    if (!isConversationRequest(request)) continue; // one-shot auxiliary call
    const head = request.messages;
    const compaction = head[1] && head[1].role === 'user' && head[1].source?.kind === 'compact-checkpoint';
    if (!compaction) throw new ExportError('FORK', t(lang, 'err.fork'));
    joined = true;
    for (const message of head.slice(2)) {
      const key = messageKey(message);
      if (seen.has(key)) continue;
      seen.add(key);
      messages.push(message);
    }
  }

  const response = loadResponses(root, id)
    .filter((row) => row.seq === target.seq)
    .pop();
  if (response && Array.isArray(response.blocks) && response.blocks.length > 0) {
    const tail = {
      role: 'assistant',
      content: response.blocks,
      source: { kind: 'model', provider: target.provider ?? null, model: target.model ?? null },
    };
    if (!seen.has(messageKey(tail))) messages.push(tail);
  }

  return { messages, joined, requestSeq: target.seq, startSeq: requests[startRequest].seq, startIndex };
}

function filterTurn(messages, prefs) {
  const kept = [];
  for (const message of messages) {
    if (!message || typeof message !== 'object') continue;
    if (message.role === 'tool') {
      if (prefs.includeTools) kept.push(message);
      continue;
    }
    if (message.role === 'user') {
      if (message.source?.kind === 'user') {
        if (prefs.includeUserInput) kept.push(message);
      } else if (prefs.includeInjected) {
        kept.push(message);
      }
      continue;
    }
    if (message.role === 'assistant' && !prefs.includeTools) {
      const content = (message.content ?? []).filter((block) => block && block.type !== 'tool-call');
      if (content.length > 0) kept.push({ ...message, content });
      continue;
    }
    kept.push(message);
  }
  return kept;
}

function messageBody(message) {
  return messageBlocks(message)
    .filter((block) => block.type !== 'reasoning')
    .map(textOf)
    .filter(Boolean)
    .join('\n\n');
}

function renderTurnMarkdown(messages, lang, joined) {
  const parts = [];
  if (joined) parts.push('> ' + t(lang, 'md.joinedCompaction'));
  for (const message of messages) {
    const body = messageBody(message);
    // A filtered turn keeps messages whose only blocks were tool calls; an
    // empty heading would be noise, so skip anything that renders to nothing.
    if (body.trim() === '') continue;
    if (message.role === 'user') {
      const kind = message.source?.kind;
      const title = kind === 'user' ? t(lang, 'md.user') : t(lang, 'md.context', { kind: kind ?? 'unknown' });
      parts.push(`### ${title}\n\n${body}`);
    } else if (message.role === 'assistant') {
      parts.push(`### ${t(lang, 'md.assistant')}\n\n${body}`);
    } else if (message.role === 'tool') {
      const title = message.isError ? t(lang, 'md.toolResultError') : t(lang, 'md.toolResult');
      parts.push(`### ${title}\n\n${body}`);
    }
  }
  return parts.join('\n\n') + '\n';
}

function slug(value, fallback) {
  const text = String(value ?? '')
    .replace(/[\\/:*?"<>|\r\n\t]+/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
  return text || fallback;
}

function shortId(id) {
  const raw = String(id).replace(/^session-/, '');
  return raw.slice(0, 8) || String(id).slice(0, 8);
}

function stampOf(iso) {
  const date = iso ? new Date(iso) : new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return (
    date.getFullYear() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    '-' +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
}

function uniquePath(dir, base, extension) {
  let candidate = join(dir, `${base}${extension}`);
  let counter = 1;
  while (existsSync(candidate)) {
    candidate = join(dir, `${base}-${counter}${extension}`);
    counter += 1;
  }
  return candidate;
}

function send(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'referrer-policy': 'no-referrer',
  });
  res.end(JSON.stringify(body));
}

function isLoopback(req) {
  const address = req.socket?.remoteAddress ?? '';
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
}

async function readJson(req, limit = 1024 * 1024) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error('body too large');
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString('utf8').trim();
  return text ? JSON.parse(text) : {};
}

function reveal(path) {
  spawn('explorer.exe', [path], { detached: true, stdio: 'ignore' }).unref();
}

const ID_PATTERN = /^[A-Za-z0-9._-]{1,120}$/;

export const name = 'dump-manager';
export const inject = ['webServer'];

export function apply(ctx) {
  const compatibility = compatibilityNow();
  if (!compatibility.ok) warnIncompatible(ctx, compatibility);

  const routes = [
    {
      kind: 'exact',
      path: '/api/dsh-dumps/overview',
      handler: (req, res) => {
        if (!isLoopback(req)) return send(res, 403, { ok: false, error: 'forbidden' });
        if (req.method !== 'GET') return send(res, 405, { ok: false, error: 'method not allowed' });
        const root = outputDir();
        send(res, 200, { ok: true, root, exports: exportsStats(), compatibility: compatibilityNow(), ...indexSessions(root) });
      },
    },
    {
      kind: 'exact',
      path: '/api/dsh-dumps/stream',
      handler: (req, res) => {
        if (!isLoopback(req)) return send(res, 403, { ok: false, error: 'forbidden' });
        if (req.method !== 'GET') return send(res, 405, { ok: false, error: 'method not allowed' });
        const url = new URL(req.url ?? '/', 'http://127.0.0.1');
        const id = String(url.searchParams.get('id') ?? '');
        if (!ID_PATTERN.test(id)) return send(res, 400, { ok: false, error: 'invalid id' });
        try {
          const stream = buildStream(outputDir(), id);
          send(res, 200, {
            ok: true,
            meta: stream.meta,
            segments: stream.segments,
            entries: stream.entries.map(wireEntry),
            requestCount: stream.requestCount,
          });
        } catch (error) {
          send(res, 500, { ok: false, error: String(error?.message ?? error) });
        }
      },
    },
    {
      kind: 'exact',
      path: '/api/dsh-dumps/entry',
      handler: (req, res) => {
        if (!isLoopback(req)) return send(res, 403, { ok: false, error: 'forbidden' });
        if (req.method !== 'GET') return send(res, 405, { ok: false, error: 'method not allowed' });
        const url = new URL(req.url ?? '/', 'http://127.0.0.1');
        const id = String(url.searchParams.get('id') ?? '');
        const index = Number(url.searchParams.get('i'));
        if (!ID_PATTERN.test(id) || !Number.isInteger(index) || index < 0) {
          return send(res, 400, { ok: false, error: 'invalid request' });
        }
        const stream = buildStream(outputDir(), id);
        const entry = stream.entries[index];
        if (!entry) return send(res, 404, { ok: false, error: 'entry not found' });
        send(res, 200, { ok: true, entry: { ...wireEntry(entry), content: entry.content } });
      },
    },
    {
      kind: 'exact',
      path: '/api/dsh-dumps/export',
      handler: async (req, res) => {
        if (!isLoopback(req)) return send(res, 403, { ok: false, error: 'forbidden' });
        if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'method not allowed' });
        let body;
        try {
          body = await readJson(req);
        } catch (error) {
          return send(res, 400, { ok: false, error: String(error?.message ?? error) });
        }
        const id = String(body.id ?? '');
        if (!ID_PATTERN.test(id)) return send(res, 400, { ok: false, error: 'invalid id' });
        const wanted = Array.isArray(body.entries)
          ? [...new Set(body.entries.map(Number).filter((value) => Number.isInteger(value) && value >= 0))]
          : [];
        if (wanted.length === 0) return send(res, 400, { ok: false, error: 'no entries selected' });

        const root = outputDir();
        const stream = buildStream(root, id);
        const selected = wanted
          .map((index) => stream.entries[index])
          .filter(Boolean)
          .sort((a, b) => a.index - b.index);
        if (selected.length === 0) return send(res, 404, { ok: false, error: 'entries not found' });

        const folder = exportsDir();
        try {
          mkdirSync(folder, { recursive: true });
        } catch (error) {
          return send(res, 500, { ok: false, error: String(error?.message ?? error) });
        }

        const files = [];
        const write = (base, extension, content) => {
          const path = uniquePath(folder, base, extension);
          writeFileSync(path, content, 'utf8');
          files.push(path);
        };
        const title = slug(stream.meta.title, shortId(id));
        const kind = body.kind === 'payload' ? 'payload' : 'transcript';
        const lang = normalizeLang(body.lang);
        const firstSegment = stream.segments[selected[0].segment];
        const firstRequest = stream.requests.find((item) => item.seq === firstSegment.fromSeq);

        if (kind === 'transcript') {
          const parts = [];
          let activeSegment = -1;
          for (const entry of selected) {
            if (entry.segment !== activeSegment) {
              activeSegment = entry.segment;
              const segment = stream.segments[entry.segment];
              parts.push(
                `## ${t(lang, 'md.segment', {
                  n: segment.index + 1,
                  from: segment.fromSeq,
                  to: segment.toSeq,
                })}`,
              );
            }
            parts.push(renderEntryMarkdown(entry, lang));
          }
          write(
            `${title}_transcript_${stampOf(firstRequest?.at)}`,
            '.md',
            parts.join('\n\n'),
          );
        } else {
          const segments = [...new Set(selected.map((entry) => entry.segment))].sort((a, b) => a - b);
          for (const segmentIndex of segments) {
            const segment = stream.segments[segmentIndex];
            const request = stream.requests.find((item) => item.seq === segment.toSeq);
            if (!request) continue;
            write(
              `${title}_${shortId(id)}_seq${request.seq}_${stampOf(request.at)}`,
              '.json',
              payloadOf(request),
            );
          }
        }

        const totalBytes = files.reduce((sum, path) => sum + statSync(path).size, 0);
        send(res, 200, { ok: true, folder, files, totalBytes, entries: selected.length });
      },
    },
    {
      kind: 'exact',
      path: '/api/dsh-dumps/roots',
      handler: (req, res) => {
        if (!isLoopback(req)) return send(res, 403, { ok: false, error: 'forbidden' });
        if (req.method !== 'GET') return send(res, 405, { ok: false, error: 'method not allowed' });
        const snapshot = rootsSnapshot();
        send(res, 200, {
          ok: true,
          ...snapshot.value,
          stale: snapshot.stale,
          probedAt: new Date(snapshot.at).toISOString(),
          durationMs: snapshot.durationMs,
        });
      },
    },
    {
      kind: 'exact',
      path: '/api/dsh-dumps/shares',
      handler: async (req, res) => {
        if (!isLoopback(req)) return send(res, 403, { ok: false, error: 'forbidden' });
        if (req.method !== 'GET') return send(res, 405, { ok: false, error: 'method not allowed' });
        const url = new URL(req.url ?? '/', 'http://127.0.0.1');
        const host = String(url.searchParams.get('host') ?? '');
        if (!/^[A-Za-z0-9._-]{1,64}$/.test(host)) {
          return send(res, 400, { ok: false, code: 'SHARES', error: 'invalid host name' });
        }
        try {
          send(res, 200, { ok: true, host, ...(await sharesSnapshot(host)) });
        } catch (error) {
          send(res, 200, { ok: false, code: 'SHARES', host, error: String(error?.message ?? error) });
        }
      },
    },
    {
      kind: 'exact',
      path: '/api/dsh-dumps/capture',
      handler: async (req, res) => {
        if (!isLoopback(req)) return send(res, 403, { ok: false, error: 'forbidden' });
        if (req.method === 'GET') {
          return send(res, 200, {
            ok: true,
            capture: readCapture().value,
            defaults: DEFAULT_CAPTURE,
            exportsDir: exportsDir(),
          });
        }
        if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'method not allowed' });
        let body;
        try {
          body = await readJson(req);
        } catch (error) {
          return send(res, 400, { ok: false, error: String(error?.message ?? error) });
        }
        try {
          send(res, 200, {
            ok: true,
            capture: writeCapture(body),
            defaults: DEFAULT_CAPTURE,
            exportsDir: exportsDir(),
          });
        } catch (error) {
          send(res, 400, { ok: false, error: String(error?.message ?? error) });
        }
      },
    },
    {
      kind: 'exact',
      path: '/api/dsh-dumps/prefs',
      handler: async (req, res) => {
        if (!isLoopback(req)) return send(res, 403, { ok: false, error: 'forbidden' });
        if (req.method === 'GET') {
          return send(res, 200, { ok: true, prefs: readPrefs(), defaults: normalizePrefs(DEFAULT_PREFS) });
        }
        if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'method not allowed' });
        let body;
        try {
          body = await readJson(req);
        } catch (error) {
          return send(res, 400, { ok: false, error: String(error?.message ?? error) });
        }
        try {
          send(res, 200, { ok: true, prefs: writePrefs(body) });
        } catch (error) {
          send(res, 500, { ok: false, error: String(error?.message ?? error) });
        }
      },
    },
    {
      kind: 'exact',
      path: '/api/dsh-dumps/latest',
      handler: async (req, res) => {
        if (!isLoopback(req)) return send(res, 403, { ok: false, error: 'forbidden' });
        if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'method not allowed' });
        let body;
        try {
          body = await readJson(req);
        } catch (error) {
          return send(res, 400, { ok: false, code: 'BAD_REQUEST', error: String(error?.message ?? error) });
        }
        const id = String(body.id ?? '');
        if (!ID_PATTERN.test(id)) {
          return send(res, 400, { ok: false, code: 'BAD_REQUEST', error: 'invalid id' });
        }
        const lang = normalizeLang(body.lang);
        const root = outputDir();
        if (!existsSync(join(root, id))) {
          return send(res, 404, { ok: false, code: 'NO_DUMP', error: t(lang, 'err.noDump') });
        }
        const prefs = readPrefs().export;
        try {
          const turn = buildLatestTurn(root, id, lang);
          const messages = filterTurn(turn.messages, prefs);
          const format = prefs.format === 'json' ? 'json' : 'md';
          const markdown = format === 'json' ? null : renderTurnMarkdown(messages, lang, turn.joined);
          // An empty result is a setting mistake, not a file worth writing.
          if (messages.length === 0 || (markdown !== null && markdown.trim() === '')) {
            throw new ExportError('EMPTY', t(lang, 'err.empty'));
          }
          const folder = exportsDir();
          mkdirSync(folder, { recursive: true });
          const base = `${slug(sessionMeta(id).title, shortId(id))}_latest_${stampOf(new Date().toISOString())}`;
          const path = uniquePath(folder, base, format === 'json' ? '.json' : '.md');
          const content =
            format === 'json'
              ? JSON.stringify(
                  {
                    sessionId: id,
                    exportedAt: new Date().toISOString(),
                    requestSeq: turn.requestSeq,
                    startSeq: turn.startSeq,
                    startIndex: turn.startIndex,
                    joinedCompaction: turn.joined,
                    messages,
                  },
                  null,
                  2,
                )
              : renderTurnMarkdown(messages, lang, turn.joined);
          writeFileSync(path, content, 'utf8');
          send(res, 200, {
            ok: true,
            file: path,
            folder,
            bytes: statSync(path).size,
            messages: messages.length,
            joinedCompaction: turn.joined,
          });
        } catch (error) {
          if (error instanceof ExportError) {
            return send(res, 409, { ok: false, code: error.code, error: error.message });
          }
          send(res, 500, {
            ok: false,
            code: 'WRITE',
            error: t(lang, 'err.write', { message: String(error?.message ?? error) }),
          });
        }
      },
    },
    {
      kind: 'exact',
      path: '/api/dsh-dumps/reveal',
      handler: async (req, res) => {
        if (!isLoopback(req)) return send(res, 403, { ok: false, error: 'forbidden' });
        if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'method not allowed' });
        let body;
        try {
          body = await readJson(req);
        } catch (error) {
          return send(res, 400, { ok: false, error: String(error?.message ?? error) });
        }
        const root = outputDir();
        let folder = root;
        if (body.which === 'exports') {
          folder = exportsDir();
        } else if (body.id !== undefined) {
          const id = String(body.id);
          if (!ID_PATTERN.test(id) || id.startsWith('_')) {
            return send(res, 400, { ok: false, error: 'invalid id' });
          }
          folder = join(root, id);
          if (!existsSync(folder)) return send(res, 404, { ok: false, error: 'not found' });
        }
        if (!existsSync(folder)) mkdirSync(folder, { recursive: true });
        reveal(folder);
        send(res, 200, { ok: true, folder });
      },
    },
    {
      kind: 'exact',
      path: '/api/dsh-dumps/delete',
      handler: async (req, res) => {
        if (!isLoopback(req)) return send(res, 403, { ok: false, error: 'forbidden' });
        if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'method not allowed' });
        let body;
        try {
          body = await readJson(req);
        } catch (error) {
          return send(res, 400, { ok: false, error: String(error?.message ?? error) });
        }
        const id = String(body.id ?? '');
        if (!ID_PATTERN.test(id) || id.startsWith('_')) {
          return send(res, 400, { ok: false, error: 'invalid id' });
        }
        const root = outputDir();
        const dir = join(root, id);
        if (!existsSync(dir)) return send(res, 404, { ok: false, error: 'not found' });
        try {
          rmSync(dir, { recursive: true, force: true });
        } catch (error) {
          return send(res, 500, { ok: false, error: String(error?.message ?? error) });
        }
        send(res, 200, { ok: true, root, exports: exportsStats(), ...indexSessions(root) });
      },
    },
  ];

  const disposers = routes.map((route) => ctx.webServer.register(route));
  ctx.effect(() => () => {
    for (const dispose of disposers) {
      try {
        dispose();
      } catch {
        /* one failed disposer must not leak the other */
      }
    }
  });
}
