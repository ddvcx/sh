// ==UserScript==
// @name              0-NetDisk
// @version           1.1.3
// @author            Hmjz100、油小猴
// @description       基于【网盘直链下载助手】修改 | 支持 百度网盘 / 阿里云盘 / 天翼云盘 / 迅雷云盘 / 夸克网盘 / 123云盘 
// @source            https://github.com/hmjz100/LinkSwift/
// @require           https://unpkg.com/jquery@3.6.0/dist/jquery.min.js
// @require           https://unpkg.com/sweetalert2@11.4.8/dist/sweetalert2.min.js
// @resource SwalLigt https://unpkg.com/sweetalert2@11.4.8/dist/sweetalert2.min.css
// @resource SwalDark https://unpkg.com/@sweetalert2/theme-dark@5.0.26/dark.min.css
// @require           https://unpkg.com/js-md5@0.7.3/build/md5.min.js
// @require           https://unpkg.com/js-sha256@0.11.1/src/sha256.js
// @run-at            document-start
// @early-start
// @match             *://pan.baidu.com/disk/home*
// @match             *://yun.baidu.com/disk/home*
// @match             *://pan.baidu.com/disk/timeline*
// @match             *://yun.baidu.com/disk/timeline*
// @match             *://pan.baidu.com/disk/main*
// @match             *://yun.baidu.com/disk/main*
// @match             *://pan.baidu.com/youth/pan/main*
// @match             *://yun.baidu.com/youth/pan/main*
// @match             *://pan.baidu.com/disk/base*
// @match             *://yun.baidu.com/disk/base*
// @match             *://pan.baidu.com/disk/timeline*
// @match             *://yun.baidu.com/disk/timeline*
// @match             *://pan.baidu.com/pfile/*
// @match             *://yun.baidu.com/pfile/*
// @match             *://pan.baidu.com/s/*
// @match             *://pan.baidu.com/aipan/*
// @match             *://yun.baidu.com/s/*
// @match             *://yun.baidu.com/aipan/*
// @match             *://pan.baidu.com/share/*
// @match             *://yun.baidu.com/share/*
// @match             *://pan.baidu.com/embed/*
// @match             *://yun.baidu.com/embed/*
// @match             *://openapi.baidu.com/*
// @match             *://www.aliyundrive.com/s/*
// @match             *://www.aliyundrive.com/drive*
// @match             *://www.alipan.com/s/*
// @match             *://www.alipan.com/drive*
// @match             *://cloud.189.cn/web/*
// @match             *://pan.xunlei.com/*
// @match             *://pan.quark.cn/*
// @match             *://*.123pan.com/*
// @match             *://*.123pan.cn/*
// @match             *://*.123684.com/*
// @match             *://*.123865.com/*
// @match             *://*.123952.com/*
// @match             *://*.123912.com/*
// @connect           *
// @connect           localhost
// @connect           baidu.com
// @connect           baidupcs.com
// @connect           aliyundrive.com
// @connect           aliyundrive.net
// @connect           alipan.com
// @connect           alicloudccp.com
// @connect           aliyundrive.cloud
// @connect           189.cn
// @connect           xunlei.com
// @connect           quark.cn
// @connect           123pan.com
// @connect           123pan.cn
// @connect           123684.com
// @connect           123865.com
// @connect           123952.com
// @connect           123912.com
// @connect           cjjd19.com
// @grant             unsafeWindow
// @grant             window.close
// @grant             GM_xmlhttpRequest
// @grant             GM_setClipboard
// @grant             GM_setValue
// @grant             GM_getValue
// @grant             GM_deleteValue
// @grant             GM_openInTab
// @grant             GM_getResourceText
// @compatible	      Chrome
// @compatible	      Edge
// @compatible	      Firefox
// @compatible	      Safari
// @compatible	      Opera
// ==/UserScript==
(function linkSwift($) {
	"use strict";
	if (typeof (unsafeWindow) === "undefined") window.unsafeWindow = window;
	let key = encodeURIComponent("LinkSwift:主代码"); if (window[key]) return; window[key] = true;

	let mount = idontknow("LinkSwift");
	let info = {
		version: (GM_info.script?.version || "1.1.3"),
	};
	let aria2 = {
		domain: "http://localhost",
		port: "6800",
		path: "/jsonrpc",
		token: "",
		dir: ""
	};
	let $doc = $(document);
	let temp = {
		mount: $(`.${mount}`),
		main: {},
		page: "",
		mode: [],
		links: [],
		glinks: [],
		color: "#574AB8",
		request: {},
		swalDefault: {
			position: "center",
			heightAuto: false,
			scrollbarPadding: false,
			confirmButtonText: "确认",
			denyButtonText: "拒绝",
			cancelButtonText: "取消"
		},
	};

	let toast = Swal.mixin({
		toast: true,
		position: "top-end",
		showConfirmButton: false,
		timer: 3500,
		timerProgressBar: true,
		showCloseButton: true,
		didOpen: function (toast) {
			toast.addEventListener("mouseenter", () => {
				Swal.stopTimer();
			});
			toast.addEventListener("mouseleave", () => {
				Swal.resumeTimer();
			});
		}
	});

	let message = {
		success: function (text) {
			toast.fire({ title: text, icon: "success" });
		},
		error: function (text) {
			toast.fire({ title: text, icon: "error" });
		},
		info: function (text) {
			toast.fire({ title: text, icon: "info" });
		}
	};

	let config = {
		base: {
			num: "865746",
			license: "AGPL3",
			dom: {
				button: {
					aria2: {
						title: "Aria2 下载",
						footer: `<p>RPC 适用于 <a href="https://www.youxiaohou.com/zh-cn/motrix.html" target="_blank" class="pl-a" data-no-instant="1">Motrix</a>，<a href="https://www.youxiaohou.com/download.html" target="_blank" class="pl-a" data-no-instant="1">Aria2 Tools</a>，<a href="https://www.youxiaohou.com/download.html" target="_blank" class="pl-a" data-no-instant="1">AriaNgGUI</a></p>
						<p>命令行适用于 <a href="https://www.youxiaohou.com/zh-cn/xdown.html" target="_blank" class="pl-a" data-no-instant="1">XDown</a> 及 <a href="https://www.youxiaohou.com/zh-cn/linux.html#linux-shell" target="_blank" class="pl-a" data-no-instant="1">Linux Shell 命令行</a></p>`
					}
				}
			}
		},
		$baidu: {
			api: {
				ua: {
					downloadLink: "pan.baidu.com"
				},
				getAccessToken: "https://openapi.baidu.com/oauth/2.0/authorize?response_type=token&scope=basic,netdisk&client_id=omiOnr2tYnN9vSyDErcVFWpPU2mZA7YO&redirect_uri=oob&confirm_login=0",
				getLink: "https://pan.baidu.com/rest/2.0/xpan/multimedia?method=filemetas&dlink=1",
				getFiles: "https://pan.baidu.com/rest/2.0/xpan/file?method=list&showempty=1",
				getShareLink: "https://pan.baidu.com/api/sharedownload?channel=chunlei&clienttype=0&web=1&app_id=250528",
				getShareSign: "https://pan.baidu.com/share/tplconfig?fields=sign,timestamp&channel=chunlei&web=1&app_id=250528&clienttype=0&view_mode=1"
			},
			mount: {
				home: ".frame-main>div>div>div>div:has(.g-dropdown-button.g-new-create)",
				main: ".wp-s-agile-tool-bar__header",
				share: ".module-share-top-bar .x-button-box .g-dropdown-button.tools-more"
			}
		},
		$aliyun: {
			api: {
				getLink: "https://api.aliyundrive.com/v2/file/get_download_url",
				getShareLink: "https://api.aliyundrive.com/v2/file/get_share_link_download_url"
			},
			mount: {
				home: `[class^="header--"]>[class^="actions--"]`,
				share: `[class^="banner--"]>[class^="right--"]`,
				list: `[class^="node-list-table-view--"]`,
				grid: `[class^="node-list-grid-view--"]`,
				switch: `[class^="switch-wrapper--"]`
			}
		},
		$tcloud: {
			api: {
				getAccessToken: "https://api.cloud.189.cn/open/oauth2/ssoH5.action",
				getLink: "https://api.cloud.189.cn/open/file/getFileDownloadUrl.action"
			},
			mount: {
				home: "[class*=\"FileHead_file-head-left\"]",
				share: ".nav-opea"
			}
		},
		$xunlei: {
			api: {
				getLink: "https://api-pan.xunlei.com/drive/v1/files/"
			},
			mount: {
				home: `[class^="FileMenu__menu--"]`,
				share: `[class^="Share__batchActionBox--"]`
			}
		},
		$quark: {
			api: {
				ua: {
					downloadLink: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) quark-cloud-drive/3.20.0 Chrome/112.0.5615.165 Electron/24.1.3.8 Safari/537.36 Channel/pckk_other_ch"
				},
				getLink: "https://drive-pc.quark.cn/1/clouddrive/file/download?entry=ft&fr=pc&pr=ucpro"
			},
			mount: {
				home: ".btn-operate .btn-main",
				share: ".share-btns"
			}
		},
		$123pan: {
			api: {
				getLink: "https://www.123pan.com/api/file/download_info",
				getShareLink: "https://www.123pan.com/api/share/download/info"
			},
			mount: {
				home: ".home-operator .home-operator-button-group",
				share: ".conter .rightInfo",
				shareNew: ".content .content-header-container-wrap .rightInfo, .single-file-sharing-container-content-file-operate"
			}
		}
	}

	let base = {
		isType(obj) {
			return Object.prototype.toString.call(obj).replace(/^\[object (.+)\]$/, "$1").toLowerCase();
		},

		getValue(name) {
			return GM_getValue(name);
		},

		setValue(path, value) {
			if (base.isType(path) === "string") {
				GM_setValue(path, value);
				return;
			}
			let key = path[0];
			let obj = this.getValue(key) || {};
			let current = obj;
			for (let i = 1; i < path.length - 1; i++) {
				let keyPart = path[i];
				if (!current[keyPart]) current[keyPart] = {};
				current = current[keyPart];
			}
			current[path[path.length - 1]] = value;
			GM_setValue(key, obj);
		},

		delValue(key) {
			return GM_deleteValue(key);
		},

		getStorage(key) {
			try {
				return JSON.parse(localStorage.getItem(key));
			} catch (e) {
				return localStorage.getItem(key);
			}
		},

		setStorage(key, value) {
			if (this.isType(value) === "object" || this.isType(value) === "array") {
				return localStorage.setItem(key, JSON.stringify(value));
			}
			return localStorage.setItem(key, value);
		},

		setClipboard(text) {
			GM_setClipboard(text, "text");
		},

		encodeBase(str) {
			try { str = btoa(str) } catch { }
			return str;
		},

		decodeBase(str) {
			try { str = decodeURIComponent(str) } catch { }
			try { str = atob(str) } catch { }
			try { str = decodeURIComponent(str) } catch { }
			return str;
		},

		sizeFormat(value = 0) {
			var sizeUnitBase = 1024
			try { value = Number(value) } catch { }
			if (typeof value === "number" && !isNaN(value) && value >= 0) {
				var units = sizeUnitBase === 1024
					? ["B", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"]
					: ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

				var unitNames = ["字节", "千字节", "兆字节", "吉字节", "太字节", "拍字节", "艾字节", "泽字节", "尧字节"];

				if (value === 0) return "0B(字节)";

				var index = Math.min(
					Math.floor(Math.log(value) / Math.log(sizeUnitBase)),
					units.length - 1
				);

				var size = value / Math.pow(sizeUnitBase, index);
				var formattedSize = size % 1 === 0 ? size.toFixed(0) : size.toFixed(2);

				return `${formattedSize}${unitNames[index]}(${units[index]})`;
			}
			return "";
		},

		fixFilename(name) {
			let replace = /[!?&|`"'*\/:<>\\]/g
			return name.replace(replace, "_");
		},

		standHeaders(headers = {}, addDeafult = false) {
			if (!headers) return {};
			if (typeof headers === 'string') {
				const rawHeaders = {};
				headers.split(/[\r\n]+/).forEach(line => {
					if (!line.trim() || !line.includes(':')) return;
					const [key, ...valueParts] = line.split(':');
					rawHeaders[key.trim().toLowerCase()] = valueParts.join(':').trim();
				});
				headers = rawHeaders;
			}
			let newHeaders = {};
			for (let key in headers) {
				let value
				if (this.isType(headers[key]) === "object") value = JSON.stringify(headers[key]);
				else value = String(headers[key]);
				newHeaders[key.toLowerCase().split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join("-")] = value;
			}
			if (addDeafult) return newHeaders;
			return {
				"Dnt": "", "Cache-Control": "no-cache", "Pragma": "no-cache", "Expires": "0",
				"User-Agent": navigator.userAgent,
				"Origin": location.origin,
				"Referer": `${location.origin}/`,
				...newHeaders
			};
		},

		convertLinkToAria2(link, filename, headers) {
			filename = base.fixFilename(filename);
			return `aria2c "${link}" --out "${filename}"${headers ? (" " + headers) : ""}`;
		},

		async sendLinkToAria2(link, filename, headers) {
			if (!this.sendLinkToAria2.lock) this.sendLinkToAria2.lock = Promise.resolve();
			return this.sendLinkToAria2.lock = this.sendLinkToAria2.lock.then(async () => {
				let rpc = aria2;
				let url = `${rpc.domain}:${rpc.port}${rpc.path}`;
				let dir = (rpc.dir !== null && rpc.dir !== "") ? rpc.dir : undefined;
				let data = {
					id: new Date().getTime(),
					jsonrpc: "2.0",
					method: "aria2.addUri",
					params: [`token:${rpc.token}`, [link], {
						dir,
						out: filename,
						header: headers
					}]
				};
				try {
					let res = await base.post(url, data, {}, "");
					if (res.result) return "success";
					return "fail";
				} catch (e) {
					return "fail";
				}
			});
		},

		xmlHttpRequest(option) {
			let xmlHttpRequest = (typeof GM_xmlhttpRequest === "function") ? GM_xmlhttpRequest : (typeof GM?.xmlHttpRequest === "function") ? GM.xmlHttpRequest : null;
			if (!xmlHttpRequest || base.isType(xmlHttpRequest) !== "function") throw new Error("GreaseMonkey 兼容 XMLHttpRequest 不可用。");

			return xmlHttpRequest({ withCredentials: true, ...option });;
		},

		async post(url, data, headers, type = "json") {
			let _data = data;
			if (this.isType(data) === "object" || this.isType(data) === "array") {
				data = JSON.stringify(data);
			} else if (this.isType(data) === "urlsearchparams") {
				_data = Object.fromEntries(data);
			}
			headers = this.standHeaders(headers);
			headers = { "Accept": "*/*,application/json;charset=utf-8", ...headers };
			let request
			let promise = new Promise((resolve, reject) => {
				request = base.xmlHttpRequest({
					url, headers, data,
					method: "POST", responseType: type,
					onloadstart: (res) => {
						base.console.log("【LinkSwift】Post(start)\n请求地址：" + url + "\n请求数据：", _data, "\n请求头部：", headers);
					},
					onload: (res) => {
						const rawHeaders = res.responseHeaders || (request?.getAllResponseHeaders?.() || "") || "";
						res.responseHeaders = base.standHeaders(typeof rawHeaders === 'string' ? rawHeaders.trim() : "", true);
						if (type === "blob") {
							base.console.log("【LinkSwift】Post(load) Blob\n请求地址：" + url + "\n请求数据：", _data, "\n请求结果：", res);
							resolve(res);
							return;
						}

						res.responseDecode = res.responseText;
						try { res.responseDecode = atob(res.responseDecode) } catch { }
						try { res.responseDecode = escape(res.responseDecode) } catch { }
						try { res.responseDecode = decodeURIComponent(res.responseDecode) } catch { }
						try { res.responseDecode = JSON.parse(res.responseDecode) } catch { }
						if (res.responseDecode === res.responseText) res.responseDecode = null;
						if (this.isType(res.response) === "object") res.responseDecode = res.response;

						base.console.log("【LinkSwift】Post(load)\n请求地址：" + url + "\n请求数据：", _data, "\n请求头部：", headers, "\n请求结果：", res);
						resolve(res.responseDecode ?? res.response ?? res.responseText);
					},
					onerror: (error) => {
						let msg = "请求失败";
						if (error && typeof error === "object") msg += ": " + JSON.stringify(error, null, 2);
						base.console.error("【LinkSwift】Post(error)\n请求出现错误，可能是网络问题。", error);
						reject(new Error(msg));
					}
				});
			})
			if (request) {
				var methods = Object.getOwnPropertyNames(request).filter(key => typeof request[key] === 'function' && !promise.hasOwnProperty(key) && !['then', 'catch', 'finally'].includes(key));
				methods.forEach(method => { promise[method] = (...args) => request[method](...args); });
			}
			return promise;
		},

		async get(url, headers, type = "json") {
			headers = this.standHeaders(headers);
			let request
			let promise = new Promise((resolve, reject) => {
				request = base.xmlHttpRequest({
					url, headers,
					method: "GET", responseType: type,
					onloadstart: (res) => {
						base.console.log("【LinkSwift】Get(start)\n请求地址：" + url + "\n请求头部：", headers);
					},
					onload: (res) => {
						const rawHeaders = res.responseHeaders || (request?.getAllResponseHeaders?.() || "") || "";
						res.responseHeaders = base.standHeaders(typeof rawHeaders === 'string' ? rawHeaders.trim() : "", true);
						if (type === "blob") {
							base.console.log("【LinkSwift】Get(load) Blob\n请求地址：" + url, "\n请求结果：", res);
							resolve(res);
							return;
						}
						res.responseDecode = res.responseText;
						try { res.responseDecode = JSON.parse(res.responseDecode) } catch { }
						if (res.responseDecode === res.responseText) res.responseDecode = null;
						if (this.isType(res.response) === "object") res.responseDecode = res.response;

						base.console.log("【LinkSwift】Get(load)\n请求地址：" + url + "\n请求头部：", headers, "\n请求结果：", res);
						resolve(res.responseDecode ?? res.response ?? res.responseText);
					},
					onerror: (error) => {
						let msg = "请求失败";
						if (error && typeof error === "object") msg += ": " + JSON.stringify(error, null, 2);
						base.console.error("【LinkSwift】Get(error)\n请求出现错误，可能是网络问题。", error);
						reject(new Error(msg));
					}
				});
			})
			if (request) {
				var methods = Object.getOwnPropertyNames(request).filter(key => typeof request[key] === 'function' && !promise.hasOwnProperty(key) && !['then', 'catch', 'finally'].includes(key));
				methods.forEach(method => { promise[method] = (...args) => request[method](...args); });
			}
			return promise;
		},
		async head(url, headers, usingGET) {
			headers = this.standHeaders(headers);
			return new Promise((resolve, reject) => {
				var method = usingGET ? "Get" : "Head";
				let _aborted = false;
				let request = base.xmlHttpRequest({
					method: method.toUpperCase(),
					url,
					headers,
					onloadstart: () => {
						base.console.log(`【LinkSwift】Head${usingGET ? " Get" : ""}(start)\n请求地址：${url}\n请求头部：`, headers);
					},
					onload: function (res) {
						if (!_aborted) {
							const rawHeaders = res.responseHeaders || (request?.getAllResponseHeaders?.() || "") || "";
							res.responseHeaders = base.standHeaders(typeof rawHeaders === 'string' ? rawHeaders.trim() : "", true);

							base.console.log(`【LinkSwift】Head${usingGET ? " Get" : ""}(load)\n请求地址：${res.finalUrl}\n响应状态：${res.status}\n响应内容：`, res);

							if (!usingGET && !res.responseHeaders.hasOwnProperty("Range") && !(res?.status >= 200 && res?.status < 400)) {
								base.head(res.finalUrl, { ...headers, Range: "bytes=0-0" }, true).then(resolve).catch(reject);
								return;
							}

							resolve(res);
						}
					},
					onreadystatechange: function (res) {
						if (res.readyState === 2) {
							_aborted = true;
							if (request && request.abort) request.abort();

							const rawHeaders = res.responseHeaders || (request?.getAllResponseHeaders?.() || "") || "";
							res.responseHeaders = base.standHeaders(typeof rawHeaders === 'string' ? rawHeaders.trim() : "", true);

							base.console.log(`【LinkSwift】Head${usingGET ? " Get" : ""}(load) RS2\n请求地址：${res.finalUrl}\n响应状态：${res.status}\n响应内容：`, res);

							if (!usingGET && !res.responseHeaders.hasOwnProperty("Range") && !(res?.status >= 200 && res?.status < 400)) {
								base.head(res.finalUrl, { ...headers, Range: "bytes=0-0" }, true).then(resolve).catch(reject);
								return;
							}

							resolve(res);
						}
					},
					onerror: function (err) {
						if (!_aborted) {
							base.console.error(`【LinkSwift】Head${usingGET ? " Get" : ""}(error)\n请求出现错误，可能是网络问题。`, err);
							reject(err);
						}
					}
				});
			});
		},

		getFinal(url, headers = {}, usingGET = false, returnURL = true) {
			return new Promise(async (resolve, reject) => {
				var res = await this.head(url, headers, usingGET).catch(reject);
				if (!res?.finalUrl) return reject(res);
				if (res?.status == 204 && res?.statusText === "IDM") return reject(res);
				if (res?.status >= 300 && res?.status < 400) {
					base.getFinal(res.finalUrl, headers, usingGET, returnURL).then(resolve).catch(reject);
					return;
				}
				if (returnURL) return resolve(res.finalUrl);
				else return resolve(res);
			});
		},

		_resetAllData() {
			temp.links = [];
			$.each(temp.request, function (key) {
				(temp.request[key]).abort();
			});
			temp.request = {};
		},

		stringify(obj) {
			let str = "";
			for (let key in obj) {
				if (obj.hasOwnProperty(key)) {
					let value = obj[key];
					if (Array.isArray(value)) {
						for (let i = 0; i < value.length; i++) {
							str += encodeURIComponent(key) + "=" + encodeURIComponent(value[i]) + "&";
						}
					} else {
						str += encodeURIComponent(key) + "=" + encodeURIComponent(value) + "&";
					}
				}
			}
			return str.slice(0, -1);
		},

		addStyle(id, tag = "style", css, element = `.${mount}`, position = "append") {
			base.waitForKeyElements(element, (element) => {
				let $styleDom = $(`[${mount}="${id}"], #${id}`);
				let $style = $(`<${tag}>`, {
					rel: "stylesheet",
					id: id,
					[mount]: id
				});
				tag === "style" ? $style.html(css.trim().replace(/\t/g, "").replace(/\r\n|\n\r|\n|\r/g, "\n").replace(/\n+/g, "\n")) : $style.attr("href", css);
				if ($styleDom.length) {
					$styleDom.replaceWith($style);
					base.console.log($style[0])
					return true;
				}
				if (position === "before") {
					element.before($style);
				} else if (position === "after") {
					element.after($style);
				} else if (position === "prepend") {
					element.prepend($style);
				} else {
					element.append($style);
				}
			}, true);
		},

		sleep(time) {
			return new Promise(resolve => setTimeout(resolve, time));
		},

		findReact(dom, traverseUp = 0) {
			let key = Object.keys(dom).find(key => {
				return key.startsWith("__reactFiber$")
					|| key.startsWith("__reactInternalInstance$");
			});
			let domFiber = dom[key];
			if (domFiber == null) return null;
			if (domFiber._currentElement) {
				let compFiber = domFiber._currentElement._owner;
				for (let i = 0; i < traverseUp; i++) {
					compFiber = compFiber._currentElement._owner;
				}
				return compFiber._instance;
			}
			let GetCompFiber = fiber => {
				let parentFiber = fiber.return;
				while (base.isType(parentFiber.type) == "string") {
					parentFiber = parentFiber.return;
				}
				return parentFiber;
			};
			let compFiber = GetCompFiber(domFiber);
			for (let i = 0; i < traverseUp; i++) {
				compFiber = GetCompFiber(compFiber);
			}
			return compFiber.stateNode || compFiber;
		},

		clone(value) {
			if (this.isType(structuredClone) === "function") return structuredClone(value);
			if (value === null || value === undefined) return value;
			if (typeof value !== 'object') return value;
			if (value instanceof Date) return new Date(value);
			if (value instanceof RegExp) return new RegExp(value);
			if (Array.isArray(value)) return value.map(item => base.clone(item));
			const result = {};
			for (const key in value) {
				if (Object.prototype.hasOwnProperty.call(value, key)) result[key] = base.clone(value[key]);
			}
			return result;
		},

		initConfigMigration(latest) {
			try {
				if (latest === 1) {
					let mapping = {
						"setting_rpc_domain": ["setting_aria2_rpc", 0, "domain"],
						"setting_rpc_port": ["setting_aria2_rpc", 0, "port"],
						"setting_rpc_path": ["setting_aria2_rpc", 0, "path"],
						"setting_rpc_token": ["setting_aria2_rpc", 0, "token"],
						"setting_rpc_dir": ["setting_aria2_rpc", 0, "dir"],
						"setting_init_code": ["setting_init", "code"],
						"setting_init_license": ["setting_init", "license"],
						"setting_init_version": ["setting_init", "version"]
					};
					for (let oldKey in mapping) {
						let val = base.getValue(oldKey);
						if (val === undefined || val === null) continue;
						val = (val === "no" ? false : val === "yes" ? true : val);
						let path = mapping[oldKey];
						if (path.length === 1) {
							base.setValue(path[0], val);
						} else {
							let [root, ...keys] = path;
							let obj = base.getValue(root);
							if (obj === undefined || obj === null) {
								let firstKeyType = typeof keys[0];
								let isIndex = firstKeyType === "number" || (firstKeyType === "string" && /^\d+$/.test(keys[0]));
								obj = isIndex ? [] : {};
							}
							let ref = obj;
							for (let i = 0; i < keys.length - 1; i++) {
								let key = keys[i];
								if (!ref[key]) {
									let nextKey = keys[i + 1];
									let hasNextIndex = nextKey !== undefined && (base.isType(nextKey === "number" || (typeof nextKey) === "string" && /^\d+$/.test(nextKey)));
									ref[key] = hasNextIndex ? [] : {};
								}
								ref = ref[key];
							}
							ref[keys.slice(-1)[0]] = val;
							base.setValue(root, obj);
						}
						base.delValue(oldKey);
					}
				}
			} catch (e) {
				base.console.error("【LinkSwift】迁移旧版本配置到新配置时出错", e);
			}
		},

		initDefaultConfig() {
			if (base.getValue("setting_config_version") !== "1") base.initConfigMigration(1);
			let defaults = [
				{
					name: "setting_aria2_rpc",
					value: [
						{
							domain: aria2.domain,
							port: aria2.port,
							path: aria2.path,
							token: aria2.token,
							dir: aria2.dir,
							default: true
						}
					]
				},
				{
					name: "setting_init",
					value: {
						code: config.base.num,
						license: config.base.license,
						version: ""
					}
				},
				{
					name: "setting_config_version",
					value: "1"
				}
			];
			function cloneDeep(item) {
				return JSON.parse(JSON.stringify(item));
			}
			function fillMissingFields(target, source) {
				if (target === null || target === undefined) {
					return cloneDeep(source);
				}
				if (typeof source !== typeof target) {
					return cloneDeep(source);
				}
				if (base.isType(source) === "object" && !Array.isArray(source)) {
					if (typeof target !== "object" || Array.isArray(target)) {
						return cloneDeep(source);
					}
					let result = { ...target };
					for (let key in source) {
						if (!source.hasOwnProperty(key)) continue;
						if (key === "default") continue;
						if (key === "dir" && target[key] !== undefined) continue;
						if (key === "token" && target[key] !== undefined) continue;
						if (key === "authName" && target[key] !== undefined) continue;
						if (key === "authPass" && target[key] !== undefined) continue;
						result[key] = fillMissingFields(target[key], source[key]);
					}
					return result;
				}
				if (Array.isArray(source)) {
					if (!Array.isArray(target)) {
						return cloneDeep(source);
					}
					let result = [...target];
					if (source.length > 0 && base.isType(source[0]) === "object" && source[0] !== null) {
						let template = source[0];
						for (let i = 0; i < result.length; i++) {
							if (base.isType(result[i]) === "object" && result[i] !== null) {
								result[i] = fillMissingFields(result[i], template);
							} else {
								result[i] = cloneDeep(template);
							}
						}
						if (
							template.default === true &&
							!result.some(item => item && item.default === true) &&
							result.length > 0
						) {
							result[0].default = true;
						}
					}
					return result;
				}
				return target;
			}
			defaults.forEach(({ name, value }) => {
				let current = base.getValue(name);
				if (
					current === null ||
					current === undefined ||
					(Array.isArray(current) && current.length === 0)
				) {
					base.setValue(name, cloneDeep(value));
				} else {
					base.setValue(name, fillMissingFields(current, value));
				}
			});
			let currentInit = base.getValue("setting_init");
			if (currentInit && (currentInit.code !== config.base.num || currentInit.license !== config.base.license)) {
				currentInit.code = config.base.num;
				currentInit.license = config.base.license;
				base.setValue("setting_init", currentInit);
			}
			let currentAria2 = base.getValue("setting_aria2_rpc");
			if (Array.isArray(currentAria2)) {
				let defaultRpc = currentAria2.find(i => i.default) || currentAria2[0];
				if (defaultRpc) {
					defaultRpc.domain = aria2.domain;
					defaultRpc.port = aria2.port;
					base.setValue("setting_aria2_rpc", currentAria2);
				}
			}
		},

		createTip() {
			let tooltip = document.querySelector(".pl-tooltip");
			let ticking = false;
			let currentTarget = null;

			var updatePosition = (x, y) => {
				if (!tooltip) return;
				let X = x + 10;
				let Y = y + 20;
				let clientWidth = document.documentElement.clientWidth;
				let clientHeight = document.documentElement.clientHeight;
				let scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft;
				let scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
				if (X + tooltip.offsetWidth > clientWidth + scrollLeft) {
					X = clientWidth + scrollLeft - tooltip.offsetWidth;
				}
				if (X < scrollLeft) {
					X = scrollLeft;
				}
				if (Y + tooltip.offsetHeight > clientHeight + scrollTop) {
					Y = clientHeight + scrollTop - tooltip.offsetHeight;
				}
				if (Y < scrollTop) {
					Y = scrollTop;
				}
				tooltip.style.transform = `translate3d(${X}px, ${Y}px, 0)`;
			};

			var renderContent = (target) => {
				var { title, size } = target.dataset;
				let html = "";

				if (title) {
					html = `<span>${title}</span>`;
				} else {
					var nameEl = target.querySelector(".name");
					var sizeEl = target.querySelector(".size");
					var name = nameEl ? nameEl.textContent : "";
					var sizeText = sizeEl ? sizeEl.textContent : "";

					html = `<span>${name}</span>`;
					if (sizeText) {
						html += `<span style="background-color:${temp.color}">${sizeText}</span>`;
					}
				}

				if (!tooltip) {
					tooltip = document.createElement("div");
					tooltip.className = "pl-tooltip";
					tooltip.style.position = "absolute";
					tooltip.style.willChange = "transform";
					tooltip.style.pointerEvents = "none";
					temp.mount[0].appendChild(tooltip);
				}

				tooltip.innerHTML = html;
				tooltip.style.display = "flex";
			};

			var handleMove = (e) => {
				if (!currentTarget) return;

				var x = e.pageX;
				var y = e.pageY;

				if (!ticking) {
					requestAnimationFrame(() => {
						updatePosition(x, y);
						ticking = false;
					});
					ticking = true;
				}
			};

			var handleOver = (e) => {
				var target = e.target.closest(".listener-tip");
				if (!target) return;

				currentTarget = target;
				renderContent(target);
				updatePosition(e.pageX, e.pageY);
			};

			var handleOut = (e) => {
				var related = e.relatedTarget;
				if (!related || !related.closest(".listener-tip, .pl-tooltip")) {
					currentTarget = null;
					if (tooltip) tooltip.style.display = "none";
				}
			};

			document.addEventListener("pointerover", handleOver);
			document.addEventListener("pointermove", handleMove, { passive: true });
			document.addEventListener("pointerout", handleOut);
		},

		createLoading() {
			return $(`<div class="pl-loading"><div class="pl-loading-box"><div><div></div><div></div></div></div></div>`);
		},

		generateDom(configs) {
			if (base.isType(configs) !== "array" && configs.length !== 2) return message.error("提示：<br/>配置解析失败~");
			let list = (Array.isArray(configs[0]) ? configs[0] : []);
			if (!list.length) return message.error("提示：<br/>获取下载链接失败，刷新网页后再试试吧~");
			let {
				isFolder,
				getFileName,
				getFileSize,
				getFileLink,
				convert = {}
			} = (base.isType(configs[1]) === "object" ? configs[1] : {});
			let content = $(`<div><div class="pl-main"></div></div>`);
			list.forEach((v) => {
				if (isFolder(v)) return;
				let filename = getFileName(v);
				let size = getFileSize(v);
				let dlink = getFileLink(v);
				if (!dlink || !dlink.includes("http")) {
					content.find(".pl-main").append(`<div class="pl-item">
						<div class="pl-item-name listener-tip" data-size="${size}"><div class="name">${filename}</div><div class="size">${base.sizeFormat(size)}</div></div>
						<div class="pl-item-message">${dlink ? dlink : "获取下载链接失败，刷新网页后再试试吧~"}</div>
					</div>`);
				} else {
					let finalink = base.convertLinkToAria2(dlink, filename, convert?.aria2);
					content.find(".pl-main").append(`<div class="pl-item">
						<div class="pl-item-name listener-tip" data-size="${size}"><div class="name">${filename}</div><div class="size">${base.sizeFormat(size)}</div></div>
						<button class="pl-item-link pl-btn-primary pl-btn-default listener-aria2-download" data-filename="${filename}" data-link="${dlink}"><span>推送链接到 Aria2 下载器</span></button>
						<button class="pl-btn-primary pl-btn-info listener-copy listener-tip" data-copy='${finalink}' data-title="Aria2 没启用 RPC？点击复制 aria2c 命令行手动下载">复制下载命令行</button>
					</div>`);
				}
			});
			let html = content.html();
			content.remove();
			return html;
		},

		getDownloadHeaders(type, target) {
			if (typeof temp.main?.getDownloadHeaders === "function") {
				return temp.main.getDownloadHeaders(type, target);
			}
			return undefined;
		},

		addPageListener() {
			$doc.on("click", ".listener-copy", async function (e) {
				e.preventDefault();
				let target = $(e.currentTarget);
				let originalHtml = target.html();
				let copy = target.data("copy");
				if (copy) {
					base.setClipboard(copy);
					target.html(`✓复制成功`).animate({ opacity: "0.5" }, "slow");
					await base.sleep(2000);
					target.css("opacity", "");
					target.html(originalHtml);
				}
			});
			$doc.on("click", ".listener-rpc-task.youxiaohou", function () {
				let rpc = aria2;
				let isHttps = rpc.domain.startsWith("https://");
				let url = `${isHttps ? "https" : "http"}://d.youxiaohou.com/?rpc=${base.encodeBase(JSON.stringify({ domain: rpc.domain, port: rpc.port }))}#${rpc.token}`;
				GM_openInTab(url, { active: true, insert: true, setParent: true });
			});
			$doc.on("click", ".listener-rpc-task.ariang", function () {
				let rpc = aria2;
				let isHttps = rpc.domain.startsWith("https://");
				let url = `${isHttps ? "https" : "http"}://ariang.mayswind.net/latest/#!/settings/rpc/set?protocol=${isHttps ? "wss" : "ws"}&host=${rpc.domain.replace(/^(https?:\/\/)/, "")}&port=${rpc.port}&interface=${rpc.path.replace(/^\//, "")}&secret=${rpc.token}`;
				GM_openInTab(url, { active: true, insert: true, setParent: true });
			});
			$doc.on("click", ".listener-aria2-download", async function (e) {
				let target = $(e.currentTarget);
				if (target.attr("data-processing") === "true") return;
				target.attr("data-processing", "true");
				let originalHtml = target.html();
				target.find(".pl-loading").remove();
				target.prepend(base.createLoading());
				let headers = base.getDownloadHeaders("aria2", target);
				let res = await base.sendLinkToAria2(target.data("link"), target.data("filename"), headers);
				if (res === "success") {
					target.removeClass("pl-btn-danger").html("发送成功啦!快去看看吧~").animate({ opacity: "0.5" }, "slow");
				} else {
					target.addClass("pl-btn-danger").text("发送失败，检查一下您的配置信息哦!").animate({ opacity: "0.5" }, "slow");
				}
				await base.sleep(3000);
				target.removeClass("pl-btn-danger").removeAttr("data-processing").html(originalHtml).css("opacity", "");
			});
			$doc.on("click", ".pl-button", async function (e) {
				e.preventDefault();
				e.stopPropagation();
				if (temp.isProcessing) return;
				temp.isProcessing = true;
				setTimeout(() => { temp.isProcessing = false; }, 2000);
				temp.mode = "aria2";
				if (!base.isType(temp.main?.getLink).includes("function")) {
					temp.isProcessing = false;
					return;
				}
				message.info("正在获取链接并推送 ...");
				try {
					await temp.main.getLink();
				} catch (err) {
					temp.isProcessing = false;
					message.error("获取链接失败，请稍后重试~");
				}
			});
		},

		addPanLinkerStyle() {
			base.addStyle("swal-pub-style", "style", `@media (prefers-color-scheme:light){${GM_getResourceText("SwalLigt")}}`);
			base.addStyle("swal-pub-dark-style", "style", `@media (prefers-color-scheme:dark){${GM_getResourceText("SwalDark").replace(/#19191a/, "#222226")}}`);
			base.addStyle("swal-pub-custom-style", "style", `
.swal2-container *{vertical-align:baseline}
.swal2-styled{transition:all.2s}
.swal2-loader{display:none;align-items:center;justify-content:center;width:2.2em;height:2.2em;margin:0 1.875em;-webkit-animation:swal2-rotate-loading 1.5s linear 0s infinite normal;animation:swal2-rotate-loading 1.5s linear 0s infinite normal;border-width:.25em;border-style:solid;border-radius:100%;border-color:${temp.color} transparent }
.swal2-timer-progress-bar-container{position:absolute;right:0;bottom:0;left:0;grid-column:auto;overflow:hidden;border-bottom-right-radius:5px;border-bottom-left-radius:5px}
.swal2-timer-progress-bar{width:100%;height:.25em;background:${temp.color}33 }
.swal2-progress-steps .swal2-progress-step{z-index:20;flex-shrink:0;width:2em;height:2em;border-radius:2em;background:${temp.color};color:#fff;line-height:2em;text-align:center}
.swal2-progress-steps .swal2-progress-step.swal2-active-progress-step{background:${temp.color} }
.swal2-progress-steps .swal2-progress-step-line{z-index:10;flex-shrink:0;width:2.5em;height:.4em;margin:0 -1px;background:${temp.color}}
.swal2-html-container{padding:1em 1.6em 0.3em;margin:0}
.swal2-close,div:where(.swal2-container) button:where(.swal2-close){position:absolute;border-radius:10px;top:0;right:0;transition:all.2s}
.swal2-close:hover,div:where(.swal2-container) button:where(.swal2-close):hover{color:${temp.color};background-color:${temp.color}30;font-size:60px}
.swal2-styled{display:flex;justify-content:center;align-items:center;gap:5px}
.swal2-styled.swal2-confirm,div:where(.swal2-container) button:where(.swal2-styled):where(.swal2-confirm){background-color:${temp.color};color:#fff}
.swal2-styled.swal2-confirm:focus,div:where(.swal2-container) button:where(.swal2-styled):where(.swal2-confirm):focus{box-shadow:0 0 0 3px ${temp.color}80}
.swal2-styled.swal2-deny:focus,.swal2-close:focus,div:where(.swal2-container) button:where(.swal2-styled):where(.swal2-deny):focus{box-shadow:0 0 0 3px #dc374180}
.swal2-styled.swal2-cancel:focus,div:where(.swal2-container) button:where(.swal2-styled):where(.swal2-cancel):focus{box-shadow:0 0 0 3px #6e788180}
.swal2-styled.swal2-confirm,
.swal2-styled.swal2-deny,
.swal2-styled.swal2-cancel,
div:where(.swal2-container) button:where(.swal2-styled):where(.swal2-confirm),
div:where(.swal2-container) button:where(.swal2-styled):where(.swal2-deny),
div:where(.swal2-container) button:where(.swal2-styled):where(.swal2-cancel)
{border-radius:50px}
div:where(.swal2-container) div:where(.swal2-actions):not(.swal2-loading) .swal2-styled:hover{opacity:0.7}
.swal2-backdrop-show,.swal2-noanimation,div:where(.swal2-container).swal2-backdrop-show, div:where(.swal2-container).swal2-noanimation{background:rgba(25,25,26,.75);transition:backdrop-filter.2s;backdrop-filter:blur(1px)}
body.swal2-toast-shown .swal2-container{backdrop-filter:none}
.swal2-popup,div:where(.swal2-container) div:where(.swal2-popup){padding-bottom:1em;border-radius:10px}
.swal2-title,div:where(.swal2-container) h2:where(.swal2-title){height:auto}
.swal2-html-container,div:where(.swal2-container) div:where(.swal2-html-container){padding:1.3em 1.3em 0.3em;margin:0}
.swal2-footer,div:where(.swal2-container) div:where(.swal2-footer){flex-direction:column;justify-content:center;align-items:center}
.swal2-footer p,div:where(.swal2-container) div:where(.swal2-footer) p{margin:0;padding:0}
.swal2-icon-content,div:where(.swal2-icon) .swal2-icon-content{font-family:sans-serif}
.swal2-input, .swal2-file, swal2-select, .swal2-textarea,
div:where(.swal2-container) input:where(.swal2-input),
div:where(.swal2-container) input:where(.swal2-file),
div:where(.swal2-container) input:where(.swal2-select),
div:where(.swal2-container) textarea:where(.swal2-textarea)
{box-shadow:none}
.swal2-input:focus, .swal2-file:focus, .swal2-select:focus, .swal2-textarea:focus,
.swal2-input:focus-visible, .swal2-file:focus-visible, .swal2-select:focus-visible, .swal2-textarea:focus-visible,
div:where(.swal2-container) input:where(.swal2-input):focus,
div:where(.swal2-container) input:where(.swal2-input):focus-visible,
div:where(.swal2-container) input:where(.swal2-file):focus,
div:where(.swal2-container) input:where(.swal2-file):focus-visible,
div:where(.swal2-container) input:where(.swal2-select):focus,
div:where(.swal2-container) input:where(.swal2-select):focus-visible,
div:where(.swal2-container) textarea:where(.swal2-textarea):focus,
div:where(.swal2-container) textarea:where(.swal2-textarea):focus-visible
{outline:0;border:1px solid ${temp.color};box-shadow:0 0 0 3px ${temp.color}80}
.swal2-checkbox, .swal2-file, .swal2-input, .swal2-radio, .swal2-select, .swal2-textarea,
div:where(.swal2-container) input:where(.swal2-input), div:where(.swal2-container) input:where(.swal2-file), div:where(.swal2-container) textarea:where(.swal2-textarea), div:where(.swal2-container) select:where(.swal2-select), div:where(.swal2-container) div:where(.swal2-radio), div:where(.swal2-container) label:where(.swal2-checkbox)
{margin:1em 2em}`);
			base.addStyle(`${mount}-main-style`, "style", `
body.swal2-shown:not(.swal2-no-backdrop,.swal2-toast-shown) ::-webkit-scrollbar{width:.6em;height:.6em}
body.swal2-shown:not(.swal2-no-backdrop,.swal2-toast-shown) ::-webkit-scrollbar-track{border-radius:10px;background:#fff}
body.swal2-shown:not(.swal2-no-backdrop,.swal2-toast-shown) ::-webkit-scrollbar-thumb{border-radius:10px!important}
body.swal2-shown:not(.swal2-no-backdrop,.swal2-toast-shown) ::-webkit-scrollbar-thumb{background-color:${temp.color}90!important;transition:background-color.2s;will-change:background-color}
body.swal2-shown:not(.swal2-no-backdrop,.swal2-toast-shown) ::-webkit-scrollbar-thumb:hover{background-color:${temp.color}D0!important}
body.swal2-shown:not(.swal2-no-backdrop,.swal2-toast-shown) ::-webkit-scrollbar-track{background:#fff!important}
@media (prefers-color-scheme:dark){ body.swal2-shown:not(.swal2-no-backdrop,.swal2-toast-shown) ::-webkit-scrollbar-track{background:#606266!important} }
.pl-popup{font-size:12px;min-width:70%;max-width:95%}
.pl-header{padding:0;align-items:flex-start;border-bottom:1px solid #eee;margin:0 0 10px;padding:0 0 5px}
.pl-title{font-size:18px;white-space:nowrap;text-overflow:ellipsis}
.pl-content{padding:0;font-size:12px}
.pl-footer{font-size:15px;text-align:center;display:block}
.pl-main{background:${temp.color}15;border-radius:10px;display:flex;flex-direction:column;gap:8px;max-height:calc(${document.documentElement.clientHeight}px - 300px);overflow:auto;padding:8px 6px}
.pl-a{position:relative;vertical-align:baseline;color:${temp.color};border-bottom:2px solid ${temp.color};text-decoration:none!important;transition:color.3s,opacity.3s;will-change:color,opacity;overflow:hidden}
.pl-a::before{content:"";position:absolute;left:0;bottom:0;width:100%;height:100%;background-color:${temp.color};transform:scaleY(0);transform-origin:bottom center;transition:transform.15s,opacity.3s;will-change:transform;z-index:-1}
.pl-a:hover,.pl-a:focus{color:#fff}
.pl-a:hover::before,.pl-a:focus::before{transform:scaleY(1)}
.pl-a:active{color:#fff;opacity:0.8}
.pl-item{display:flex;align-items:center;background:${temp.color}30;border-radius:8px;padding:5px;gap:10px}
.pl-item-name{width:15%;text-align:left;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;cursor:default}
.pl-item-name>*{text-align:left;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.pl-item-link{flex:1;cursor:pointer}
a.pl-item-link{color:${temp.color};text-align:left;white-space:nowrap;text-overflow:ellipsis;overflow:hidden;transition:color.15s;will-change:color}
a.pl-item-link:hover{color:#fff}
.pl-item-message{display:flex;justify-content:space-between;flex:1}
.pl-btn-primary{color:#ffffff!important;background:${temp.color};border:0;border-radius:50px;cursor:pointer;font-size:12px;outline:none;word-break:keep-all;display:flex;align-items:center;justify-content:center;gap:5px;padding:0.625em 1.1em;transition:opacity.2s,box-shadow.2s;will-change:opacity,box-shadow}
.pl-btn-primary:hover{opacity:0.8!important}
.pl-btn-primary:focus{box-shadow:0 0 0 3px ${temp.color}80}
.pl-btn-success{background:#55af28}
.pl-btn-success:focus{box-shadow:0 0 0 3px #55af2880}
.pl-btn-info{background:#606266}
.pl-btn-info:focus{box-shadow:0 0 0 3px #60626680}
.pl-btn-warning{background:#da9328}
.pl-btn-warning:focus{box-shadow:0 0 0 3px #da932880}
.pl-btn-danger{background:#cc3235}
.pl-btn-danger:focus{box-shadow:0 0 0 3px #cc323580}
.pl-btn-opacity{animation:easeOpacity 1.2s 2;animation-fill-mode:forwards;will-change:opacity}
@keyframes easeOpacity{ from{opacity:1} 50%{opacity:0.35} to{opacity:1} }
.pl-button-mini{padding:5px 10px}
.pl-button{transition:all.2s;position:relative}
.pl-button-init{opacity:0.5;animation:easeInitOpacity 1.2s 5;animation-fill-mode:forwards}
header[style="display:none;"]~.pl-button{display:inline-block;position:fixed;top:0.6em;left:65%;z-index:99999}
.color-button{background:${temp.color}!important;border-color:${temp.color}!important;border:1px solid ${temp.color}!important;display:inline-flex;transition:background.2s,border-color.2s;will-change:background,border-color}
.color-button:hover{background:${temp.color}b0!important;border-color:${temp.color}!important}
.ali-button{background:${temp.color};border:0 solid transparent;font-size:14px;margin-left:20px;padding:8px 16px;position:relative;height:32px;border-radius:100px;display:flex;align-items:center;justify-content:center;color:var(--basic_white);cursor:pointer;transition:background.2s;will-change:background}
.ali-button:hover{background:${temp.color}D0}
.tcloud-button{color:#fff;border:1px solid ${temp.color};background:${temp.color};position:relative;height:30px;padding:0 12px;margin-right:12px;font-size:12px;line-height:28px;cursor:pointer;will-change:background,border-color}
.tcloud-button:hover{border-color:${temp.color}b0;background:${temp.color}b0}
.xunlei-button{display:inline-flex;align-items:center;justify-content:center;border:0 solid transparent;border-radius:5px;box-shadow:0 0 0 0 transparent;width:fit-content;white-space:nowrap;flex-shrink:0;font-size:14px;line-height:1.5;outline:0;touch-action:manipulation;transition:background.2s,color.2s,border.2s,box-shadow.2s;color:#fff;background:${temp.color};margin-left:12px;padding:0px 12px;position:relative;cursor:pointer;height:36px;will-change:background}
.xunlei-button:hover{background:${temp.color}b0}
.quark-button{padding:0 14px;background:${temp.color}!important;background-color:${temp.color}!important;will-change:background,background-color}
.pl-tooltip{position:absolute;z-index:110000;display:none;align-items:center;color:#ffffff;background:#333;font-size:12px;line-height:1.3;max-width:600px;border-radius:5px;word-break:break-all;will-change:display,top,left}
.pl-tooltip>*{padding:5px 10px}
.pl-tooltip>*:first-child{border:1px solid;border-top-left-radius:5px;border-bottom-left-radius:5px;border-top-color:#333;border-bottom-color:#333;border-left-color:#333;border-right-color:transparent}
.pl-tooltip>*:last-child{border:1px solid;border-top-right-radius:5px;border-bottom-right-radius:5px;border-top-color:#333;border-bottom-color:#333;border-left-color:transparent;border-right-color:#333}
.pl-loading-box>div>div{position:absolute;border-radius:50%}
.pl-loading-box>div>div:nth-child(1){top:9px;left:9px;width:82px;height:82px;background:#ffffff}
@keyframes load{ 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
.pl-loading-box>div>div:nth-child(2){top:14px;left:38px;width:25px;height:25px;background:${temp.color};animation:load 1s linear infinite;transform-origin:12px 36px}
.pl-loading{width:16px;height:16px;display:inline-block;overflow:hidden;background:none}
.pl-loading-box{width:100%;height:100%;position:relative;transform:translateZ(0) scale(0.16);backface-visibility:hidden;transform-origin:0 0}
.pl-loading-box div{box-sizing:content-box}
.pl-button-save{background-color:${temp.color}!important;color:#fff!important}
.pl-button-save:hover{background-color:${temp.color}D0!important;color:#fff!important}
.swal2-container{z-index:100000}
body.swal2-height-auto{height:inherit}
[class^="swal2-"],[class*="pl-btn"]{transition:all.2s}
/* 适配（改）百度网盘会员青春版 */
a.downloadSubtitle, button.downloadSubtitle{transition:all.2s;background-color:${temp.color}}
a.downloadSubtitle:hover, button.downloadSubtitle:hover{background-color:${temp.color}D0}
a.downloadSubtitle:disabled, button.downloadSubtitle:disabled{background-color:${temp.color}D0}
/* Webkit, Opera, IE9, Chrome*/
::selection, ::-webkit-selection, ::-moz-selection, ::-ms-selection{background-color:${temp.color}!important;background:${temp.color}!important;color:white!important}
`);
		},

		async showMainDialog(title, html, footer) {
			try {
				let $content = $(`<div style="display:none;">${html}</div>`).appendTo(document.body);
				let $buttons = $content.find(".listener-aria2-download");
				if ($buttons.length > 0) {
					$buttons.each((i, el) => $(el).click());
					await base.sendLinkToAria2.lock;
					await base.sleep(50);
					if ($content.find(".pl-btn-danger").length > 0) {
						message.error("推送失败，请检查 Aria2 配置");
					} else {
						message.success($buttons.length === 1 ? "已成功推送至下载器" : `已成功推送 ${$buttons.length} 个任务至下载器`);
					}
				} else {
					message.error("未获取到有效的下载链接");
				}
				$content.remove();
			} catch (e) {
				message.error("推送异常，请重试");
			} finally {
				temp.isProcessing = false;
				base._resetAllData();
			}
		},

		waitForKeyElements(selectorElem, actionFunction, bWaitOnce, iframeSelector, controlKey) {
			var manager = this.waitForKeyElements.manager || (
				this.waitForKeyElements.manager = {
					observers: new WeakMap(),
					tasks: new Map(),
					instanceCounter: 0
				}
			);
			var targetDoc = iframeSelector
				? $(iframeSelector).get(0)?.contentDocument
				: document;
			if (!targetDoc) return;
			controlKey = controlKey || `wkfe_${manager.instanceCounter++}`;
			var existingTask = manager.tasks.get(controlKey);
			if (existingTask) {
				existingTask.observer.disconnect();
				manager.tasks.delete(controlKey);
			}
			var processElements = () => {
				var elements = $(selectorElem, targetDoc);
				let foundActive = false;
				elements.each((i, el) => {
					var jEl = $(el);
					var isProcessed = jEl.data(controlKey);
					if (isProcessed) return true;
					var cancelAction = actionFunction(jEl);
					if (cancelAction) {
						foundActive = true;
					} else if (bWaitOnce) {
						jEl.data(controlKey, true);
					}
				});
				if (bWaitOnce && foundActive) {
					observer.disconnect();
					manager.tasks.delete(controlKey);
				}
			};
			var observer = new MutationObserver(processElements);
			observer.observe(targetDoc.documentElement, {
				childList: true,
				subtree: true,
				attributes: true,
				characterData: true
			});
			manager.tasks.set(controlKey, {
				observer,
				targetDoc
			});
			processElements();
		},

	};

	let $baidu = {
		async getToken() {
			try {
				$doc.find(".loading-popup .loading-title").html(`令牌获取中`);
				$doc.find(".loading-popup .swal2-html-container").html(`<div>正在获取授权状态~</div>`);
				let authorize = await base.getFinal(config.$baidu.api.getAccessToken, { Origin: "", Referer: "" }, true);
				let accessToken = "";
				if (authorize.includes("authorize")) {
					$doc.find(".loading-popup .loading-title").html(`授权获取中`);
					$doc.find(".loading-popup .swal2-html-container").html(`<div>正在获取授权页面~</div>`);
					let html = await base.get(config.$baidu.api.getAccessToken, { Origin: "", Referer: "" }, "text");
					let bdstoken = html.match(/name="bdstoken"\s+value="([^"]+)"/)?.[1];
					let client_id = html.match(/name="client_id"\s+value="([^"]+)"/)?.[1];
					let data = {
						grant_permissions_arr: "netdisk",
						bdstoken: bdstoken,
						client_id: client_id,
						response_type: "token",
						display: "page",
						grant_permissions: "basic,netdisk"
					};
					$doc.find(".loading-popup .swal2-html-container").html(`<div>正在自动确认授权~</div>`);
					await base.post(config.$baidu.api.getAccessToken, base.stringify(data), { Origin: "", Referer: "", "Content-Type": "application/x-www-form-urlencoded" });
					let res2 = await base.getFinal(config.$baidu.api.getAccessToken, { Origin: "", Referer: "" }, true);
					accessToken = res2.match(/access_token=([^&]+)/)?.[1];
				} else if (authorize.includes("access_token=")) {
					accessToken = authorize.match(/access_token=([^&]+)/)?.[1];
				}
				$doc.find(".loading-popup .loading-title").html(`令牌获取中`);
				if (!!accessToken) {
					$doc.find(".loading-popup .swal2-html-container").html(`<div>授权成功，令牌已缓存~</div>`);
					base.setValue("baidu_access_token", accessToken);
					return accessToken;
				} else return "";
			} catch (error) {
				return "";
			}
		},
		async getShareData() {
			let url = new URL(location.href);
			let locals = unsafeWindow?.locals?.dump?.();

			let surl = url.pathname.split('/').pop().replace(/^1(.{22})$/, '$1');
			let pwd = localStorage.getItem(`${surl}_pwd`) || url.searchParams.get('pwd');
			let baidu_id = document?.cookie?.split?.('BAIDUID=')?.[1]?.split?.(';')?.[0];
			let share_uk = locals?.share_uk?.value;
			let share_id = locals?.shareid?.value;
			let bds_token = locals?.bdstoken?.value;
			let js_token = unsafeWindow?.jsToken;
			let se_key = unsafeWindow?.currentSekey || unsafeWindow?.cache?.list?.config?.params?.sekey;

			return {
				share: {
					id: share_id,
					url: surl,
					pwd: pwd,
					uk: share_uk,
				},
				baidu: {
					id: baidu_id,
					token: bds_token
				},
				jsToken: js_token,
				sekey: se_key
			}
		},
		getDownloadHeaders(type) {
			let ua = config.$baidu.api.ua.downloadLink;
			if (type === "aria2") return [`User-Agent:${ua}`];
		},
		addPageListener() {
			$doc.on("click", ".pl-button-save", async function (e) {
				e.preventDefault();
				let selections = temp.main.getSelectedList();
				if (selections.length === 0) {
					return message.error("提示：<br/>请勾选要保存到网盘的文件哦~");
				}
				message.info("提示：<br/>因网盘限制，请保存到自己网盘后再去下载哦~");
				await base.sleep(500);
				document.querySelector(".tools-share-save-hb").click();
			});
		},
		greenerPage() {
			temp.page = temp.main.detectPage();
			base.waitForKeyElements(".wp-s-header-user__vip-center", function (tag) {
				tag.remove();
			}, true);
			base.waitForKeyElements(".wp-s-header-user__create-team-content", function (tag) {
				tag.remove();
			}, true);
			base.waitForKeyElements(".app-user-vip-center-box.vip-center-type-2", function (tag) {
				tag.remove();
			}, true);
			base.waitForKeyElements(".wp-s-header__vip-btn-tip", function (tag) {
				tag.fadeOut();
			}, true);
			base.waitForKeyElements(".app-user-vip-center-tip", function (tag) {
				tag.fadeOut();
			}, true);
			base.waitForKeyElements("#web-header-text-s-45", function (tag) {
				tag.fadeOut();
			}, true);
			base.waitForKeyElements(".wp-s-header__vip-btn", function (tag) {
				tag.text("会员中心")
			}, true);
			base.waitForKeyElements(".KQcHyA", function (tag) {
				tag.text("会员中心")
			}, true);
			base.waitForKeyElements(".gOIbzPb", function (tag) {
				tag.fadeOut();
			}, true);
			base.waitForKeyElements(".wp-s-header-user__create-team-title", function (tag) {
				tag.fadeOut();
			}, true);
			base.waitForKeyElements(".web-header-ad-item", function (tag) {
				tag.fadeOut();
			});
			base.waitForKeyElements(".wp-s-header__game-entry", function (tag) {
				tag.fadeOut();
			}, true)
			base.waitForKeyElements(".bd-aside-ad", function (tag) {
				tag.fadeOut();
			}, true)
			base.waitForKeyElements(".btn-img-tips", function (tag) {
				tag.fadeOut();
			}, true)
			base.waitForKeyElements(".nd-operate-guidance", function (tag) {
				tag.fadeOut();
			}, true)
			base.waitForKeyElements(".module-operation-content", function (tag) {
				tag.fadeOut();
				document.querySelector(".operate-guide-close").click();
				document.querySelector(".module-canvas").click();
			}, true)
			base.waitForKeyElements(`[class*="module-"][class*="-box"]:not(.module-box), [class*="module-"][class*="-mask"]`, function (tag) {
				tag.fadeOut();
				tag.find(".close-mask").click();
			}, true)
			base.waitForKeyElements(".newIcon", function (tag) {
				tag.fadeOut();
			}, true);
			base.waitForKeyElements(".u-badge__content.is-dot", function (tag) {
				tag.fadeOut();
			}, true);
			base.waitForKeyElements(".wp-side-options.g-clearfix", function (tag) {
				tag.fadeOut();
			}, true);
			base.waitForKeyElements(".wp-s-header-user__drop-channel", function (tag) {
				tag.fadeOut();
			}, true);
			base.waitForKeyElements(".app-download", function (tag) {
				tag.fadeOut();
			}, true);
			base.waitForKeyElements(`.g-button[title*="手机"]`, function (tag) {
				tag.fadeOut();
			}, true)
			base.waitForKeyElements(".yike-entrance", function (tag) {
				tag.remove();
			}, true)
			base.waitForKeyElements("div.dialog-gray:has(.dialog-close):has(.tip-body):has(~ .module-canvas)", function (tag) {
				tag.find(".dialog-close").click();
				$(".module-canvas").click();
			}, true)

			base.waitForKeyElements(".wp-s-header ~ div:not([class]):has(.nd-custom-btn)", function (tag) {
				if (!tag.text().includes("客户端")) return;
				tag.remove();
			}, true)
			base.waitForKeyElements(".pc-client-fullscreen-modal", function (tag) {
				tag.hide();
				tag.find(".pc-client-modal-close").click();
			}, true)
			base.waitForKeyElements(".nd-bottom-right-popover:has(.nd-custom-popover-close)", function (tag) {
				tag.hide();
				tag.find(".nd-custom-popover-close").click();
			}, true)
			base.waitForKeyElements(".wp-s-aside-nav__sub-bottom > a.wp-aside-nav__pc-client-button", function (tag) {
				tag.remove();
			}, true)

			base.waitForKeyElements("a.tools__item", function (tag) {
				if (tag.attr("linked")) return;
				if (tag.attr("href")) {
					try {
						let url = new URL(tag.closest("a").attr("href"));
						url.search = "";
						url.hash = url.hash.replace(/\?(.*?)(#|$)/, "$2")
						tag.attr("href", url.href)
					} catch (e) { }
				}
				tag.attr("linked", true)
			}, true);
			base.waitForKeyElements("p.wp-s-aside-nav__main-item-text", function (tag) {
				if (tag.attr("linked")) return;
				if (tag.closest("a").attr("href")) {
					try {
						let url = new URL(tag.closest("a").attr("href"));
						url.search = "";
						url.hash = url.hash.replace(/\?(.*?)(#|$)/, "$2")
						tag.closest("a").attr("href", url.href)
					} catch (e) { }
				}
				if (tag.is(`:contains("插件"), :contains("相册"), :contains("笔记")`) && tag.closest("a").attr("target") !== "_blank") {
					tag.closest("a").fadeOut();
				} else {
					tag.text(tag.text().replace("百度", ""));
				}
				tag.attr("linked", true)
			}, true);
			base.waitForKeyElements(`dd[node-type="header-link"]`, function (tag) {
				tag.children().each((index, element) => {
					let tag = $(element);
					if (!tag.attr("node-type")) return;
					let type = tag.attr("node-type");
					if (
						type !== "disk-home" &&
						type !== "mbox-homepage" &&
						type !== "find-apps"
					) {
						tag.fadeOut();
					}
				});
			}, true);
			base.waitForKeyElements(".__yunguanjia", function (tag) {
				tag.html(`<div class="yunguanjia-list __yunguanjia row g-clearfix _item sel">
					<span type="radio" class="radio-box _radioInput __yunguanjiaRadio">
						<span class="device-name">添加我的电脑</span>
					</span>
					<div class="__yunguanjiaTips radio-tips" style="display:block;">
						用电脑下载并登录最新百度网盘客户端，即自动完成添加。
						<a href="//pan.baidu.com/download" target="_blank">下载百度网盘客户端</a>
						<br/>由 <a href="https://github.com/hmjz100/LinkSwift/" target="_blank">LinkSwift</a> 修复该选项
					</div>
				</div>`);
			}, true)
			if (temp.page === "share") {
				base.waitForKeyElements(`iframe[src^="/buy/ad"]`, function (tag) {
					tag.fadeOut();
				}, true)
				base.addStyle(`${mount}-baiduShare`, "style", `
					body, .theme-white.init-new, #layoutApp{
						background-color:#DCEFFE!important;
						background:#DCEFFE url(https://nd-static.bdstatic.com/m-static/disk-share/widget/pageModule/init-new/image/init-bg_1708266.png) no-repeat center center;
					}
					#bd-main .bd-left{
						background:#ffffffC0;
						border-radius:10px;
					}
					iframe[src="/buy/ad/home"]{
						display:none!important;
					}
				`, `.${mount}`);
				base.waitForKeyElements(`.KPDwCE`, function (tag) {
					tag.css("background", "transparent");
				}, true);
				base.waitForKeyElements(".share-list .KPDwCE .AuPKyz", function (tag) {
					tag.css("background", "transparent");
				}, true);
				base.waitForKeyElements(`#layoutMain`, function (tag) {
					tag.css({ "border-radius": "24px" });
				}, true)
				base.waitForKeyElements(".frame-content", function (tag) {
					tag.css({ "margin": "auto" });
				}, true)
			}
		},
		addButton() {
			base.waitForKeyElements(config.$baidu.mount.home, (element) => {
				temp.page = temp.main.detectPage();
				if ($(".pl-button").length > 0 || !temp.page || temp.page !== "home") return;
				let $button = $(`<div class="g-dropdown-button pl-button">
					<div class="g-button g-button-blue color-button"><span class="g-button-right"><span class="text" style="width:60px;">下载助手</span></span></div>
				</div>`);
				element.prepend($button);
			})
			base.waitForKeyElements(config.$baidu.mount.main, (element) => {
				temp.page = temp.main.detectPage();
				if ($(".pl-button").length > 0 || !temp.page || temp.page !== "main") return;
				let $button = $(`<div class="wp-s-agile-tool-bar__h-group pl-button">
					<div class="wp-s-agile-tool-bar__h-action is-need-left-sep is-main color-button">
						<button type="button" class="u-button nd-file-list-toolbar-action-item u-button--primary u-button--small is-round pl-button color-button">
							<span>下载助手</span>
						</button>
					</div>
				</div>`);
				element.prepend($button);
			})
			base.waitForKeyElements(config.$baidu.mount.share, (element) => {
				temp.page = temp.main.detectPage();
				if ($(".pl-button").length > 0 || !temp.page || temp.page !== "share") return;
				let $button = $(`<a class="g-button tools-share-V20-btn save_btn pl-button color-button" style="padding:0;">
					<span class="g-button-right" style="padding-left:10px">
						<span class="text" style="width:auto;">下载助手</span>
					</span>
				</a>`)
				element.after($button);
			})
		},
		async getFilesUrl(items, accessToken) {
			if (base.isType(items) !== "array") return [];
			let size = 50;
			let processed = 0;
			let now = Date.now();
			let outdate = [];

			items.forEach(item => {
				let cacheIndex = temp.glinks.findIndex(c => c.id == item.fs_id);
				if (cacheIndex !== -1) {
					let cached = temp.glinks[cacheIndex];
					if (cached.expires > now) {
						Object.assign(item, cached.data);
						processed++;
						return;
					} else {
						temp.glinks.splice(cacheIndex, 1);
					}
				}
				outdate.push(item);
			});

			for (let i = 0; i < outdate.length; i += size) {
				let url = `${config.$baidu.api.getLink}&fsids=${encodeURIComponent(JSON.stringify(outdate.map(i => i.fs_id).slice(i, i + size)))}&access_token=${accessToken}`;
				let res = await base.get(url, { "User-Agent": config.$baidu.api.ua.downloadLink });

				if (res.list && res.list.length !== 0 && res.errno === 0) {
					outdate.slice(i, i + size).forEach(item => {
						let infos = res.list.find(i => i.fs_id == item.fs_id);
						if (infos) {
							Object.assign(item, infos);
							temp.glinks.push({ "id": item.fs_id, "expires": (Date.now() + 4 * 60 * 60 * 1000), "data": infos });
						};
					})
					processed += res.list.length;
					$doc.find(".loading-popup .swal2-html-container").html(`<div>已获取 ${processed} / ${items.length} 个链接~</div>`);

				} else {
					if (res.errno) {
						if (res.errno === 112) return message.error("提示：<br/>页面过期了，刷新重试下吧~<br/>代码：" + res.errno);
						if (res.errno === 9019) {
							base.delValue("baidu_access_token");
							return message.error("提示：<br/>访问令牌已过期，刷新网页后再获取一次吧~<br/>代码：" + res.errno);
						}

						items.slice(i, i + size).forEach(i => {
							i.dlink = `获取下载地址失败，${(res.errno || res.errmsg) ? "服务器说：" + (res.errno && res.errmsg ? res.errno + " - " + res.errmsg : (res.errmsg || res.errno)) + "。" : "刷新后再试试吧~"}`
						})
					}
					return message.error("提示：<br/>获取下载链接失败，刷新网页后再试试吧~");
				}
				await base.sleep(1000);
			}
			return items;
		},
		async getShareFileUrl(items, data) {
			if (base.isType(items) !== "array") return [];
			let processed = 0;
			let now = Date.now();

			for (const item of items) {
				let cacheIndex = temp.glinks.findIndex(c => c.id == item.fs_id);
				if (cacheIndex !== -1) {
					let cached = temp.glinks[cacheIndex];
					if (cached.expires > now) {
						Object.assign(item, cached.data);
						processed++;
						$doc.find(".loading-popup .swal2-html-container").html(`<div>已获取 ${processed} / ${items.length} 个链接~</div>`);
						continue;
					} else {
						temp.glinks.splice(cacheIndex, 1);
					}
				}

				let url = new URL(config.$baidu.api.getShareLink);
				url.searchParams.set("sign", data?.sign);
				url.searchParams.set("timestamp", data?.timestamp);
				url.searchParams.set("bdstoken", data.baidu.token);
				url.searchParams.set("logid", base.encodeBase(data.baidu.id));
				url.searchParams.set("jsToken", data.jsToken);
				let _data = new URLSearchParams({ "encrypt": 0, "product": "share", "uk": data.share.uk, "primaryid": data.share.id, "fid_list": JSON.stringify([item.fs_id]) });
				if (data.sekey) _data.set("extra", JSON.stringify({ "sekey": data.sekey }));

				let res = await base.post(url, _data, { "User-Agent": "netdisk;" });
				processed++
				$doc.find(".loading-popup .swal2-html-container").html(`<div>已获取 ${processed} / ${items.length} 个链接~</div>`);

				if (res.list && base.isType(res.list) === "array" && res.list.length !== 0 && res.errno === 0) {
					Object.assign(item, res.list[0]);
					temp.glinks.push({ "id": item.fs_id, "expires": (Date.now() + 4 * 60 * 60 * 1000), "data": res.list[0] });

				} else {
					if (res.errno === 0 && base.isType(res.list) === "string") {
						item.dlink = `<span>获取下载地址失败，服务器说：此文件过大，需要<b>保存到网盘</b>后于网盘中下载。</span>`
						temp.glinks.push({ "id": item.fs_id, "expires": (Date.now() + 4 * 60 * 60 * 1000), "data": item });
						continue;

					} else if (res.errno) {
						if (res.errno === 112) return message.error("提示：<br/>页面过期了，刷新重试下吧~<br/>代码：" + res.errno);
						if (res.errno === 9019) {
							return message.error("提示：<br/>访问令牌已过期，刷新网页后再获取一次吧~<br/>代码：" + res.errno);
						}
						item.dlink = `获取下载地址失败，${(res.errno || res.errmsg) ? "服务器说：" + (res.errno && res.errmsg ? res.errno + " - " + res.errmsg : (res.errmsg || res.errno)) + "。" : "刷新后再试试吧~"}`
						continue;
					}
					return message.error("提示：<br/>获取下载链接失败，刷新网页后再试试吧~");
				}
				await base.sleep(100);
			}
			return items;
		},
		async getFilesList(dirs, accessToken, processed = 0) {
			let cnt = 0;
			const fetch = async (targets) => {
				let files = [];
				for (let dir of targets) {
					$doc.find(".loading-popup .loading-title").html(`文件获取中`);
					let url = `${config.$baidu.api.getFiles}&dir=${encodeURIComponent(dir.path)}&access_token=${accessToken}`;
					let res = await base.get(url, { "User-Agent": config.$baidu.api.ua.downloadLink });
					cnt++;
					if (res?.list?.length && (res.errno === 0 || res.errmsg === "succ")) {
						let subFiles = res.list.filter(f => !f.isdir);
						processed += subFiles.length;
						$doc.find(".loading-popup .swal2-html-container").html(`<div>已获取 ${processed} 个文件~</div><div>${dir.path}</div>`);
						files = files.concat(subFiles);
						let subDirs = res.list.filter(f => f.isdir);
						if (subDirs.length > 0) {
							files = files.concat(await fetch(subDirs));
						}
					}
					if (cnt >= 50) {
						$doc.find(".loading-popup .swal2-html-container").html(`<div>已获取 ${processed} 个文件~</div><div>休息 3 秒...</div>`);
						await base.sleep(3000);
						cnt = 0;
					}
				}
				return files;
			};
			return await fetch(dirs);
		},
		async getLink() {
			let selectList = this.getSelectedList();
			if (selectList.length === 0) return message.error("提示：<br/>请勾选要下载的文件哦~");
			let accessToken = (base.getValue("baidu_access_token") || await temp.main.getToken());
			if (!accessToken) {
				message.info("提示：<br/>稍后请在新标签页中授权助手哦~");
				base.delValue("baidu_access_token");
				await base.sleep(3300);
				GM_openInTab(config.$baidu.api.getAccessToken, { active: true, insert: true, setParent: true });
				let attempts = 0;
				let interval = setInterval(() => {
					if (!!base.getValue("baidu_access_token")) {
						clearInterval(interval);
						accessToken = base.getValue("baidu_access_token");
					}
					attempts++;
					if (attempts > 120) {
						clearInterval(interval);
						return message.error("提示：<br/>时间太长，我先撤下啦~");
					}
				}, 1000);
				return;
			}
			if (temp.page === "home" || temp.page === "main") {
				let files = selectList.filter(f => !f.isdir);
				let dirs = selectList.filter(f => f.isdir);
				if (dirs.length > 0) files = files.concat(await this.getFilesList(dirs, accessToken, files.length));
				if (!files.length) return message.error("提示：<br/>文件夹是空的哦~");
				$doc.find(".loading-popup .loading-title").html(`链接获取中`);
				$doc.find(".loading-popup .swal2-html-container").html(`<div>正在获取文件对应的下载链接~</div>`);
				files = await this.getFilesUrl(files, accessToken);
				if (base.isType(files) === "array" && files.length) {
					temp.links = [files, {
						isFolder: v => v.isdir === 1,
						getFileName: v => (v.server_filename || v.filename),
						getFileSize: v => v.size,
						getFileLink: v => {
							if (!v.dlink || !v.dlink.startsWith("http")) return v.dlink;
							let url = new URL(v.dlink);
							url.searchParams.set("access_token", accessToken);
							return url.href;
						},
						convert: {
							aria2: `--header "User-Agent:${config.$baidu.api.ua.downloadLink}"`
						}
					}];
					base.showMainDialog(config.base.dom.button[temp.mode].title, base.generateDom(temp.links), config.base.dom.button[temp.mode].footer);
				} else {
					return message.error("提示：<br/>获取下载链接失败，刷新网页后再试试吧~");
				}
			} else if (temp.page === "share") {
				let files = selectList.filter(f => !f.isdir);
				let data = await this.getShareData();
				let sign = await base.get(`${config.$baidu.api.getShareSign}&surl=1${data.share.url}$bdstoken=${data.baidu.token}&logid=${base.encodeBase(data.baidu.id)}`);
				if (sign?.data?.sign && sign?.data?.timestamp) {
					data.sign = sign.data.sign;
					data.timestamp = sign.data.timestamp;
				}
				files = await this.getShareFileUrl(files, data, accessToken);
				if (base.isType(files) === "array" && files.length) {
					temp.links = [files, {
						isFolder: v => v.isdir === 1,
						getFileName: v => (v.server_filename || v.filename),
						getFileSize: v => v.size,
						getFileLink: v => {
							if (!v.dlink || !v.dlink.startsWith("http")) return v.dlink;
							let url = new URL(v.dlink);
							url.searchParams.set("access_token", accessToken);
							return url.href;
						},
						convert: {
							aria2: `--header "User-Agent:${config.$baidu.api.ua.downloadLink}"`
						}
					}];
					base.showMainDialog(config.base.dom.button[temp.mode].title, base.generateDom(temp.links), config.base.dom.button[temp.mode].footer);
				} else {
					return message.error("提示：<br/>获取下载链接失败，刷新网页后再试试吧~");
				}
			} else {
				return message.error("提示：<br/>页面错误~");
			}
		},
		getSelectedList() {
			try {
				let list = [];
				let fileList = unsafeWindow.document.querySelector(".file-list");
				if (fileList?.__vue__?.allFileList?.[0]) list = fileList.__vue__.allFileList.filter(function (item) { return !!item.selected; });
				let wpCore = unsafeWindow.document.querySelector(".wp-s-core-pan");
				if (wpCore?.__vue__?.selectedList?.[0]) list = wpCore.__vue__.selectedList;
				let context = unsafeWindow.require?.("system-core:context/context.js");
				if (context?.instanceForSystem?.list?.getSelected?.()?.[0]) list = context.instanceForSystem.list.getSelected();
				return base.clone(list);
			} catch (e) {
				console.error(e);
				return [];
			}
		},
		detectPage() {
			let path = location.pathname;
			if (/^\/disk\/home/.test(path)) return "home";
			if (/^\/disk\/main/.test(path)) return "main";
			if (/^\/youth\/pan\/main/.test(path)) return "youth";
			if (/^\/(s|share)\//.test(path)) return "share";
			return "";
		},
		async initPanLinker() {
			this.addButton();
			this.addPageListener();
		},
	};

	let $baiduAuthorize = {
		async initPanLinker() {
			Swal.fire({
				...temp.swalDefault,
				showConfirmButton: false,
				allowOutsideClick: false,
				allowEscapeKey: false,
				allowEnterKey: false,
				html: `请稍后`,
				willOpen: () => {
					Swal.showLoading();
				},
			});
			let url = new URL(location);
			let auth = new URL(config.$baidu.api.getAccessToken);
			let allowedClientIds = [
				auth.searchParams.get("client_id"),
				"L6g70tBRRIXLsY0Z3HwKqlRE",
				"NqOMXF6XGhGRIGemsQ9nG0Na",
				"fSds3K4w43rw37tOqlQmTa2kDwaczK4U",
				"TFwtw8uwHxpdkvVqVKdIlx1XqXUnr1zG",
				"9dgBV9yesuBVOXaxls7aVHbLBLqU8yyg",
				"l9DdBOG4RYroMscmzK5OChdaGelgd92M",
				"Kyr013gHQBf2immy3fQt1jZ3nZVpiGAm",
				"iYCeC9g08h5vuP9UqvPHKKSVrKFXGa1v",
				"omiOnr2tYnN9vSyDErcVFWpPU2mZA7YO",
				"QHOuRXiepJBMjtk0esLhrPoNlQyYd0mF",
				"IlLqBbU3GjQ0t46TRwFateTprHWl39zF",
				"iG6ghsi9r0RR0jTFCrlvTjX9",
				"YgMAXXnP0Lziw0LPVbc6E4zm",
			];
			if (
				/openapi.baidu.com\/oauth\/2.0\/authorize/.test(location.href) &&
				url.searchParams.get("response_type").includes("token") &&
				url.searchParams.get("scope").includes("netdisk") &&
				allowedClientIds.includes(url.searchParams.get("client_id"))
			) {
				var dialog = await Swal.fire({
					...temp.swalDefault,
					icon: "info",
					title: `提示`,
					html: `<p>(◍•ᴗ•◍) 你好呀，为了获取百度网盘文件的下载直链<br/>“下载助手” 需要你的授权，以获取网盘文件的访问令牌</p><br/>
					<p>由于在百度 OAuth 页面使用了其他应用的 Client ID<br/>所以显示的应用名称可能会有所不同，敬请理解</p><br/>
					<p>获取到的令牌仅用于调用百度网盘 API 生成直链<br/>不会用于其他用途，请放心授权</p>`,
					showConfirmButton: true,
					showDenyButton: true,
					allowOutsideClick: false,
					allowEscapeKey: false,
					allowEnterKey: false,
					confirmButtonText: `授权`,
					denyButtonText: `再想想`,
					position: "center"
				});
				if (dialog.isConfirmed) {
					base.waitForKeyElements("button#auth-allow", function (element) {
						element[0].click();
					}, true);
					return;
				}
				if (dialog.isDenied) {
					return await Swal.fire({
						...temp.swalDefault,
						icon: "question",
						title: `好吧(*￣3￣)╭`,
						html: "那就再想一想<br/>想好了就按下 “授权” 按钮吧~",
						timer: 180000,
						toast: true,
						timerProgressBar: true,
						showConfirmButton: false,
						showDenyButton: false,
						position: "bottom-end",
					});
				}
			} else if (/openapi.baidu.com\/oauth\/2.0\/login_success/.test(location.href)) {
				let int = setInterval(async () => {
					if (location.href.includes("access_token") && (location.href.includes("basic+netdisk") || location.href.includes("basic,netdisk"))) {
						clearInterval(int);
						let token = location.href.match(/access_token=(.*?)&/)[1];
						base.setValue("baidu_access_token", token);
						await Swal.fire({
							...temp.swalDefault,
							icon: "success",
							title: `成功啦`,
							html: `<p>(◍•ᴗ•◍) 您已<b>成功授权/授权过</b>脚本获取网盘访问令牌~</p><p>获取到的令牌<b>仅用于调用百度网盘 API 生成直链</b><br/>不会用于其他用途</p><p>等待 <span id="second">/</span> 秒之后将关闭此页面</p>`,
							timer: 5000,
							timerProgressBar: true,
							showConfirmButton: true,
							showDenyButton: false,
							allowOutsideClick: false,
							allowEscapeKey: false,
							allowEnterKey: false,
							confirmButtonText: `关闭`,
							willOpen: () => {
								let secondSpan = document.getElementById("second");
								let interval = setInterval(() => {
									if (Swal.isVisible()) {
										let timeLeft = Swal.getTimerLeft();
										if (timeLeft !== null && timeLeft > 0) {
											secondSpan.textContent = (timeLeft / 1000).toFixed(2);
										}
									} else {
										clearInterval(interval);
									}
								}, 10);
							},
							didOpen: function (toast) {
								toast.addEventListener("mouseenter", () => {
									Swal.stopTimer();
								});
								toast.addEventListener("mouseleave", () => {
									Swal.resumeTimer();
								});
							},
							willClose: () => window.close()
						});
						return window.close();
					} else {
						clearInterval(int);
						Swal.close();
					}
				}, 1);
			} else {
				Swal.close();
			}
		}
	};

	let $tcloud = {
		greenerPage() {
			base.waitForKeyElements(".advertising-mask", function (tag) {
				tag.fadeOut();
			}, true);
			base.waitForKeyElements("a.client-download.nav-block", function (tag) {
				tag.fadeOut();
			}, true);
		},
		addButton() {
			let $button = $(`<div class="pl-button tcloud-button">下载助手</div>`);
			base.waitForKeyElements(config.$tcloud.mount.home, (element) => {
				temp.page = temp.main.detectPage();
				if ($(".pl-button").length > 0 || !temp.page || temp.page !== "home") return;
				element.prepend($button);
			})
			base.waitForKeyElements(config.$tcloud.mount.share, (element) => {
				temp.page = temp.main.detectPage();
				if ($(".pl-button").length > 0 || !temp.page || temp.page !== "share") return;
				$button.css({ "height": "28px", "border-radius": "15px" })
				element.prepend($button);
			})
		},
		async getToken() {
			$doc.find(".loading-popup .loading-title").html(`令牌获取中`);
			$doc.find(".loading-popup .swal2-html-container").html(`<div>正在获取状态~</div>`);
			let res = await base.getFinal(config.$tcloud.api.getAccessToken, undefined, true);
			let accessToken = res.match(/accessToken=(\w+)/)?.[1];
			accessToken && base.setStorage("accessToken", accessToken);
			$doc.find(".loading-popup .loading-title").html(`令牌获取中`);
			$doc.find(".loading-popup .swal2-html-container").html(`<div>获取成功，令牌已缓存~</div>`);
			return accessToken;
		},
		async getFileUrl(item, index, token) {
			try {
				if (item.downloadUrl) {
					return {
						index,
						downloadUrl: item.downloadUrl
					}
				};
				let time = Date.now();
				let url = `${config.$tcloud.api.getLink}?fileId=${item.fileId}`;
				let _sign = `AccessToken=${token}&Timestamp=${time}`;
				if (item.shareId) {
					url += `&dt=1&shareId=${item.shareId}`;
					_sign += `&dt=1`;
				}
				_sign += `&fileId=${item.fileId}`;
				if (item.shareId) {
					_sign += `&shareId=${item.shareId}`;
				}
				let res = await base.get(url, { "Accept": "application/json;charset=UTF-8", "Sign-Type": 1, "Accesstoken": token, "Timestamp": time, "Signature": md5(_sign).toString() });
				if (res.res_code == 0) {
					return {
						index,
						downloadUrl: res.fileDownloadUrl
					};
				} else if (res.errorcode == "InvalidSessionKey") {
					return {
						index,
						downloadUrl: "提示：<br/>请先登录网盘~"
					};
				} else if (res.res_code == "ShareNotFoundFlatDir") {
					return {
						index,
						downloadUrl: "提示：<br/>请[转存]文件，之后再👉前往[我的网盘]中下载哦~"
					};
				} else {
					return {
						index,
						downloadUrl: "获取下载地址失败，刷新后再试试吧~" + (res.res_code ? res.res_code : "")
					};
				}
			} catch (e) {
				return {
					index,
					downloadUrl: "获取下载地址失败，刷新后再试试吧~"
				};
			}
		},
		async getLink() {
			let selectList = this.getSelectedList();
			if (selectList.length === 0) return message.error("提示：<br/>请勾选要下载的文件哦~");
			if (selectList.every(item => item.isFolder)) return message.error("提示：<br/>请打开文件夹后再勾选文件~");
			selectList = selectList.filter(item => !item.isFolder)
			$doc.find(".loading-popup .loading-title").html(`令牌获取中`);
			$doc.find(".loading-popup .swal2-html-container").html(`<div>正在获取状态~</div>`);
			let token = base.getStorage("accessToken") || await this.getToken();
			if (!token) {
				return message.error("提示：<br/>请先登录网盘~");
			}
			$doc.find(".loading-popup .loading-title").html(`令牌获取中`);
			$doc.find(".loading-popup .swal2-html-container").html(`<div>获取缓存成功~</div>`);
			let batchSize = 15;
			let processed = 0;
			$doc.find(".loading-popup .loading-title").html(`链接获取中`);
			$doc.find(".loading-popup .swal2-html-container").html(`<div>正在获取文件对应的下载链接~</div>`);
			for (let i = 0; i < selectList.length; i += batchSize) {
				let batch = selectList.slice(i, i + batchSize);
				let queue = [];
				batch.forEach((item, localIndex) => {
					let globalIndex = i + localIndex;
					queue.push(this.getFileUrl(item, globalIndex, token)
						.then(val => {
							processed++;
							$doc.find(".loading-popup .swal2-html-container").html(`<div>已获取 ${processed} / ${selectList.length} 个链接~</div>`);
							return val;
						}));
				});
				let res = await Promise.all(queue);
				res.forEach(val => {
					selectList[val.index].downloadUrl = val.downloadUrl;
				});
				await base.sleep(1000);
			}
			temp.links = [selectList, {
				isFolder: v => v.isFolder,
				getFileName: v => v.fileName,
				getFileSize: v => v.size,
				getFileLink: v => v.downloadUrl
			}];
			base.showMainDialog(config.base.dom.button[temp.mode].title, base.generateDom(temp.links), config.base.dom.button[temp.mode].footer);
		},
		getSelectedList() {
			try {
				return document.querySelector(".c-file-list").__vue__.selectedList;
			} catch (e) {
				return [document.querySelector(".info-detail").__vue__.fileDetail];
			}
		},
		detectPage() {
			let path = location.pathname;
			if (/^\/web\/main/.test(path)) return "home";
			if (/^\/web\/share/.test(path)) return "share";
			return "";
		},
		async initPanLinker() {
			this.addButton();
			this.addPageListener();
			this.getToken();
		},
	};

	let $xunlei = {
		addPageListener() {
			$doc.on("click", ".pl-button-save", async function (e) {
				e.preventDefault();
				let selections = temp.main.getSelectedList();
				if (selections.length === 0) {
					return message.error("提示：<br/>请勾选要保存到网盘的文件哦~");
				}
				message.info("提示：<br/>因网盘限制，请保存到自己网盘后再去下载哦~");
				await base.sleep(500);
				document.querySelector(".save-to-pan").click();
			});
		},
		addButton() {
			base.waitForKeyElements(config.$xunlei.mount.home, (element) => {
				temp.page = temp.main.detectPage();
				if ($(".pl-button").length > 0 || !temp.page || temp.page !== "home") return;
				let $button = $(`<div class="xunlei-button pl-button"><span style="font-size:13px;">下载助手</span></div>`);
				element.prepend($button);
			})
		},
		getToken() {
			$doc.find(".loading-popup .loading-title").html(`令牌获取中`);
			$doc.find(".loading-popup .swal2-html-container").html(`<div>正在获取状态~</div>`);
			let credentials = {}, captcha = {};
			for (let i = 0; i < localStorage.length; i++) {
				if (/^credentials_/.test(localStorage.key(i))) {
					credentials = base.getStorage(localStorage.key(i));
					base.setStorage("");
				}
				if (/^captcha_[\w]{16}/.test(localStorage.key(i))) {
					captcha = base.getStorage(localStorage.key(i));
				}
			}
			let deviceid = /(\w{32})/.exec(base.getStorage("deviceid").split(","))[0];
			let token = {
				credentials,
				captcha,
				deviceid
			};
			return token;
		},
		async getFileUrl(item, index, token) {
			try {
				if (item.downloadUrl) return {
					index,
					downloadUrl: item.downloadUrl
				};
				let res = await base.get(config.$xunlei.api.getLink + item.id, { "Authorization": `${token.credentials.token_type} ${token.credentials.access_token}`, "Content-Type": "application/json", "X-Captcha-Token": token.captcha.token, "X-Device-Id": token.deviceid });
				if (res.web_content_link) {
					return {
						index,
						downloadUrl: res.web_content_link
					};
				} else if (res?.error_code == 9) {
					return {
						index,
						downloadUrl: "获取下载地址失败，服务器说：页面验证过期了，刷新后再获取吧~"
					};
				} else {
					return {
						index,
						downloadUrl: `获取下载地址失败，${res?.error_description ? "服务器说：" + res.error_description + "。" : "刷新后再试试吧~"}`
					};
				}
			} catch (e) {
				return message.error("提示：<br/>请先登录网盘后再刷新页面呢~");
			}
		},
		async getLink() {
			let selectList = this.getSelectedList();
			if (selectList.length === 0) return message.error("提示：<br/>请勾选要下载的文件哦~");
			if (selectList.every(item => item.kind !== "drive#file")) return message.error("提示：<br/>请打开文件夹后再勾选文件~");
			if (temp.page === "home") {
				let token = this.getToken();
				let batchSize = 15;
				let processed = 0;
				$doc.find(".loading-popup .loading-title").html(`链接获取中`);
				$doc.find(".loading-popup .swal2-html-container").html(`<div>正在获取文件对应的下载链接~</div>`);
				for (let i = 0; i < selectList.length; i += batchSize) {
					let batch = selectList.slice(i, i + batchSize);
					let queue = [];
					batch.forEach((item, localIndex) => {
						let globalIndex = i + localIndex;
						queue.push(this.getFileUrl(item, globalIndex, token)
							.then(val => {
								processed++;
								$doc.find(".loading-popup .swal2-html-container").html(`<div>已获取 ${processed} / ${selectList.length} 个链接~</div>`);
								return val;
							}));
					});
					let res = await Promise.all(queue);
					res.forEach(val => {
						selectList[val.index].downloadUrl = val.downloadUrl;
					});
					await base.sleep(1000);
				}
			} else {
				return message.error("提示：<br/>页面错误~");
			}
			temp.links = [selectList, {
				isFolder: v => v.kind === "drive#folder",
				getFileName: v => v.name,
				getFileSize: v => v.size,
				getFileLink: v => v.downloadUrl
			}];
			base.showMainDialog(config.base.dom.button[temp.mode].title, base.generateDom(temp.links), config.base.dom.button[temp.mode].footer);
		},
		getSelectedList() {
			try {
				let doms = document.querySelectorAll(`[class*="SourceListItem__item--"]`), list = [];
				if (doms.length) for (let dom of doms) {
					let domVue = dom.__vue__;
					if (domVue?.selected?.includes?.(domVue.info.id)) list.push(domVue.info);
				}
				return base.clone(list);
			} catch (e) {
				return [];
			}
		},
		detectPage() {
			let path = location.pathname;
			if (/^\/$/.test(path)) return "home";
			if (/^\/(s|share)\//.test(path)) return "share";
			return "";
		},
		async initPanLinker() {
			this.addButton();
			this.addPageListener();
		},
	};

	let $quark = {
		getDownloadHeaders(type) {
			let ua = config.$quark.api.ua.downloadLink, ref = `https://${location.host}/`, cookie = document.cookie;
			if (type === "aria2") return [`User-Agent:${ua}`, `Referer:${ref}`, `Cookie:${cookie}`];
		},
		addPageListener() {
			$doc.on("click", ".pl-button-save", async function (e) {
				e.preventDefault();
				let selections = temp.main.getSelectedList();
				if (selections.length === 0) {
					return message.error("提示：<br/>请勾选要保存到网盘的文件哦~");
				}
				message.info("提示：<br/>因网盘限制，请保存到自己网盘后再去下载哦~");
				await base.sleep(500);
				document.querySelector(".ant-btn-primary.save-btn").click();
			});
		},
		greenerPage() {
			base.waitForKeyElements(`[class*="Activity--video-toolbar-activity"]`, function (tag) {
				tag.fadeOut();
			}, true);
			base.waitForKeyElements(`span[class*="SectionHeaderController--icon-download"]`, function (tag) {
				tag.fadeOut();
			}, true);
			base.waitForKeyElements(`div[class*="SectionHeaderController--download-popover"]`, function (tag) {
				tag.find(".ant-popover-arrow").css({ "left": "75%" });
			}, true);
			base.waitForKeyElements(`div[class*="DetailLayout--client-download"]`, function (tag) {
				tag.fadeOut();
			}, true);
			base.waitForKeyElements(".next-box.share-right-side-content", function (tag) {
				tag.fadeOut();
			}, true);
			base.waitForKeyElements(`[class*="DetailLayout--container"] .feature-screen`, function (tag) {
				tag.fadeOut();
			}, true);
			base.waitForKeyElements(".ant-modal-content .ant-modal-body .right-wrap", function (tag) {
				if (tag.find(".hint").text().includes("客户端")) tag.fadeOut();
			}, true);
			base.waitForKeyElements(".pc-member-entrance span.button-text", function (tag) {
				tag.text("会员中心");
				let observer = new MutationObserver(function (mutations) {
					mutations.forEach(function (mutation) {
						if (tag.text() === "会员中心") return
						tag.text("会员中心");
					});
				});
				let config = { subtree: true, characterData: true, childList: true };
				observer.observe(tag[0], config);
			}, true);
			base.waitForKeyElements(".pc-member-entrance .tips", function (tag) {
				tag.fadeOut();
			}, true);
			base.waitForKeyElements(".modal .modal-content .halo-animated-background .halo-content .pay-modal .close", function (tag) {
				tag[0].click();
			}, true);
			base.waitForKeyElements(".modal .modal-content .halo-animated-background .halo-content .red-envelope .close", function (tag) {
				tag[0].click();
			}, true);
		},
		addButton() {
			base.waitForKeyElements(config.$quark.mount.home, (element) => {
				temp.page = temp.main.detectPage();
				if ($(".pl-button").length > 0 || !temp.page || temp.page !== "home") return;
				let $button = $(`<div class="ant-dropdown-trigger pl-button" style="display: inline-block;">
					<div class="ant-upload ant-upload-select ant-upload-select-text">
						<button type="button" class="ant-btn ant-btn-primary quark-button">
							<span>下载助手</span>
						</button>
					</div>
				</div>`);
				$button.css({ "margin-right": "16px" });
				element.prepend($button);
			})
			base.waitForKeyElements(config.$quark.mount.share, (element) => {
				temp.page = temp.main.detectPage();
				if ($(".pl-button").length > 0 || !temp.page || temp.page !== "share") return;
				let $button = $(`<button type="button" class="ant-btn btn-file ant-btn-primary pl-button quark-button">
					<span>下载助手</span>
				</button>`);
				$button.css({ "height": "36px", "margin-left": "16px", "border-radius": "6px", "display": "inline-block" });
				element.append($button);
			})
		},
		async getLink() {
			let selectList = this.getSelectedList();
			if (selectList.length === 0) return message.error("提示：<br/>请勾选要下载的文件哦~");
			if (selectList.every(item => !item.file)) return message.error("提示：<br/>请打开文件夹后再勾选文件~");
			if (temp.page === "home") {
				let data = [];
				let batchSize = 15;
				let processed = 0;
				selectList = selectList.filter(item => item.file === true)
				for (let i = 0; i < selectList.length; i += batchSize) {
					let batch = selectList.slice(i, i + batchSize);
					let fids = batch.map(item => item.fid);
					let res = await base.post(config.$quark.api.getLink, { "fids": fids }, { "Content-Type": "application/json", "User-Agent": config.$quark.api.ua.downloadLink });
					if (res?.code == 31001) {
						return message.error("提示：<br/>请先登录网盘~<br/>代码：" + res.code);
					} else if (res?.code == 23018) {
						let fid = res?.message?.match(/\[([a-f0-9]{32})\]/)?.[1];
						let item = batch.find(item => item.fid === fid);
						return message.error(`提示：<br/>超出游客可获取大小限制<br/>请登录后获取哦~${item?.file_name ? `<br/>文件：${item.file_name}` : ""}`);
					}
					if (res?.code !== 0) {
						return message.error("提示：<br/>获取链接失败了~<br/>代码：" + res.code);
					}
					if (res?.data) {
						data.push(...res.data);
					}
					processed += batch.length;
					$doc.find(".loading-popup .loading-title").html(`链接获取中`);
					$doc.find(".loading-popup .swal2-html-container").html(`<div>已获取 ${processed} / ${selectList.length} 个链接~</div>`);
					await base.sleep(1000);
				}
				temp.links = [data, {
					isFolder: v => v.file === false,
					getFileName: v => v.file_name,
					getFileSize: v => v.size,
					getFileLink: v => v.download_url,
					convert: {
						aria2: `--header "User-Agent:${config.$quark.api.ua.downloadLink}" --header "Referer:https://${location.host}/" --header "Cookie:${document.cookie}"`
					}
				}];
				base.showMainDialog(config.base.dom.button[temp.mode].title, base.generateDom(temp.links), config.base.dom.button[temp.mode].footer);
			} else if (temp.page === "share") {
				let pwd_id = unsafeWindow.factStat?.ut?.baseParams?.pwd_id ||
					unsafeWindow.factStat?.wa?.customStatParams?.pwd_id ||
					location.pathname.match(/^\/(?:s|share)\/([a-zA-Z0-9]+)/)?.[1];
				if (!pwd_id) return message.error("错误：<br/>无法提取分享 ID~");

				let data = [];
				let batchSize = 15;
				let processed = 0;
				selectList = selectList.filter(item => item.file === true)
				for (let i = 0; i < selectList.length; i += batchSize) {
					let batch = selectList.slice(i, i + batchSize);
					let fids = batch.map(item => item.fid);
					let fids_token = batch.map(item => item.share_fid_token);
					let res = await base.post(config.$quark.api.getLink, { "fids": fids, "fids_token": fids_token, pwd_id, "stoken": batch[0].stoken }, { "Content-Type": "application/json", "User-Agent": config.$quark.api.ua.downloadLink });
					if (res?.code == 31001) {
						return message.error("提示：<br/>请先登录网盘~<br/>代码：" + res.code);
					} else if (res?.code == 23018) {
						let fid = res?.message?.match(/\[([a-f0-9]{32})\]/)?.[1];
						let item = batch.find(item => item.fid === fid);
						return message.error(`提示：<br/>超出游客可获取大小限制<br/>请登录后获取哦~${item?.file_name ? `<br/>文件：${item.file_name}` : ""}`);
					}
					if (res?.code !== 0) return message.error("提示：<br/>获取链接失败了~<br/>代码：" + res.code);
					if (res?.data) {
						data.push(...res.data);
					}
					processed += batch.length;
					$doc.find(".loading-popup .loading-title").html(`链接获取中`);
					$doc.find(".loading-popup .swal2-html-container").html(`<div>已获取 ${processed} / ${selectList.length} 个链接~</div>`);
					await base.sleep(1000);
				}
				temp.links = [data, {
					isFolder: v => v.file === false,
					getFileName: v => v.file_name,
					getFileSize: v => v.size,
					getFileLink: v => v.download_url,
					convert: {
						aria2: `--header "User-Agent:${config.$quark.api.ua.downloadLink}" --header "Referer:https://${location.host}/" --header "Cookie:${document.cookie}"`
					}
				}];
				base.showMainDialog(config.base.dom.button[temp.mode].title, base.generateDom(temp.links), config.base.dom.button[temp.mode].footer);
			} else {
				return message.error("提示：<br/>页面错误~");
			}
		},
		getSelectedList() {
			try {
				let selectedList = [];
				let reactDom = document.getElementsByClassName("file-list")[0];
				let reactObj = base.findReact(reactDom);
				let props = reactObj.props;
				if (props) {
					let stoken = props.stoken || "";
					let fileList = props.list || [];
					let selectedKeys = props.selectedRowKeys || [];
					fileList.forEach(function (val) {
						if (selectedKeys.includes(val.fid)) {
							selectedList.push({ ...val, stoken });
						}
					});
				}
				return selectedList;
			} catch (e) {
				return [];
			}
		},
		detectPage() {
			let path = location.pathname;
			if (/^\/(list)/.test(path)) return "home";
			if (/^\/(s|share)\//.test(path)) return "share";
			return "";
		},
		async initPanLinker() {
			this.addButton();
			this.addPageListener();
		},
	};

	let $123pan = {
				greenerPage() {
			base.waitForKeyElements(".cent > .cent-not-login > .ant-btn", (tag) => {
				if (tag.hasClass("reg") || tag.hasClass("log")) return;
				tag.addClass("reg");
				tag.removeClass("loginRight");
				tag.find("span").text("注册");
				if (tag.next().hasClass("log")) return;
				let button = $(`<button type="button" class="ant-btn ant-btn-default ant-btn-two-chinese-chars log loginRight" style="width:auto!important;height:auto!important;margin-left:10px!important"><span>登录</span></button>`);
				button.on("click", () => {
					let login = new URL(`https://login.123pan.com/centerlogin`);
					login.searchParams.set("redirect_url", location.href);
					location.href = login;
				});
				tag.after(button);
			});
			base.waitForKeyElements(`.rightInfo .register:not(.pl-button, .pl-button-init),
				.homeClass > div > .ant-dropdown-trigger:not(.pl-button, .pl-button-init),
				.homeClass > div > .sysbut`, function (tag) {
				let hasTextNode = false;
				tag.contents().each(function () {
					if (this.nodeType === 3 && $.trim(this.textContent)) {
						hasTextNode = true;
						return;
					}
				});
				if (!hasTextNode) return;
				tag.css({ "width": "38px" });
				tag.contents().each(function () {
					if (this.nodeType === 3) {
						$(this).remove();
					}
				});
				tag.find("svg").css({ "margin-right": "0" });
			});
			base.waitForKeyElements(".share-header_center > .share-header_center-not-login > .ant-btn", (tag) => {
				if (tag.hasClass("reg") || tag.hasClass("log")) return;
				tag.removeClass("ant-btn-variant-solid").addClass("ant-btn-variant-outlined");
				tag.addClass("ant-btn-two-chinese-chars").addClass("reg");
				tag.find("span").text("注册");
				if (tag.next().hasClass("log")) return;
				let button = $(`<button type="button" class="ant-btn ${[...document.querySelector(`[class*="ant-btn css-"]`).classList].find(c => /^css-[a-z0-9]+$/.test(c))} ant-btn-primary ant-btn-color-primary ant-btn-variant-solid loginRight mfy-button ant-btn-two-chinese-chars log" style="margin-left:10px!important"><span>登录</span></button>`);
				button.on("click", () => {
					let login = new URL(`https://login.123pan.com/centerlogin`);
					login.searchParams.set("redirect_url", location.href);
					location.href = login;
				});
				tag.after(button);
				try {
					let container = tag.closest(".share-header_center-not-login");
					if (container.length && !container.data("logObserverAttached")) {
						container.data("logObserverAttached", true);
						let observer = new MutationObserver((mutations) => {
							for (let m of mutations) {
								if (!m.removedNodes) continue;
								for (let n of m.removedNodes) {
									if (!(n instanceof HTMLElement)) continue;
									if (n.classList && (n.classList.contains("reg") || n.querySelector && n.querySelector(".reg"))) {
										try { container.find(".log").remove(); } catch (e) { }
									}
								}
							}
						});
						observer.observe(container[0], { childList: true, subtree: true });
						container.data("logObserver", observer);
					}
				} catch (e) { }
			});
			base.waitForKeyElements(".login-footer-240828", (tag) => {
				if (tag.find(".replaced").length) return;
				tag.children().each(function () {
					let $child = $(this);
					if ($child.hasClass("pointer-text")) {
						let button = $(`<button type="button" class="ant-btn ${[...document.querySelector(`[class*="ant-btn css-"]`).classList].find(c => /^css-[a-z0-9]+$/.test(c))} ant-btn-primary ant-btn-color-primary ant-btn-variant-solid loginRight mfy-button replaced"><span>${$child.text()}</span></button>`);
						button.on("click", () => {
							if ($child.text().includes("登录")) {
								let login = new URL(`https://login.123pan.com/centerlogin`);
								login.searchParams.set("redirect_url", location.href);
								location.href = login;
							} else {
								return $child.click();
							}
						});
						$child.after(button);
						$child.hide();
					}
				});
			}, true);
			base.waitForKeyElements(".new-menu-item-image, .special-menu-item-container-migration--label, .sider-member-btn, .video-new-user-tips", (tag) => {
				if (tag.is(":hidden")) return;
				tag.hide();
			}, true);
			base.waitForKeyElements(`.frontend-layout-header-right > span > [alt^="buttonMall"]`, (tag) => {
				if (tag.parent().is(":hidden")) return;
				tag.parent().hide();
				let button = $(`<div class="frontend-layout-header-right-button-invite-new">会员中心</div>`);
				button.on("click", () => { tag.click() });
				tag.parent().after(button);
			}, true);
			base.waitForKeyElements(".rightInfo .qrcode_btn", function (tag) {
				tag.hide();
			}, true);
			base.waitForKeyElements(`#iqiyi-ad-overlay`, function (tag) {
				tag.remove();
				base.setStorage("iqiyi_ad_closed", {
					date: '2099-12-31T23:59:59.999Z',
					timestamp: Date.now()
				});
			}, true);
			setInterval(() => {
				let url = new URL(location);
				if (!url.searchParams.has("notoken") && !url.searchParams.has("token")) {
					url.searchParams.delete("token");
					url.searchParams.set("notoken", "1");
					history.replaceState({}, "", url);
				}
			}, 500)
		},
		getToken() {
			$doc.find(".loading-popup .loading-title").html(`令牌获取中`);
			$doc.find(".loading-popup .swal2-html-container").html(`<div>正在获取令牌~</div>`);
			let token = base.getStorage("authorToken");
			return token;
		},
		async getLink() {
			let selectList = this.getSelectedList();
			if (selectList.length === 0) return message.error("提示：<br/>请勾选要下载的文件哦~");
			if (selectList.every(item => item.Type !== 0)) return message.error("提示：<br/>请打开文件夹后再勾选文件~");
			if (temp.page === "home") {
				let token = this.getToken();
				let batchSize = 15;
				let processed = 0;
				selectList = selectList.filter(item => item.Type === 0);
				for (let i = 0; i < selectList.length; i += batchSize) {
					let batch = selectList.slice(i, i + batchSize);
					let queue = [];
					$doc.find(".loading-popup .loading-title").html(`链接获取中`);
					$doc.find(".loading-popup .swal2-html-container").html(`<div>正在获取文件对应的下载链接~</div>`);
					batch.forEach((item, localIndex) => {
						let globalIndex = i + localIndex;
						queue.push(this.getFileUrl(item, globalIndex, token)
							.then(val => {
								processed++;
								$doc.find(".loading-popup .swal2-html-container").html(`<div>已获取 ${processed} / ${selectList.length} 个链接~</div>`);
								return val;
							}));
					});
					let res = await Promise.all(queue);
					res.forEach(val => {
						selectList[val.index].DownloadUrl = val.downloadUrl;
					});
					await base.sleep(1000);
				}
				temp.links = [selectList, {
					isFolder: v => v.Type !== 0,
					getFileName: v => v.FileName,
					getFileSize: v => v.Size,
					getFileLink: v => v.DownloadUrl || v.DownloadURL,
					}]
				base.showMainDialog(config.base.dom.button[temp.mode].title, base.generateDom(temp.links), config.base.dom.button[temp.mode].footer);
			} else if (temp.page === "share") {
				let token = this.getToken();
				let batchSize = 15;
				let processed = 0;
				selectList = selectList.filter(item => item.Type === 0);
				let pathSplit = location.pathname.split("/").filter(Boolean);
				let ShareKey = pathSplit[1];
				for (let i = 0; i < selectList.length; i += batchSize) {
					let batch = selectList.slice(i, i + batchSize);
					let queue = [];
					$doc.find(".loading-popup .loading-title").html(`链接获取中`);
					$doc.find(".loading-popup .swal2-html-container").html(`<div>正在获取文件对应的下载链接~</div>`);
					batch.forEach((item, localIndex) => {
						let globalIndex = i + localIndex;
						queue.push(this.getFileUrl(item, globalIndex, token, ShareKey)
							.then(val => {
								processed++;
								$doc.find(".loading-popup .swal2-html-container").html(`<div>已获取 ${processed} / ${selectList.length} 个链接~</div>`);
								return val;
							}));
					});
					let res = await Promise.all(queue);
					res.forEach(val => {
						selectList[val.index].DownloadUrl = val.downloadUrl;
					});
					await base.sleep(1000);
				}
				temp.links = [selectList, {
					isFolder: v => v.Type !== 0,
					getFileName: v => v.FileName,
					getFileSize: v => v.Size,
					getFileLink: v => v.DownloadUrl || v.DownloadURL,
					}]
				base.showMainDialog(config.base.dom.button[temp.mode].title, base.generateDom(temp.links), config.base.dom.button[temp.mode].footer);
			} else {
				return message.error("提示：<br/>页面错误~");
			}
		},
		async getFileUrl(item, index, token, ShareKey) {
			let res = null;
			if (ShareKey) {
				res = await base.post(config.$123pan.api.getShareLink, { "ShareKey": ShareKey, "FileID": item.FileId, "S3keyFlag": item.S3KeyFlag, "Size": item.Size, "Etag": item.Etag }, { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "Platform": "ios" });
			} else {
				res = await base.post(config.$123pan.api.getLink, { "driveId": 0, "etag": item.Etag, "fileId": item.FileId, "s3keyFlag": item.S3KeyFlag, "type": item.Type, "fileName": item.FileName, "size": item.Size }, { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "Platform": "ios" });
			}
			if (res.data?.DownloadUrl || res.data?.DownloadURL) {
				let url = res.data.DownloadUrl ? res.data.DownloadUrl : res.data?.DownloadURL;
				let surl = new URL(url).searchParams.get("params");
				if (surl) url = base.decodeBase(surl);
				return {
					index,
					downloadUrl: url
				};
			} else if (res?.code == 5112) {
				return message.error("提示：<br/>请先登录网盘后再获取链接呢~");
			} else if (res?.code == 5113) {
				return {
					index,
					downloadUrl: "获取下载地址失败，服务器说：本月免费流量不足，请开通网盘会员~"
				};
			} else {
				return {
					index,
					downloadUrl: `获取下载地址失败，${res?.message ? "服务器说：" + res.message + "。" : "刷新后再试试吧~"}`
				};
			}
		},
		getSelectedList() {
			try {
				let selectedList = [];
				let reactDom = $(".ant-table-wrapper, .tiled-list, .file-list, .single-file-sharing-container-content")[0];
				let reactObj = base.findReact(reactDom);
				let props = reactObj.pendingProps;
				if (props) {
					let fileList = props?.dataSource || props?.loadedFileList || props?.files || [];
					let selectedKey = props?.rowSelection?.selectedRowKeys || [];
					fileList.forEach(function (val) {
						if (val?.checked === true) {
							selectedList.push(val);
						} else if (selectedKey.includes(val.FileId)) {
							selectedList.push(val);
						}
					});
					if (props?.file?.S3KeyFlag) selectedList.push(props.file);
				}
				return selectedList;
			} catch (e) {
				return [];
			}
		},
		addButton() {
			base.waitForKeyElements(config.$123pan.mount.home, (element) => {
				temp.page = temp.main.detectPage();
				if ($(".pl-button").length > 0 || !temp.page || temp.page !== "home") return;
				let $button = $(`<button type="button" class="ant-btn ${[...document.querySelector(`[class*="ant-btn css-"]`).classList].find(c => /^css-[a-z0-9]+$/.test(c))} ant-btn-primary ant-btn-color-primary ant-btn-variant-solid ant-dropdown-trigger mfy-button upload-button pl-button color-button" style="user-select: text !important;">
					<span>下载助手</span>
				</button>`);
				element.prepend($button);
			})
			base.waitForKeyElements(config.$123pan.mount.share, (element) => {
				temp.page = temp.main.detectPage();
				if ($(".pl-button").length > 0 || !temp.page || temp.page !== "share") return;
				let $button = $(`<div class="register pl-button color-button">
					下载助手
				</div>`);
				$button.css({ "width": "100px" });
				element.append($button);
			})
			base.waitForKeyElements(config.$123pan.mount.shareNew, (element) => {
				temp.page = temp.main.detectPage();
				if ($(".pl-button").length > 0 || !temp.page || temp.page !== "share") return;
				let $button = $(`<button type="button" class="ant-btn ${[...document.querySelector(`[class*="ant-btn css-"]`).classList].find(c => /^css-[a-z0-9]+$/.test(c))} ant-btn-primary ant-btn-color-primary ant-btn-variant-solid mfy-button pl-button color-button" style="user-select: text !important;">
					<span>下载助手</span>
				</button>`);
				$(".single-file-sharing-container-content").css({ "width": "415px" });
				element.append($button);
			})
		},
		detectPage() {
			let path = location.pathname;
			if (/^\/$/.test(path)) return "home";
			if (/^\/s\//.test(path)) return "share";
			return "";
		},
		async initPanLinker() {
			this.addButton();
			this.addPageListener();
		},
	};

	let main = {
		async init() {
			base.console.log(`LinkSwift\n一个基于 JavaScript 的网盘文件下载地址获取工具\n仓库：https://github.com/hmjz100/LinkSwift\n版本：${info.version}\n领域：${(window.self !== window.top ? "[iframe] " : "") + (document.title ? (document.title + " (" + location.origin + location.pathname + ")") : location.href)}`);
			let mountElem = $(`<${mount} class="${mount}" />`);
			temp.mount = mountElem;

			base.waitForKeyElements(`html:not(:has(> .${mount})) head`, (element) => {
				if ($(`.${mount}`).length > 0) return;
				element.after(temp.mount);
			})

			if (/(pan|yun).baidu.com/.test(location.host)) temp.main = $baidu;
			else if (/openapi.baidu.com\/oauth/.test(location.href)) temp.main = $baiduAuthorize;
			else if (/www.(aliyundrive|alipan).com/.test(location.host)) temp.main = $aliyun;
			else if (/cloud.189.cn/.test(location.host)) temp.main = $tcloud;
			else if (/pan.xunlei.com/.test(location.host)) temp.main = $xunlei;
			else if (/pan.quark.cn/.test(location.host)) temp.main = $quark;
			else if (/(www|login).(123(pan|684|865|952|912).com|123pan.cn)/.test(location.host)) temp.main = $123pan;

			base.initDefaultConfig();
			base.addPanLinkerStyle();
			base.addPageListener();
			base.createTip();

			if ("initPanLinker" in temp.main) temp.main.initPanLinker();
			if ("greenerPage" in temp.main) temp.main.greenerPage();

			let list = base.getValue("setting_init");
			if (list && list.version !== info.version) {
				list.version = info.version;
				base.setValue("setting_init", list);
			}
		}
	};

	base.console = Object.fromEntries(Object.entries(console).filter(([key, value]) => typeof value === "function").map(([key, value]) => [key, value.bind(console)]));
	main.init();

	function idontknow(input) {
		let charArray = input.split("");
		for (let i = charArray.length - 1; i > 0; i--) {
			let j = Math.floor(Math.random() * (i + 1));
			[charArray[i], charArray[j]] = [charArray[j], charArray[i]];
		}
		return charArray.join("");
	}
})($ ?? jQuery);