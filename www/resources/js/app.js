/**
 * app.js — 公共脚本入口
 * 类别：全局 / 公共
 * 职责：Mega 菜单交互（hover 展开 / 点击切换 / 点击外部与 Esc 关闭）。
 *       组件级脚本按组件拆分至 resources/js/ 对应文件，勿堆叠于此。
 */
(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
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

        dropdowns.forEach(function (d) {
            var btn = d.querySelector('.nav-btn');

            // 点击切换（移动端 / 触屏）
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var isOpen = d.classList.toggle('open');
                btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
                closeAll(d);
            });

            // 悬停展开（仅支持 hover 的设备）
            d.addEventListener('mouseenter', function () {
                closeAll(d);
                d.classList.add('open');
                btn.setAttribute('aria-expanded', 'true');
            });
            d.addEventListener('mouseleave', function () {
                d.classList.remove('open');
                btn.setAttribute('aria-expanded', 'false');
            });
        });

        // 点击其他区域关闭
        document.addEventListener('click', function () { closeAll(); });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeAll();
        });
    });
})();
