/**
 * falcon.js — 天隼 页面逻辑（纯前端，不依赖服务器）
 * 类别：页面
 * 职责：
 *   1. 打开页面自动获取公网 IP（多数据源依次兜底）
 *   2. 展示巨大 IP + 服务商信息 + 标签（服务商通识名称 / 网络环境 / 泛地区）
 *   3. 运营商通识名称识别：加载 data/json/isp-dict.json 字典，
 *      按「精确匹配 → 关键词包含匹配 → 默认兜底」识别
 *   4. localStorage 记录近期此设备出站用过的 IP：上次使用时间 + 打开天隼次数
 */
(function () {
    'use strict';

    var ipEl      = document.getElementById('fc-ip');
    var ispEl     = document.getElementById('fc-isp');
    var tagsEl    = document.getElementById('fc-tags');
    var historyEl = document.getElementById('fc-history');

    var HISTORY_KEY = 'hermes_falcon_ip_history';
    var HISTORY_MAX = 20;
    var DICT_URL    = 'data/json/isp-dict.json';

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

    /**
     * 补充 org：主数据源（如 ipapi.co）可能不返回 org，或级联兜底落到
     * ipify（无 org 字段），导致网络环境「无法判断」。
     * 这里用 ipinfo.io 二次查询补齐 org / 地区信息。
     */
    function enrichOrg(info) {
        if (info.org) return Promise.resolve(info);
        return fetch('https://ipinfo.io/json')
            .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
            .then(function (d) {
                if (!info.org) info.org = d.org || '';
                if (!info.city) info.city = d.city || '';
                if (!info.region) info.region = d.region || '';
                if (!info.country) info.country = d.country || '';
                return info;
            })
            .catch(function () { return info; });
    }

    /* ---------- 运营商通识名称识别字典 ---------- */
    var dictCache = null;

    /** 加载字典（data/json/isp-dict.json），失败返回 null（不影响主流程） */
    function loadDict() {
        if (dictCache) return Promise.resolve(dictCache);
        return fetch(DICT_URL, { cache: 'no-store' })
            .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
            .then(function (d) {
                dictCache = d;
                return d;
            })
            .catch(function () { return null; });
    }

    /** 归一化：小写 + 折叠空白（中文关键词也适用） */
    function norm(s) {
        return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
    }

    /**
     * 从字典识别运营商通识名称。
     * @param {string} org 原始 org 字符串（如 "AS9808 China Mobile Communications Corporation"）
     * @param {object} dict 字典对象（可能为 null）
     * @returns {string|null} 通识名称；识别不到返回 null（由调用方兜底显示原始信息）
     *
     * 匹配策略（保证最具体者优先，避免短关键词误伤）：
     *   1. 精确匹配：整段归一化后与关键词完全相等
     *   2. 关键词包含匹配：按关键词长度降序（更具体的关键词优先匹配，
     *      如 "china mobile hong kong" 优先于 "china mobile"）
     */
    function lookupISP(org, dict) {
        if (!dict || !org) return null;
        var n = norm(org);

        // 展平所有 (关键词, 通识名) 对
        var pairs = [];
        var categories = dict.categories || [];
        for (var i = 0; i < categories.length; i++) {
            var entries = categories[i].entries || [];
            for (var j = 0; j < entries.length; j++) {
                var keys = entries[j].keys || [];
                for (var k = 0; k < keys.length; k++) {
                    var kn = norm(keys[k]);
                    if (kn) pairs.push({ kn: kn, name: entries[j].name });
                }
            }
        }

        // 1) 精确匹配
        for (var a = 0; a < pairs.length; a++) {
            if (n === pairs[a].kn) return pairs[a].name;
        }

        // 2) 关键词包含匹配：长度降序，更具体者优先
        pairs.sort(function (x, y) { return y.kn.length - x.kn.length; });
        for (var b = 0; b < pairs.length; b++) {
            if (n.indexOf(pairs[b].kn) !== -1) return pairs[b].name;
        }

        return null;
    }

    /** 服务商通识名称（优先字典，找不到则剥离 ASN 前缀返回原始信息） */
    function ispName(org, dict) {
        var known = lookupISP(org, dict);
        if (known) return known;
        // 默认兜底：剥离 ASN 前缀
        return String(org || '').replace(/^AS\d+\s*/i, '').trim();
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
        'unknown':    { label: '网络环境', value: '无法判断（服务商未知）', cls: 'env-unknown', icon: 'fluent:question-circle-20-regular' },
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

    function renderHero(info, dict) {
        ipEl.classList.remove('loading');
        ipEl.textContent = info.ip || '—';
        ispEl.textContent = info.org || '';
        tagsEl.innerHTML = '';

        // 服务商通识名称（字典识别，默认兜底原始信息）
        var org = ispName(info.org, dict);
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

    /* ---------- 初始化（自动获取 + 补充 org + 字典识别） ---------- */
    function init() {
        renderHistory();

        // 并行：加载字典 + 获取 IP（随后补充 org，避免「无法判断」）
        Promise.all([loadDict(), query()]).then(function (res) {
            var dict = res[0];
            var info = res[1];
            return enrichOrg(info).then(function (enriched) {
                renderHero(enriched, dict);
                upsertHistory(enriched.ip || '—');
                renderHistory();
            });
        }).catch(function () {
            ipEl.classList.remove('loading');
            ipEl.textContent = '获取失败';
            ispEl.textContent = '网络不可用或服务暂不可用，请稍后重试';
            tagsEl.innerHTML = '';
        });
    }

    init();
})();
