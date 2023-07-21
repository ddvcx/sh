// ==UserScript==
// @name 广告过滤
// @Version 0.1
// @description 分域名标记广告
// @include *
// ==/UserScript==

function clearAds(elm, array_url) {
var isUrl = false;
for (var x = 0; x < array_url.length; x++) {
if (location.href.match(array_url[x])) {
isUrl = true;
};
};
if (isUrl) {
var head = document.getElementsByTagName('head')[0];
var myStyle = document.createElement('style');
myStyle.type = "text/css";
myStyle.innerHTML = elm + "{display:none !important;visibility:hidden !important;width:0 !important;height:0 !important;}";
head.appendChild(myStyle);
};
};
clearAds(".imgAds", [".*"]);
clearAds(".ad-item", [".*"]);
clearAds(".ad-box", [".*"]);
clearAds(".openApp", [".*"]);
clearAds(".app-downtop", [".*"]);
clearAds("newsletter", [".*"]);
clearAds(".metaRedirectWrapperBottomAds", [".*"]);
clearAds("||jd.dangbei.*", [".*"]);
clearAds("||activity.app.*/*/*app/*.js", [".*"]);
clearAds("||baidustatic.com", [".*"]);
clearAds("||doubleclick.net", [".*"]);
clearAds("||google-analytics.com", [".*"]);
clearAds("||*/*-ads.js", [".*"]);
clearAds("||*/*-analytics.js", [".*"]);
clearAds("xxx", [".*"]);
clearAds("xxx", [".*"]);
clearAds("xxx", [".*"]);
clearAds("xxx", [".*"]);
clearAds("xxx", [".*"]);
clearAds("xxx", [".*"]);
clearAds("xxx", [".*"]);