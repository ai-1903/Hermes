/**
 * online-test.js — Online Test 页面逻辑（纯前端）
 * 类别：页面
 * 依赖：lib/network.js
 * 职责：
 *   1. 协议选项卡切换、输入校验、在线探测
 *   2. 根域名自动双测（www. + 裸域），记录合并为一条「*.XXX.XX」
 *   3. 通配符查询（*.XXX.XX）：动态逐条显示子域检测结果
 *   4. Cookie 历史记录（≤20 条）：重复查询去重置顶、单条删除
 */
(function () {
    'use strict';

    var N = window.Hermes.Network;
    var HISTORY_KEY = 'hermes_online_history';
    var HISTORY_MAX = 20;

    var input       = document.getElementById('ot-input');
    var btn         = document.getElementById('ot-btn');
    var result      = document.getElementById('ot-result');
    var historyList = document.getElementById('ot-history');
    var protoTabs   = Array.prototype.slice.call(document.querySelectorAll('.proto-tab'));
    var currentProto = 'https';

    /* ---------- 协议选项卡 ---------- */
    protoTabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
            protoTabs.forEach(function (t) { t.classList.remove('active'); });
            tab.classList.add('active');
            currentProto = tab.dataset.proto || 'https';
        });
    });

    /* ---------- Cookie 历史记录 ---------- */
    function getHistory() {
        var h = N.cookieGet(HISTORY_KEY);
        return Array.isArray(h) ? h : [];
    }
    function saveHistory(items) {
        N.cookieSet(HISTORY_KEY, items.slice(0, HISTORY_MAX), 30);
    }
    /** 记录唯一键（同 proto+host 视为同一条，用于去重置顶） */
    function recKey(rec) {
        return (rec.proto || '') + '|' + (rec.host || '');
    }
    /** 插入记录：已存在则移到顶部并更新时间，否则新增到顶部 */
    function upsertHistory(record) {
        var key = recKey(record);
        var h = getHistory().filter(function (r) { return recKey(r) !== key; });
        h.unshift(record);
        saveHistory(h);
    }
    function now() {
        var d = new Date();
        function p(n) { return (n < 10 ? '0' : '') + n; }
        return p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' +
               p(d.getHours()) + ':' + p(d.getMinutes());
    }

    /* ---------- 历史记录渲染 ---------- */
    function renderHistory() {
        var h = getHistory();
        historyList.innerHTML = '';
        if (!h.length) {
            var empty = document.createElement('li');
            empty.className = 'history-empty';
            empty.textContent = '暂无查询记录';
            historyList.appendChild(empty);
            return;
        }
        h.forEach(function (rec) {
            var li = document.createElement('li');
            li.className = 'history-item';

            var proto = document.createElement('span');
            proto.className = 'history-proto';
            proto.textContent = (rec.proto || 'https').toUpperCase();

            var host = document.createElement('span');
            host.className = 'history-host';
            host.textContent = rec.host;
            host.title = '点击重新查询';
            host.addEventListener('click', function () {
                input.value = rec.host;
                run();
            });

            var label = N.statusLabel(rec.status);
            var status = document.createElement('span');
            status.className = 'history-status st ' + label.cls;
            status.textContent = label.text;

            var time = document.createElement('span');
            time.className = 'history-time';
            time.textContent = rec.time || '';

            var del = document.createElement('button');
            del.className = 'history-del';
            del.type = 'button';
            del.title = '删除该记录';
            del.setAttribute('aria-label', '删除 ' + rec.host);
            del.textContent = '×';
            del.addEventListener('click', function (e) {
                e.stopPropagation();
                // 修复：用 host + proto 匹配删除（而非对象引用比较）
                var key = recKey(rec);
                var list = getHistory().filter(function (r) { return recKey(r) !== key; });
                saveHistory(list);
                renderHistory();
            });

            li.appendChild(proto);
            li.appendChild(host);
            li.appendChild(status);
            li.appendChild(time);
            li.appendChild(del);
            historyList.appendChild(li);
        });
    }

    /* ---------- 结果渲染（普通/根域） ---------- */
    function renderResult(items) {
        result.innerHTML = '';
        if (!items.length) return;
        var list = document.createElement('ul');
        list.className = 'result-lines';
        items.forEach(function (it) {
            var li = document.createElement('li');
            var h = document.createElement('span');
            h.className = 'host';
            h.textContent = it.host;
            var label = N.statusLabel(it.status);
            var s = document.createElement('span');
            s.className = 'st ' + label.cls;
            s.textContent = label.text;
            li.appendChild(h);
            li.appendChild(s);
            list.appendChild(li);
        });
        result.appendChild(list);
    }

    /**
     * 通配符查询（*.AB.XXX）：
     * 逐个尝试常见子域，探测出一个即动态插入一条，直到全部完成。
     */
    function runWildcard(wildHost) {
        var root = N.wildcardRoot(wildHost);
        result.innerHTML = '';
        var list = document.createElement('ul');
        list.className = 'result-lines';
        result.appendChild(list);

        var info = document.createElement('div');
        info.className = 'wild-loading';
        info.textContent = '正在探测 ' + wildHost + ' 的子域（结果将逐条显示）…';
        result.appendChild(info);

        var found = 0;
        var t = now();

        var hosts = N.SUBDOMAINS.map(function (s) { return s + '.' + root; });
        return hosts.reduce(function (chain, host) {
            return chain.then(function () {
                return N.detectStatus(currentProto, host).then(function (status) {
                    if (status === 'online' || status === 'local-online') {
                        found++;
                        var li = document.createElement('li');
                        var h = document.createElement('span');
                        h.className = 'host';
                        h.textContent = host;
                        var label = N.statusLabel(status);
                        var s = document.createElement('span');
                        s.className = 'st ' + label.cls;
                        s.textContent = label.text;
                        li.appendChild(h);
                        li.appendChild(s);
                        list.appendChild(li);
                        upsertHistory({
                            proto: currentProto,
                            host: host,
                            status: status,
                            time: t,
                        });
                    }
                    renderHistory();
                });
            });
        }, Promise.resolve()).then(function () {
            info.textContent = found
                ? '探测完成，共发现 ' + found + ' 个在线子域'
                : '未发现在线子域（纯前端受限，仅探测常见子域字典）';
        });
    }

    /* ---------- 执行检测 ---------- */
    function run() {
        var value = input.value.trim();
        result.innerHTML = '';
        if (!value) return;

        // 通配符：*.AB.XXX
        if (N.isWildcard(value)) {
            var w = value.toLowerCase();
            btn.disabled = true;
            runWildcard(w).then(function () { btn.disabled = false; });
            return;
        }

        if (!N.isValidHost(value)) {
            var err = document.createElement('div');
            err.className = 'result-summary st-offline';
            err.textContent = '输入无效：请输入域名或 IP 地址（禁止包含 /）';
            result.appendChild(err);
            return;
        }

        // 本地回环：直接显示，不探测
        if (N.isIPv4(value) && N.isLoopback(value)) {
            var sum = document.createElement('div');
            sum.className = 'result-summary st-loopback';
            sum.textContent = '本地回环';
            result.appendChild(sum);
            upsertHistory({ proto: currentProto, host: value, status: 'loopback', time: now() });
            renderHistory();
            return;
        }

        var isRoot = N.isRootDomain(value);
        var hosts = [value.toLowerCase()];
        if (isRoot) {
            // 根域名：同时测试 www. 与裸域，历史记录合并为一条「*.XXX.XX」
            hosts = ['www.' + value.toLowerCase(), value.toLowerCase()];
        }

        btn.disabled = true;
        var loading = document.createElement('div');
        loading.className = 'history-loading';
        loading.textContent = '正在检测 ' + hosts.join('、') + ' …';
        result.appendChild(loading);

        Promise.all(hosts.map(function (host) {
            return N.detectStatus(currentProto, host).then(function (status) {
                return { host: host, status: status };
            });
        })).then(function (items) {
            btn.disabled = false;
            renderResult(items);
            var t = now();
            if (isRoot) {
                // 合并为一条：*.XXX.XX，状态取任一在线即「在线」
                var anyOnline = items.some(function (it) {
                    return it.status === 'online' || it.status === 'local-online';
                });
                var merged = {
                    proto: currentProto,
                    host: '*.' + value.toLowerCase(),
                    status: anyOnline ? 'online' : 'offline',
                    time: t,
                };
                upsertHistory(merged);
            } else {
                items.forEach(function (it) {
                    upsertHistory({
                        proto: currentProto,
                        host: it.host,
                        status: it.status,
                        time: t,
                    });
                });
            }
            renderHistory();
        });
    }

    btn.addEventListener('click', run);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); });

    renderHistory();
})();
