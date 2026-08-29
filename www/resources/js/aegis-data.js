/**
 * aegis-data.js — 数据安全检测页面逻辑（前后端结合）
 * 类别：页面
 * 依赖：自有后端 tls-check.php（TLS 指纹检测，服务端缓存 6h）；
 *       公共 API ipinfo.io / ipwho.is
 * 职责：
 *   1. 中间人劫持检测：服务端 TLS 证书 SHA-256 指纹与基线比对（节流请求）
 *   2. 网络环境判断：运营商含 Education/Research/Company → 公司 / 校园网
 *      （Google Fiber 除外）；WebRTC 内网 IP 判断大内网 / iPhone 热点
 *   3. 网络身份识别（公网 IP 一致性 + 内网网段 + 运营商）区分不同网络环境
 *   4. 多次测量缓存：按网络环境分 Tab（最多 4 个），每个 Tab 最多 9 条，
 *      超出覆盖最久未测试的 Tab；同一 Tab 新结果覆盖旧结果
 *   5. 新结果暂存：不直接写入长期缓存，用户选择并入哪个 Tab / 新建 Tab
 *   6. Tab 内历史以卡片展示；「清空缓存」清当前 Tab；仅 1-2 条时自绘 POP
 *      提示多次测量；首次检测 POP 提醒勿删缓存、推荐固定电脑长期测量
 * 约束：自有后端（tls-check.php）带服务端缓存 6h + 前端 localStorage
 *       节流（新网络环境重新请求 + 30 分钟最小周期）
 */
(function () {
    'use strict';

    /* ================= 元素引用 ================= */
    var hero       = document.getElementById('data-hero');
    var intro      = document.getElementById('data-intro');
    var detecting  = document.getElementById('data-detecting');
    var resultEl   = document.getElementById('data-result');
    var tabsEl     = document.getElementById('data-tabs');
    var badgeEl    = document.getElementById('data-badge');
    var scoreEl    = document.getElementById('data-score');
    var listEl     = document.getElementById('data-list');
    var stagingEl  = document.getElementById('data-staging');
    var stagingDesc= document.getElementById('staging-desc');
    var stagingAct = document.getElementById('staging-actions');
    var historyTitle = document.getElementById('history-title');
    var historyEl  = document.getElementById('history-cards');
    var btn        = document.getElementById('data-check-btn');
    var againBtn   = document.getElementById('data-again-btn');
    var clearBtn   = document.getElementById('data-clear-btn');

    /* ================= 常量 ================= */
    var TABS_KEY   = 'aegis_data_tabs';
    var TLS_CACHE_KEY = 'aegis_data_tls';
    var TLS_MIN_INTERVAL = 30 * 60 * 1000;   // 30 分钟
    var TLS_TTL    = 6 * 3600 * 1000;         // 6 小时
    var MAX_TABS   = 4;                        // 最多 4 个网络环境 Tab
    var MAX_RESULTS = 9;                       // 每个 Tab 最多 9 条
    var lastClientIp = null;                   // 当前出口 IP（节流比对用）

    /* ================= 警示分级（与连接安全页一致） ================= */
    var LEVELS = [
        { min: 80, label: '正常', cls: 'lv-ok',     icon: 'fluent:shield-checkmark-20-regular' },
        { min: 60, label: '黄色', cls: 'lv-warn',   icon: 'fluent:warning-20-regular' },
        { min: 40, label: '橙色', cls: 'lv-orange', icon: 'fluent:warning-20-regular' },
        { min: 0,  label: '红色', cls: 'lv-danger', icon: 'fluent:error-circle-20-regular' },
    ];
    function levelOf(score) {
        for (var i = 0; i < LEVELS.length; i++) {
            if (score >= LEVELS[i].min) return LEVELS[i];
        }
        return LEVELS[LEVELS.length - 1];
    }

    /* ================= 自绘 POP（非浏览器弹窗） ================= */
    var popupEl = null;
    function showPopup(opts) {
        hidePopup();
        var overlay = document.createElement('div');
        overlay.className = 'data-pop-overlay';
        var box = document.createElement('div');
        box.className = 'data-pop ' + (opts.theme === 'warn' ? 'pop-warn' : 'pop-info');
        box.innerHTML =
            '<div class="data-pop-icon"><iconify-icon icon="' +
            (opts.theme === 'warn' ? 'fluent:warning-20-regular' : 'fluent:info-20-regular') +
            '"></iconify-icon></div>' +
            '<div class="data-pop-title"></div>' +
            '<div class="data-pop-text"></div>' +
            '<div class="data-pop-actions"><button type="button" class="data-pop-btn">' +
            (opts.btnText || '知道了') + '</button></div>';
        box.querySelector('.data-pop-title').textContent = opts.title;
        box.querySelector('.data-pop-text').textContent = opts.text;
        box.querySelector('.data-pop-btn').addEventListener('click', hidePopup);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        popupEl = overlay;
    }
    function hidePopup() {
        if (popupEl) { popupEl.remove(); popupEl = null; }
    }
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hidePopup(); });

    /* ================= Tab 数据模型（localStorage） ================= */
    function loadTabs() {
        try {
            var raw = localStorage.getItem(TABS_KEY);
            var d = raw ? JSON.parse(raw) : null;
            if (!d || !Array.isArray(d.tabs)) return [];
            return d.tabs;
        } catch (e) { return []; }
    }
    function saveTabs(tabs) {
        try { localStorage.setItem(TABS_KEY, JSON.stringify({ tabs: tabs, updated: Date.now() })); }
        catch (e) { /* 存储满 / 禁用时静默忽略 */ }
    }

    /* ================= 网络身份识别 =================
       综合公网 IP 一致性 + 内网网段 + 运营商，区分同一网络环境 */
    function netIdentity(info, localIps) {
        return {
            pubIp: info.ip || '',
            org: (info.org || '').toLowerCase(),
            region: [info.country, info.region, info.city].filter(Boolean).join('·').toLowerCase(),
            subnets: localIps.map(function (ip) { return ip.split('.').slice(0, 3).join('.'); }),
        };
    }

    /** 判断两个网络身份是否同一环境：公网 IP 相同，或（内网网段 + 运营商）相同 */
    function sameNetwork(a, b) {
        if (!a || !b) return false;
        if (a.pubIp && b.pubIp && a.pubIp === b.pubIp) return true;
        // 公网 IP 变化时，用内网网段 + 运营商辅助判断（如 DHCP 重连 IP 变了）
        if (a.org && b.org && a.org === b.org) {
            var share = a.subnets.some(function (s) { return s && b.subnets.indexOf(s) !== -1; });
            if (share) return true;
        }
        return false;
    }

    /* ================= WebRTC 内网 IP =================
       获取本机内网 IP（真实浏览器可获取；mDNS / 失败时返回空） */
    function gatherLocalIps(timeout) {
        var t = timeout || 2500;
        return new Promise(function (resolve) {
            var ips = [];
            var pc;
            try {
                pc = new window.RTCPeerConnection({ iceServers: [] });
                pc.createDataChannel('probe');
                pc.onicecandidate = function (e) {
                    if (!e.candidate) return;
                    var m = String(e.candidate.candidate).match(/([0-9]{1,3}(?:\.[0-9]{1,3}){3})/);
                    if (m && ips.indexOf(m[1]) === -1) ips.push(m[1]);
                };
                pc.createOffer().then(function (o) { return pc.setLocalDescription(o); }).catch(function () {});
            } catch (e) { resolve([]); return; }
            setTimeout(function () {
                try { if (pc) pc.close(); } catch (e) {}
                resolve(ips);
            }, t);
        });
    }

    /** 内网环境分类：基于多次测量比对内网 IP 是否大幅变化
     *  - 多次记录中内网 IP 大幅变化（如 10.0.0.3 → 10.24.155.24、
     *    192.168.1.15 → 192.168.15.4，不像家庭路由器稳定特征）→ 公司/校园网特征
     *  - 单次 / 多次内网 IP 稳定 → 家庭 / 小型网络
     *  - iPhone 热点（172.20.10.x）→ 安全
     * @param {string[]} localIps 本次内网 IP
     * @param {string[][]} historyLocal 历史各次内网 IP（每项为一次测量的 IP 数组） */
    function classifyLocal(localIps, historyLocal) {
        var iphone = /^172\.20\.10\./;
        // iPhone 热点优先判定安全
        var hotspot = (localIps || []).filter(function (ip) { return iphone.test(ip); });
        if (hotspot.length) return { kind: 'hotspot', detail: 'iPhone 热点内网（172.20.10.x，判断为安全）' };

        // 汇总所有历史内网 IP（含本次）
        var all = (localIps || []).slice();
        (historyLocal || []).forEach(function (arr) {
            (arr || []).forEach(function (ip) { if (all.indexOf(ip) === -1) all.push(ip); });
        });
        var real = all.filter(function (ip) { return /^(192\.168\.|10\.|172\.)/.test(ip); });

        // 多次测量且内网 IP 大幅变化 → 公司 / 校园网特征
        if (all.length >= 2) {
            // 计算各 IP 的「网段变化」：主网段（前三段）是否频繁切换
            var subnets = {};
            all.forEach(function (ip) {
                var s = ip.split('.').slice(0, 3).join('.');
                subnets[s] = true;
            });
            var subnetCount = Object.keys(subnets).length;
            if (subnetCount >= 2) {
                return {
                    kind: 'unstable',
                    detail: '多次测量内网 IP 变化较大（' + all.join('、') +
                        '），不像家庭路由器稳定特征，存在公司 / 校园网特征，可能有上网监控',
                };
            }
        }

        if (real.length) return { kind: 'stable', detail: '内网 IP 稳定（' + real.join('、') + '），符合家庭 / 小型网络特征' };
        if (all.length) return { kind: 'other', detail: '内网 IP：' + all.join('、') };
        return { kind: 'unknown', detail: '未能获取内网 IP（浏览器限制），建议多次测量' };
    }

    /* ================= 自有后端 TLS 检测（节流） ================= */
    function readTlsCache(host) {
        try {
            var raw = localStorage.getItem(TLS_CACHE_KEY);
            if (!raw) return null;
            var c = JSON.parse(raw);
            if (!c || c.host !== host) return null;
            if (Date.now() - c.ts > TLS_TTL) return null;
            return c;
        } catch (e) { return null; }
    }
    function writeTlsCache(host, data) {
        try {
            localStorage.setItem(TLS_CACHE_KEY, JSON.stringify({
                host: host, trusted_match: data.trusted_match,
                fingerprint: data.fingerprint, issuer: data.issuer,
                subject_cn: data.subject_cn, tls_version: data.tls_version,
                ts: Date.now(), clientIp: lastClientIp,
            }));
        } catch (e) { /* 静默忽略 */ }
    }

    /** 节流获取 TLS 指纹检测结果：缓存有效 + IP 未变 + <30min → 用缓存，否则重新请求 */
    function fetchTlsCheck(host) {
        var cached = readTlsCache(host);
        if (cached) {
            var ipChanged = lastClientIp && cached.clientIp && cached.clientIp !== lastClientIp;
            var intervalOk = Date.now() - cached.ts >= TLS_MIN_INTERVAL;
            if (!ipChanged && !intervalOk) return Promise.resolve(cached);
        }
        return fetch('tls-check.php?host=' + encodeURIComponent(host))
            .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
            .then(function (d) {
                writeTlsCache(host, d);
                return d;
            })
            .catch(function () {
                return { host: host, trusted_match: null, error: 'fetch_failed' };
            });
    }

    /* ================= 网络环境判断 ================= */
    var COMPANY_RE = /\b(education|university|research|company|corp|corporate)\b/i;

    /** 是否公司 / 校园网（Google Fiber 除外，它是家庭宽带） */
    function isCompanyNet(org) {
        if (!org) return false;
        if (/google fiber/i.test(org)) return false;
        return COMPANY_RE.test(org);
    }

    /* ================= 打分 =================
       权重：中间人劫持 50、网络环境 30、内网环境 20 */
    var WEIGHTS = [
        { key: 'mitm',   weight: 50, label: '中间人劫持检测（TLS 指纹一致）', icon: 'fluent:shield-lock-20-regular' },
        { key: 'env',    weight: 30, label: '非公司 / 校园网络环境', icon: 'fluent:building-20-regular' },
        { key: 'local',  weight: 20, label: '内网环境稳定（多次测量 IP 无明显大幅变化）', icon: 'fluent:home-20-regular' },
    ];

    function computeScore(results) {
        var score = 0;
        WEIGHTS.forEach(function (w) { if (results[w.key].pass) score += w.weight; });
        return score;
    }

    /* ================= 渲染 ================= */
    function renderTabs(tabs, activeId) {
        tabsEl.innerHTML = '';
        if (!tabs.length) {
            var empty = document.createElement('div');
            empty.className = 'data-tab-empty';
            empty.textContent = '暂无网络环境记录，检测后将自动建立';
            tabsEl.appendChild(empty);
            return;
        }
        tabs.forEach(function (tab) {
            var t = document.createElement('button');
            t.type = 'button';
            t.className = 'data-tab' + (tab.id === activeId ? ' active' : '');
            t.innerHTML = '<span class="data-tab-label"></span><span class="data-tab-count"></span>';
            t.querySelector('.data-tab-label').textContent = tab.label;
            t.querySelector('.data-tab-count').textContent = tab.results.length + ' 条';
            t.addEventListener('click', function () {
                selectTab(tab.id);
            });
            tabsEl.appendChild(t);
        });
    }

    /** 渲染历史卡片（当前 Tab） */
    function renderHistory(tab) {
        historyEl.innerHTML = '';
        if (!tab || !tab.results || !tab.results.length) {
            var empty = document.createElement('div');
            empty.className = 'history-empty';
            empty.textContent = '该网络环境暂无历史检测记录';
            historyEl.appendChild(empty);
            return;
        }
        // 新在前
        var list = tab.results.slice().reverse();
        list.forEach(function (r) {
            var card = document.createElement('div');
            card.className = 'history-card';
            var lv = levelOf(r.score);
            card.innerHTML =
                '<div class="hc-top">' +
                '<span class="hc-time"></span>' +
                '<span class="hc-score ' + lv.cls + '"></span>' +
                '</div>' +
                '<div class="hc-items"></div>';
            card.querySelector('.hc-time').textContent = fmtTime(r.ts);
            card.querySelector('.hc-score').textContent = r.score + ' 分 · ' + lv.label;
            var itemsBox = card.querySelector('.hc-items');
            (r.items || []).forEach(function (it) {
                var d = document.createElement('div');
                d.className = 'hc-item ' + (it.pass ? 'ok' : 'bad');
                d.innerHTML = '<iconify-icon icon="' +
                    (it.pass ? 'fluent:checkmark-circle-20-filled' : 'fluent:dismiss-circle-20-filled') +
                    '"></iconify-icon><span></span>';
                d.querySelector('span').textContent = it.label;
                itemsBox.appendChild(d);
            });
            historyEl.appendChild(card);
        });
    }

    function fmtTime(ts) {
        var d = new Date(ts);
        function p(n) { return (n < 10 ? '0' : '') + n; }
        return p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
    }

    /** 渲染本次检测项 */
    function renderItems(results) {
        listEl.innerHTML = '';
        WEIGHTS.forEach(function (w) {
            var r = results[w.key];
            var li = document.createElement('li');
            li.className = 'result-item ' + (r.pass ? 'pass' : 'fail');
            li.innerHTML =
                '<span class="result-icon">' +
                '<iconify-icon icon="' + (r.pass ? 'fluent:checkmark-circle-20-filled' : 'fluent:dismiss-circle-20-filled') + '"></iconify-icon>' +
                '</span>' +
                '<div class="result-body">' +
                '<div class="result-label"><iconify-icon icon="' + w.icon + '"></iconify-icon>' + w.label + '</div>' +
                '<div class="result-detail"></div>' +
                '</div>' +
                '<span class="result-state">' + (r.pass ? '通过' : '未通过') + '</span>';
            li.querySelector('.result-detail').textContent = r.detail;
            listEl.appendChild(li);
        });
    }

    /* ================= 暂存区：新结果归入 ================= */
    var stagedResult = null;   // 本次检测结果（未写入长期缓存）
    var stagedIdentity = null;

    function renderStaging(tabs, info, localIps) {
        stagingEl.hidden = false;
        stagingDesc.textContent =
            '检测完成，本次结果尚未保存。请选择归入哪个网络环境，或新建 Tab（同一网络的新结果将覆盖旧结果）。' +
            '网络身份：公网 ' + (info.ip || '?') + ' · 内网 ' + (localIps.join('、') || '未知') +
            ' · ' + (info.org || '未知运营商') +
            '。注意：若在距离过近的不同地方检测，数据可能不准，建议长期固定电脑多次测量。';

        stagingAct.innerHTML = '';
        // 自动匹配同一网络的 Tab
        var matched = tabs.filter(function (t) { return sameNetwork(t.identity, stagedIdentity); });
        if (matched.length) {
            matched.forEach(function (tab) {
                var b = document.createElement('button');
                b.type = 'button';
                b.className = 'staging-btn primary';
                b.textContent = '并入「' + tab.label + '」（' + tab.results.length + ' 条）';
                b.addEventListener('click', function () { mergeToTab(tab.id); });
                stagingAct.appendChild(b);
            });
        }
        // 新建 Tab（若已满 4 个，覆盖最久未测试的）
        var bNew = document.createElement('button');
        bNew.type = 'button';
        bNew.className = 'staging-btn' + (matched.length ? '' : ' primary');
        bNew.textContent = tabs.length >= MAX_TABS ? '新建 Tab（覆盖最久未测试的）' : '新建 Tab';
        bNew.addEventListener('click', function () { createNewTab(); });
        stagingAct.appendChild(bNew);

        // 丢弃
        var bDiscard = document.createElement('button');
        bDiscard.type = 'button';
        bDiscard.className = 'staging-btn';
        bDiscard.textContent = '暂不保存';
        bDiscard.addEventListener('click', function () { stagingEl.hidden = true; stagedResult = null; });
        stagingAct.appendChild(bDiscard);
    }

    /** 并入已有 Tab（同一 Tab 新覆盖旧，最多 9 条） */
    function mergeToTab(tabId) {
        var tabs = loadTabs();
        var tab = tabs.filter(function (t) { return t.id === tabId; })[0];
        if (!tab) return;
        tab.results.push(stagedResult);
        if (tab.results.length > MAX_RESULTS) tab.results.shift();   // 覆盖最旧
        tab.lastTested = stagedResult.ts;
        tab.identity = stagedIdentity;
        saveTabs(tabs);
        stagedResult = null;
        selectTab(tabId);
        // 若该 Tab 历史很少，POP 建议多次测量
        if (tab.results.length <= 2) {
            showPopup({
                theme: 'info',
                title: '建议多次测量',
                text: '该网络环境目前仅有 ' + tab.results.length + ' 条检测结果，建议在长期固定的电脑上、不同时段多次检测，以获得更准确的数据安全评估。请勿随意清除浏览器缓存。',
            });
        }
    }

    /** 新建 Tab；已满 4 个时覆盖最久未测试的 Tab */
    function createNewTab() {
        var tabs = loadTabs();
        var id = 'net_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
        var label = '网络' + (tabs.length + 1) + ' · ' + (stagedIdentity.org ? shortOrg(stagedIdentity.org) : (stagedIdentity.pubIp || '未知'));
        var tab = {
            id: id,
            label: label,
            identity: stagedIdentity,
            lastTested: stagedResult.ts,
            results: [stagedResult],
        };
        if (tabs.length >= MAX_TABS) {
            // 覆盖最久未测试的 Tab
            tabs.sort(function (a, b) { return a.lastTested - b.lastTested; });
            tabs.shift();
        }
        tabs.push(tab);
        saveTabs(tabs);
        stagedResult = null;
        selectTab(id);
        // 首次建立 Tab：POP 提醒
        if (tabs.length === 1) {
            showPopup({
                theme: 'info',
                title: '首次检测 · 重要提醒',
                text: '本页采用多次测量累积判断数据安全。请勿立即清除浏览器缓存，需要较长时间、多次测量后结果才更准确；推荐在长期固定的电脑上进行测试。若在距离过近的不同地方检测，数据可能不准。',
            });
        }
    }

    /** 截短运营商名称（取冒号/括号前片段） */
    function shortOrg(org) {
        var s = String(org).split(/[:(]/)[0].trim();
        return s.length > 16 ? s.slice(0, 16) + '…' : s;
    }

    /* ================= 当前激活 Tab ================= */
    var activeTabId = null;

    function selectTab(id) {
        activeTabId = id;
        var tabs = loadTabs();
        var tab = tabs.filter(function (t) { return t.id === id; })[0];
        renderTabs(tabs, id);
        historyTitle.textContent = tab ? ('历史检测 · ' + tab.label) : '历史检测';
        renderHistory(tab);
    }

    /* ================= 主流程 ================= */
    function enterDetecting() {
        hero.classList.add('is-detecting');
        intro.classList.add('is-fading');
        detecting.hidden = false;
        btn.disabled = true;
        resultEl.hidden = true;
        stagingEl.hidden = true;
    }
    function leaveDetecting() {
        hero.classList.remove('is-detecting');
        intro.classList.remove('is-fading');
        detecting.hidden = true;
        btn.disabled = false;
        resultEl.hidden = false;
    }

    function run() {
        if (btn.disabled) return;
        enterDetecting();

        var info = { ip: '', org: '', country: '', region: '', city: '' };
        var localIps = [];

        // 并行：公网信息 + WebRTC 内网 IP
        var pub = fetch('https://ipinfo.io/json', { cache: 'no-store' })
            .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
            .then(function (d) {
                info.ip = d.ip || ''; info.org = d.org || '';
                info.country = d.country || ''; info.region = d.region || ''; info.city = d.city || '';
                return info;
            })
            .catch(function () { return info; });

        var webrtc = gatherLocalIps().then(function (ips) { localIps = ips; return ips; });

        Promise.all([pub, webrtc]).then(function () {
            lastClientIp = info.ip || null;
            // TLS 劫持检测（节流）
            return fetchTlsCheck('www.baidu.com').then(function (tls) {
                // 网络环境（公司 / 校园网）
                var envPass = !isCompanyNet(info.org);
                // 内网环境：需多次比对内网 IP 变化（收集当前 Tab 历史各次内网 IP）
                var histLocal = [];
                var tabs = loadTabs();
                var curTab = tabs.filter(function (t) { return t.id === activeTabId; })[0];
                if (curTab) {
                    (curTab.results || []).forEach(function (r) {
                        if (r.localIps && r.localIps.length) histLocal.push(r.localIps);
                    });
                }
                var local = classifyLocal(localIps, histLocal);

                var results = {
                    mitm: {
                        pass: tls.trusted_match === true,
                        detail: tls.trusted_match === true
                            ? 'TLS 证书指纹与官方一致（' + (tls.issuer || '') + '），未被劫持'
                            : tls.trusted_match === false
                                ? 'TLS 证书指纹与官方不一致（' + (tls.issuer || '未知') + '），可能存在中间人劫持 / 私签证书'
                                : 'TLS 指纹检测暂不可用（' + (tls.error || '服务异常') + '）',
                    },
                    env: {
                        pass: envPass,
                        detail: envPass
                            ? '运营商非公司 / 校园网（' + (info.org || '未知') + '）'
                            : '检测到公司 / 校园网环境（' + (info.org || '未知') + '），可能存在上网监控',
                    },
                    local: {
                        pass: local.kind !== 'unstable',
                        detail: local.detail,
                    },
                };

                var score = computeScore(results);
                var lv = levelOf(score);
                badgeEl.className = 'result-badge ' + lv.cls;
                badgeEl.innerHTML = '<iconify-icon icon="' + lv.icon + '"></iconify-icon>' + lv.label;
                scoreEl.className = 'result-score ' + lv.cls;
                scoreEl.textContent = score;
                renderItems(results);

                // 暂存本次结果（不直接写长期缓存）
                stagedIdentity = netIdentity(info, localIps);
                stagedResult = {
                    ts: Date.now(),
                    score: score,
                    levelCls: lv.cls,
                    levelLabel: lv.label,
                    items: WEIGHTS.map(function (w) {
                        return { label: w.label, pass: results[w.key].pass };
                    }),
                    pubIp: info.ip,
                    localIps: localIps.slice(),
                };

                leaveDetecting();
                var tabs = loadTabs();
                renderTabs(tabs, activeTabId);
                renderStaging(tabs, info, localIps);
                // 若尚未选过 Tab，展示第一个
                if (!activeTabId && tabs.length) selectTab(tabs[tabs.length - 1].id);
                else renderHistory(loadTabs().filter(function (t) { return t.id === activeTabId; })[0]);
            });
        });
    }

    /* ================= 清空缓存 ================= */
    function clearActiveTab() {
        var tabs = loadTabs();
        var tab = tabs.filter(function (t) { return t.id === activeTabId; })[0];
        if (!tab) return;
        var count = tab.results.length;

        // 仅 1-2 条时 POP 提示多次测量
        if (count <= 2 && count > 0) {
            showPopup({
                theme: 'warn',
                title: '确定清空？建议多次测量',
                text: '该网络环境仅有 ' + count + ' 条检测结果，数据可能不够准确。建议在固定电脑上多次测量后再判断。仍要清空吗？（清空后需重新检测积累）',
                btnText: '我再想想',
            });
            return;
        }

        // 直接清空（>2 条，或 0 条）
        tab.results = [];
        saveTabs(tabs);
        selectTab(activeTabId);
        showPopup({
            theme: 'info',
            title: '已清空缓存',
            text: '已清空「' + tab.label + '」下的全部检测记录。建议重新检测积累多次测量数据。',
        });
    }

    clearBtn.addEventListener('click', clearActiveTab);
    btn.addEventListener('click', run);
    againBtn.addEventListener('click', run);

    /* ================= 初始化 ================= */
    var tabs = loadTabs();
    if (tabs.length) {
        activeTabId = tabs[tabs.length - 1].id;
        renderTabs(tabs, activeTabId);
        renderHistory(tabs[tabs.length - 1]);
    } else {
        renderTabs([], null);
    }
})();
