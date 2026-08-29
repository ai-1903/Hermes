<?php
/**
 * aegis-data.php — 数据安全检测（视图入口）
 *
 * 分层：view 入口（展示）
 * 职责：居中 Hero（标题 + 「检查安全」按钮）+ 检测结果区：
 *       - 网络环境 Tab 栏（最多 4 个，按网络身份区分）
 *       - 安全评分 + 警示分级（正常 / 黄 / 橙 / 红）
 *       - 本次检测项列表（中间人劫持 / 网络环境 / 内网环境）
 *       - 新结果暂存区（用户选择归入哪个 Tab 或新建 Tab）
 *       - 历史检测卡片（当前 Tab）+ 清空缓存
 *       逻辑在 resources/js/aegis-data.js（含自绘 POP 提示）。
 */
require __DIR__ . '/system/App.php';

$footer = App::footer();

$siteName    = App::config()['name'];
$nav         = App::config()['nav'];
$pageTitle   = '数据安全检测 — Aegis 安全';
$pageStyles  = ['resources/css/aegis-data.css'];
$pageScripts = ['resources/js/aegis-data.js'];

require __DIR__ . '/view/header.php';
?>
<main class="aegis-data-main">

    <!-- 英雄区：居中标题 + 控件 -->
    <section class="data-hero" id="data-hero">
        <div class="data-intro" id="data-intro">
            <h1 class="data-title">数据安全检测</h1>
            <p class="data-sub">我的数据会被窃听吗？检测中间人劫持风险，并评估你的网络环境。</p>

            <div class="data-controls">
                <button id="data-check-btn" class="data-check-btn" type="button">
                    <iconify-icon icon="fluent:shield-lock-20-regular"></iconify-icon>
                    <span>检查安全</span>
                </button>
            </div>
        </div>

        <!-- 检测中：居中「正在检测」标题 -->
        <div class="data-detecting" id="data-detecting" hidden>
            <div class="detecting-title">正在检测</div>
        </div>
    </section>

    <!-- 检测结果 -->
    <section class="data-result" id="data-result" hidden>

        <!-- 网络环境 Tab 栏（最多 4 个） -->
        <div class="data-tabs-bar">
            <div class="data-tabs" id="data-tabs"></div>
            <span class="data-tabs-hint">最多 4 个网络环境</span>
        </div>

        <!-- 评分 + 警示分级 -->
        <div class="result-score-wrap">
            <div class="result-badge" id="data-badge"></div>
            <div class="result-score" id="data-score">0</div>
            <div class="result-score-label">安全评分 / 100</div>
        </div>

        <!-- 本次检测项 -->
        <ul class="result-list" id="data-list"></ul>

        <!-- 新结果暂存区：用户选择归入 Tab -->
        <div class="data-staging" id="data-staging" hidden>
            <div class="staging-head">
                <iconify-icon icon="fluent:archive-20-regular"></iconify-icon>
                本次检测结果暂存
            </div>
            <div class="staging-desc" id="staging-desc"></div>
            <div class="staging-actions" id="staging-actions"></div>
        </div>

        <!-- 历史记录（当前 Tab） -->
        <div class="data-history">
            <div class="history-head">
                <span class="history-title" id="history-title">历史检测</span>
                <button id="data-clear-btn" class="data-clear-btn" type="button">
                    <iconify-icon icon="fluent:delete-20-regular"></iconify-icon>
                    清空缓存
                </button>
            </div>
            <div class="history-cards" id="history-cards"></div>
        </div>

        <button id="data-again-btn" class="data-again-btn" type="button">
            <iconify-icon icon="fluent:arrow-clockwise-20-regular"></iconify-icon>
            重新检测
        </button>
    </section>

</main>
<?php
$copyright     = $footer['copyright'];
$copyrightYear = $footer['year'];
require __DIR__ . '/view/footer.php';
