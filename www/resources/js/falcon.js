/**
 * falcon.js — 天隼 页面逻辑（纯前端，不依赖服务器）
 * 类别：页面
 * 职责：
 *   1. 打开页面自动获取公网 IP（多数据源依次兜底）
 *   2. 展示巨大 IP + 服务商信息 + 标签（服务商通识名称 / 网络环境 / 泛地区）
 *   3. localStorage 记录近期此设备出站用过的 IP：上次使用时间 + 打开天隼次数
 */
(function () {
    'use strict';

    var ipEl     = document.getElementById('fc-ip');
    var ispEl    = document.getElementById('fc-isp');
    var tagsEl   = document.getElementById('fc-tags');
    var historyEl = document.getElementById('fc-history');

    var HISTORY_KEY = 'hermes_falcon_ip_history';
    var HISTORY_MAX = 20;

    /* ---------- 数据源（依次兜底） ---------- */
    var PROVIDERS = [
        {
            url: 'https://ipapi.co/json/',
            pick: function (d) {
                return {
                    ip: d.ip,
                    org: d.org,
                    city: d.city,
                    region: d.region,
                    country: d.country_name || d.country_code,
                };
            },
        },
        {
            url: 'https://ipinfo.io/json',
            pick: function (d) {
                return {
                    ip: d.ip,
                    org: d.org,
                    city: d.city,
                    region: d.region,
                    country: d.country,
                };
            },
        },
        {
            url: 'https://api.ipify.org?format=json',
            pick: function (d) {
                return { ip: d.ip, org: '', city: '', region: '', country: '' };
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

    /* ---------- 服务商通识名称（剥离 ASN 前缀） ---------- */
    function cleanOrg(org) {
        if (!org) return '';
        return String(org).replace(/^AS\d+\s*/i, '').trim();
    }

    /* ---------- 网络环境判定（托管关键字启发式） ---------- */
    var DATACENTER_RE = /Amazon|AWS|Microsoft|Azure|Google|GCP|Oracle|Oracle Cloud|DigitalOcean|Linode|Vultr|Hetzner|OVH|Scaleway|Cloudflare|Akamai|Fastly|Alibaba|Tencent Cloud|Huawei|G-Core|Leaseweb|Contabo|Rackspace|IBM Cloud|CoreSite|Equinix|M247/i;

    function classifyEnv(info) {
        var org = info.org || '';
        if (!org) return 'unknown';
        return DATACENTER_RE.test(org) ? 'datacenter' : 'home';
    }

    var ENV_META = {
        'datacenter': { label: '网络环境', value: '数据中心 / 托管', cls: 'env-datacenter', icon: 'fluent:server-20-regular' },
        'home':       { label: '网络环境', value: '家庭 / 移动宽带', cls: 'env-home',       icon: 'fluent:home-20-regular' },
        'unknown':    { label: '网络环境', value: '无法判断',         cls: 'env-unknown',    icon: 'fluent:question-circle-20-regular' },
    };

    /* ---------- 标签渲染 ---------- */
    function addTag(container, label, value, icon) {
        if (!value) return;
        var tag = document.createElement('span');
        tag.className = 'ip-tag';
        tag.innerHTML =
            '<iconify-icon icon="' + icon + '"></iconify-icon>' +
            '<span class="tag-label">' + label + '</span>' +
            '<span class="tag-value"></span>';
        tag.querySelector('.tag-value').textContent = value;
        container.appendChild(tag);
    }

    function renderHero(info) {
        ipEl.classList.remove('loading');
        ipEl.textContent = info.ip || '—';
        ispEl.textContent = info.org || '';
        tagsEl.innerHTML = '';

        // 服务商通识名称
        var org = cleanOrg(info.org);
        addTag(tagsEl, '服务商', org, 'fluent:building-bank-20-regular');

        // 网络环境（代理 / 托管判定）
        var env = ENV_META[classifyEnv(info)];
        var envTag = document.createElement('span');
        envTag.className = 'ip-tag ' + env.cls;
        envTag.innerHTML =
            '<iconify-icon icon="' + env.icon + '"></iconify-icon>' +
            '<span class="tag-label">' + env.label + '</span>' +
            '<span class="tag-value"></span>';
        envTag.querySelector('.tag-value').textContent = env.value;
        tagsEl.appendChild(envTag);

        // 泛地区（精确到州 / 省）
        var region = [info.country, info.region, info.city]
            .filter(Boolean).join(' · ');
        addTag(tagsEl, '地区', region, 'fluent:map-20-regular');
    }

    /* ---------- 出站 IP 历史（localStorage） ---------- */
    function getHistory() {
        try {
            var h = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
            return Array.isArray(h) ? h : [];
        } catch (e) { return []; }
    }
    function saveHistory(items) {
        try {
            localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, HISTORY_MAX)));
        } catch (e) { /* 存储满 / 禁用时静默忽略 */ }
    }
    function upsertHistory(ip) {
        var h = getHistory();
        var now = Date.now();
        var found = h.filter(function (r) { return r.ip === ip; });
        if (found.length) {
            var rec = found[0];
            rec.count += 1;
            rec.lastSeen = now;
            h = h.filter(function (r) { return r.ip !== ip; });
            h.unshift(rec);
        } else {
            h.unshift({ ip: ip, count: 1, lastSeen: now });
        }
        saveHistory(h);
        return h;
    }

    /* ---------- 相对时间 ---------- */
    function relTime(ts) {
        var diff = Math.floor((Date.now() - ts) / 1000);
        if (diff < 60) return '刚刚';
        if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
        if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前';
        if (diff < 86400 * 7) return Math.floor(diff / 86400) + ' 天前';
        var d = new Date(ts);
        function p(n) { return (n < 10 ? '0' : '') + n; }
        return p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
    }

    function renderHistory() {
        var h = getHistory().sort(function (a, b) { return b.lastSeen - a.lastSeen; });
        historyEl.innerHTML = '';
        if (!h.length) {
            var empty = document.createElement('li');
            empty.className = 'fc-history-empty';
            empty.textContent = '暂无出站 IP 记录（打开天隼获取到 IP 后将自动记录）';
            historyEl.appendChild(empty);
            return;
        }
        h.forEach(function (r) {
            var li = document.createElement('li');
            li.className = 'fc-history-item';

            var ip = document.createElement('span');
            ip.className = 'fc-history-ip';
            ip.textContent = r.ip;

            var count = document.createElement('span');
            count.className = 'fc-history-count';
            count.innerHTML =
                '<iconify-icon icon="fluent:eye-20-regular"></iconify-icon>' +
                '<span></span>';
            count.querySelector('span').textContent = r.count + ' 次';
            count.title = '近期打开天隼的次数';

            var time = document.createElement('span');
            time.className = 'fc-history-time';
            time.textContent = '上次使用：' + relTime(r.lastSeen);
            time.title = new Date(r.lastSeen).toLocaleString();

            li.appendChild(ip);
            li.appendChild(count);
            li.appendChild(time);
            historyEl.appendChild(li);
        });
    }

    /* ---------- 初始化（自动获取） ---------- */
    function init() {
        renderHistory();

        query().then(function (info) {
            renderHero(info);
            upsertHistory(info.ip || '—');
            renderHistory();
        }).catch(function () {
            ipEl.classList.remove('loading');
            ipEl.textContent = '获取失败';
            ispEl.textContent = '网络不可用或服务暂不可用，请稍后重试';
            tagsEl.innerHTML = '';
        });
    }

    init();
})();
