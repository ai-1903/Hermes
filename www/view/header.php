<?php
/**
 * header.php — 公共头部视图
 *
 * 分层：view/（视图模型，只负责展示输出）
 * 职责：输出 HTML 文档头部（<head> 区域）与公共站点头部导航。
 *       CSS/JS 一律通过 <link>/<script> 引用 resources/ 下的独立文件，
 *       此处不书写任何内联样式或脚本（见 AGENTS.md 铁律）。
 *
 * 约定：
 *   - $siteName   站点名称（可选，默认 "Hermes"）
 *   - $nav        导航结构数组（可选；支持 children 二级菜单）
 *   - $pageTitle  页面标题（可选，默认 "Hermes"）
 *   - $pageStyles 页面专属 CSS 路径数组（相对站点根）
 *   - $pageScripts 页面专属 JS 路径数组（相对站点根）
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

    <!-- 全局脚本：resources/js（defer 延迟执行） -->
    <script src="resources/js/app.js" defer></script>
    <?php foreach ($pageScripts as $src): ?>
    <script src="<?= htmlspecialchars($src, ENT_QUOTES, 'UTF-8') ?>" defer></script>
    <?php endforeach; ?>
</head>
<body>
<header class="site-header">
    <div class="container">
        <a class="brand" href="index.php"><?= htmlspecialchars($siteName, ENT_QUOTES, 'UTF-8') ?></a>
        <nav class="nav">
            <?php foreach ($nav as $item): ?>
                <?php if (!empty($item['children'])): ?>
                    <div class="nav-item dropdown">
                        <a class="nav-link" href="javascript:void(0)">
                            <?= htmlspecialchars($item['label'], ENT_QUOTES, 'UTF-8') ?><span class="caret">▾</span>
                        </a>
                        <div class="dropdown-menu">
                            <?php foreach ($item['children'] as $child): ?>
                                <a href="<?= htmlspecialchars($child['href'], ENT_QUOTES, 'UTF-8') ?>">
                                    <?= htmlspecialchars($child['label'], ENT_QUOTES, 'UTF-8') ?>
                                </a>
                            <?php endforeach; ?>
                        </div>
                    </div>
                <?php else: ?>
                    <a class="nav-link" href="<?= htmlspecialchars($item['href'], ENT_QUOTES, 'UTF-8') ?>">
                        <?= htmlspecialchars($item['label'], ENT_QUOTES, 'UTF-8') ?>
                    </a>
                <?php endif; ?>
            <?php endforeach; ?>
        </nav>
    </div>
</header>
