<?php
/**
 * index.php — 首页（入口视图，科幻极简风）
 *
 * 分层：view 入口（展示）
 * 职责：Hero 区 + 工具入口卡片。数据来自 system/App，样式来自 resources/css，
 *       图标使用 iconify:fluent（线性），遵守 AGENTS.md 铁律：PHP 内不书写内联 CSS / JS。
 */
require __DIR__ . '/system/App.php';

$app    = App::home();
$footer = App::footer();
$nav    = App::config()['nav'];

$siteName    = $app['title'];
$pageTitle   = $app['title'] . ' — 首页';
$pageStyles  = ['resources/css/index.css'];
$pageScripts = [];

require __DIR__ . '/view/header.php';
?>
<main class="site-main">
    <div class="hero">
        <iconify-icon class="hero-icon" icon="fluent:rocket-20-regular"></iconify-icon>
        <h1><?= htmlspecialchars($app['title'], ENT_QUOTES, 'UTF-8') ?></h1>
        <p class="hero-sub">简约、高效的网络工具集。在线检测、Whois 查询、公网 IP 定位，全部在浏览器本地完成。</p>
        <a class="hero-cta" href="online-test.php">
            <iconify-icon class="cta-icon" icon="fluent:arrow-right-20-regular"></iconify-icon>
            开始使用网络工具
        </a>

        <div class="entry-grid">
            <?php foreach ($nav as $item): ?>
                <?php if (!empty($item['groups'])): ?>
                    <?php foreach ($item['groups'] as $group): ?>
                        <?php foreach ($group['links'] as $link): ?>
                            <a class="entry-card" href="<?= htmlspecialchars($link['href'], ENT_QUOTES, 'UTF-8') ?>">
                                <iconify-icon icon="<?= htmlspecialchars($link['icon'], ENT_QUOTES, 'UTF-8') ?>"></iconify-icon>
                                <span>
                                    <div class="entry-card-title"><?= htmlspecialchars($link['label'], ENT_QUOTES, 'UTF-8') ?></div>
                                    <div class="entry-card-desc"><?= htmlspecialchars($link['desc'] ?? '', ENT_QUOTES, 'UTF-8') ?></div>
                                </span>
                            </a>
                        <?php endforeach; ?>
                    <?php endforeach; ?>
                <?php endif; ?>
            <?php endforeach; ?>
        </div>
    </div>
</main>
<?php
$copyright     = $footer['copyright'];
$copyrightYear = $footer['year'];
require __DIR__ . '/view/footer.php';
?>
