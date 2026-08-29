<?php
/**
 * aegis-connection.php — 连接安全检测（视图入口）
 *
 * 分层：view 入口（展示）
 * 职责：全屏居中 Hero 布局——巨大标题 + 描述 + 国家选择 + 「检查安全」按钮。
 *       点击检查后标题渐隐并显示「正在检测」；检测完成展示加权分数
 *       （正常 / 黄 / 橙 / 红警示分级）与逐项通过 / 失败列表。
 *       上次检测结果缓存于 localStorage，刷新后自动回显。
 *       逻辑在 resources/js/aegis-connection.js。
 */
require __DIR__ . '/system/App.php';

$footer = App::footer();

$siteName    = App::config()['name'];
$nav         = App::config()['nav'];
$pageTitle   = '连接安全检测 — Aegis 安全';
$pageStyles  = ['resources/css/aegis-connection.css'];
$pageScripts = ['resources/js/aegis-connection.js'];

require __DIR__ . '/view/header.php';
?>
<main class="aegis-conn-main">

    <!-- 英雄区：居中标题 + 控件 -->
    <section class="conn-hero" id="conn-hero">

        <div class="conn-intro" id="conn-intro">
            <h1 class="conn-title">连接安全检测</h1>
            <p class="conn-sub">我的网络安全吗？一键评估你的网络连接是否安全可信。</p>

            <div class="conn-controls">
                <!-- 所在地选择：支持常见国家 / 也可输入 -->
                <label class="conn-country-label" for="conn-country">
                    <iconify-icon icon="fluent:location-20-regular"></iconify-icon>
                    所在地
                </label>
                <input id="conn-country" class="conn-country" list="conn-country-list"
                       placeholder="选择或输入你所在的国家" autocomplete="off" spellcheck="false">
                <datalist id="conn-country-list">
                    <option value="中国"></option>
                    <option value="日本"></option>
                    <option value="韩国"></option>
                    <option value="俄罗斯"></option>
                    <option value="乌克兰"></option>
                    <option value="朝鲜"></option>
                    <option value="古巴"></option>
                    <option value="土耳其"></option>
                    <option value="阿富汗"></option>
                    <option value="阿拉伯"></option>
                    <option value="美国"></option>
                </datalist>

                <button id="conn-check-btn" class="conn-check-btn" type="button">
                    <iconify-icon icon="fluent:shield-checkmark-20-regular"></iconify-icon>
                    <span>检查安全</span>
                </button>
            </div>
        </div>

        <!-- 检测中：居中「正在检测」标题 -->
        <div class="conn-detecting" id="conn-detecting" hidden>
            <div class="detecting-title">正在检测</div>
        </div>

    </section>

    <!-- 检测结果：警示等级 + 分数 + 逐项列表 -->
    <section class="conn-result" id="conn-result" hidden>
        <div class="result-score-wrap">
            <div class="result-badge" id="result-badge"></div>
            <div class="result-score" id="result-score">0</div>
            <div class="result-score-label">安全评分 / 100</div>
        </div>

        <ul class="result-list" id="result-list"></ul>

        <button id="conn-again-btn" class="conn-again-btn" type="button">
            <iconify-icon icon="fluent:arrow-clockwise-20-regular"></iconify-icon>
            重新检测
        </button>
    </section>

</main>
<?php
$copyright     = $footer['copyright'];
$copyrightYear = $footer['year'];
require __DIR__ . '/view/footer.php';
