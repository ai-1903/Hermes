/**
 * network.js — 网络检测共享库（纯前端）
 * 类别：lib / 共享工具
 * 提供：主机校验、IP 分类、连通性探测、状态映射、Cookie 工具
 *
 * 说明：浏览器 JS 无法发送真正的 ICMP PING，这里以 fetch(no-cors) 探测
 *       DNS/TCP 连通性作为「在线」判据（响应到达即视为可达）。
 */
(function (global) {
    'use strict';

    var Network = {};

    /** IPv4 正则 */
    var IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    /** 域名正则（不含协议、端口、路径；顶级段为字母） */
    var DOMAIN_RE = /^(?=.{1,253}$)([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

    /** 是否 IPv4 地址 */
    Network.isIPv4 = function (input) {
        var m = String(input || '').trim().match(IPV4_RE);
        if (!m) return false;
        return m.slice(1).every(function (n) {
            return parseInt(n, 10) >= 0 && parseInt(n, 10) <= 255;
        });
    };

    /** 是否合法主机（域名或 IP；禁止包含 /、空白） */
    Network.isValidHost = function (input) {
        var s = String(input || '').trim();
        if (!s || s.indexOf('/') !== -1 || /\s/.test(s)) return false;
        return Network.isIPv4(s) || DOMAIN_RE.test(s);
    };

    /** 端口正则（1-65535） */
    var PORT_RE = /^:([0-9]{1,5})$/;

    /**
     * 解析目标输入：分离主机与端口（域名 / IP 后允许 :端口）。
     * 仅屏蔽 / 这一字符；其余按常规域名 / IP 规则解析。
     * @param {string} input 用户输入
     * @returns {object|null} { host, port }；无效返回 null
     */
    Network.parseTarget = function (input) {
        var s = String(input || '').trim();
        if (!s || s.indexOf('/') !== -1 || /\s/.test(s)) return null;

        var host = s;
        var port = null;

        // 提取 :端口（IPv4 / 域名均可；无端口则原样）
        var m = s.match(/^(.*?)(:[0-9]{1,5})$/);
        if (m) {
            var p = parseInt(m[2].slice(1), 10);
            if (p >= 1 && p <= 65535) {
                host = m[1];
                port = p;
            }
        }

        if (!Network.isIPv4(host) && !DOMAIN_RE.test(host)) return null;
        return { host: host, port: port };
    };

    /** 构造探测 URL：带端口时拼接，否则默认协议端口 */
    Network.probeUrl = function (protocol, host, port) {
        var base = protocol + '://' + host;
        return port ? base + ':' + port : base;
    };

    /** 是否根域名（恰好两段，如 AB.XXX） */
    Network.isRootDomain = function (input) {
        var s = String(input || '').trim().toLowerCase();
        if (!DOMAIN_RE.test(s)) return false;
        return s.split('.').length === 2;
    };

    /** 是否回环地址（127.x.x.x） */
    Network.isLoopback = function (ip) {
        return Network.isIPv4(ip) && ip.split('.')[0] === '127';
    };

    /** 是否通配符域名（如 *.example.com / *.AB.XXX） */
    Network.isWildcard = function (input) {
        var s = String(input || '').trim().toLowerCase();
        if (s.indexOf('*') === -1) return false;
        if (s.indexOf('*') !== 0 || s.charAt(1) !== '.') return false; // 仅支持 * 前缀
        return DOMAIN_RE.test(s.slice(2));
    };

    /** 通配符域名对应的根域（*.a.b.c → a.b.c） */
    Network.wildcardRoot = function (input) {
        var s = String(input || '').trim().toLowerCase();
        return s.replace(/^\*\./, '');
    };

    /** 常见子域名字典（通配符探测候选） */
    Network.SUBDOMAINS = [
        'www', 'mail', 'webmail', 'ftp', 'blog', 'shop', 'store', 'api', 'app',
        'm', 'mobile', 'dev', 'staging', 'test', 'demo', 'cpanel', 'web', 'vpn',
        'portal', 'login', 'admin', 'support', 'help', 'docs', 'cdn', 'static',
        'img', 'images', 'media', 'video', 'download', 'forum', 'community',
        'news', 'status', 'track', 'gateway', 'portal2', 'shop2', 'secure',
        'sso', 'oauth', 'id', 'account', 'billing', 'pay', 'payment', 'git',
        'status', 'grafana', 'kibana', 'jenkins', 'ns1', 'ns2', 'ns3', 'dns',
    ];


    /** 是否内网 / 私有地址 */
    Network.isPrivateIP = function (ip) {
        if (!Network.isIPv4(ip)) return false;
        var p = ip.split('.').map(Number);
        if (p[0] === 10) return true;                       // 10.0.0.0/8
        if (p[0] === 192 && p[1] === 168) return true;      // 192.168.0.0/16
        if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true; // 172.16.0.0/12
        if (p[0] === 169 && p[1] === 254) return true;      // 169.254.0.0/16
        return false;
    };

    /**
     * 连通性探测：返回 Promise<boolean>（true = 可达）
     * 注：no-cors 模式下 fetch 在「连接成功」时即 resolve（含 403/404），
     *     仅在 DNS 失败 / 连接拒绝 / 超时时 reject。
     */
    /** 从 fetch 异常中提取可读网络错误码（Chrome 等在 cause.code 中暴露） */
    Network.errorCode = function (err) {
        if (err && err.cause && err.cause.code) return String(err.cause.code);
        if (err && err.code) return String(err.code);
        if (err && err.name === 'AbortError') return 'AbortError';
        if (err && /abort/i.test(err.message || '')) return 'AbortError';
        return 'UNKNOWN';
    };

    Network.probe = function (protocol, host, port, timeoutMs) {
        var timeout = timeoutMs || 6000;
        return new Promise(function (resolve) {
            var ctrl = new AbortController();
            var timer = setTimeout(function () { ctrl.abort(); }, timeout);
            fetch(Network.probeUrl(protocol, host, port), {
                method: 'GET',
                mode: 'no-cors',
                cache: 'no-store',
                redirect: 'follow',
                signal: ctrl.signal,
            }).then(function () {
                clearTimeout(timer);
                resolve({ ok: true, error: null });
            }).catch(function (err) {
                clearTimeout(timer);
                resolve({ ok: false, error: Network.errorCode(err) });
            });
        });
    };

    /**
     * 状态检测：按输入类型返回 { status, error }
     *   127.x → loopback（本地回环，不探测）
     *   内网 IP → local-online / local-offline
     *   其余 → online / offline
     * error：离线时为网络错误码（如 ERR_CONNECTION_REFUSED），在线/回环为 null
     */
    Network.detectStatus = function (protocol, host, port) {
        if (Network.isLoopback(host)) {
            return Promise.resolve({ status: 'loopback', error: null });
        }
        return Network.probe(protocol, host, port).then(function (res) {
            if (Network.isPrivateIP(host)) {
                return {
                    status: res.ok ? 'local-online' : 'local-offline',
                    error: res.error,
                };
            }
            return {
                status: res.ok ? 'online' : 'offline',
                error: res.error,
            };
        });
    };

    /* ---------- 域名解析（DNS-over-HTTPS） ---------- */

    /**
     * 通过 DoH（Cloudflare）解析域名的 A 记录，返回 IP 数组。
     * 若输入本身是 IPv4，则直接返回 [ip]。
     */
    Network.resolveDNS = function (host) {
        if (Network.isIPv4(host)) {
            return Promise.resolve([host]);
        }
        var url = 'https://cloudflare-dns.com/dns-query?name=' +
            encodeURIComponent(host) + '&type=A';
        return fetch(url, { headers: { 'Accept': 'application/dns-json' } })
            .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
            .then(function (d) {
                var ips = [];
                (d.Answer || []).forEach(function (a) {
                    if (a.type === 1 && a.data) ips.push(a.data);
                });
                return ips;
            });
    };

    /* ---------- IP 归属查询 ---------- */

    /** Cloudflare 代理判定关键字 */
    var CLOUDFLARE_RE = /Cloudflare/i;

    /**
     * 查询 IP 归属地与服务商（ipapi.co，支持 CORS）。
     * 若服务商为 Cloudflare，isp 标注为「Cloudflare 代理」。
     * @returns {Promise<object|null>} { ip, isp, org, city, region, country }
     */
    Network.geoLookup = function (ip) {
        if (!ip) return Promise.resolve(null);
        return fetch('https://ipapi.co/' + encodeURIComponent(ip) + '/json/')
            .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
            .then(function (d) {
                var org = d.org || '';
                var isCF = CLOUDFLARE_RE.test(org);
                return {
                    ip: ip,
                    org: org,
                    isp: isCF ? 'Cloudflare 代理' : (org || ''),
                    city: d.city,
                    region: d.region,
                    country: d.country_name || d.country_code,
                };
            })
            .catch(function () { return null; });
    };

    /* ---------- 站点元数据（名称 / SEO / 图标） ---------- */

    /**
     * 通过 Microlink 抓取站点标题、SEO 描述与图标（服务端抓取，支持 CORS）。
     * @returns {Promise<object|null>} { title, description, icon }
     */
    Network.fetchSiteMeta = function (url) {
        return fetch('https://api.microlink.io/?url=' + encodeURIComponent(url))
            .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
            .then(function (d) {
                var data = d.data || {};
                return {
                    title: data.title || '',
                    description: data.description || '',
                    icon: (data.logo && data.logo.url) || '',
                };
            })
            .catch(function () { return null; });
    };

    /** 状态展示映射 */
    Network.STATUS = {
        'online':        { text: '在线', cls: 'st-online' },
        'offline':       { text: '离线', cls: 'st-offline' },
        'local-online':  { text: '本地在线', cls: 'st-local-online' },
        'local-offline': { text: '本地离线', cls: 'st-local-offline' },
        'loopback':      { text: '本地回环', cls: 'st-loopback' },
    };

    Network.statusLabel = function (key) {
        return Network.STATUS[key] || { text: key, cls: 'st-offline' };
    };

    /* ---------- Cookie 工具 ---------- */

    Network.cookieGet = function (name) {
        var m = document.cookie.match(
            new RegExp('(?:^|;\\s*)' + encodeURIComponent(name) + '=([^;]*)')
        );
        if (!m) return null;
        try { return JSON.parse(decodeURIComponent(m[1])); } catch (e) { return null; }
    };

    Network.cookieSet = function (name, value, days) {
        var exp = '';
        if (days) {
            var d = new Date();
            d.setTime(d.getTime() + days * 864e5);
            exp = '; expires=' + d.toUTCString();
        }
        document.cookie = encodeURIComponent(name) + '=' +
            encodeURIComponent(JSON.stringify(value)) +
            '; path=/; SameSite=Lax' + exp;
    };

    Network.cookieDel = function (name) {
        document.cookie = encodeURIComponent(name) +
            '=; path=/; SameSite=Lax; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    };

    global.Hermes = global.Hermes || {};
    global.Hermes.Network = Network;
})(window);
