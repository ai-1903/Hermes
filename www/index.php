<?php
/**
 * index.php — 首页（介绍落地页，科幻极简风）
 *
 * 分层：view 入口（展示）
 * 职责：品牌介绍落地页——Hero 标语 + 简短特性 + 引导 CTA，不展示全功能模块。
 *       数据来自 system/App，样式来自 resources/css，图标使用 iconify:fluent。
 */
require __DIR__ . '/system/App.php';

$app    = App::home();
$footer = App::footer();

$siteName    = $app['title'];
$pageTitle   = $app['title'] . ' — 首页';
$pageStyles  = ['resources/css/index.css'];
$pageScripts = [];

require __DIR__ . '/view/header.php';
?>
<main class="landing-main">

    <div class="landing-hero">
        <iconify-icon class="hero-icon" icon="fluent:rocket-20-regular"></iconify-icon>
        <h1 class="hero-title"><?= htmlspecialchars($siteName, ENT_QUOTES, 'UTF-8') ?></h1>
        <p class="hero-sub">简约、高效、注重隐私的网络工具集。<br>在线检测、Whois 查询、安全评估与更多，全部在浏览器本地完成。</p>
        <div class="hero-actions">
            <a class="hero-cta" href="online-test.php">
                <iconify-icon icon="fluent:arrow-right-20-regular"></iconify-icon>
                开始探索
            </a>
        </div>
    </div>

    <!-- 特性简介（落地页，非功能模块入口） -->
    <section class="landing-features">
        <div class="feature">
            <iconify-icon icon="fluent:shield-lock-20-regular"></iconify-icon>
            <div class="feature-title">隐私优先</div>
            <div class="feature-desc">核心工具全部在浏览器本地运行，数据不上传，检测结果不落服务器。</div>
        </div>
        <div class="feature">
            <iconify-icon icon="fluent:flash-20-regular"></iconify-icon>
            <div class="feature-title">极速响应</div>
            <div class="feature-desc">轻量纯前端实现，无需等待，随开随用。</div>
        </div>
        <div class="feature">
            <iconify-icon icon="fluent:apps-20-regular"></iconify-icon>
            <div class="feature-title">工具集</div>
            <div class="feature-desc">网络检测、安全评估、编解码、色彩转换与哈希校验，一站式汇聚。</div>
        </div>
    </section>

</main>
<?php
$copyright     = $footer['copyright'];
$copyrightYear = $footer['year'];
require __DIR__ . '/view/footer.php';
?>
