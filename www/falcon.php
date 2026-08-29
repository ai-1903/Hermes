<?php
/**
 * falcon.php — 天隼 公网 IP 查询（视图入口）
 *
 * 分层：view 入口（展示）
 * 职责：渲染「获取公网 IP」界面，逻辑在 resources/js。
 * 注意：IP 与服务商信息由浏览器 JS 通过公共 API 获取，不依赖服务器能力（见 falcon.js）。
 */
require __DIR__ . '/system/App.php';

$footer = App::footer();

$siteName    = App::config()['name'];
$nav         = App::config()['nav'];
$pageTitle   = '天隼 — 公网 IP 查询';
$pageStyles  = ['resources/css/tools.css'];
$pageScripts = ['resources/js/falcon.js'];

require __DIR__ . '/view/header.php';
?>
<main class="tool-main">
    <div class="tool-card">
        <h2 class="tool-title"><iconify-icon icon="fluent:location-20-filled"></iconify-icon> 天隼</h2>
        <p class="tool-desc">获取当前访问者的公网 IP 与服务商信息。</p>

        <button id="fc-btn" class="tool-btn ip-btn" type="button">获取我的公网 IP</button>

        <div id="fc-result" class="ip-result">
            <div class="ip-placeholder">点击上方按钮开始获取</div>
        </div>
    </div>
</main>
<?php
$copyright     = $footer['copyright'];
$copyrightYear = $footer['year'];
require __DIR__ . '/view/footer.php';
?>
