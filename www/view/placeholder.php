<?php
/**
 * placeholder.php — 占位页面视图（通用，供各工具页复用）
 *
 * 分层：view/（视图模型，只负责展示输出）
 * 职责：渲染「功能建设中」占位内容，供内容待实现的页面复用。
 *      样式来自 resources/css/placeholder.css，不书写内联样式。
 *
 * 约定：
 *   - $phIcon   占位图标（iconify:fluent 线性变体）
 *   - $phName   工具名称
 *   - $phDesc   工具描述（可选）
 * 由调用方先定义这些变量，再 require 本文件。
 */
?>
<main class="placeholder-main">
    <div class="placeholder-card">
        <iconify-icon class="placeholder-icon" icon="<?= htmlspecialchars($phIcon ?? 'fluent:toolbox-20-regular', ENT_QUOTES, 'UTF-8') ?>"></iconify-icon>
        <h1 class="placeholder-title"><?= htmlspecialchars($phName ?? '', ENT_QUOTES, 'UTF-8') ?></h1>
        <?php if (!empty($phDesc)): ?>
        <p class="placeholder-desc"><?= htmlspecialchars($phDesc, ENT_QUOTES, 'UTF-8') ?></p>
        <?php endif; ?>
        <div class="placeholder-badge">
            <iconify-icon icon="fluent:construction-20-regular"></iconify-icon>
            功能建设中，敬请期待
        </div>
    </div>
</main>
