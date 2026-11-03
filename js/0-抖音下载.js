// ==UserScript==
// @name         0-抖音下载
// @namespace    https://github.com/W-ArcherEmiya
// @version      1.8.0
// @author       ArcherEmiya
// @match        *://*.douyin.com/*
// @match        *://douyin.com/*
// @match        *://*.iesdouyin.com/*
// @exclude      *://lf-zt.douyin.com/*
// @grant        GM_addStyle
// @grant        GM_download
// @grant        GM_registerMenuCommand
// @grant        GM_setClipboard
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      *
// @license      MIT
// @run-at       document-start
// @downloadURL https://update.greasyfork.org/scripts/574900/%E6%8A%96%E9%9F%B3%E8%A7%86%E9%A2%91%E4%B8%8B%E8%BD%BD%EF%BC%88Douyin%20Downloader%EF%BC%89.user.js
// ==/UserScript==

(function () {
    'use strict';

    // Core identifiers and behavior tuning.
    const SCRIPT_ID = 'douyin-downloader';
    const SCRIPT_VERSION = '1.8.0';
    const PANEL_ID = `${SCRIPT_ID}-panel`;
    const PANEL_TOGGLE_ID = `${SCRIPT_ID}-toggle`;
    const PANEL_STATUS_ID = `${SCRIPT_ID}-status`;
    const LIQUID_GLASS_SVG_ID = `${SCRIPT_ID}-liquid-glass-svg`;
    const LIQUID_GLASS_FILTER_ID = `${SCRIPT_ID}-liquid-glass-filter`;
    const BATCH_MODAL_ID = `${SCRIPT_ID}-batch-modal`;
    const BATCH_MODAL_LIST_ID = `${SCRIPT_ID}-batch-list`;
    const BATCH_MODAL_SUMMARY_ID = `${SCRIPT_ID}-batch-summary`;
    const BATCH_SEARCH_ID = `${SCRIPT_ID}-batch-search`;
    const BATCH_PICK_DIR_ID = `${SCRIPT_ID}-batch-pick-dir`;
    const BATCH_DIR_HINT_ID = `${SCRIPT_ID}-batch-dir-hint`;
    const BATCH_SELECT_ALL_ID = `${SCRIPT_ID}-batch-select-all`;
    const BATCH_CLEAR_ALL_ID = `${SCRIPT_ID}-batch-clear-all`;
    const BATCH_START_ID = `${SCRIPT_ID}-batch-start`;
    const BATCH_CLOSE_ID = `${SCRIPT_ID}-batch-close`;
    const SHORTCUT_KEY = 'q';
    const TITLE_FALLBACK = 'douyin-video';
    const AUTHOR_FALLBACK = 'unknown-author';
    const MAX_NAME_LENGTH = 80;
    const TITLE_FILENAME_MAX_LENGTH = 28;
    const AUTHOR_FILENAME_MAX_LENGTH = 16;
    const MIN_VIDEO_RESPONSE_BYTES = 1024;
    const MAX_MP4_METADATA_BYTES = 16 * 1024 * 1024;
    const MAX_MP4_BOX_SCAN_COUNT = 2048;
    const MP4_RANGE_PROBE_BYTES = 2 * 1024 * 1024;
    const MAX_RANGE_PROBE_RESPONSE_BYTES = MP4_RANGE_PROBE_BYTES + (64 * 1024);
    const BATCH_DELAY_MS = 120;
    const BATCH_ENTRY_RESOLVE_CONCURRENCY = 3;
    const SCAN_DELAY_MS = 900;
    const ACTION_STATUS_HIDE_DELAY_MS = 1500;
    const ACTION_REFRESH_DELAY_MS = 1700;
    const MAX_SCROLL_ROUNDS = 45;
    const MAX_STABLE_SCROLL_ROUNDS = 4;
    const MAX_UNDERCOUNT_STABLE_SCROLL_ROUNDS = 12;
    const MAX_VIDEO_DATA_CACHE_SIZE = 240;
    const MAX_MEDIA_URL_RECORDS = 160; // 媒体地址记录上限
    const REFRESH_DEBOUNCE_MS = 180;
    const PANEL_POSITION_KEY = `${SCRIPT_ID}-panel-top`;
    const PANEL_EDGE_OFFSET = 16;
    const PANEL_RIGHT_OFFSET = 21;
    const PANEL_TOGGLE_SIZE = 46;
    const PANEL_DRAG_THRESHOLD = 6;
    const EMPTY_MEDIA_INFO = { container: 'unknown', audio: false, video: false, conclusive: false, handlers: [] }; // 未知媒体信息模板
    const PLAYER_NAMES = ['player', 'nextPlayer', 'playerPreloader', 'newPlayerPreloader', '__XG_BIG_CARD_QUICK_PLAYER__', '__INLINE_PLAYER_DATA__']; // 页面播放器全局对象名
    const UI_TEXT_KEYWORDS = ['\u70b9\u51fb\u63a8\u8350', '\u53d1\u6765\u53cb\u597d\u7684\u5f39\u5e55\u5427', '\u641c\u7d22', '\u6e05\u5c4f', '\u8fde\u64ad'];
    const BAD_META_KEYWORDS = [
        'batch download', 'download selected', 'select all', 'clear all', 'loading video list', 'middleware',
        'perf', 'snippet', 'debug', 'pc tab', 'luckytrain', '\u901a\u7528\u914d\u7f6e', '\u7c89\u4e1d\u6307\u6570',
    ];

    const state = {
        mode: 'idle',
        observer: null,
        historyPatched: false,
        refreshTimer: null,
        panelTop: null,
        pointerDrag: null,
        batchEntries: [],
        batchSearchTerm: '',
        batchDirectoryHandle: null,
        batchDirectoryName: '',
        batchModalLoading: false,
        batchLoadingMessage: '',
        toggleLabel: 'Download video',
        lastStatus: '',
        statusBubbleActive: false,
        statusHideTimer: null,
        networkHookInstalled: false,
        resourceHookInstalled: false,
        diagnosticMenuInstalled: false,
        mediaUrlRecords: [],
        videoDataCache: new Map(),
        videoDataRecords: [],
        lastLocationHref: '',
        locationChangedAt: 0,
    };

    const titleSelectors = [
        'h1',
        '[data-e2e="video-desc"]',
        '[data-e2e="feed-active-video-desc"]',
        'meta[property="og:title"]',
        'meta[name="description"]',
        '[class*="title"]',
        '[class*="desc"]',
        '[class*="detail"]',
    ];

    const authorSelectors = [
        '[data-e2e="video-author-name"]',
        '[data-e2e="feed-active-video-author-name"]',
        '[data-e2e="user-name"]',
        '[data-e2e="video-author-uniqueid"]',
        'meta[name="author"]',
        '[class*="account-name"]',
        '[class*="author"]',
        'a[href*="/user/"]',
    ];

    const genericTitlePatterns = [
        /\u6296\u97f3.*\u6296\u97f3/i,
        /\u6296\u97f3\u7cbe\u9009/i,
        /^\u6296\u97f3(?:\u7cbe\u9009)?$/i,
        /^douyin$/i,
        /^jingxuan$/i,
        /^\u641c\u7d22$/i,
        /^\u70b9\u51fb\u63a8\u8350$/i,
        /^\u53d1\u6765\u53cb\u597d\u7684\u5f39\u5e55\u5427$/i,
    ];

    // 液态玻璃样式选择器（single / batch 两种模式共用）
    const glassSel = (suffix = '') => ['single', 'batch'].map((mode) => `#${PANEL_ID}[data-mode="${mode}"] #${PANEL_TOGGLE_ID}${suffix}`).join(',');
    const DLG = `#${BATCH_MODAL_ID} .${SCRIPT_ID}-`;

    const style = `
        #${PANEL_ID} { position: fixed; right: ${PANEL_RIGHT_OFFSET}px; top: ${PANEL_EDGE_OFFSET}px; z-index: 2147483647; display: flex; align-items: center; gap: 10px; font-family: "Segoe UI", Arial, sans-serif; }
        #${PANEL_TOGGLE_ID} {
            position: relative; width: ${PANEL_TOGGLE_SIZE}px; height: ${PANEL_TOGGLE_SIZE}px; border: none; border-radius: 999px; padding: 0; overflow: hidden;
            background: linear-gradient(135deg, #141414 0%, #303030 100%); color: #ffffff; box-shadow: 0 14px 30px rgba(0, 0, 0, 0.34);
            cursor: grab; display: grid; place-items: center; transition: transform 0.2s ease, box-shadow 0.2s ease; touch-action: none;
        }
        ${glassSel()} {
            border: 1px solid rgba(255, 255, 255, 0.24);
            background:
                radial-gradient(circle at 28% 18%, rgba(255, 255, 255, 0.48), rgba(255, 255, 255, 0.12) 34%, transparent 58%),
                linear-gradient(145deg, rgba(255, 255, 255, 0.2), rgba(210, 226, 255, 0.08) 52%, rgba(255, 255, 255, 0.14));
            box-shadow:
                inset 0 1px 1px rgba(255, 255, 255, 0.5), inset 1px 0 1px rgba(255, 255, 255, 0.2),
                inset 0 -1px 2px rgba(32, 46, 72, 0.12), inset -1px 0 1px rgba(117, 184, 255, 0.1),
                0 9px 24px rgba(0, 0, 0, 0.22), 0 2px 6px rgba(0, 0, 0, 0.12);
            -webkit-backdrop-filter: blur(14px) saturate(180%) brightness(1.06);
            backdrop-filter: blur(14px) saturate(180%) brightness(1.06);
            backdrop-filter: url("#${LIQUID_GLASS_FILTER_ID}") blur(0.35px) contrast(1.18) brightness(1.06) saturate(1.16);
        }
        ${glassSel('::before')} {
            content: ""; position: absolute; inset: 2px; border-radius: inherit;
            background:
                radial-gradient(ellipse at 34% 12%, rgba(255, 255, 255, 0.82), transparent 36%),
                linear-gradient(120deg, rgba(255, 255, 255, 0.18), transparent 42%);
            opacity: 0.74; pointer-events: none;
        }
        ${glassSel('::after')} {
            content: ""; position: absolute; inset: 1px; border-radius: inherit;
            background: linear-gradient(135deg, transparent 48%, rgba(113, 201, 255, 0.16) 72%, rgba(255, 142, 188, 0.14) 100%);
            box-shadow: inset 0 0 7px rgba(255, 255, 255, 0.1), inset 0 -2px 5px rgba(82, 142, 214, 0.06);
            mix-blend-mode: screen; opacity: 0.72; pointer-events: none;
        }
        #${PANEL_ID}[data-mode="batch"] #${PANEL_TOGGLE_ID} {
            background:
                radial-gradient(circle at 28% 18%, rgba(255, 255, 255, 0.52), rgba(186, 224, 255, 0.16) 34%, transparent 58%),
                linear-gradient(145deg, rgba(24, 119, 242, 0.24), rgba(49, 193, 255, 0.1) 54%, rgba(255, 255, 255, 0.13));
        }
        #${PANEL_ID}[data-disabled="true"] #${PANEL_TOGGLE_ID} { opacity: 0.58; cursor: not-allowed; box-shadow: 0 10px 20px rgba(0, 0, 0, 0.22); }
        #${PANEL_TOGGLE_ID}:hover { transform: scale(1.04); box-shadow: 0 16px 34px rgba(0, 0, 0, 0.4); }
        ${glassSel(':hover')} {
            box-shadow:
                inset 0 1px 1px rgba(255, 255, 255, 0.62), inset 1px 0 1px rgba(255, 255, 255, 0.24),
                inset 0 -1px 2px rgba(32, 46, 72, 0.14), inset -1px 0 1px rgba(117, 184, 255, 0.12),
                0 13px 30px rgba(0, 0, 0, 0.28), 0 3px 8px rgba(0, 0, 0, 0.14);
        }
        #${PANEL_TOGGLE_ID}:focus-visible { outline: 2px solid rgba(255, 255, 255, 0.78); outline-offset: 3px; }
        #${PANEL_ID}.is-dragging #${PANEL_TOGGLE_ID} { cursor: grabbing; transform: scale(1.03); }
        #${PANEL_TOGGLE_ID} svg {
            position: relative; z-index: 2; width: 19px; height: 19px; display: block; fill: none; stroke: currentColor;
            stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.32));
        }
        #${PANEL_STATUS_ID} {
            order: -1; min-width: 168px; max-width: min(320px, calc(100vw - ${PANEL_TOGGLE_SIZE + PANEL_RIGHT_OFFSET + 40}px));
            padding: 10px 12px; border-radius: 14px; background: rgba(16, 16, 18, 0.9); color: #f7f7f7;
            box-shadow: 0 14px 34px rgba(0, 0, 0, 0.26); font-size: 12px; line-height: 1.45; white-space: pre-line; word-break: break-word;
            pointer-events: none; opacity: 0; transform: translateX(12px); transition: opacity 0.18s ease, transform 0.18s ease;
        }
        #${PANEL_STATUS_ID}.is-visible { opacity: 1; transform: translateX(0); }
        #${PANEL_ID}[data-mode="single"] #${PANEL_STATUS_ID} { background: rgba(45, 16, 22, 0.92); }
        #${PANEL_ID}[data-mode="batch"] #${PANEL_STATUS_ID} { background: rgba(14, 28, 48, 0.92); }
        #${BATCH_MODAL_ID} {
            position: fixed; inset: 0; z-index: 2147483646; display: none; align-items: center; justify-content: center;
            padding: 24px; background: rgba(6, 6, 6, 0.6); backdrop-filter: blur(10px);
        }
        #${BATCH_MODAL_ID}.is-open { display: flex; }
        ${DLG}dialog {
            width: min(760px, calc(100vw - 32px)); max-height: min(82vh, 860px); display: flex; flex-direction: column; gap: 14px;
            padding: 18px; border-radius: 20px; background: rgba(18, 18, 18, 0.97); color: #f7f7f7; box-shadow: 0 22px 60px rgba(0, 0, 0, 0.4);
        }
        ${DLG}dialog-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        ${DLG}dialog-title { margin: 0; font-size: 18px; font-weight: 700; }
        ${DLG}dialog-subtitle { margin: 4px 0 0; color: rgba(255, 255, 255, 0.7); font-size: 12px; }
        ${DLG}list { overflow: auto; display: flex; flex-direction: column; gap: 10px; padding-right: 4px; }
        ${DLG}loading {
            display: flex; align-items: center; gap: 12px; padding: 16px 14px; border-radius: 14px; background: rgba(255, 255, 255, 0.05);
            color: rgba(255, 255, 255, 0.82); font-size: 13px; line-height: 1.5; white-space: pre-line;
        }
        ${DLG}spinner {
            width: 18px; height: 18px; border-radius: 999px; border: 2px solid rgba(255, 255, 255, 0.16);
            border-top-color: #31c1ff; animation: ${SCRIPT_ID}-spin 0.8s linear infinite; flex: 0 0 auto;
        }
        @keyframes ${SCRIPT_ID}-spin { to { transform: rotate(360deg); } }
        ${DLG}item { display: grid; grid-template-columns: auto 1fr auto; gap: 12px; align-items: start; padding: 12px; border-radius: 14px; background: rgba(255, 255, 255, 0.05); }
        ${DLG}item.is-disabled { opacity: 0.56; }
        ${DLG}item input[type="checkbox"] { margin-top: 3px; width: 16px; height: 16px; accent-color: #31c1ff; }
        ${DLG}item-title { color: #ffffff; font-size: 14px; font-weight: 600; line-height: 1.4; }
        ${DLG}item-meta { margin-top: 4px; color: rgba(255, 255, 255, 0.68); font-size: 12px; line-height: 1.5; white-space: pre-line; word-break: break-word; }
        ${DLG}item-status {
            border-radius: 999px; padding: 4px 10px; font-size: 11px; font-weight: 700; letter-spacing: 0.04em;
            text-transform: uppercase; background: rgba(49, 193, 255, 0.16); color: #7edcff;
        }
        ${DLG}item-status.is-error { background: rgba(255, 94, 94, 0.16); color: #ff9d9d; }
        ${DLG}dialog-toolbar, ${DLG}dialog-actions { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
        ${DLG}dialog-toolbar { justify-content: space-between; }
        ${DLG}toolbar-group { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; min-width: 0; }
        #${BATCH_DIR_HINT_ID} { font-size: 12px; color: rgba(255, 255, 255, 0.72); max-width: 240px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        ${DLG}dialog-actions { justify-content: space-between; }
        #${BATCH_SEARCH_ID} {
            width: min(280px, 100%); min-width: 180px; appearance: none; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px;
            padding: 10px 12px; background: rgba(255, 255, 255, 0.06); color: #ffffff; font-size: 13px; outline: none;
        }
        #${BATCH_SEARCH_ID}::placeholder { color: rgba(255, 255, 255, 0.45); }
        #${BATCH_SEARCH_ID}:focus { border-color: rgba(49, 193, 255, 0.55); box-shadow: 0 0 0 3px rgba(49, 193, 255, 0.12); }
        ${DLG}text-button, ${DLG}action-button { appearance: none; border: none; border-radius: 10px; padding: 10px 12px; color: #ffffff; cursor: pointer; font-size: 13px; font-weight: 600; }
        ${DLG}text-button { background: rgba(255, 255, 255, 0.08); }
        ${DLG}action-button { background: linear-gradient(135deg, #1877f2 0%, #31c1ff 100%); }
        ${DLG}text-button:disabled, ${DLG}action-button:disabled { opacity: 0.55; cursor: not-allowed; }
        #${BATCH_MODAL_SUMMARY_ID} { color: rgba(255, 255, 255, 0.74); font-size: 12px; }
    `;

    // Shared helpers.
    function addStyleBlock(cssText) {
        if (typeof GM_addStyle === 'function') {
            GM_addStyle(cssText);
            return;
        }

        const styleElement = document.createElement('style');
        styleElement.textContent = cssText;
        document.head.appendChild(styleElement);
    }

    function wait(ms) {
        return new Promise((resolve) => {
            window.setTimeout(resolve, ms);
        });
    }

    // 创建 DOM 元素：props 直接赋值到元素属性，children 依次追加
    function el(tag, props = {}, children = []) {
        const node = document.createElement(tag);
        Object.assign(node, props);
        for (const child of children) {
            node.appendChild(child);
        }
        return node;
    }

    // 包装 Promise 的 resolve/reject，保证只生效一次
    function createSettler(resolve, reject) {
        let settled = false;
        return {
            isSettled: () => settled,
            resolveOnce: (value) => {
                if (!settled) {
                    settled = true;
                    resolve(value);
                }
            },
            rejectOnce: (error) => {
                if (!settled) {
                    settled = true;
                    reject(error);
                }
            },
        };
    }

    function setDisabledById(id, disabled) {
        const node = document.getElementById(id);
        if (node) {
            node.disabled = Boolean(disabled);
        }
    }

    function nowMs() {
        return typeof performance?.now === 'function' ? performance.now() : Date.now();
    }

    function parsePageUrl(href = location.href) {
        try {
            return new URL(href, location.href);
        } catch (error) {
            return null;
        }
    }

    function sanitizeDiagnosticUrl(value, options = {}) {
        const rawValue = String(value || '').trim();
        if (!rawValue) {
            return '';
        }

        if (rawValue.startsWith('blob:')) {
            return 'blob:[current-page]';
        }

        const baseHref = typeof location === 'object' && location?.href
            ? location.href
            : 'https://www.douyin.com/';

        try {
            const url = new URL(rawValue, baseHref);
            if (!/^https?:$/i.test(url.protocol)) {
                return `${url.protocol}[redacted]`;
            }

            const sanitized = new URL(`${url.origin}${url.pathname}`);
            if (options.preservePageParams) {
                for (const name of ['recommend', 'modal_id', 'showTab', 'from_tab_name', 'type']) {
                    const paramValue = url.searchParams.get(name);
                    if (paramValue) {
                        sanitized.searchParams.set(name, paramValue);
                    }
                }
            }

            return sanitized.href;
        } catch (error) {
            return '[invalid-url]';
        }
    }

    function normalizeText(value) {
        return (value || '')
            .replace(/\s+/g, ' ')
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            .trim();
    }

    function readRawTextValue(value) {
        if (!value) {
            return '';
        }

        return typeof value === 'string'
            ? value
            : value.innerText || value.textContent || '';
    }

    function readTextValue(value) {
        return normalizeText(readRawTextValue(value));
    }

    function isGenericTitleText(text) {
        const value = normalizeText(text);
        return !value || genericTitlePatterns.some((pattern) => pattern.test(value));
    }

    function isLikelyUiText(text) {
        const value = normalizeText(text);
        return !value || UI_TEXT_KEYWORDS.some((keyword) => value.includes(keyword));
    }

    function isBadProfileMetaText(text) {
        const value = normalizeText(text).toLowerCase();
        return !value || BAD_META_KEYWORDS.some((keyword) => value.includes(keyword));
    }

    function isLikelyCountText(text) {
        const value = normalizeText(text);
        if (!value) {
            return true;
        }

        return /^(?:\d+(?:\.\d+)?(?:w|k|\u4e07|\u4ebf)?|[\d.]+(?:\u4e07|\u4ebf)|\u521a\u521a\u770b\u8fc7)$/i.test(value);
    }

    // 标题/作者候选共用的排除规则
    function isRejectedCandidateText(value) {
        return isGenericTitleText(value) || isLikelyUiText(value) || isBadProfileMetaText(value) || isLikelyCountText(value);
    }

    function scoreTitleCandidate(text) {
        const value = normalizeText(text);
        if (!value || value.length < 4 || value.length > 140 || isRejectedCandidateText(value)) {
            return -1;
        }

        let score = 0;

        if (/[\u4e00-\u9fff]/.test(value)) {
            score += 18;
        }

        if (/[#\uFF03]/.test(value)) {
            score += 10;
        }

        if (value.length >= 8 && value.length <= 70) {
            score += 14;
        }

        if (value.startsWith('@')) {
            score -= 30;
        }

        if (/^\d+(?:\.\d+)?(?:\u4e07|\u4ebf)?$/.test(value)) {
            score -= 30;
        }

        if (/\u7cbe\u9009|jingxuan|douyin/i.test(value)) {
            score -= 24;
        }

        return score;
    }

    function scoreAuthorCandidate(text) {
        const value = normalizeText(text);
        if (!value || value.length < 2 || value.length > 40 || isRejectedCandidateText(value)) {
            return -1;
        }

        let score = 0;

        if (value.startsWith('@')) {
            score += 32;
        }

        if (/^[\w\u4e00-\u9fff@._-]+$/.test(value)) {
            score += 12;
        }

        if (/[\u4e00-\u9fff]/.test(value)) {
            score += 10;
        }

        if (!value.startsWith('@') && /^[A-Za-z0-9._-]+$/.test(value)) {
            score -= 18;
        }

        if (/^\d+(?:\.\d+)?(?:\u4e07|\u4ebf)?$/.test(value)) {
            score -= 25;
        }

        return score;
    }

    function sanitizeFilenamePart(value, fallback) {
        const cleaned = normalizeText(value)
            .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
            .replace(/\.+$/g, '')
            .slice(0, MAX_NAME_LENGTH)
            .trim();

        return cleaned || fallback;
    }

    function compactTitleForFilename(value) {
        const normalized = normalizeText(value)
            .replace(/\s*[#\uFF03][^\s#\uFF03]+/g, '')
            .replace(/[\uFF0C\u3002\uFF01\uFF1F\uFF1B\uFF1A\u3001,.!?:;]+$/g, '')
            .trim();

        return sanitizeFilenamePart(normalized.slice(0, TITLE_FILENAME_MAX_LENGTH), TITLE_FALLBACK);
    }

    function compactAuthorForFilename(value) {
        const normalized = normalizeText(value).replace(/^@+/, '').trim();
        return sanitizeFilenamePart(normalized.slice(0, AUTHOR_FILENAME_MAX_LENGTH), AUTHOR_FALLBACK);
    }

    function normalizeTitleForComparison(value) {
        return normalizeText(value)
            .replace(/第\s*\d+\s*集\s*[：:、.\-]?\s*/gi, '')
            .replace(/\s*[#\uFF03][^\s#\uFF03]+/g, '')
            .replace(/[@\s\u3000]/g, '')
            .replace(/[\uFF0C\u3002\uFF01\uFF1F\uFF1B\uFF1A\u3001,.!?:;'"“”‘’()\[\]{}\-_/\\]/g, '')
            .toLowerCase()
            .trim();
    }

    function titlesLookRelated(left, right) {
        const normalizedLeft = normalizeTitleForComparison(left);
        const normalizedRight = normalizeTitleForComparison(right);

        if (!normalizedLeft || !normalizedRight || normalizedLeft === normalizedRight) {
            return true;
        }

        return (normalizedLeft.length >= 4 && normalizedRight.includes(normalizedLeft))
            || (normalizedRight.length >= 4 && normalizedLeft.includes(normalizedRight));
    }

    function shouldRejectByTitleMismatch(requestedTitle, resolvedTitle) {
        if (scoreTitleCandidate(requestedTitle || '') < 8 || scoreTitleCandidate(resolvedTitle || '') < 8) {
            return false;
        }

        return !titlesLookRelated(requestedTitle, resolvedTitle);
    }

    function formatByteSize(bytes) {
        const value = Number(bytes);
        if (!Number.isFinite(value) || value <= 0) {
            return '0 B';
        }

        const units = ['B', 'KB', 'MB', 'GB'];
        let size = value;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex += 1;
        }

        const digits = size >= 100 || unitIndex === 0 ? 0 : 1;
        return `${size.toFixed(digits)} ${units[unitIndex]}`;
    }

    // 计算下载百分比，total 未知时返回 0
    function getPercent(loaded, total) {
        const totalValue = Number(total);
        return totalValue > 0
            ? Math.max(0, Math.min(100, Math.round(((Number(loaded) || 0) / totalValue) * 100)))
            : 0;
    }

    function formatDownloadProgress(loaded, total) {
        const loadedText = formatByteSize(loaded);
        const totalValue = Number(total);

        if (Number.isFinite(totalValue) && totalValue > 0) {
            return `${getPercent(loaded, totalValue)}% (${loadedText} / ${formatByteSize(totalValue)})`;
        }

        return `${loadedText} downloaded`;
    }

    function buildFallbackMeta() {
        return {
            title: TITLE_FALLBACK,
            author: AUTHOR_FALLBACK,
        };
    }

    function clearStatusHideTimer() {
        if (state.statusHideTimer) {
            window.clearTimeout(state.statusHideTimer);
            state.statusHideTimer = null;
        }
    }

    function activateStatusBubble() {
        clearStatusHideTimer();
        state.statusBubbleActive = true;
    }

    function scheduleStatusBubbleHide(delay = 2200) {
        clearStatusHideTimer();
        state.statusHideTimer = window.setTimeout(() => {
            state.statusHideTimer = null;
            state.statusBubbleActive = false;
            setStatus('');
        }, delay);
    }

    function updateToggleTitle() {
        const toggle = document.getElementById(PANEL_TOGGLE_ID);
        if (toggle) {
            const title = [state.toggleLabel || 'Download', state.lastStatus].filter(Boolean).join('\n');
            toggle.title = title;
            toggle.setAttribute('aria-label', title);
        }
    }

    function setStatus(message) {
        state.lastStatus = message || '';
        updateToggleTitle();

        const status = document.getElementById(PANEL_STATUS_ID);
        if (status) {
            status.textContent = state.lastStatus;
            status.classList.toggle('is-visible', Boolean(state.statusBubbleActive && state.lastStatus));
        }
    }

    function beginAction(mode, label, statusMessage) {
        setMode(mode);
        activateStatusBubble();
        setPrimaryButtonState(label, true, mode);
        setStatus(statusMessage);
    }

    function finishAction() {
        scheduleStatusBubbleHide(ACTION_STATUS_HIDE_DELAY_MS);
        setMode('idle');
        window.setTimeout(refreshUI, ACTION_REFRESH_DELAY_MS);
    }

    // Batch modal state.
    function getBatchModal() {
        return document.getElementById(BATCH_MODAL_ID);
    }

    function getBatchEntries() {
        return Array.isArray(state.batchEntries) ? state.batchEntries : [];
    }

    function matchesBatchSearch(entry) {
        const searchTerm = normalizeText(state.batchSearchTerm).toLowerCase();
        if (!searchTerm) {
            return true;
        }

        return [entry.meta.title, entry.meta.author, entry.pageUrl, entry.error]
            .filter(Boolean).join(' ').toLowerCase().includes(searchTerm);
    }

    function getFilteredBatchEntries() {
        return getBatchEntries().filter(matchesBatchSearch);
    }

    function getSelectedBatchEntries() {
        return getBatchEntries().filter((entry) => entry.selected && entry.available);
    }

    function isDirectoryPickerSupported() {
        return typeof window.showDirectoryPicker === 'function';
    }

    function updateBatchDirectoryHint() {
        const hint = document.getElementById(BATCH_DIR_HINT_ID);
        if (hint) {
            hint.textContent = state.batchDirectoryName
                ? `Download folder: ${state.batchDirectoryName}`
                : (isDirectoryPickerSupported() ? 'Download folder: not selected' : 'Download folder: browser not supported');
        }

        setDisabledById(BATCH_PICK_DIR_ID, state.batchModalLoading || isBusy() || !isDirectoryPickerSupported());
    }

    async function pickBatchDownloadDirectory() {
        if (!isDirectoryPickerSupported()) {
            setBatchSummaryMessage('Your browser does not support selecting a batch download folder.');
            return;
        }

        try {
            const handle = await window.showDirectoryPicker({
                mode: 'readwrite',
            });

            state.batchDirectoryHandle = handle;
            state.batchDirectoryName = handle?.name || '';
            updateBatchDirectoryHint();
            updateBatchModalSummary();
        } catch (error) {
            if (error?.name === 'AbortError') {
                return;
            }

            console.error('[Douyin Downloader] Failed to pick batch directory.', error);
            setBatchSummaryMessage(`Folder selection failed: ${error.message}`);
        }
    }

    async function ensureWritableBatchDirectory() {
        const handle = state.batchDirectoryHandle;
        if (!handle) {
            return null;
        }

        if (typeof handle.queryPermission === 'function') {
            let permission = await handle.queryPermission({
                mode: 'readwrite',
            });

            if (permission !== 'granted' && typeof handle.requestPermission === 'function') {
                permission = await handle.requestPermission({
                    mode: 'readwrite',
                });
            }

            if (permission !== 'granted') {
                throw new Error('Batch download folder permission was denied');
            }
        }

        return handle;
    }

    function setBatchSummaryMessage(message) {
        const summary = document.getElementById(BATCH_MODAL_SUMMARY_ID);
        if (summary) {
            summary.textContent = message;
        }
    }

    function setBatchModalLoading(loading, message = '') {
        state.batchModalLoading = Boolean(loading);
        state.batchLoadingMessage = message || '';

        setDisabledById(BATCH_SEARCH_ID, state.batchModalLoading);
        setDisabledById(BATCH_SELECT_ALL_ID, state.batchModalLoading);
        setDisabledById(BATCH_CLEAR_ALL_ID, state.batchModalLoading);
        setDisabledById(BATCH_START_ID, state.batchModalLoading || getSelectedBatchEntries().length === 0 || isBusy());

        renderBatchModalList();
        updateBatchDirectoryHint();
    }

    function updateBatchModalSummary() {
        const summary = document.getElementById(BATCH_MODAL_SUMMARY_ID);
        const startButton = document.getElementById(BATCH_START_ID);
        const entries = getBatchEntries();
        const filteredEntries = getFilteredBatchEntries();
        const selectableCount = entries.filter((entry) => entry.available).length;
        const selectedCount = getSelectedBatchEntries().length;
        const filteredSelectableCount = filteredEntries.filter((entry) => entry.available).length;
        const filteredSelectedCount = filteredEntries.filter((entry) => entry.selected && entry.available).length;

        if (summary) {
            summary.textContent = state.batchModalLoading
                ? (state.batchLoadingMessage || 'Loading video list...')
                : `Detected ${entries.length} videos, showing ${filteredEntries.length}, ${selectableCount} available, ${selectedCount} selected. Current filter: ${filteredSelectableCount} available, ${filteredSelectedCount} selected.`;
        }

        if (startButton) {
            startButton.disabled = state.batchModalLoading || selectedCount === 0 || isBusy();
            startButton.textContent = selectedCount > 0 ? `Download selected (${selectedCount})` : 'Download selected';
        }

        updateBatchDirectoryHint();
    }

    function renderBatchModalList() {
        const list = document.getElementById(BATCH_MODAL_LIST_ID);
        if (!list) {
            return;
        }

        list.replaceChildren();

        if (state.batchModalLoading) {
            list.appendChild(el('div', { className: `${SCRIPT_ID}-loading` }, [
                el('div', { className: `${SCRIPT_ID}-spinner` }),
                el('div', { textContent: state.batchLoadingMessage || 'Loading video list...' }),
            ]));
            updateBatchModalSummary();
            return;
        }

        const filteredEntries = getFilteredBatchEntries();
        if (!filteredEntries.length) {
            list.appendChild(el('div', {
                className: `${SCRIPT_ID}-item is-disabled`,
                textContent: 'No videos match the current search.',
            }));
            updateBatchModalSummary();
            return;
        }

        for (const entry of filteredEntries) {
            const checkbox = el('input', {
                type: 'checkbox',
                checked: Boolean(entry.selected && entry.available),
                disabled: !entry.available || isBusy(),
            });
            checkbox.dataset.entryId = entry.id;

            list.appendChild(el('label', { className: `${SCRIPT_ID}-item${entry.available ? '' : ' is-disabled'}` }, [
                checkbox,
                el('div', {}, [
                    el('div', { className: `${SCRIPT_ID}-item-title`, textContent: entry.meta.title || TITLE_FALLBACK }),
                    el('div', {
                        className: `${SCRIPT_ID}-item-meta`,
                        textContent: [
                            `Author: ${entry.meta.author || AUTHOR_FALLBACK}`,
                            entry.pageUrl,
                            entry.error ? `Error: ${entry.error}` : '',
                        ].filter(Boolean).join('\n'),
                    }),
                ]),
                el('div', {
                    className: `${SCRIPT_ID}-item-status${entry.available ? '' : ' is-error'}`,
                    textContent: entry.available ? 'Ready' : 'Unavailable',
                }),
            ]));
        }

        updateBatchModalSummary();
    }

    function setBatchEntries(entries) {
        state.batchEntries = Array.isArray(entries) ? entries : [];
        renderBatchModalList();
    }

    function setBatchModalOpen(open) {
        const modal = getBatchModal();

        if (!modal) {
            return;
        }

        modal.classList.toggle('is-open', Boolean(open));
        modal.setAttribute('aria-hidden', open ? 'false' : 'true');
    }

    function closeBatchModal() {
        setBatchModalOpen(false);
    }

    function openBatchModal(entries) {
        state.batchSearchTerm = '';
        const searchInput = document.getElementById(BATCH_SEARCH_ID);
        if (searchInput) {
            searchInput.value = '';
        }
        setBatchEntries(entries);
        setBatchModalOpen(true);
    }

    function updateBatchSelection(entryId, selected) {
        state.batchEntries = getBatchEntries().map((entry) => (
            entry.id !== entryId || !entry.available ? entry : { ...entry, selected: Boolean(selected) }
        ));

        updateBatchModalSummary();
    }

    function setAllBatchSelections(selected) {
        state.batchEntries = getBatchEntries().map((entry) => ({
            ...entry,
            selected: entry.available && matchesBatchSearch(entry) ? Boolean(selected) : entry.selected && entry.available,
        }));

        renderBatchModalList();
    }

    function setPrimaryButtonState(label, disabled, mode = 'single') {
        state.toggleLabel = label || 'Download';

        const panel = document.getElementById(PANEL_ID);
        const toggle = document.getElementById(PANEL_TOGGLE_ID);
        const nextDisabled = Boolean(disabled);

        if (panel) {
            panel.dataset.mode = mode;
            panel.dataset.disabled = nextDisabled ? 'true' : 'false';
        }

        if (toggle && toggle.disabled !== nextDisabled) {
            toggle.disabled = nextDisabled;
        }

        updateToggleTitle();
    }

    // Network data capture.
    function shouldInspectNetworkPayload(url, contentType = '') {
        const urlText = String(url || '');

        if (!urlText.startsWith(location.origin)) {
            return false;
        }

        return String(contentType || '').toLowerCase().includes('json') || /(aweme|detail|feed|post|video|item)/i.test(urlText);
    }

    function installNetworkHooks() {
        if (state.networkHookInstalled) {
            return;
        }

        state.networkHookInstalled = true;

        const originalFetch = window.fetch.bind(window);
        window.fetch = async function () {
            const response = await originalFetch(...arguments);

            try {
                const request = arguments[0];
                const requestUrl = typeof request === 'string'
                    ? request
                    : request?.url || '';
                const contentType = response.headers?.get('content-type') || '';

                cacheMediaUrl(requestUrl, 'fetch');

                if (shouldInspectNetworkPayload(requestUrl, contentType)) {
                    response.clone().text().then((text) => {
                        maybeCacheStructuredDataResponse(text);
                    }).catch(() => {
                        // Ignore clone parsing failures.
                    });
                }
            } catch (error) {
                // Ignore hook failures.
            }

            return response;
        };

        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function (method, url) {
            this.__douyinDownloaderUrl = url;
            return originalOpen.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = function () {
            this.addEventListener('load', function () {
                try {
                    const url = typeof this.__douyinDownloaderUrl === 'string' ? this.__douyinDownloaderUrl : '';
                    const contentType = this.getResponseHeader('content-type') || '';
                    cacheMediaUrl(url, 'xmlhttprequest');

                    if (shouldInspectNetworkPayload(url, contentType)) {
                        maybeCacheStructuredDataResponse(this.responseText || '');
                    }
                } catch (error) {
                    // Ignore hook failures.
                }
            });

            return originalSend.apply(this, arguments);
        };
    }

    function cacheMediaUrl(url, source = 'resource') {
        if (!looksLikeVideoUrl(source, url) || state.mediaUrlRecords.some((record) => record.url === url)) {
            return;
        }

        state.mediaUrlRecords.push({
            url,
            source,
            score: scoreVideoUrl(source, url),
            time: nowMs(),
        });

        if (state.mediaUrlRecords.length > MAX_MEDIA_URL_RECORDS) {
            state.mediaUrlRecords.shift();
        }
    }

    function installResourceHooks() {
        if (state.resourceHookInstalled) {
            return;
        }

        state.resourceHookInstalled = true;

        try {
            if (window.performance && typeof performance.getEntriesByType === 'function') {
                for (const entry of performance.getEntriesByType('resource')) {
                    cacheMediaUrl(entry?.name || '', `resource:${entry?.initiatorType || 'other'}`);
                }
            }
        } catch (error) {
            // Ignore performance access failures.
        }

        try {
            if (typeof PerformanceObserver !== 'function') {
                return;
            }

            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    cacheMediaUrl(entry?.name || '', `resource:${entry?.initiatorType || 'other'}`);
                }
            });

            observer.observe({
                type: 'resource',
                buffered: true,
            });
        } catch (error) {
            // Ignore observer setup failures.
        }
    }

    // Floating action button and page observation.
    function setMode(mode) {
        state.mode = mode;
    }

    function isBusy() {
        return state.mode !== 'idle';
    }

    function smoothStep(min, max, value) {
        const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
        return normalized * normalized * (3 - (2 * normalized));
    }

    // Native userscript adaptation inspired by childrentime/liquid-glass.
    function createLiquidGlassDisplacementMap(size) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        if (!context) {
            return null;
        }

        const vectors = new Float32Array(size * size * 2);
        let maxDisplacement = 0;
        let vectorIndex = 0;

        for (let y = 0; y < size; y += 1) {
            for (let x = 0; x < size; x += 1) {
                const normalizedX = ((x + 0.5) / size) - 0.5;
                const normalizedY = ((y + 0.5) / size) - 0.5;
                const radius = Math.hypot(normalizedX, normalizedY);
                let offsetX = 0;
                let offsetY = 0;

                if (radius < 0.5) {
                    const edgeStrength = smoothStep(0.24, 0.5, radius);
                    const refractionScale = 1 - (edgeStrength * 0.19);
                    offsetX = (normalizedX * refractionScale - normalizedX) * size;
                    offsetY = (normalizedY * refractionScale - normalizedY) * size;
                }

                vectors[vectorIndex] = offsetX;
                vectors[vectorIndex + 1] = offsetY;
                vectorIndex += 2;
                maxDisplacement = Math.max(maxDisplacement, Math.abs(offsetX), Math.abs(offsetY));
            }
        }

        if (!maxDisplacement) {
            return null;
        }

        const toChannel = (offset) => Math.round(Math.max(0, Math.min(255, 127.5 + ((offset / maxDisplacement) * 127.5))));
        const imageData = context.createImageData(size, size);
        vectorIndex = 0;
        for (let pixelIndex = 0; pixelIndex < imageData.data.length; pixelIndex += 4) {
            imageData.data[pixelIndex] = toChannel(vectors[vectorIndex]);
            imageData.data[pixelIndex + 1] = toChannel(vectors[vectorIndex + 1]);
            imageData.data[pixelIndex + 2] = 128;
            imageData.data[pixelIndex + 3] = 255;
            vectorIndex += 2;
        }

        context.putImageData(imageData, 0, 0);
        return {
            dataUrl: canvas.toDataURL('image/png'),
            scale: maxDisplacement * 2,
        };
    }

    function ensureLiquidGlassFilter() {
        if (document.getElementById(LIQUID_GLASS_SVG_ID)) {
            return;
        }

        try {
            const displacementMap = createLiquidGlassDisplacementMap(PANEL_TOGGLE_SIZE);
            if (!displacementMap) {
                return;
            }

            const namespace = 'http://www.w3.org/2000/svg';
            const size = String(PANEL_TOGGLE_SIZE);
            const create = (tag, attrs = {}) => {
                const node = document.createElementNS(namespace, tag);
                for (const [name, value] of Object.entries(attrs)) {
                    node.setAttribute(name, value);
                }
                return node;
            };

            const svg = create('svg', { width: '0', height: '0', 'aria-hidden': 'true' });
            svg.id = LIQUID_GLASS_SVG_ID;
            svg.style.position = 'fixed';
            svg.style.width = '0';
            svg.style.height = '0';
            svg.style.pointerEvents = 'none';

            const filter = create('filter', {
                filterUnits: 'userSpaceOnUse',
                'color-interpolation-filters': 'sRGB',
                x: '0',
                y: '0',
                width: size,
                height: size,
            });
            filter.id = LIQUID_GLASS_FILTER_ID;

            const image = create('feImage', {
                href: displacementMap.dataUrl,
                width: size,
                height: size,
                preserveAspectRatio: 'none',
                result: 'liquid-glass-map',
            });
            image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', displacementMap.dataUrl);

            const displacement = create('feDisplacementMap', {
                in: 'SourceGraphic',
                in2: 'liquid-glass-map',
                scale: displacementMap.scale.toFixed(2),
                xChannelSelector: 'R',
                yChannelSelector: 'G',
            });

            filter.appendChild(image);
            filter.appendChild(displacement);
            const defs = create('defs');
            defs.appendChild(filter);
            svg.appendChild(defs);
            document.body.appendChild(svg);
        } catch (error) {
            console.warn('[Douyin Downloader] Liquid glass filter initialization failed.', error);
        }
    }

    function getToggleIconMarkup() {
        return '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-6" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"></path></svg>';
    }

    function clampPanelTop(value) {
        const maxTop = Math.max(PANEL_EDGE_OFFSET, window.innerHeight - PANEL_TOGGLE_SIZE - PANEL_EDGE_OFFSET);
        return Math.min(Math.max(Math.round(value), PANEL_EDGE_OFFSET), maxTop);
    }

    function getDefaultPanelTop() {
        return clampPanelTop((window.innerHeight - PANEL_TOGGLE_SIZE) / 2);
    }

    function loadSavedPanelTop() {
        try {
            const raw = window.localStorage.getItem(PANEL_POSITION_KEY);
            const value = Number(raw);
            return Number.isFinite(value) ? clampPanelTop(value) : getDefaultPanelTop();
        } catch (error) {
            return getDefaultPanelTop();
        }
    }

    function savePanelTop() {
        try {
            window.localStorage.setItem(PANEL_POSITION_KEY, String(state.panelTop));
        } catch (error) {
            // Ignore storage failures.
        }
    }

    function applyPanelPosition() {
        const panel = document.getElementById(PANEL_ID);
        if (!panel) {
            return;
        }

        if (state.panelTop === null) {
            state.panelTop = loadSavedPanelTop();
        }

        panel.style.top = `${clampPanelTop(state.panelTop)}px`;
    }

    function startPanelDrag(event) {
        const toggle = document.getElementById(PANEL_TOGGLE_ID);
        const panel = document.getElementById(PANEL_ID);

        if (!toggle || !panel) {
            return;
        }

        state.pointerDrag = {
            pointerId: event.pointerId,
            startY: event.clientY,
            startTop: state.panelTop ?? loadSavedPanelTop(),
            moved: false,
        };

        panel.classList.add('is-dragging');
        toggle.setPointerCapture(event.pointerId);
    }

    function movePanelDrag(event) {
        if (!state.pointerDrag || state.pointerDrag.pointerId !== event.pointerId) {
            return;
        }

        const deltaY = event.clientY - state.pointerDrag.startY;
        if (Math.abs(deltaY) >= PANEL_DRAG_THRESHOLD) {
            state.pointerDrag.moved = true;
        }

        state.panelTop = clampPanelTop(state.pointerDrag.startTop + deltaY);
        applyPanelPosition();
    }

    function endPanelDrag(event) {
        if (!state.pointerDrag || state.pointerDrag.pointerId !== event.pointerId) {
            return;
        }

        const toggle = document.getElementById(PANEL_TOGGLE_ID);
        const panel = document.getElementById(PANEL_ID);
        const moved = state.pointerDrag.moved;

        if (toggle?.hasPointerCapture(event.pointerId)) {
            toggle.releasePointerCapture(event.pointerId);
        }

        if (panel) {
            panel.classList.remove('is-dragging');
        }

        savePanelTop();
        state.pointerDrag = null;

        if (!moved) {
            void runPrimaryAction();
        }
    }

    function isInsidePanel(node) {
        if (!(node instanceof Node)) {
            return false;
        }

        const panel = document.getElementById(PANEL_ID);
        return Boolean(panel && panel.contains(node));
    }

    function noteLocationChange() {
        const href = location.href;
        if (state.lastLocationHref === href) {
            return;
        }

        state.lastLocationHref = href;
        state.locationChangedAt = nowMs();
    }

    function scheduleRefresh(delay = REFRESH_DEBOUNCE_MS) {
        if (state.refreshTimer) {
            window.clearTimeout(state.refreshTimer);
        }

        noteLocationChange();

        state.refreshTimer = window.setTimeout(() => {
            state.refreshTimer = null;
            noteLocationChange();
            refreshUI();
        }, delay);
    }

    function mutationNeedsRefresh(mutation) {
        if (!mutation || isInsidePanel(mutation.target) || mutation.type !== 'childList') {
            return false;
        }

        return [...Array.from(mutation.addedNodes || []), ...Array.from(mutation.removedNodes || [])]
            .some((node) => !isInsidePanel(node));
    }

    // Current-page video detection and naming.
    function getViewportSize() {
        return {
            width: window.innerWidth || document.documentElement.clientWidth || 0,
            height: window.innerHeight || document.documentElement.clientHeight || 0,
        };
    }

    // 元素与视口的相交宽高
    function getVisibleExtent(rect) {
        const viewport = getViewportSize();
        return {
            width: Math.max(0, Math.min(rect.right, viewport.width) - Math.max(rect.left, 0)),
            height: Math.max(0, Math.min(rect.bottom, viewport.height) - Math.max(rect.top, 0)),
        };
    }

    function isVisible(element) {
        if (!element || !element.isConnected) {
            return false;
        }

        const rect = element.getBoundingClientRect();
        const visible = getVisibleExtent(rect);

        return rect.width > 120 && rect.height > 120 && visible.width > 80 && visible.height > 80;
    }

    function getViewportIntersectionRatio(element) {
        if (!element || !element.isConnected) {
            return 0;
        }

        const rect = element.getBoundingClientRect();
        const visible = getVisibleExtent(rect);
        const area = rect.width * rect.height;

        return area > 0 ? Math.min(1, (visible.width * visible.height) / area) : 0;
    }

    function getViewportCenterScore(element) {
        if (!element || !element.isConnected) {
            return 0;
        }

        const rect = element.getBoundingClientRect();
        const viewport = getViewportSize();
        const distanceX = Math.abs(rect.left + (rect.width / 2) - (viewport.width / 2)) / Math.max(viewport.width / 2, 1);
        const distanceY = Math.abs(rect.top + (rect.height / 2) - (viewport.height / 2)) / Math.max(viewport.height / 2, 1);

        return Math.max(0, 1 - ((distanceX + distanceY) / 2));
    }

    function scoreVideo(video) {
        if (!(video instanceof HTMLVideoElement)) {
            return -1;
        }

        let score = 0;
        const rect = video.getBoundingClientRect();
        const areaScore = Math.min((rect.width * rect.height) / 20000, 60);

        if (video.currentSrc) {
            score += 120;
        }

        if (!video.paused && !video.ended) {
            score += 90;
        }

        if (video.autoplay) {
            score += 40;
        }

        if (document.pictureInPictureElement === video) {
            score += 40;
        }

        if (isVisible(video)) {
            score += 80;
        }

        score += getViewportIntersectionRatio(video) * 120;
        score += getViewportCenterScore(video) * 70;
        score += areaScore;
        return score;
    }

    function findBestVideo() {
        return Array.from(document.querySelectorAll('video'))
            .map((video) => ({ video, score: scoreVideo(video) }))
            .sort((left, right) => right.score - left.score)[0]?.video || null;
    }

    function collectRoots(startNode) {
        const roots = [];
        let current = startNode;
        let depth = 0;

        while (current && depth < 12) {
            roots.push(current);
            current = current.parentElement;
            depth += 1;
        }

        roots.push(document);
        return roots;
    }

    function readElementText(element) {
        if (!element) {
            return '';
        }

        if (element instanceof HTMLMetaElement) {
            return normalizeText(element.content);
        }

        return normalizeText(element.textContent);
    }

    function pickText(roots, selectors, filter) {
        for (const root of roots) {
            if (!root || typeof root.querySelectorAll !== 'function') {
                continue;
            }

            for (const selector of selectors) {
                for (const element of Array.from(root.querySelectorAll(selector))) {
                    const text = readElementText(element);
                    if (text && (!filter || filter(text, element))) {
                        return text;
                    }
                }
            }
        }

        return '';
    }

    function pickNearbyText(roots, scorer) {
        const seen = new Set();
        let bestText = '';
        let bestScore = -1;

        for (const root of roots) {
            if (!(root instanceof HTMLElement)) {
                continue;
            }

            const elements = [root, ...Array.from(root.querySelectorAll('a, p, span, div'))].slice(0, 220);
            for (const element of elements) {
                const text = readTextValue(element);
                if (!text || seen.has(text)) {
                    continue;
                }

                seen.add(text);
                const score = scorer(text);
                if (score > bestScore) {
                    bestScore = score;
                    bestText = text;
                }
            }
        }

        return bestText;
    }

    function extractMetaFromVideo(video) {
        const roots = collectRoots(video);
        const nearbyRoots = roots.filter((root) => root !== document);
        const title = pickText(roots, titleSelectors, (text) => scoreTitleCandidate(text) >= 0)
            || pickNearbyText(nearbyRoots, scoreTitleCandidate);

        const author = pickText(roots, authorSelectors, (text, element) => {
            if (scoreAuthorCandidate(text) < 0) {
                return false;
            }

            return !(element.tagName === 'A' && !element.getAttribute('href'));
        }) || pickNearbyText(nearbyRoots, scoreAuthorCandidate);

        return {
            title: sanitizeFilenamePart(title, TITLE_FALLBACK),
            author: sanitizeFilenamePart(author, AUTHOR_FALLBACK),
        };
    }

    function extractVideoId(value) {
        if (typeof value !== 'string' || !value) {
            return '';
        }

        const match = value.match(/(?:modal_id=|vid=|\/video\/)(\d{8,})/);
        return match ? match[1] : '';
    }

    function extractElementVideoId(element) {
        if (!(element instanceof HTMLElement)) {
            return '';
        }

        for (const attribute of Array.from(element.attributes || [])) {
            const rawValue = attribute.value || '';
            const urlVideoId = extractVideoId(rawValue);
            if (urlVideoId) {
                return urlVideoId;
            }

            if (/(?:aweme|item|modal|video|group|vid|id)/i.test(attribute.name)) {
                const normalizedId = normalizeVideoId(rawValue);
                if (normalizedId) {
                    return normalizedId;
                }
            }
        }

        return '';
    }

    function findNearbyVideoId(video) {
        const roots = collectRoots(video).filter((root) => root instanceof HTMLElement);

        for (const root of roots) {
            const rootId = extractElementVideoId(root);
            if (rootId) {
                return rootId;
            }

            const linkedElements = Array.from(root.querySelectorAll(
                'a[href*="/video/"], a[href*="modal_id="], a[href*="vid="], [data-aweme-id], [data-item-id], [data-modal-id], [data-video-id], [data-vid]'
            )).slice(0, 80);

            for (const element of linkedElements) {
                const elementId = extractElementVideoId(element);
                if (elementId) {
                    return elementId;
                }
            }
        }

        return '';
    }

    function videoEntryMatchesTargetId(entry, targetVideoId) {
        const normalizedTargetId = normalizeVideoId(targetVideoId);
        if (!entry || !normalizedTargetId) {
            return false;
        }

        return [
            entry.videoId,
            extractVideoId(entry.videoUrl || ''),
        ].map(normalizeVideoId).filter(Boolean).includes(normalizedTargetId);
    }

    function buildBaseFilename(meta) {
        return sanitizeFilenamePart(`${compactTitleForFilename(meta.title)}_${compactAuthorForFilename(meta.author)}`, TITLE_FALLBACK);
    }

    function buildFilename(meta) {
        return `${buildBaseFilename(meta)}.mp4`;
    }

    function buildUniqueBatchFilenames(entries) {
        const filenames = new Map();
        const usedNames = new Set();
        const baseCounts = new Map();

        for (const entry of entries) {
            const base = buildBaseFilename(entry.meta);
            baseCounts.set(base, (baseCounts.get(base) || 0) + 1);
        }

        entries.forEach((entry, index) => {
            const base = buildBaseFilename(entry.meta);
            const orderPrefix = String(index + 1).padStart(3, '0');
            const build = (tail) => `${orderPrefix}_${base}${tail ? `_${tail}` : ''}.mp4`;
            const videoId = sanitizeFilenamePart(entry.videoId || '', '');
            let candidate = baseCounts.get(base) > 1 && videoId ? build(videoId) : build('');

            if (usedNames.has(candidate)) {
                let suffixIndex = 2;
                while (usedNames.has(build(String(suffixIndex).padStart(2, '0')))) {
                    suffixIndex += 1;
                }
                candidate = build(String(suffixIndex).padStart(2, '0'));
            }

            usedNames.add(candidate);
            filenames.set(entry.id, candidate);
        });

        return filenames;
    }

    function isDirectHttpVideoUrl(value) {
        return typeof value === 'string' && /^https?:\/\//i.test(value);
    }

    function isPlayableVideoUrl(value) {
        return typeof value === 'string' && /^(https?:|blob:)/i.test(value);
    }

    function getVideoCandidateUrls(video) {
        const candidates = [];
        const pushCandidate = (value) => {
            if (!value || typeof value !== 'string') {
                return;
            }

            const trimmed = value.trim();
            if (trimmed && !candidates.includes(trimmed)) {
                candidates.push(trimmed);
            }
        };

        pushCandidate(video?.currentSrc);
        pushCandidate(video?.src);

        for (const source of Array.from(video?.querySelectorAll?.('source') || [])) {
            pushCandidate(source.src);
            pushCandidate(source.getAttribute('src'));
        }

        return candidates;
    }

    function pickDirectVideoUrl(video) {
        return getVideoCandidateUrls(video).find(isDirectHttpVideoUrl) || '';
    }

    function pickPlayableVideoUrl(video) {
        return getVideoCandidateUrls(video).find(isPlayableVideoUrl) || '';
    }

    function isDashOnlyDefinition(definition) {
        if (!definition || typeof definition !== 'object') {
            return false;
        }

        const text = [
            definition.format,
            definition.vtype,
            definition.type,
            definition.mediaType,
            definition.media_type,
        ].map((item) => String(item || '').toLowerCase()).join(' ');

        return text.includes('dash') || Boolean(definition.audioDefinition || definition.audio_definition);
    }

    function pushDefinitionVideoUrlCandidate(bucket, key, value, bonus = 0, options = {}) {
        if (!looksLikeVideoUrl(key, value)) {
            return;
        }

        const loweredValue = value.toLowerCase();
        const isDirectVod = loweredValue.includes('douyinvod') || loweredValue.includes('video/tos');
        const dashOnly = Boolean(options.dashOnly || /\/aweme\/v1\/play\/dash/i.test(loweredValue));

        bucket.push({
            value,
            dashOnly,
            score: scoreVideoUrl(key, value) + bonus + (isDirectVod ? 160 : 0) - (dashOnly ? 520 : 0),
        });
    }

    // 按 [字段名, 加分] 表批量收集候选地址，键名为 `${label}_${字段名}`
    function pushFieldCandidates(bucket, label, source, fields, bonus, options) {
        for (const [field, extra] of fields) {
            pushDefinitionVideoUrlCandidate(bucket, `${label}_${field}`, source[field], bonus + extra, options);
        }
    }

    const DEFINITION_FIELDS = [
        ['main_url', 120], ['mainUrl', 120], ['backup_url', 90], ['backupUrl', 90], ['fallback_url', 50], ['fallbackUrl', 50],
    ];
    const DEFINITION_ITEM_FIELDS = [['src', 140], ['main_url', 125], ['url', 100], ['backup_url', 90]];
    const URL_LIST_OBJECT_FIELDS = [['src', 40], ['url', 20], ['main_url', 20], ['backup_url', 0]];
    const URL_LIST_ITEM_FIELDS = [['src', 60], ['url', 40], ['main_url', 30], ['backup_url', 10]];

    function collectDefinitionVideoUrlCandidates(definition, bucket, bonus = 0) {
        if (!definition || typeof definition !== 'object') {
            return;
        }

        const options = {
            dashOnly: isDashOnlyDefinition(definition),
        };

        pushFieldCandidates(bucket, 'definition', definition, DEFINITION_FIELDS, bonus, options);

        const urls = Array.isArray(definition.url) ? definition.url : [];
        urls.forEach((item, index) => {
            if (typeof item === 'string') {
                pushDefinitionVideoUrlCandidate(bucket, `definition_url_${index}`, item, bonus + 110, options);
                return;
            }

            if (!item || typeof item !== 'object') {
                return;
            }

            pushFieldCandidates(bucket, `definition_url_${index}`, item, DEFINITION_ITEM_FIELDS, bonus, {
                dashOnly: options.dashOnly || isDashOnlyDefinition(item),
            });
        });
    }

    function collectUrlListVideoUrlCandidates(value, bucket, label = 'player_url', bonus = 0) {
        if (!value) {
            return;
        }

        if (typeof value === 'string') {
            pushDefinitionVideoUrlCandidate(bucket, label, value, bonus);
            return;
        }

        if (!Array.isArray(value)) {
            if (typeof value === 'object') {
                pushFieldCandidates(bucket, label, value, URL_LIST_OBJECT_FIELDS, bonus, {
                    dashOnly: isDashOnlyDefinition(value),
                });
            }
            return;
        }

        value.forEach((item, index) => {
            if (typeof item === 'string') {
                pushDefinitionVideoUrlCandidate(bucket, `${label}_${index}`, item, bonus + 20);
                return;
            }

            if (!item || typeof item !== 'object') {
                return;
            }

            pushFieldCandidates(bucket, `${label}_${index}`, item, URL_LIST_ITEM_FIELDS, bonus, {
                dashOnly: isDashOnlyDefinition(item),
            });
        });
    }

    function safeReadProperty(object, key) {
        try {
            return object?.[key];
        } catch (error) {
            return null;
        }
    }

    function getPageWindow() {
        try {
            if (typeof unsafeWindow === 'object' && unsafeWindow) {
                return unsafeWindow;
            }
        } catch (error) {
            // Fall back to the userscript window when unsafeWindow is unavailable.
        }

        return window;
    }

    function getPagePlayerObject(name = 'player') {
        try {
            const playerObject = getPageWindow()?.[name];
            return playerObject && typeof playerObject === 'object' ? playerObject : null;
        } catch (error) {
            return null;
        }
    }

    function getGlobalPlayerObjects() {
        return PLAYER_NAMES.map((name) => getPagePlayerObject(name)).filter(Boolean);
    }

    function scoreGlobalPlayer(playerObject, video) {
        let score = 0;

        try {
            if (video && playerObject.video === video) {
                score += 300;
            }

            if (playerObject.isUserActive === true) {
                score += 90;
            }

            if (playerObject.isPlaying === true) {
                score += 70;
            }

            if (playerObject.replayed === true) {
                score += 20;
            }

            if (playerObject.isActive === true) {
                score += 15;
            }

            if (playerObject.isAutoPlay === true || playerObject.isSrcVoid === true) {
                score -= 40;
            }

            const playerTime = Number(playerObject.currentTime ?? playerObject._currentTime);
            const videoTime = Number(video?.currentTime);
            if (Number.isFinite(playerTime) && Number.isFinite(videoTime)) {
                score += Math.max(0, 60 - Math.abs(playerTime - videoTime));
            }

            const playerDuration = Number(playerObject.duration ?? playerObject._duration);
            const videoDuration = Number(video?.duration);
            if (Number.isFinite(playerDuration) && Number.isFinite(videoDuration)) {
                score += Math.max(0, 40 - Math.abs(playerDuration - videoDuration));
            }

            if (normalizeVideoId(playerObject.curDefinition?.id || playerObject.config?.id)) {
                score += 40;
            }
        } catch (error) {
            return score;
        }

        return score;
    }

    function extractGlobalPlayerEntry(playerObject) {
        if (!playerObject || typeof playerObject !== 'object') {
            return null;
        }

        const config = safeReadProperty(playerObject, 'config') || {};
        const curDefinition = safeReadProperty(playerObject, 'curDefinition');
        const currentDefinition = safeReadProperty(playerObject, 'currentDefinition');
        const videoConfig = safeReadProperty(playerObject, 'videoConfig');
        const privateVideoConfig = safeReadProperty(playerObject, '_videoConfig');

        const videoId = [
            curDefinition?.id,
            currentDefinition?.id,
            config?.id,
            videoConfig?.id,
            privateVideoConfig?.id,
        ].map(normalizeVideoId).find(Boolean) || '';

        const urlCandidates = [];
        collectUrlListVideoUrlCandidates(config?.downloadUrl, urlCandidates, 'config_downloadUrl', 420);
        collectUrlListVideoUrlCandidates(config?.download_url, urlCandidates, 'config_download_url', 420);
        collectUrlListVideoUrlCandidates(config?.videoUrl, urlCandidates, 'config_videoUrl', 360);
        collectUrlListVideoUrlCandidates(config?.video_url, urlCandidates, 'config_video_url', 360);
        collectUrlListVideoUrlCandidates(config?.url, urlCandidates, 'config_url', 320);
        collectDefinitionVideoUrlCandidates(config?.definition, urlCandidates, 260);
        collectDefinitionVideoUrlCandidates(curDefinition, urlCandidates, 160);
        collectDefinitionVideoUrlCandidates(currentDefinition, urlCandidates, 150);

        const sortedCandidates = urlCandidates.sort((left, right) => right.score - left.score);
        const selectedCandidate = sortedCandidates[0] || null;
        const videoUrl = selectedCandidate?.value || '';
        const alternateUrls = Array.from(new Set(sortedCandidates.map((item) => item.value).filter(Boolean)))
            .filter((url) => url !== videoUrl);

        if (!videoId && !videoUrl) {
            return null;
        }

        return {
            videoId,
            videoUrl,
            alternateUrls,
            dashOnly: Boolean(selectedCandidate?.dashOnly),
            meta: {},
        };
    }

    function getCurrentGlobalPlayerEntry(video) {
        return getGlobalPlayerObjects()
            .map((playerObject) => ({
                entry: extractGlobalPlayerEntry(playerObject),
                score: scoreGlobalPlayer(playerObject, video),
            }))
            .filter((item) => item.entry && item.score > 0)
            .sort((left, right) => right.score - left.score)[0]?.entry || null;
    }

    function getRecommendPlayerEntry(video) {
        const playerObject = getPagePlayerObject('player');
        if (!playerObject) {
            return null;
        }

        const entry = extractGlobalPlayerEntry(playerObject);
        if (!entry?.videoUrl) {
            return entry;
        }

        const score = scoreGlobalPlayer(playerObject, video);
        const playerVideo = safeReadProperty(playerObject, 'video');
        const clearlyCurrent = (video && playerVideo && playerVideo === video) ||
            safeReadProperty(playerObject, 'isUserActive') === true ||
            safeReadProperty(playerObject, 'isPlaying') === true ||
            Number(safeReadProperty(playerObject, 'currentTime') ?? safeReadProperty(playerObject, '_currentTime')) > 0;

        return !clearlyCurrent && score <= 0 ? null : entry;
    }

    function pickRecentPerformanceVideoUrl(options = {}) {
        const sinceTime = Number(options.sinceTime) || 0;
        const preferRecent = Boolean(options.preferRecent);
        const candidates = [];

        for (const record of state.mediaUrlRecords) {
            const startTime = Number(record?.time) || 0;
            const url = record?.url || '';
            const source = record?.source || 'resource';
            if ((sinceTime && startTime < sinceTime) || !looksLikeVideoUrl(source, url)) {
                continue;
            }

            candidates.push({
                url,
                score: (Number(record?.score) || scoreVideoUrl(source, url)) + (startTime / 100000),
                startTime,
            });
        }

        if (window.performance && typeof performance.getEntriesByType === 'function') {
            for (const entry of performance.getEntriesByType('resource')) {
                const name = entry?.name || '';
                const startTime = Number(entry?.startTime) || 0;
                const source = `resource:${entry?.initiatorType || 'other'}`;
                if ((sinceTime && startTime < sinceTime)
                    || !looksLikeVideoUrl(source, name)
                    || !/^(video|fetch|xmlhttprequest|other)$/i.test(entry.initiatorType || 'other')) {
                    continue;
                }

                candidates.push({
                    url: name,
                    score: scoreVideoUrl(source, name) + (startTime / 100000),
                    startTime,
                });
            }
        }

        return candidates
            .sort((left, right) => (preferRecent
                ? right.startTime - left.startTime || right.score - left.score
                : right.score - left.score || right.startTime - left.startTime))[0]?.url || '';
    }

    async function waitForRecentPerformanceVideoUrl(options = {}) {
        const attempts = Number(options.attempts) || 6;
        const delay = Number(options.delay) || 300;

        for (let attempt = 0; attempt < attempts; attempt += 1) {
            const videoUrl = pickRecentPerformanceVideoUrl(options);
            if (videoUrl) {
                return videoUrl;
            }

            await wait(delay);
        }

        return '';
    }

    function triggerBrowserDownload(blob, filename) {
        const blobUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a');

        anchor.href = blobUrl;
        anchor.download = filename;
        anchor.style.display = 'none';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();

        window.setTimeout(() => {
            URL.revokeObjectURL(blobUrl);
        }, 1500);
    }

    function getFetchCredentialsForUrl(url) {
        const target = parsePageUrl(url);
        if (!target) {
            return 'same-origin';
        }

        return target.origin === location.origin ? 'include' : 'omit';
    }

    function getHeaderValue(headersText = '', headerName = '') {
        const match = String(headersText || '').match(new RegExp(`^${headerName}:\\s*(.+)$`, 'im'));
        return match ? match[1].trim() : '';
    }

    function assertUsableVideoBlob(blob, context = {}) {
        const size = Number(blob?.size) || 0;
        const contentType = String(context.contentType || blob?.type || '').toLowerCase();
        const status = Number(context.status) || 0;

        if (status && (status < 200 || status >= 300)) {
            throw new Error(`Video request failed with HTTP ${status}`);
        }

        if (!size) {
            throw new Error('Empty video response');
        }

        if (size < MIN_VIDEO_RESPONSE_BYTES) {
            throw new Error(`Video response is too small (${size} bytes)`);
        }

        if (/^(text\/|application\/(?:json|xml)|.*html|.*xml)/i.test(contentType)) {
            throw new Error(`Video response has unexpected content type: ${contentType || 'unknown'}`);
        }
    }

    function readAsciiBytes(bytes, offset, length) {
        if (!bytes || offset < 0 || offset + length > bytes.length) {
            return '';
        }

        let value = '';
        for (let index = 0; index < length; index += 1) {
            value += String.fromCharCode(bytes[offset + index]);
        }
        return value;
    }

    function readIsoBmffBoxHeader(bytes, offset = 0, end = bytes?.length || 0, zeroSize = end - offset) {
        if (!bytes || offset < 0 || offset + 8 > end) {
            return null;
        }

        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const size32 = view.getUint32(offset);
        const type = readAsciiBytes(bytes, offset + 4, 4);
        let size = size32;
        let headerSize = 8;

        if (size32 === 1) {
            if (offset + 16 > end) {
                return null;
            }

            size = (view.getUint32(offset + 8) * 0x100000000) + view.getUint32(offset + 12);
            headerSize = 16;
            if (!Number.isSafeInteger(size)) {
                return null;
            }
        } else if (size32 === 0) {
            size = zeroSize;
        }

        if (!type || size < headerSize) {
            return null;
        }

        return {
            type,
            size,
            headerSize,
            contentOffset: offset + headerSize,
        };
    }

    function inspectIsoBmffBytes(value) {
        const bytes = value instanceof Uint8Array ? value : new Uint8Array(value || 0);
        const handlers = new Set();
        const containerTypes = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'edts', 'udta', 'meta', 'moof', 'traf']);
        let scannedBoxes = 0;

        const walk = (start, end, depth = 0) => {
            if (depth > 12 || start < 0 || end > bytes.length || start >= end) {
                return;
            }

            let offset = start;
            while (offset + 8 <= end && scannedBoxes < MAX_MP4_BOX_SCAN_COUNT) {
                const header = readIsoBmffBoxHeader(bytes, offset, end);
                if (!header || offset + header.size > end) {
                    return;
                }

                scannedBoxes += 1;
                const contentEnd = offset + header.size;
                if (header.type === 'hdlr' && header.contentOffset + 12 <= contentEnd) {
                    const handlerType = readAsciiBytes(bytes, header.contentOffset + 8, 4);
                    if (handlerType) {
                        handlers.add(handlerType);
                    }
                }

                if (containerTypes.has(header.type)) {
                    walk(header.contentOffset + (header.type === 'meta' ? 4 : 0), contentEnd, depth + 1);
                }

                offset = contentEnd;
            }
        };

        walk(0, bytes.length);
        return {
            container: 'mp4',
            audio: handlers.has('soun'),
            video: handlers.has('vide'),
            conclusive: handlers.has('soun') || handlers.has('vide'),
            handlers: Array.from(handlers).sort(),
        };
    }

    function inspectIsoBmffRangeBytes(value) {
        const bytes = value instanceof Uint8Array ? value : new Uint8Array(value || 0);
        const directResult = inspectIsoBmffBytes(bytes);
        if (directResult.conclusive) {
            return directResult;
        }

        for (let typeOffset = 4; typeOffset + 4 <= bytes.length; typeOffset += 1) {
            if (bytes[typeOffset] !== 0x6d
                || bytes[typeOffset + 1] !== 0x6f
                || bytes[typeOffset + 2] !== 0x6f
                || bytes[typeOffset + 3] !== 0x76) {
                continue;
            }

            const boxOffset = typeOffset - 4;
            const header = readIsoBmffBoxHeader(bytes, boxOffset, bytes.length);
            if (!header
                || header.type !== 'moov'
                || header.size > MAX_MP4_METADATA_BYTES
                || boxOffset + header.size > bytes.length) {
                continue;
            }

            const result = inspectIsoBmffBytes(bytes.subarray(boxOffset, boxOffset + header.size));
            if (result.conclusive) {
                return result;
            }
        }

        return directResult;
    }

    function gmFetchRangeBytes(url, rangeHeader) {
        if (typeof GM_xmlhttpRequest !== 'function') {
            return Promise.reject(new Error('GM_xmlhttpRequest is unavailable'));
        }

        return new Promise((resolve, reject) => {
            const { isSettled, resolveOnce, rejectOnce } = createSettler(resolve, reject);
            let requestHandle = null;

            requestHandle = GM_xmlhttpRequest({
                method: 'GET',
                url,
                headers: {
                    Range: rangeHeader,
                    Accept: 'video/mp4,video/*;q=0.9,*/*;q=0.1',
                },
                responseType: 'arraybuffer',
                timeout: 30000,
                onprogress: (event) => {
                    if ((Number(event?.loaded) || 0) <= MAX_RANGE_PROBE_RESPONSE_BYTES) {
                        return;
                    }

                    try {
                        requestHandle?.abort?.();
                    } catch (error) {
                        // Reject below even when the userscript manager cannot abort the request.
                    }
                    rejectOnce(new Error('Server ignored the MP4 metadata range request'));
                },
                onload: async (response) => {
                    if (isSettled()) {
                        return;
                    }

                    const status = Number(response?.status) || 0;
                    if (status && (status < 200 || status >= 300)) {
                        rejectOnce(new Error(`MP4 metadata request failed with HTTP ${status}`));
                        return;
                    }

                    try {
                        const responseValue = response?.response;
                        let bytes;
                        if (responseValue instanceof ArrayBuffer) {
                            bytes = new Uint8Array(responseValue);
                        } else if (ArrayBuffer.isView(responseValue)) {
                            bytes = new Uint8Array(
                                responseValue.buffer,
                                responseValue.byteOffset,
                                responseValue.byteLength
                            );
                        } else if (responseValue instanceof Blob) {
                            bytes = new Uint8Array(await responseValue.arrayBuffer());
                        } else {
                            throw new Error('MP4 metadata request returned an unsupported response');
                        }

                        if (!bytes.length || bytes.length > MAX_RANGE_PROBE_RESPONSE_BYTES) {
                            throw new Error('MP4 metadata response had an unexpected size');
                        }

                        resolveOnce(bytes);
                    } catch (error) {
                        rejectOnce(error);
                    }
                },
                onerror: (error) => {
                    rejectOnce(new Error(error?.error || 'MP4 metadata request failed'));
                },
                ontimeout: () => {
                    rejectOnce(new Error('MP4 metadata request timeout'));
                },
            });
        });
    }

    async function inspectRemoteIsoBmffTracks(url) {
        const ranges = [
            `bytes=0-${MP4_RANGE_PROBE_BYTES - 1}`,
            `bytes=-${MP4_RANGE_PROBE_BYTES}`,
        ];

        for (const rangeHeader of ranges) {
            try {
                const bytes = await gmFetchRangeBytes(url, rangeHeader);
                const mediaInfo = inspectIsoBmffRangeBytes(bytes);
                if (mediaInfo.conclusive) {
                    return mediaInfo;
                }
            } catch (error) {
                console.warn('[Douyin Downloader] MP4 metadata probe failed.', rangeHeader, error);
            }
        }

        return { ...EMPTY_MEDIA_INFO };
    }

    async function inspectIsoBmffBlob(blob) {
        if (!(blob instanceof Blob) || blob.size < 8) {
            return { ...EMPTY_MEDIA_INFO };
        }

        let offset = 0;
        let scannedBoxes = 0;
        let sawIsoBmffMarker = false;

        while (offset + 8 <= blob.size && scannedBoxes < MAX_MP4_BOX_SCAN_COUNT) {
            const headerBytes = new Uint8Array(await blob.slice(offset, Math.min(blob.size, offset + 16)).arrayBuffer());
            const header = readIsoBmffBoxHeader(headerBytes, 0, headerBytes.length, blob.size - offset);
            if (!header || offset + header.size > blob.size) {
                break;
            }

            scannedBoxes += 1;
            if (header.type === 'ftyp' || header.type === 'styp' || header.type === 'moov') {
                sawIsoBmffMarker = true;
            }

            if (header.type === 'moov') {
                if (header.size > MAX_MP4_METADATA_BYTES) {
                    return { ...EMPTY_MEDIA_INFO, container: 'mp4' };
                }

                return inspectIsoBmffBytes(new Uint8Array(await blob.slice(offset, offset + header.size).arrayBuffer()));
            }

            offset += header.size;
        }

        return { ...EMPTY_MEDIA_INFO, container: sawIsoBmffMarker ? 'mp4' : 'unknown' };
    }

    function validateMediaTrackInfo(mediaInfo, options = {}) {
        if (options.rejectVideoOnly && mediaInfo.conclusive && mediaInfo.video && !mediaInfo.audio) {
            const error = new Error('MP4 candidate contains a video track but no audio track');
            error.code = 'VIDEO_ONLY_MEDIA';
            error.mediaInfo = mediaInfo;
            throw error;
        }

        return mediaInfo;
    }

    async function validateBlobMediaTracks(blob, options = {}) {
        let mediaInfo;
        try {
            mediaInfo = await inspectIsoBmffBlob(blob);
        } catch (error) {
            return { ...EMPTY_MEDIA_INFO };
        }

        return validateMediaTrackInfo(mediaInfo, options);
    }

    function isMediaValidationError(error) {
        return error?.code === 'VIDEO_ONLY_MEDIA';
    }

    async function saveBlobToDirectory(directoryHandle, filename, blob) {
        const fileHandle = await directoryHandle.getFileHandle(filename, {
            create: true,
        });
        const writable = await fileHandle.createWritable();

        try {
            await writable.write(blob);
        } finally {
            await writable.close();
        }
    }

    function gmDownload(url, filename, onProgress) {
        if (typeof GM_download !== 'function') {
            return Promise.reject(new Error('GM_download is unavailable'));
        }

        return new Promise((resolve, reject) => {
            const { resolveOnce, rejectOnce } = createSettler(resolve, reject);
            let downloadHandle = null;

            downloadHandle = GM_download({
                url,
                name: filename,
                saveAs: false,
                onload: resolveOnce,
                onprogress: (event) => {
                    const loaded = Number(event?.loaded) || 0;
                    const total = Number(event?.total) || 0;
                    if (total > 0 && total < MIN_VIDEO_RESPONSE_BYTES) {
                        try {
                            downloadHandle?.abort?.();
                        } catch (error) {
                            // Reject below even when the userscript manager cannot abort the transfer.
                        }
                        rejectOnce(new Error(`Video response is too small (${total} bytes)`));
                        return;
                    }

                    if (typeof onProgress === 'function') {
                        onProgress({
                            phase: 'downloading',
                            loaded,
                            total,
                        });
                    }
                },
                onerror: (error) => {
                    rejectOnce(new Error(error?.error || 'GM_download failed'));
                },
                ontimeout: () => {
                    rejectOnce(new Error('GM_download timeout'));
                },
            });
        });
    }

    function gmFetchBlob(url, onProgress) {
        if (typeof GM_xmlhttpRequest !== 'function') {
            return Promise.reject(new Error('GM_xmlhttpRequest is unavailable'));
        }

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url,
                responseType: 'blob',
                timeout: 120000,
                onprogress: (event) => {
                    if (typeof onProgress !== 'function') {
                        return;
                    }

                    onProgress({
                        phase: 'downloading',
                        loaded: Number(event?.loaded) || 0,
                        total: Number(event?.total) || 0,
                    });
                },
                onload: (response) => {
                    const blob = response?.response;
                    if (!(blob instanceof Blob) || !blob.size) {
                        reject(new Error('GM_xmlhttpRequest returned an empty response'));
                        return;
                    }

                    const headersText = response?.responseHeaders || '';
                    try {
                        assertUsableVideoBlob(blob, {
                            contentType: getHeaderValue(headersText, 'content-type') || blob.type,
                            status: response?.status,
                        });
                    } catch (error) {
                        reject(error);
                        return;
                    }

                    resolve({
                        blob,
                        total: Number(getHeaderValue(headersText, 'content-length')) || blob.size,
                    });
                },
                onerror: (error) => {
                    reject(new Error(error?.error || 'GM_xmlhttpRequest failed'));
                },
                ontimeout: () => {
                    reject(new Error('GM_xmlhttpRequest timeout'));
                },
            });
        });
    }

    async function downloadVideoUrl(videoUrl, filename, onProgress, options = {}) {
        const directoryHandle = options.directoryHandle || null;
        const isBlobUrl = typeof videoUrl === 'string' && videoUrl.startsWith('blob:');
        const report = (loaded, total) => {
            if (typeof onProgress === 'function') {
                onProgress({ phase: loaded || total ? 'downloading' : 'requesting', loaded, total });
            }
        };
        // 写入目录或触发浏览器下载
        const deliverBlob = (blob) => (directoryHandle
            ? saveBlobToDirectory(directoryHandle, filename, blob)
            : triggerBrowserDownload(blob, filename));

        report(0, 0);

        if (isBlobUrl && !directoryHandle) {
            const response = await fetch(videoUrl);
            const blob = await response.blob();
            assertUsableVideoBlob(blob, {
                contentType: response.headers.get('content-type') || blob.type,
                status: response.status,
            });
            const mediaInfo = await validateBlobMediaTracks(blob, options);

            triggerBrowserDownload(blob, filename);
            return { mediaInfo };
        }

        let probedMediaInfo = null;
        if (!isBlobUrl && options.inspectMediaTracks) {
            probedMediaInfo = await inspectRemoteIsoBmffTracks(videoUrl);
            if (probedMediaInfo.conclusive) {
                validateMediaTrackInfo(probedMediaInfo, options);
            }
        }

        if (!isBlobUrl
            && directoryHandle
            && (!options.inspectMediaTracks || probedMediaInfo?.conclusive)) {
            try {
                await fetchVideoToDirectory(videoUrl, directoryHandle, filename, onProgress);
                return { mediaInfo: probedMediaInfo };
            } catch (error) {
                console.warn('[Douyin Downloader] Streaming directory download failed, falling back to buffered download.', error);
            }
        }

        if (!isBlobUrl || directoryHandle) {
            try {
                const result = await gmFetchBlob(videoUrl, onProgress);
                const mediaInfo = await validateBlobMediaTracks(result.blob, options);
                await deliverBlob(result.blob);
                return { mediaInfo };
            } catch (error) {
                if (isMediaValidationError(error)) {
                    throw error;
                }
                console.warn(`[Douyin Downloader] ${directoryHandle ? 'Directory download via ' : ''}GM_xmlhttpRequest download failed, falling back to fetch.`, error);
            }
        }

        try {
            const response = await fetch(videoUrl, {
                credentials: getFetchCredentialsForUrl(videoUrl),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const total = Number(response.headers.get('content-length')) || 0;
            const contentType = response.headers.get('content-type') || '';
            let blob;

            if (!response.body || typeof response.body.getReader !== 'function') {
                blob = await response.blob();
                report(blob.size, total || blob.size);
            } else {
                const reader = response.body.getReader();
                const chunks = [];
                let loaded = 0;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        break;
                    }

                    if (value) {
                        chunks.push(value);
                        loaded += value.byteLength;
                        report(loaded, total);
                    }
                }

                blob = new Blob(chunks, {
                    type: contentType || 'video/mp4',
                });
            }

            if (!blob.size) {
                throw new Error('Empty response body');
            }
            assertUsableVideoBlob(blob, {
                contentType: contentType || blob.type,
                status: response.status,
            });
            const mediaInfo = await validateBlobMediaTracks(blob, options);

            await deliverBlob(blob);
            return { mediaInfo };
        } catch (error) {
            if (isMediaValidationError(error)) {
                throw error;
            }

            if (!options.rejectVideoOnly && typeof GM_download === 'function') {
                console.warn(`[Douyin Downloader] ${directoryHandle ? 'Directory download via fetch failed, falling back to browser download.' : 'Blob download failed, falling back to GM_download.'}`, error);
                await gmDownload(videoUrl, filename, onProgress);
                return { mediaInfo: null };
            }

            throw error;
        }
    }

    async function fetchVideoToDirectory(videoUrl, directoryHandle, filename, onProgress) {
        const response = await fetch(videoUrl, {
            credentials: getFetchCredentialsForUrl(videoUrl),
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const total = Number(response.headers.get('content-length')) || 0;
        const contentType = response.headers.get('content-type') || 'video/mp4';
        if (total > 0) {
            assertUsableVideoBlob({ size: total, type: contentType }, {
                contentType,
                status: response.status,
            });
        }

        if (!response.body || typeof response.body.getReader !== 'function') {
            const blob = await response.blob();
            assertUsableVideoBlob(blob, {
                contentType,
                status: response.status,
            });
            if (typeof onProgress === 'function') {
                onProgress({
                    phase: 'downloading',
                    loaded: blob.size,
                    total: total || blob.size,
                });
            }
            await saveBlobToDirectory(directoryHandle, filename, blob);
            return;
        }

        const fileHandle = await directoryHandle.getFileHandle(filename, {
            create: true,
        });
        const writable = await fileHandle.createWritable();
        const reader = response.body.getReader();
        let loaded = 0;

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }

                if (!value) {
                    continue;
                }

                await writable.write(value);
                loaded += value.byteLength;
                if (typeof onProgress === 'function') {
                    onProgress({
                        phase: 'downloading',
                        loaded,
                        total,
                    });
                }
            }

            assertUsableVideoBlob({ size: loaded, type: contentType }, {
                contentType,
                status: response.status,
            });
            await writable.close();
        } catch (error) {
            try {
                await reader.cancel();
            } catch (cancelError) {
                // Continue cleanup even when the response stream cannot be cancelled.
            }
            try {
                if (typeof writable.abort === 'function') {
                    await writable.abort();
                } else {
                    await writable.close();
                }
            } catch (closeError) {
                // Preserve the original transfer error.
            }
            throw error;
        }
    }

    function getEntryCandidateUrls(entry, options = {}) {
        const excludedUrls = new Set(
            Array.isArray(options.excludeUrls)
                ? options.excludeUrls.filter((value) => typeof value === 'string' && value)
                : []
        );
        const candidates = [
            entry?.videoUrl,
            ...(Array.isArray(entry?.alternateUrls) ? entry.alternateUrls : []),
        ];

        return Array.from(new Set(candidates))
            .filter(isPlayableVideoUrl)
            .filter((url) => !excludedUrls.has(url));
    }

    async function downloadVideoEntry(entry, filename, onProgress, options = {}) {
        const candidateUrls = getEntryCandidateUrls(entry, {
            excludeUrls: options.excludeUrls,
        });
        if (!candidateUrls.length) {
            throw new Error('No playable candidate video URLs were available');
        }

        const download = typeof options.download === 'function' ? options.download : downloadVideoUrl;
        const onAttempt = typeof options.onAttempt === 'function' ? options.onAttempt : null;
        const onFailure = typeof options.onFailure === 'function'
            ? options.onFailure
            : (failure) => console.warn('[Douyin Downloader] Candidate video URL failed.', failure.error);
        const downloadOptions = options.downloadOptions || {};
        let lastError = null;

        for (let index = 0; index < candidateUrls.length; index += 1) {
            const videoUrl = candidateUrls[index];
            if (onAttempt) {
                onAttempt({
                    videoUrl,
                    index,
                    total: candidateUrls.length,
                });
            }

            try {
                const downloadResult = await download(videoUrl, filename, onProgress, {
                    ...downloadOptions,
                    rejectVideoOnly: index < candidateUrls.length - 1,
                    inspectMediaTracks: candidateUrls.length > 1,
                });
                return {
                    videoUrl,
                    index,
                    total: candidateUrls.length,
                    mediaInfo: downloadResult?.mediaInfo || null,
                };
            } catch (error) {
                lastError = error;
                onFailure({
                    videoUrl,
                    error,
                    index,
                    total: candidateUrls.length,
                });
            }
        }

        const error = new Error(
            `All ${candidateUrls.length} candidate video URLs failed${lastError?.message ? `: ${lastError.message}` : ''}`
        );
        error.cause = lastError;
        error.attemptedUrls = candidateUrls;
        throw error;
    }

    function normalizeVideoPageUrl(href) {
        if (!href) {
            return '';
        }

        try {
            const url = new URL(href, location.href);
            if (url.origin !== location.origin) {
                return '';
            }

            const modalId = url.searchParams.get('modal_id');
            if (modalId && /^\d+$/.test(modalId)) {
                return `${location.origin}/video/${modalId}`;
            }

            const videoMatch = url.pathname.match(/\/video\/(\d+)/);
            if (videoMatch) {
                return `${location.origin}/video/${videoMatch[1]}`;
            }
        } catch (error) {
            console.warn('[Douyin Downloader] Failed to normalize profile link.', error);
        }

        return '';
    }

    function buildProfileVideoPageUrl(videoId) {
        const normalizedId = normalizeVideoId(videoId);
        if (!normalizedId) {
            return '';
        }

        if (/\/user\//.test(location.pathname)) {
            return `${location.origin}${location.pathname}?modal_id=${normalizedId}`;
        }

        return `${location.origin}/video/${normalizedId}`;
    }

    function buildStandaloneVideoPageUrl(videoId) {
        const normalizedId = normalizeVideoId(videoId);
        return normalizedId ? `${location.origin}/video/${normalizedId}` : '';
    }

    function buildAwemeDetailUrls(videoId) {
        const normalizedId = normalizeVideoId(videoId);
        if (!normalizedId) {
            return [];
        }

        const encodedId = encodeURIComponent(normalizedId);
        return [
            `${location.origin}/aweme/v1/web/aweme/detail/?aweme_id=${encodedId}&aid=6383&device_platform=webapp&version_name=26.1.0`,
            `${location.origin}/aweme/v1/web/aweme/detail/?aweme_id=${encodedId}&aid=6383`,
            `${location.origin}/web/api/v2/aweme/iteminfo/?item_ids=${encodedId}`,
        ];
    }

    function shouldPreferScopedPageResolution(href = location.href) {
        return Boolean(parsePageUrl(href)?.searchParams.get('modal_id'));
    }

    // 无 modal_id 的推荐 / 精选 / 朋友页
    function isFeedBasePage(url) {
        if (!url || url.searchParams.get('modal_id')) {
            return false;
        }

        return (/^\/$/.test(url.pathname) && url.searchParams.get('recommend') === '1')
            || /^\/jingxuan$/i.test(url.pathname)
            || isFriendFeedPage(url.href);
    }

    function shouldPreferCurrentDocumentResolution(href = location.href) {
        return isFeedBasePage(parsePageUrl(href));
    }

    function isRecommendPage(href = location.href) {
        const url = parsePageUrl(href);
        return Boolean(url && /^\/$/.test(url.pathname) && url.searchParams.get('recommend') === '1');
    }

    function isFriendFeedPage(href = location.href) {
        const url = parsePageUrl(href);
        return Boolean(url && /^\/friend\/?$/i.test(url.pathname) && !url.searchParams.get('modal_id'));
    }

    function isUserSelfFeedTab(url) {
        if (!/^\/user\/self$/i.test(url.pathname)) {
            return false;
        }

        const tabName = String(url.searchParams.get('showTab') || url.searchParams.get('from_tab_name') || '').toLowerCase();
        return ['like', 'favorite', 'collection', 'collect', 'record', 'history'].includes(tabName);
    }

    function isProfileBatchEligiblePage(href = location.href) {
        const url = parsePageUrl(href);
        if (!url || !/\/user\//i.test(url.pathname) || /\/video\//i.test(url.pathname)) {
            return false;
        }

        return !url.searchParams.get('modal_id') && !isUserSelfFeedTab(url);
    }

    function isFeedStyleCurrentVideoPage(href = location.href) {
        const url = parsePageUrl(href);
        if (!url || url.searchParams.get('modal_id')) {
            return false;
        }

        return isFeedBasePage(url) || isUserSelfFeedTab(url);
    }

    function isSearchModalPage(href = location.href) {
        const url = parsePageUrl(href);
        return Boolean(url && url.searchParams.get('modal_id') && /\/search\//i.test(url.pathname));
    }

    // Profile-card metadata extraction.
    function getProfilePageAuthor() {
        const title = normalizeText(document.title)
            .replace(/\s*-\s*\u6296\u97f3$/, '')
            .replace(/\u7684\u6296\u97f3$/, '')
            .trim();

        return scoreAuthorCandidate(title) >= 0 ? sanitizeFilenamePart(title, '') : '';
    }

    function cleanProfileCardLine(line) {
        return normalizeText(line)
            .replace(/^\d+(?:\.\d+)?(?:w|k|\u4e07|\u4ebf)?\s*/i, '')
            .replace(/^\u521a\u521a\u770b\u8fc7\s*/i, '')
            .replace(/^\u7c89\u4e1d\u6307\u6570\s*/i, '')
            .trim();
    }

    function collectProfileCardTextCandidates(anchor) {
        const card = anchor?.closest('li') || anchor?.closest('article') || anchor?.parentElement || anchor;
        const seen = new Set();
        const lines = [];

        for (const rawText of [readRawTextValue(anchor), readRawTextValue(card)]) {
            if (!rawText) {
                continue;
            }

            for (const line of rawText.split('\n').map(cleanProfileCardLine)) {
                if (!line || seen.has(line) || isLikelyCountText(line) || isBadProfileMetaText(line)) {
                    continue;
                }

                seen.add(line);
                lines.push(line);
            }
        }

        return lines;
    }

    function extractMetaFromProfileCard(anchor) {
        const lines = collectProfileCardTextCandidates(anchor);
        const title = pickBestCandidate(lines, scoreTitleCandidate);
        const author = getProfilePageAuthor() || pickBestCandidate(lines, scoreAuthorCandidate);

        return {
            title: sanitizeFilenamePart(title, ''),
            author: sanitizeFilenamePart(author, ''),
        };
    }

    function getProfileWorksCountHint() {
        const textCandidates = Array.from(document.querySelectorAll('[role="tab"], button, [class*="tab"], [class*="Tab"]'))
            .map((element) => readTextValue(element))
            .filter(Boolean);

        textCandidates.push(normalizeText(document.title));

        for (const text of textCandidates) {
            const match = text.match(/(?:\u4f5c\u54c1|\u53d1\u5e03)\s*(\d{1,5})/) || text.match(/(\d{1,5})\s*\u4e2a?(?:\u4f5c\u54c1|\u89c6\u9891)/);
            if (match) {
                const count = Number(match[1]);
                if (count > 0) {
                    return count;
                }
            }
        }

        return 0;
    }

    function getNormalizedProfileVideoAnchors(root = document) {
        const entries = [];
        const seen = new Set();

        for (const anchor of Array.from(root.querySelectorAll('a[href*="/video/"], a[href*="modal_id="]'))) {
            const rawHref = anchor.getAttribute('href') || '';
            const normalized = normalizeVideoPageUrl(rawHref);
            const videoId = extractVideoId(rawHref) || extractVideoId(normalized);
            if (!normalized || !videoId || seen.has(videoId)) {
                continue;
            }

            seen.add(videoId);
            entries.push({
                anchor,
                pageUrl: buildProfileVideoPageUrl(videoId),
                videoId,
            });
        }

        return entries;
    }

    function countUniqueProfileVideoAnchors(root) {
        if (!root || typeof root.querySelectorAll !== 'function') {
            return 0;
        }

        return getNormalizedProfileVideoAnchors(root).length;
    }

    function hasProfileCardMedia(element) {
        if (!(element instanceof HTMLElement)) {
            return false;
        }

        return Boolean(element.querySelector('img, picture, video, canvas, [style*="background-image"]'));
    }

    function findProfileVideoCard(anchor) {
        if (!(anchor instanceof HTMLElement)) {
            return null;
        }

        const semanticCard = anchor.closest('li, article');
        if (semanticCard instanceof HTMLElement && countUniqueProfileVideoAnchors(semanticCard) === 1) {
            return semanticCard;
        }

        let current = anchor;
        let depth = 0;

        while (current && current !== document.body && depth < 7) {
            current = current.parentElement;
            depth += 1;

            if (!(current instanceof HTMLElement)) {
                break;
            }

            if (countUniqueProfileVideoAnchors(current) !== 1) {
                continue;
            }

            const rect = current.getBoundingClientRect();
            if (hasProfileCardMedia(current) || rect.width > 140 || rect.height > 140) {
                return current;
            }
        }

        return anchor.parentElement instanceof HTMLElement ? anchor.parentElement : anchor;
    }

    function countDirectProfileCards(root) {
        if (!(root instanceof HTMLElement)) {
            return 0;
        }

        return Array.from(root.children).filter((child) => (
            child instanceof HTMLElement && countUniqueProfileVideoAnchors(child) === 1 && hasProfileCardMedia(child)
        )).length;
    }

    function scoreProfileVideoCollectionRoot(root, worksCountHint) {
        const uniqueVideoCount = getNormalizedProfileVideoAnchors(root).length;
        if (uniqueVideoCount < 3) {
            return -Infinity;
        }

        const allLinkCount = root.querySelectorAll('a[href]').length || 1;
        const densityScore = (uniqueVideoCount / allLinkCount) * 70;
        const sizeScore = uniqueVideoCount * 8;
        const directCardCount = countDirectProfileCards(root);
        const directCardScore = directCardCount * 26;
        const matchScore = worksCountHint
            ? Math.max(0, 42 - (Math.abs(uniqueVideoCount - worksCountHint) * 12))
            : 0;
        const overshootPenalty = worksCountHint && uniqueVideoCount > worksCountHint
            ? (uniqueVideoCount - worksCountHint) * 10
            : 0;
        const missingCardPenalty = directCardCount === 0 ? 60 : 0;

        return sizeScore + densityScore + directCardScore + matchScore - overshootPenalty - missingCardPenalty;
    }

    function findProfileVideoCollectionRoot() {
        const worksCountHint = getProfileWorksCountHint();
        const anchors = getNormalizedProfileVideoAnchors(document);
        if (anchors.length < 3) {
            return {
                root: document,
                worksCountHint,
            };
        }

        const candidateScores = new Map();

        for (const entry of anchors) {
            const card = findProfileVideoCard(entry.anchor);
            if (!(card instanceof HTMLElement)) {
                continue;
            }

            let current = card;
            let depth = 0;

            while (current && current !== document.body && depth < 6) {
                current = current.parentElement;
                depth += 1;

                if (!(current instanceof HTMLElement)) {
                    break;
                }

                if (!['DIV', 'SECTION', 'MAIN', 'UL', 'OL', 'ARTICLE'].includes(current.tagName)) {
                    continue;
                }

                if (!candidateScores.has(current)) {
                    candidateScores.set(current, scoreProfileVideoCollectionRoot(current, worksCountHint));
                }
            }
        }

        const bestEntry = Array.from(candidateScores.entries())
            .filter(([, score]) => Number.isFinite(score))
            .sort((left, right) => right[1] - left[1])[0];

        return {
            root: bestEntry?.[0] || document,
            worksCountHint,
        };
    }

    function getProfileVideoEntriesFromRoot(root, worksCountHint) {
        const entries = [];
        const seen = new Set();
        const cards = new Set();

        for (const entry of getNormalizedProfileVideoAnchors(root)) {
            const card = findProfileVideoCard(entry.anchor);
            if (!(card instanceof HTMLElement) || cards.has(card) || seen.has(entry.pageUrl)) {
                continue;
            }

            const cardRoot = card.parentElement instanceof HTMLElement ? card.parentElement : null;
            if (cardRoot && cardRoot !== root && !root.contains(cardRoot)) {
                continue;
            }

            cards.add(card);
            seen.add(entry.pageUrl);
            entries.push({
                anchor: entry.anchor,
                pageUrl: entry.pageUrl,
            });

            if (worksCountHint && entries.length >= worksCountHint) {
                break;
            }
        }

        return entries;
    }

    function chooseBetterMeta(primaryMeta = {}, fallbackMeta = {}) {
        const primaryFirst = (scoreTitleCandidate(primaryMeta.title || '') >= scoreTitleCandidate(fallbackMeta.title || ''));
        const primaryAuthorFirst = (scoreAuthorCandidate(primaryMeta.author || '') >= scoreAuthorCandidate(fallbackMeta.author || ''));

        return {
            title: primaryFirst
                ? (primaryMeta.title || fallbackMeta.title || TITLE_FALLBACK)
                : (fallbackMeta.title || primaryMeta.title || TITLE_FALLBACK),
            author: primaryAuthorFirst
                ? (primaryMeta.author || fallbackMeta.author || AUTHOR_FALLBACK)
                : (fallbackMeta.author || primaryMeta.author || AUTHOR_FALLBACK),
        };
    }

    function collectProfileVideoLinks() {
        const { root, worksCountHint } = findProfileVideoCollectionRoot();
        return getProfileVideoEntriesFromRoot(root, worksCountHint).map((entry) => entry.pageUrl).filter(Boolean);
    }

    function collectProfileVideoEntries() {
        const { root, worksCountHint } = findProfileVideoCollectionRoot();

        return getProfileVideoEntriesFromRoot(root, worksCountHint)
            .filter((entry) => entry.pageUrl)
            .map((entry) => ({
                pageUrl: entry.pageUrl,
                meta: extractMetaFromProfileCard(entry.anchor),
            }));
    }

    async function waitForProfileVideoGridReady() {
        let previousCount = -1;
        let stableRounds = 0;

        for (let round = 0; round < 8; round += 1) {
            const { worksCountHint } = findProfileVideoCollectionRoot();
            const currentCount = collectProfileVideoEntries().length;
            const progressMessage = `Preparing profile page...\nLoaded links: ${currentCount}${worksCountHint ? `/${worksCountHint}` : ''}`;

            setStatus(progressMessage);
            if (state.batchModalLoading) {
                setBatchModalLoading(true, progressMessage);
            }

            if (currentCount > 0 && currentCount === previousCount) {
                stableRounds += 1;
            } else {
                stableRounds = 0;
            }

            if (worksCountHint && currentCount >= worksCountHint) {
                break;
            }

            if (!worksCountHint && stableRounds >= 2) {
                break;
            }

            previousCount = currentCount;
            await wait(350);
        }
    }

    function isLikelyProfilePage() {
        return isProfileBatchEligiblePage(location.href) || collectProfileVideoLinks().length >= 3;
    }

    // Structured data parsing and caching.
    function tryDecodeURIComponent(raw) {
        try {
            return decodeURIComponent(raw);
        } catch (error) {
            return raw;
        }
    }

    function parseCandidateJson(rawText) {
        const raw = (rawText || '').trim();
        if (!raw) {
            return null;
        }

        const candidates = [raw];

        if (/^["']/.test(raw)) {
            try {
                const parsedString = JSON.parse(raw);
                if (typeof parsedString === 'string') {
                    candidates.push(parsedString);
                }
            } catch (error) {
                // Ignore malformed string wrappers.
            }
        }

        if (raw.startsWith('%7B') || raw.startsWith('%5B')) {
            candidates.push(tryDecodeURIComponent(raw));
        }

        const equalIndex = raw.indexOf('=');
        if (equalIndex !== -1) {
            const assignedValue = raw.slice(equalIndex + 1).trim().replace(/;$/, '');
            if (assignedValue) {
                candidates.push(assignedValue);
            }
        }

        for (const candidate of candidates) {
            const trimmed = candidate.trim();
            const expandedCandidates = [trimmed];

            if (trimmed.startsWith('%7B') || trimmed.startsWith('%5B')) {
                expandedCandidates.push(tryDecodeURIComponent(trimmed));
            }

            for (const expanded of expandedCandidates) {
                const normalized = expanded.trim();
                if (!/^[\[{]/.test(normalized)) {
                    continue;
                }

                try {
                    return JSON.parse(normalized);
                } catch (error) {
                    // Ignore and keep searching other scripts.
                }
            }
        }

        return null;
    }

    function isLikelyAudioKey(key) {
        return /(audio|music|sound|song|bgm|voice|volume|soundtrack)/i.test(String(key || ''));
    }

    function isLikelyAudioUrl(value) {
        const loweredValue = String(value || '').toLowerCase();
        if (!loweredValue) {
            return false;
        }

        return (
            /[?&](?:mime_type|mime|media_type|type)=audio/i.test(loweredValue) ||
            /(?:^|[/?&._-])(?:audio|music|sound|song|bgm|voice|soundtrack)(?:[/?&._=-]|$)/i.test(loweredValue) ||
            loweredValue.includes('audio/tos')
        );
    }

    function looksLikeVideoUrl(key, value) {
        if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) {
            return false;
        }

        if (isLikelyAudioKey(key) || isLikelyAudioUrl(value)) {
            return false;
        }

        const loweredValue = value.toLowerCase();
        if (
            !loweredValue.includes('.mp4') &&
            !loweredValue.includes('douyinvod') &&
            !loweredValue.includes('/play') &&
            !loweredValue.includes('video/tos')
        ) {
            return false;
        }

        const loweredKey = String(key || '').toLowerCase();
        return !(loweredKey.includes('cover') || loweredKey.includes('poster') || loweredKey.includes('avatar'));
    }

    function scoreVideoUrl(key, value) {
        const loweredKey = String(key || '').toLowerCase();
        const loweredValue = value.toLowerCase();
        let score = 0;

        if (isLikelyAudioKey(loweredKey) || isLikelyAudioUrl(value)) {
            score -= 300;
        }

        if (loweredKey.includes('download')) {
            score += 90;
        }

        if (loweredKey.includes('play')) {
            score += 70;
        }

        if (loweredKey.includes('url') || loweredKey.includes('src')) {
            score += 20;
        }

        if (loweredValue.includes('.mp4')) {
            score += 40;
        }

        if (loweredValue.includes('douyinvod')) {
            score += 25;
        }

        if (loweredValue.includes('video/tos')) {
            score += 20;
        }

        if (loweredValue.includes('/video/')) {
            score += 25;
        }

        if (loweredValue.includes('playwm')) {
            score -= 40;
        }

        return score;
    }

    function isTitleKey(key) {
        return /(title|desc|description|sharetitle)/i.test(String(key || ''));
    }

    function isAuthorKey(key) {
        return /(author|nickname|uniqueid|name)/i.test(String(key || ''));
    }

    function normalizeVideoId(value) {
        if (value === null || value === undefined) {
            return '';
        }

        const text = String(value).trim();
        if (!text) {
            return '';
        }

        return extractVideoId(text) || (/^\d{8,}$/.test(text) ? text : '');
    }

    function pickBestCandidate(candidates, scorer) {
        let bestValue = '';
        let bestScore = -1;

        for (const candidate of candidates) {
            const value = normalizeText(candidate);
            if (!value) {
                continue;
            }

            const score = scorer(value);
            if (score > bestScore) {
                bestScore = score;
                bestValue = value;
            }
        }

        return bestValue;
    }

    function collectStructuredUrlCandidates(value, bucket, key = 'url') {
        if (!value || isLikelyAudioKey(key)) {
            return;
        }

        if (Array.isArray(value)) {
            for (const item of value) {
                collectStructuredUrlCandidates(item, bucket, key);
            }
            return;
        }

        if (typeof value === 'string') {
            if (looksLikeVideoUrl(key, value)) {
                bucket.push({
                    value,
                    score: scoreVideoUrl(key, value),
                });
            }
            return;
        }

        if (typeof value !== 'object') {
            return;
        }

        for (const [childKey, childValue] of Object.entries(value)) {
            collectStructuredUrlCandidates(childValue, bucket, childKey);
        }
    }

    function hasStructuredVideoPayload(node) {
        if (!node || typeof node !== 'object' || Array.isArray(node)) {
            return false;
        }

        return Boolean(
            node.play_addr ||
            node.playAddr ||
            node.download_addr ||
            node.downloadAddr ||
            node.play_url ||
            node.playUrl ||
            node.download_url ||
            node.downloadUrl ||
            node.video ||
            node.media
        );
    }

    const NODE_VIDEO_ID_KEYS = [
        'aweme_id', 'aweme_id_str', 'awemeId', 'awemeIdStr', 'id', 'id_str', 'idStr',
        'item_id', 'item_id_str', 'itemId', 'itemIdStr', 'group_id', 'group_id_str', 'groupId', 'groupIdStr',
        'video_id', 'video_id_str', 'videoId', 'videoIdStr', 'modal_id', 'modal_id_str', 'modalId', 'modalIdStr',
    ];
    const NODE_TITLE_KEYS = [
        'desc', 'description', 'title', 'titleText', 'share_title', 'shareTitle', 'content',
        'video_title', 'videoTitle', 'status_desc', 'statusDesc', 'text', 'awemeTitle', 'itemTitle',
    ];
    const NODE_VIDEO_URL_KEYS = [
        'play_addr', 'playAddr', 'download_addr', 'downloadAddr', 'play_url', 'playUrl',
        'download_url', 'downloadUrl', 'video', 'media',
    ];

    function getNodeVideoIdCandidates(node) {
        if (!node || typeof node !== 'object' || Array.isArray(node)) {
            return [];
        }

        return NODE_VIDEO_ID_KEYS.map((key) => normalizeVideoId(node[key])).filter(Boolean);
    }

    function buildStructuredVideoRecord(node) {
        if (!node || typeof node !== 'object' || Array.isArray(node)) {
            return null;
        }

        const titleCandidates = NODE_TITLE_KEYS.map((key) => node[key]);

        const authorSource = node.author || node.user || node.authorInfo || node.user_info || node.userInfo || {};
        const authorCandidates = [
            authorSource.nickname,
            authorSource.unique_id,
            authorSource.uniqueId,
            authorSource.short_id,
            authorSource.shortId,
            node.author_name,
            node.authorName,
            node.nickname,
            node.unique_id,
            node.uniqueId,
        ];

        const videoIdCandidates = [
            ...getNodeVideoIdCandidates(node),
            normalizeVideoId(authorSource.aweme_id),
        ].filter(Boolean);

        const urlCandidates = [];
        for (const key of NODE_VIDEO_URL_KEYS) {
            collectStructuredUrlCandidates(node[key], urlCandidates, key);
        }

        const title = pickBestCandidate(titleCandidates, scoreTitleCandidate);
        const author = pickBestCandidate(authorCandidates, scoreAuthorCandidate);
        const videoId = videoIdCandidates.find(Boolean) || '';
        const videoUrl = urlCandidates
            .sort((left, right) => right.score - left.score)
            .map((item) => item.value)[0] || '';

        const hasStrongMeta = Boolean(title && title !== TITLE_FALLBACK);
        const hasStrongAuthor = Boolean(author && author !== AUTHOR_FALLBACK);
        const hasPayload = hasStructuredVideoPayload(node);

        if (!title && !author && !videoId && !videoUrl) {
            return null;
        }

        if (!videoUrl && !(videoId && hasStrongMeta && (hasStrongAuthor || hasPayload))) {
            return null;
        }

        return {
            videoId,
            videoUrl,
            meta: {
                title: sanitizeFilenamePart(title, TITLE_FALLBACK),
                author: sanitizeFilenamePart(author, AUTHOR_FALLBACK),
            },
        };
    }

    function scoreStructuredVideoRecord(record) {
        if (!record) {
            return -1;
        }

        let score = 0;

        if (record.videoId) {
            score += 30;
        }

        if (record.videoUrl) {
            score += 45;
        }

        if (record.meta?.title && record.meta.title !== TITLE_FALLBACK) {
            score += 20;
        }

        if (record.meta?.author && record.meta.author !== AUTHOR_FALLBACK) {
            score += 10;
        }

        return score;
    }

    // 递归遍历所有对象节点（数组展开、环引用去重），对每个非数组对象调用 visit
    function walkObjectNodes(node, visit, seen) {
        if (node === null || node === undefined || typeof node !== 'object' || seen.has(node)) {
            return;
        }

        seen.add(node);

        if (Array.isArray(node)) {
            for (const item of node) {
                walkObjectNodes(item, visit, seen);
            }
            return;
        }

        visit(node);

        for (const value of Object.values(node)) {
            walkObjectNodes(value, visit, seen);
        }
    }

    function mergeStructuredVideoRecords(records) {
        const merged = new Map();

        for (const record of records) {
            const key = record.videoId || record.videoUrl || `${record.meta.title}_${record.meta.author}`;
            const existing = merged.get(key);

            if (!existing || scoreStructuredVideoRecord(record) > scoreStructuredVideoRecord(existing)) {
                merged.set(key, record);
            }
        }

        return Array.from(merged.values());
    }

    function cacheStructuredVideoRecords(records, options = {}) {
        const mergedRecords = mergeStructuredVideoRecords(records);
        const replaceExisting = Boolean(options.replaceExisting);

        for (const record of mergedRecords) {
            const key = record.videoId || record.videoUrl;
            if (!key) {
                continue;
            }

            const existing = state.videoDataCache.get(key);
            if (replaceExisting || !existing || scoreStructuredVideoRecord(record) > scoreStructuredVideoRecord(existing)) {
                state.videoDataCache.delete(key);
                state.videoDataCache.set(key, record);
            }
        }

        while (state.videoDataCache.size > MAX_VIDEO_DATA_CACHE_SIZE) {
            state.videoDataCache.delete(state.videoDataCache.keys().next().value);
        }

        state.videoDataRecords = mergeStructuredVideoRecords([
            ...state.videoDataRecords,
            ...mergedRecords,
        ]).slice(-200);
    }

    function getStructuredVideoRecord(videoId = '', videoUrl = '') {
        const normalizedId = normalizeVideoId(videoId);

        // 命中缓存时刷新 LRU 顺序
        for (const key of [normalizedId, videoUrl]) {
            if (key && state.videoDataCache.has(key)) {
                const record = state.videoDataCache.get(key);
                state.videoDataCache.delete(key);
                state.videoDataCache.set(key, record);
                return record;
            }
        }

        if (normalizedId) {
            const byId = state.videoDataRecords.find((record) => record.videoId === normalizedId);
            if (byId) {
                return byId;
            }
        }

        if (videoUrl) {
            const byUrl = state.videoDataRecords.find((record) => record.videoUrl === videoUrl);
            if (byUrl) {
                return byUrl;
            }
        }

        return null;
    }

    function getStructuredVideoRecordByMeta(meta = {}) {
        const requestedTitle = meta.title || '';
        const requestedAuthor = meta.author || '';

        if (scoreTitleCandidate(requestedTitle) < 8) {
            return null;
        }

        const requestedAuthorScore = scoreAuthorCandidate(requestedAuthor);

        return state.videoDataRecords
            .filter((record) => {
                if (!record?.videoUrl || scoreTitleCandidate(record.meta?.title || '') < 8) {
                    return false;
                }

                if (shouldRejectByTitleMismatch(requestedTitle, record.meta?.title || '')) {
                    return false;
                }

                const recordAuthor = record.meta?.author || '';
                if (requestedAuthorScore >= 8 && scoreAuthorCandidate(recordAuthor) >= 8) {
                    return titlesLookRelated(requestedAuthor, recordAuthor);
                }

                return true;
            })
            .sort((left, right) => scoreStructuredVideoRecord(right) - scoreStructuredVideoRecord(left))[0] || null;
    }

    function collectStructuredVideoRecordsFromData(data) {
        const records = [];
        walkObjectNodes(data, (node) => {
            const record = buildStructuredVideoRecord(node);
            if (record) {
                records.push(record);
            }
        }, new WeakSet());
        return mergeStructuredVideoRecords(records);
    }

    function findStructuredVideoRecordInData(data, targetVideoId = '') {
        const normalizedId = normalizeVideoId(targetVideoId);
        if (!normalizedId || !data || typeof data !== 'object') {
            return null;
        }

        const records = [];
        walkObjectNodes(data, (node) => {
            if (!getNodeVideoIdCandidates(node).includes(normalizedId)) {
                return;
            }

            const record = buildStructuredVideoRecord(node);
            if (record) {
                records.push({
                    ...record,
                    videoId: record.videoId || normalizedId,
                });
            }
        }, new WeakSet());

        return mergeStructuredVideoRecords(records)
            .sort((left, right) => scoreStructuredVideoRecord(right) - scoreStructuredVideoRecord(left))[0] || null;
    }

    function parseStructuredDataText(rawText, targetVideoId = '') {
        const empty = {
            records: [],
            exactRecord: null,
        };

        if (!rawText || rawText.length < 2) {
            return empty;
        }

        const data = parseCandidateJson(rawText);
        if (!data || typeof data !== 'object') {
            return empty;
        }

        return {
            records: collectStructuredVideoRecordsFromData(data),
            exactRecord: findStructuredVideoRecordInData(data, targetVideoId),
        };
    }

    function primeStructuredDataCacheFromDocument(doc, targetVideoId = '', options = {}) {
        const records = [];
        let exactRecord = null;

        for (const script of Array.from(doc.querySelectorAll('script'))) {
            const rawText = script.textContent || '';
            if (rawText.length < 20) {
                continue;
            }

            const result = parseStructuredDataText(rawText, targetVideoId);
            records.push(...result.records);
            if (!exactRecord && result.exactRecord) {
                exactRecord = result.exactRecord;
            }
        }

        if (records.length) {
            cacheStructuredVideoRecords(records, options);
        }

        return exactRecord;
    }

    function maybeCacheStructuredDataResponse(rawText) {
        const records = parseStructuredDataText(rawText).records;
        if (records.length) {
            cacheStructuredVideoRecords(records);
        }
    }

    function collectJsonInsights(node, bucket, parentKey, seen) {
        if (node === null || node === undefined) {
            return;
        }

        if (typeof node === 'string') {
            const text = node.trim();
            if (!text) {
                return;
            }

            if (looksLikeVideoUrl(parentKey, text)) {
                bucket.videoUrls.push({
                    value: text,
                    score: scoreVideoUrl(parentKey, text),
                });
            }

            if (isTitleKey(parentKey)) {
                const title = sanitizeFilenamePart(text, '');
                if (title && scoreTitleCandidate(title) >= 0) {
                    bucket.titles.push(title);
                }
            }

            if (isAuthorKey(parentKey)) {
                const author = sanitizeFilenamePart(text, '');
                if (author && scoreAuthorCandidate(author) >= 0) {
                    bucket.authors.push(author);
                }
            }

            return;
        }

        if (typeof node !== 'object' || seen.has(node)) {
            return;
        }

        seen.add(node);

        if (Array.isArray(node)) {
            for (const item of node) {
                collectJsonInsights(item, bucket, parentKey, seen);
            }
            return;
        }

        for (const [key, value] of Object.entries(node)) {
            collectJsonInsights(value, bucket, key, seen);
        }
    }

    function extractMetaFromDocument(doc) {
        const firstText = (selectors, scorer, extra = []) => [...selectors.map((selector) => readTextValue(doc.querySelector(selector))), ...extra]
            .find((candidate) => scorer(candidate) >= 0) || '';

        const title = firstText(
            ['h1', '[data-e2e="video-desc"]', '[data-e2e="feed-active-video-desc"]', 'meta[property="og:title"]', 'meta[name="description"]'],
            scoreTitleCandidate,
            [normalizeText(doc.title)]
        );
        const author = firstText(
            ['[data-e2e="user-name"]', '[data-e2e="video-author-name"]', '[data-e2e="video-author-uniqueid"]', 'a[href*="/user/"]', 'meta[name="author"]'],
            scoreAuthorCandidate
        );

        return {
            title: sanitizeFilenamePart(title, TITLE_FALLBACK),
            author: sanitizeFilenamePart(author, AUTHOR_FALLBACK),
        };
    }

    function pickBestVideoUrl(videoUrls) {
        return videoUrls
            .sort((left, right) => right.score - left.score)
            .map((item) => item.value)[0] || '';
    }

    function extractVideoEntryFromDocument(doc) {
        if (!doc || typeof doc.querySelector !== 'function') {
            return {
                videoUrl: '',
                videoId: '',
                meta: buildFallbackMeta(),
            };
        }

        const meta = extractMetaFromDocument(doc);
        const pageVideoId = normalizeVideoId(
            doc.querySelector('link[rel="canonical"]')?.href ||
            doc.querySelector('meta[property="og:url"]')?.content ||
            ''
        );
        const bucket = {
            videoUrls: [],
            titles: [],
            authors: [],
        };

        for (const script of Array.from(doc.querySelectorAll('script'))) {
            const rawText = script.textContent || '';
            if (rawText.length < 20) {
                continue;
            }

            const data = parseCandidateJson(rawText);
            if (data) {
                collectJsonInsights(data, bucket, '', new WeakSet());
            }
        }

        const title = bucket.titles.find(Boolean) || meta.title;
        const author = bucket.authors.find(Boolean) || meta.author;
        const videoUrl = pickBestVideoUrl(bucket.videoUrls);

        return {
            videoUrl,
            videoId: pageVideoId || extractVideoId(videoUrl),
            meta: {
                title: sanitizeFilenamePart(title, TITLE_FALLBACK),
                author: sanitizeFilenamePart(author, AUTHOR_FALLBACK),
            },
        };
    }

    function extractVideoEntryFromCurrentDocument() {
        if (!document.documentElement) {
            return null;
        }

        const entry = extractVideoEntryFromDocument(document);
        return entry.videoUrl ? entry : null;
    }

    async function resolveVideoEntry(videoPageUrl, options = {}) {
        const allowUnknownVideoId = Boolean(options.allowUnknownVideoId);
        const forceRefresh = Boolean(options.forceRefresh);
        const targetVideoId = normalizeVideoId(extractVideoId(videoPageUrl));
        const cachedBeforeFetch = forceRefresh ? null : getStructuredVideoRecord(targetVideoId, '');
        if (cachedBeforeFetch?.videoUrl) {
            return cachedBeforeFetch;
        }

        const response = await fetch(videoPageUrl, {
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error(`Page request failed with HTTP ${response.status}`);
        }

        const htmlText = await response.text();
        const doc = new DOMParser().parseFromString(htmlText, 'text/html');
        const exactRecord = primeStructuredDataCacheFromDocument(doc, targetVideoId, {
            replaceExisting: forceRefresh,
        });
        if (exactRecord?.videoUrl) {
            return exactRecord;
        }

        const cachedAfterParse = forceRefresh ? null : getStructuredVideoRecord(targetVideoId, '');
        if (cachedAfterParse?.videoUrl) {
            return cachedAfterParse;
        }

        const entry = extractVideoEntryFromDocument(doc);
        const fallbackRecord = getStructuredVideoRecord('', entry.videoUrl);
        const resolvedVideoId = normalizeVideoId(
            entry.videoId ||
            fallbackRecord?.videoId ||
            extractVideoId(entry.videoUrl)
        );

        if (!entry.videoUrl) {
            throw new Error('Could not find a playable video URL on the page');
        }

        if (targetVideoId && resolvedVideoId && resolvedVideoId !== targetVideoId) {
            throw new Error('Could not match the requested video on the page');
        }

        if (targetVideoId && !resolvedVideoId && !allowUnknownVideoId) {
            throw new Error('Could not match the requested video on the page');
        }

        return {
            videoUrl: entry.videoUrl,
            videoId: resolvedVideoId || (allowUnknownVideoId ? targetVideoId : ''),
            meta: chooseBetterMeta(
                entry.meta || {},
                fallbackRecord?.meta || {}
            ),
        };
    }

    async function resolveVideoEntryFromAwemeDetail(videoId) {
        const targetVideoId = normalizeVideoId(videoId);
        if (!targetVideoId) {
            throw new Error('Missing video ID for aweme detail request');
        }

        const cachedBeforeFetch = getStructuredVideoRecord(targetVideoId, '');
        if (cachedBeforeFetch?.videoUrl) {
            return cachedBeforeFetch;
        }

        let lastError = null;
        for (const detailUrl of buildAwemeDetailUrls(targetVideoId)) {
            try {
                const response = await fetch(detailUrl, {
                    credentials: 'include',
                    headers: {
                        Accept: 'application/json, text/plain, */*',
                    },
                });

                if (!response.ok) {
                    throw new Error(`Detail request failed with HTTP ${response.status}`);
                }

                const rawText = await response.text();
                const result = parseStructuredDataText(rawText, targetVideoId);
                if (result.records.length) {
                    cacheStructuredVideoRecords(result.records);
                }

                const exactRecord = result.exactRecord || getStructuredVideoRecord(targetVideoId, '');
                if (exactRecord?.videoUrl) {
                    return exactRecord;
                }

                throw new Error('Detail response did not contain a playable URL for the requested video');
            } catch (error) {
                lastError = error;
                console.warn('[Douyin Downloader] Aweme detail resolution failed, trying next endpoint.', error);
            }
        }

        throw lastError || new Error('Aweme detail resolution failed');
    }

    // 依次尝试「视频页」与「aweme 详情」两种解析方式，成功返回 { resolved, source }，全部失败返回 null
    async function resolveVideoEntryByVideoId(videoId, sources) {
        const attempts = [
            [sources[0], () => resolveVideoEntry(buildStandaloneVideoPageUrl(videoId))],
            [sources[1], () => resolveVideoEntryFromAwemeDetail(videoId)],
        ];

        for (const [source, resolve] of attempts) {
            try {
                return { resolved: await resolve(), source };
            } catch (error) {
                console.warn(`[Douyin Downloader] ${source} resolution failed, falling back.`, error);
            }
        }

        return null;
    }

    // Download entry resolution.
    async function resolveRecommendVideoEntry(video) {
        const baseMeta = video ? extractMetaFromVideo(video) : buildFallbackMeta();
        const playerEntry = getRecommendPlayerEntry(video);
        const activeVideoId = normalizeVideoId(playerEntry?.videoId) || (video ? findNearbyVideoId(video) : '');
        const exactRecord = primeStructuredDataCacheFromDocument(document, activeVideoId);
        const mergedMeta = chooseBetterMeta(
            baseMeta,
            exactRecord?.meta || {}
        );
        const make = (source, videoUrl, meta, recordId, alternateUrls) => ({
            videoUrl,
            alternateUrls: alternateUrls || [],
            meta,
            videoId: activeVideoId || recordId || extractVideoId(videoUrl),
            source,
        });

        if (playerEntry?.videoUrl && !playerEntry.dashOnly) {
            return make('recommend-player', playerEntry.videoUrl, mergedMeta, playerEntry.videoId, playerEntry.alternateUrls);
        }

        if (activeVideoId) {
            const result = await resolveVideoEntryByVideoId(activeVideoId, ['recommend-video-page', 'recommend-aweme-detail']);
            if (result) {
                const { resolved, source } = result;
                return make(source, resolved.videoUrl, chooseBetterMeta(mergedMeta, resolved.meta || {}), resolved.videoId, resolved.alternateUrls);
            }
        }

        if (playerEntry?.videoUrl) {
            return make('recommend-player-dash', playerEntry.videoUrl, mergedMeta, playerEntry.videoId, playerEntry.alternateUrls);
        }

        throw new Error('Could not resolve the current recommendation video from the active player');
    }

    async function resolveCurrentVideoEntry() {
        noteLocationChange();

        const video = findBestVideo();
        if (isRecommendPage(location.href)) {
            return resolveRecommendVideoEntry(video);
        }

        const locationVideoId = extractVideoId(location.href);
        const globalPlayerEntry = getCurrentGlobalPlayerEntry(video);
        const nearbyVideoId = video ? findNearbyVideoId(video) : '';
        const activeVideoId = locationVideoId || globalPlayerEntry?.videoId || nearbyVideoId;
        const directVideoUrl = pickDirectVideoUrl(video);
        const playerVideoUrl = pickPlayableVideoUrl(video);
        const feedStylePage = isFeedStyleCurrentVideoPage(location.href);
        const searchModalPage = isSearchModalPage(location.href);
        const performanceSinceTime = searchModalPage
            ? Math.max(0, (state.locationChangedAt || 0) - 800)
            : 0;
        const performanceVideoUrl = pickRecentPerformanceVideoUrl({
            sinceTime: performanceSinceTime,
            preferRecent: false,
        });
        const currentBlobUrl = typeof playerVideoUrl === 'string' && playerVideoUrl.startsWith('blob:')
            ? playerVideoUrl
            : '';

        const scopedPage = shouldPreferScopedPageResolution(location.href);
        const exactRecord = primeStructuredDataCacheFromDocument(document, activeVideoId);
        const idMatchedCachedRecord = activeVideoId ? getStructuredVideoRecord(activeVideoId, '') : null;
        const cachedRecord = exactRecord || getStructuredVideoRecord(activeVideoId, directVideoUrl);
        const baseMeta = video ? extractMetaFromVideo(video) : buildFallbackMeta();
        const metaMatchedCachedRecord = feedStylePage ? getStructuredVideoRecordByMeta(baseMeta) : null;

        const mergedMeta = chooseBetterMeta(
            baseMeta,
            cachedRecord?.meta || metaMatchedCachedRecord?.meta || {}
        );
        const currentDocumentEntry = extractVideoEntryFromCurrentDocument();
        const currentDocumentEntryMatchesActiveVideo = videoEntryMatchesTargetId(currentDocumentEntry, activeVideoId);
        const globalPlayerMatchesActiveVideo = !activeVideoId ||
            !globalPlayerEntry?.videoId ||
            normalizeVideoId(globalPlayerEntry.videoId) === normalizeVideoId(activeVideoId);

        // 统一构造返回项：recordId 为记录自带的视频 ID
        const make = (source, videoUrl, meta, recordId = '', alternateUrls = []) => ({
            videoUrl,
            alternateUrls,
            meta,
            videoId: activeVideoId || recordId || extractVideoId(videoUrl),
            source,
        });
        const withMeta = (record) => chooseBetterMeta(mergedMeta, record?.meta || {});
        const withDocumentMeta = () => chooseBetterMeta(currentDocumentEntry.meta || {}, mergedMeta);

        if (scopedPage && globalPlayerEntry?.videoUrl && globalPlayerMatchesActiveVideo) {
            return make('scoped-global-player', globalPlayerEntry.videoUrl, mergedMeta, globalPlayerEntry.videoId, globalPlayerEntry.alternateUrls || []);
        }

        if (activeVideoId && exactRecord?.videoUrl && scopedPage) {
            return make('scoped-current-document', exactRecord.videoUrl, withMeta(exactRecord), exactRecord.videoId);
        }

        if (activeVideoId && idMatchedCachedRecord?.videoUrl && scopedPage) {
            return make('scoped-cached-id', idMatchedCachedRecord.videoUrl, withMeta(idMatchedCachedRecord), idMatchedCachedRecord.videoId);
        }

        if (activeVideoId && currentDocumentEntry?.videoUrl && currentDocumentEntryMatchesActiveVideo && scopedPage) {
            return make('scoped-current-page', currentDocumentEntry.videoUrl, withDocumentMeta(), currentDocumentEntry.videoId);
        }

        if (searchModalPage && playerVideoUrl && !playerVideoUrl.startsWith('blob:')) {
            return make('search-modal-player', playerVideoUrl, mergedMeta, cachedRecord?.videoId);
        }

        if (searchModalPage && performanceVideoUrl) {
            return make('search-modal-performance-video', performanceVideoUrl, mergedMeta);
        }

        if (searchModalPage && playerVideoUrl) {
            return make('search-modal-player-blob', playerVideoUrl, mergedMeta, cachedRecord?.videoId);
        }

        if (locationVideoId && scopedPage) {
            try {
                const resolved = await resolveVideoEntry(location.href);
                return make('scoped-page', resolved.videoUrl, withMeta(resolved), resolved.videoId);
            } catch (error) {
                console.warn('[Douyin Downloader] Scoped page resolution failed, falling back.', error);
            }
        }

        if (activeVideoId && idMatchedCachedRecord?.videoUrl) {
            return make('nearby-id-cache', idMatchedCachedRecord.videoUrl, withMeta(idMatchedCachedRecord), idMatchedCachedRecord.videoId);
        }

        if (activeVideoId && currentDocumentEntry?.videoUrl && currentDocumentEntryMatchesActiveVideo && shouldPreferCurrentDocumentResolution(location.href)) {
            return make('current-page-matched', currentDocumentEntry.videoUrl, withDocumentMeta(), currentDocumentEntry.videoId);
        }

        if (feedStylePage && globalPlayerEntry?.videoUrl) {
            return make('feed-global-player', globalPlayerEntry.videoUrl, mergedMeta, globalPlayerEntry.videoId, globalPlayerEntry.alternateUrls || []);
        }

        if (feedStylePage && playerVideoUrl && !playerVideoUrl.startsWith('blob:')) {
            return make('feed-player', playerVideoUrl, mergedMeta, cachedRecord?.videoId);
        }

        if (feedStylePage && metaMatchedCachedRecord?.videoUrl) {
            return make('feed-meta-cache', metaMatchedCachedRecord.videoUrl, withMeta(metaMatchedCachedRecord), metaMatchedCachedRecord.videoId);
        }

        if (feedStylePage && activeVideoId) {
            const result = await resolveVideoEntryByVideoId(activeVideoId, ['feed-video-page', 'feed-aweme-detail']);
            if (result) {
                return make(result.source, result.resolved.videoUrl, withMeta(result.resolved), result.resolved.videoId);
            }
        }

        if (feedStylePage && performanceVideoUrl && !activeVideoId) {
            return make('performance-video', performanceVideoUrl, mergedMeta);
        }

        if (feedStylePage && !activeVideoId) {
            const waitedPerformanceVideoUrl = await waitForRecentPerformanceVideoUrl({
                sinceTime: performanceSinceTime,
                preferRecent: false,
                attempts: 7,
                delay: 250,
            });

            if (waitedPerformanceVideoUrl) {
                return make('performance-video-waited', waitedPerformanceVideoUrl, mergedMeta);
            }
        }

        if (directVideoUrl || cachedRecord?.videoUrl) {
            return make(directVideoUrl ? 'player' : 'cache', directVideoUrl || cachedRecord.videoUrl, mergedMeta, cachedRecord?.videoId);
        }

        if (currentBlobUrl && !feedStylePage) {
            return make('player-blob', currentBlobUrl, mergedMeta);
        }

        if (currentDocumentEntry?.videoUrl && (!activeVideoId || currentDocumentEntryMatchesActiveVideo)) {
            return make(currentDocumentEntryMatchesActiveVideo ? 'current-page' : 'current-page-fallback', currentDocumentEntry.videoUrl, withDocumentMeta(), currentDocumentEntry.videoId);
        }

        if (feedStylePage && activeVideoId) {
            throw new Error('Could not resolve the current feed video without using a neighbor preload');
        }

        const videoPageUrl = normalizeVideoPageUrl(location.href) || location.href;
        const resolved = await resolveVideoEntry(videoPageUrl);

        return make('page', resolved.videoUrl, withMeta(resolved), resolved.videoId || extractVideoId(videoPageUrl));
    }

    function isProfileBatchPage() {
        if (isFeedStyleCurrentVideoPage(location.href) && findBestVideo()) {
            return false;
        }

        return isProfileBatchEligiblePage(location.href) && isLikelyProfilePage() && !normalizeVideoPageUrl(location.href);
    }

    // User-triggered workflows.
    async function runPrimaryAction() {
        if (isBusy()) {
            return;
        }

        if (isProfileBatchPage()) {
            await downloadProfileVideos();
            return;
        }

        await downloadActiveVideo();
    }

    async function downloadActiveVideo() {
        if (isBusy()) {
            return;
        }

        const video = findBestVideo();
        if (!video && !normalizeVideoPageUrl(location.href)) {
            refreshUI();
            return;
        }

        const initialMeta = video ? extractMetaFromVideo(video) : buildFallbackMeta();

        beginAction('single', 'Preparing video download', `Preparing download:\n${initialMeta.title}`);

        try {
            const entry = await resolveCurrentVideoEntry();
            const filename = buildFilename(entry.meta);

            const updateSingleDownloadProgress = (progress) => {
                const percent = getPercent(progress?.loaded, progress?.total);

                setPrimaryButtonState(percent > 0 ? `Downloading ${percent}%` : 'Downloading video', true, 'single');
                setStatus([
                    `Downloading from ${entry.source}:`,
                    entry.meta.title,
                    formatDownloadProgress(progress?.loaded || 0, progress?.total || 0),
                ].join('\n'));
            };

            setPrimaryButtonState('Starting download', true, 'single');
            setStatus(`Starting download:\n${entry.meta.title}`);
            const downloadResult = await downloadVideoEntry(entry, filename, updateSingleDownloadProgress, {
                onAttempt: ({ index, total }) => {
                    if (index > 0) {
                        setStatus(`Trying alternate video URL ${index + 1}/${total}:\n${entry.meta.title}`);
                    }
                },
            });

            if (isVideoOnlyResult(downloadResult)) {
                setStatus(`Saved (no audio track detected):\n${filename}`);
            } else {
                setStatus(`Saved:\n${filename}`);
            }
        } catch (error) {
            console.error('[Douyin Downloader] Download failed.', error);
            setStatus(`Download failed:\n${error.message}`);
        } finally {
            finishAction();
        }
    }

    function isVideoOnlyResult(downloadResult) {
        const mediaInfo = downloadResult?.mediaInfo;
        return Boolean(mediaInfo?.conclusive && mediaInfo.video && !mediaInfo.audio);
    }

    async function collectProfileVideoLinksWithAutoScroll() {
        const initialScrollTop = window.scrollY;
        const seen = new Map();
        const scroller = document.scrollingElement || document.documentElement;
        let stableRounds = 0;
        let previousCount = 0;
        let previousHeight = 0;

        for (let round = 0; round < MAX_SCROLL_ROUNDS; round += 1) {
            const { worksCountHint } = findProfileVideoCollectionRoot();
            collectProfileVideoEntries().forEach((entry) => {
                seen.set(entry.pageUrl, entry);
            });
            const progressMessage = `Scanning profile page...\nLoaded links: ${seen.size}${worksCountHint ? `/${worksCountHint}` : ''}`;
            setStatus(progressMessage);
            if (state.batchModalLoading) {
                setBatchModalLoading(true, progressMessage);
            }

            if (worksCountHint && seen.size >= worksCountHint) {
                break;
            }

            const currentHeight = scroller.scrollHeight;
            if (seen.size === previousCount && currentHeight === previousHeight) {
                stableRounds += 1;
            } else {
                stableRounds = 0;
            }

            const stableLimit = worksCountHint && seen.size < worksCountHint
                ? MAX_UNDERCOUNT_STABLE_SCROLL_ROUNDS
                : MAX_STABLE_SCROLL_ROUNDS;

            if (stableRounds >= stableLimit) {
                break;
            }

            previousCount = seen.size;
            previousHeight = currentHeight;
            window.scrollTo(0, scroller.scrollHeight);
            if (worksCountHint && seen.size < worksCountHint && stableRounds > 0) {
                await wait(120);
                window.scrollBy(0, -(window.innerHeight || 900));
                await wait(120);
                window.scrollTo(0, scroller.scrollHeight);
            }
            await wait(SCAN_DELAY_MS);
        }

        window.scrollTo(0, initialScrollTop);
        return Array.from(seen.values());
    }

    // 将解析结果合并回批量条目
    function mergeResolvedEntry(baseEntry, resolvedEntry) {
        return {
            ...baseEntry,
            videoUrl: resolvedEntry.videoUrl,
            alternateUrls: Array.isArray(resolvedEntry.alternateUrls) ? resolvedEntry.alternateUrls : [],
            videoId: baseEntry.videoId || resolvedEntry.videoId || extractVideoId(resolvedEntry.videoUrl),
            meta: chooseBetterMeta(baseEntry.meta, resolvedEntry.meta),
        };
    }

    async function buildBatchEntriesFromLinks(links) {
        const entries = new Array(links.length);
        let nextIndex = 0;
        let completedCount = 0;

        const resolveNextEntry = async () => {
            while (nextIndex < links.length) {
                const index = nextIndex;
                nextIndex += 1;

                const linkEntry = links[index];
                const pageUrl = typeof linkEntry === 'string' ? linkEntry : linkEntry.pageUrl;
                const videoId = typeof linkEntry === 'string'
                    ? extractVideoId(linkEntry)
                    : (linkEntry.videoId || extractVideoId(linkEntry.pageUrl));
                const domMeta = typeof linkEntry === 'string' ? {} : (linkEntry.meta || {});
                const baseEntry = {
                    id: `entry-${index}-${Date.now()}`,
                    pageUrl,
                    videoUrl: '',
                    alternateUrls: [],
                    videoId: videoId || extractVideoId(pageUrl),
                    meta: domMeta,
                    available: Boolean(pageUrl),
                    selected: Boolean(pageUrl),
                    error: '',
                };

                try {
                    const entry = await resolveVideoEntry(pageUrl, {
                        allowUnknownVideoId: true,
                    });
                    entries[index] = {
                        ...mergeResolvedEntry(baseEntry, entry),
                        available: Boolean(entry.videoUrl),
                        selected: Boolean(entry.videoUrl),
                    };
                } catch (error) {
                    console.error('[Douyin Downloader] Batch entry resolve failed.', pageUrl, error);
                    entries[index] = {
                        ...baseEntry,
                        meta: chooseBetterMeta(domMeta, {
                            title: `Video ${index + 1}`,
                            author: AUTHOR_FALLBACK,
                        }),
                    };
                }

                completedCount += 1;
                const progressMessage = `Preparing batch list...\n${completedCount}/${links.length}\n${pageUrl}`;
                setPrimaryButtonState(`Scanning ${completedCount}/${links.length}`, true, 'batch');
                setStatus(progressMessage);
                if (state.batchModalLoading) {
                    setBatchModalLoading(true, progressMessage);
                }
            }
        };

        const workerCount = Math.min(BATCH_ENTRY_RESOLVE_CONCURRENCY, links.length);
        await Promise.all(Array.from({ length: workerCount }, () => resolveNextEntry()));
        return entries;
    }

    async function startSelectedBatchDownload() {
        if (isBusy()) {
            return;
        }

        const selectedEntries = getSelectedBatchEntries();
        if (!selectedEntries.length) {
            updateBatchModalSummary();
            return;
        }

        closeBatchModal();
        beginAction('batch', `Batch 0/${selectedEntries.length}`, `Preparing selected batch...\n${selectedEntries.length} videos queued.`);

        try {
            let successCount = 0;
            let videoOnlyCount = 0;
            const totalCount = selectedEntries.length;
            const filenameMap = buildUniqueBatchFilenames(selectedEntries);
            const directoryHandle = await ensureWritableBatchDirectory();

            for (let index = 0; index < totalCount; index += 1) {
                const selectedEntry = selectedEntries[index];
                setPrimaryButtonState(`Batch ${index + 1}/${totalCount}`, true, 'batch');
                setStatus(`Preparing ${index + 1}/${totalCount}...\n${selectedEntry.meta.title}`);

                try {
                    let entry = selectedEntry;
                    if (!entry.videoUrl) {
                        entry = mergeResolvedEntry(selectedEntry, await resolveVideoEntry(selectedEntry.pageUrl, {
                            allowUnknownVideoId: true,
                        }));
                    }

                    setStatus(`Downloading ${index + 1}/${totalCount}...\n${entry.meta.title}`);
                    const filename = filenameMap.get(entry.id) || buildFilename(entry.meta);
                    let downloadResult;
                    let lastProgressRenderAt = 0;
                    const updateBatchDownloadProgress = (progress) => {
                        const loaded = Number(progress?.loaded) || 0;
                        const total = Number(progress?.total) || 0;
                        const now = Date.now();
                        const isComplete = total > 0 && loaded >= total;

                        if (!isComplete && now - lastProgressRenderAt < 200) {
                            return;
                        }
                        lastProgressRenderAt = now;

                        const percent = getPercent(loaded, total);
                        setPrimaryButtonState(
                            percent > 0 ? `Batch ${index + 1}/${totalCount} ${percent}%` : `Batch ${index + 1}/${totalCount}`,
                            true,
                            'batch'
                        );
                        setStatus([
                            `Downloading ${index + 1}/${totalCount}:`,
                            entry.meta.title,
                            filename,
                            formatDownloadProgress(loaded, total),
                        ].join('\n'));
                    };

                    try {
                        downloadResult = await downloadVideoEntry(entry, filename, updateBatchDownloadProgress, {
                            downloadOptions: { directoryHandle },
                            onAttempt: ({ index: candidateIndex, total }) => {
                                if (candidateIndex > 0) {
                                    setStatus(`Trying alternate URL ${candidateIndex + 1}/${total} for ${index + 1}/${totalCount}:\n${entry.meta.title}`);
                                }
                            },
                        });
                    } catch (initialError) {
                        const attemptedUrls = Array.isArray(initialError?.attemptedUrls)
                            ? initialError.attemptedUrls
                            : getEntryCandidateUrls(entry);
                        setStatus(`Refreshing expired video URL ${index + 1}/${totalCount}...\n${entry.meta.title}`);

                        const refreshedEntry = mergeResolvedEntry(entry, await resolveVideoEntry(selectedEntry.pageUrl, {
                            allowUnknownVideoId: true,
                            forceRefresh: true,
                        }));

                        if (!getEntryCandidateUrls(refreshedEntry, { excludeUrls: attemptedUrls }).length) {
                            throw initialError;
                        }

                        downloadResult = await downloadVideoEntry(refreshedEntry, filename, updateBatchDownloadProgress, {
                            excludeUrls: attemptedUrls,
                            downloadOptions: { directoryHandle },
                        });
                    }
                    if (isVideoOnlyResult(downloadResult)) {
                        videoOnlyCount += 1;
                    }
                    successCount += 1;
                } catch (error) {
                    console.error('[Douyin Downloader] Selected batch item failed.', selectedEntry.pageUrl, error);
                    setStatus(`Skipped ${index + 1}/${totalCount}:\n${error.message}`);
                }

                await wait(BATCH_DELAY_MS);
            }

            const videoOnlyMessage = videoOnlyCount > 0
                ? `\n${videoOnlyCount} file(s) had no detectable audio track.`
                : '';
            setStatus(`Batch finished.\nDownloaded ${successCount}/${totalCount} selected videos.${videoOnlyMessage}`);
        } catch (error) {
            console.error('[Douyin Downloader] Selected batch failed.', error);
            setStatus(`Batch failed:\n${error.message}`);
        } finally {
            finishAction();
        }
    }

    async function downloadProfileVideos() {
        if (isBusy()) {
            return;
        }

        if (!isLikelyProfilePage()) {
            setStatus('Open a Douyin profile page first, then use batch download.');
            refreshUI();
            return;
        }

        beginAction('batch', 'Scanning profile', 'Scanning profile page for video links...');
        closeBatchModal();
        setBatchEntries([]);
        setBatchModalLoading(false);

        try {
            await waitForProfileVideoGridReady();
            const links = await collectProfileVideoLinksWithAutoScroll();
            if (!links.length) {
                throw new Error('No profile video links were found on this page');
            }

            const entries = await buildBatchEntriesFromLinks(links);
            setMode('idle');
            setStatus(`Batch list ready.\nChoose the videos you want to download.`);
            openBatchModal(entries);
            updateBatchDirectoryHint();
            updateBatchModalSummary();
        } catch (error) {
            console.error('[Douyin Downloader] Batch download failed.', error);
            setBatchModalLoading(false);
            setStatus(`Batch failed:\n${error.message}`);
        } finally {
            finishAction();
        }
    }

    // UI refresh and bootstrapping.
    function isEditableTarget(target) {
        if (!(target instanceof HTMLElement)) {
            return false;
        }

        return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
    }

    function handleKeydown(event) {
        if (event.defaultPrevented || event.repeat || event.ctrlKey || event.metaKey || event.altKey) {
            return;
        }

        if (isEditableTarget(event.target) || (event.key || '').toLowerCase() !== SHORTCUT_KEY) {
            return;
        }

        event.preventDefault();
        void downloadActiveVideo();
    }

    function buildIdleStatus() {
        const lines = [];
        const video = findBestVideo();

        if (video && video.currentSrc) {
            const meta = extractMetaFromVideo(video);
            lines.push(`Current video: ${meta.title}`);
            lines.push(`Author: ${meta.author}`);
        } else if (normalizeVideoPageUrl(location.href)) {
            lines.push('Current video: detected from video page');
        } else {
            lines.push('Current video: not detected');
        }

        if (isLikelyProfilePage()) {
            lines.push(`Profile videos loaded: ${collectProfileVideoLinks().length}`);
            lines.push('Batch download will build a selectable list before downloading.');
        } else {
            lines.push('Open a Douyin profile page to enable batch download.');
        }

        return lines.join('\n');
    }

    function refreshUI() {
        if (isBusy()) {
            return;
        }

        const video = findBestVideo();
        const videoPageUrl = normalizeVideoPageUrl(location.href);
        const hasVideoAction = (video && (pickDirectVideoUrl(video) || video.currentSrc)) || videoPageUrl;

        if (isProfileBatchPage()) {
            setPrimaryButtonState(collectProfileVideoLinks().length > 0 ? 'Batch download profile' : 'Scan profile videos', false, 'batch');
        } else if (hasVideoAction) {
            setPrimaryButtonState('Download video', false, 'single');
        } else {
            setPrimaryButtonState('No downloadable content', true, 'single');
        }

        setStatus(buildIdleStatus());
    }

    function ensurePanel() {
        if (document.getElementById(PANEL_ID)) {
            return;
        }

        addStyleBlock(style);
        ensureLiquidGlassFilter();

        const toggle = el('button', {
            id: PANEL_TOGGLE_ID,
            type: 'button',
            innerHTML: getToggleIconMarkup(),
            title: 'Download',
        });
        toggle.setAttribute('aria-label', 'Download');
        toggle.addEventListener('pointerdown', (event) => {
            event.preventDefault();
            event.stopPropagation();
            startPanelDrag(event);
        });
        toggle.addEventListener('pointermove', movePanelDrag);
        toggle.addEventListener('pointerup', endPanelDrag);
        toggle.addEventListener('pointercancel', endPanelDrag);

        const status = el('div', { id: PANEL_STATUS_ID });
        status.setAttribute('aria-live', 'polite');

        document.body.appendChild(el('div', { id: PANEL_ID }, [toggle, status]));
        state.panelTop = loadSavedPanelTop();
        applyPanelPosition();
        setPrimaryButtonState('Download', false, 'single');
        setStatus('Waiting for Douyin content...');
    }

    function ensureBatchModal() {
        if (getBatchModal()) {
            return;
        }

        const textButton = (id, text, onClick, props = {}) => {
            const button = el('button', { id, type: 'button', className: `${SCRIPT_ID}-text-button`, textContent: text, ...props });
            button.addEventListener('click', onClick);
            return button;
        };

        const closeButton = textButton(BATCH_CLOSE_ID, 'Close', () => {
            closeBatchModal();
        });

        const searchInput = el('input', {
            id: BATCH_SEARCH_ID,
            type: 'search',
            placeholder: 'Search by title, author, or link',
            autocomplete: 'off',
            spellcheck: false,
        });
        searchInput.addEventListener('input', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLInputElement)) {
                return;
            }

            state.batchSearchTerm = target.value || '';
            renderBatchModalList();
        });

        const dirHint = el('div', {
            id: BATCH_DIR_HINT_ID,
            textContent: isDirectoryPickerSupported() ? 'Download folder: not selected' : 'Download folder: browser not supported',
        });

        const list = el('div', { id: BATCH_MODAL_LIST_ID, className: `${SCRIPT_ID}-list` });
        list.addEventListener('change', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') {
                return;
            }

            updateBatchSelection(target.dataset.entryId || '', target.checked);
        });

        const startButton = el('button', {
            id: BATCH_START_ID,
            type: 'button',
            className: `${SCRIPT_ID}-action-button`,
            textContent: 'Download selected',
        });
        startButton.addEventListener('click', () => {
            void startSelectedBatchDownload();
        });

        const modal = el('div', { id: BATCH_MODAL_ID }, [
            el('div', { className: `${SCRIPT_ID}-dialog` }, [
                el('div', { className: `${SCRIPT_ID}-dialog-head` }, [
                    el('div', {}, [
                        el('h2', { className: `${SCRIPT_ID}-dialog-title`, textContent: 'Batch download list' }),
                        el('p', { className: `${SCRIPT_ID}-dialog-subtitle`, textContent: 'Select any videos you want to download from this profile.' }),
                    ]),
                    closeButton,
                ]),
                el('div', { className: `${SCRIPT_ID}-dialog-toolbar` }, [
                    el('div', { className: `${SCRIPT_ID}-toolbar-group` }, [searchInput, dirHint]),
                    el('div', { className: `${SCRIPT_ID}-toolbar-group` }, [
                        textButton(BATCH_PICK_DIR_ID, 'Choose folder', () => {
                            void pickBatchDownloadDirectory();
                        }, { disabled: !isDirectoryPickerSupported() }),
                        textButton(BATCH_SELECT_ALL_ID, 'Select all', () => {
                            setAllBatchSelections(true);
                        }),
                        textButton(BATCH_CLEAR_ALL_ID, 'Clear all', () => {
                            setAllBatchSelections(false);
                        }),
                    ]),
                ]),
                list,
                el('div', { className: `${SCRIPT_ID}-dialog-actions` }, [
                    el('div', { id: BATCH_MODAL_SUMMARY_ID, textContent: 'Detected 0 videos, 0 available, 0 selected.' }),
                    startButton,
                ]),
            ]),
        ]);
        modal.setAttribute('aria-hidden', 'true');
        modal.addEventListener('pointerdown', (event) => {
            if (event.target === modal) {
                closeBatchModal();
            }
        });
        document.body.appendChild(modal);

        updateBatchDirectoryHint();
    }

    function buildDownloadDiagnostics() {
        const activeVideo = findBestVideo();
        const videos = Array.from(document.querySelectorAll('video')).map((video, index) => {
            let rect = null;
            try {
                const bounds = video.getBoundingClientRect();
                rect = {
                    top: Math.round(bounds.top),
                    left: Math.round(bounds.left),
                    width: Math.round(bounds.width),
                    height: Math.round(bounds.height),
                };
            } catch (error) {
                rect = null;
            }

            return {
                index,
                active: video === activeVideo,
                paused: Boolean(video.paused),
                readyState: Number(video.readyState) || 0,
                currentTime: Number.isFinite(Number(video.currentTime)) ? Number(video.currentTime) : null,
                duration: Number.isFinite(Number(video.duration)) ? Number(video.duration) : null,
                videoId: findNearbyVideoId(video),
                sources: getVideoCandidateUrls(video).map((url) => sanitizeDiagnosticUrl(url)),
                rect,
            };
        });
        const players = PLAYER_NAMES.map((name) => {
            const playerObject = getPagePlayerObject(name);
            if (!playerObject) {
                return null;
            }

            const entry = extractGlobalPlayerEntry(playerObject);
            return {
                name,
                videoId: entry?.videoId || '',
                videoUrl: sanitizeDiagnosticUrl(entry?.videoUrl || ''),
                alternateUrlCount: Array.isArray(entry?.alternateUrls) ? entry.alternateUrls.length : 0,
                dashOnly: Boolean(entry?.dashOnly),
                isActive: safeReadProperty(playerObject, 'isActive') === true,
                isUserActive: safeReadProperty(playerObject, 'isUserActive') === true,
                isPlaying: safeReadProperty(playerObject, 'isPlaying') === true,
                currentTime: Number(safeReadProperty(playerObject, 'currentTime') ?? safeReadProperty(playerObject, '_currentTime')) || 0,
                duration: Number(safeReadProperty(playerObject, 'duration') ?? safeReadProperty(playerObject, '_duration')) || 0,
            };
        }).filter(Boolean);
        const activeVideoId = activeVideo ? findNearbyVideoId(activeVideo) : extractVideoId(location.href);
        const cachedRecord = activeVideoId ? getStructuredVideoRecord(activeVideoId, '') : null;

        return {
            script: {
                name: 'Douyin Downloader',
                version: SCRIPT_VERSION,
            },
            generatedAt: new Date().toISOString(),
            page: {
                url: sanitizeDiagnosticUrl(location.href, { preservePageParams: true }),
                title: normalizeText(document.title),
                flags: {
                    recommend: isRecommendPage(location.href),
                    searchModal: isSearchModalPage(location.href),
                    feedStyle: isFeedStyleCurrentVideoPage(location.href),
                    profileBatchEligible: isProfileBatchEligiblePage(location.href),
                },
            },
            activeVideoId,
            videos,
            players,
            cache: {
                structuredMapSize: state.videoDataCache.size,
                structuredRecordCount: state.videoDataRecords.length,
                mediaUrlRecordCount: state.mediaUrlRecords.length,
                activeRecord: cachedRecord ? {
                    videoId: cachedRecord.videoId || '',
                    videoUrl: sanitizeDiagnosticUrl(cachedRecord.videoUrl || ''),
                    title: cachedRecord.meta?.title || '',
                    author: cachedRecord.meta?.author || '',
                } : null,
            },
            recentMediaUrls: state.mediaUrlRecords.slice(-12).map((record) => ({
                source: record.source || '',
                score: Number(record.score) || 0,
                url: sanitizeDiagnosticUrl(record.url || ''),
            })),
        };
    }

    async function copyDownloadDiagnostics() {
        const diagnosticsText = JSON.stringify(buildDownloadDiagnostics(), null, 2);

        try {
            if (typeof GM_setClipboard === 'function') {
                GM_setClipboard(diagnosticsText, 'text');
                setStatus('Diagnostic information copied to the clipboard.');
                return diagnosticsText;
            }

            if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                await navigator.clipboard.writeText(diagnosticsText);
                setStatus('Diagnostic information copied to the clipboard.');
                return diagnosticsText;
            }
        } catch (error) {
            console.warn('[Douyin Downloader] Failed to copy diagnostic information.', error);
        }

        console.info('[Douyin Downloader] Diagnostic information:', diagnosticsText);
        setStatus('Could not access the clipboard. Diagnostic information was printed to the console.');
        return diagnosticsText;
    }

    function installDiagnosticMenu() {
        if (state.diagnosticMenuInstalled || typeof GM_registerMenuCommand !== 'function') {
            return;
        }

        GM_registerMenuCommand('复制下载诊断信息', () => {
            void copyDownloadDiagnostics();
        });
        state.diagnosticMenuInstalled = true;
    }

    function installObservers() {
        if (state.observer) {
            state.observer.disconnect();
        }

        state.observer = new MutationObserver((mutations) => {
            if (mutations.some(mutationNeedsRefresh)) {
                scheduleRefresh();
            }
        });

        state.observer.observe(document.body, {
            childList: true,
            subtree: true,
        });

        window.addEventListener('popstate', () => {
            scheduleRefresh(0);
        });
        window.addEventListener('hashchange', () => {
            scheduleRefresh(0);
        });
    }

    function patchHistory() {
        if (state.historyPatched) {
            return;
        }

        for (const methodName of ['pushState', 'replaceState']) {
            const original = history[methodName];
            if (typeof original !== 'function') {
                continue;
            }

            history[methodName] = function () {
                const result = original.apply(this, arguments);
                scheduleRefresh(0);
                return result;
            };
        }

        state.historyPatched = true;
    }

    function boot() {
        installNetworkHooks();
        installResourceHooks();

        if (!document.body) {
            window.setTimeout(boot, 50);
            return;
        }

        noteLocationChange();
        ensurePanel();
        ensureBatchModal();
        installDiagnosticMenu();
        primeStructuredDataCacheFromDocument(document);
        document.addEventListener('keydown', handleKeydown, true);
        window.addEventListener('resize', () => {
            state.panelTop = clampPanelTop(state.panelTop ?? loadSavedPanelTop());
            applyPanelPosition();
            savePanelTop();
        });
        patchHistory();
        installObservers();
        scheduleRefresh(0);

        console.log('[Douyin Downloader] Ready. Press Q or click the floating download button.');
    }

    boot();
})();