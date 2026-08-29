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
    Network.probe = function (protocol, host, timeoutMs) {
        var timeout = timeoutMs || 6000;
        return new Promise(function (resolve) {
            var ctrl = new AbortController();
            var timer = setTimeout(function () { ctrl.abort(); }, timeout);
            fetch(protocol + '://' + host, {
                method: 'GET',
                mode: 'no-cors',
                cache: 'no-store',
                redirect: 'follow',
                signal: ctrl.signal,
            }).then(function () {
                clearTimeout(timer);
                resolve(true);
            }).catch(function () {
                clearTimeout(timer);
                resolve(false);
            });
        });
    };

    /**
     * 状态检测：按输入类型返回状态键
     *   127.x → loopback（本地回环，不探测）
     *   内网 IP → local-online / local-offline
     *   其余 → online / offline
     */
    Network.detectStatus = function (protocol, host) {
        if (Network.isLoopback(host)) return Promise.resolve('loopback');
        if (Network.isPrivateIP(host)) {
            return Network.probe(protocol, host).then(function (ok) {
                return ok ? 'local-online' : 'local-offline';
            });
        }
        return Network.probe(protocol, host).then(function (ok) {
            return ok ? 'online' : 'offline';
        });
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
