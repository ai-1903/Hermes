/**
 * app.js — 公共脚本入口
 * 类别：全局 / 公共
 * 职责：主菜单栏（.nav-bar）「向下拉伸」交互：
 *   - 悬停 / 点击带二级菜单的一级项 → 主菜单栏向下拉伸（.open），
 *     并在新开辟空间显示对应 .mega-panel（.active）
 *   - 点击汉堡按钮 → 切换主菜单栏拉伸（移动端同时展开一级列表）
 *   - 点击外部 / Esc / 移出主菜单栏 → 主菜单栏缩回原高度
 *   面板是 .nav-bar 内部区域，共用主菜单栏背景，无独立弹层。
 */
(function () {
    'use strict';

    var MOBILE_WIDTH = 820;
    var closeTimer = null;

    function isMobile() {
        return window.innerWidth <= MOBILE_WIDTH;
    }

    document.addEventListener('DOMContentLoaded', function () {
        var navBar   = document.getElementById('nav-bar');
        var hamburger = document.querySelector('.hamburger');
        var nav      = document.getElementById('site-nav');

        // 收集下拉项：{ item, btn, panel }
        var entries = Array.prototype.slice.call(
            document.querySelectorAll('.nav-item.dropdown')
        ).map(function (item) {
            var btn = item.querySelector('.nav-btn');
            var panel = btn ? document.getElementById(btn.getAttribute('data-panel')) : null;
            return { item: item, btn: btn, panel: panel };
        }).filter(function (e) { return e.btn; });

        function isOpen() {
            return navBar && navBar.classList.contains('open');
        }

        /** 拉伸主菜单栏 */
        function stretch() {
            if (navBar) navBar.classList.add('open');
        }

        /** 收起主菜单栏 */
        function collapse() {
            if (navBar) navBar.classList.remove('open');
            closeAll();
            if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
        }

        /** 关闭所有下拉面板（但保持主菜单栏拉伸态） */
        function closeAll(except) {
            entries.forEach(function (e) {
                if (e !== except) {
                    e.item.classList.remove('open');
                    e.btn.setAttribute('aria-expanded', 'false');
                    if (e.panel) e.panel.classList.remove('active');
                }
            });
        }

        /** 激活某个面板 + 拉伸主菜单栏 */
        function activate(entry) {
            if (!entry) return;
            closeAll(entry);
            entry.item.classList.add('open');
            entry.btn.setAttribute('aria-expanded', 'true');
            if (entry.panel) entry.panel.classList.add('active');
            stretch();
        }

        function cancelClose() {
            if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
        }

        function scheduleCollapse() {
            cancelClose();
            closeTimer = setTimeout(collapse, 160);
        }

        /* ---------- 汉堡按钮：切换主菜单栏拉伸 ---------- */
        if (hamburger && navBar) {
            hamburger.addEventListener('click', function (e) {
                e.stopPropagation();
                if (isOpen()) {
                    collapse();
                } else {
                    stretch();
                    hamburger.setAttribute('aria-expanded', 'true');
                }
            });
        }

        /* ---------- 下拉项：悬停 / 点击拉伸并显示面板 ---------- */
        entries.forEach(function (entry) {
            entry.btn.addEventListener('click', function (e) {
                e.stopPropagation();
                if (entry.item.classList.contains('open')) {
                    closeAll();
                    // 移动端：点开/收起面板（主菜单栏保持拉伸）
                } else {
                    activate(entry);
                }
            });

            // 悬停展开（仅桌面端）
            if (!isMobile()) {
                entry.item.addEventListener('mouseenter', function () {
                    cancelClose();
                    activate(entry);
                });
            }
        });

        /* ---------- 主菜单栏 hover 保持 / 移出收起 ---------- */
        if (navBar) {
            navBar.addEventListener('mouseenter', cancelClose);
            navBar.addEventListener('mouseleave', scheduleCollapse);
        }

        /* ---------- 点击外部 / Esc 收起 ---------- */
        document.addEventListener('click', function (e) {
            if (navBar && navBar.contains(e.target)) return;
            collapse();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') collapse();
        });

        /* ---------- 移动端点击一级项：在其下方展开/收起二级分栏 ---------- */
        // 移动端下点击 nav-btn 已经走上面 handler：展开对应 panel。

        // 窗口尺寸变化：回到桌面时重置
        window.addEventListener('resize', function () {
            if (!isMobile()) {
                collapse();
            }
        });
    });
})();
