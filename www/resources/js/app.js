/**
 * app.js — 公共脚本入口
 * 类别：全局 / 公共
 * 职责：
 *   - Mega 菜单交互：桌面端 hover 展开 / 点击切换
 *   - 移动端汉堡菜单：点击展开一级菜单，有二级菜单的项点击后展开子级
 *   - 点击外部 / Esc 关闭
 * 说明：移动端（≤820px）禁用 hover 展开，避免触摸设备误触。
 */
(function () {
    'use strict';

    var MOBILE_WIDTH = 820;

    function isMobile() {
        return window.innerWidth <= MOBILE_WIDTH;
    }

    document.addEventListener('DOMContentLoaded', function () {
        var hamburger = document.querySelector('.hamburger');
        var nav = document.getElementById('site-nav');
        var dropdowns = Array.prototype.slice.call(
            document.querySelectorAll('.nav-item.dropdown')
        );

        function closeAll(except) {
            dropdowns.forEach(function (d) {
                if (d !== except) {
                    d.classList.remove('open');
                    var b = d.querySelector('.nav-btn');
                    if (b) b.setAttribute('aria-expanded', 'false');
                }
            });
        }

        function closeNav() {
            closeAll();
            if (nav) nav.classList.remove('open');
            if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
        }

        /* ---------- 汉堡按钮：开合导航面板 ---------- */
        if (hamburger && nav) {
            hamburger.addEventListener('click', function (e) {
                e.stopPropagation();
                var open = nav.classList.toggle('open');
                hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
                if (!open) closeAll();
            });
        }

        dropdowns.forEach(function (d) {
            var btn = d.querySelector('.nav-btn');

            // 点击切换（移动端展开二级菜单 / 触屏）
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var isOpen = d.classList.toggle('open');
                btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
                closeAll(d);
            });

            // 悬停展开（仅桌面端，避免移动端触摸误触）
            d.addEventListener('mouseenter', function () {
                if (isMobile()) return;
                closeAll(d);
                d.classList.add('open');
                btn.setAttribute('aria-expanded', 'true');
            });
            d.addEventListener('mouseleave', function () {
                if (isMobile()) return;
                d.classList.remove('open');
                btn.setAttribute('aria-expanded', 'false');
            });
        });

        // 窗口尺寸变化：回到桌面时重置面板状态
        window.addEventListener('resize', function () {
            if (!isMobile() && nav) nav.classList.remove('open');
        });

        // 点击导航外区域关闭
        document.addEventListener('click', function (e) {
            if (nav && nav.contains(e.target)) return;
            closeNav();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeNav();
        });
    });
})();
