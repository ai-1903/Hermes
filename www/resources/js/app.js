/**
 * app.js — 公共脚本入口
 * 类别：全局 / 公共
 * 职责：
 *   - 子菜单面板（.dropdown-menu）与一级项（.nav-item.dropdown）经 data-menu 关联，
 *     点击 / 悬停开合；面板与菜单栏是平级块（无父子关系）
 *   - 移动端汉堡菜单：点击展开一级菜单，二级菜单在其内展开
 *   - 菜单展开时联动全局模糊遮罩（.nav-overlay）
 *   - 点击外部 / Esc 关闭
 */
(function () {
    'use strict';

    var MOBILE_WIDTH = 820;
    var closeTimer = null;

    function isMobile() {
        return window.innerWidth <= MOBILE_WIDTH;
    }

    document.addEventListener('DOMContentLoaded', function () {
        var hamburger = document.querySelector('.hamburger');
        var nav = document.getElementById('site-nav');
        var overlay = document.querySelector('.nav-overlay');

        // 收集：{ item, btn, panel }
        var entries = Array.prototype.slice.call(
            document.querySelectorAll('.nav-item.dropdown')
        ).map(function (item) {
            var btn = item.querySelector('.nav-btn');
            var panel = btn ? document.getElementById(btn.getAttribute('data-menu')) : null;
            return { item: item, btn: btn, panel: panel };
        }).filter(function (e) { return e.btn; });

        function setOpen(entry, open) {
            entry.item.classList.toggle('open', open);
            entry.btn.setAttribute('aria-expanded', open ? 'true' : 'false');
            if (entry.panel) entry.panel.classList.toggle('open', open);
        }

        function closeAll(except) {
            entries.forEach(function (e) {
                if (e !== except) setOpen(e, false);
            });
        }

        function syncOverlay() {
            var any = entries.some(function (e) {
                return e.item.classList.contains('open');
            }) || (nav && nav.classList.contains('open'));
            if (overlay) overlay.classList.toggle('show', any);
        }

        function cancelClose() {
            if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
        }

        function closeAllDelayed() {
            cancelClose();
            closeTimer = setTimeout(function () {
                closeAll();
                syncOverlay();
            }, 140);
        }

        function refresh() {
            cancelClose();
            syncOverlay();
        }

        /* ---------- 汉堡按钮：开合导航面板 ---------- */
        if (hamburger && nav) {
            hamburger.addEventListener('click', function (e) {
                e.stopPropagation();
                var open = nav.classList.toggle('open');
                hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
                if (!open) closeAll();
                syncOverlay();
            });
        }

        /* ---------- 子菜单：点击 / 悬停开合（面板与菜单栏平级） ---------- */
        entries.forEach(function (entry) {
            // 点击切换（移动端展开二级 / 触屏）
            entry.btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var isOpen = !entry.item.classList.contains('open');
                closeAll();
                setOpen(entry, isOpen);
                syncOverlay();
            });

            // 悬停展开（仅桌面端；hover 到面板时保持展开）
            if (!isMobile()) {
                entry.item.addEventListener('mouseenter', function () {
                    cancelClose();
                    closeAll();
                    setOpen(entry, true);
                    syncOverlay();
                });
                entry.item.addEventListener('mouseleave', closeAllDelayed);
                if (entry.panel) {
                    entry.panel.addEventListener('mouseenter', refresh);
                    entry.panel.addEventListener('mouseleave', closeAllDelayed);
                }
            }
        });

        /* ---------- 遮罩点击 / 外部点击 / Esc 关闭 ---------- */
        if (overlay) {
            overlay.addEventListener('click', function () {
                closeAll();
                if (nav) { nav.classList.remove('open'); }
                if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
                syncOverlay();
            });
        }
        document.addEventListener('click', function (e) {
            if (nav && nav.contains(e.target)) return;
            if (overlay && e.target === overlay) return;
            if (e.target.closest && e.target.closest('.dropdown-menu')) return;
            closeAll();
            if (nav) nav.classList.remove('open');
            if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
            syncOverlay();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                closeAll();
                if (nav) nav.classList.remove('open');
                if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
                syncOverlay();
            }
        });

        // 窗口尺寸变化：回到桌面时重置面板状态
        window.addEventListener('resize', function () {
            if (!isMobile() && nav) nav.classList.remove('open');
            if (!isMobile() && hamburger) hamburger.setAttribute('aria-expanded', 'false');
        });
    });
})();
