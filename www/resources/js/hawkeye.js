/**
 * hawkeye.js — Hawkeye 页面逻辑（纯前端 RDAP 查询，不依赖服务器）
 * 类别：页面
 * 依赖：lib/network.js
 * 职责：仅支持根域名；通过公共 RDAP 服务查询 Whois 信息，以带图标表头的
 *       <table> 展示（表头图标来自 iconify:fluent）。
 */
(function () {
    'use strict';

    var N = window.Hermes.Network;
    var input  = document.getElementById('hw-input');
    var btn    = document.getElementById('hw-btn');
    var result = document.getElementById('hw-result');

    var RDAP_ENDPOINTS = [
        'https://rdap.org/domain/{domain}',
        'https://rdap.verisign.com/com/v1/domain/{domain}',
        'https://rdap.verisign.com/net/v1/domain/{domain}',
    ];

    /** 字段 → { label, icon }（fluent 图标） */
    var FIELD_META = {
        '域名':    { icon: 'fluent:globe-20-filled' },
        '注册商':  { icon: 'fluent:briefcase-20-filled' },
        '状态':    { icon: 'fluent:checkmark-circle-20-filled' },
        '注册时间': { icon: 'fluent:calendar-edit-20-filled' },
        '过期时间': { icon: 'fluent:calendar-arrow-right-20-filled' },
        '更新时间': { icon: 'fluent:clock-20-filled' },
        'Name Server': { icon: 'fluent:server-20-filled' },
        'DNSSEC': { icon: 'fluent:shield-checkmark-20-filled' },
    };

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    /** 依次尝试 RDAP 端点，任一成功即返回 */
    function query(domain) {
        return RDAP_ENDPOINTS.reduce(function (chain, endpoint) {
            return chain.catch(function () {
                var url = endpoint.replace('{domain}', encodeURIComponent(domain));
                return fetch(url, { headers: { 'Accept': 'application/rdap+json' } })
                    .then(function (r) {
                        if (!r.ok) throw new Error('HTTP ' + r.status);
                        return r.json();
                    });
            });
        }, Promise.reject());
    }

    /** 将 RDAP 结果映射为字段数组 */
    function mapWhois(data) {
        var rows = [];
        function row(k, v, isHtml) {
            if (v === undefined || v === null || v === '') return;
            rows.push({ k: k, v: v, html: !!isHtml });
        }

        var reg = (data.entities || []).find(function (e) {
            return e.roles && e.roles.indexOf('registrar') !== -1;
        });
        var regName = null;
        if (reg) {
            var vc = reg.vcardArray && reg.vcardArray[1];
            if (vc) {
                var fn = vc.find(function (x) { return x[0] === 'fn'; });
                if (fn) regName = fn[3];
            }
            if (!regName) regName = reg.handle;
        }

        function eventDate(action) {
            var evs = (data.events || []).filter(function (e) {
                return e.eventAction === action;
            });
            return evs.map(function (e) { return e.eventDate; }).join(', ');
        }

        row('域名', data.ldhName || data.handle);
        row('注册商', regName);
        row('状态', (data.status || []).join('、'));
        row('注册时间', eventDate('registration'));
        row('过期时间', eventDate('expiration'));
        row('更新时间', eventDate('last changed'));

        var ns = (data.nameservers || []).map(function (n) { return n.ldhName; });
        if (ns.length) {
            row('Name Server',
                ns.map(function (n) { return '<span class="ns-item">' + escapeHtml(n) + '</span>'; })
                  .join(''), true);
        }

        row('DNSSEC', data.secureDNS && data.secureDNS.delegationSigned ? '是' : '否');
        return rows;
    }

    function showMsg(msg, cls) {
        result.innerHTML = '';
        var d = document.createElement('div');
        d.className = cls || 'whois-empty';
        d.textContent = msg;
        result.appendChild(d);
    }

    /** 以表格渲染（表头带 iconify 图标） */
    function renderTable(rows) {
        result.innerHTML = '';
        if (!rows.length) { showMsg('未查询到可展示的 Whois 信息'); return; }

        var wrap = document.createElement('div');
        wrap.className = 'tool-table-wrap';

        var table = document.createElement('table');
        table.className = 'tool-table';

        var thead = document.createElement('thead');
        var trHead = document.createElement('tr');
        var thK = document.createElement('th');
        thK.innerHTML = '<span class="th-inner"><iconify-icon icon="fluent:tag-20-filled"></iconify-icon> 字段</span>';
        var thV = document.createElement('th');
        thV.innerHTML = '<span class="th-inner"><iconify-icon icon="fluent:info-20-filled"></iconify-icon> 内容</span>';
        trHead.appendChild(thK);
        trHead.appendChild(thV);
        thead.appendChild(trHead);
        table.appendChild(thead);

        var tbody = document.createElement('tbody');
        rows.forEach(function (r) {
            var meta = FIELD_META[r.k] || {};
            var tr = document.createElement('tr');
            var tdK = document.createElement('td');
            tdK.className = 'k';
            tdK.innerHTML =
                '<span class="field-cell">' +
                (meta.icon ? '<iconify-icon icon="' + meta.icon + '"></iconify-icon>' : '') +
                escapeHtml(r.k) + '</span>';
            var tdV = document.createElement('td');
            if (r.html) { tdV.innerHTML = r.v; } else { tdV.textContent = r.v; }
            tr.appendChild(tdK);
            tr.appendChild(tdV);
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);

        wrap.appendChild(table);
        result.appendChild(wrap);
    }

    function run() {
        var value = input.value.trim().toLowerCase();
        result.innerHTML = '';

        if (!N.isValidHost(value) || !N.isRootDomain(value)) {
            showMsg('请输入根域名（形如 AB.XXX），Hawkeye 仅支持根域名查询');
            return;
        }

        btn.disabled = true;
        var loading = document.createElement('div');
        loading.className = 'history-loading';
        loading.textContent = '正在查询 ' + value + ' 的 Whois 信息 …';
        result.appendChild(loading);

        query(value).then(function (data) {
            btn.disabled = false;
            renderTable(mapWhois(data));
        }).catch(function () {
            btn.disabled = false;
            showMsg('未能查询到 ' + value + ' 的 Whois 信息（域名可能不存在或服务暂不可用）');
        });
    }

    btn.addEventListener('click', run);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); });
})();
