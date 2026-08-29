/**
 * aegis-connection.js — 连接安全检测页面逻辑（纯前端，不依赖服务器）
 * 类别：页面
 * 依赖：lib/network.js（可选，未用则独立实现）
 * 职责：
 *   1. 右侧矢量自旋粒子团（canvas）：若干粒子沿轨道自旋，随动画微移
 *   2. 点击「检查安全」：标题向中心渐隐，粒子团移至屏幕中心，
 *      叠加「正在检测」标题；期间并行执行 4 项检测
 *   3. 检测项：
 *      a. IP 归属地与所选国家是否一致（ipinfo.io）
 *      b. 网络环境：Tor / VPN 运营商判定
 *      c. DNS 泄漏：Cloudflare 与阿里 DoH 解析同一域名，比对归属地是否一致
 *      d. DoH 支持：能否通过加密 DNS（DoH）完成解析
 *   4. 加权打分（满分 100）+ 逐项通过（勾）/ 失败（叉）列表
 * 约束：全部走公共 API，不请求自有 PHP；不做本地缓存（公共 API 不限频）
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
     * 检测 1：IP 归属地与所选国家是否一致
     * 通过（1）：真实 IP 的 country 码 == 用户所选国家码
     * 失败（0）：不一致
     * 附带获取 IP / org（供网络环境判定复用）
     */
    function checkCountry() {
        return fetch('https://ipinfo.io/json', { cache: 'no-store' })
            .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
            .then(function (d) {
                var code = (d.country || '').toUpperCase();
                var expect = COUNTRY_CODE[norm(countryInput.value)];
                var pass = expect ? code === expect : false;
                return {
                    pass: pass,
                    ip: d.ip,
                    org: d.org || '',
                    country: d.country || '',
                    detail: 'IP ' + (d.ip || '?') + ' → ' + (d.country || '未知')
                            + '（期望 ' + (countryInput.value || '未选择') + '）',
                };
            });
    }

    /** 网络环境判定：Tor / VPN 运营商关键字启发式 */
    var VPN_RE = /\b(vpn|virtual\s*private\s*network|proxy|tor|onion|relay|exit\s*node|tunnel|anonymi[sz]e)\b/i;

    /** 检测 2：网络运营商 / 环境是否为 Tor 或 VPN
     *  通过（1）：普通家庭 / 移动宽带（非 Tor/VPN）
     *  失败（0）：检测到 Tor / VPN / 代理 */
    function checkNetwork(info) {
        var org = info.org || '';
        var isSuspicious = VPN_RE.test(org);
        // 常见数据中心/代理托管也视为可疑（运营商标识含云商/托管）
        var DC_RE = /Amazon|AWS|Microsoft|Azure|Google|GCP|Oracle|DigitalOcean|Linode|Vultr|Hetzner|OVH|M247|TorExit/i;
        isSuspicious = isSuspicious || DC_RE.test(org);
        return {
            pass: !isSuspicious,
            detail: isSuspicious
                ? '检测到疑似代理 / Tor / VPN 网络环境（' + (org || '未知') + '）'
                : '网络环境为普通家庭 / 移动宽带（' + (org || '未知') + '）',
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
     * 检测 3：DNS 泄漏——Cloudflare（国际）与阿里（国内）DoH 解析同一域名，
     *   比对 IP 归属地是否一致。一致 = 无泄漏（1）；差异大 = 泄漏 / 被劫持（0）。
     *   若任一端点失败，退回「单端点可用即算通过」（DoH 本身可用说明非完全泄漏）。
     */
    function checkDnsLeak() {
        var domain = 'example.com';
        var cf = dohResolve('https://cloudflare-dns.com/dns-query?name=' + domain + '&type=A');
        var ali = dohResolve('https://dns.alidns.com/resolve?name=' + domain + '&type=A');

        return Promise.all([cf, ali]).then(function (res) {
            var cfIps = res[0] || [], aliIps = res[1] || [];
            // 归属地比对：取各家首个 IP 查 ipwho.is，比较 country
            var tasks = [];
            if (cfIps.length) tasks.push(ipCountry(cfIps[0]).then(function (c) { return { src: 'Cloudflare', ip: cfIps[0], country: c }; }));
            if (aliIps.length) tasks.push(ipCountry(aliIps[0]).then(function (c) { return { src: '阿里', ip: aliIps[0], country: c }; }));
            return Promise.all(tasks).then(function (infos) {
                if (infos.length < 2) {
                    // 仅一个可用 → 视为通过（能完成 DoH 解析即基本无泄漏迹象）
                    return {
                        pass: infos.length === 1,
                        detail: infos.length === 1
                            ? 'DNS 解析正常（' + infos[0].src + ' → ' + infos[0].ip + ' / ' + infos[0].country + '）'
                            : 'DNS 解析服务暂不可用，无法判断',
                    };
                }
                var pass = infos[0].country === infos[1].country;
                return {
                    pass: pass,
                    detail: pass
                        ? '公共 DNS 解析一致（' + infos[0].src + ' 与 ' + infos[1].src + ' 均 → ' + infos[0].country + '）'
                        : '公共 DNS 解析归属不一致（' + infos[0].src + ' → ' + infos[0].country
                            + '，' + infos[1].src + ' → ' + infos[1].country + '），疑似 DNS 泄漏',
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
     * 检测 4：DoH 支持——能否通过加密 DNS 完成解析。
     * 通过（1）：至少一个 DoH 端点成功返回解析
     * 失败（0）：所有 DoH 均失败（网络屏蔽加密 DNS）
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
       权重：IP 归属 40%、网络环境 25%、DNS 泄漏 20%、DoH 支持 15% */
    var WEIGHTS = [
        { key: 'country',  weight: 40, label: 'IP 归属地与所在地一致', icon: 'fluent:location-20-regular' },
        { key: 'network',  weight: 25, label: '网络环境非 Tor / VPN',   icon: 'fluent:shield-20-regular' },
        { key: 'dns',      weight: 20, label: 'DNS 无泄漏（公共 DNS 一致）', icon: 'fluent:globe-20-regular' },
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

    /* ================= 主流程 ================= */
    function run() {
        if (btn.disabled) return;
        enterDetecting();
        resultEl.hidden = true;

        // 并行执行 4 项检测
        checkCountry().then(function (country) {
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
