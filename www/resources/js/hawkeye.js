/**
 * hawkeye.js — Hawkeye 页面逻辑（纯前端 RDAP 查询，不依赖服务器）
 * 类别：页面
 * 依赖：lib/network.js
 * 职责：仅支持根域名；通过公共 RDAP 服务查询 Whois 信息并列表展示
 *
 * 说明：浏览器 JS 无法直连 43 端口，改用支持 CORS 的公共 RDAP 服务
 *       （rdap.org 按 TLD 路由；备选 Verisign 的 com/net 端点）。
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

    /** 将 RDAP 结果映射为 Whois 键值列表 */
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

    function renderRows(rows) {
        result.innerHTML = '';
        if (!rows.length) { showMsg('未查询到可展示的 Whois 信息'); return; }
        var list = document.createElement('ul');
        list.className = 'whois-list';
        rows.forEach(function (r) {
            var li = document.createElement('li');
            var k = document.createElement('span');
            k.className = 'k';
            k.textContent = r.k;
            var v = document.createElement('span');
            v.className = 'v';
            if (r.html) { v.innerHTML = r.v; } else { v.textContent = r.v; }
            li.appendChild(k);
            li.appendChild(v);
            list.appendChild(li);
        });
        result.appendChild(list);
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
            renderRows(mapWhois(data));
        }).catch(function () {
            btn.disabled = false;
            showMsg('未能查询到 ' + value + ' 的 Whois 信息（域名可能不存在或服务暂不可用）');
        });
    }

    btn.addEventListener('click', run);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); });
})();
