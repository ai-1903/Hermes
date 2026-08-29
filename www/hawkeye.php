<?php
/**
 * hawkeye.php — Hawkeye Whois 查询（视图入口）
 *
 * 分层：view 入口（展示）
 * 布局：搜索引擎式（大标题 + 大搜索框，居中偏上；搜索框下放结果表格）
 * 注意：查询由浏览器 JS 通过公共 RDAP 服务完成，不依赖服务器能力（见 hawkeye.js）。
 */
require __DIR__ . '/system/App.php';

$footer = App::footer();

$siteName    = App::config()['name'];
$nav         = App::config()['nav'];
$pageTitle   = 'Hawkeye — Whois 查询';
$pageStyles  = ['resources/css/search.css', 'resources/css/tools.css'];
$pageScripts = [
    'resources/js/lib/network.js',
    'resources/js/hawkeye.js',
];

require __DIR__ . '/view/header.php';
?>
<main class="search-main">
    <div class="search-head">
        <h1 class="search-title">
            <iconify-icon icon="fluent:eye-20-regular"></iconify-icon>
            Hawkeye
        </h1>
        <p class="search-desc">查询域名的 Whois 注册信息（仅支持根域名，如 <code>AB.XXX</code>）。</p>
    </div>

    <div class="search-bar">
        <input id="hw-input" class="search-input" type="text"
               placeholder="example.com" autocomplete="off" spellcheck="false">
        <button id="hw-btn" class="search-btn" type="button">查询</button>
    </div>

    <div class="search-results">
        <div id="hw-result" class="tool-result"></div>
    </div>
</main>
<?php
$copyright     = $footer['copyright'];
$copyrightYear = $footer['year'];
require __DIR__ . '/view/footer.php';
?>
