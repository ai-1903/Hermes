<?php
/**
 * online-test.php — Online Test 在线检测（视图入口）
 *
 * 分层：view 入口（展示）
 * 职责：渲染检测界面（协议选项卡 + 输入框 + 历史记录），逻辑在 resources/js。
 * 注意：检测功能由浏览器 JS 完成，不依赖服务器能力（见 online-test.js）。
 */
require __DIR__ . '/system/App.php';

$footer = App::footer();

$siteName    = App::config()['name'];
$nav         = App::config()['nav'];
$pageTitle   = 'Online Test — 在线检测';
$pageStyles  = ['resources/css/tools.css'];
$pageScripts = [
    'resources/js/lib/network.js',
    'resources/js/online-test.js',
];

require __DIR__ . '/view/header.php';
?>
<main class="tool-main">
    <div class="tool-card">
        <h2 class="tool-title"><iconify-icon icon="fluent:wifi-3-20-regular"></iconify-icon> Online Test</h2>
        <p class="tool-desc">输入域名或 IP 地址检测是否在线；根域名自动双测 www. 与根域，支持 <code>*.域名</code> 通配符探测常见子域。</p>

        <div class="tool-input-row">
            <div class="proto-tabs" role="tablist">
                <button type="button" class="proto-tab" data-proto="http">HTTP</button>
                <button type="button" class="proto-tab active" data-proto="https">HTTPS</button>
            </div>
            <input id="ot-input" class="tool-input" type="text"
                   placeholder="请输入域名或 IP 地址（如 example.com 或 8.8.8.8）" autocomplete="off">
            <button id="ot-btn" class="tool-btn" type="button">检测</button>
        </div>

        <div id="ot-result" class="tool-result"></div>

        <div class="history-wrap">
            <div class="history-title">最近查询（最多 20 条，Cookie 记录）</div>
            <ul id="ot-history" class="history-list"></ul>
        </div>
    </div>
</main>
<?php
$copyright     = $footer['copyright'];
$copyrightYear = $footer['year'];
require __DIR__ . '/view/footer.php';
?>
