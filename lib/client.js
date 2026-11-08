// dsh-dump-manager (client) — sidebar entry, session table, and the entry-stream
// viewer: one continuous list per segment, selection on entries, two exports.

window.__ModuleLoader__.load({
  id: 'dsh-dump-manager',
  factory(require) {
    const React = require('react');
    const ReactDOM = require('react-dom');
    const h = React.createElement;

    // The shipped header triggers use the primitive chevron; fall back to a
    // text glyph when this composition does not expose that package.
    let primitives = null;
    try {
      primitives = require('@deepseek-ai/dsh-client-ui-primitives');
    } catch (error) {
      primitives = null;
    }
    const ChevronDown = (primitives && primitives.IconChevronDownOutlineRegular) || null;

    // >>> STRINGS (generated from lib/strings.js by tools/sync-strings.mjs) >>>
    const STRINGS =     {
      "en": {
        "md.user": "User",
        "md.assistant": "Assistant",
        "md.context": "Context · {kind}",
        "md.toolResult": "Tool result",
        "md.toolResultError": "Tool result (error)",
        "md.system": "System prompt",
        "md.tools": "Tools ({count})",
        "md.segment": "Segment {n} · seq {from}–{to}",
        "md.joinedCompaction": "This turn spanned a context compaction; the segments were joined automatically.",
        "md.tailNote": "Recorded from the response stream: the newest reply, not yet resent as history",
        "md.tailInterrupted": "the stream ended abnormally ({kind})",
        "err.noDump": "This session has no captured request yet.",
        "err.noUser": "No user input found in the latest request. The turn was started by another source, or its prompt was already compacted away.",
        "err.fork": "The conversation forked in the middle (compaction or history rewrite could not be joined). Export the segments manually.",
        "err.empty": "Nothing is left after filtering. Enable at least one option and try again.",
        "err.write": "Could not write the export file: {message}",
        "ui.dumps": "LLM Dumps",
        "ui.panelTitle": "LLM request dumps",
        "ui.exports": "Exports",
        "ui.sessions": "sessions",
        "ui.requests": "requests",
        "ui.loading": "Loading…",
        "ui.loadEntryFailed": "Could not read the entry: {message}",
        "ui.selectFirst": "Select at least one entry first",
        "ui.exported": "Exported {files} file(s) · {bytes}",
        "ui.exportFailed": "Export failed: {message}",
        "ui.selected": "Selected {count}",
        "ui.exportTranscript": "Export chat (.md)",
        "ui.exportPayload": "Export request (.json)",
        "ui.compact": "Compact",
        "ui.detailed": "Detailed",
        "ui.type": "Type",
        "ui.showType": "Click to show this type",
        "ui.hideType": "Click to hide this type",
        "ui.typeHint": "checkbox = select all of a type · click its name = hide/show",
        "ui.selectSegment": "Select all in segment",
        "ui.shiftHint": "Shift+click selects a range",
        "ui.rendered": "{visible}/{total} rendered",
        "ui.jumpBottom": "⤓ To bottom",
        "ui.jumpTitle": "Render every remaining entry of this segment and jump to the end",
        "ui.tailTitle": "Recorded straight from the response stream; not yet resent as history",
        "ui.tailTitleInterrupted": "Recorded straight from the response stream; the stream did not end normally",
        "ui.tail": "Latest reply",
        "ui.tailInterrupted": "Latest · interrupted",
        "ui.moreToLoad": "Scroll to the bottom to load more… ({visible}/{total})",
        "ui.allLoaded": "All entries loaded",
        "ui.view": "View",
        "ui.folder": "Folder",
        "ui.confirm": "Confirm",
        "ui.delete": "Delete",
        "ui.revealFailed": "Could not open the folder: {message}",
        "ui.deleted": "Deleted {id}",
        "ui.deleteFailed": "Delete failed: {message}",
        "ui.openData": "Open data folder",
        "ui.openExports": "Open exports folder",
        "ui.openFolder": "Open folder",
        "ui.colSession": "Session / workspace",
        "ui.colRequests": "Requests",
        "ui.colSize": "Size",
        "ui.colLastWrite": "Last write",
        "ui.colActions": "Actions",
        "ui.empty": "No dumps yet. They appear after the next model request.",
        "ui.sessionCount": "{count} session(s)",
        "ui.never": "—",
        "ui.exportTurn": "Export turn",
        "ui.exportTurnTitle": "Export the newest turn as an export file",
        "ui.menuIncludeUserInput": "Include user input",
        "ui.menuIncludeTools": "Include tool calls and results",
        "ui.menuIncludeInjected": "Include injected context",
        "ui.menuFormat": "Format",
        "ui.openViewer": "Open viewer",
        "ui.close": "Close",
        "ui.tabTitle": "LLM Dump",
        "ui.tabEmpty": "No dumps for this session yet.",
        "ui.settingsTitle": "LLM Dump Settings",
        "ui.settingsExportSection": "Newest-turn export",
        "ui.settingsHint": "These options are shared by the header button and this page.",
        "ui.settingsCaptureSection": "Capture (dsh-llm-dump)",
        "ui.settingsCaptureHint": "Edits llm-dumps\\config.json; capture picks it up on the next request, no reload needed.",
        "ui.settingsOutputDir": "Output directory",
        "ui.settingsBrowse": "Browse…",
        "ui.settingsPickFailed": "Could not open the directory picker: {message}",
        "ui.pickDirTitle": "Choose a directory",
        "ui.pickDirChoose": "Use this folder",
        "ui.pickDirHome": "Home",
        "ui.pickDirThisPc": "This PC",
        "ui.pickDirRoot": "Root",
        "ui.pickDirUp": "Up",
        "ui.pickDirGo": "Go",
        "ui.pickUncHint": "Could not list shares. Check that the server is reachable and allows share enumeration, or enter the full path such as \\\\server\\share.",
        "ui.pickDirNew": "New folder",
        "ui.pickDirNewDefault": "New folder",
        "ui.pickDirSharedHint": "Shares are created on the server, not from here.",
        "ui.pickDirRootHint": "Open a drive first; a folder needs a directory.",
        "ui.pickDirCreate": "Create",
        "ui.pickDirCreateFailed": "Could not create the folder: {message}",
        "ui.settingsRestoreDefault": "Restore default",
        "ui.pickDirEmpty": "No subdirectories here",
        "ui.settingsSave": "Save",
        "ui.settingsConfirm": "Confirm",
        "ui.settingsCancel": "Cancel",
        "ui.settingsOutputDirWarn": "Existing dumps are not moved, and the exports folder follows the new path. Continue?",
        "ui.settingsExportsDir": "Exports folder",
        "ui.settingsSaved": "Saved"
      },
      "zh": {
        "md.user": "用户",
        "md.assistant": "助手",
        "md.context": "上下文 · {kind}",
        "md.toolResult": "工具结果",
        "md.toolResultError": "工具结果（错误）",
        "md.system": "System prompt",
        "md.tools": "工具（{count}）",
        "md.segment": "段 {n} · seq {from}–{to}",
        "md.joinedCompaction": "本轮跨过一次上下文压缩，已自动拼接。",
        "md.tailNote": "记录自响应流：这是最新一次请求的回复，还没有作为历史进入下一次请求",
        "md.tailInterrupted": "流未正常结束（{kind}）",
        "err.noDump": "这个会话还没有采集到任何请求。",
        "err.noUser": "最近一次请求里找不到用户输入：本轮由其它来源触发，或提问已被压缩掉。",
        "err.fork": "对话在中间发生了分叉（压缩或历史重写无法拼接）。请手动分段导出。",
        "err.empty": "过滤后没有剩下任何内容，请至少打开一个选项再导出。",
        "err.write": "导出文件写入失败：{message}",
        "ui.dumps": "LLM Dumps",
        "ui.panelTitle": "LLM 请求 dump",
        "ui.exports": "导出",
        "ui.sessions": "会话",
        "ui.requests": "请求",
        "ui.loading": "加载中…",
        "ui.loadEntryFailed": "读取 entry 失败：{message}",
        "ui.selectFirst": "先勾选 entry",
        "ui.exported": "已导出 {files} 个文件 · {bytes}",
        "ui.exportFailed": "导出失败：{message}",
        "ui.selected": "已选 {count}",
        "ui.exportTranscript": "导出对话 (.md)",
        "ui.exportPayload": "导出完整请求 (.json)",
        "ui.compact": "缩略",
        "ui.detailed": "详细",
        "ui.type": "类型",
        "ui.showType": "点击显示该类型",
        "ui.hideType": "点击隐藏该类型",
        "ui.typeHint": "勾选=全选该类型，点名称=隐藏/显示",
        "ui.selectSegment": "全选本段",
        "ui.shiftHint": "Shift+点击选区间",
        "ui.rendered": "{visible}/{total} 已渲染",
        "ui.jumpBottom": "⤓ 到底部",
        "ui.jumpTitle": "渲染本段全部 entry 并跳到最底部",
        "ui.tailTitle": "直接从响应流记录，尚未进入下一次请求的历史",
        "ui.tailTitleInterrupted": "直接从响应流记录，流未正常结束",
        "ui.tail": "最新回复",
        "ui.tailInterrupted": "最新·中断",
        "ui.moreToLoad": "滚动到底部继续加载…（{visible}/{total}）",
        "ui.allLoaded": "已全部加载",
        "ui.view": "查看",
        "ui.folder": "文件夹",
        "ui.confirm": "确认",
        "ui.delete": "删除",
        "ui.revealFailed": "打开失败：{message}",
        "ui.deleted": "已删除 {id}",
        "ui.deleteFailed": "删除失败：{message}",
        "ui.openData": "打开数据目录",
        "ui.openExports": "打开导出目录",
        "ui.openFolder": "打开文件夹",
        "ui.colSession": "会话 / 工作区",
        "ui.colRequests": "请求数",
        "ui.colSize": "占用",
        "ui.colLastWrite": "最后写入",
        "ui.colActions": "操作",
        "ui.empty": "还没有 dump。发出新的模型请求后就会出现。",
        "ui.sessionCount": "{count} 个会话",
        "ui.never": "—",
        "ui.exportTurn": "导出本轮",
        "ui.exportTurnTitle": "把最新一轮会话导出成一个文件",
        "ui.menuIncludeUserInput": "包含用户输入",
        "ui.menuIncludeTools": "包含工具调用与结果",
        "ui.menuIncludeInjected": "包含系统注入",
        "ui.menuFormat": "格式",
        "ui.openViewer": "打开查看页",
        "ui.close": "关闭",
        "ui.tabTitle": "LLM Dump",
        "ui.tabEmpty": "这个会话还没有 dump。",
        "ui.settingsTitle": "LLM Dump Settings",
        "ui.settingsExportSection": "「导出最新一轮」选项",
        "ui.settingsHint": "这些选项由顶部按钮和本页共用。",
        "ui.settingsCaptureSection": "采集（dsh-llm-dump）",
        "ui.settingsCaptureHint": "直接编辑 llm-dumps\\config.json，采集端下一次请求就生效，无需重载。",
        "ui.settingsOutputDir": "输出目录",
        "ui.settingsBrowse": "浏览…",
        "ui.settingsPickFailed": "打开目录选择器失败：{message}",
        "ui.pickDirTitle": "选择目录",
        "ui.pickDirChoose": "选择这个文件夹",
        "ui.pickDirHome": "主目录",
        "ui.pickDirThisPc": "此电脑",
        "ui.pickDirRoot": "根目录",
        "ui.pickDirUp": "上一级",
        "ui.pickDirGo": "前往",
        "ui.pickUncHint": "无法列出共享。请确认服务器可达并允许枚举共享，或直接输入完整路径（例如 \\\\server\\share）。",
        "ui.pickDirNew": "新建文件夹",
        "ui.pickDirNewDefault": "新建文件夹",
        "ui.pickDirSharedHint": "共享需要在服务器上创建，这里无法新建。",
        "ui.pickDirRootHint": "先进入某个盘符，才能新建文件夹。",
        "ui.pickDirCreate": "创建",
        "ui.pickDirCreateFailed": "创建文件夹失败：{message}",
        "ui.settingsRestoreDefault": "恢复默认",
        "ui.pickDirEmpty": "这里没有子目录",
        "ui.settingsSave": "保存",
        "ui.settingsConfirm": "确认",
        "ui.settingsCancel": "取消",
        "ui.settingsOutputDirWarn": "旧 dump 不会迁移，导出目录也会跟着新路径走。确定继续？",
        "ui.settingsExportsDir": "导出目录",
        "ui.settingsSaved": "已保存"
      }
    };
    // <<< STRINGS <<<

    let activeLang = 'en';
    let localeFace = null;
    let workspaceFace = null;

    function normalizeLang(value) {
      return String(value ?? '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
    }

    function t(key, vars) {
      const table = STRINGS[activeLang] || STRINGS.en || {};
      let text = table[key] ?? (STRINGS.en || {})[key] ?? key;
      if (vars) {
        for (const name of Object.keys(vars)) {
          text = text.split('{' + name + '}').join(String(vars[name]));
        }
      }
      return text;
    }

    function readLocale() {
      try {
        const snapshot = localeFace && localeFace.getSnapshot ? localeFace.getSnapshot() : null;
        activeLang = normalizeLang(snapshot && snapshot.active);
      } catch {
        activeLang = 'en';
      }
    }

    /** Re-read the locale and re-render this component when it changes. */
    function useLocaleTick() {
      const [, bump] = React.useState(0);
      React.useEffect(() => {
        if (!localeFace || typeof localeFace.subscribe !== 'function') return undefined;
        readLocale();
        return localeFace.subscribe(() => {
          readLocale();
          bump((value) => value + 1);
        });
      }, []);
      return null;
    }

    const T = {
      fg: 'var(--dsw-alias-label-primary)',
      fg2: 'var(--dsw-alias-label-secondary)',
      bg: 'var(--dsw-alias-bg-overlay)',
      layer: 'var(--dsw-alias-bg-layer-1)',
      border: 'var(--dsw-alias-border-l1)',
      danger: 'var(--dsw-alias-state-error-primary)',
      brand: 'var(--dsw-alias-brand-primary)',
      success: 'var(--dsw-alias-state-success-primary)',
      warn: 'var(--dsw-alias-state-warn-primary)',
    };

    const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

    const TYPE_COLOR = {
      system: T.warn,
      tools: T.warn,
      user: T.brand,
      assistant: T.success,
      tool: T.fg2,
    };

    const TYPES = ['system', 'tools', 'user', 'assistant', 'tool'];

    function formatBytes(value) {
      if (!Number.isFinite(value) || value <= 0) return '0 B';
      const units = ['B', 'KB', 'MB', 'GB', 'TB'];
      let size = value;
      let unit = 0;
      while (size >= 1024 && unit < units.length - 1) {
        size /= 1024;
        unit += 1;
      }
      return (unit === 0 ? Math.round(size) : size.toFixed(size >= 100 ? 0 : 1)) + ' ' + units[unit];
    }

    function formatDate(iso) {
      if (!iso) return '—';
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) return '—';
      return date.toLocaleString(undefined, {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    function shortPath(path) {
      if (!path) return '';
      const parts = String(path).split(/[\\/]/).filter(Boolean);
      if (parts.length <= 2) return path;
      return '…\\' + parts.slice(-2).join('\\');
    }

    async function api(path, options) {
      const response = await fetch(path, {
        ...options,
        headers: { 'content-type': 'application/json', ...(options && options.headers) },
        signal: AbortSignal.timeout(30000),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.ok) throw new Error(body.error || 'HTTP ' + response.status);
      return body;
    }

    function shiftOf(event) {
      if (!event) return false;
      if (typeof event.shiftKey === 'boolean') return event.shiftKey;
      return Boolean(event.nativeEvent && event.nativeEvent.shiftKey);
    }

    function Checkbox(props) {
      return h('input', {
        type: 'checkbox',
        checked: Boolean(props.checked),
        onChange: props.onChange,
        onClick: (event) => event.stopPropagation(),
        'aria-label': props.label || 'select',
        style: { width: 14, height: 14, accentColor: 'var(--dsw-alias-brand-primary)', cursor: 'pointer', flex: '0 0 auto' },
      });
    }

    function Btn(props) {
      const style = {
        border: '1px solid ' + (props.danger ? T.danger : props.strong ? 'var(--dsw-alias-label-secondary)' : T.border),
        background: props.primary ? 'var(--dsw-alias-brand-primary)' : 'transparent',
        color: props.primary ? '#fff' : props.danger ? T.danger : props.strong ? T.fg : T.fg2,
        borderRadius: 6,
        padding: props.small ? '2px 8px' : '5px 10px',
        fontSize: props.small ? 11 : 12,
        cursor: props.disabled ? 'default' : 'pointer',
        opacity: props.disabled ? 0.5 : 1,
        whiteSpace: 'nowrap',
      };
      return h('button', { type: 'button', style, onClick: props.onClick, disabled: props.disabled, title: props.title }, props.children);
    }

    // ------------------------------------------------------------ entry body

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

    function CompactBody({ entry }) {
      const content = entry.content;
      if (entry.type === 'tools') {
        const tools = Array.isArray(content?.tools) ? content.tools : [];
        return h(
          'div',
          { style: { fontFamily: MONO, fontSize: 11, color: T.fg2, wordBreak: 'break-all' } },
          tools.map((tool) => tool.name).join(', '),
        );
      }
      const blocks = Array.isArray(content?.content) ? content.content : [];
      const parts = [];
      blocks.forEach((block, index) => {
        if (!block || block.type === 'reasoning') return;
        if (block.type === 'tool-call') {
          const args = typeof block.arguments === 'string' ? block.arguments : JSON.stringify(block.arguments ?? {});
          parts.push(
            h(
              'div',
              { key: index, style: { fontFamily: MONO, fontSize: 11, color: T.brand, marginTop: 4, wordBreak: 'break-word' } },
              '→ ' + block.name + '(' + args.slice(0, 500) + (args.length > 500 ? '…' : '') + ')',
            ),
          );
          return;
        }
        const text = textOf(block);
        if (!text) return;
        const clipped = text.length > 4000 ? text.slice(0, 4000) + '\n…' : text;
        parts.push(
          h(
            'pre',
            {
              key: index,
              style: {
                margin: '4px 0 0',
                fontFamily: MONO,
                fontSize: 11,
                lineHeight: 1.45,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                color: T.fg,
              },
            },
            clipped,
          ),
        );
      });
      if (parts.length === 0) parts.push(h('div', { key: 'empty', style: { color: T.fg2, fontSize: 11 } }, '(empty)'));
      return h('div', null, parts);
    }

    function DetailedBody({ entry }) {
      return h(
        'pre',
        {
          style: {
            margin: '4px 0 0',
            fontFamily: MONO,
            fontSize: 11,
            lineHeight: 1.45,
            whiteSpace: 'pre',
            overflow: 'auto',
            maxHeight: 360,
            background: T.bg,
            border: '1px solid ' + T.border,
            borderRadius: 6,
            padding: 8,
            color: T.fg,
          },
        },
        JSON.stringify(entry.content, null, 2),
      );
    }

    // ---------------------------------------------------------------- viewer

    function EntryStream({ sessionId, title, onClose, notify: rawNotify, embedded }) {
      useLocaleTick();
      const notify = typeof rawNotify === 'function' ? rawNotify : () => {};
      const [data, setData] = React.useState(null);
      const [error, setError] = React.useState('');
      const [segment, setSegment] = React.useState(0);
      const [selected, setSelected] = React.useState(() => new Set());
      const [expanded, setExpanded] = React.useState(() => new Set());
      const [details, setDetails] = React.useState({});
      const [mode, setMode] = React.useState('compact');
      const [page, setPage] = React.useState(60);
      const [busy, setBusy] = React.useState(false);
      const [hidden, setHidden] = React.useState(() => new Set());
      const listRef = React.useRef(null);
      const scrollerRef = React.useRef(null);
      const countRef = React.useRef(0);
      const anchorRef = React.useRef(null);
      const jumpRef = React.useRef(false);

      React.useEffect(() => {
        let cancelled = false;
        anchorRef.current = null;
        api('/api/dsh-dumps/stream?id=' + encodeURIComponent(sessionId))
          .then((body) => {
            if (cancelled) return;
            setData(body);
            setSegment(body.segments.length > 0 ? body.segments[0].index : 0);
          })
          .catch((cause) => setError(String(cause.message || cause)));
        return () => {
          cancelled = true;
        };
      }, [sessionId]);

      React.useEffect(() => {
        if (typeof onClose !== 'function') return undefined;
        const onKey = (event) => {
          if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, [onClose]);

      const segmentEntries = React.useMemo(
        () => (data ? data.entries.filter((entry) => entry.segment === segment) : []),
        [data, segment],
      );
      const entries = React.useMemo(
        () => segmentEntries.filter((entry) => !hidden.has(entry.type)),
        [segmentEntries, hidden],
      );
      React.useEffect(() => {
        setPage(60);
        anchorRef.current = null;
        const el = scrollerRef.current || listRef.current;
        if (el) el.scrollTop = 0;
      }, [segment, hidden]);
      const visible = entries.slice(0, page);
      countRef.current = entries.length;

      // The tab renders inside the conversation's own scrollport, so the
      // scrolling element is an ancestor there and this list in the overlay.
      // Find whichever actually scrolls, attach the paging listener to it, and
      // start at the top (the chat tab leaves that scroller far down the page).
      React.useEffect(() => {
        const node = listRef.current;
        if (!node) return undefined;
        const scrolls = (element) => {
          const style = window.getComputedStyle(element);
          return style.overflowY === 'auto' || style.overflowY === 'scroll';
        };
        let element = node;
        while (element && element !== document.body) {
          if (scrolls(element) && element.scrollHeight > element.clientHeight + 1) break;
          element = element.parentElement;
        }
        if (!element || element === document.body) {
          element = node.parentElement;
          while (element && element !== document.body && !scrolls(element)) element = element.parentElement;
        }
        if (!element || element === document.body) element = node;
        scrollerRef.current = element;
        element.scrollTop = 0;
        const onScroll = () => {
          if (element.scrollTop + element.clientHeight < element.scrollHeight - 48) return;
          setPage((current) => (current < countRef.current ? Math.min(current + 100, countRef.current) : current));
        };
        element.addEventListener('scroll', onScroll, { passive: true });
        return () => element.removeEventListener('scroll', onScroll);
      }, [data, segment, hidden]);

      // The jump renders every page at once, so the scroll has to wait for the
      // new rows to exist; the layout effect runs right after that commit.
      React.useLayoutEffect(() => {
        if (!jumpRef.current) return;
        jumpRef.current = false;
        const el = scrollerRef.current || listRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      }, [page]);

      const jumpToEnd = () => {
        const el = scrollerRef.current || listRef.current;
        if (page >= entries.length) {
          if (el) el.scrollTop = el.scrollHeight;
          return;
        }
        jumpRef.current = true;
        setPage(entries.length);
      };

      const counts = React.useMemo(() => {
        const acc = {};
        for (const entry of segmentEntries) acc[entry.type] = (acc[entry.type] || 0) + 1;
        return acc;
      }, [segmentEntries]);

      const loadDetail = async (index) => {
        if (details[index] !== undefined) return;
        try {
          const body = await api('/api/dsh-dumps/entry?id=' + encodeURIComponent(sessionId) + '&i=' + index);
          setDetails((current) => ({ ...current, [index]: body.entry }));
        } catch (cause) {
          notify(t('ui.loadEntryFailed', { message: String(cause.message || cause) }));
        }
      };

      const toggleExpand = (index) => {
        setExpanded((current) => {
          const next = new Set(current);
          if (next.has(index)) next.delete(index);
          else {
            next.add(index);
            void loadDetail(index);
          }
          return next;
        });
      };

      const toggle = (index) => {
        anchorRef.current = index;
        setSelected((current) => {
          const next = new Set(current);
          if (next.has(index)) next.delete(index);
          else next.add(index);
          return next;
        });
      };

      // Shift+click marks the span between the last plain click and the target.
      // `entries` is already the visible order, so a hidden type is never swept
      // in by a range, and an anchor that dropped out of it falls back to a
      // single selection instead of inventing a span.
      const selectRange = (target) => {
        const anchor = anchorRef.current;
        const from = anchor === null ? -1 : entries.findIndex((entry) => entry.index === anchor);
        const to = entries.findIndex((entry) => entry.index === target);
        if (from < 0 || to < 0) {
          anchorRef.current = target;
          setSelected((current) => new Set(current).add(target));
          return;
        }
        const range = entries.slice(Math.min(from, to), Math.max(from, to) + 1).map((entry) => entry.index);
        setSelected((current) => {
          const next = new Set(current);
          const all = range.every((index) => next.has(index));
          for (const index of range) {
            if (all) next.delete(index);
            else next.add(index);
          }
          return next;
        });
      };

      const typeSelected = (type) => {
        const list = entries.filter((entry) => entry.type === type);
        return list.length > 0 && list.every((entry) => selected.has(entry.index));
      };

      const toggleType = (type) => {
        const list = entries.filter((entry) => entry.type === type);
        const all = list.length > 0 && list.every((entry) => selected.has(entry.index));
        setSelected((current) => {
          const next = new Set(current);
          for (const entry of list) {
            if (all) next.delete(entry.index);
            else next.add(entry.index);
          }
          return next;
        });
      };

      const toggleHidden = (type) => {
        setHidden((current) => {
          const next = new Set(current);
          if (next.has(type)) next.delete(type);
          else next.add(type);
          return next;
        });
      };

      const allSelected = entries.length > 0 && entries.every((entry) => selected.has(entry.index));
      const toggleAll = () => {
        setSelected((current) => {
          const next = new Set(current);
          if (allSelected) for (const entry of entries) next.delete(entry.index);
          else for (const entry of entries) next.add(entry.index);
          return next;
        });
      };

      const exportAs = async (kind) => {
        if (selected.size === 0) return notify(t('ui.selectFirst'));
        setBusy(true);
        try {
          const body = await api('/api/dsh-dumps/export', {
            method: 'POST',
            body: JSON.stringify({ kind, id: sessionId, entries: [...selected] }),
          });
          notify(t('ui.exported', { files: body.files.length, bytes: formatBytes(body.totalBytes) }), body.folder);
        } catch (cause) {
          notify(t('ui.exportFailed', { message: String(cause.message || cause) }));
        } finally {
          setBusy(false);
        }
      };

      const panel = h(
        'div',
        {
          style: embedded
            ? { width: '100%', display: 'flex', flexDirection: 'column', background: 'transparent', color: T.fg }
            : { width: 'min(1120px, 95vw)', height: '88vh', display: 'flex', flexDirection: 'column', background: T.bg, border: '1px solid ' + T.border, borderRadius: 12, overflow: 'hidden', color: T.fg, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' },
        },
            // Sticky chrome while mounted as a tab; `display: contents` in the
            // overlay keeps the original flex layout untouched.
            h(
              'div',
              {
                style: embedded
                  ? { position: 'sticky', top: 0, zIndex: 6, background: 'var(--dsw-alias-bg-base)' }
                  : { display: 'contents' },
              },
            // header (overlay only: the tab already shows the session above)
            typeof onClose === 'function'
              ? h(
                  'div',
                  { style: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid ' + T.border } },
                  h('div', { style: { flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, (data && data.meta && data.meta.title) || title || t('ui.panelTitle')),
                  h(Btn, { small: true, onClick: onClose }, '✕'),
                )
              : null,
            // tabs (only when the stream broke)
            data && data.segments.length > 1
              ? h(
                  'div',
                  { style: { display: 'flex', gap: 4, padding: '6px 14px', borderBottom: '1px solid ' + T.border, flexWrap: 'wrap' } },
                  data.segments.map((item) =>
                    h(
                      'button',
                      {
                        key: item.index,
                        type: 'button',
                        onClick: () => {
                          setSegment(item.index);
                          setPage(60);
                        },
                        style: {
                          border: '1px solid ' + (segment === item.index ? 'var(--dsw-alias-brand-primary)' : T.border),
                          background: segment === item.index ? 'color-mix(in srgb, var(--dsw-alias-brand-primary) 14%, transparent)' : 'transparent',
                          color: segment === item.index ? T.fg : T.fg2,
                          borderRadius: 6,
                          padding: '3px 10px',
                          fontSize: 11,
                          cursor: 'pointer',
                        },
                      },
                      t('md.segment', { n: item.index + 1, from: item.fromSeq, to: item.toSeq }),
                    ),
                  ),
                )
              : null,
            // controls: selection, exports and view mode first, then the type filters
            h(
              'div',
              { style: { display: 'flex', gap: 8, alignItems: 'center', padding: '6px 14px', borderBottom: '1px solid ' + T.border, flexWrap: 'wrap', fontSize: 11, color: T.fg2 } },
              h('div', null, t('ui.selected', { count: selected.size })),
              h(Btn, { small: true, primary: true, onClick: () => exportAs('transcript'), disabled: busy || selected.size === 0 }, t('ui.exportTranscript')),
              h(Btn, { small: true, primary: true, onClick: () => exportAs('payload'), disabled: busy || selected.size === 0 }, t('ui.exportPayload')),
              h(
                'div',
                { style: { display: 'flex', gap: 2, border: '1px solid ' + T.border, borderRadius: 6, overflow: 'hidden', marginRight: 6 } },
                ['compact', 'detailed'].map((value) =>
                  h(
                    'button',
                    {
                      key: value,
                      type: 'button',
                      onClick: () => setMode(value),
                      style: {
                        border: 0,
                        padding: '4px 10px',
                        fontSize: 11,
                        cursor: 'pointer',
                        background: mode === value ? 'var(--dsw-alias-brand-primary)' : 'transparent',
                        color: mode === value ? '#fff' : T.fg2,
                      },
                    },
                    value === 'compact' ? t('ui.compact') : t('ui.detailed'),
                  ),
                ),
              ),
              h('span', null, t('ui.type')),
              TYPES.filter((type) => (counts[type] || 0) > 0).map((type) => {
                const count = counts[type] || 0;
                const off = hidden.has(type);
                return h(
                  'div',
                  {
                    key: type,
                    style: {
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      border: '1px solid ' + T.border,
                      borderRadius: 6,
                      padding: '2px 8px',
                      opacity: off ? 0.45 : 1,
                    },
                  },
                  h(Checkbox, { checked: typeSelected(type), onChange: () => toggleType(type), label: 'select ' + type }),
                  h(
                    'span',
                    {
                      onClick: () => toggleHidden(type),
                      title: off ? t('ui.showType') : t('ui.hideType'),
                      style: { cursor: 'pointer', color: TYPE_COLOR[type] || T.fg2, textDecoration: off ? 'line-through' : 'none' },
                    },
                    `${type} ${count}`,
                  ),
                );
              }),
              h('span', { style: { marginLeft: 'auto', opacity: 0.7 } }, t('ui.typeHint')),
            ),
            // list head
            h(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderBottom: '1px solid ' + T.border, fontSize: 11, color: T.fg2, background: T.layer } },
              h(Checkbox, { checked: allSelected, onChange: toggleAll, label: 'select all entries' }),
              h('span', null, t('ui.selectSegment')),
              h('span', { style: { opacity: 0.7 } }, t('ui.shiftHint')),
              h('span', { style: { marginLeft: 'auto' } }, t('ui.rendered', { visible: visible.length, total: entries.length }) + (data ? ` · ${data.requestCount} ${t('ui.requests')}` : '')),
              h(Btn, {
                small: true,
                title: t('ui.jumpTitle'),
                onClick: jumpToEnd,
              }, t('ui.jumpBottom')),
            ),
            ),
            // entries
            h(
              'div',
              {
                ref: listRef,
                style: embedded
                  ? { padding: '6px 14px' }
                  : { flex: 1, overflow: 'auto', padding: '6px 14px' },
              },
              error
                ? h(
                    'div',
                    { style: { color: embedded ? T.fg2 : T.danger, fontSize: 12 } },
                    embedded && !data ? t('ui.tabEmpty') : error,
                  )
                : null,
              !data ? h('div', { style: { color: T.fg2, fontSize: 12, padding: 8 } }, t('ui.loading')) : null,
              visible.map((entry) => {
                const isOpen = expanded.has(entry.index);
                const detail = details[entry.index];
                return h(
                  'div',
                  { key: entry.index, style: { borderBottom: '1px solid ' + T.border, padding: '6px 0' } },
                  h(
                    'div',
                    { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                    h(Checkbox, {
                      checked: selected.has(entry.index),
                      onChange: (event) => (shiftOf(event) ? selectRange(entry.index) : toggle(entry.index)),
                      label: 'entry ' + entry.index,
                    }),
                    h(
                      'span',
                      { style: { fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: TYPE_COLOR[entry.type] || T.fg2, width: 76, flex: '0 0 auto', textTransform: 'uppercase' } },
                      entry.type,
                    ),
                    entry.tail
                      ? h(
                          'span',
                          {
                            title: entry.interrupted
                              ? t('ui.tailTitleInterrupted')
                              : t('ui.tailTitle'),
                            style: {
                              fontSize: 10,
                              color: entry.interrupted ? T.danger : T.success,
                              border: '1px solid ' + T.border,
                              borderRadius: 4,
                              padding: '0 4px',
                              flex: '0 0 auto',
                            },
                          },
                          entry.interrupted ? t('ui.tailInterrupted') : t('ui.tail'),
                        )
                      : null,
                    h(
                      'div',
                      {
                        onClick: (event) =>
                          shiftOf(event) ? selectRange(entry.index) : toggleExpand(entry.index),
                        // A shift click would otherwise extend the document's text
                        // selection across every row between the two clicks.
                        onMouseDown: (event) => {
                          if (shiftOf(event)) event.preventDefault();
                        },
                        style: { flex: 1, minWidth: 0, cursor: 'pointer', color: isOpen ? T.fg : T.fg2, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
                        title: entry.summary,
                      },
                      entry.summary,
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        onClick: () => toggleExpand(entry.index),
                        style: { border: 0, background: 'transparent', color: T.fg2, cursor: 'pointer', fontSize: 11, padding: '0 4px' },
                      },
                      isOpen ? '▾' : '▸',
                    ),
                  ),
                  isOpen
                    ? h(
                        'div',
                        { style: { margin: '6px 0 0 96px', border: '1px solid ' + T.border, borderRadius: 6, padding: 8, background: T.layer } },
                        !detail
                          ? h('div', { style: { color: T.fg2, fontSize: 11 } }, t('ui.loading'))
                          : mode === 'compact'
                            ? h(CompactBody, { entry: detail })
                            : h(DetailedBody, { entry: detail }),
                      )
                    : null,
                );
              }),
              entries.length > visible.length
                ? h(
                    'div',
                    {
                      onClick: () => setPage((current) => Math.min(current + 100, entries.length)),
                      style: { padding: '10px 0', color: T.fg2, fontSize: 11, cursor: 'pointer' },
                    },
                    t('ui.moreToLoad', { visible: visible.length, total: entries.length }),
                  )
                : entries.length > 0
                  ? h('div', { style: { padding: '10px 0', color: T.fg2, fontSize: 11, opacity: 0.6 } }, t('ui.allLoaded'))
                  : null,
            ),
            // footer
            h(
              'div',
              { style: { padding: '8px 14px', borderTop: '1px solid ' + T.border, fontSize: 11, color: T.fg2 } },
              data ? `segments ${data.segments.length} · entries ${data.entries.length} · requests ${data.requestCount}` : '',
            ),
      );

      if (embedded) return panel;
      return ReactDOM.createPortal(
        h(
          'div',
          { style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 } },
          panel,
        ),
        document.body,
      );
    }

    /** Overlay wrapper kept for the panel's 查看 action. */
    function Viewer(props) {
      return h(EntryStream, props);
    }

    function Toast({ text, folder, onClose }) {
      React.useEffect(() => {
        const timer = setTimeout(onClose, 6000);
        return () => clearTimeout(timer);
      }, [onClose]);
      return ReactDOM.createPortal(
        h(
          'div',
          {
            style: {
              position: 'fixed',
              bottom: 20,
              left: '50%',
              transform: 'translateX(-50%)',
              background: T.bg,
              border: '1px solid ' + T.border,
              borderRadius: 8,
              padding: '8px 12px',
              zIndex: 10030,
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              fontSize: 12,
              color: T.fg,
              boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            },
          },
          h('span', null, text),
          folder
            ? h(
                Btn,
                {
                  small: true,
                  onClick: () => {
                    void api('/api/dsh-dumps/reveal', {
                      method: 'POST',
                      body: JSON.stringify({ which: 'exports' }),
                    }).catch(() => {});
                  },
                },
                t('ui.openFolder'),
              )
            : null,
          h(Btn, { small: true, onClick: onClose }, '✕'),
        ),
        document.body,
      );
    }

    /** Conversation View entry: the same stream, mounted as a tab. */
    function DumpView(props) {
      useLocaleTick();
      const [notice, setNotice] = React.useState(null);
      return h(
        React.Fragment,
        null,
        h(EntryStream, {
          sessionId: props.sessionId,
          embedded: true,
          notify: (text, folder) => setNotice({ text, folder }),
        }),
        notice ? h(Toast, { text: notice.text, folder: notice.folder, onClose: () => setNotice(null) }) : null,
      );
    }

    // ----------------------------------------------------------------- panel

    function SessionRow(props) {
      const { session, onView, onReveal, onDelete } = props;
      useLocaleTick();
      const [confirm, setConfirm] = React.useState(false);
      return h(
        'div',
        {
          style: {
            display: 'grid',
            gridTemplateColumns: '1fr 64px 84px 108px 196px',
            alignItems: 'center',
            gap: 8,
            padding: '7px 14px',
            fontSize: 12,
            borderBottom: '1px solid ' + T.border,
          },
        },
        h(
          'div',
          { style: { minWidth: 0 } },
          h('div', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, title: session.title || session.id }, session.title || session.id),
          h('div', { style: { fontSize: 10, color: T.fg2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, title: session.workspace || '' }, shortPath(session.workspace) || session.id),
        ),
        h('div', { style: { textAlign: 'right', color: T.fg2, fontVariantNumeric: 'tabular-nums' } }, String(session.requests)),
        h('div', { style: { textAlign: 'right', color: T.fg2, fontVariantNumeric: 'tabular-nums' } }, formatBytes(session.bytes)),
        h('div', { style: { textAlign: 'right', color: T.fg2 } }, formatDate(session.lastAt)),
        h(
          'div',
          { style: { display: 'flex', gap: 4, justifyContent: 'flex-end' } },
          h(Btn, { small: true, onClick: onView }, t('ui.view')),
          h(Btn, { small: true, onClick: onReveal }, t('ui.folder')),
          confirm ? h(Btn, { small: true, danger: true, onClick: onDelete }, t('ui.confirm')) : h(Btn, { small: true, onClick: () => setConfirm(true) }, t('ui.delete')),
        ),
      );
    }

    function DumpPanel(props) {
      useLocaleTick();
      const [data, setData] = React.useState({ total: 0, exports: { bytes: 0, files: 0 }, sessions: [], root: '' });
      const [viewer, setViewer] = React.useState(null);
      const [toast, setToast] = React.useState(null);
      const [error, setError] = React.useState('');

      const load = React.useCallback(async () => {
        try {
          const body = await api('/api/dsh-dumps/overview');
          setData({ total: body.total, exports: body.exports || { bytes: 0, files: 0 }, sessions: body.sessions, root: body.root });
          setError('');
        } catch (cause) {
          setError(String(cause.message || cause));
        }
      }, []);

      React.useEffect(() => {
        load();
        const timer = setInterval(load, 30000);
        return () => clearInterval(timer);
      }, [load]);

      React.useEffect(() => {
        const onKey = (event) => {
          if (event.key === 'Escape' && !viewer) props.onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, [viewer, props]);

      const notify = React.useCallback((message, folder) => setToast({ message, folder }), []);

      const reveal = async (payload) => {
        try {
          await api('/api/dsh-dumps/reveal', { method: 'POST', body: JSON.stringify(payload) });
        } catch (cause) {
          notify(t('ui.revealFailed', { message: String(cause.message || cause) }));
        }
      };

      const removeSession = async (id) => {
        try {
          const body = await api('/api/dsh-dumps/delete', { method: 'POST', body: JSON.stringify({ id }) });
          setData({ total: body.total, exports: body.exports || { bytes: 0, files: 0 }, sessions: body.sessions, root: body.root });
          notify(t('ui.deleted', { id: id.slice(0, 12) }));
        } catch (cause) {
          notify(t('ui.deleteFailed', { message: String(cause.message || cause) }));
        }
      };

      const dates = data.sessions.map((session) => session.lastAt).filter(Boolean).sort();
      const range = dates.length > 0 ? formatDate(dates[0]) + ' — ' + formatDate(dates[dates.length - 1]) : '';
      const totalRequests = data.sessions.reduce((sum, session) => sum + session.requests, 0);

      return ReactDOM.createPortal(
        h(
          'div',
          { style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 } },
          h(
            'div',
            { style: { width: 'min(980px, 94vw)', maxHeight: '86vh', display: 'flex', flexDirection: 'column', background: T.bg, color: T.fg, border: '1px solid ' + T.border, borderRadius: 12, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' } },
            h(
              'div',
              { style: { padding: '12px 14px 8px', borderBottom: '1px solid ' + T.border } },
              h(
                'div',
                { style: { display: 'flex', alignItems: 'baseline', gap: 10 } },
                h('div', { style: { fontSize: 14, fontWeight: 600 } }, t('ui.panelTitle')),
                h('div', { style: { fontSize: 11, color: T.fg2 } }, `${t('ui.dumps')} ${formatBytes(data.total)} · ${t('ui.exports')} ${formatBytes(data.exports.bytes)} · ${t('ui.sessionCount', { count: data.sessions.length })} · ${totalRequests} ${t('ui.requests')}`),
                h('div', { style: { fontSize: 11, color: T.fg2, marginLeft: 'auto' } }, range),
                h(Btn, { small: true, onClick: props.onClose }, '✕'),
              ),
              h(
                'div',
                { style: { display: 'flex', gap: 6, marginTop: 8 } },
                h(Btn, { small: true, onClick: () => reveal({ which: 'root' }) }, t('ui.openData')),
                h(Btn, { small: true, onClick: () => reveal({ which: 'exports' }) }, t('ui.openExports')),
              ),
            ),
            h(
              'div',
              { style: { display: 'grid', gridTemplateColumns: '1fr 64px 84px 108px 196px', gap: 8, padding: '6px 14px', fontSize: 11, color: T.fg2, borderBottom: '1px solid ' + T.border, background: T.layer } },
              h('div', null, t('ui.colSession')),
              h('div', { style: { textAlign: 'right' } }, t('ui.colRequests')),
              h('div', { style: { textAlign: 'right' } }, t('ui.colSize')),
              h('div', { style: { textAlign: 'right' } }, t('ui.colLastWrite')),
              h('div', { style: { textAlign: 'right' } }, t('ui.colActions')),
            ),
            h(
              'div',
              { style: { flex: 1, overflow: 'auto' } },
              error ? h('div', { style: { padding: 14, color: T.danger, fontSize: 12 } }, error) : null,
              data.sessions.length === 0
                ? h('div', { style: { padding: 24, textAlign: 'center', color: T.fg2, fontSize: 12 } }, t('ui.empty'))
                : data.sessions.map((session) =>
                    h(SessionRow, {
                      key: session.id,
                      session,
                      onView: () => setViewer({ id: session.id, title: session.title }),
                      onReveal: () => reveal({ id: session.id }),
                      onDelete: () => removeSession(session.id),
                    }),
                  ),
            ),
            h(
              'div',
              { style: { display: 'flex', justifyContent: 'space-between', padding: '8px 14px', borderTop: '1px solid ' + T.border, fontSize: 11, color: T.fg2 } },
              h('span', null, t('ui.sessionCount', { count: data.sessions.length })),
              h('span', { title: data.root }, shortPath(data.root)),
            ),
          ),
          toast
            ? h(
                'div',
                { style: { position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: T.bg, border: '1px solid ' + T.border, borderRadius: 8, padding: '8px 12px', zIndex: 10003, display: 'flex', gap: 10, alignItems: 'center', fontSize: 12, color: T.fg, boxShadow: '0 8px 24px rgba(0,0,0,0.35)' } },
                h('span', null, toast.message),
                toast.folder ? h(Btn, { small: true, onClick: () => reveal({ which: 'exports' }) }, t('ui.openFolder')) : null,
                h(Btn, { small: true, onClick: () => setToast(null) }, '✕'),
              )
            : null,
          viewer
            ? h(Viewer, {
                sessionId: viewer.id,
                title: viewer.title,
                onClose: () => {
                  setViewer(null);
                  load();
                },
                notify,
              })
            : null,
        ),
        document.body,
      );
    }

    // ------------------------------------------------------------- sidebar entry

    function DumpManagerEntry(props) {
      useLocaleTick();
      const [open, setOpen] = React.useState(false);
      const [sizes, setSizes] = React.useState({ dumps: 0, exports: 0 });
      const wide = props && props.wide !== false;

      React.useEffect(() => {
        let cancelled = false;
        const load = () =>
          api('/api/dsh-dumps/overview')
            .then((body) => {
              if (!cancelled) setSizes({ dumps: body.total || 0, exports: (body.exports && body.exports.bytes) || 0 });
            })
            .catch(() => {});
        load();
        const timer = setInterval(load, 30000);
        return () => {
          cancelled = true;
          clearInterval(timer);
        };
      }, []);

      return h(
        React.Fragment,
        null,
        h(
          'button',
          {
            type: 'button',
            title: t('ui.dumps') + ': ' + formatBytes(sizes.dumps) + '\n' + t('ui.exports') + ': ' + formatBytes(sizes.exports),
            onClick: () => setOpen(true),
            style: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', border: 0, borderRadius: 6, background: 'transparent', color: T.fg2, font: 'inherit', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' },
          },
          h('span', { style: { width: 6, height: 6, borderRadius: 3, background: T.brand } }),
          wide ? h('span', null, t('ui.dumps') + ' ' + formatBytes(sizes.dumps), h('span', { style: { opacity: 0.6 } }, ' · '), t('ui.exports') + ' ' + formatBytes(sizes.exports)) : null,
        ),
        open ? h(DumpPanel, { onClose: () => setOpen(false) }) : null,
      );
    }

    // ------------------------------------------------- newest-turn export

    function usePrefs() {
      const [prefs, setPrefs] = React.useState(null);
      const [error, setError] = React.useState('');
      const refresh = React.useCallback(async () => {
        try {
          const body = await api('/api/dsh-dumps/prefs');
          setPrefs(body.prefs);
          setError('');
        } catch (cause) {
          setError(String(cause.message || cause));
        }
      }, []);
      React.useEffect(() => {
        void refresh();
      }, [refresh]);
      const update = React.useCallback(async (patch) => {
        try {
          const body = await api('/api/dsh-dumps/prefs', {
            method: 'POST',
            body: JSON.stringify({ export: patch }),
          });
          setPrefs(body.prefs);
          setError('');
          return body.prefs;
        } catch (cause) {
          setError(String(cause.message || cause));
          return null;
        }
      }, []);
      return [prefs, update, error, refresh];
    }

    const FALLBACK_EXPORT = { includeUserInput: true, includeTools: true, includeInjected: false, format: 'md' };

    function exportPrefsOf(prefs) {
      return (prefs && prefs.export) || FALLBACK_EXPORT;
    }

    function MenuRow(props) {
      return h(
        'button',
        {
          type: 'button',
          onClick: props.onClick,
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '6px 10px',
            border: 0,
            borderRadius: 5,
            background: 'transparent',
            color: T.fg,
            font: 'inherit',
            fontSize: 12,
            textAlign: 'left',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          },
        },
        h('span', { style: { width: 12, color: T.brand } }, props.checked ? '✓' : ''),
        props.label,
      );
    }

    /** Split button beside the session title: export the newest turn, plus its options. */
    function ExportTurnAction(props) {
      useLocaleTick();
      const sessionId = props.sessionId;
      const [prefs, updatePrefs, , refreshPrefs] = usePrefs();
      const [open, setOpen] = React.useState(false);
      const [busy, setBusy] = React.useState(false);
      const [rect, setRect] = React.useState(null);
      const [notice, setNotice] = React.useState(null);
      const [dialog, setDialog] = React.useState(null);
      const [viewerOpen, setViewerOpen] = React.useState(false);
      const buttonRef = React.useRef(null);
      const current = exportPrefsOf(prefs);

      React.useEffect(() => {
        if (!notice) return undefined;
        const timer = setTimeout(() => setNotice(null), 6000);
        return () => clearTimeout(timer);
      }, [notice]);

      const run = React.useCallback(async () => {
        if (busy || !sessionId) return;
        setBusy(true);
        try {
          const response = await fetch('/api/dsh-dumps/latest', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ id: sessionId, lang: activeLang }),
            signal: AbortSignal.timeout(30000),
          });
          const body = await response.json().catch(() => ({}));
          if (response.ok && body.ok) {
            setNotice({ text: t('ui.exported', { files: 1, bytes: formatBytes(body.bytes) }), folder: body.folder });
          } else if (
            body.code === 'FORK' ||
            body.code === 'NO_USER' ||
            body.code === 'NO_DUMP' ||
            body.code === 'EMPTY'
          ) {
            setDialog({ text: body.error });
          } else {
            setNotice({ text: t('ui.exportFailed', { message: body.error || 'HTTP ' + response.status }) });
          }
        } catch (cause) {
          setNotice({ text: t('ui.exportFailed', { message: String(cause.message || cause) }) });
        } finally {
          setBusy(false);
        }
      }, [busy, sessionId]);

      const toggleOption = (key) => updatePrefs({ [key]: !current[key] });

      const menu =
        open && rect
          ? ReactDOM.createPortal(
              h(
                React.Fragment,
                null,
                h('div', {
                  onClick: () => setOpen(false),
                  style: { position: 'fixed', inset: 0, zIndex: 10020 },
                }),
                h(
                  'div',
                  {
                    style: {
                      position: 'fixed',
                      top: rect.bottom + 6,
                      right: Math.max(8, window.innerWidth - rect.right),
                      zIndex: 10021,
                      minWidth: 210,
                      background: T.bg,
                      border: '1px solid ' + T.border,
                      borderRadius: 8,
                      padding: 4,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                    },
                  },
                  h(MenuRow, {
                    checked: current.includeUserInput,
                    label: t('ui.menuIncludeUserInput'),
                    onClick: () => toggleOption('includeUserInput'),
                  }),
                  h(MenuRow, {
                    checked: current.includeTools,
                    label: t('ui.menuIncludeTools'),
                    onClick: () => toggleOption('includeTools'),
                  }),
                  h(MenuRow, {
                    checked: current.includeInjected,
                    label: t('ui.menuIncludeInjected'),
                    onClick: () => toggleOption('includeInjected'),
                  }),
                  h('div', { style: { height: 1, background: T.border, margin: '4px 0' } }),
                  h(MenuRow, {
                    checked: true,
                    label:
                      t('ui.menuFormat') +
                      ': ' +
                      (current.format === 'md' ? 'Markdown' : 'JSON'),
                    onClick: () => updatePrefs({ format: current.format === 'md' ? 'json' : 'md' }),
                  }),
                ),
              ),
              document.body,
            )
          : null;

      const dialogEl = dialog
        ? ReactDOM.createPortal(
            h(
              'div',
              {
                style: {
                  position: 'fixed',
                  inset: 0,
                  zIndex: 10030,
                  background: 'rgba(0,0,0,0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                },
              },
              h(
                'div',
                {
                  style: {
                    width: 440,
                    maxWidth: '90vw',
                    background: T.bg,
                    border: '1px solid ' + T.border,
                    borderRadius: 10,
                    padding: 16,
                    color: T.fg,
                    fontSize: 12,
                  },
                },
                h('div', { style: { fontWeight: 600, marginBottom: 8 } }, t('ui.exportTurn')),
                h('div', { style: { lineHeight: 1.6, color: T.fg2 } }, dialog.text),
                h(
                  'div',
                  { style: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 } },
                  h(
                    Btn,
                    {
                      small: true,
                      onClick: () => {
                        setDialog(null);
                        setViewerOpen(true);
                      },
                    },
                    t('ui.openViewer'),
                  ),
                  h(Btn, { small: true, onClick: () => setDialog(null) }, t('ui.close')),
                ),
              ),
            ),
            document.body,
          )
        : null;

      const toastEl = notice
        ? ReactDOM.createPortal(
            h(
              'div',
              {
                style: {
                  position: 'fixed',
                  bottom: 20,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: T.bg,
                  border: '1px solid ' + T.border,
                  borderRadius: 8,
                  padding: '8px 12px',
                  zIndex: 10030,
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  fontSize: 12,
                  color: T.fg,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                },
              },
              h('span', null, notice.text),
              notice.folder
                ? h(
                    Btn,
                    {
                      small: true,
                      onClick: () => {
                        void api('/api/dsh-dumps/reveal', {
                          method: 'POST',
                          body: JSON.stringify({ which: 'exports' }),
                        }).catch(() => {});
                      },
                    },
                    t('ui.openFolder'),
                  )
                : null,
              h(Btn, { small: true, onClick: () => setNotice(null) }, '✕'),
            ),
            document.body,
          )
        : null;

      return h(
        React.Fragment,
        null,
        h(
          'div',
          {
            style: {
              display: 'inline-flex',
              alignItems: 'center',
              gap: 2,
              flex: '0 0 auto',
            },
          },
          h(
            'button',
            {
              ref: buttonRef,
              type: 'button',
              title: t('ui.exportTurnTitle'),
              disabled: busy,
              onClick: run,
              style: {
                border: 0,
                background: 'transparent',
                color: T.fg2,
                font: 'inherit',
                fontSize: 12,
                lineHeight: '18px',
                minHeight: 28,
                padding: '3px 2px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                cursor: busy ? 'default' : 'pointer',
                whiteSpace: 'nowrap',
                opacity: busy ? 0.6 : 1,
              },
            },
            t('ui.exportTurn'),
          ),
          h(
            'button',
            {
              type: 'button',
              'aria-label': t('ui.menuFormat'),
              'aria-expanded': open ? 'true' : 'false',
              onClick: () => {
                if (buttonRef.current) setRect(buttonRef.current.getBoundingClientRect());
                void refreshPrefs();
                setOpen((value) => !value);
              },
              style: {
                border: 0,
                background: 'transparent',
                color: T.fg2,
                minHeight: 28,
                padding: '3px 2px',
                display: 'inline-flex',
                alignItems: 'center',
                cursor: 'pointer',
              },
            },
            h(
              'span',
              {
                style: {
                  display: 'inline-flex',
                  transition: 'transform .12s',
                  transform: open ? 'rotate(180deg)' : 'none',
                },
              },
              ChevronDown ? h(ChevronDown, {}) : h('span', { style: { fontSize: 14, lineHeight: '14px' } }, '▾'),
            ),
          ),
        ),
        menu,
        dialogEl,
        toastEl,
        viewerOpen && sessionId
          ? h(Viewer, {
              sessionId,
              title: '',
              onClose: () => setViewerOpen(false),
              notify: (text, folder) => setNotice({ text, folder }),
            })
          : null,
      );
    }

    // -------------------------------------------------------- settings page

    /** In-app directory browser: the composed picker serves `browse`, not a native dialog. */
    function DirectoryPickerModal({ start, onPick, onClose }) {
      useLocaleTick();
      const [listing, setListing] = React.useState(null);
      const [error, setError] = React.useState('');
      const [busy, setBusy] = React.useState(false);
      const [rootsMode, setRootsMode] = React.useState(false);
      const [roots, setRoots] = React.useState(null);
      const [pathDraft, setPathDraft] = React.useState('');
      const [uncHint, setUncHint] = React.useState('');
      const [createOpen, setCreateOpen] = React.useState(false);
      const [createName, setCreateName] = React.useState('');
      const [createError, setCreateError] = React.useState('');
      const [creating, setCreating] = React.useState(false);
      const rootsRef = React.useRef(null);
      rootsRef.current = roots;

      const loadRoots = React.useCallback(async () => {
        if (rootsRef.current) return;
        try {
          setRoots(await api('/api/dsh-dumps/roots'));
        } catch {
          /* the picker still browses without the drive list */
        }
      }, []);

      React.useEffect(() => {
        void loadRoots();
      }, [loadRoots]);

      const load = React.useCallback(async (path) => {
        if (!workspaceFace || typeof workspaceFace.listDirectory !== 'function') return;
        setRootsMode(false);
        setBusy(true);
        setError('');
        setUncHint('');
        try {
          // `fs` cannot list a bare UNC root — that needs share enumeration,
          // which the host does with `net view`.
          const unc = typeof path === 'string' ? /^\\\\[^\\/]+\\?$/.exec(path) : null;
          if (unc) {
            const host = path.replace(/^\\\\/, '').replace(/\\+$/, '');
            const response = await fetch('/api/dsh-dumps/shares?host=' + encodeURIComponent(host));
            const body = await response.json().catch(() => ({}));
            const base = {
              path: '\\\\' + host + '\\',
              home: rootsRef.current ? rootsRef.current.home : '',
              crumbs: [],
              entries: [],
              unc: true,
            };
            if (!body.ok) {
              setListing(base);
              setUncHint(t('ui.pickUncHint'));
              setError(String(body.error || ''));
            } else {
              setListing({
                ...base,
                crumbs: [{ name: '\\\\' + host, path: '\\\\' + host + '\\' }],
                entries: body.shares,
              });
            }
            return;
          }
          const result = await workspaceFace.listDirectory(path);
          setListing(result);
        } catch (cause) {
          setError(t('ui.settingsPickFailed', { message: String(cause.message || cause) }));
        } finally {
          setBusy(false);
        }
      }, []);

      const openRoots = React.useCallback(async () => {
        setRootsMode(true);
        setError('');
        void loadRoots();
      }, [loadRoots]);

      const createFolder = async () => {
        if (!listing || listing.unc || !workspaceFace || typeof workspaceFace.createDirectory !== 'function') return;
        const name = createName.trim();
        if (name === '') return;
        setCreating(true);
        setCreateError('');
        try {
          const created = await workspaceFace.createDirectory(listing.path, name);
          setCreateOpen(false);
          await load(typeof created === 'string' && created !== '' ? created : listing.path);
        } catch (cause) {
          setCreateError(t('ui.pickDirCreateFailed', { message: String(cause.message || cause) }));
        } finally {
          setCreating(false);
        }
      };

      React.useEffect(() => {
        void load(typeof start === 'string' && start.trim() !== '' ? start : undefined);
      }, [load, start]);

      React.useEffect(() => {
        if (listing) setPathDraft(listing.path);
      }, [listing]);

      const go = () => {
        const target = pathDraft.trim();
        void load(target === '' ? undefined : target);
      };

      const parentPath = React.useMemo(() => {
        if (!listing) return null;
        const raw = String(listing.path).replace(/[\\/]+$/, '');
        if (raw === '') return null; // filesystem root
        if (/^[A-Za-z]:$/.test(raw)) return null; // drive root
        if (/^\\\\[^\\/]+$/.test(raw)) return null; // UNC server root
        const index = Math.max(raw.lastIndexOf('\\'), raw.lastIndexOf('/'));
        if (index <= 0) return null;
        const parent = raw.slice(0, index);
        return /^[A-Za-z]:$/.test(parent) ? parent + '\\' : parent;
      }, [listing]);

      const goUp = () => {
        if (rootsMode) return;
        if (parentPath) void load(parentPath);
        else void openRoots();
      };

      const listingEntries = listing && Array.isArray(listing.entries) ? listing.entries : [];
      const crumbs = listing && Array.isArray(listing.crumbs) ? listing.crumbs : [];
      const isWindows = Boolean(roots && roots.platform === 'win32');
      const rootLabel = isWindows ? t('ui.pickDirThisPc') : t('ui.pickDirRoot');

      const createDialog = h(
        'div',
        {
          style: {
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          },
        },
        h(
          'div',
          {
            style: {
              width: 420,
              maxWidth: '86vw',
              background: T.bg,
              border: '1px solid ' + T.border,
              borderRadius: 10,
              padding: 16,
              color: T.fg,
              fontSize: 12,
            },
          },
          h('div', { style: { fontWeight: 600, marginBottom: 6 } }, t('ui.pickDirNew')),
          h(
            'div',
            { style: { color: T.fg2, fontSize: 11, marginBottom: 8, wordBreak: 'break-all' } },
            listing ? listing.path : '',
          ),
          h('input', {
            value: createName,
            autoFocus: true,
            onChange: (event) => setCreateName(event.target.value),
            onKeyDown: (event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void createFolder();
              }
            },
            spellCheck: false,
            style: {
              width: '100%',
              boxSizing: 'border-box',
              background: 'transparent',
              border: '1px solid ' + T.border,
              borderRadius: 6,
              padding: '5px 8px',
              color: T.fg,
              font: 'inherit',
              fontSize: 12,
            },
          }),
          createError ? h('div', { style: { marginTop: 8, color: T.danger, lineHeight: 1.6 } }, createError) : null,
          h(
            'div',
            { style: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 } },
            h(
              Btn,
              {
                small: true,
                primary: true,
                disabled: creating || createName.trim() === '',
                onClick: () => void createFolder(),
              },
              t('ui.pickDirCreate'),
            ),
            h(Btn, { small: true, onClick: () => setCreateOpen(false) }, t('ui.settingsCancel')),
          ),
        ),
      );

      return ReactDOM.createPortal(
        h(
          'div',
          {
            style: {
              position: 'fixed',
              inset: 0,
              zIndex: 10040,
              background: 'rgba(0,0,0,0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            },
          },
          h(
            'div',
            {
              style: {
                width: 560,
                maxWidth: '92vw',
                height: 'min(520px, 80vh)',
                display: 'flex',
                flexDirection: 'column',
                background: T.bg,
                border: '1px solid ' + T.border,
                borderRadius: 10,
                color: T.fg,
                fontSize: 12,
                overflow: 'hidden',
              },
            },
            h(
              'div',
              { style: { display: 'flex', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid ' + T.border } },
              h('div', { style: { fontWeight: 600 } }, t('ui.pickDirTitle')),
              h('span', { style: { marginLeft: 'auto' } }),
              h(
                Btn,
                {
                  small: true,
                  // Closing the browser is a commit gesture: hand the current
                  // directory back so the caller can ask to save it.
                  onClick: () => onClose(rootsMode || !listing || listing.unc ? undefined : listing.path),
                },
                '✕',
              ),
            ),
            h(
              'div',
              { style: { display: 'flex', flexWrap: 'wrap', gap: 4, padding: '8px 14px', borderBottom: '1px solid ' + T.border, maxHeight: 96, overflow: 'auto' } },
              h(Btn, { small: true, strong: true, onClick: () => load(rootsRef.current && rootsRef.current.home ? rootsRef.current.home : undefined) }, t('ui.pickDirHome')),
              h(Btn, { small: true, strong: true, onClick: () => void openRoots() }, rootLabel),
              h(Btn, { small: true, strong: true, disabled: rootsMode, onClick: goUp }, t('ui.pickDirUp')),
              rootsMode
                ? h('span', { style: { color: T.fg2, padding: '0 4px' } }, rootLabel)
                : crumbs.map((crumb) =>
                    h(
                      'button',
                      {
                        key: crumb.path,
                        type: 'button',
                        onClick: () => load(crumb.path),
                        title: crumb.path,
                        style: {
                          border: 0,
                          background: 'transparent',
                          color: T.fg2,
                          fontSize: 11,
                          cursor: 'pointer',
                          padding: '2px 4px',
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        },
                      },
                      crumb.name || crumb.path,
                    ),
                  ),
            ),
            h(
              'div',
              { style: { flex: 1, overflow: 'auto', padding: '6px 8px' } },
              rootsMode
                ? h(
                    React.Fragment,
                    null,
                    !roots ? h('div', { style: { padding: 10, color: T.fg2 } }, t('ui.loading')) : null,
                    roots
                      ? (roots.roots || []).map((root) =>
                          h(
                            'button',
                            {
                              key: root.path,
                              type: 'button',
                              onClick: () => load(root.path),
                              title: root.path,
                              style: {
                                display: 'block',
                                width: '100%',
                                textAlign: 'left',
                                border: 0,
                                borderRadius: 5,
                                background: 'transparent',
                                color: T.fg,
                                font: 'inherit',
                                fontSize: 12,
                                padding: '5px 8px',
                                cursor: 'pointer',
                              },
                            },
                            root.name,
                          ),
                        )
                      : null,
                  )
                : h(
                    React.Fragment,
                    null,
                    busy ? h('div', { style: { padding: 10, color: T.fg2 } }, t('ui.loading')) : null,
                    error ? h('div', { style: { padding: 10, color: T.danger } }, error) : null,
                    uncHint
                      ? h('div', { style: { padding: '0 10px 10px', color: T.fg2, lineHeight: 1.6 } }, uncHint)
                      : null,
                    !busy && !error && listingEntries.length === 0
                      ? h('div', { style: { padding: 10, color: T.fg2 } }, t('ui.pickDirEmpty'))
                      : null,
                    listingEntries.map((entry) =>
                      h(
                        'button',
                        {
                          key: entry.path,
                          type: 'button',
                          onClick: () => load(entry.path),
                          title: entry.path,
                          style: {
                            display: 'block',
                            width: '100%',
                            textAlign: 'left',
                            border: 0,
                            borderRadius: 5,
                            background: 'transparent',
                            color: T.fg,
                            font: 'inherit',
                            fontSize: 12,
                            padding: '5px 8px',
                            cursor: 'pointer',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          },
                        },
                        entry.name,
                      ),
                    ),
                  ),
            ),
            h(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderTop: '1px solid ' + T.border } },
              h('input', {
                value: rootsMode ? '' : pathDraft,
                placeholder: rootsMode ? rootLabel : '',
                onChange: (event) => setPathDraft(event.target.value),
                onKeyDown: (event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    go();
                  }
                },
                spellCheck: false,
                style: {
                  flex: 1,
                  minWidth: 0,
                  background: 'transparent',
                  border: '1px solid ' + T.border,
                  borderRadius: 6,
                  padding: '5px 8px',
                  color: T.fg,
                  font: 'inherit',
                  fontSize: 11,
                },
              }),
              h(Btn, { small: true, disabled: rootsMode, onClick: go }, t('ui.pickDirGo')),
              typeof workspaceFace.createDirectory === 'function'
                ? h(
                    Btn,
                    {
                      small: true,
                      disabled: rootsMode || !listing || Boolean(listing && listing.unc),
                      title: rootsMode
                        ? t('ui.pickDirRootHint')
                        : listing && listing.unc
                          ? t('ui.pickDirSharedHint')
                          : undefined,
                      onClick: () => {
                        if (rootsMode || !listing || listing.unc) return;
                        setCreateName(t('ui.pickDirNewDefault'));
                        setCreateError('');
                        setCreateOpen(true);
                      },
                    },
                    t('ui.pickDirNew'),
                  )
                : null,
              h(
                Btn,
                {
                  small: true,
                  primary: true,
                  disabled: !listing || rootsMode || Boolean(listing && listing.unc),
                  onClick: () => {
                    if (listing && !rootsMode && !listing.unc) onPick(listing.path);
                  },
                },
                t('ui.pickDirChoose'),
              ),
              h(Btn, { small: true, onClick: () => onClose() }, t('ui.settingsCancel')),
            ),
          ),
          createOpen ? createDialog : null,
        ),
        document.body,
      );
    }

    function DumpSettingsPage() {
      useLocaleTick();
      const [prefs, updatePrefs, error] = usePrefs();
      const current = exportPrefsOf(prefs);
      const [capture, setCapture] = React.useState(null);
      const [draftPath, setDraftPath] = React.useState('');
      const [confirmPath, setConfirmPath] = React.useState(null);
      const [captureError, setCaptureError] = React.useState('');
      const [pickerOpen, setPickerOpen] = React.useState(false);

      const browse = () => setPickerOpen(true);

      const loadCapture = React.useCallback(async () => {
        try {
          const body = await api('/api/dsh-dumps/capture');
          setCapture(body);
          setDraftPath(body.capture.outputDir);
          setCaptureError('');
        } catch (cause) {
          setCaptureError(String(cause.message || cause));
        }
      }, []);

      React.useEffect(() => {
        void loadCapture();
      }, [loadCapture]);

      const saveCapture = async (patch) => {
        try {
          const body = await api('/api/dsh-dumps/capture', {
            method: 'POST',
            body: JSON.stringify(patch),
          });
          setCapture(body);
          setDraftPath(body.capture.outputDir);
          setCaptureError('');
        } catch (cause) {
          setCaptureError(String(cause.message || cause));
        }
      };

      const checkRow = (label, checked, onClick) =>
        h(
          'label',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 0',
              fontSize: 13,
              color: T.fg,
              cursor: 'pointer',
            },
          },
          h('input', {
            type: 'checkbox',
            checked: Boolean(checked),
            onChange: onClick,
            style: { width: 14, height: 14, accentColor: 'var(--dsw-alias-brand-primary)', cursor: 'pointer' },
          }),
          h('span', null, label),
        );

      const saved = capture && capture.capture;
      const pathChanged = saved !== null && draftPath.trim() !== saved.outputDir;

      return h(
        React.Fragment,
        null,
        h(
          'div',
          { style: { padding: '4px 0', maxWidth: 560 } },
        h('div', { style: { fontSize: 13, fontWeight: 600, marginBottom: 4 } }, t('ui.settingsTitle')),
        h('div', { style: { fontSize: 11, color: T.fg2, lineHeight: 1.6 } }, t('ui.settingsHint')),
        h('div', { style: { fontSize: 12, fontWeight: 600, margin: '16px 0 4px' } }, t('ui.settingsExportSection')),
        checkRow(t('ui.menuIncludeUserInput'), current.includeUserInput, () =>
          updatePrefs({ includeUserInput: !current.includeUserInput }),
        ),
        checkRow(t('ui.menuIncludeTools'), current.includeTools, () =>
          updatePrefs({ includeTools: !current.includeTools }),
        ),
        checkRow(t('ui.menuIncludeInjected'), current.includeInjected, () =>
          updatePrefs({ includeInjected: !current.includeInjected }),
        ),
        h(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', fontSize: 13, color: T.fg } },
          h('span', null, t('ui.menuFormat')),
          h(
            Btn,
            {
              small: true,
              onClick: () => updatePrefs({ format: current.format === 'md' ? 'json' : 'md' }),
            },
            current.format === 'md' ? 'Markdown' : 'JSON',
          ),
        ),
        error
          ? h('div', { style: { marginTop: 10, fontSize: 11, color: T.danger } }, error)
          : null,

        // --- capture (owned by dsh-llm-dump) ---
        h('div', { style: { fontSize: 12, fontWeight: 600, margin: '22px 0 4px' } }, t('ui.settingsCaptureSection')),
        h('div', { style: { fontSize: 11, color: T.fg2, lineHeight: 1.6 } }, t('ui.settingsCaptureHint')),
        h(
          'div',
          { style: { marginTop: 10 } },
          h('div', { style: { fontSize: 12, color: T.fg, marginBottom: 4 } }, t('ui.settingsOutputDir')),
          h(
            'div',
            { style: { display: 'flex', gap: 8 } },
            h('input', {
              value: draftPath,
              onChange: (event) => setDraftPath(event.target.value),
              spellCheck: false,
              style: {
                flex: 1,
                minWidth: 0,
                background: 'transparent',
                border: '1px solid ' + T.border,
                borderRadius: 6,
                padding: '5px 8px',
                color: T.fg,
                font: 'inherit',
                fontSize: 12,
              },
            }),
            workspaceFace && typeof workspaceFace.listDirectory === 'function'
              ? h(Btn, { small: true, onClick: browse }, t('ui.settingsBrowse'))
              : null,
            capture && capture.defaults && draftPath !== capture.defaults.outputDir
              ? h(
                  Btn,
                  {
                    small: true,
                    onClick: () => {
                      const fallback = capture.defaults.outputDir;
                      setDraftPath(fallback);
                      if (!saved || fallback !== saved.outputDir) setConfirmPath(fallback);
                    },
                  },
                  t('ui.settingsRestoreDefault'),
                )
              : null,
            h(
              Btn,
              {
                small: true,
                strong: pathChanged,
                disabled: !pathChanged,
                onClick: () => setConfirmPath(draftPath.trim()),
              },
              t('ui.settingsSave'),
            ),
          ),
        ),
        h(
          'div',
          { style: { marginTop: 10, fontSize: 11, color: T.fg2, wordBreak: 'break-all' } },
          t('ui.settingsExportsDir') + ': ' + (capture ? capture.exportsDir : '—'),
        ),
        captureError
          ? h('div', { style: { marginTop: 10, fontSize: 11, color: T.danger } }, captureError)
          : null,
        ),
        pickerOpen
          ? h(DirectoryPickerModal, {
              start: draftPath,
              onPick: (path) => {
                setPickerOpen(false);
                setDraftPath(path);
                if (!saved || path.trim() !== saved.outputDir) setConfirmPath(path.trim());
              },
              onClose: (path) => {
                setPickerOpen(false);
                if (typeof path === 'string' && path.trim() !== '') {
                  setDraftPath(path);
                  if (!saved || path.trim() !== saved.outputDir) setConfirmPath(path.trim());
                }
              },
            })
          : null,
        confirmPath !== null
          ? ReactDOM.createPortal(
              h(
                'div',
                {
                  style: {
                    position: 'fixed',
                    inset: 0,
                    zIndex: 10050,
                    background: 'rgba(0,0,0,0.45)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                },
                h(
                  'div',
                  {
                    style: {
                      width: 460,
                      maxWidth: '90vw',
                      background: T.bg,
                      border: '1px solid ' + T.border,
                      borderRadius: 10,
                      padding: 16,
                      color: T.fg,
                      fontSize: 12,
                    },
                  },
                  h('div', { style: { fontWeight: 600, marginBottom: 8 } }, t('ui.settingsOutputDir')),
                  h('div', { style: { lineHeight: 1.6, color: T.fg2, wordBreak: 'break-all' } }, confirmPath),
                  h('div', { style: { marginTop: 8, lineHeight: 1.6, color: T.warn } }, t('ui.settingsOutputDirWarn')),
                  h(
                    'div',
                    { style: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 } },
                    h(
                      Btn,
                      {
                        small: true,
                        primary: true,
                        onClick: () => {
                          const next = confirmPath;
                          setConfirmPath(null);
                          void saveCapture({ outputDir: next });
                        },
                      },
                      t('ui.settingsConfirm'),
                    ),
                    h(Btn, { small: true, onClick: () => setConfirmPath(null) }, t('ui.settingsCancel')),
                  ),
                ),
              ),
              document.body,
            )
          : null,
      );
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        try {
          localeFace = typeof ctx.get === 'function' ? ctx.get('locale') || null : null;
        } catch {
          localeFace = null;
        }
        try {
          workspaceFace = typeof ctx.get === 'function' ? ctx.get('uiWorkspace') || null : null;
        } catch {
          workspaceFace = null;
        }
        readLocale();
        ctx.slots.inject('sidebar.footer.action', () =>
          ctx.slots.register(
            { name: 'sidebar.footer.action', id: 'dump-manager', order: 120, label: () => t('ui.dumps') },
            DumpManagerEntry,
          ),
        );

        const disposers = [];
        const register = (options, component) => {
          try {
            const disposer = ctx.slots.register(options, component);
            if (typeof disposer === 'function') disposers.push(disposer);
          } catch (error) {
            // The owning UI may not be mounted in this composition; the
            // feature then stays unavailable instead of breaking the plugin.
            if (typeof console !== 'undefined' && console.warn) {
              console.warn('dump-manager: slot ' + options.name + ' is unavailable');
            }
          }
        };
        register({ name: 'conversation.session.header.actions', id: 'dump-export', order: 15 }, ExportTurnAction);
        register({ name: 'conversation.view', id: 'dumps', order: 20, label: () => t('ui.tabTitle') }, DumpView);
        register(
          { name: 'settings.plugins.tab', id: 'dump-manager', order: 20, label: () => t('ui.settingsTitle') },
          DumpSettingsPage,
        );
        if (typeof ctx.effect === 'function') {
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
      },
    };
  },
});
