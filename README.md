[English](README.md) | [简体中文](README.zh-CN.md)

# dsh-dump-manager

[![npm version](https://img.shields.io/npm/v/dsh-dump-manager.svg)](https://www.npmjs.com/package/dsh-dump-manager) [![license](https://img.shields.io/npm/l/dsh-dump-manager.svg)](./LICENSE)

Sidebar entry, session table, the entry-stream viewer with two exports, plus the
newest-turn export and its `LLM Dump` conversation tab, for dumps captured by
[dsh-llm-dump](https://github.com/wannaknowhys/dsh-llm-dump).

## Install / remove

```sh
# from npm
dsh plugin --profile desktop add dsh-dump-manager

# from a checkout
dsh plugin --profile desktop add github:wannaknowhys/dsh-dump-manager

# remove
dsh plugin --profile desktop remove dsh-dump-manager
```

The plugin manager accepts the same specs: `install_bundle target = dsh-dump-manager`
or the checkout directory.

The bundle has a host half (routes, exports) and a browser half (sidebar card,
panel, tab, settings page). Host modules do not hot-reload: after editing one,
toggle the bundle so the Host re-imports the module.

## Levels

```
panel   (sidebar button)   sessions only: view / folder / delete
viewer  (查看)             one session's entries: select, export
tab     (LLM Dump)         the same stream, mounted beside 轨迹 / 统计
header  (导出本轮 ▾)       export the newest turn with three filters
settings (Plugins tab)     the same options, shared storage
```

### Panel

- **LLM Dumps <size> · Exports <size>** beside Settings in the sidebar foot.
- Header repeats both sizes plus session/request counts.
- Table: session/workspace, requests, size, last write, actions.
- Row actions: view, folder (open the dump directory), delete (two-step).
- Session dumps live in `<outputDir>` (by default `%DSH_HOME%\llm-dumps`, one
  directory per session); exports live beside it in `exports\`.

### Viewer

The viewer never shows request numbers as a dimension. It shows **entries** —
the typed units of the conversation:

| type | meaning |
| --- | --- |
| `system` | the assembled system prompt |
| `tools` | the tool definitions block |
| `user` / `assistant` | conversation messages (tool calls included in assistant) |
| `tool` | a tool result message |

The last row may be the **tail entry** — the answer to the newest request, read
from `responses.jsonl` rather than from a request snapshot. It is the only reply
that has not yet been resent as history, and it carries a `最新回复` badge
(`最新·中断` when the stream was cut short).

- One continuous list per session. Each row: checkbox, type badge, one-line
  summary, expand toggle.
- **缩略** renders the expanded entry as readable text (tool calls as
  `→ name(args)`); **详细** renders its complete JSON.
- Entries load 100 at a time: reaching the bottom loads the next page, and the
  footer reports `已渲染/总数`. `⤓ 到底部` renders every remaining entry of the
  segment in one commit and jumps to the end.
- The type row above the list selects or hides whole types: the checkbox
  selects every entry of that type in the current segment, clicking the name
  hides or shows the type (hidden types stay selected; nothing is hidden by
  default).
- A row's content is fetched only when it is expanded.
- `全选本段` selects every entry of the current segment.
- `Shift+点击选区间`: a plain click on a checkbox sets the anchor; Shift+clicking
  a checkbox or a row adds the whole span between the anchor and that row, in the
  current visible order, so a hidden type is never swept in. Shift+clicking a
  span that is already fully selected removes it. The anchor stays at the last
  plain click and resets when the segment or the hidden types change.

**Segments (tabs).** The stream is one segment while each request only appends
messages. When a request rewrites history (compaction, rebuild) the stream
breaks; each segment gets a tab. With a single segment no tab bar is shown.

## Newest-turn export

`导出本轮 ▾` beside the session title exports the newest turn from the last
conversation request's snapshot (not from the entry stream):

- The turn starts at the last message whose `source.kind === 'user'`. Injected
  user-role messages (`time-context`, `runtime-context`, `agent-instructions`,
  `skill-catalog`, `compact-checkpoint`, notices, `agent-message`, …) never
  start a turn.
- The reply to that request comes from `responses.jsonl`; it is not in any
  snapshot yet.
- One-shot calls (session title, …) are skipped: a request with neither an
  assistant message nor a user message is not a conversation call.

Three persisted filters live in `%DSH_HOME%\llm-dumps\ui.json`:

| Option | Default | Effect |
| --- | --- | --- |
| include user input | on | keep the `kind === 'user'` message |
| include tools | on | keep tool-call blocks and tool results |
| include injected context | off | keep the other user-role messages |

When the user's prompt was compacted away, the turn spans segments: each crossed
boundary must look like a compaction (`messages[1].source.kind ===
'compact-checkpoint'`), retained messages are deduplicated, and the file carries
a note (Markdown) / `joinedCompaction: true` (JSON). Anything else is refused
with `409` and a code the UI turns into a dialog: `NO_DUMP`, `NO_USER`, `FORK`.
The dialog offers the viewer for manual segment export.

Files: `<title>_latest_<stamp>.md|.json` in the exports folder.

## Strings

All UI and export text comes from `lib/strings.js` (en + zh, English fallback).
The browser half cannot import it (plain script, no bundler), so
`tools/sync-strings.mjs` regenerates its inline copy and
`tools/check-strings.mjs` asserts the two copies and both languages agree.

## Export kinds

Both write into the exports folder (`<outputDir>\..\exports`), never overwrite
(`-1`, `-2`, …).

| Kind | Content | File |
| --- | --- | --- |
| **transcript** | The selected entries only, rendered as Markdown, segments separated by `## 段 N · seq a–b`; a tail entry adds a note saying it came from the response stream | `.md` |
| **payload** | For each segment represented in the selection, the complete request snapshot that last contained those entries (`lastSeq`): unfolded messages + tools + tool history + sampling, one compact JSON line | `.json`, one per segment |

Selecting every entry of a 132-request session produces a ~1.2 MB transcript
instead of the ~162 MB the snapshot-per-request model produced.

## Settings page

`Settings → Plugins → LLM Dump Settings` owns two groups:

- **Newest-turn export** — the same three filters and format the header menu
  writes, backed by `%DSH_HOME%\llm-dumps\ui.json`.
- **Capture (dsh-llm-dump)** — edits `%DSH_HOME%\llm-dumps\config.json` on
  llm-dump's behalf: the output directory, with a two-step confirm since
  existing dumps are not moved. Unknown keys survive the rewrite; the file is
  replaced atomically. A directory browser covers drives (Windows) or `/`, with
  Home / parent / an editable path for UNC targets, a per-host share list for a
  bare `\\server\`, and a New folder action wherever a real directory is open.

## Data format

The reader understands **dsh-llm-dump data format version 1**: one timestamped,
append-only `requests.jsonl` per session plus `objects.jsonl` for content
deduplication, and `responses.jsonl` for the reply to the newest request.
Unknown fields are ignored, so a newer llm-dump may add fields without breaking
this reader. The format itself is documented in the llm-dump README.

At startup, and again on every overview request, the host side resolves
`dsh-llm-dump/package.json` and compares its `dsh.formatVersion` with the range
this build reads (`1`). A newer writer is reported once in the Host log and as a
warning row at the top of the panel; reading is never blocked.
`DSH_LLM_DUMP_PACKAGE` points the check at another copy of that file, for a
side-by-side install.

## Host routes (loopback only)

| Method | Path | Body / query |
| --- | --- | --- |
| GET | `/api/dsh-dumps/overview` | — |
| GET | `/api/dsh-dumps/stream` | `?id=` |
| GET | `/api/dsh-dumps/entry` | `?id=&i=` |
| GET/POST | `/api/dsh-dumps/prefs` | `{ export: { … } }` (GET returns `{ prefs, defaults }`) |
| GET/POST | `/api/dsh-dumps/capture` | `{ outputDir? }` → `{ capture, defaults, exportsDir }` |
| GET | `/api/dsh-dumps/roots` | `{ roots, home, platform, stale, probedAt, durationMs }` |
| GET | `/api/dsh-dumps/shares` | `?host=` → `{ shares: [{ name, path }] }` (`net view`) |
| POST | `/api/dsh-dumps/latest` | `{ id, lang }` → `{ file, bytes, messages, joinedCompaction }` or `409 { code }` |
| POST | `/api/dsh-dumps/export` | `{ kind, id, entries: [i], lang }` |
| POST | `/api/dsh-dumps/reveal` | `{ which: 'root' \| 'exports' }` or `{ id }` |
| POST | `/api/dsh-dumps/delete` | `{ id }` |

Ids are restricted to `[A-Za-z0-9._-]`, deletions only touch a direct child of
the output directory, and every route refuses non-loopback callers.

## Tests

```powershell
npm test
```

Runs on synthetic folded dumps in a throwaway `DSH_HOME` under the system temp
directory; the real profile is never touched:

- `tools/check-strings.mjs` — both string copies are in sync and complete.
- `test/smoke-client.mjs` — loads the browser half with stub React and asserts
  every contribution goes through `slots.inject` (a direct `register` at apply
  time throws before the owning UI declares the slot) and that `locale` is
  injected.
- `test/smoke-compat.mjs` — the startup warning, the compatibility block in
  `/overview`, and the pure version comparison.
- `test/smoke-latest.mjs` — newest-turn export: filters, fork refusal, prefs,
  capture config, directory roots.
- `test/smoke-tail.mjs` — the tail entry: flagged from `responses.jsonl`,
  exported with its note in both languages, interrupted streams included.

## Caveat

`payload` is semantically complete, not byte-identical to the wire body: the
folded store keeps values, not the adapter's final serialization, so key order
can differ. Token counts match closely; exact wire capture needs a fetch hook.
