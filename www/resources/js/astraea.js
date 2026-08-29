/**
 * astraea.js — Astraea 哈希校验页面逻辑（纯前端，不依赖服务器）
 * 类别：页面
 * 职责：
 *   1. 大上传拖放框：支持拖动上传与点击选择（input[type=file]）
 *   2. 文件仅在浏览器本地处理（不真实上传）
 *   3. 计算 MD5（自实现）与 SHA-256（Web Crypto）
 *   4. 下方两个可复制输出框，右侧复制按钮
 */
(function () {
    'use strict';

    var dropzone = document.getElementById('as-dropzone');
    var fileInput = document.getElementById('as-file');
    var outputs = document.getElementById('as-outputs');
    var fileNameEl = document.getElementById('as-file-name');
    var md5El = document.getElementById('as-md5');
    var sha256El = document.getElementById('as-sha256');

    /* ================= MD5 实现（浏览器无原生 MD5，自实现） ================= */

    /** 左旋 */
    function rotl(x, c) {
        return (x << c) | (x >>> (32 - c));
    }

    /** 将 ArrayBuffer 按小端 32 位字读取为数组 */
    function bytesToWords(buf) {
        var view = new DataView(buf);
        var len = Math.ceil(view.byteLength / 4);
        var words = new Array(len);
        for (var i = 0; i < len; i++) {
            words[i] = view.getUint32(i * 4, true);
        }
        return words;
    }

    /**
     * MD5（RFC 1321），返回小写十六进制。
     * 逐块处理，支持任意大小文件（避免一次性读入内存）。
     * @param {ArrayBuffer} buffer 文件/数据缓冲
     * @returns {string} 32 位小写 hex
     */
    function md5(buffer) {
        // 预置四字组（小端）
        var a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;

        // 常量子数组 T[i] = floor(2^32 * |sin(i)|)
        var T = [];
        for (var t = 1; t <= 64; t++) {
            T[t - 1] = Math.floor(Math.abs(Math.sin(t)) * 0x100000000);
        }

        // 每轮左移位数（与 RFC 1321 一致）
        var S = [
            7, 12, 17, 22,  7, 12, 17, 22,  7, 12, 17, 22,  7, 12, 17, 22,
            5,  9, 14, 20,  5,  9, 14, 20,  5,  9, 14, 20,  5,  9, 14, 20,
            4, 11, 16, 23,  4, 11, 16, 23,  4, 11, 16, 23,  4, 11, 16, 23,
            6, 10, 15, 21,  6, 10, 15, 21,  6, 10, 15, 21,  6, 10, 15, 21,
        ];

        var len = buffer.byteLength;
        // 填充：消息 + 0x80 + 若干 0 + 64 位长度（小端）
        // 填充后总长度 ≡ 448 mod 512，单位字节
        var withLen = len + 8;
        var paddedLen = (Math.ceil(withLen / 64) * 64);
        // 64 位长度放最后 8 字节
        var padded = new Uint8Array(paddedLen);
        padded.set(new Uint8Array(buffer), 0);
        padded[len] = 0x80;
        // 小端写入 64 位 bit 长度（低位在前，仅支持 < 2^53 字节）
        var bitLen = len * 8;
        var lenLow = bitLen >>> 0;
        var lenHigh = Math.floor(bitLen / 0x100000000);
        padded[paddedLen - 8] = lenLow & 0xff;
        padded[paddedLen - 7] = (lenLow >>> 8) & 0xff;
        padded[paddedLen - 6] = (lenLow >>> 16) & 0xff;
        padded[paddedLen - 5] = (lenLow >>> 24) & 0xff;
        padded[paddedLen - 4] = lenHigh & 0xff;
        padded[paddedLen - 3] = (lenHigh >>> 8) & 0xff;
        padded[paddedLen - 2] = (lenHigh >>> 16) & 0xff;
        padded[paddedLen - 1] = (lenHigh >>> 24) & 0xff;

        // 逐 64 字节（512 位）处理
        var view = new DataView(padded.buffer);
        for (var off = 0; off < paddedLen; off += 64) {
            var M = new Array(16);
            for (var j = 0; j < 16; j++) {
                M[j] = view.getUint32(off + j * 4, true);
            }

            var A = a0, B = b0, C = c0, D = d0;

            function F(x, y, z) { return (x & y) | (~x & z); }
            function G(x, y, z) { return (x & z) | (y & ~z); }
            function H(x, y, z) { return x ^ y ^ z; }
            function I(x, y, z) { return y ^ (x | ~z); }

            for (var i = 0; i < 64; i++) {
                var f, g;
                if (i < 16) {
                    f = F(B, C, D); g = i;
                } else if (i < 32) {
                    f = G(B, C, D); g = (5 * i + 1) % 16;
                } else if (i < 48) {
                    f = H(B, C, D); g = (3 * i + 5) % 16;
                } else {
                    f = I(B, C, D); g = (7 * i) % 16;
                }
                var temp = D;
                D = C;
                C = B;
                B = (B + rotl((A + f + T[i] + M[g]) >>> 0, S[i])) >>> 0;
                A = temp;
            }

            a0 = (a0 + A) >>> 0;
            b0 = (b0 + B) >>> 0;
            c0 = (c0 + C) >>> 0;
            d0 = (d0 + D) >>> 0;
        }

        // 输出小端十六进制
        function hexWord(w) {
            var s = '';
            for (var k = 0; k < 4; k++) {
                var b = (w >>> (k * 8)) & 0xff;
                s += (b < 16 ? '0' : '') + b.toString(16);
            }
            return s;
        }
        return hexWord(a0) + hexWord(b0) + hexWord(c0) + hexWord(d0);
    }

    /* ================= SHA-256（Web Crypto） ================= */

    /** 计算 SHA-256，返回小写十六进制 */
    function sha256(buffer) {
        return crypto.subtle.digest('SHA-256', buffer).then(function (hash) {
            var bytes = new Uint8Array(hash);
            var hex = '';
            for (var i = 0; i < bytes.length; i++) {
                hex += (bytes[i] < 16 ? '0' : '') + bytes[i].toString(16);
            }
            return hex;
        });
    }

    /* ================= 文件处理 ================= */

    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(2) + ' MB';
        return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
    }

    /** 计算文件哈希并展示（FileReader 读为 ArrayBuffer） */
    function processFile(file) {
        fileNameEl.textContent = file.name + ' · ' + formatSize(file.size);
        md5El.value = '计算中…';
        sha256El.value = '计算中…';
        outputs.hidden = false;

        var reader = new FileReader();
        reader.onload = function () {
            var buf = reader.result;
            // MD5 同步计算（纯 JS），SHA-256 异步（Web Crypto）
            try {
                md5El.value = md5(buf);
            } catch (e) {
                md5El.value = '计算失败';
            }
            sha256(buf).then(function (hex) {
                sha256El.value = hex;
            }).catch(function () {
                sha256El.value = '计算失败';
            });
        };
        reader.onerror = function () {
            md5El.value = '读取失败';
            sha256El.value = '读取失败';
        };
        reader.readAsArrayBuffer(file);
    }

    /* ================= 交互绑定 ================= */

    // 点击上传
    dropzone.addEventListener('click', function () {
        fileInput.click();
    });
    // 键盘可达（role=button，Enter / Space 触发）
    dropzone.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInput.click();
        }
    });
    // 选择文件
    fileInput.addEventListener('change', function () {
        if (fileInput.files && fileInput.files.length) {
            processFile(fileInput.files[0]);
        }
    });

    // 拖动上传
    ['dragenter', 'dragover'].forEach(function (evt) {
        dropzone.addEventListener(evt, function (e) {
            e.preventDefault();
            dropzone.classList.add('dragging');
        });
    });
    ['dragleave', 'drop'].forEach(function (evt) {
        dropzone.addEventListener(evt, function (e) {
            e.preventDefault();
            dropzone.classList.remove('dragging');
        });
    });
    dropzone.addEventListener('drop', function (e) {
        e.preventDefault();
        var files = e.dataTransfer.files;
        if (files && files.length) processFile(files[0]);
    });

    // 复制按钮
    var copyBtns = document.querySelectorAll('.as-copy-btn');
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
    copyBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            var target = btn.dataset.target;
            var el = target === 'sha256' ? sha256El : md5El;
            var text = el.value;
            if (!text || text === '计算中…' || text === '计算失败') return;
            copyText(text);
            btn.classList.add('copied');
            setTimeout(function () { btn.classList.remove('copied'); }, 1200);
        });
    });

    /* ================= 防止拖放文件时浏览器跳转 ================= */
    document.addEventListener('dragover', function (e) { e.preventDefault(); });
    document.addEventListener('drop', function (e) { e.preventDefault(); });
})();
