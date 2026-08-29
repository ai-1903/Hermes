/**
 * coder.js — Coder 编解码工具逻辑（纯前端，不依赖服务器）
 * 类别：页面
 * 职责：
 *   1. 选项卡控制输出类型（文本 / base64 / UTF-8 / Unicode / URL）
 *   2. 智能识别输入内容的编码类型（自动判定），并转换为所选输出类型
 *   3. 「手动」选项卡：输入 / 输出类型由两个选择列表分别指定，
 *      解决自动识别与用户意图不一致（内容与另一类型重合）的问题
 *   4. 输出框一键复制
 */
(function () {
    'use strict';

    var input      = document.getElementById('cd-input');
    var output     = document.getElementById('cd-output');
    var inTypeEl   = document.getElementById('cd-in-type');
    var outTypeEl  = document.getElementById('cd-out-type');
    var copyBtn    = document.getElementById('cd-copy');
    var copyLabel  = document.getElementById('cd-copy-label');
    var tabs       = Array.prototype.slice.call(document.querySelectorAll('.coder-tab'));
    var currentType = 'text';

    /* ---------- 手动模式状态 ---------- */
    var isManual      = false;              // 是否为「手动」选项卡
    var manualInType  = 'text';             // 手动指定的输入类型
    var manualOutType = 'text';             // 手动指定的输出类型
    var inTrigger  = document.getElementById('cd-in-type-trigger');
    var inTypeLbl  = document.getElementById('cd-in-type-label');
    var outTrigger = document.getElementById('cd-out-type-trigger');
    var outTypeLbl = document.getElementById('cd-out-type-label');

    /* ---------- 类型标签 ---------- */
    var TYPE_LABEL = {
        text:    '文本',
        base64:  'base64 编码',
        utf8:    'UTF-8 编码',
        unicode: 'Unicode 编码',
        url:     'URL 编码',
    };

    /* ---------- 基础工具 ---------- */
    function utf8Encode(text) {
        return new TextEncoder().encode(text);
    }
    function utf8Decode(bytes) {
        return new TextDecoder('utf-8').decode(bytes);
    }
    function bytesToHex(bytes) {
        return Array.prototype.map.call(bytes, function (b) {
            return b.toString(16).toUpperCase().padStart(2, '0');
        }).join(' ');
    }
    function hexToBytes(hex) {
        var clean = hex.replace(/\s+/g, '');
        if (!/^[0-9a-fA-F]+$/.test(clean) || clean.length % 2 !== 0) return null;
        var bytes = new Uint8Array(clean.length / 2);
        for (var i = 0; i < clean.length; i += 2) {
            bytes[i / 2] = parseInt(clean.substr(i, 2), 16);
        }
        return bytes;
    }

    /* ---------- base64 ---------- */
    function base64Encode(text) {
        var bytes = utf8Encode(text);
        var bin = '';
        for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        return btoa(bin);
    }
    function base64Decode(b64) {
        var bin = atob(b64);
        var bytes = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return utf8Decode(bytes);
    }

    /* ---------- Unicode 转义（\uXXXX，支持 \u{...} 代理对） ---------- */
    function unicodeEncode(text) {
        var out = '';
        for (var i = 0; i < text.length; i++) {
            var code = text.charCodeAt(i);
            if (code >= 0xD800 && code <= 0xDBFF && i + 1 < text.length) {
                var low = text.charCodeAt(i + 1);
                if (low >= 0xDC00 && low <= 0xDFFF) {
                    var cp = (code - 0xD800) * 0x400 + (low - 0xDC00) + 0x10000;
                    out += '\\u{' + cp.toString(16).toUpperCase() + '}';
                    i++;
                    continue;
                }
            }
            out += '\\u' + code.toString(16).toUpperCase().padStart(4, '0');
        }
        return out;
    }
    function unicodeDecode(str) {
        return str.replace(/\\u\{([0-9a-fA-F]+)\}|\\u([0-9a-fA-F]{4})/g, function (m, cp, four) {
            if (cp) return String.fromCodePoint(parseInt(cp, 16));
            return String.fromCharCode(parseInt(four, 16));
        });
    }

    /* ---------- URL 百分号编码 ---------- */
    function urlEncode(text) {
        // 完整百分号编码（含 !'()* 等保留字符）
        return encodeURIComponent(text).replace(/[!'()*]/g, function (c) {
            return '%' + c.charCodeAt(0).toString(16).toUpperCase();
        });
    }
    function urlDecode(str) {
        return decodeURIComponent(str);
    }

    /* ---------- 智能识别输入类型 ---------- */
    function isReadable(s) {
        // 判定为「可读文本」：可打印 ASCII + 中文（其余语言也算可读，宽松处理）
        return /^[\x20-\x7E -￿]*$/.test(s);
    }

    function detectType(str) {
        if (!str) return 'text';
        var s = String(str);

        // 1) URL 编码：含 %xx 且能成功解码为可读文本
        if (/%[0-9a-fA-F]{2}/.test(s)) {
            try {
                var u = urlDecode(s);
                if (isReadable(u)) return 'url';
            } catch (e) { /* 解码失败则继续 */ }
        }

        // 2) Unicode 转义：含 \uXXXX 或 \u{...}
        if (/\\u\{[0-9a-fA-F]+\}|\\u[0-9a-fA-F]{4}/.test(s)) {
            return 'unicode';
        }

        // 3) base64：形如 base64（可含换行）且能解码为可读文本
        var b64c = s.replace(/\s+/g, '');
        if (/^[A-Za-z0-9+/]+={0,2}$/.test(b64c) && b64c.length % 4 === 0 && b64c.length >= 4) {
            try {
                var d = base64Decode(b64c);
                if (isReadable(d)) return 'base64';
            } catch (e) { /* 忽略 */ }
        }

        // 4) UTF-8 hex：纯十六进制字节（可有空格/分隔）且能解码为可读文本
        var hexc = s.trim();
        if (/^([0-9a-fA-F]{2}[\s-]?)+$/.test(hexc)) {
            var bytes = hexToBytes(hexc.replace(/-/g, ' '));
            if (bytes) {
                try {
                    var t = utf8Decode(bytes);
                    if (isReadable(t)) return 'utf8';
                } catch (e) { /* 忽略 */ }
            }
        }

        return 'text';
    }

    /* ---------- 解码输入 → 原始文本 ---------- */
    function decodeInput(type, s) {
        switch (type) {
            case 'base64':
                return base64Decode(s.replace(/\s+/g, ''));
            case 'utf8':
                return utf8Decode(hexToBytes(s.replace(/-/g, ' ')));
            case 'unicode':
                return unicodeDecode(s);
            case 'url':
                return urlDecode(s);
            default:
                return s;
        }
    }

    /* ---------- 按目标类型编码 ---------- */
    function encodeTarget(type, text) {
        switch (type) {
            case 'base64':  return base64Encode(text);
            case 'utf8':    return bytesToHex(utf8Encode(text));
            case 'unicode': return unicodeEncode(text);
            case 'url':     return urlEncode(text);
            default:        return text;
        }
    }

    /* ---------- 主流程 ---------- */
    function run() {
        var raw = input.value;
        var inType, outType;
        if (isManual) {
            // 手动模式：输入 / 输出类型由两个选择列表分别指定
            inType  = manualInType;
            outType = manualOutType;
        } else {
            // 自动模式：自动识别输入类型，输出用当前选项卡
            inType  = detectType(raw);
            outType = currentType;
        }
        var text;
        try {
            text = decodeInput(inType, raw);
        } catch (e) {
            text = raw;   // 解码失败按原样处理
        }
        var out = encodeTarget(outType, text);

        output.value = out;
        inTypeEl.textContent = TYPE_LABEL[inType];
        outTypeEl.textContent = TYPE_LABEL[outType];
    }

    /* ---------- 选项卡切换 ---------- */
    tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
            tabs.forEach(function (t) { t.classList.remove('active'); });
            tab.classList.add('active');
            currentType = tab.dataset.type;
            isManual = (currentType === 'manual');
            syncManualUI();
            run();
        });
    });

    /* ---------- 手动模式：类型选择列表（点击展开） ---------- */
    var MANUAL_TYPES = ['text', 'base64', 'utf8', 'unicode', 'url'];
    var typeMenu = null;   // 当前打开的类型选择列表

    /** 切换手动模式 UI：是否显示输入 / 输出两个类型选择按钮 */
    function syncManualUI() {
        if (inTrigger) inTrigger.hidden = !isManual;
        if (outTrigger) outTrigger.hidden = !isManual;
        if (!isManual) closeTypeMenu();
    }

    /** 在触发按钮下方展开类型选择列表 */
    function openTypeMenu(trigger, side) {
        closeTypeMenu();
        var menu = document.createElement('div');
        menu.className = 'coder-type-menu';
        menu.setAttribute('role', 'listbox');

        var current = side === 'in' ? manualInType : manualOutType;
        MANUAL_TYPES.forEach(function (type) {
            var opt = document.createElement('button');
            opt.type = 'button';
            opt.className = 'coder-type-option' + (type === current ? ' active' : '');
            opt.dataset.type = type;
            opt.textContent = TYPE_LABEL[type];
            opt.addEventListener('click', function () {
                if (side === 'in') {
                    manualInType = type;
                    inTypeLbl.textContent = TYPE_LABEL[type];
                } else {
                    manualOutType = type;
                    outTypeLbl.textContent = TYPE_LABEL[type];
                }
                closeTypeMenu();
                run();
            });
            menu.appendChild(opt);
        });

        document.body.appendChild(menu);
        typeMenu = menu;
        typeMenu.__side = side;
        trigger.setAttribute('aria-expanded', 'true');

        // 定位到触发按钮下方（限制在视口内，避免窄屏右侧溢出）
        var r = trigger.getBoundingClientRect();
        var left = Math.min(r.left, window.innerWidth - menu.offsetWidth - 8);
        menu.style.top  = r.bottom + 6 + 'px';
        menu.style.left = Math.max(8, left) + 'px';
    }

    /** 关闭当前打开的类型选择列表 */
    function closeTypeMenu() {
        if (typeMenu) { typeMenu.remove(); typeMenu = null; }
        if (inTrigger) inTrigger.setAttribute('aria-expanded', 'false');
        if (outTrigger) outTrigger.setAttribute('aria-expanded', 'false');
    }

    function toggleTypeMenu(trigger, side) {
        if (typeMenu && typeMenu.__side === side) closeTypeMenu();
        else openTypeMenu(trigger, side);
    }

    if (inTrigger) {
        inTrigger.addEventListener('click', function (e) {
            e.stopPropagation();
            toggleTypeMenu(inTrigger, 'in');
        });
    }
    if (outTrigger) {
        outTrigger.addEventListener('click', function (e) {
            e.stopPropagation();
            toggleTypeMenu(outTrigger, 'out');
        });
    }

    // 点击其他区域 / Esc 关闭类型列表
    document.addEventListener('click', function (e) {
        if (typeMenu && !typeMenu.contains(e.target)) closeTypeMenu();
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeTypeMenu();
    });

    /* ---------- 输入实时转换 ---------- */
    input.addEventListener('input', run);

    /* ---------- 一键复制 ---------- */
    copyBtn.addEventListener('click', function () {
        var text = output.value;
        if (!text) return;
        function copied() {
            copyBtn.classList.add('copied');
            copyLabel.textContent = '已复制';
            setTimeout(function () {
                copyBtn.classList.remove('copied');
                copyLabel.textContent = '复制';
            }, 1600);
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(copied).catch(function () {
                fallbackCopy(text);
                copied();
            });
        } else {
            fallbackCopy(text);
            copied();
        }
    });

    function fallbackCopy(text) {
        output.select();
        output.setSelectionRange(0, output.value.length);
        try { document.execCommand('copy'); } catch (e) { /* 忽略 */ }
    }

    run();   // 初始渲染
})();
