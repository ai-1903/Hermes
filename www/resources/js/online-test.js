/**
 * online-test.js — Online Test 页面逻辑（纯前端）
 * 类别：页面
 * 依赖：lib/network.js
 * 职责：
 *   1. 协议选项卡切换、输入校验、在线探测
 *   2. 根域名自动双测（www. + 裸域），记录合并为一条「*.XXX.XX」
 *   3. 通配符查询（*.XXX.XX）：动态逐条显示子域检测结果
 *   4. Cookie 历史记录（≤20 条）：重复查询去重置顶、单条删除
 */
(function () {
    'use strict';

    var N = window.Hermes.Network;
    var HISTORY_KEY = 'hermes_online_history';
    var HISTORY_MAX = 20;

    var input       = document.getElementById('ot-input');
    var btn         = document.getElementById('ot-btn');
    var result      = document.getElementById('ot-result');
    var historyList = document.getElementById('ot-history');
    var protoTabs   = Array.prototype.slice.call(document.querySelectorAll('.proto-tab'));
    var currentProto = 'https';

    /* ---------- 网络错误码字典（data/json/net-errors.json） ---------- */
    var ERR_DICT_URL = 'data/json/net-errors.json';
    var errDict = null;   // 缓存字典
    var errDictLoaded = false;

    function loadErrDict() {
        if (errDictLoaded) return Promise.resolve(errDict);
        return fetch(ERR_DICT_URL, { cache: 'no-store' })
            .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
            .then(function (d) { errDict = d; errDictLoaded = true; return d; })
            .catch(function () { errDict = null; errDictLoaded = true; return null; });
    }

    /** 查找错误码对应解释；未命中返回 fallback */
    function errorHint(code) {
        if (!errDict || !errDict.errors) return null;
        var found = null;
        errDict.errors.forEach(function (e) {
            if (e.code === code) found = e;
            if (!found && e.aliases && e.aliases.indexOf(code) !== -1) found = e;
        });
        if (found) return found;
        return errDict.fallback || null;
    }

    /** 回环 / 离线提示内容 */
    function loopbackPopOpts() {
        return {
            theme: 'info',
            title: '本地回环',
            text: '127.0.0.1 是设备自身的回环地址，恒定为可达状态，用于本机服务测试，无需网络探测。',
        };
    }

    /** 为离线状态徽标绑定错误码 POP（悬停 + 点击） */
    function bindOfflinePop(badge, errorCode, isLocal) {
        if (!window.Hermes.Popover) return;
        badge.classList.add('st-pop');
        var hint = errorHint(errorCode);
        var opts = {
            theme: 'error',
            title: (isLocal ? '本地离线' : '离线') + (hint ? ' · ' + hint.title : ''),
            rows: [
                { label: '错误码', value: errorCode || '未知' },
            ],
        };
        if (hint) {
            opts.rows.push({ label: '可能原因', value: hint.reason });
            opts.rows.push({ label: '建议', value: hint.suggest });
        }
        window.Hermes.Popover.bind(badge, opts);
    }

    /* ---------- 协议选项卡 ---------- */
    protoTabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
            protoTabs.forEach(function (t) { t.classList.remove('active'); });
            tab.classList.add('active');
            currentProto = tab.dataset.proto || 'https';
        });
    });

    /* ---------- Cookie 历史记录 ---------- */
    function getHistory() {
        var h = N.cookieGet(HISTORY_KEY);
        return Array.isArray(h) ? h : [];
    }
    function saveHistory(items) {
        N.cookieSet(HISTORY_KEY, items.slice(0, HISTORY_MAX), 30);
    }
    /** 记录唯一键（同 proto+host 视为同一条，用于去重置顶） */
    function recKey(rec) {
        return (rec.proto || '') + '|' + (rec.host || '');
    }
    /** 插入记录：已存在则移到顶部并更新时间，否则新增到顶部 */
    function upsertHistory(record) {
        var key = recKey(record);
        var h = getHistory().filter(function (r) { return recKey(r) !== key; });
        h.unshift(record);
        saveHistory(h);
    }
    function now() {
        var d = new Date();
        function p(n) { return (n < 10 ? '0' : '') + n; }
        return p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' +
               p(d.getHours()) + ':' + p(d.getMinutes());
    }

    /* ---------- 历史记录渲染 ---------- */
    function renderHistory() {
        var h = getHistory();
        historyList.innerHTML = '';
        if (!h.length) {
            var empty = document.createElement('li');
            empty.className = 'history-empty';
            empty.textContent = '暂无查询记录';
            historyList.appendChild(empty);
            return;
        }
        h.forEach(function (rec) {
            var li = document.createElement('li');
            li.className = 'history-item';

            var proto = document.createElement('span');
            proto.className = 'history-proto';
            proto.textContent = (rec.proto || 'https').toUpperCase();

            var host = document.createElement('span');
            host.className = 'history-host';
            host.textContent = rec.host;
            host.title = '点击重新查询';
            host.addEventListener('click', function () {
                input.value = rec.host;
                run();
            });

            var label = N.statusLabel(rec.status);
            var status = document.createElement('span');
            status.className = 'history-status st ' + label.cls;
            status.textContent = label.text;
            // 历史中的离线 / 本地离线 / 本地回环同样绑定 POP
            if (rec.status === 'offline' || rec.status === 'local-offline') {
                bindOfflinePop(status, rec.error, rec.status === 'local-offline');
            } else if (rec.status === 'loopback') {
                status.classList.add('st-pop');
                if (window.Hermes.Popover) {
                    window.Hermes.Popover.bind(status, loopbackPopOpts());
                }
            }

            var time = document.createElement('span');
            time.className = 'history-time';
            time.textContent = rec.time || '';

            var del = document.createElement('button');
            del.className = 'history-del';
            del.type = 'button';
            del.title = '删除该记录';
            del.setAttribute('aria-label', '删除 ' + rec.host);
            del.textContent = '×';
            del.addEventListener('click', function (e) {
                e.stopPropagation();
                // 修复：用 host + proto 匹配删除（而非对象引用比较）
                var key = recKey(rec);
                var list = getHistory().filter(function (r) { return recKey(r) !== key; });
                saveHistory(list);
                renderHistory();
            });

            li.appendChild(proto);
            li.appendChild(host);
            li.appendChild(status);
            li.appendChild(time);
            li.appendChild(del);
            historyList.appendChild(li);
        });
    }

    /* ---------- 结果渲染（普通/根域，表格） ---------- */
    function renderTable(items) {
        if (!items.length) return null;

        var wrap = document.createElement('div');
        wrap.className = 'tool-table-wrap';

        var table = document.createElement('table');
        table.className = 'tool-table';

        var thead = document.createElement('thead');
        var trH = document.createElement('tr');
        var thTarget = document.createElement('th');
        thTarget.innerHTML = '<span class="th-inner"><iconify-icon icon="fluent:globe-20-regular"></iconify-icon> 目标</span>';
        var thStatus = document.createElement('th');
        thStatus.innerHTML = '<span class="th-inner"><iconify-icon icon="fluent:pulse-20-regular"></iconify-icon> 状态</span>';
        trH.appendChild(thTarget);
        trH.appendChild(thStatus);
        thead.appendChild(trH);
        table.appendChild(thead);

        var tbody = document.createElement('tbody');
        items.forEach(function (it) {
            var tr = document.createElement('tr');
            var tdTarget = document.createElement('td');
            tdTarget.className = 'mono';
            tdTarget.textContent = it.target;
            var tdStatus = document.createElement('td');
            var label = N.statusLabel(it.status);
            var s = document.createElement('span');
            s.className = 'st ' + label.cls;
            s.textContent = label.text;
            // 离线 / 本地离线：绑定错误码 POP（悬停 + 点击）
            if (it.status === 'offline' || it.status === 'local-offline') {
                bindOfflinePop(s, it.error, it.status === 'local-offline');
            }
            tdStatus.appendChild(s);
            tr.appendChild(tdTarget);
            tr.appendChild(tdStatus);
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);

        wrap.appendChild(table);
        result.appendChild(wrap);
        return wrap;
    }

    /* ---------- 详情展示（解析 IP / 归属地 / 站点名 / SEO / 图标） ---------- */

    /** 为在线目标抓取详情数据 */
    function fetchDetails(it) {
        if (it.status !== 'online' && it.status !== 'local-online') {
            return Promise.resolve(null);
        }
        var host = it.host;
        var url = N.probeUrl(currentProto, host, it.port);
        return Promise.all([
            N.resolveDNS(host),             // 解析 IP（IPv4 输入则原样）
            N.fetchSiteMeta(url),           // 站点名 / SEO / 图标
        ]).then(function (res) {
            var ips = res[0] || [];
            var meta = res[1] || {};
            var ip = ips[0] || '';
            return N.geoLookup(ip).then(function (geo) {
                return {
                    target: it.target,
                    ips: ips,
                    ip: ip,
                    geo: geo,
                    title: meta.title || '',
                    description: meta.description || '',
                    icon: meta.icon || '',
                };
            });
        }).catch(function () {
            return null;
        });
    }

    /**
     * 渲染详情卡片（挂表格下方）。
     * 站点名缺失时用目标域名兜底展示，绝不隐藏该行。
     * @returns {HTMLElement|null} 详情容器（无在线目标时返回 null）
     */
    function renderDetails(detailsList) {
        var valid = detailsList.filter(Boolean);
        if (!valid.length) return null;
        var wrap = document.createElement('div');
        wrap.className = 'ot-details';
        valid.forEach(function (d) {
            var card = document.createElement('div');
            card.className = 'site-detail';

            // 站点图标（无则用占位图标）
            var iconBox = document.createElement('div');
            iconBox.className = 'site-detail-icon';
            if (d.icon) {
                var img = document.createElement('img');
                img.src = d.icon;
                img.alt = '';
                img.loading = 'lazy';
                iconBox.appendChild(img);
            } else {
                iconBox.innerHTML = '<iconify-icon icon="fluent:globe-20-regular"></iconify-icon>';
            }

            var body = document.createElement('div');
            body.className = 'site-detail-body';

            // 站点名称行：标题缺失时用域名兜底，不隐藏
            var titleRow = document.createElement('div');
            titleRow.className = 'site-detail-title';
            var t = document.createElement('span');
            t.className = 'site-detail-name';
            t.textContent = d.title || d.target;
            titleRow.appendChild(t);
            var target = document.createElement('span');
            target.className = 'site-detail-target mono';
            target.textContent = d.title ? d.target : '';
            if (target.textContent) titleRow.appendChild(target);

            // SEO 描述
            if (d.description) {
                var desc = document.createElement('div');
                desc.className = 'site-detail-desc';
                desc.textContent = d.description;
                body.appendChild(desc);
            }
            body.appendChild(titleRow);

            // 元信息：解析 IP + 归属地
            var meta = document.createElement('div');
            meta.className = 'site-detail-meta';
            if (d.ips.length) {
                var m1 = document.createElement('span');
                m1.className = 'm';
                m1.innerHTML = '<b>解析 IP</b> ' + d.ips.map(esc).join('、');
                meta.appendChild(m1);
            }
            if (d.geo) {
                var parts = [d.geo.country, d.geo.region, d.geo.city].filter(Boolean);
                var loc = parts.join(' · ');
                if (loc) {
                    var m2 = document.createElement('span');
                    m2.className = 'm';
                    m2.innerHTML = '<b>归属地</b> ' + esc(loc);
                    meta.appendChild(m2);
                }
                if (d.geo.isp) {
                    var m3 = document.createElement('span');
                    m3.className = 'm';
                    var isCf = d.geo.isp.indexOf('Cloudflare') !== -1;
                    m3.innerHTML = '<b>服务商</b> ' +
                        (isCf ? '<span class="badge-cf">Cloudflare 代理</span>' : esc(d.geo.isp));
                    meta.appendChild(m3);
                }
            }

            body.appendChild(meta);
            card.appendChild(iconBox);
            card.appendChild(body);
            wrap.appendChild(card);
        });
        return wrap;
    }

    function esc(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    /* ---------- 骨架屏（先渲染空框架，数据就绪后渐显） ---------- */

    /** 构建一个骨架元素（skeleton + 形态类） */
    function skEl(shape, width) {
        var el = document.createElement('div');
        el.className = 'skeleton ' + (shape || 'sk-line');
        if (width) el.style.width = width;
        return el;
    }

    /** 表格骨架：模拟几行「目标 + 状态」 */
    function renderTableSkeleton(rows) {
        var wrap = document.createElement('div');
        wrap.className = 'tool-table-wrap sk-wrap';
        var box = document.createElement('div');
        box.className = 'sk-table';
        for (var i = 0; i < rows; i++) {
            var r = document.createElement('div');
            r.className = 'sk-table-row';
            r.appendChild(skEl('sk-line'));
            r.appendChild(skEl('sk-line'));
            box.appendChild(r);
        }
        wrap.appendChild(box);
        result.appendChild(wrap);
        return wrap;
    }

    /** 详情卡骨架：圆图标 + 几行文字条 */
    function renderDetailSkeleton(count) {
        var wrap = document.createElement('div');
        wrap.className = 'ot-details sk-wrap';
        for (var i = 0; i < count; i++) {
            var card = document.createElement('div');
            card.className = 'sk-detail';
            var circle = skEl('sk-circle');
            var lines = document.createElement('div');
            lines.className = 'sk-lines';
            lines.appendChild(skEl('sk-line'));
            lines.appendChild(skEl('sk-line'));
            lines.appendChild(skEl('sk-line'));
            card.appendChild(circle);
            card.appendChild(lines);
            wrap.appendChild(card);
        }
        result.appendChild(wrap);
        return wrap;
    }

    /**
     * 就地替换骨架：真实内容以 fade-in 插入骨架前，骨架渐隐后移除。
     * 与旧方案不同：各处骨架独立替换、独立渐显，「先显示什么，骨架就变换什么」。
     */
    function replaceSkeleton(skWrap, realEl) {
        if (!realEl) {
            if (skWrap && skWrap.parentNode) skWrap.remove();
            return;
        }
        realEl.classList.add('fade-in');
        if (skWrap && skWrap.parentNode) {
            skWrap.parentNode.insertBefore(realEl, skWrap);
            skWrap.style.transition = 'opacity 0.2s ease';
            skWrap.style.opacity = '0';
            setTimeout(function () { skWrap.remove(); }, 220);
        } else {
            result.appendChild(realEl);
        }
    }

    /**
     * 通配符查询（*.AB.XXX，可带端口 *.AB.XXX:8443）：
     * 逐个尝试常见子域，探测出一个即动态插入表格行，直到全部完成。
     */
    function runWildcard(wildHost) {
        // 分离通配符与端口：*.root:port
        var port = null;
        var w = wildHost;
        var pm = wildHost.match(/^(.*?)(:[0-9]{1,5})$/);
        if (pm) {
            var pn = parseInt(pm[2].slice(1), 10);
            if (pn >= 1 && pn <= 65535) {
                port = pn;
                w = pm[1];
            }
        }
        var root = N.wildcardRoot(w);
        result.innerHTML = '';

        // 表格容器（动态插入行）
        var wrap = document.createElement('div');
        wrap.className = 'tool-table-wrap';
        var table = document.createElement('table');
        table.className = 'tool-table';
        var thead = document.createElement('thead');
        var trH = document.createElement('tr');
        var thT = document.createElement('th');
        thT.innerHTML = '<span class="th-inner"><iconify-icon icon="fluent:globe-20-regular"></iconify-icon> 子域</span>';
        var thS = document.createElement('th');
        thS.innerHTML = '<span class="th-inner"><iconify-icon icon="fluent:pulse-20-regular"></iconify-icon> 状态</span>';
        trH.appendChild(thT);
        trH.appendChild(thS);
        thead.appendChild(trH);
        table.appendChild(thead);
        var tbody = document.createElement('tbody');
        table.appendChild(tbody);
        wrap.appendChild(table);
        result.appendChild(wrap);

        var info = document.createElement('div');
        info.className = 'wild-loading';
        info.textContent = '正在探测 ' + wildHost + ' 的子域（结果将逐条显示）…';
        result.appendChild(info);

        var found = 0;
        var t = now();

        var hosts = N.SUBDOMAINS.map(function (s) { return s + '.' + root; });
        return hosts.reduce(function (chain, host) {
            return chain.then(function () {
                return N.detectStatus(currentProto, host, port).then(function (res) {
                    var status = res.status;
                    if (status === 'online' || status === 'local-online') {
                        found++;
                        // 动态插入一行
                        var tr = document.createElement('tr');
                        var tdTarget = document.createElement('td');
                        tdTarget.className = 'mono';
                        tdTarget.textContent = port ? host + ':' + port : host;
                        var tdStatus = document.createElement('td');
                        var label = N.statusLabel(status);
                        var s = document.createElement('span');
                        s.className = 'st ' + label.cls;
                        s.textContent = label.text;
                        tdStatus.appendChild(s);
                        tr.appendChild(tdTarget);
                        tr.appendChild(tdStatus);
                        tbody.appendChild(tr);
                        upsertHistory({
                            proto: currentProto,
                            host: port ? host + ':' + port : host,
                            status: status,
                            error: null,
                            time: t,
                        });
                    }
                    renderHistory();
                });
            });
        }, Promise.resolve()).then(function () {
            info.textContent = found
                ? '探测完成，共发现 ' + found + ' 个在线子域'
                : '未发现在线子域（纯前端受限，仅探测常见子域字典）';
        });
    }

    /* ---------- 执行检测 ---------- */
    function run() {
        var value = input.value.trim();
        result.innerHTML = '';
        if (!value) return;

        // 通配符：*.AB.XXX（可带端口）
        if (N.isWildcard(value)) {
            var w = value.toLowerCase();
            btn.disabled = true;
            runWildcard(w).then(function () { btn.disabled = false; });
            return;
        }

        var target = N.parseTarget(value);
        if (!target) {
            var err = document.createElement('div');
            err.className = 'result-summary st-offline';
            err.textContent = '输入无效：请输入域名或 IP 地址（可带 :端口，禁止包含 /）';
            result.appendChild(err);
            return;
        }
        var host = target.host;
        var port = target.port;

        // 本地回环：直接显示，不探测（绑定回环提示 POP）
        if (N.isIPv4(host) && N.isLoopback(host)) {
            var sum = document.createElement('div');
            sum.className = 'result-summary st-loopback st-pop';
            sum.textContent = '本地回环';
            result.appendChild(sum);
            if (window.Hermes.Popover) {
                window.Hermes.Popover.bind(sum, loopbackPopOpts());
            }
            upsertHistory({ proto: currentProto, host: value, status: 'loopback', error: null, time: now() });
            renderHistory();
            return;
        }

        var isRoot = N.isRootDomain(host);
        // 根域名（无端口时）：同时测试 www. 与裸域
        var hosts = [host];
        if (isRoot && !port) {
            hosts = ['www.' + host, host];
        }

        // 展示目标（含端口）
        var displayHosts = hosts.map(function (h) {
            return port ? h + ':' + port : h;
        });

        btn.disabled = true;

        // 先渲染流光骨架屏（表格 + 详情卡占位），数据就绪后逐块就地替换
        result.innerHTML = '';
        var tableSk = renderTableSkeleton(hosts.length);
        var detailSk = renderDetailSkeleton(hosts.length);

        Promise.all(hosts.map(function (h) {
            return N.detectStatus(currentProto, h, port).then(function (res) {
                return { target: port ? h + ':' + port : h, host: h, port: port, status: res.status, error: res.error };
            });
        })).then(function (items) {
            btn.disabled = false;
            // 探测数据到达：仅替换表格骨架；详情骨架保留，等待详情数据
            replaceSkeleton(tableSk, renderTable(items));

            // 在线目标：抓取解析 IP / 归属地 / 站点名 / SEO / 图标
            Promise.all(items.map(fetchDetails)).then(function (details) {
                // 详情数据到达：替换详情骨架（站点名缺失时用域名兜底，不隐藏）
                replaceSkeleton(detailSk, renderDetails(details));
            });
            var t = now();
            if (isRoot && !port) {
                // 合并为一条：*.XXX.XX，状态取任一在线即「在线」
                var anyOnline = items.some(function (it) {
                    return it.status === 'online' || it.status === 'local-online';
                });
                var merged = {
                    proto: currentProto,
                    host: '*.' + host,
                    status: anyOnline ? 'online' : 'offline',
                    error: anyOnline ? null : (items[0] && items[0].error),
                    time: t,
                };
                upsertHistory(merged);
            } else {
                items.forEach(function (it) {
                    upsertHistory({
                        proto: currentProto,
                        host: it.target,
                        status: it.status,
                        error: it.error,
                        time: t,
                    });
                });
            }
            renderHistory();
        });
    }

    btn.addEventListener('click', run);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); });

    renderHistory();
    loadErrDict();   // 预加载错误码字典，供离线 POP 使用
})();
