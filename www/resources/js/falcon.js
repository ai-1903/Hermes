/**
 * falcon.js — 天隼 页面逻辑（纯前端，不依赖服务器）
 * 类别：页面
 * 职责：获取访问者公网 IP 与服务商信息（多数据源依次兜底），
 *       以带图标表头的 <table> 展示结果。
 */
(function () {
    'use strict';

    var btn    = document.getElementById('fc-btn');
    var result = document.getElementById('fc-result');

    var PROVIDERS = [
        {
            url: 'https://ipapi.co/json/',
            pick: function (d) {
                return {
                    ip: d.ip,
                    isp: [d.org, d.city, d.region, d.country_name].filter(Boolean).join(' · '),
                };
            },
        },
        {
            url: 'https://ipinfo.io/json',
            pick: function (d) {
                return {
                    ip: d.ip,
                    isp: [d.org, d.city, d.region, d.country].filter(Boolean).join(' · '),
                };
            },
        },
        {
            url: 'https://api.ipify.org?format=json',
            pick: function (d) {
                return { ip: d.ip, isp: '（未获取到服务商信息）' };
            },
        },
    ];

    function query() {
        return PROVIDERS.reduce(function (chain, p) {
            return chain.catch(function () {
                return fetch(p.url)
                    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
                    .then(function (d) { return p.pick(d); });
            });
        }, Promise.reject());
    }

    function renderTable(ip, isp) {
        var wrap = document.createElement('div');
        wrap.className = 'tool-table-wrap';
        var table = document.createElement('table');
        table.className = 'tool-table';
        var thead = document.createElement('thead');
        var trH = document.createElement('tr');
        var thA = document.createElement('th');
        thA.innerHTML = '<span class="th-inner"><iconify-icon icon="fluent:globe-20-filled"></iconify-icon> 公网 IP</span>';
        var thB = document.createElement('th');
        thB.innerHTML = '<span class="th-inner"><iconify-icon icon="fluent:building-bank-20-filled"></iconify-icon> 服务商</span>';
        trH.appendChild(thA);
        trH.appendChild(thB);
        thead.appendChild(trH);
        table.appendChild(thead);
        var tbody = document.createElement('tbody');
        var tr = document.createElement('tr');
        var tdA = document.createElement('td');
        tdA.textContent = ip;
        var tdB = document.createElement('td');
        tdB.textContent = isp;
        tr.appendChild(tdA);
        tr.appendChild(tdB);
        tbody.appendChild(tr);
        table.appendChild(tbody);
        wrap.appendChild(table);
        return wrap;
    }

    function run() {
        btn.disabled = true;
        btn.textContent = '正在获取 …';
        result.innerHTML = '<div class="ip-placeholder">正在查询公网 IP…</div>';

        query().then(function (info) {
            btn.disabled = false;
            btn.textContent = '重新获取';
            result.innerHTML = '';
            result.appendChild(renderTable(info.ip, info.isp));
        }).catch(function () {
            btn.disabled = false;
            btn.textContent = '获取失败，重试';
            result.innerHTML = '<div class="ip-placeholder">获取失败：网络不可用或服务暂不可用</div>';
        });
    }

    btn.addEventListener('click', run);
})();
