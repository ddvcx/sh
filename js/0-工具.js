// ==UserScript==
// @name         0-工具
// @namespace    http://tampermonkey.net/
// @version      0.21
// @description  工具箱：链接染色、内容屏蔽、视频设置、解除限制、强力粘贴、页面保活
// @author       Optimizer
// @include      *://*
// @run-at       document-start
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @downloadURL  https://github.com/ddvcx/sh/raw/m/js/0-工具.js
// ==/UserScript==

const C = {
    Color: "#b3b3b3",        // 已读链接颜色
    Block: [                 // 内容屏蔽规则
        "baijiahao",
        /大促|[0-9]首付/,
        /周鸿祎|李彦宏|贾跃亭|雷军|余承东|董明珠|卢伟冰|胖东来/,
        /华为|鸿蒙|huawei|[尚享问智尊]界|小米[澎汽a-z0-9]|红米|REDMI/,
        /法拉第|理想[汽a-z]|会员专享/
    ],
    Res: "1080p",              // 视频画质
    Speed: 1.1,                // 视频速度
    Alive: 500,                 // 刷新间隔(秒)
    Retries: 10,                // 视频设置重试次数
    Delay: 500,                 // 视频设置延迟(毫秒)
    MaxVisited: 5000,           // 已访问链接单域名保留的记录数(超出后清理最早记录)
    KeepDays: 360               // 已读记录保留天数(超出自动清理)
};
(function() {
    'use strict';
    const State = {};
    const MenuIds = {};
    const Menus = {
        color:   ['已读颜色', true],
        block:   ['链接屏蔽', true],
        video:   ['视频设置', true],
        unlock:  ['解除限制', true],
        paste:   ['强力粘贴', false],
        alive:   ['自动刷新', false]
    };
    function init() {
        Object.keys(Menus).forEach(k => {
            if (k === 'paste' || k === 'alive') {
                State[k] = sessionStorage.getItem('0_' + k) === 'true';
            } else {
                State[k] = GM_getValue('0_' + k, true);
            }
        });
        refreshMenus();
        GM_registerMenuCommand('清理过期记录', purgeVisited);
        if(State.color) initColor();
        if(State.block) initBlockRegex();
        if(State.color || State.block) setupObserver();
        if(State.video) initVideoSettings();
        if(State.unlock) toggleUnlock();
        if(State.paste) initPaste();
        if(State.alive) toggleAlive();
    }
    function refreshMenus() {
        Object.values(MenuIds).forEach(id => GM_unregisterMenuCommand(id));
        Object.entries(Menus).forEach(([k, [name, reload]]) => {
            const currentKey = k;
            MenuIds[currentKey] = GM_registerMenuCommand((State[currentKey] ? '[√] ' : '[x] ') + name, () => {
                State[currentKey] = !State[currentKey];
                if (currentKey === 'paste' || currentKey === 'alive') {
                    sessionStorage.setItem('0_' + currentKey, State[currentKey]);
                } else {
                    GM_setValue('0_' + currentKey, State[currentKey]);
                }
                refreshMenus();
                if(reload) location.reload();
                else {
                    if(currentKey === 'alive') toggleAlive();
                    if(currentKey === 'paste') { State.paste ? initPaste() : document.getElementById('gm-paste-btn')?.remove(); }
                }
            });
        });
    }

    // 已读颜色
    let visitedMap = new Map();
    const KEEP_MS = C.KeepDays * 24 * 60 * 60 * 1000;
    const CLEAN_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
    let saveTimer = null;
    function mergeStored() {
        try {
            const saved = GM_getValue('0_visited_' + location.hostname, null);
            if(!saved) return;
            const parsed = JSON.parse(saved);
            if(!Array.isArray(parsed)) return;
            const now = Date.now();
            parsed.forEach(item => {
                const h = typeof item === 'string' ? item : item?.h;
                if(!h) return;
                const t = typeof item === 'string' ? now : (item.t || now);
                if(now - t > KEEP_MS) return;
                if((visitedMap.get(h) || 0) < t) visitedMap.set(h, t);
            });
        } catch(e) {}
    }
    function loadVisited() {
        mergeStored();
        const now = Date.now();
        const lastClean = GM_getValue('0_last_clean_' + location.hostname, 0);
        if (now - lastClean > CLEAN_INTERVAL_MS) {
            cleanExpired(now);
            GM_setValue('0_last_clean_' + location.hostname, now);
        }
    }
    function saveVisited() {
        clearTimeout(saveTimer);
        saveTimer = null;
        try {
            mergeStored();
            trimVisited();
            const arr = Array.from(visitedMap.entries()).map(([h, t]) => ({ h, t }));
            GM_setValue('0_visited_' + location.hostname, JSON.stringify(arr));
        } catch(e) {}
    }
    function scheduleSave() {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(saveVisited, 500);
    }
    function cleanExpired(now = Date.now()) {
        let changed = false;
        for (const [h, t] of visitedMap.entries()) {
            if (now - t > KEEP_MS) {
                visitedMap.delete(h);
                changed = true;
            }
        }
        if (changed) saveVisited();
    }
    function trimVisited() {
        if(visitedMap.size <= C.MaxVisited) return;
        Array.from(visitedMap.entries()).sort((x, y) => x[1] - y[1]).slice(0, visitedMap.size - C.MaxVisited).forEach(([h]) => visitedMap.delete(h));
    }
    window.addEventListener('pagehide', () => { if(saveTimer) saveVisited(); });
    document.addEventListener('visibilitychange', () => { if(document.hidden && saveTimer) saveVisited(); });
    function purgeVisited() {
        const now = Date.now();
        let n = 0;
        cleanExpired(now);
        GM_listValues().filter(k => k.startsWith('0_visited_')).forEach(k => {
            try {
                const arr = JSON.parse(GM_getValue(k, '[]'));
                const kept = arr.filter(i => typeof i === 'string' || (i && (!i.t || now - i.t <= KEEP_MS)));
                n += arr.length - kept.length;
                if(kept.length) GM_setValue(k, JSON.stringify(kept)); else GM_deleteValue(k);
            } catch(e) {}
        });
        alert('已清理 ' + n + ' 条超过 ' + C.KeepDays + ' 天的已读记录');
    }
    function initColor() {
        GM_addStyle(`a:visited, a:visited *, a.gm-visited, a.gm-visited * { color: ${C.Color} !important; }`);
        loadVisited();
        if (visitedMap.size > 0) {
            document.querySelectorAll('a').forEach(a => { if (visitedMap.has(a.href)) a.classList.add('gm-visited'); });
        }
    }
    window.addEventListener('mousedown', e => {
        if(State.color) {
            const a = e.target.closest('a');
            if(a && a.href) {
                a.classList.add('gm-visited');
                visitedMap.set(a.href, Date.now());
                scheduleSave();
            }
        }
    }, {passive:true});

    // 链接屏蔽
    let banRe = null;
    function initBlockRegex() {
        banRe = new RegExp(C.Block.map(k => k instanceof RegExp ? k.source : k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i');
    }
    function hide(n) {
        if(n.style && n.style.display !== 'none' && (banRe.test(n.textContent) || (n.href && banRe.test(n.href)))) {
            n.style.setProperty('display', 'none', 'important');
        }
    }
    function setupObserver() {
        let blockTimer = null;
        const pendingNodes = new Set();
        const checkPendingBlock = () => {
            const targets = Array.from(pendingNodes).filter(n => {
                let p = n.parentNode;
                while (p) {
                    if (pendingNodes.has(p)) return false;
                    p = p.parentNode;
                }
                return true;
            });
            targets.forEach(n => {
                if (n.isConnected) {
                    if (n.matches?.('li, a')) hide(n);
                    if (n.querySelectorAll) n.querySelectorAll('li, a').forEach(hide);
                }
            });
            pendingNodes.clear();
        };
        const queueBlock = (nodes) => {
            let hasElement = false;
            nodes.forEach(n => { if (n.nodeType === 1) { pendingNodes.add(n); hasElement = true; } });
            if (hasElement) {
                cancelAnimationFrame(blockTimer);
                blockTimer = requestAnimationFrame(checkPendingBlock);
            }
        };
        const handleColorNode = (n) => {
            if (n.nodeType !== 1) return;
            if (n.matches?.('a') && visitedMap.has(n.href)) n.classList.add('gm-visited');
            n.querySelectorAll?.('a').forEach(a => { if(visitedMap.has(a.href)) a.classList.add('gm-visited'); });
        };
        new MutationObserver(ms => ms.forEach(m => {
            if (m.type === 'attributes') {
                if (State.color && m.attributeName === 'href' && m.target.tagName === 'A' && visitedMap.has(m.target.href)) {
                    m.target.classList.add('gm-visited');
                }
                return;
            }
            if (State.color) m.addedNodes.forEach(handleColorNode);
            if (State.block) queueBlock(m.addedNodes);
        })).observe(document.documentElement, {childList:true, subtree:true, attributes: State.color, attributeFilter:['href']});
        if (State.block && document.body) queueBlock([document.body]);
    }
    const waitUntil = async (conditionFn, actionFn) => {
        let retries = C.Retries;
        while (retries-- > 0) {
            if (conditionFn()) break;
            if (actionFn && actionFn()) break;
            await new Promise(r => setTimeout(r, C.Delay));
        }
    };

    // 视频设置 (视频画质、视频布局、视频速度、关闭字幕)
    function initVideoSettings() {
        const host = location.hostname;
        const isYT = host.includes('youtube.com');
        const isBili = host.includes('bilibili.com');
        const resReg = new RegExp(C.Res.replace(/\s+/g, ''), 'i');
        const fpsReg = /高帧率|高码率/; // 排除B站高帧率档位
        let videoStates = new WeakMap();
        let hasExecutedLayout = false;
        const isAlreadyWebFull = () => {
            if (document.fullscreenElement) return true;
            if (isBili) {
                const container = document.querySelector('.bpx-player-container, #bilibili-player, .bilibili-player');
                const webBtn = document.querySelector('.bpx-player-ctrl-web, .bpx-player-ctrl-web-enter');
                return !!(
                    container?.classList?.contains('bpx-state-webfullscreen') ||
                    container?.classList?.contains('bpx-state-fullscreen') ||
                    container?.dataset?.screen === 'web' ||
                    container?.dataset?.screen === 'full' ||
                    webBtn?.classList?.contains('bpx-state-active') ||
                    document.body.classList.contains('bilibili-player-videofullscreen-active') ||
                    document.body.classList.contains('player-mode-webfullscreen')
                );
            }
            if (isYT) {
                const flexy = document.querySelector('ytd-watch-flexy');
                return !!(flexy?.hasAttribute('theater') || flexy?.hasAttribute('fullscreen'));
            }
            return false;
        };
        const setQual = async (v) => {
            const state = videoStates.get(v) || {};
            if(!State.video || state.qual) return;
            videoStates.set(v, { ...state, qual: true });

            if(v.setPlaybackQualityRange) {
                v.setPlaybackQualityRange(C.Res, C.Res);
            } else if(isYT) {
                try {
                    const btn = document.querySelector('.ytp-settings-button');
                    if(btn) {
                        btn.click();
                        await new Promise(r => setTimeout(r, C.Delay));
                        const m = [...document.querySelectorAll('.ytp-menuitem')].find(i => /quality|画质/i.test(i.innerText || ''));
                        if(m) {
                            m.click();
                            await new Promise(r => setTimeout(r, C.Delay));
                            const targetRes = [...document.querySelectorAll('.ytp-quality-menu .ytp-menuitem')].find(o => resReg.test(o.innerText.replace(/\s/g,'')));
                            targetRes?.click?.();
                        }
                        if(btn.getAttribute('aria-expanded') === 'true') btn.click();
                    }
                } catch(e) {}
            } else if(isBili) {
                await waitUntil(() => false, () => {
                    const items = document.querySelectorAll('.bpx-player-ctrl-quality-menu-item');
                    if (items.length > 0) {
                        const list = Array.from(items);
                        const txt = i => i.innerText.replace(/\s/g,'');
                        const targetRes = list.find(i => resReg.test(txt(i)) && !fpsReg.test(txt(i))) || list.find(i => resReg.test(txt(i)));
                        if (targetRes && !targetRes.classList.contains('bpx-state-active')) targetRes.click();
                        return true;
                    }
                    return false;
                });
            }
        };
        const setLayout = async (v) => {
            if(!State.video || hasExecutedLayout) return;
            hasExecutedLayout = true;
            await waitUntil(isAlreadyWebFull, () => {
                if (isBili) {
                    const enterBtn = document.querySelector('.bpx-player-ctrl-web-enter:not(.bpx-state-active), .squirtle-pagefullscreen-inactive');
                    if (enterBtn) { enterBtn.click(); return true; }
                } else if (isYT) {
                    const sizeBtn = document.querySelector('.ytp-size-button');
                    if (sizeBtn) { sizeBtn.click(); return true; }
                }
                return false;
            });
        };
        const setSub = async (v) => {
            const state = videoStates.get(v) || {};
            if(!State.video || state.sub) return;
            videoStates.set(v, { ...state, sub: true });

            if(isYT) {
                await waitUntil(() => false, () => {
                    const subBtn = document.querySelector('.ytp-subtitles-button');
                    if (subBtn) {
                        if (subBtn.getAttribute('aria-pressed') === 'true') subBtn.click();
                        return true;
                    }
                    return false;
                });
            }
        };
        const setSpeed = (v) => {
            const state = videoStates.get(v) || {};
            if(!State.video || state.speed) return;
            videoStates.set(v, { ...state, speed: true });
            if(v.playbackRate !== C.Speed) v.playbackRate = C.Speed;
            v.addEventListener('ratechange', () => {
                if (State.video && v.playbackRate !== C.Speed) v.playbackRate = C.Speed;
            });
        };
        const onMedia = (e) => {
            const v = e.target;
            if(v.tagName !== 'VIDEO') return;
            setSpeed(v);
            if((isYT || isBili) && (e.type === 'loadeddata' || e.type === 'play')) { setQual(v); setLayout(v); setSub(v); }
        };
        window.addEventListener('play', onMedia, true);
        window.addEventListener('loadeddata', onMedia, true);
        const resetStates = () => {
            videoStates = new WeakMap();
            hasExecutedLayout = false;
        };
        if(isYT || isBili) {
            window.addEventListener('yt-navigate-finish', resetStates);
            window.addEventListener('popstate', resetStates);
        }
        document.querySelectorAll('video').forEach(v => {
            setSpeed(v);
            if(isYT || isBili) { setQual(v); setLayout(v); setSub(v); }
        });
    }

    // 解除限制
    function toggleUnlock() {
        GM_addStyle('html, body, div, p, span, a, input, textarea { -webkit-user-select: text !important; user-select: text !important; -webkit-touch-callout: default !important; }');
        const allowEvent = e => {
            e.stopPropagation();
        };
        ['copy', 'cut', 'paste', 'contextmenu', 'selectstart', 'dragstart'].forEach(t => {
            window.addEventListener(t, allowEvent, true);
            document.addEventListener(t, allowEvent, true);
        });
        const handleKey = e => {
            if ((e.ctrlKey || e.metaKey) && ['c', 'x', 'v', 'a'].includes(e.key?.toLowerCase())) {
                e.stopPropagation();
            }
        };
        window.addEventListener('keydown', handleKey, true);
        window.addEventListener('keyup', handleKey, true);
        const clearHandlers = () => {
            ['oncopy', 'oncut', 'onpaste', 'oncontextmenu', 'onselectstart', 'ondragstart', 'onkeydown', 'onkeyup'].forEach(p => {
                if (document[p]) document[p] = null;
                if (document.body && document.body[p]) document.body[p] = null;
            });
        };
        if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', clearHandlers);
        else clearHandlers();
    }

    // 强力粘贴 (模拟键盘输入)
    let pasteInitialized = false;
    function initPaste() {
        if (pasteInitialized) return;
        pasteInitialized = true;
        const getActiveEl = () => {
            let el = document.activeElement;
            while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
            if (el?.tagName === 'IFRAME') try { return el.contentDocument.activeElement; } catch(e){ return el; }
            return el;
        };
        const setNativeValue = (el, value) => {
            const desc = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value') || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value');
            if (desc && desc.set) desc.set.call(el, value); else el.value = value;
        };
        const doPaste = async (el, text) => {
            if (!el || !text) return;
            const html = text.replace(/\n/g, '<br>');
            const UE = window.UE || window.parent?.UE;
            if (UE?.instants) for (let i in UE.instants) if (UE.instants[i].isFocus?.()) return UE.instants[i].execCommand('insertHtml', html);
            if (window.CKEDITOR) for (let i in window.CKEDITOR.instances) if (window.CKEDITOR.instances[i].focusManager.hasFocus) return window.CKEDITOR.instances[i].insertHtml(html);
            if (el !== document.activeElement) el.focus();
            if (el.isContentEditable || el.tagName === 'BODY') {
                if (document.execCommand('insertHTML', false, html)) return;
                if (document.execCommand('insertText', false, text)) return;
                el.innerText = text; return;
            }
            let s = 0, e = 0, v = el.value || '';
            try { s = el.selectionStart || 0; e = el.selectionEnd || 0; } catch(err) { s = v.length; e = v.length; }
            const newValue = v.slice(0, s) + text + v.slice(e);
            const evtOpt = { bubbles: true, cancelable: false };
            el.dispatchEvent(new CompositionEvent('compositionstart', { ...evtOpt, cancelable: true }));
            el.dispatchEvent(new CompositionEvent('compositionupdate', { ...evtOpt, data: text }));
            setNativeValue(el, newValue);
            el.dispatchEvent(new InputEvent('input', { ...evtOpt, inputType: 'insertCompositionText', data: text, isComposing: true }));
            el.dispatchEvent(new CompositionEvent('compositionend', { ...evtOpt, data: text }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            try { el.setSelectionRange(s + text.length, s + text.length); } catch(err) {}
        };
        const addBtn = () => {
            if(document.getElementById('gm-paste-btn')) return;
            const btn = document.createElement('button'); // 粘贴按钮
            btn.id = 'gm-paste-btn';
            btn.innerHTML = '📋 粘贴';
            btn.style.cssText = 'position:fixed;bottom:30px;left:30px;z-index:2147483647;padding:8px 10px;background:#2c3e50;color:#fff;border:1px solid #fff;border-radius:6px;cursor:pointer;font-weight:bold;font-size:12px;opacity:.8;user-select:none;';
            btn.onmouseenter = () => btn.style.opacity = '1';
            btn.onmouseleave = () => btn.style.opacity = '.8';
            btn.onmousedown = e => e.preventDefault();
            btn.onclick = async (e) => {
                e.stopPropagation();
                const target = getActiveEl();
                if (!target || (target === document.body && !target.isContentEditable)) return alert('请先点击选中输入框！');
                try {
                    await doPaste(target, await navigator.clipboard.readText());
                    btn.style.background = '#27ae60'; btn.innerHTML = '✅ 成功';
                    setTimeout(() => { btn.style.background = '#2c3e50'; btn.innerHTML = '📋 粘贴'; }, 1000);
                } catch (err) {
                    const t = prompt('读取剪贴板失败，请手动输入：');
                    if (t) doPaste(target, t);
                }
            };
            document.body.appendChild(btn);
        };
        if(document.readyState === 'loading') window.addEventListener('DOMContentLoaded', addBtn); else addBtn();
    }

    // 页面保活
    let aliveTimer;
    let aliveWorker;
    let aliveTargetTime = 0;
    let aliveDirty = false;
    document.addEventListener('input', e => { if(e.isTrusted) aliveDirty = true; }, true);
    function doReload() {
        if(aliveDirty) toggleAlive(); else location.reload();
    }
    function clearAliveTimer() {
        if (aliveTimer) { clearTimeout(aliveTimer); aliveTimer = null; }
        if (aliveWorker) { aliveWorker.terminate(); aliveWorker = null; }
    }
    function toggleAlive() {
        clearAliveTimer();
        if(!State.alive) return;
        const delayMs = C.Alive * 1000;
        aliveTargetTime = Date.now() + delayMs;
        try {
            const blob = new Blob([`setTimeout(() => postMessage(0), ${delayMs});`], { type: 'application/javascript' });
            aliveWorker = new Worker(URL.createObjectURL(blob));
            aliveWorker.onmessage = doReload;
            aliveWorker.onerror = () => { if(aliveWorker) { aliveWorker.terminate(); aliveWorker = null; } if(!aliveTimer) aliveTimer = setTimeout(doReload, delayMs); };
        } catch(e) {
            aliveTimer = setTimeout(doReload, delayMs);
        }
    }
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && State.alive && aliveTargetTime && Date.now() >= aliveTargetTime) {
            doReload();
        }
    });
    init();
})();