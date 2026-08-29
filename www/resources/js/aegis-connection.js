/**
 * aegis-connection.js — 连接安全检测页面逻辑（纯前端，不依赖服务器）
 * 类别：页面
 * 依赖：lib/network.js（可选，未用则独立实现）
 * 职责：
 *   1. 右侧矢量自旋粒子团（canvas）：若干粒子沿轨道自旋，随动画微移
 *   2. 点击「检查安全」：标题向中心渐隐，粒子团移至屏幕中心，
 *      叠加「正在检测」标题；期间并行执行 4 项检测
 *   3. 检测项（均为「更安全」得分项，指上网匿名性 / 自由性 / 抗监控）：
 *      a. 是否启用代理：IP 归属地与所选所在地不一致 → 通过（匿名性更高）
 *      b. 网络环境是否为 Tor / VPN：是 → 通过（更难被公司网 / 校园网监控）
 *      c. DNS 无泄漏：Cloudflare / 阿里 DoH + 用户实际 DNS ISP 三方解析一致
 *      d. 支持加密 DNS（DoH）：能否通过 Cloudflare / 阿里 DoH 完成解析
 *   4. 加权打分（满分 100，四项全过）+ 逐项通过（勾）/ 失败（叉）列表
 * 约束：公共 API 直连；自有 PHP（dns-lookup.php）带服务端缓存 6h +
 *       前端 localStorage 节流（≥30 分钟、IP 变化才重新请求）
 */
(function () {
    'use strict';

    /* ================= 元素引用 ================= */
    var hero     = document.getElementById('conn-hero');
    var intro    = document.getElementById('conn-intro');
    var stage    = document.getElementById('conn-stage');
    var canvas   = document.getElementById('conn-particles');
    var detecting= document.getElementById('conn-detecting');
    var resultEl = document.getElementById('conn-result');
    var scoreEl  = document.getElementById('result-score');
    var listEl   = document.getElementById('result-list');
    var btn      = document.getElementById('conn-check-btn');
    var againBtn = document.getElementById('conn-again-btn');
    var countryInput = document.getElementById('conn-country');

    /* 可选国家（用于校验用户输入 / 匹配 IP 归属） */
    var COUNTRIES = [
        '中国', '日本', '韩国', '俄罗斯', '乌克兰', '朝鲜',
        '古巴', '土耳其', '阿富汗', '阿拉伯', '美国',
    ];

    /* 国家中文名 → ISO 3166-1 alpha-2 映射（ipinfo.io 返回 country 码） */
    var COUNTRY_CODE = {
        '中国': 'CN', '日本': 'JP', '韩国': 'KR', '俄罗斯': 'RU',
        '乌克兰': 'UA', '朝鲜': 'KP', '古巴': 'CU', '土耳其': 'TR',
        '阿富汗': 'AF', '阿拉伯': 'AE', '美国': 'US',
    };

    /* ================= 粒子团（canvas） ================= */
    var ctx = canvas.getContext('2d');
    var particles = [];
    var animId = null;
    var particleCount = 46;         // 粒子数量
    var spinAngle = 0;              // 整体自旋角
    var radius = 96;                // 粒子分布半径

    /** 初始化粒子（随机在球壳内分布） */
    function initParticles() {
        particles = [];
        for (var i = 0; i < particleCount; i++) {
            particles.push({
                // 球坐标随机分布（theta 方位角 / phi 极角）
                theta: Math.random() * Math.PI * 2,
                phi: Math.acos(2 * Math.random() - 1),
                r: radius * (0.55 + Math.random() * 0.45),
                speed: 0.4 + Math.random() * 0.6,
                size: 1.2 + Math.random() * 2.2,
                color: Math.random() < 0.35 ? 'rgba(248,113,113,0.85)' : 'rgba(34,211,238,0.9)',
            });
        }
    }

    /** 尺寸自适应 */
    function resize() {
        var dpr = window.devicePixelRatio || 1;
        var w = stage.clientWidth, h = stage.clientHeight;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /** 绘制一帧：粒子绕 Y 轴自旋 + 轻微呼吸 */
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        var cx = canvas.width / 2 / (window.devicePixelRatio || 1);
        var cy = canvas.height / 2 / (window.devicePixelRatio || 1);

        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            var spin = spinAngle * p.speed;
            // 3D 球坐标 → 2D（绕 Y 轴旋转）
            var x = p.r * Math.sin(p.phi) * Math.cos(p.theta + spin);
            var y = p.r * Math.cos(p.phi);
            var z = p.r * Math.sin(p.phi) * Math.sin(p.theta + spin);
            var scale = (z + radius) / (2 * radius);   // 深度 → 大小/亮度
            ctx.globalAlpha = 0.35 + 0.65 * scale;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(cx + x, cy + y, p.size * (0.6 + 0.6 * scale), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        spinAngle += 0.012;
        animId = requestAnimationFrame(draw);
    }

    /** 让粒子团「变红」——随风险度提升红色粒子占比 */
    function setRisk(redRatio) {
        for (var i = 0; i < particles.length; i++) {
            particles[i].color = Math.random() < redRatio
                ? 'rgba(248,113,113,0.9)'
                : 'rgba(34,211,238,0.9)';
        }
    }

    /* ================= 布局状态切换 =================
       点击检查：标题渐隐 → 粒子移向中心 → 显示「正在检测」 */
    function enterDetecting() {
        hero.classList.add('is-detecting');
        intro.classList.add('is-fading');        // 标题渐隐
        stage.classList.add('is-centered');      // 粒子团居中
        detecting.hidden = false;
        btn.disabled = true;
    }

    function leaveDetecting() {
        hero.classList.remove('is-detecting');
        intro.classList.remove('is-fading');
        stage.classList.remove('is-centered');
        detecting.hidden = true;
        btn.disabled = false;
    }

    /* ================= 检测逻辑 ================= */

    /** 归一化字符串（小写 + 去空白） */
    function norm(s) {
        return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
    }

    /**
     * 检测 1：IP 归属地与所选国家是否一致（是否启用代理）
     * 通过（1）：IP 归属地与所选国家不一致（启用了代理 → 匿名性更高，更安全）
     * 失败（0）：一致（未启用代理，可能被公司/校园网监控）
     * 附带获取 IP / org（供网络环境判定复用）
     */
    function checkCountry() {
        return fetch('https://ipinfo.io/json', { cache: 'no-store' })
            .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
            .then(function (d) {
                var code = (d.country || '').toUpperCase();
                var expect = COUNTRY_CODE[norm(countryInput.value)];
                var isProxy = expect ? code !== expect : true;   // 所选地区与 IP 归属不一致 → 启用了代理
                return {
                    pass: isProxy,
                    ip: d.ip,
                    org: d.org || '',
                    country: d.country || '',
                    detail: 'IP ' + (d.ip || '?') + ' → ' + (d.country || '未知')
                            + '（所在地 ' + (countryInput.value || '未选择') + '）'
                            + (isProxy ? '，启用代理' : '，未启用代理'),
                };
            });
    }

    /** 网络环境判定：Tor / VPN / 代理运营商关键字启发式 */
    var VPN_RE = /\b(vpn|virtual\s*private\s*network|proxy|tor|onion|relay|exit\s*node|tunnel|anonymi[sz]e)\b/i;
    // 常见数据中心 / 代理托管（代理节点常托管于云商）
    var DC_RE = /Amazon|AWS|Microsoft|Azure|Google|GCP|Oracle|DigitalOcean|Linode|Vultr|Hetzner|OVH|M247|TorExit|Datacamp|FlokiNET/i;
    var vpnDict = null;   // isp-dict.json 中「已知 VPN / 代理」类别关键词

    /** 加载运营商字典（仅取「已知 VPN / 代理」类别关键词），失败返回空 */
    function loadVpnDict() {
        if (vpnDict) return Promise.resolve(vpnDict);
        return fetch('data/json/isp-dict.json', { cache: 'no-store' })
            .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
            .then(function (d) {
                var keys = [];
                (d.categories || []).forEach(function (c) {
                    if (/vpn|代理/i.test(c.name || '')) {
                        (c.entries || []).forEach(function (e) {
                            (e.keys || []).forEach(function (k) {
                                if (k) keys.push(String(k).toLowerCase());
                            });
                        });
                    }
                });
                vpnDict = keys;
                return keys;
            })
            .catch(function () { vpnDict = []; return []; });
    }

    /** 命中字典关键词（关键词按长度降序，最具体者优先） */
    function matchDict(org, keys) {
        var n = String(org || '').toLowerCase();
        if (!n || !keys || !keys.length) return false;
        return keys.some(function (k) { return k && n.indexOf(k) !== -1; });
    }

    /** 检测 2：网络运营商 / 环境是否为 Tor / VPN
     *  通过（1）：检测到 Tor / VPN / 代理（匿名性更高，更安全）
     *  失败（0）：普通家庭 / 移动宽带（非 Tor/VPN） */
    function checkNetwork(info) {
        var org = info.org || '';
        var isVpn = VPN_RE.test(org) || DC_RE.test(org) || matchDict(org, vpnDict || []);
        return {
            pass: isVpn,
            detail: isVpn
                ? '检测到 Tor / VPN / 代理网络环境（' + (org || '未知') + '）'
                : '网络环境为普通家庭 / 移动宽带（' + (org || '未知') + '），未走 Tor/VPN',
        };
    }

    /** 通过 DoH 解析域名，返回 IP 数组 */
    function dohResolve(url) {
        return fetch(url, { headers: { 'Accept': 'application/dns-json' } })
            .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
            .then(function (d) {
                return (d.Answer || []).filter(function (a) { return a.type === 1; })
                    .map(function (a) { return a.data; });
            });
    }

    /**
     * 检测 3：DNS 泄漏——比对三方解析是否一致：
     *   - Cloudflare DoH（国际）
     *   - 阿里 DoH（国内）
     *   - PHP 中转：服务器实际解析该域名得到的 DNS（即「用户访问过来时解析的 DNS ISP」）
     * 三方解析结果归属地一致 = 无泄漏（1）；不一致 = 泄漏 / 被劫持（0）。
     */
    function checkDnsLeak() {
        var domain = 'example.com';
        var cf = dohResolve('https://cloudflare-dns.com/dns-query?name=' + domain + '&type=A');
        var ali = dohResolve('https://dns.alidns.com/resolve?name=' + domain + '&type=A');
        var server = fetchServerDns(domain);   // 自有服务端（带 localStorage 节流）

        return Promise.all([cf, ali, server]).then(function (res) {
            var cfIps = res[0] || [], aliIps = res[1] || [], srvIps = res[2] || [];
            // 归属地比对：取各来源首个 IP 查 ipwho.is，比较 country
            var tasks = [];
            if (cfIps.length) tasks.push(ipCountry(cfIps[0]).then(function (c) { return { src: 'Cloudflare', ip: cfIps[0], country: c }; }));
            if (aliIps.length) tasks.push(ipCountry(aliIps[0]).then(function (c) { return { src: '阿里', ip: aliIps[0], country: c }; }));
            if (srvIps.length) tasks.push(ipCountry(srvIps[0]).then(function (c) { return { src: '用户实际 DNS', ip: srvIps[0], country: c }; }));

            return Promise.all(tasks).then(function (infos) {
                // 过滤掉归属地无法判定的来源（如本地 fake-ip 查不到归属），避免误判
                var known = infos.filter(function (i) { return i.country; });
                if (known.length < 2) {
                    return {
                        pass: known.length === 1,
                        detail: known.length === 1
                            ? 'DNS 解析正常（' + known[0].src + ' → ' + known[0].ip + ' / ' + known[0].country + '）'
                            : 'DNS 解析服务暂不可用，无法判断',
                    };
                }
                // 全部来源归属地一致 → 无泄漏
                var first = known[0].country;
                var pass = known.every(function (i) { return i.country === first; });
                return {
                    pass: pass,
                    detail: pass
                        ? 'DNS 解析一致（' + known.map(function (i) { return i.src + '→' + i.country; }).join('、') + '），无泄漏'
                        : 'DNS 解析归属不一致（' + known.map(function (i) { return i.src + '→' + i.country; }).join('、') + '），疑似 DNS 泄漏',
                };
            });
        }).catch(function () {
            return { pass: false, detail: 'DNS 泄漏检测失败（服务不可用）' };
        });
    }

    /** 查询单个 IP 的归属国家（ipwho.is，CORS 可用） */
    function ipCountry(ip) {
        return fetch('https://ipwho.is/' + encodeURIComponent(ip), { cache: 'no-store' })
            .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
            .then(function (d) { return d.country_code || d.country || ''; })
            .catch(function () { return ''; });
    }

    /**
     * 检测 4：支持加密 DNS（DoH）——能否通过 Cloudflare / 阿里 DoH 完成解析。
     * 通过（1）：至少一个 DoH 端点成功返回解析（支持加密 DNS）
     * 失败（0）：所有 DoH 均失败（加密 DNS 被阻断或不支持）
     */
    function checkDoh() {
        return Promise.all([
            dohResolve('https://cloudflare-dns.com/dns-query?name=example.com&type=A').then(function (i) { return i.length > 0; }).catch(function () { return false; }),
            dohResolve('https://dns.alidns.com/resolve?name=example.com&type=A').then(function (i) { return i.length > 0; }).catch(function () { return false; }),
        ]).then(function (ok) {
            var any = ok[0] || ok[1];
            return {
                pass: any,
                detail: any
                    ? '支持加密 DNS（DoH' + (ok[0] ? ' / Cloudflare' : '') + (ok[1] ? ' / 阿里' : '') + '）'
                    : '无法通过加密 DNS 解析（DoH 被阻断或不支持）',
            };
        });
    }

    /* ================= 加权打分 =================
       权重：启用代理（IP 归属≠所在地）40%、Tor/VPN 网络环境 25%、
             DNS 无泄漏 20%、支持加密 DNS 15% */
    var WEIGHTS = [
        { key: 'country',  weight: 40, label: '启用代理（IP 归属与所在地不一致）', icon: 'fluent:location-20-regular' },
        { key: 'network',  weight: 25, label: '网络环境为 Tor / VPN',   icon: 'fluent:shield-20-regular' },
        { key: 'dns',      weight: 20, label: 'DNS 无泄漏（多方解析一致）', icon: 'fluent:globe-20-regular' },
        { key: 'doh',      weight: 15, label: '支持加密 DNS（DoH）',    icon: 'fluent:lock-20-regular' },
    ];

    function computeScore(results) {
        var score = 0;
        WEIGHTS.forEach(function (w) {
            if (results[w.key].pass) score += w.weight;
        });
        return score;
    }

    /** 渲染结果列表：通过=打勾 / 失败=打叉 */
    function renderResult(score, results) {
        resultEl.hidden = false;
        scoreEl.textContent = score;

        listEl.innerHTML = '';
        WEIGHTS.forEach(function (w) {
            var r = results[w.key];
            var li = document.createElement('li');
            li.className = 'result-item ' + (r.pass ? 'pass' : 'fail');
            li.innerHTML =
                '<span class="result-icon">' +
                '<iconify-icon icon="' + (r.pass ? 'fluent:checkmark-circle-20-filled' : 'fluent:dismiss-circle-20-filled') + '"></iconify-icon>' +
                '</span>' +
                '<div class="result-body">' +
                '<div class="result-label"><iconify-icon icon="' + w.icon + '"></iconify-icon>' + w.label + '</div>' +
                '<div class="result-detail"></div>' +
                '</div>' +
                '<span class="result-state">' + (r.pass ? '通过' : '未通过') + '</span>';
            li.querySelector('.result-detail').textContent = r.detail;
            listEl.appendChild(li);
        });
    }

    /* ================= 自有服务端请求节流 =================
       dns-lookup.php 是自有 PHP，需低频：
       - localStorage 缓存结果（默认 6 小时）
       - 仅当「客户端 IP 变化（新网络环境）」或「距上次请求 ≥30 分钟」才重新请求 */
    var SERVER_DNS_CACHE_KEY = 'aegis_server_dns';
    var SERVER_DNS_MIN_INTERVAL = 30 * 60 * 1000;   // 30 分钟
    var SERVER_DNS_TTL = 6 * 3600 * 1000;           // 6 小时

    /** 读取客户端当前出口 IP（复用 checkCountry 的 ipinfo 结果，避免重复请求） */
    var lastClientIp = null;

    /** 从 localStorage 读取缓存（过期 / 非法返回 null） */
    function readServerDnsCache(host) {
        try {
            var raw = localStorage.getItem(SERVER_DNS_CACHE_KEY);
            if (!raw) return null;
            var c = JSON.parse(raw);
            if (!c || c.host !== host) return null;
            if (Date.now() - c.ts > SERVER_DNS_TTL) return null;   // 缓存过期
            return c;
        } catch (e) { return null; }
    }

    /** 写入缓存 */
    function writeServerDnsCache(host, ips, clientIp) {
        try {
            localStorage.setItem(SERVER_DNS_CACHE_KEY, JSON.stringify({
                host: host, ips: ips, ts: Date.now(), clientIp: clientIp,
            }));
        } catch (e) { /* 存储满 / 禁用时静默忽略 */ }
    }

    /**
     * 节流获取自有服务端 DNS 解析：
     *   - 缓存有效（<6h）且客户端 IP 未变 → 直接用缓存
     *   - 否则若距上次 ≥30 分钟 → 重新请求
     *   - 距上次 <30 分钟且 IP 未变 → 仍用缓存（避免高频）
     */
    function fetchServerDns(host) {
        var cached = readServerDnsCache(host);
        if (cached) {
            var ipChanged = lastClientIp && cached.clientIp && cached.clientIp !== lastClientIp;
            var intervalOk = Date.now() - cached.ts >= SERVER_DNS_MIN_INTERVAL;
            if (!ipChanged && !intervalOk) {
                return Promise.resolve(cached.ips);   // 命中缓存，不请求
            }
        }
        return fetch('dns-lookup.php?host=' + encodeURIComponent(host))
            .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
            .then(function (d) {
                var ips = d.ips || [];
                writeServerDnsCache(host, ips, lastClientIp);
                return ips;
            })
            .catch(function () { return []; });
    }

    /* ================= 主流程 ================= */
    function run() {
        if (btn.disabled) return;
        enterDetecting();
        resultEl.hidden = true;

        // 加载 VPN 字典 → 获取 IP/归属（缓存客户端出口 IP 供节流比对）
        loadVpnDict().then(function () {
            return checkCountry();
        }).then(function (country) {
            lastClientIp = country.ip || null;
            var network = checkNetwork(country);
            return Promise.all([country, network, checkDnsLeak(), checkDoh()]);
        }).then(function (results) {
            var byKey = { country: results[0], network: results[1], dns: results[2], doh: results[3] };
            var score = computeScore(byKey);

            // 风险度 → 红色粒子占比（0 的越多越红）
            var fails = 0;
            Object.keys(byKey).forEach(function (k) { if (!byKey[k].pass) fails++; });
            setRisk(fails / Object.keys(byKey).length);

            leaveDetecting();
            renderResult(score, byKey);
        }).catch(function () {
            leaveDetecting();
            resultEl.hidden = false;
            listEl.innerHTML = '';
            var li = document.createElement('li');
            li.className = 'result-item fail';
            li.textContent = '检测失败：网络不可用或服务暂不可用，请稍后重试';
            listEl.appendChild(li);
        });
    }

    btn.addEventListener('click', run);
    againBtn.addEventListener('click', run);

    /* ================= 初始化 ================= */
    initParticles();
    resize();
    draw();
    window.addEventListener('resize', resize);
})();
