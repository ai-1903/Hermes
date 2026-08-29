/**
 * iris-bridge.js — 伊里斯桥（色彩转换）页面逻辑（纯前端）
 * 类别：页面
 * 职责：
 *   1. 左侧可拖拽调色盘（HSV 方形 + 底部透明度条）
 *   2. 右侧 RGBA / HEX / OKLCH / CMYK 输入框组，双向同步转换
 *      - 内部以 RGBA(0-255, a 0-1) 为基准，其它格式转换后展示
 *      - 输入框失焦（blur / change）才判定更新，同步其它格式
 *   3. 每行圆形颜色示意 + 圆形复制按钮（悬停向右展开胶囊选项，绝对定位不偏移）
 *   4. 色域不支持（P3 / CMYK 溢出）时模态框提示（fixed 定位，不影响布局）
 * 转换：OKLCH <-> sRGB（CSS Color 4 标准算法）；CMYK <-> RGB（标准公式）
 */
(function () {
    'use strict';

    /* ================= 元素引用 ================= */
    var picker     = document.getElementById('ir-picker');
    var pickerCtx  = picker.getContext('2d');
    var alphaCan   = document.getElementById('ir-alpha');
    var alphaCtx   = alphaCan.getContext('2d');
    var alphaThumb = document.getElementById('ir-alpha-thumb');
    var valueCan   = document.getElementById('ir-value');
    var valueCtx   = valueCan ? valueCan.getContext('2d') : null;
    var valueThumb = document.getElementById('ir-value-thumb');
    var bannerP3   = document.getElementById('ir-banner-p3');
    var bannerCmyk = document.getElementById('ir-banner-cmyk');

    function qa(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

    // 各格式输入框
    var rgbaInputs = qa('.ir-rgba');
    var hexInput   = document.querySelector('.ir-hex');
    var oklchInputs = qa('.ir-oklch');
    var cmykInputs = qa('.ir-cmyk');
    // 各格式示意色块
    var swatches = {};
    qa('.ir-swatch').forEach(function (s) { swatches[s.dataset.format] = s; });

    /* ================= 内部状态：RGBA 基准 ================= */
    var state = { r: 34, g: 211, b: 238, a: 1 };   // 默认青色

    /* ================= 颜色转换 ================= */

    /** sRGB(0-255) -> linear(0-1) */
    function srgbToLinear(c) {
        c /= 255;
        return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    }
    /** linear(0-1) -> sRGB(0-255)，不钳制（用于色域判断） */
    function linearToSrgbRaw(c) {
        return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    }

    /** RGB(0-255) -> OKLab [L,a,b] */
    function rgbToOklab(r, g, b) {
        var lr = srgbToLinear(r), lg = srgbToLinear(g), lb = srgbToLinear(b);
        var l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
        var m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
        var s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
        var l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
        return [
            0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
            1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
            0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
        ];
    }

    /** OKLab [L,a,b] -> linear sRGB [r,g,b]（未钳制，0-1 范围） */
    function oklabToLinearRgb(L, a, b) {
        var l_ = L + 0.3963377774 * a + 0.2158037573 * b;
        var m_ = L - 0.1055613458 * a - 0.0638541728 * b;
        var s_ = L - 0.0894841775 * a - 1.2914855480 * b;
        var l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
        return [
            +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
            -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
            -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
        ];
    }

    /** RGB(0-255) -> OKLCH {l,c,h} */
    function rgbToOklch(r, g, b) {
        var lab = rgbToOklab(r, g, b);
        var C = Math.sqrt(lab[1] * lab[1] + lab[2] * lab[2]);
        var H = Math.atan2(lab[2], lab[1]) * 180 / Math.PI;
        if (H < 0) H += 360;
        return { l: lab[0], c: C, h: H };
    }

    /** OKLCH -> linear sRGB（未钳制，用于色域判断；返回 {r,g,b} 0-1 范围） */
    function oklchToLinearRgb(l, c, h) {
        var a = c * Math.cos(h * Math.PI / 180);
        var b = c * Math.sin(h * Math.PI / 180);
        return oklabToLinearRgb(l, a, b);
    }

    /** RGB(0-255) -> CMYK {c,m,y,k} (0-1) */
    function rgbToCmyk(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        var k = 1 - Math.max(r, g, b);
        if (k === 1) return { c: 0, m: 0, y: 0, k: 1 };
        return {
            c: (1 - r - k) / (1 - k),
            m: (1 - g - k) / (1 - k),
            y: (1 - b - k) / (1 - k),
            k: k,
        };
    }

    /** CMYK -> RGB(0-255) */
    function cmykToRgb(c, m, y, k) {
        return {
            r: Math.round(255 * (1 - c) * (1 - k)),
            g: Math.round(255 * (1 - m) * (1 - k)),
            b: Math.round(255 * (1 - y) * (1 - k)),
        };
    }

    /* ================= 色域判断 ================= */
    /** 当前 RGB 是否超出 sRGB（来自 OKLCH，P3 广色域） */
    function isOutOfSrgb() {
        // 用 OKLCH 反推 linear，看是否超出 [0,1]
        var okl = rgbToOklch(state.r, state.g, state.b);
        var lin = oklchToLinearRgb(okl.l, okl.c, okl.h);
        // 当前颜色是 sRGB 内的颜色，其 OKLCH 反推应接近 [0,1]；超出则说明 P3
        // 但由于 state 本身来自 sRGB，此处判断无意义——改为判断「OKLCH 输入是否超出 sRGB 可表示」
        return false;
    }

    /** OKLCH 值是否超出 sRGB 色域（P3 广色域，RGBA/CMYK 无法精确表示）
     *  容差 0.01：用户输入 OKLCH 时天然有 4 位小数舍入误差，
     *  精确 sRGB 色往返误差 <0.01，而真 P3 色远超该阈值。 */
    function oklchOutOfSrgb(l, c, h) {
        var lin = oklchToLinearRgb(l, c, h);
        var eps = 0.01;
        return lin[0] < -eps || lin[0] > 1 + eps ||
               lin[1] < -eps || lin[1] > 1 + eps ||
               lin[2] < -eps || lin[2] > 1 + eps;
    }

    /** CMYK 值是否超出印刷色域（CMYK 无法精确表示当前显示色） */
    function cmykOutOfGamut(c, m, y) {
        return c < -0.0001 || c > 1.0001 ||
               m < -0.0001 || m > 1.0001 ||
               y < -0.0001 || y > 1.0001;
    }

    /* ================= 渲染 ================= */
    /** 更新所有输入框 / 色块 / 调色盘 */
    function renderAll() {
        // RGBA
        rgbaInputs[0].value = Math.round(state.r);
        rgbaInputs[1].value = Math.round(state.g);
        rgbaInputs[2].value = Math.round(state.b);
        rgbaInputs[3].value = fmt(state.a, 3);

        // HEX（带或不带 alpha：a<1 时输出 8 位）
        var hex = toHex(state.r) + toHex(state.g) + toHex(state.b);
        if (state.a < 0.999) hex += toHex(Math.round(state.a * 255));
        hexInput.value = hex;

        // OKLCH（H 用 2 位小数，保证纯色往返精度）
        var okl = rgbToOklch(state.r, state.g, state.b);
        oklchInputs[0].value = fmt(okl.l, 4);
        oklchInputs[1].value = fmt(okl.c, 4);
        oklchInputs[2].value = fmt(okl.h, 2);
        oklchInputs[3].value = fmt(state.a, 3);

        // CMYK
        var cmyk = rgbToCmyk(state.r, state.g, state.b);
        cmykInputs[0].value = fmt(cmyk.c, 4);
        cmykInputs[1].value = fmt(cmyk.m, 4);
        cmykInputs[2].value = fmt(cmyk.y, 4);
        cmykInputs[3].value = fmt(cmyk.k, 4);

        renderSwatches();
        renderPicker();
        renderAlpha();
        renderValue();
    }

    function toHex(n) {
        var s = Math.max(0, Math.min(255, Math.round(n))).toString(16).toUpperCase();
        return s.length < 2 ? '0' + s : s;
    }

    function fmt(n, dec) {
        n = Math.round(n * Math.pow(10, dec)) / Math.pow(10, dec);
        return String(n);
    }

    function renderSwatches() {
        var rgbStr = 'rgba(' + Math.round(state.r) + ',' + Math.round(state.g) + ',' +
                     Math.round(state.b) + ',' + state.a + ')';
        Object.keys(swatches).forEach(function (k) { swatches[k].style.background = rgbStr; });
    }

    /* ---------- 调色盘绘制（HSV：色相 x，饱和度 y） ---------- */
    function renderPicker() {
        var w = picker.width, h = picker.height;
        var img = pickerCtx.createImageData(w, h);
        var i, x, y, hue, sat, v;
        // 顶部横轴为色相（0-360），纵向为饱和度（0-1），亮度取当前色
        var value = Math.max(state.r, state.g, state.b) / 255;
        for (y = 0; y < h; y++) {
            sat = 1 - y / h;
            for (x = 0; x < w; x++) {
                hue = (x / w) * 360;
                var rgb = hsvToRgb(hue, sat, value);
                i = (y * w + x) * 4;
                img.data[i] = rgb[0];
                img.data[i + 1] = rgb[1];
                img.data[i + 2] = rgb[2];
                img.data[i + 3] = 255;
            }
        }
        pickerCtx.putImageData(img, 0, 0);

        // 当前色光标（空心圆）
        var cur = rgbToHsv(state.r, state.g, state.b);
        var cx = (cur.h / 360) * w;
        var cy = (1 - cur.s) * h;
        pickerCtx.strokeStyle = 'rgba(255,255,255,0.9)';
        pickerCtx.lineWidth = 2;
        pickerCtx.beginPath();
        pickerCtx.arc(cx, cy, 9, 0, Math.PI * 2);
        pickerCtx.stroke();
        pickerCtx.strokeStyle = 'rgba(0,0,0,0.5)';
        pickerCtx.lineWidth = 1;
        pickerCtx.beginPath();
        pickerCtx.arc(cx, cy, 11, 0, Math.PI * 2);
        pickerCtx.stroke();
    }

    function hsvToRgb(h, s, v) {
        h = ((h % 360) + 360) % 360;
        var c = v * s;
        var x = c * (1 - Math.abs((h / 60) % 2 - 1));
        var m = v - c;
        var r, g, b;
        if (h < 60) { r = c; g = x; b = 0; }
        else if (h < 120) { r = x; g = c; b = 0; }
        else if (h < 180) { r = 0; g = c; b = x; }
        else if (h < 240) { r = 0; g = x; b = c; }
        else if (h < 300) { r = x; g = 0; b = c; }
        else { r = c; g = 0; b = x; }
        return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
    }

    function rgbToHsv(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var d = max - min, h = 0, s = max === 0 ? 0 : d / max, v = max;
        if (d !== 0) {
            if (max === r) h = ((g - b) / d) % 6;
            else if (max === g) h = (b - r) / d + 2;
            else h = (r - g) / d + 4;
            h *= 60;
            if (h < 0) h += 360;
        }
        return { h: h, s: s, v: v };
    }

    /* ---------- 透明度条绘制（棋盘格 + 当前色） ---------- */
    function renderAlpha() {
        var w = alphaCan.width, h = alphaCan.height;
        // 棋盘格
        var img = alphaCtx.createImageData(w, h);
        var i, x, y, cell;
        for (y = 0; y < h; y++) {
            for (x = 0; x < w; x++) {
                cell = (Math.floor(x / 10) + Math.floor(y / 10)) % 2 === 0;
                i = (y * w + x) * 4;
                img.data[i] = cell ? 40 : 20;
                img.data[i + 1] = cell ? 48 : 26;
                img.data[i + 2] = cell ? 66 : 38;
                img.data[i + 3] = 255;
            }
        }
        alphaCtx.putImageData(img, 0, 0);

        // 覆盖当前色（按 alpha 渐变示意）
        var grad = alphaCtx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, 'rgba(' + Math.round(state.r) + ',' + Math.round(state.g) + ',' + Math.round(state.b) + ',0)');
        grad.addColorStop(1, 'rgba(' + Math.round(state.r) + ',' + Math.round(state.g) + ',' + Math.round(state.b) + ',1)');
        alphaCtx.fillStyle = grad;
        alphaCtx.fillRect(0, 0, w, h);

        // 滑块位置
        alphaThumb.style.left = (state.a * w) + 'px';
    }

    /* ---------- 明度条绘制（HSV V 值：黑 → 当前色相+饱和度的纯色） ---------- */
    function renderValue() {
        if (!valueCtx) return;
        var w = valueCan.width, h = valueCan.height;
        var grad = valueCtx.createLinearGradient(0, 0, w, 0);
        var hsv = rgbToHsv(state.r, state.g, state.b);
        // 保持当前色相 + 饱和度，明度从 0（黑）到 1（纯色）
        grad.addColorStop(0, 'rgb(0,0,0)');
        grad.addColorStop(1, 'rgb(' + hsvToRgb(hsv.h, hsv.s, 1).join(',') + ')');
        valueCtx.fillStyle = grad;
        valueCtx.fillRect(0, 0, w, h);

        // 滑块位置
        if (valueThumb) valueThumb.style.left = (hsv.v * w) + 'px';
    }

    /* ================= 输入解析（失焦更新） ================= */
    function clamp(n, lo, hi) {
        if (isNaN(n)) return lo;
        return Math.max(lo, Math.min(hi, n));
    }

    function parseRgba() {
        var r = clamp(parseInt(rgbaInputs[0].value, 10), 0, 255);
        var g = clamp(parseInt(rgbaInputs[1].value, 10), 0, 255);
        var b = clamp(parseInt(rgbaInputs[2].value, 10), 0, 255);
        var a = clamp(parseFloat(rgbaInputs[3].value), 0, 1);
        if (isNaN(a)) a = 1;
        state = { r: r, g: g, b: b, a: a };
    }

    function parseHex() {
        var v = hexInput.value.replace(/^#/, '').trim();
        var a = 1;
        if (/^[0-9a-fA-F]{6}$/.test(v)) {
            state.r = parseInt(v.substr(0, 2), 16);
            state.g = parseInt(v.substr(2, 2), 16);
            state.b = parseInt(v.substr(4, 2), 16);
            state.a = a;
        } else if (/^[0-9a-fA-F]{8}$/.test(v)) {
            state.r = parseInt(v.substr(0, 2), 16);
            state.g = parseInt(v.substr(2, 2), 16);
            state.b = parseInt(v.substr(4, 2), 16);
            state.a = parseInt(v.substr(6, 2), 16) / 255;
        }
        // 无效则忽略（保持原值）
    }

    function parseOklch() {
        var l = parseFloat(oklchInputs[0].value);
        var c = parseFloat(oklchInputs[1].value);
        var h = parseFloat(oklchInputs[2].value);
        var a = parseFloat(oklchInputs[3].value);
        if (isNaN(l) || isNaN(c) || isNaN(h)) return;
        if (isNaN(a)) a = 1;
        a = clamp(a, 0, 1);
        // 色域判断：OKLCH 超出 sRGB（P3）→ 底部横幅提示
        if (oklchOutOfSrgb(l, c, h)) {
            showBanner('p3');
        } else {
            hideBanner('p3');
        }
        var lin = oklchToLinearRgb(l, c, h);
        state.r = Math.round(clamp(linearToSrgbRaw(lin[0]) * 255, 0, 255));
        state.g = Math.round(clamp(linearToSrgbRaw(lin[1]) * 255, 0, 255));
        state.b = Math.round(clamp(linearToSrgbRaw(lin[2]) * 255, 0, 255));
        state.a = a;
    }

    function parseCmyk() {
        var c = parseFloat(cmykInputs[0].value);
        var m = parseFloat(cmykInputs[1].value);
        var y = parseFloat(cmykInputs[2].value);
        var k = parseFloat(cmykInputs[3].value);
        if (isNaN(c) || isNaN(m) || isNaN(y) || isNaN(k)) return;
        c = clamp(c, 0, 1); m = clamp(m, 0, 1); y = clamp(y, 0, 1); k = clamp(k, 0, 1);
        // CMYK 色域判断
        var check = rgbToCmyk(state.r, state.g, state.b);
        if (cmykOutOfGamut(check.c, check.m, check.y)) {
            showBanner('cmyk');
        } else {
            hideBanner('cmyk');
        }
        var rgb = cmykToRgb(c, m, y, k);
        state.r = rgb.r; state.g = rgb.g; state.b = rgb.b;
    }

    /* ================= 色域提示横幅（主内容下方列表，动态显隐无关闭按钮） =================
       超出显示 / 调回自动隐藏：showBanner / hideBanner 由各解析函数在每次更新时调用。 */
    function showBanner(kind) {
        var b = kind === 'cmyk' ? bannerCmyk : bannerP3;
        if (b) b.hidden = false;
    }
    function hideBanner(kind) {
        var b = kind === 'cmyk' ? bannerCmyk : bannerP3;
        if (b) b.hidden = true;
    }

    /* ================= 输入事件绑定 ================= */
    function bindCommit(inputs, parser) {
        inputs.forEach(function (inp) {
            // 失焦 / 回车判定更新
            inp.addEventListener('blur', function () { parser(); renderAll(); });
            inp.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') { parser(); renderAll(); inp.blur(); }
            });
        });
    }
    bindCommit(rgbaInputs, parseRgba);
    bindCommit(oklchInputs, parseOklch);
    bindCommit(cmykInputs, parseCmyk);
    hexInput.addEventListener('blur', function () { parseHex(); renderAll(); });
    hexInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { parseHex(); renderAll(); hexInput.blur(); }
    });
    // HEX 粘贴自动去 #
    hexInput.addEventListener('paste', function (e) {
        var txt = (e.clipboardData || window.clipboardData).getData('text') || '';
        e.preventDefault();
        hexInput.value = txt.replace(/^#/, '').replace(/[^0-9a-fA-F]/g, '').toUpperCase();
        parseHex();
        renderAll();
    });

    /* ================= 调色盘 / 透明度拖拽 ================= */
    var dragging = null;   // 'picker' | 'alpha'

    function pickerPos(e) {
        var r = picker.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width;
        var y = (e.clientY - r.top) / r.height;
        x = clamp(x, 0, 1); y = clamp(y, 0, 1);
        return { x: x, y: y };
    }
    function alphaPos(e) {
        var r = alphaCan.getBoundingClientRect();
        return clamp((e.clientX - r.left) / r.width, 0, 1);
    }

    function valuePos(e) {
        var r = valueCan.getBoundingClientRect();
        return clamp((e.clientX - r.left) / r.width, 0, 1);
    }

    function applyPicker(x, y) {
        var hue = x * 360;
        var sat = 1 - y;
        // 明度保持当前 V（由明度条控制）
        var v = rgbToHsv(state.r, state.g, state.b).v;
        var rgb = hsvToRgb(hue, sat, v);
        state.r = rgb[0]; state.g = rgb[1]; state.b = rgb[2];
        renderAll();
    }
    function applyAlpha(a) {
        state.a = a;
        renderAll();
    }
    function applyValue(v) {
        // 保持当前色相 + 饱和度，仅调明度
        var hsv = rgbToHsv(state.r, state.g, state.b);
        var rgb = hsvToRgb(hsv.h, hsv.s, v);
        state.r = rgb[0]; state.g = rgb[1]; state.b = rgb[2];
        renderAll();
    }

    picker.addEventListener('mousedown', function (e) {
        dragging = 'picker';
        var p = pickerPos(e);
        applyPicker(p.x, p.y);
    });
    alphaCan.addEventListener('mousedown', function (e) {
        dragging = 'alpha';
        applyAlpha(alphaPos(e));
    });
    if (valueCan) valueCan.addEventListener('mousedown', function (e) {
        dragging = 'value';
        applyValue(valuePos(e));
    });
    document.addEventListener('mousemove', function (e) {
        if (!dragging) return;
        if (dragging === 'picker') {
            var p = pickerPos(e);
            applyPicker(p.x, p.y);
        } else if (dragging === 'alpha') {
            applyAlpha(alphaPos(e));
        } else if (dragging === 'value') {
            applyValue(valuePos(e));
        }
    });
    document.addEventListener('mouseup', function () { dragging = null; });

    /* ================= 复制按钮展开 ================= */
    var copyStates = {
        hex:  { mode: 'hash',   options: ['hash', 'nohash'] },
        rgba: { mode: 'space',  options: ['space', 'comma'] },
        oklch:{ mode: 'space',  options: ['space', 'comma'] },
        cmyk: { mode: 'space',  options: ['space', 'comma'] },
    };

    function rgbaStr(mode) {
        var r = Math.round(state.r), g = Math.round(state.g), b = Math.round(state.b);
        var a = fmt(state.a, 3);
        return mode === 'space' ? r + ' ' + g + ' ' + b + ' / ' + a : r + ', ' + g + ', ' + b + ', ' + a;
    }
    function hexStr(mode) {
        var h = toHex(state.r) + toHex(state.g) + toHex(state.b);
        if (state.a < 0.999) h += toHex(Math.round(state.a * 255));
        return mode === 'hash' ? '#' + h : h;
    }
    function oklchStr(mode) {
        var okl = rgbToOklch(state.r, state.g, state.b);
        var a = fmt(state.a, 3);
        var core = fmt(okl.l, 4) + ' ' + fmt(okl.c, 4) + ' ' + fmt(okl.h, 2);
        return mode === 'space' ? core + ' / ' + a : core.replace(/ /g, ', ') + ', ' + a;
    }
    function cmykStr(mode) {
        var cmyk = rgbToCmyk(state.r, state.g, state.b);
        var core = fmt(cmyk.c, 4) + ' ' + fmt(cmyk.m, 4) + ' ' + fmt(cmyk.y, 4) + ' ' + fmt(cmyk.k, 4);
        return mode === 'space' ? core : core.replace(/ /g, ', ');
    }
    var COPY_FN = { rgba: rgbaStr, hex: hexStr, oklch: oklchStr, cmyk: cmykStr };

    function copyText(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).catch(function () { fallbackCopy(text); });
        } else {
            fallbackCopy(text);
        }
    }
    function fallbackCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e) { /* 忽略 */ }
        ta.remove();
    }

    /* ================= 复制按钮展开（本体伸展） =================
       桌面：悬停（CSS :hover）时按钮本体向右伸展为两个胶囊；
       移动端：点击按钮切换 .open 展开，两个胶囊横排到输入框底部。 */
    function isMobile() {
        return window.innerWidth <= 820;
    }

    // 初始化每个复制按钮组
    Object.keys(copyStates).forEach(function (fmt) {
        var row = document.querySelector('.ir-row[data-format="' + fmt + '"]');
        var copy = row.querySelector('.ir-copy');
        var btn = row.querySelector('.ir-copy-btn');
        var opts = row.querySelectorAll('.ir-copy-opt');

        function markActive() {
            opts.forEach(function (o) {
                o.classList.toggle('active', o.dataset.mode === copyStates[fmt].mode);
            });
        }
        markActive();

        // 移动端：点击按钮切换展开
        if (btn) {
            btn.addEventListener('click', function (e) {
                if (!isMobile()) return;   // 桌面交给 CSS hover
                e.stopPropagation();
                copy.classList.toggle('open');
            });
        }

        // 点击选项：复制（桌面展开态 / 移动端展开态下）
        opts.forEach(function (o) {
            o.addEventListener('click', function (e) {
                e.stopPropagation();
                copyStates[fmt].mode = o.dataset.mode;
                markActive();
                copyText(COPY_FN[fmt](o.dataset.mode));
                o.classList.add('copied');
                setTimeout(function () { o.classList.remove('copied'); }, 1200);
                // 移动端复制后收起
                if (isMobile()) copy.classList.remove('open');
            });
        });
    });

    /* ================= 初始化 ================= */
    renderAll();
})();
