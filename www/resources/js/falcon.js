/**
 * falcon.js — 天隼 页面逻辑（纯前端，不依赖服务器）
 * 类别：页面
 * 职责：获取访问者公网 IP 与服务商信息（多数据源依次兜底）
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

    function run() {
        btn.disabled = true;
        btn.textContent = '正在获取 …';
        result.innerHTML = '<div class="ip-placeholder">正在查询公网 IP…</div>';

        query().then(function (info) {
            btn.disabled = false;
            btn.textContent = '重新获取';
            result.innerHTML = '';

            var ip = document.createElement('div');
            ip.className = 'ip-value';
            ip.textContent = info.ip;

            var meta = document.createElement('div');
            meta.className = 'ip-meta';
            meta.textContent = info.isp;

            result.appendChild(ip);
            result.appendChild(meta);
        }).catch(function () {
            btn.disabled = false;
            btn.textContent = '获取失败，重试';
            result.innerHTML = '<div class="ip-placeholder">获取失败：网络不可用或服务暂不可用</div>';
        });
    }

    btn.addEventListener('click', run);
})();
