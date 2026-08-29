<?php
/**
 * footer.php — 公共尾部视图
 *
 * 分层：view/（视图模型，只负责展示输出）
 * 职责：与 header.php 成对使用；展示版权署名并关闭文档与 <body> 标签。
 *       样式由 resources/css/footer.css 提供，此处不书写任何内联样式。
 *
 * 约定：
 *   - $copyright     版权署名信息数组（holder 署名 / url 链接）
 *   - $copyrightYear 版权年份（可选，默认当前年份）
 */

$copyright     = $copyright     ?? ['holder' => 'iCerya', 'url' => 'https://icerya.com'];
$copyrightYear = $copyrightYear ?? date('Y');
?>
<footer class="site-footer">
    <div class="container">
        <p class="copyright">
            © <?= htmlspecialchars((string) $copyrightYear, ENT_QUOTES, 'UTF-8') ?>
            <a href="<?= htmlspecialchars($copyright['url'], ENT_QUOTES, 'UTF-8') ?>"
               target="_blank" rel="noopener">
                <?= htmlspecialchars($copyright['holder'], ENT_QUOTES, 'UTF-8') ?>
            </a>
        </p>
    </div>
</footer>
</body>
</html>
