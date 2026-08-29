<?php
/**
 * header.php — 公共头部视图（含全宽 Mega 菜单）
 *
 * 分层：view/（视图模型，只负责展示输出）
 * 职责：输出 <head> 与公共站点头部导航。
 *
 * 结构说明（导航与子菜单「无父子关系」）：
 *   - <header class="site-header">：整体外壳
 *   - .header-inner（「菜单栏和 LOGO」的容器 div）：
 *       含 LOGO、汉堡按钮、.nav（一级菜单栏）以及 .dropdown-menu（子菜单面板）。
 *   - .dropdown-menu 是 .header-inner 下的一个独立 div 块，与 .nav 平级，
 *     不再是 .nav-item 的子组件；点击/悬停时由 JS 以 data-menu 关联开合。
 *   - .nav-overlay：菜单向下展开时，在菜单栏与页面之间铺一层全局模糊遮罩。
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
    <!-- 菜单展开时的全局模糊遮罩（位于菜单栏与页面之间） -->
    <div class="nav-overlay" aria-hidden="true"></div>

    <div class="container header-inner">
        <a class="brand" href="index.php">
            <iconify-icon icon="fluent:rocket-20-regular"></iconify-icon>
            <?= htmlspecialchars($siteName, ENT_QUOTES, 'UTF-8') ?>
        </a>

        <button type="button" class="hamburger" aria-label="打开菜单" aria-expanded="false">
            <iconify-icon icon="fluent:list-20-regular"></iconify-icon>
        </button>

        <!-- 一级菜单栏 -->
        <nav class="nav" id="site-nav">
            <?php foreach ($nav as $navIndex => $item): ?>
                <?php if (!empty($item['groups'])): ?>
                    <div class="nav-item dropdown">
                        <button type="button" class="nav-link nav-btn"
                                data-menu="menu-<?= (int) $navIndex ?>"
                                aria-haspopup="true" aria-expanded="false">
                            <?php if (!empty($item['icon'])): ?>
                            <iconify-icon icon="<?= htmlspecialchars($item['icon'], ENT_QUOTES, 'UTF-8') ?>"></iconify-icon>
                            <?php endif; ?>
                            <?= htmlspecialchars($item['label'], ENT_QUOTES, 'UTF-8') ?>
                            <span class="caret" aria-hidden="true"></span>
                        </button>
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

        <!-- 子菜单面板：header-inner 下的独立 div 块，与 .nav 平级（无父子关系） -->
        <?php foreach ($nav as $navIndex => $item): ?>
            <?php if (!empty($item['groups'])): ?>
            <div class="dropdown-menu" id="menu-<?= (int) $navIndex ?>" role="menu"
                 aria-label="<?= htmlspecialchars($item['label'], ENT_QUOTES, 'UTF-8') ?>">
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
            <?php endif; ?>
        <?php endforeach; ?>
    </div>
</header>
