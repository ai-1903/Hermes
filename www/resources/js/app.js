/**
 * app.js — 公共脚本入口
 * 类别：全局 / 公共
 * 职责：单一整体导航容器（.nav-bar）的展开 / 收起：
 *   - 悬停 / 点击带二级菜单的一级项 → 容器变高（.open），显示对应面板（.active）
 *   - 再点已展开的一级项 / 点击外部 / Esc / 移出容器 → 容器收起（高度缩回）
 *   - 点击汉堡按钮 → 切换容器展开（移动端同时纵向列出一级菜单）
 *   二级菜单在容器内部文档流，无独立弹层。
 */
(function () {
    'use strict';

    var MOBILE_WIDTH = 820;
    var closeTimer = null;

    function isMobile() {
        return window.innerWidth <= MOBILE_WIDTH;
    }

    document.addEventListener('DOMContentLoaded', function () {
        var navBar    = document.getElementById('nav-bar');
        var hamburger = document.querySelector('.hamburger');

        // 收集下拉项：{ item, btn, panel }
        var entries = Array.prototype.slice.call(
            document.querySelectorAll('.nav-item.dropdown')
        ).map(function (item) {
            var btn = item.querySelector('.nav-btn');
            var panel = btn ? document.getElementById(btn.getAttribute('data-panel')) : null;
            return { item: item, btn: btn, panel: panel };
        }).filter(function (e) { return e.btn; });

        /** 打开某个一级项对应的面板 + 展开容器 */
        function openPanel(entry) {
            closePanels(entry);
            entry.item.classList.add('open');
            entry.btn.setAttribute('aria-expanded', 'true');
            if (entry.panel) entry.panel.classList.add('active');
            if (navBar) navBar.classList.add('open');
        }

        /** 关闭所有面板（保留容器展开态） */
        function closePanels(except) {
            entries.forEach(function (e) {
                if (e !== except) {
                    e.item.classList.remove('open');
                    e.btn.setAttribute('aria-expanded', 'false');
                    if (e.panel) e.panel.classList.remove('active');
                }
            });
        }

        /** 收起容器（高度缩回）+ 关闭所有面板 */
        function collapseNav() {
            if (navBar) navBar.classList.remove('open');
            closePanels();
            if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
        }

        function cancelClose() {
            if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
        }

        function scheduleCollapse() {
            cancelClose();
            closeTimer = setTimeout(collapseNav, 160);
        }

        /* ---------- 汉堡按钮：切换容器展开 ---------- */
        if (hamburger && navBar) {
            hamburger.addEventListener('click', function (e) {
                e.stopPropagation();
                if (navBar.classList.contains('open')) {
                    collapseNav();
                } else {
                    navBar.classList.add('open');
                    hamburger.setAttribute('aria-expanded', 'true');
                }
            });
        }

        /* ---------- 一级项：悬停 / 点击展开，再点收起 ---------- */
        entries.forEach(function (entry) {
            entry.btn.addEventListener('click', function (e) {
                e.stopPropagation();
                if (entry.item.classList.contains('open')) {
                    // 再点已展开项：收起面板；桌面端同时收起整个容器
                    closePanels();
                    if (!isMobile()) collapseNav();
                } else {
                    openPanel(entry);
                }
            });

            // 悬停展开（仅桌面端）
            if (!isMobile()) {
                entry.item.addEventListener('mouseenter', function () {
                    cancelClose();
                    openPanel(entry);
                });
            }
        });

        /* ---------- 容器 hover 保持 / 移出收起 ---------- */
        if (navBar) {
            navBar.addEventListener('mouseenter', cancelClose);
            navBar.addEventListener('mouseleave', scheduleCollapse);
        }

        /* ---------- 点击外部 / Esc 收起 ---------- */
        document.addEventListener('click', function (e) {
            if (navBar && navBar.contains(e.target)) return;
            collapseNav();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') collapseNav();
        });

        // 窗口尺寸变化：回到桌面时重置
        window.addEventListener('resize', function () {
            if (!isMobile()) collapseNav();
        });
    });
})();
