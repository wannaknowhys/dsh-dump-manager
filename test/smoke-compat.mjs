// Offline test for the writer/reader format check: the pure comparison, the
// startup warning, and what /api/dsh-dumps/overview reports to the panel.
//
//   node test/smoke-compat.mjs
//
// Uses a throwaway DSH_HOME and fake package.json files; the real profile is
// never touched.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const home = mkdtempSync(join(tmpdir(), 'dsh-compat-'));
process.env.DSH_HOME = home;
mkdirSync(join(home, 'llm-dumps'), { recursive: true });
writeFileSync(join(home, 'llm-dumps', 'config.json'), JSON.stringify({ outputDir: join(home, 'dumps') }));

const { apply, checkCompatibility, SUPPORTED_FORMAT } = await import('../lib/index.js');

const failures = [];
function check(label, actual, expected) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) failures.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  console.log(`${pass ? 'ok  ' : 'FAIL'} ${label}${pass ? '' : ` (${JSON.stringify(actual)})`}`);
}

// --- pure comparison ------------------------------------------------------

check('supported range', SUPPORTED_FORMAT, { min: 1, max: 1 });
check('format 1 is understood', checkCompatibility(1), {
  ok: true,
  code: 'OK',
  found: 1,
  supported: { min: 1, max: 1 },
});
check('format 2 is newer than this reader', checkCompatibility(2), {
  ok: false,
  code: 'NEWER',
  found: 2,
  supported: { min: 1, max: 1 },
});
check('format 0 is treated as unknown, not as a mismatch', checkCompatibility(0).code, 'ABSENT');
check('an absent writer is not a mismatch', checkCompatibility(null).ok, true);
check('a narrower reader reports the writer as older', checkCompatibility(1, { min: 2, max: 2 }), {
  ok: false,
  code: 'OLDER',
  found: 1,
  supported: { min: 2, max: 2 },
});

// --- startup warning and overview payload ---------------------------------

const packageWith = (version) => {
  const path = join(home, `llm-dump-${version}.json`);
  writeFileSync(path, JSON.stringify({ name: 'dsh-llm-dump', dsh: { formatVersion: version } }));
  return path;
};

function boot() {
  const warnings = [];
  const routes = new Map();
  apply({
    logger: { warn: (message) => warnings.push(String(message)) },
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
  return { warnings, routes };
}

async function overview(routes) {
  const route = routes.get('/api/dsh-dumps/overview');
  if (!route) throw new Error('no overview route');
  let status = 0;
  let payload = '';
  await route.handler(
    { method: 'GET', url: '/api/dsh-dumps/overview', socket: { remoteAddress: '127.0.0.1' } },
    {
      writeHead(value) {
        status = value;
      },
      end(value) {
        payload = value;
      },
    },
  );
  return { status, body: JSON.parse(payload) };
}

process.env.DSH_LLM_DUMP_PACKAGE = packageWith(2);
const newer = boot();
check('startup warns about a newer writer', newer.warnings.length, 1);
check('warning names the format it found', newer.warnings[0].includes('format 2'), true);

const newerOverview = await overview(newer.routes);
check('overview carries the mismatch', [newerOverview.status, newerOverview.body.compatibility.ok, newerOverview.body.compatibility.code], [200, false, 'NEWER']);

process.env.DSH_LLM_DUMP_PACKAGE = packageWith(1);
const current = boot();
check('a matching writer does not warn', current.warnings.length, 0);
const currentOverview = await overview(current.routes);
check('overview reports a match', currentOverview.body.compatibility.code, 'OK');

delete process.env.DSH_LLM_DUMP_PACKAGE;
const missing = boot();
check('a missing writer does not warn', missing.warnings.length, 0);
const missingOverview = await overview(missing.routes);
check('overview reports an absent writer', missingOverview.body.compatibility.code, 'ABSENT');

if (failures.length === 0) rmSync(home, { recursive: true, force: true });
else console.error('kept ' + home);

console.log(failures.length === 0 ? '\nALL PASS' : `\n${failures.length} FAILURE(S)\n` + failures.join('\n'));
process.exitCode = failures.length === 0 ? 0 : 1;
