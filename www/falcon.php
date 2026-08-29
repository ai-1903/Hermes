<?php
/**
 * falcon.php — 天隼 公网 IP 查询（视图入口）
 *
 * 分层：view 入口（展示）
 * 职责：打开页面后自动获取公网 IP，屏幕居中显示巨大 IP，下方展示
 *       服务商信息与标签（服务商通识名称 / 网络环境 / 泛地区），
 *       再下方列出近期此设备出站用过的 IP 及使用时间 / 打开次数。
 * 注意：IP 与服务商信息由浏览器 JS 通过公共 API 获取，不依赖服务器能力
 *       （见 falcon.js）。此页不使用卡片框架，采用全屏居中 Hero 布局。
 */
require __DIR__ . '/system/App.php';

$footer = App::footer();

$siteName    = App::config()['name'];
$nav         = App::config()['nav'];
$pageTitle   = '天隼 — 公网 IP 查询';
$pageStyles  = ['resources/css/falcon.css'];
$pageScripts = ['resources/js/falcon.js'];

require __DIR__ . '/view/header.php';
?>
<main class="falcon-main">
    <div class="falcon-hero">
        <div class="ip-label">Your Public IP</div>
        <div id="fc-ip" class="ip-value loading">正在获取…</div>
        <div id="fc-isp" class="ip-isp"></div>
        <div id="fc-tags" class="ip-tags"></div>
    </div>

    <section class="ip-history">
        <div class="history-head">
            <iconify-icon icon="fluent:history-20-regular"></iconify-icon>
            近期出站 IP
        </div>
        <ul id="fc-history" class="fc-history-list"></ul>
    </section>
</main>
<?php
$copyright     = $footer['copyright'];
$copyrightYear = $footer['year'];
require __DIR__ . '/view/footer.php';
?>
