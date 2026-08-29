/**
 * aegis-intelligent.js — 智能检测页面逻辑（前后端结合）
 * 类别：页面
 * 依赖：自有后端 tls-check.php（TLS 指纹，节流）；公共 API ipinfo.io / ipwho.is
 *       可复用 aegis-data.js 的 Tab 缓存（联合比对内网历史）
 * 职责：
 *   1. 华丽 UI：紫色渐变 + 光影 + 四芒星旋转
 *   2. 综合检测：
 *      a. 设备 IP（天隼：ipinfo 获取公网 IP / 归属 / 运营商）
 *      b. 连接安全性：IP 归属与所在地、Tor/VPN、DNS 泄漏、加密 DNS
 *      c. 数据安全性：中间人劫持（TLS 指纹）+ 网络环境 + 内网检测
 *         （若数据安全检测有网络特征一致的历史，联合比对内网稳定性）
 *   3. 智能打分（加权）+ 列出检查项
 *   4. 出具漂亮报告：可缓存（localStorage 无上限）、底部历史记录调出、
 *      导出图片（canvas 绘制报告）
 *   5. 结果弹出确认弹窗（Web 沙箱提示）
 */
(function () {
    'use strict';

    /* ================= 元素引用 ================= */
    var hero       = document.getElementById('intel-hero');
    var intro      = document.getElementById('intel-intro');
    var detecting  = document.getElementById('intel-detecting');
    var resultEl   = document.getElementById('intel-result');
    var reportEl   = document.getElementById('intel-report');
    var badgeEl    = document.getElementById('intel-badge');
    var scoreEl    = document.getElementById('intel-score');
    var ipEl       = document.getElementById('intel-ip');
    var listEl     = document.getElementById('intel-list');
    var timeEl     = document.getElementById('intel-time');
    var btn        = document.getElementById('intel-check-btn');
    var againBtn   = document.getElementById('intel-again-btn');
    var exportBtn  = document.getElementById('intel-export-btn');
    var saveBtn    = document.getElementById('intel-save-btn');
    var clearAllBtn= document.getElementById('intel-clear-all-btn');
    var historyEl  = document.getElementById('intel-history-list');

    /* ================= 常量 ================= */
    var REPORTS_KEY = 'aegis_intel_reports';
    var TLS_CACHE_KEY = 'aegis_data_tls';   // 复用数据安全页的 TLS 缓存
    var DATA_TABS_KEY = 'aegis_data_tabs';  // 复用数据安全页 Tab 缓存
    var TLS_MIN_INTERVAL = 30 * 60 * 1000;
    var TLS_TTL = 6 * 3600 * 1000;

    /* 国家码映射（与连接安全一致） */
    var COUNTRY_CODE = {
        '中国': 'CN', '日本': 'JP', '韩国': 'KR', '俄罗斯': 'RU',
        '乌克兰': 'UA', '朝鲜': 'KP', '古巴': 'CU', '土耳其': 'TR',
        '阿富汗': 'AF', '阿拉伯': 'AE', '美国': 'US',
    };

    /* ================= 警示分级 ================= */
    var LEVELS = [
        { min: 80, label: '安全', cls: 'lv-ok',     icon: 'fluent:shield-checkmark-20-regular' },
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

    /* ================= 自绘 POP（确认弹窗） ================= */
    var popupEl = null;
    function showConfirm(opts) {
        hidePopup();
        var overlay = document.createElement('div');
        overlay.className = 'intel-pop-overlay';
        var box = document.createElement('div');
        box.className = 'intel-pop';
        box.innerHTML =
            '<div class="intel-pop-icon"><iconify-icon icon="fluent:info-20-regular"></iconify-icon></div>' +
            '<div class="intel-pop-title"></div>' +
            '<div class="intel-pop-text"></div>' +
            '<div class="intel-pop-actions">' +
            '<button type="button" class="intel-pop-btn ghost"></button>' +
            '<button type="button" class="intel-pop-btn primary"></button>' +
            '</div>';
        box.querySelector('.intel-pop-title').textContent = opts.title;
        box.querySelector('.intel-pop-text').textContent = opts.text;
        box.querySelector('.intel-pop-btn.ghost').textContent = opts.cancelText || '取消';
        box.querySelector('.intel-pop-btn.primary').textContent = opts.confirmText || '确定';
        box.querySelector('.intel-pop-btn.ghost').addEventListener('click', function () { hidePopup(); opts.onCancel && opts.onCancel(); });
        box.querySelector('.intel-pop-btn.primary').addEventListener('click', function () { hidePopup(); opts.onConfirm && opts.onConfirm(); });
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        popupEl = overlay;
    }
    function hidePopup() {
        if (popupEl) { popupEl.remove(); popupEl = null; }
    }
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hidePopup(); });

    /* ================= 检测工具 ================= */

    /** 归一化 */
    function norm(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim(); }

    /** 获取公网 IP / 归属 / 运营商（天隼逻辑） */
    function getDeviceIp() {
        return fetch('https://ipinfo.io/json', { cache: 'no-store' })
            .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
            .then(function (d) {
                return {
                    ip: d.ip || '', org: d.org || '', country: d.country || '',
                    region: d.region || '', city: d.city || '',
                };
            })
            .catch(function () { return { ip: '', org: '', country: '', region: '', city: '' }; });
    }

    /** WebRTC 内网 IP */
    function gatherLocalIps(timeout) {
        var t = timeout || 2500;
        return new Promise(function (resolve) {
            var ips = [], pc;
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
            setTimeout(function () { try { if (pc) pc.close(); } catch (e) {} resolve(ips); }, t);
        });
    }

    /** DoH 解析 */
    function dohResolve(url) {
        return fetch(url, { headers: { 'Accept': 'application/dns-json' } })
            .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
            .then(function (d) {
                return (d.Answer || []).filter(function (a) { return a.type === 1; }).map(function (a) { return a.data; });
            });
    }
    /** IP 归属国家 */
    function ipCountry(ip) {
        return fetch('https://ipwho.is/' + encodeURIComponent(ip), { cache: 'no-store' })
            .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
            .then(function (d) { return d.country_code || d.country || ''; })
            .catch(function () { return ''; });
    }

    /** TLS 指纹检测（节流，复用数据安全页缓存） */
    function fetchTlsCheck(host) {
        var lastClientIp = localStorage.getItem('aegis_intel_last_ip') || '';
        try {
            var raw = localStorage.getItem(TLS_CACHE_KEY);
            if (raw) {
                var c = JSON.parse(raw);
                if (c && c.host === host && (Date.now() - c.ts < TLS_TTL)) {
                    var ipChanged = lastClientIp && c.clientIp && c.clientIp !== lastClientIp;
                    var intervalOk = Date.now() - c.ts >= TLS_MIN_INTERVAL;
                    if (!ipChanged && !intervalOk) return Promise.resolve(c);
                }
            }
        } catch (e) { /* 忽略 */ }
        return fetch('tls-check.php?host=' + encodeURIComponent(host))
            .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
            .then(function (d) {
                try {
                    localStorage.setItem(TLS_CACHE_KEY, JSON.stringify({
                        host: host, trusted_match: d.trusted_match, fingerprint: d.fingerprint,
                        issuer: d.issuer, subject_cn: d.subject_cn, tls_version: d.tls_version,
                        ts: Date.now(), clientIp: lastClientIp,
                    }));
                } catch (e) { /* 忽略 */ }
                return d;
            })
            .catch(function () { return { host: host, trusted_match: null, error: 'fetch_failed' }; });
    }

    /* ================= 数据安全检测 Tab 联合比对 =================
       若数据安全检测有网络特征一致的历史结果，提取其内网 IP 历史，
       供内网稳定性判断 */
    function getDataHistoryLocalIps(info) {
        try {
            var raw = localStorage.getItem(DATA_TABS_KEY);
            if (!raw) return [];
            var d = JSON.parse(raw);
            var tabs = (d.tabs || []).filter(function (t) { return t.identity; });
            // 匹配网络特征：运营商相同或公网 IP 相同
            var matched = tabs.filter(function (t) {
                var id = t.identity;
                return (info.org && id.org && norm(info.org) === norm(id.org)) ||
                       (info.ip && id.pubIp && info.ip === id.pubIp);
            });
            var hist = [];
            matched.forEach(function (t) {
                (t.results || []).forEach(function (r) {
                    if (r.localIps && r.localIps.length) hist.push(r.localIps);
                });
            });
            return hist;
        } catch (e) { return []; }
    }

    /** 内网稳定性：多次测量内网 IP 大幅变化 → 公司/校园网特征 */
    function classifyLocal(localIps, historyLocal) {
        var iphone = /^172\.20\.10\./;
        if ((localIps || []).some(function (ip) { return iphone.test(ip); })) {
            return { pass: true, detail: 'iPhone 热点内网（172.20.10.x），判断为安全' };
        }
        var all = (localIps || []).slice();
        (historyLocal || []).forEach(function (arr) {
            (arr || []).forEach(function (ip) { if (all.indexOf(ip) === -1) all.push(ip); });
        });
        var real = all.filter(function (ip) { return /^(192\.168\.|10\.|172\.)/.test(ip); });
        if (all.length >= 2) {
            var subnets = {};
            all.forEach(function (ip) { subnets[ip.split('.').slice(0, 3).join('.')] = true; });
            if (Object.keys(subnets).length >= 2) {
                return {
                    pass: false,
                    detail: '多次测量内网 IP 变化较大（' + all.join('、') +
                        '），存在公司 / 校园网特征，可能有上网监控',
                };
            }
        }
        if (real.length) return { pass: true, detail: '内网 IP 稳定（' + real.join('、') + '），符合家庭 / 小型网络特征' };
        if (all.length) return { pass: true, detail: '内网 IP：' + all.join('、') };
        return { pass: true, detail: '未能获取内网 IP，建议多次测量' };
    }

    /** 网络环境：公司/校园网 / Tor-VPN（Google Fiber 除外） */
    function classifyEnv(org) {
        if (!org) return { pass: true, detail: '运营商信息未知' };
        if (/google fiber/i.test(org)) return { pass: true, detail: 'Google Fiber（家庭宽带，非公司网）' };
        if (/\b(education|university|research|company|corp|corporate)\b/i.test(org)) {
            return { pass: false, detail: '检测到公司 / 校园网环境（' + org + '），可能有上网监控' };
        }
        return { pass: true, detail: '运营商：' + org };
    }

    /* ================= 综合检测主流程 ================= */
    function run() {
        if (btn.disabled) return;
        enterDetecting();
        resultEl.hidden = true;

        var info = { ip: '', org: '', country: '', region: '', city: '' };
        var localIps = [];

        Promise.all([
            getDeviceIp().then(function (d) { info = d; return d; }),
            gatherLocalIps().then(function (ips) { localIps = ips; return ips; }),
        ]).then(function () {
            localStorage.setItem('aegis_intel_last_ip', info.ip || '');
            var histLocal = getDataHistoryLocalIps(info);   // 联合数据安全历史

            return fetchTlsCheck('www.baidu.com').then(function (tls) {
                var local = classifyLocal(localIps, histLocal);
                var env = classifyEnv(info.org);

                // DNS 泄漏：CF + 阿里 DoH + 服务器三方
                var domain = 'example.com';
                return Promise.all([
                    dohResolve('https://cloudflare-dns.com/dns-query?name=' + domain + '&type=A').catch(function () { return []; }),
                    dohResolve('https://dns.alidns.com/resolve?name=' + domain + '&type=A').catch(function () { return []; }),
                ]).then(function (res) {
                    var cfIps = res[0], aliIps = res[1];
                    var tasks = [];
                    if (cfIps.length) tasks.push(ipCountry(cfIps[0]).then(function (c) { return c; }));
                    if (aliIps.length) tasks.push(ipCountry(aliIps[0]).then(function (c) { return c; }));
                    return Promise.all(tasks).then(function (countries) {
                        var known = countries.filter(Boolean);
                        var dnsPass = known.length >= 2 ? known.every(function (c) { return c === known[0]; }) : known.length === 1;
                        var dnsDetail = known.length >= 2
                            ? '公共 DNS 解析一致（' + known.join(' / ') + '），无泄漏'
                            : known.length === 1
                                ? 'DNS 解析正常（' + known[0] + '）'
                                : 'DNS 解析服务暂不可用';

                        // 设备 IP 项（天隼）：展示公网 IP / 归属 / 运营商
                        var ipDetail = '公网 IP：' + (info.ip || '未知')
                            + ' · 归属：' + [info.country, info.region, info.city].filter(Boolean).join(' / ') || '未知'
                            + ' · 运营商：' + (info.org || '未知');

                        var items = [
                            { key: 'ip',    weight: 10, label: '设备公网 IP 识别', pass: !!info.ip, detail: ipDetail, icon: 'fluent:globe-location-20-regular' },
                            { key: 'mitm',  weight: 25, label: '中间人劫持检测（TLS 指纹）', pass: tls.trusted_match === true, detail: tls.trusted_match === true ? 'TLS 指纹与官方一致（' + (tls.issuer || '') + '）' : (tls.trusted_match === false ? 'TLS 指纹不一致，疑似劫持' : 'TLS 检测暂不可用'), icon: 'fluent:shield-lock-20-regular' },
                            { key: 'env',   weight: 15, label: '网络环境', pass: env.pass, detail: env.detail, icon: 'fluent:building-20-regular' },
                            { key: 'dns',   weight: 20, label: 'DNS 泄漏', pass: dnsPass, detail: dnsDetail, icon: 'fluent:globe-20-regular' },
                            { key: 'local', weight: 20, label: '内网稳定性（多次测量）', pass: local.pass, detail: local.detail, icon: 'fluent:home-20-regular' },
                            { key: 'proxy', weight: 10, label: '代理 / VPN 识别', pass: !!info.ip, detail: '连接状态正常（通过公网可达检测）', icon: 'fluent:shield-20-regular' },
                        ];

                        var score = 0;
                        items.forEach(function (it) { if (it.pass) score += it.weight; });

                        var lv = levelOf(score);
                        var report = {
                            ts: Date.now(),
                            ip: info.ip,
                            org: info.org,
                            score: score,
                            levelCls: lv.cls,
                            levelLabel: lv.label,
                            items: items.map(function (it) {
                                return { label: it.label, icon: it.icon, pass: it.pass, detail: it.detail };
                            }),
                        };

                        renderReport(report);
                        leaveDetecting();
                        renderHistory();
                        // 结果确认弹窗（Web 沙箱提示）
                        showConfirm({
                            title: '检测说明',
                            text: '本次检测基于 Web 沙箱，无法获取系统底层状态，结果可能存在差异。若你对当前的上网自由与隐私感到担忧，建议寻求更专业的网络安全检测工具，或安装额外的安全软件（如卡巴斯基）来防范审查与监控。',
                            confirmText: '我已知晓',
                            cancelText: '',
                        });
                    });
                });
            });
        });
    }

    /* ================= 渲染报告 ================= */
    function renderReport(r) {
        resultEl.hidden = false;
        badgeEl.className = 'report-badge ' + r.levelCls;
        badgeEl.innerHTML = '<iconify-icon icon="' +
            (r.levelCls === 'lv-danger' ? 'fluent:error-circle-20-regular'
                : r.levelCls === 'lv-orange' || r.levelCls === 'lv-warn' ? 'fluent:warning-20-regular'
                : 'fluent:shield-checkmark-20-regular') + '"></iconify-icon>' + r.levelLabel;
        scoreEl.className = 'report-score ' + r.levelCls;
        scoreEl.textContent = r.score;
        ipEl.textContent = '检测设备 IP：' + (r.ip || '未知') + (r.org ? ' · ' + r.org : '');
        timeEl.textContent = '检测时间：' + fmtTime(r.ts);

        listEl.innerHTML = '';
        r.items.forEach(function (it) {
            var li = document.createElement('li');
            li.className = 'report-item ' + (it.pass ? 'pass' : 'fail');
            li.innerHTML =
                '<span class="report-icon"><iconify-icon icon="' +
                (it.pass ? 'fluent:checkmark-circle-20-filled' : 'fluent:dismiss-circle-20-filled') +
                '"></iconify-icon></span>' +
                '<div class="report-body">' +
                '<div class="report-label"><iconify-icon icon="' + it.icon + '"></iconify-icon>' + it.label + '</div>' +
                '<div class="report-detail"></div>' +
                '</div>' +
                '<span class="report-state">' + (it.pass ? '通过' : '未通过') + '</span>';
            li.querySelector('.report-detail').textContent = it.detail;
            listEl.appendChild(li);
        });
    }

    function fmtTime(ts) {
        var d = new Date(ts);
        function p(n) { return (n < 10 ? '0' : '') + n; }
        return p(d.getFullYear()) + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
    }

    /* ================= 报告缓存（无上限） ================= */
    function loadReports() {
        try {
            var raw = localStorage.getItem(REPORTS_KEY);
            var d = raw ? JSON.parse(raw) : null;
            return (d && Array.isArray(d.reports)) ? d.reports : [];
        } catch (e) { return []; }
    }
    function saveReports(reports) {
        try { localStorage.setItem(REPORTS_KEY, JSON.stringify({ reports: reports })); }
        catch (e) { /* 忽略 */ }
    }

    function renderHistory() {
        var reports = loadReports().sort(function (a, b) { return b.ts - a.ts; });
        historyEl.innerHTML = '';
        if (!reports.length) {
            var empty = document.createElement('div');
            empty.className = 'history-empty';
            empty.textContent = '暂无历史报告';
            historyEl.appendChild(empty);
            return;
        }
        reports.forEach(function (r) {
            var item = document.createElement('div');
            item.className = 'history-item';
            var lv = r.levelCls || 'lv-ok';
            item.innerHTML =
                '<div class="hi-info">' +
                '<div class="hi-time"></div>' +
                '<div class="hi-meta"></div>' +
                '</div>' +
                '<div class="hi-score ' + lv + '"></div>' +
                '<div class="hi-actions">' +
                '<button type="button" class="hi-btn view" title="查看报告"><iconify-icon icon="fluent:eye-20-regular"></iconify-icon></button>' +
                '<button type="button" class="hi-btn del" title="删除"><iconify-icon icon="fluent:delete-20-regular"></iconify-icon></button>' +
                '</div>';
            item.querySelector('.hi-time').textContent = fmtTime(r.ts);
            item.querySelector('.hi-meta').textContent = (r.ip || '未知 IP') + (r.levelLabel ? ' · ' + r.levelLabel : '');
            item.querySelector('.hi-score').textContent = r.score + ' 分';
            item.querySelector('.hi-btn.view').addEventListener('click', function () { renderReport(r); });
            item.querySelector('.hi-btn.del').addEventListener('click', function () {
                showConfirm({
                    title: '删除报告',
                    text: '确定删除这条历史报告吗？',
                    confirmText: '删除',
                    onConfirm: function () {
                        var list = loadReports().filter(function (x) { return x.ts !== r.ts; });
                        saveReports(list);
                        renderHistory();
                    },
                });
            });
            historyEl.appendChild(item);
        });
    }

    /* ================= 导出图片 ================= */
    function exportImage() {
        // 用 canvas 重绘报告（文本与色块，保证导出清晰）
        var canvas = document.createElement('canvas');
        var dpr = 2;
        var W = 720, H = 980;
        canvas.width = W * dpr; canvas.height = H * dpr;
        var ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        // 背景
        var bg = ctx.createLinearGradient(0, 0, W, H);
        bg.addColorStop(0, '#0f0a24');
        bg.addColorStop(0.5, '#1a1236');
        bg.addColorStop(1, '#0c1a33');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        // 标题
        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 30px sans-serif';
        ctx.fillText('Aegis 智能检测报告', 40, 60);

        // 分数
        var score = parseInt(scoreEl.textContent, 10) || 0;
        ctx.fillStyle = '#a5f3fc';
        ctx.font = 'bold 72px sans-serif';
        ctx.fillText(String(score), 40, 170);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '18px sans-serif';
        ctx.fillText('智能安全评分 / 100', 40, 200);

        // 等级徽章
        var lv = levelOf(score);
        var lvColor = lv.cls === 'lv-ok' ? '#34d399' : lv.cls === 'lv-warn' ? '#fbbf24' : lv.cls === 'lv-orange' ? '#fb923c' : '#f87171';
        ctx.fillStyle = lvColor;
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('等级：' + lv.label, 40, 240);

        // IP
        ctx.fillStyle = '#94a3b8';
        ctx.font = '16px sans-serif';
        var ip = ipEl.textContent || '';
        ctx.fillText(ip, 40, 278);

        // 分隔线
        ctx.strokeStyle = 'rgba(148,163,184,0.3)';
        ctx.beginPath(); ctx.moveTo(40, 300); ctx.lineTo(W - 40, 300); ctx.stroke();

        // 检查项
        var items = listEl.querySelectorAll('.report-item');
        var y = 330;
        items.forEach(function (li) {
            var label = li.querySelector('.report-label').textContent.trim();
            var detail = li.querySelector('.report-detail').textContent;
            var pass = li.classList.contains('pass');
            ctx.fillStyle = pass ? '#34d399' : '#f87171';
            ctx.font = 'bold 16px sans-serif';
            ctx.fillText((pass ? '✓' : '✗') + '  ' + label, 40, y);
            ctx.fillStyle = '#94a3b8';
            ctx.font = '13px sans-serif';
            ctx.fillText(detail, 60, y + 24);
            y += 60;
        });

        // 页脚
        ctx.fillStyle = '#64748b';
        ctx.font = '13px sans-serif';
        ctx.fillText('Hermes · Aegis · ' + fmtTime(Date.now()), 40, H - 40);

        // 下载
        var a = document.createElement('a');
        a.download = 'aegis-intel-report-' + Date.now() + '.png';
        a.href = canvas.toDataURL('image/png');
        a.click();
    }

    /* ================= 状态切换 ================= */
    function enterDetecting() {
        hero.classList.add('is-detecting');
        intro.classList.add('is-fading');
        detecting.hidden = false;
        btn.disabled = true;
    }
    function leaveDetecting() {
        hero.classList.remove('is-detecting');
        intro.classList.remove('is-fading');
        detecting.hidden = true;
        btn.disabled = false;
    }

    /* ================= 事件绑定 ================= */
    btn.addEventListener('click', run);
    againBtn.addEventListener('click', run);
    saveBtn.addEventListener('click', function () {
        // 保存当前报告到历史
        var score = parseInt(scoreEl.textContent, 10) || 0;
        var lv = levelOf(score);
        var reports = loadReports();
        var items = [];
        listEl.querySelectorAll('.report-item').forEach(function (li) {
            items.push({
                label: li.querySelector('.report-label').textContent.trim(),
                icon: 'fluent:info-20-regular',
                pass: li.classList.contains('pass'),
                detail: li.querySelector('.report-detail').textContent,
            });
        });
        reports.push({
            ts: Date.now(),
            ip: ipEl.textContent.replace(/.*IP：/, '').split('·')[0].trim(),
            org: '',
            score: score,
            levelCls: lv.cls,
            levelLabel: lv.label,
            items: items,
        });
        saveReports(reports);
        renderHistory();
        showConfirm({
            title: '已保存报告',
            text: '报告已保存到历史记录，可在下方随时调出或导出。',
            confirmText: '好的',
        });
    });
    exportBtn.addEventListener('click', exportImage);
    clearAllBtn.addEventListener('click', function () {
        var count = loadReports().length;
        if (!count) return;
        showConfirm({
            title: '删除全部报告',
            text: '确定删除全部 ' + count + ' 条历史报告吗？此操作不可恢复。',
            confirmText: '全部删除',
            onConfirm: function () {
                saveReports([]);
                renderHistory();
            },
        });
    });

    /* ================= 初始化 ================= */
    renderHistory();
})();
