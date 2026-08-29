/**
 * hawkeye.js — Hawkeye 页面逻辑（纯前端 RDAP 查询，不依赖服务器）
 * 类别：页面
 * 依赖：lib/network.js
 * 职责：仅支持根域名；通过公共 RDAP 服务查询 Whois 信息，以带图标表头的
 *       <table> 展示（表头图标来自 iconify:fluent 的 regular 线性变体）。
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

    /** 字段 → { label, icon }（fluent 线性变体） */
    var FIELD_META = {
        '域名':    { icon: 'fluent:globe-20-regular' },
        '注册商':  { icon: 'fluent:briefcase-20-regular' },
        '归属人':  { icon: 'fluent:person-20-regular' },
        '邮箱':    { icon: 'fluent:mail-20-regular' },
        '状态':    { icon: 'fluent:checkmark-circle-20-regular' },
        '注册时间': { icon: 'fluent:calendar-edit-20-regular' },
        '过期时间': { icon: 'fluent:calendar-arrow-right-20-regular' },
        '更新时间': { icon: 'fluent:clock-20-regular' },
        'Name Server': { icon: 'fluent:server-20-regular' },
        'DNSSEC': { icon: 'fluent:shield-checkmark-20-regular' },
    };

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

    /** 从 vCard 数组取指定属性值（返回去重后的非空数组） */
    function vcardValues(vc, prop) {
        var out = [];
        (vc || []).forEach(function (item) {
            if (item && item[0] === prop && item[3]) {
                var v = String(item[3]).trim();
                if (v && out.indexOf(v) === -1) out.push(v);
            }
        });
        return out;
    }

    /** 从 entity 的 vcard 中取姓名（fn） */
    function entityName(entity) {
        var vc = entity && entity.vcardArray && entity.vcardArray[1];
        var fns = vcardValues(vc, 'fn');
        return fns.length ? fns.join('、') : null;
    }

    /** 从 entity 的 vcard 中取邮箱（email） */
    function entityEmail(entity) {
        var vc = entity && entity.vcardArray && entity.vcardArray[1];
        var mails = vcardValues(vc, 'email');
        return mails.length ? mails.join('、') : null;
    }

    /** 按角色优先级取首个匹配的 entity */
    function entityByRoles(entities, roles) {
        var list = entities || [];
        for (var i = 0; i < list.length; i++) {
            var e = list[i];
            if (e.roles && e.roles.some(function (r) { return roles.indexOf(r) !== -1; })) {
                return e;
            }
        }
        return null;
    }

    /** 将 RDAP 结果映射为字段数组 */
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

        // 归属人（registrant；退而求其次取 administrative / technical）
        var registrant = entityByRoles(data.entities, ['registrant']);
        if (!registrant) {
            registrant = entityByRoles(data.entities, ['administrative', 'technical']);
        }
        var ownerName = registrant ? entityName(registrant) : null;

        // 邮箱（优先 registrant，其次 admin/tech/abuse）
        var emailEntity = entityByRoles(data.entities, ['registrant'])
            || entityByRoles(data.entities, ['administrative', 'technical'])
            || entityByRoles(data.entities, ['abuse']);
        var email = emailEntity ? entityEmail(emailEntity) : null;
        if (!email) {
            // 兜底：扫描所有 entity 的 vcard email
            (data.entities || []).some(function (e) {
                var m = entityEmail(e);
                if (m) { email = m; return true; }
                return false;
            });
        }

        function eventDate(action) {
            var evs = (data.events || []).filter(function (e) {
                return e.eventAction === action;
            });
            return evs.map(function (e) { return e.eventDate; }).join(', ');
        }

        row('域名', data.ldhName || data.handle);
        row('注册商', regName);
        row('归属人', ownerName);
        row('邮箱', email);
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

    /** 以表格渲染（表头带 iconify 线性图标） */
    function renderTable(rows) {
        result.innerHTML = '';
        if (!rows.length) { showMsg('未查询到可展示的 Whois 信息'); return; }

        var wrap = document.createElement('div');
        wrap.className = 'tool-table-wrap';

        var table = document.createElement('table');
        table.className = 'tool-table';

        var thead = document.createElement('thead');
        var trHead = document.createElement('tr');
        var thK = document.createElement('th');
        thK.innerHTML = '<span class="th-inner"><iconify-icon icon="fluent:tag-20-regular"></iconify-icon> 字段</span>';
        var thV = document.createElement('th');
        thV.innerHTML = '<span class="th-inner"><iconify-icon icon="fluent:info-20-regular"></iconify-icon> 内容</span>';
        trHead.appendChild(thK);
        trHead.appendChild(thV);
        thead.appendChild(trHead);
        table.appendChild(thead);

        var tbody = document.createElement('tbody');
        rows.forEach(function (r) {
            var meta = FIELD_META[r.k] || {};
            var tr = document.createElement('tr');
            var tdK = document.createElement('td');
            tdK.className = 'k';
            tdK.innerHTML =
                '<span class="field-cell">' +
                (meta.icon ? '<iconify-icon icon="' + meta.icon + '"></iconify-icon>' : '') +
                escapeHtml(r.k) + '</span>';
            var tdV = document.createElement('td');
            if (r.html) { tdV.innerHTML = r.v; } else { tdV.textContent = r.v; }
            tr.appendChild(tdK);
            tr.appendChild(tdV);
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);

        wrap.appendChild(table);
        result.appendChild(wrap);
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
            renderTable(mapWhois(data));
        }).catch(function () {
            btn.disabled = false;
            showMsg('未能查询到 ' + value + ' 的 Whois 信息（域名可能不存在或服务暂不可用）');
        });
    }

    btn.addEventListener('click', run);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); });
})();
