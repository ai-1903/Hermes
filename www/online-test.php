<?php
/**
 * online-test.php — Online Test 在线检测（视图入口）
 *
 * 分层：view 入口（展示）
 * 布局：搜索引擎式（大标题 + 大搜索框，居中偏上；搜索框下放结果表格 + 历史列表）
 * 注意：检测功能由浏览器 JS 完成，不依赖服务器能力（见 online-test.js）。
 */
require __DIR__ . '/system/App.php';

$footer = App::footer();

$siteName    = App::config()['name'];
$nav         = App::config()['nav'];
$pageTitle   = 'Online Test — 在线检测';
$pageStyles  = ['resources/css/search.css', 'resources/css/tools.css'];
$pageScripts = [
    'resources/js/lib/network.js',
    'resources/js/online-test.js',
];

require __DIR__ . '/view/header.php';
?>
<main class="search-main">
    <div class="search-head">
        <h1 class="search-title">
            <iconify-icon icon="fluent:wifi-3-20-regular"></iconify-icon>
            Online Test
        </h1>
        <p class="search-desc">输入域名或 IP 检测是否在线，支持 <code>域名/IP:端口</code> 与 <code>*.域名</code> 通配符。</p>
    </div>

    <div class="search-bar">
        <div class="proto-tabs" role="tablist">
            <button type="button" class="proto-tab" data-proto="http">HTTP</button>
            <button type="button" class="proto-tab active" data-proto="https">HTTPS</button>
        </div>
        <input id="ot-input" class="search-input" type="text"
               placeholder="example.com / 8.8.8.8:8443 / *.example.com" autocomplete="off" spellcheck="false">
        <button id="ot-btn" class="search-btn" type="button">检测</button>
    </div>

    <div class="search-results">
        <div id="ot-result" class="tool-result"></div>
        <div class="history-wrap">
            <div class="history-title">
                <iconify-icon icon="fluent:history-20-regular"></iconify-icon>
                最近查询（最多 20 条，Cookie 记录）
            </div>
            <ul id="ot-history" class="history-list"></ul>
        </div>
    </div>
</main>
<?php
$copyright     = $footer['copyright'];
$copyrightYear = $footer['year'];
require __DIR__ . '/view/footer.php';
?>
