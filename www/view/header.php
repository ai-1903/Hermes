<?php
/**
 * header.php — 公共头部视图（含全宽 Mega 菜单）
 *
 * 分层：view/（视图模型，只负责展示输出）
 * 职责：输出 <head> 与公共站点头部导航。导航含二级菜单时渲染为
 *       「导航栏全栏向下展开」的 Mega 菜单：原导航组件不变，
 *       面板内按标题分类分组排列（PC 每类一栏，移动端纵向堆叠）。
 *       图标统一使用 iconify:fluent（iconify-icon 组件）。
 *
 * 约定：
 *   - $siteName   站点名称
 *   - $nav        导航结构（见 data/site.php；支持 groups 分组）
 *   - $pageTitle  页面标题
 *   - $pageStyles / $pageScripts 页面专属资源（相对站点根）
 */

$siteName    = $siteName    ?? 'Hermes';
$nav         = $nav         ?? [];
$pageTitle   = $pageTitle   ?? 'Hermes';
$pageStyles  = $pageStyles  ?? [];
$pageScripts = $pageScripts ?? [];
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($pageTitle, ENT_QUOTES, 'UTF-8') ?></title>

    <!-- 全局样式：resources/css（按组件/类别存储） -->
    <link rel="stylesheet" href="resources/css/base.css">
    <link rel="stylesheet" href="resources/css/header.css">
    <link rel="stylesheet" href="resources/css/footer.css">
    <?php foreach ($pageStyles as $href): ?>
    <link rel="stylesheet" href="<?= htmlspecialchars($href, ENT_QUOTES, 'UTF-8') ?>">
    <?php endforeach; ?>

    <!-- Iconify（iconify:fluent 图标库 Web 组件） -->
    <script src="https://cdn.jsdelivr.net/npm/iconify-icon@2.1.0/dist/iconify-icon.min.js"></script>
    <!-- 全局脚本：resources/js -->
    <script src="resources/js/app.js" defer></script>
    <?php foreach ($pageScripts as $src): ?>
    <script src="<?= htmlspecialchars($src, ENT_QUOTES, 'UTF-8') ?>" defer></script>
    <?php endforeach; ?>
</head>
<body>
<header class="site-header">
    <div class="container header-inner">
        <a class="brand" href="index.php">
            <iconify-icon icon="fluent:rocket-20-regular"></iconify-icon>
            <?= htmlspecialchars($siteName, ENT_QUOTES, 'UTF-8') ?>
        </a>

        <button type="button" class="hamburger" aria-label="打开菜单" aria-expanded="false">
            <iconify-icon icon="fluent:list-20-regular"></iconify-icon>
        </button>

        <nav class="nav" id="site-nav">
            <?php foreach ($nav as $item): ?>
                <?php if (!empty($item['groups'])): ?>
                    <div class="nav-item dropdown">
                        <button type="button" class="nav-link nav-btn" aria-haspopup="true" aria-expanded="false">
                            <?php if (!empty($item['icon'])): ?>
                            <iconify-icon icon="<?= htmlspecialchars($item['icon'], ENT_QUOTES, 'UTF-8') ?>"></iconify-icon>
                            <?php endif; ?>
                            <?= htmlspecialchars($item['label'], ENT_QUOTES, 'UTF-8') ?>
                            <span class="caret" aria-hidden="true"></span>
                        </button>
                        <div class="dropdown-menu" role="menu">
                            <div class="container">
                                <div class="dropdown-groups">
                                    <?php foreach ($item['groups'] as $group): ?>
                                        <div class="menu-group">
                                            <h4 class="menu-title"><?= htmlspecialchars($group['title'], ENT_QUOTES, 'UTF-8') ?></h4>
                                            <?php foreach ($group['links'] as $link): ?>
                                                <a class="menu-link" href="<?= htmlspecialchars($link['href'], ENT_QUOTES, 'UTF-8') ?>">
                                                    <?php if (!empty($link['icon'])): ?>
                                                    <iconify-icon icon="<?= htmlspecialchars($link['icon'], ENT_QUOTES, 'UTF-8') ?>"></iconify-icon>
                                                    <?php endif; ?>
                                                    <span class="menu-link-text">
                                                        <span class="menu-link-label"><?= htmlspecialchars($link['label'], ENT_QUOTES, 'UTF-8') ?></span>
                                                        <?php if (!empty($link['desc'])): ?>
                                                        <span class="menu-link-desc"><?= htmlspecialchars($link['desc'], ENT_QUOTES, 'UTF-8') ?></span>
                                                        <?php endif; ?>
                                                    </span>
                                                </a>
                                            <?php endforeach; ?>
                                        </div>
                                    <?php endforeach; ?>
                                </div>
                            </div>
                        </div>
                    </div>
                <?php else: ?>
                    <a class="nav-link" href="<?= htmlspecialchars($item['href'], ENT_QUOTES, 'UTF-8') ?>">
                        <?php if (!empty($item['icon'])): ?>
                        <iconify-icon icon="<?= htmlspecialchars($item['icon'], ENT_QUOTES, 'UTF-8') ?>"></iconify-icon>
                        <?php endif; ?>
                        <?= htmlspecialchars($item['label'], ENT_QUOTES, 'UTF-8') ?>
                    </a>
                <?php endif; ?>
            <?php endforeach; ?>
        </nav>
    </div>
</header>
