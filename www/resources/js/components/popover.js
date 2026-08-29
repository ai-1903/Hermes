/**
 * popover.js — 轻量 Pop 提示组件（通用）
 * 类别：组件 / 通用
 * 依赖：无（图标由 iconify-icon 提供）
 *
 * 用法：
 *   Hermes.Popover.bind(triggerEl, {
 *       theme: 'error' | 'info',
 *       title: '标题',
 *       rows:  [{ label: '错误码', value: 'ERR_*' }, ...],
 *       text:  '一段说明文字（可选）',
 *   });
 *
 * 交互：悬停显示 / 移出自动隐藏；点击固定显示；再次点击或点击外部 / Esc 关闭。
 * 定位：fixed 定位（基于触发元素矩形），自动在下方 / 上方切换并限制在视口内，
 *       避免被表格 overflow 容器裁剪。
 */
(function (global) {
    'use strict';

    var Hermes = global.Hermes || (global.Hermes = {});

    var Popover = {
        active: null,     // 当前显示中的弹层元素
        pinned: false,    // 是否被点击固定
        hideTimer: null,
    };

    function hide() {
        if (Popover.hideTimer) { clearTimeout(Popover.hideTimer); Popover.hideTimer = null; }
        if (!Popover.active) return;
        Popover.active.classList.remove('show');
        Popover.active.remove();
        Popover.active = null;
        Popover.pinned = false;
    }

    function position(pop, trigger) {
        var r = trigger.getBoundingClientRect();
        var pw = pop.offsetWidth;
        var ph = pop.offsetHeight;
        var left = r.left + r.width / 2 - pw / 2;
        left = Math.max(8, Math.min(left, global.innerWidth - pw - 8));

        var below = r.bottom + 10;
        var above = r.top - ph - 10;
        var top;
        if (below + ph > global.innerHeight && above > 0) {
            top = above;
            pop.classList.add('popover--above');
        } else {
            top = below;
        }

        pop.style.left = Math.round(left) + 'px';
        pop.style.top = Math.round(top) + 'px';
    }

    function show(trigger, opts) {
        hide();

        var pop = document.createElement('div');
        var theme = opts.theme === 'error' ? 'error' : 'info';
        pop.className = 'popover popover--' + theme;

        var icon = theme === 'error'
            ? 'fluent:error-circle-20-regular'
            : 'fluent:info-20-regular';

        var html = '';
        if (opts.title) {
            html += '<div class="popover-title">' +
                '<iconify-icon icon="' + icon + '"></iconify-icon>' +
                '<span></span></div>';
        }
        if (opts.rows && opts.rows.length) html += '<div class="popover-rows"></div>';
        if (opts.text) html += '<div class="popover-text"></div>';
        pop.innerHTML = html;

        if (opts.title) {
            pop.querySelector('.popover-title span').textContent = opts.title;
        }
        if (opts.rows && opts.rows.length) {
            var rowsBox = pop.querySelector('.popover-rows');
            opts.rows.forEach(function (row) {
                var r = document.createElement('div');
                r.className = 'popover-row';
                var l = document.createElement('span');
                l.className = 'lbl';
                l.textContent = row.label;
                var v = document.createElement('span');
                v.className = 'val';
                v.textContent = row.value;
                r.appendChild(l);
                r.appendChild(v);
                rowsBox.appendChild(r);
            });
        }
        if (opts.text) {
            pop.querySelector('.popover-text').textContent = opts.text;
        }

        document.body.appendChild(pop);
        position(pop, trigger);
        requestAnimationFrame(function () { pop.classList.add('show'); });

        pop.__trigger = trigger;
        Popover.active = pop;
    }

    function scheduleHide() {
        if (Popover.pinned) return;
        Popover.hideTimer = setTimeout(hide, 150);
    }

    /**
     * 在触发元素上绑定「悬停 + 点击」弹层。
     * @param {HTMLElement} trigger
     * @param {object} opts 见文件头用法
     */
    Popover.bind = function (trigger, opts) {
        trigger.addEventListener('mouseenter', function () {
            if (Popover.hideTimer) { clearTimeout(Popover.hideTimer); Popover.hideTimer = null; }
            if (Popover.active && Popover.active.__trigger === trigger) return;
            show(trigger, opts);
            Popover.pinned = false;
        });
        trigger.addEventListener('mouseleave', function () {
            if (!Popover.active || Popover.active.__trigger !== trigger) return;
            scheduleHide();
        });
        trigger.addEventListener('click', function (e) {
            e.stopPropagation();
            if (Popover.active && Popover.active.__trigger === trigger) {
                hide();
            } else {
                show(trigger, opts);
                Popover.pinned = true;
            }
        });
    };

    // 点击其他区域 / Esc 关闭
    document.addEventListener('click', function () {
        if (Popover.pinned) hide();
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') hide();
    });

    Hermes.Popover = Popover;
})(window);
