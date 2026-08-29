<?php
/**
 * category-overview.php — 分类概览视图组件（通用）
 *
 * 分层：view/（视图模型，只负责展示输出）
 * 职责：渲染分类概览页：
 *   1. 顶部横排：该分类下所有功能，大图标 + 图标下文字，横向居中排列
 *   2. 下方：该分类的介绍段落
 * 样式来自 resources/css/overview.css，不书写内联样式。
 *
 * 约定（由调用方定义后再 require）：
 *   - $overviewTitle  分类标题
 *   - $overviewItems  功能项数组：[{ label, href, desc, icon }]
 *   - $overviewIntro  介绍段落数组（可选）
 */
$overviewTitle = $overviewTitle ?? '';
$overviewItems = $overviewItems ?? [];
$overviewIntro = $overviewIntro ?? [];
?>
<main class="overview-main">
    <div class="overview-inner">

        <!-- 顶部横排：大图标 + 文字块，横向居中 -->
        <section class="overview-grid" aria-label="<?= htmlspecialchars($overviewTitle, ENT_QUOTES, 'UTF-8') ?> 功能">
            <?php foreach ($overviewItems as $item): ?>
                <a class="ov-card" href="<?= htmlspecialchars($item['href'], ENT_QUOTES, 'UTF-8') ?>">
                    <span class="ov-icon">
                        <iconify-icon icon="<?= htmlspecialchars($item['icon'] ?? 'fluent:apps-20-regular', ENT_QUOTES, 'UTF-8') ?>"></iconify-icon>
                    </span>
                    <span class="ov-name"><?= htmlspecialchars($item['label'] ?? '', ENT_QUOTES, 'UTF-8') ?></span>
                    <span class="ov-desc"><?= htmlspecialchars($item['desc'] ?? '', ENT_QUOTES, 'UTF-8') ?></span>
                </a>
            <?php endforeach; ?>
        </section>

        <!-- 下方：分类介绍 -->
        <section class="overview-intro">
            <h2 class="ov-intro-title">
                <iconify-icon icon="fluent:info-20-regular"></iconify-icon>
                <?= htmlspecialchars($overviewTitle, ENT_QUOTES, 'UTF-8') ?> 介绍
            </h2>
            <?php foreach ($overviewIntro as $paragraph): ?>
                <p class="ov-intro-para"><?= htmlspecialchars($paragraph, ENT_QUOTES, 'UTF-8') ?></p>
            <?php endforeach; ?>
        </section>

    </div>
</main>
