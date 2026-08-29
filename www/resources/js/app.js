/**
 * app.js — 公共脚本入口
 * 类别：全局 / 公共
 *
 * 说明：所有页面共用的 JS 在此挂载；组件级脚本按组件拆分，
 *       存放于 resources/js/ 对应子目录（如 components/），勿堆叠于此。
 */
(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        console.log('[Hermes] 页面加载完成');
    });
})();
