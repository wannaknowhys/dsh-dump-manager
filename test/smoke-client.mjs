// Offline test for the browser half: load it under Node with stub React and a
// stub slot registry, then assert that every contribution goes through
// `slots.inject` (a direct `register` at apply time throws before the owning UI
// declares the slot, which silently removes the settings tab and the viewer).
//
//   node test/smoke-client.mjs

import { readFileSync } from 'node:fs';

const failures = [];
function check(label, actual, expected) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) failures.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  console.log(`${pass ? 'ok  ' : 'FAIL'} ${label}${pass ? '' : ` (${JSON.stringify(actual)})`}`);
}

let loaded = null;
globalThis.window = {
  __ModuleLoader__: {
    load(entry) {
      const React = {
        createElement: (...args) => ({ args }),
        Fragment: 'fragment',
        useState: (value) => [typeof value === 'function' ? value() : value, () => {}],
        useEffect: () => {},
        useCallback: (fn) => fn,
        useMemo: (fn) => fn(),
        useRef: (value) => ({ current: value }),
      };
      const require = (name) => {
        if (name === 'react') return React;
        if (name === 'react-dom') return { createPortal: (node) => node };
        throw new Error('unknown module ' + name);
      };
      loaded = entry.factory(require);
    },
  },
};
globalThis.document = { body: {} };

globalThis.eval(readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8'));

const injected = [];
const registrations = [];
const baseCtx = {
  locale: { getSnapshot: () => ({ active: 'zh' }), subscribe: () => () => {} },
  get: () => undefined,
  inject: (deps, callback) => {
    callback({ uiWorkspace: { listDirectory: () => {}, createDirectory: () => {} } });
    return () => {};
  },
  effect: (fn) => fn(),
  slots: {
    inject(key, callback) {
      injected.push(key);
      const dispose = callback();
      return typeof dispose === 'function' ? dispose : () => {};
    },
    register(options) {
      registrations.push(options);
      return () => {};
    },
  },
};

check('the client half loaded', typeof loaded, 'object');
check('locale is injected, so the first render is localized', loaded.inject.includes('locale'), true);
check('slots is injected', loaded.inject.includes('slots'), true);

loaded.apply(baseCtx);

check('every slot is contributed through inject', injected, [
  'sidebar.footer.action',
  'conversation.session.header.actions',
  'conversation.view',
  'settings.plugins.tab',
]);
check('registrations', registrations.map((row) => row.name + '#' + row.id), [
  'sidebar.footer.action#dump-manager',
  'conversation.session.header.actions#dump-export',
  'conversation.view#dumps',
  'settings.plugins.tab#dump-manager',
]);
check('the settings label is localized lazily', typeof registrations[3].label, 'function');
check('the settings label resolves', registrations[3].label(), 'LLM Dump Settings');

const broken = {
  ...baseCtx,
  slots: {
    inject() {
      throw new Error('slot is not declared');
    },
    register() {
      throw new Error('slot is not declared');
    },
  },
};
let threw = '';
try {
  loaded.apply(broken);
} catch (error) {
  threw = String(error && error.message);
}
check('a composition without the slots survives apply', threw, '');

console.log(failures.length === 0 ? '\nALL PASS' : `\n${failures.length} FAILURE(S)\n` + failures.join('\n'));
process.exitCode = failures.length === 0 ? 0 : 1;
