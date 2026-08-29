<?php
/**
 * header.php — 公共头部视图
 *
 * 分层：view/（视图模型，只负责展示输出）
 * 职责：输出 <head> 与公共站点头部导航。
 *
 * 结构说明（主菜单栏「向下拉伸」式 Mega 菜单）：
 *   - .nav-bar 是主菜单栏本体：单一容器、单一背景渲染（毛玻璃 blur 对整个容器生效）。
 *     常规高度 54px，仅显示 .nav-top 一行（LOGO + 一级菜单项 + 汉堡按钮）。
 *   - 当悬停 / 点击带二级菜单的一级项，或点击汉堡按钮时，.nav-bar 自身向下拉伸变宽
 *     （max-height 增大），顶部原组件位置不动；在下方新开辟的 .nav-mega 空间里，
 *     从左至右分栏（.mega-columns）排布子菜单项。
 *   - 每个带二级菜单的一级项对应一个 .mega-panel，同一时刻只显示其一；
 *     面板是 .nav-bar 内部的一块区域（无独立背景，共用主菜单栏的毛玻璃背景）。
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
    <!-- 主菜单栏本体：单一容器，向下拉伸变宽 -->
    <div class="nav-bar" id="nav-bar">

        <!-- 顶部一行：原组件（LOGO + 一级菜单项 + 汉堡），位置不动 -->
        <div class="container nav-top">
            <a class="brand" href="index.php">
                <iconify-icon icon="fluent:rocket-20-regular"></iconify-icon>
                <?= htmlspecialchars($siteName, ENT_QUOTES, 'UTF-8') ?>
            </a>

            <nav class="nav-links" id="site-nav" aria-label="主导航">
                <?php foreach ($nav as $navIndex => $item): ?>
                    <?php if (!empty($item['groups'])): ?>
                        <div class="nav-item dropdown">
                            <button type="button" class="nav-link nav-btn"
                                    data-panel="panel-<?= (int) $navIndex ?>"
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

            <button type="button" class="hamburger" aria-label="打开菜单" aria-expanded="false">
                <iconify-icon icon="fluent:list-20-regular"></iconify-icon>
            </button>
        </div>

        <!-- 下方新开辟空间：子菜单从左至右分栏（共用主菜单栏背景，非独立弹层） -->
        <div class="nav-mega">
            <div class="container">
                <?php foreach ($nav as $navIndex => $item): ?>
                    <?php if (!empty($item['groups'])): ?>
                    <div class="mega-panel" id="panel-<?= (int) $navIndex ?>" role="menu"
                         aria-label="<?= htmlspecialchars($item['label'], ENT_QUOTES, 'UTF-8') ?>">
                        <div class="mega-columns">
                            <?php foreach ($item['groups'] as $group): ?>
                                <div class="mega-column">
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
                    <?php endif; ?>
                <?php endforeach; ?>
            </div>
        </div>

    </div>
</header>
