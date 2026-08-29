<?php
/**
 * hawkeye.php — Hawkeye Whois 查询（视图入口）
 *
 * 分层：view 入口（展示）
 * 职责：渲染查询界面（协议选项卡 + 输入框 + 结果列表），逻辑在 resources/js。
 * 注意：查询由浏览器 JS 通过公共 RDAP 服务完成，不依赖服务器能力（见 hawkeye.js）。
 */
require __DIR__ . '/system/App.php';

$footer = App::footer();

$siteName    = App::config()['name'];
$nav         = App::config()['nav'];
$pageTitle   = 'Hawkeye — Whois 查询';
$pageStyles  = ['resources/css/tools.css'];
$pageScripts = [
    'resources/js/lib/network.js',
    'resources/js/hawkeye.js',
];

require __DIR__ . '/view/header.php';
?>
<main class="tool-main">
    <div class="tool-card">
        <h2 class="tool-title"><iconify-icon icon="fluent:eye-20-filled"></iconify-icon> Hawkeye</h2>
        <p class="tool-desc">查询域名的 Whois 注册信息（仅支持根域名，如 AB.XXX）。</p>

        <div class="tool-input-row">
            <input id="hw-input" class="tool-input" type="text"
                   placeholder="请输入根域名（如 example.com）" autocomplete="off">
            <button id="hw-btn" class="tool-btn" type="button">查询</button>
        </div>

        <div id="hw-result" class="tool-result whois-result"></div>
    </div>
</main>
<?php
$copyright     = $footer['copyright'];
$copyrightYear = $footer['year'];
require __DIR__ . '/view/footer.php';
?>
