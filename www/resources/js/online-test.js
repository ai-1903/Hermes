/**
 * online-test.js — Online Test 页面逻辑（纯前端）
 * 类别：页面
 * 依赖：lib/network.js
 * 职责：协议选项卡切换、输入校验、在线探测、根域名双测、Cookie 历史记录（≤20 条）
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
    function pushHistory(record) {
        var h = getHistory();
        h.unshift(record);
        saveHistory(h);
    }
    function now() {
        var d = new Date();
        function p(n) { return (n < 10 ? '0' : '') + n; }
        return p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' +
               p(d.getHours()) + ':' + p(d.getMinutes());
    }

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
            del.textContent = '×';
            del.title = '删除该记录';
            del.addEventListener('click', function (e) {
                e.stopPropagation();
                var list = getHistory().filter(function (r) { return r !== rec; });
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

    /* ---------- 结果渲染 ---------- */
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

    /* ---------- 执行检测 ---------- */
    function run() {
        var value = input.value.trim();
        result.innerHTML = '';
        if (!value) return;

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
            pushHistory({ proto: currentProto, host: value, status: 'loopback', time: now() });
            renderHistory();
            return;
        }

        // 根域名（如 AB.XXX）→ 同时测试 www.AB.XXX 与 AB.XXX
        var hosts = [value.toLowerCase()];
        if (N.isRootDomain(value)) {
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
            items.forEach(function (it) {
                pushHistory({ proto: currentProto, host: it.host, status: it.status, time: t });
            });
            renderHistory();
        });
    }

    btn.addEventListener('click', run);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); });

    renderHistory();
})();
