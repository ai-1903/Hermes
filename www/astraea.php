<?php
/**
 * astraea.php — Astraea（天平与正义）视图入口
 *
 * 分层：view 入口（展示）
 * 职责：MD5 / 哈希校验工具。页面中间是巨大的上传拖放框（支持拖动与点击），
 *       不真实上传，而是在浏览器本地计算文件的 MD5 与 SHA-256 哈希，
 *       并在下方给出两个可复制的输出框（右侧复制按钮）。
 *       逻辑在 resources/js/astraea.js，样式在 resources/css/astraea.css。
 */
require __DIR__ . '/system/App.php';

$footer = App::footer();

$siteName    = App::config()['name'];
$nav         = App::config()['nav'];
$pageTitle   = 'Astraea — 哈希校验';
$pageStyles  = ['resources/css/astraea.css'];
$pageScripts = ['resources/js/astraea.js'];

require __DIR__ . '/view/header.php';
?>
<main class="astraea-main">

    <!-- 大上传拖放框 -->
    <section class="as-dropzone" id="as-dropzone" tabindex="0" role="button"
             aria-label="上传文件以计算哈希">
        <input type="file" id="as-file" class="as-file-input" hidden>
        <iconify-icon icon="fluent:document-arrow-up-20-regular"></iconify-icon>
        <div class="as-drop-title">拖放文件到这里，或点击选择文件</div>
        <div class="as-drop-sub">文件仅在浏览器本地处理，不会上传到服务器</div>
    </section>

    <!-- 输出区：MD5 + SHA-256 两个可复制输出框 -->
    <section class="as-outputs" id="as-outputs" hidden>
        <div class="as-file-name" id="as-file-name"></div>

        <div class="as-output">
            <div class="as-output-head">
                <span class="as-output-label">
                    <iconify-icon icon="fluent:hash-20-regular"></iconify-icon>
                    MD5
                </span>
                <button type="button" class="as-copy-btn" data-target="md5" title="复制 MD5">
                    <iconify-icon icon="fluent:copy-20-regular"></iconify-icon>
                </button>
            </div>
            <input type="text" class="as-output-value" id="as-md5" readonly spellcheck="false">
        </div>

        <div class="as-output">
            <div class="as-output-head">
                <span class="as-output-label">
                    <iconify-icon icon="fluent:shield-20-regular"></iconify-icon>
                    SHA-256
                </span>
                <button type="button" class="as-copy-btn" data-target="sha256" title="复制 SHA-256">
                    <iconify-icon icon="fluent:copy-20-regular"></iconify-icon>
                </button>
            </div>
            <input type="text" class="as-output-value" id="as-sha256" readonly spellcheck="false">
        </div>
    </section>

</main>
<?php
$copyright     = $footer['copyright'];
$copyrightYear = $footer['year'];
require __DIR__ . '/view/footer.php';
