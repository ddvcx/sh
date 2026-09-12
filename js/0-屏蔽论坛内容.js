// ==UserScript==
// @name        0-屏蔽论坛内容
// @include     *://*.3dmgame.com/*
// @include     *://t66y.com/*
// @include     *://*.52pojie.cn/*
// @include     *://keylol.com/*
// @run-at      document-start
// @downloadURL  https://github.com/ddvcx/sh/raw/m/js/0-屏蔽论坛内容.js
// ==/UserScript==

(function () {
    'use strict';
    const keywords = [
        "公告禁止", "公告版规", "公告格式", "administrator",
        "3DM版务",
        "AVhunter", "吃雞大神", "愛在黑夜", "wwg101", // t66y 愛在黑夜

        "GenW"
    ];
    const regex = new RegExp(keywords.join('|'), 'i');
    function hideRows() {
        for (const row of document.getElementsByTagName('tr')) {
            if (row.style.display !== 'none' && regex.test(row.textContent)) {
                row.style.display = 'none';
            }
        }
    }
    function init() {
        hideRows();
        let scheduled = false;
        const observer = new MutationObserver(() => {
            if (scheduled) return;
            scheduled = true;
            requestAnimationFrame(() => {
                hideRows();
                scheduled = false;
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
