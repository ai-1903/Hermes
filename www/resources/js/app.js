/**
 * app.js — 公共脚本入口
 * 类别：全局 / 公共
 * 职责：单一整体导航容器（.nav-bar）的展开 / 收起。
 *       高度不被程序写死，而是「被内容撑开」：
 *         - 展开时测量内容实际高度（scrollHeight）设为显式 height
 *         - 上限：PC 端 50vh；移动端视口高度（可撑到底部）
 *         - 内容超高时容器内部上下滚动
 *         - 收起时回落到 54px（nav-top 一行）
 *       子菜单展开 / 收起、窗口尺寸变化时重新测量。
 *       二级菜单在容器内部文档流，无独立弹层。
 */
(function () {
    'use strict';

    var MOBILE_WIDTH = 820;
    var closeTimer = null;
    var prevNavHeight = null;   // 记录展开子菜单前的容器高度（供折叠时精确回退）

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

        /* ---------- 面板按设备重挂载 ----------
           移动端：把每个二级菜单面板挂到对应一级项内（按钮之后），
                   使「谁的二级菜单就在谁下面展开」（如网络工具与实用工具之间）。
           桌面端：保持原结构，面板移回 .nav-mega > .container（文档流撑高容器）。 */
        var megaContainer = document.querySelector('.nav-mega .container');

        function placePanelsByDevice() {
            if (!megaContainer) return;
            entries.forEach(function (e) {
                if (!e.panel) return;
                if (isMobile()) {
                    // 挂到一级项内：按钮之后 → 二级菜单在项正下方
                    if (e.panel.parentNode !== e.item) e.item.appendChild(e.panel);
                } else {
                    // 移回 nav-mega 容器（桌面端效果不变）
                    if (e.panel.parentNode !== megaContainer) megaContainer.appendChild(e.panel);
                }
            });
        }

        /**
         * 按内容实际高度设置容器高度（内容撑开）。
         * 上限：PC 50vh；移动端视口高度。内容超高时内部滚动。
         * 测量前先把容器高度置为 auto，避免被先前较长菜单撑高时
         * scrollHeight 返回容器高度（max(内容, 当前高)）导致长→短切换无法缩短。
         */
        function setHeightToContent() {
            if (!navBar) return;
            // 先回归「内容撑开」，再读真实内容高度
            navBar.style.height = 'auto';
            var content = navBar.scrollHeight;
            var max = isMobile() ? window.innerHeight : window.innerHeight * 0.5;
            var h = Math.min(content, max);
            // 高度 < 展开所需时容器内部滚动（需 > 54px 才启用滚动）
            navBar.style.height = (h < 54 ? 54 : h) + 'px';
            navBar.classList.toggle('scrollable', content > max);
        }

        /** 展开容器（移除内联 height 约束，让测量基于内容） */
        function expandNav() {
            if (!navBar) return;
            navBar.classList.add('open');
            setHeightToContent();
        }

        /** 收起容器：高度回落到 54px，清除滚动态 */
        function collapseNav() {
            if (navBar) {
                navBar.classList.remove('open', 'scrollable');
                navBar.style.height = '';
            }
            closePanels();
            prevNavHeight = null;
            if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
        }

        /** 打开某个一级项对应的面板（容器保持展开，重新测量高度） */
        function openPanel(entry) {
            // 记录展开子菜单前的容器高度（移动端折叠时精确回退到该高度）
            if (navBar && navBar.classList.contains('open')) {
                prevNavHeight = navBar.style.height || (navBar.offsetHeight + 'px');
            }
            closePanels(entry);
            entry.item.classList.add('open');
            entry.btn.setAttribute('aria-expanded', 'true');
            if (entry.panel) entry.panel.classList.add('active');
            if (!navBar.classList.contains('open')) expandNav();
            else setHeightToContent();   // 内容变化 → 重新撑开
        }

        /** 关闭所有面板（保留容器展开态；若已无面板则重新测量收缩） */
        function closePanels(except) {
            entries.forEach(function (e) {
                if (e !== except) {
                    e.item.classList.remove('open');
                    e.btn.setAttribute('aria-expanded', 'false');
                    if (e.panel) e.panel.classList.remove('active');
                }
            });
        }

        function cancelClose() {
            if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
        }

        function scheduleCollapse() {
            cancelClose();
            closeTimer = setTimeout(collapseNav, 160);
        }

        /* ---------- 汉堡按钮：切换容器展开（移动端） ---------- */
        if (hamburger && navBar) {
            hamburger.addEventListener('click', function (e) {
                e.stopPropagation();
                if (navBar.classList.contains('open')) {
                    collapseNav();
                } else {
                    // 先展开（让一级菜单可见），再按内容撑开高度
                    navBar.classList.add('open');
                    hamburger.setAttribute('aria-expanded', 'true');
                    setHeightToContent();
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
                    if (!isMobile()) {
                        collapseNav();
                    } else {
                        // 移动端：仅收起子菜单，容器精确回退到展开前的高度
                        if (prevNavHeight) {
                            navBar.style.height = prevNavHeight;
                            prevNavHeight = null;
                        } else {
                            setHeightToContent();
                        }
                    }
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

        // 窗口尺寸变化：移动端重新测量撑开；回桌面时收起；设备切换时重挂载面板
        var lastMobile = isMobile();
        window.addEventListener('resize', function () {
            var nowMobile = isMobile();
            if (nowMobile !== lastMobile) {
                lastMobile = nowMobile;
                placePanelsByDevice();   // 跨设备阈值 → 重挂载二级菜单位置
            }
            if (!nowMobile) {
                collapseNav();
            } else if (navBar && navBar.classList.contains('open')) {
                setHeightToContent();
            }
        });

        // 初始按设备挂载面板位置
        placePanelsByDevice();
    });
})();
