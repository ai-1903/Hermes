<?php
/**
 * index.php — 首页（入口视图）
 *
 * 分层：view 入口（展示）
 * 职责：仅负责组装并输出页面。数据来自 system/App，样式来自 resources/css，
 *       遵守 AGENTS.md 铁律：PHP 内不书写任何内联 CSS / JS。
 */
require __DIR__ . '/system/App.php';

$app    = App::home();
$footer = App::footer();

// 传递给公共头部（view/header.php 约定）
$siteName    = $app['title'];
$nav         = App::config()['nav'];
$pageTitle   = $app['title'] . ' — 首页';
$pageStyles  = ['resources/css/index.css'];
$pageScripts = [];

require __DIR__ . '/view/header.php';
?>
<main class="site-main">
    <div class="card">
        <h1><?= htmlspecialchars($app['title'], ENT_QUOTES, 'UTF-8') ?></h1>
        <div>
            <span class="badge green">● Nginx 已运行</span>
            <span class="badge green">● PHP <?= htmlspecialchars($app['phpVersion'], ENT_QUOTES, 'UTF-8') ?> 已运行</span>
            <span class="badge blue">端口 9753</span>
        </div>
        <p class="time">服务器时间：<?= htmlspecialchars($app['serverTime'], ENT_QUOTES, 'UTF-8') ?></p>
    </div>
</main>
<?php
$copyright     = $footer['copyright'];
$copyrightYear = $footer['year'];
require __DIR__ . '/view/footer.php';
?>
