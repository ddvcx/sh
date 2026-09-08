// ==UserScript==
// @name         0-Cookie
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  导出当前页面的 Cookies
// @author       D
// @match        *://*/*
// @noframes
// @grant        GM_cookie
// @grant        GM_setClipboard
// @grant        GM_registerMenuCommand
// @downloadURL  https://github.com/ddvcx/sh/raw/m/js/0-Cookie.js
// ==/UserScript==

(function() {
    'use strict';
    if (window.top !== window.self) {
        return;
    }
    function getCookies(details) {
        return new Promise((resolve, reject) => {
            if (typeof GM_cookie === 'undefined' || typeof GM_cookie.list === 'undefined') {
                reject(new Error('当前油猴环境不支持 GM_cookie API'));
                return;
            }
            GM_cookie.list(details, (cookies, error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(cookies || []);
                }
            });
        });
    }
    async function exportNetscapeCookies() {
        try {
            const rawCookies = await getCookies({ url: window.location.href });
            if (rawCookies.length === 0) {
                alert('当前页面未找到 Cookie。');
                return;
            }
            const now = Math.floor(Date.now() / 1000);
            const defaultExpiry = now + 31536000;
            const seen = new Set();
            const lines = [];
            for (const c of rawCookies) {
                const name = (c.name || '').trim();
                if (!name) continue;
                const domain = c.domain || '';
                const path = c.path || '/';
                const key = `${domain}|${path}|${name}`;
                if (seen.has(key)) continue;
                seen.add(key);
                const isSub = typeof c.hostOnly === 'boolean' ? !c.hostOnly : domain.startsWith('.');
                const formattedDomain = (isSub && !domain.startsWith('.')) ? `.${domain}` : domain;
                const finalDomain = c.httpOnly ? `#HttpOnly_${formattedDomain}` : formattedDomain;
                const secure = c.secure ? 'TRUE' : 'FALSE';
                const expiry = (c.expirationDate && c.expirationDate > now) ? Math.floor(c.expirationDate) : defaultExpiry;
                const value = (c.value || '').replace(/[\r\n\t]/g, '');
                lines.push(`${finalDomain}\t${isSub ? 'TRUE' : 'FALSE'}\t${path}\t${secure}\t${expiry}\t${name}\t${value}`);
            }
            const header = '# Netscape HTTP Cookie File\n# http://curl.haxx.se/rfc/cookie_spec.html\n# This is a generated file!  Do not edit.\n\n';
            GM_setClipboard(`${header}${lines.join('\n')}\n`, 'text');
            alert(`已复制 ${lines.length} 个 Netscape Cookie 到剪贴板`);
        } catch (error) {
            alert(`导出失败: ${error.message || JSON.stringify(error)}`);
        }
    }
    GM_registerMenuCommand('导出 Netscape Cookie', exportNetscapeCookies);
})();