<?php
/**
 * aegis-intelligent.php — 智能检测（视图入口）
 *
 * 分层：view 入口（展示）
 * 职责：华丽 UI（紫色渐变 + 光影 + 四芒星特效）的综合安全检测页。
 *       - 居中大标题 + 「开始智能检测」按钮
 *       - 综合检测：设备 IP（天隼）、连接安全性、数据安全性（内网检测部分，
 *         若数据安全检测有网络特征一致结果则联合比对）
 *       - 智能打分 + 检查项列表 + 出具报告
 *       - 报告缓存（localStorage 无上限）+ 底部历史记录 + 单删 / 一键全删
 *       - 报告导出图片；结果弹出确认弹窗（Web 沙箱提示）
 *       逻辑在 resources/js/aegis-intelligent.js。
 */
require __DIR__ . '/system/App.php';

$footer = App::footer();

$siteName    = App::config()['name'];
$nav         = App::config()['nav'];
$pageTitle   = '智能检测 — Aegis 安全';
$pageStyles  = ['resources/css/aegis-intelligent.css'];
$pageScripts = ['resources/js/aegis-intelligent.js'];

require __DIR__ . '/view/header.php';
?>
<main class="intel-main">

    <!-- 背景光晕（紫色） -->
    <div class="intel-glow" aria-hidden="true"></div>

    <!-- 英雄区：居中标题 + 按钮 -->
    <section class="intel-hero" id="intel-hero">
        <div class="intel-spark" aria-hidden="true">
            <iconify-icon icon="fluent:sparkle-24-regular"></iconify-icon>
        </div>
        <div class="intel-intro" id="intel-intro">
            <h1 class="intel-title">智能检测</h1>
            <p class="intel-sub">多维安全信号智能分析 · 连接 / 数据 / 设备综合评估</p>
            <div class="intel-controls">
                <button id="intel-check-btn" class="intel-check-btn" type="button">
                    <iconify-icon icon="fluent:sparkle-20-regular"></iconify-icon>
                    <span>开始智能检测</span>
                </button>
            </div>
        </div>

        <!-- 检测中 -->
        <div class="intel-detecting" id="intel-detecting" hidden>
            <div class="detecting-title">智能检测中</div>
        </div>
    </section>

    <!-- 检测结果 / 报告 -->
    <section class="intel-result" id="intel-result" hidden>

        <!-- 报告卡片（可导出图片） -->
        <div class="intel-report" id="intel-report">
            <div class="report-head">
                <div class="report-brand">
                    <iconify-icon icon="fluent:sparkle-24-regular"></iconify-icon>
                    Aegis 智能检测报告
                </div>
                <div class="report-actions">
                    <button id="intel-export-btn" class="report-btn" type="button" title="导出为图片">
                        <iconify-icon icon="fluent:image-arrow-down-20-regular"></iconify-icon>
                        导出图片
                    </button>
                    <button id="intel-save-btn" class="report-btn" type="button" title="保存报告">
                        <iconify-icon icon="fluent:save-20-regular"></iconify-icon>
                        保存报告
                    </button>
                </div>
            </div>

            <div class="report-score-wrap">
                <div class="report-badge" id="intel-badge"></div>
                <div class="report-score" id="intel-score">0</div>
                <div class="report-score-label">智能安全评分 / 100</div>
                <div class="report-ip" id="intel-ip"></div>
            </div>

            <ul class="report-list" id="intel-list"></ul>

            <div class="report-footer">
                <div class="report-time" id="intel-time"></div>
                <div class="report-stamp">Hermes · Aegis</div>
            </div>
        </div>

        <button id="intel-again-btn" class="intel-again-btn" type="button">
            <iconify-icon icon="fluent:arrow-clockwise-20-regular"></iconify-icon>
            重新检测
        </button>

        <!-- 历史报告 -->
        <div class="intel-history">
            <div class="history-head">
                <span class="history-title">历史报告</span>
                <div class="history-actions">
                    <button id="intel-clear-all-btn" class="history-clear-all" type="button">
                        <iconify-icon icon="fluent:delete-20-regular"></iconify-icon>
                        删除全部
                    </button>
                </div>
            </div>
            <div class="history-list" id="intel-history-list"></div>
        </div>
    </section>

</main>
<?php
$copyright     = $footer['copyright'];
$copyrightYear = $footer['year'];
require __DIR__ . '/view/footer.php';
