<?php
/**
 * coder.php — Coder（开发辅助工具）视图入口
 *
 * 分层：view 入口（展示）
 * 职责：编解码工具——顶部选项卡（文本 / base64 / UTF-8 / Unicode / URL），
 *       中间长方形输入框，下方长方形输出框（类型标注 + 一键复制）。
 *       逻辑在 resources/js/coder.js（纯前端，不依赖服务器）。
 */
require __DIR__ . '/system/App.php';

$footer = App::footer();

$siteName    = App::config()['name'];
$nav         = App::config()['nav'];
$pageTitle   = 'Coder — 开发辅助工具';
$pageStyles  = ['resources/css/coder.css'];
$pageScripts = ['resources/js/coder.js'];

require __DIR__ . '/view/header.php';
?>
<main class="coder-main">
    <div class="coder-card">

        <!-- 选项卡（输入框上方）：控制输出类型 -->
        <div class="coder-tabs" role="tablist" aria-label="输出类型">
            <button type="button" class="coder-tab active" data-type="text" role="tab">文本</button>
            <button type="button" class="coder-tab" data-type="base64" role="tab">base64</button>
            <button type="button" class="coder-tab" data-type="utf8" role="tab">UTF-8</button>
            <button type="button" class="coder-tab" data-type="unicode" role="tab">Unicode</button>
            <button type="button" class="coder-tab" data-type="url" role="tab">URL</button>
        </div>

        <!-- 输入框 -->
        <textarea id="cd-input" class="coder-input" spellcheck="false"
                  placeholder="输入要转换的内容… 自动识别其编码类型并转换为所选输出格式"></textarea>

        <!-- 输出框：类型标注 + 复制按钮 -->
        <div class="coder-output-wrap">
            <div class="coder-output-head">
                <span class="coder-output-info">
                    <iconify-icon icon="fluent:arrow-sync-20-regular"></iconify-icon>
                    输入 <b id="cd-in-type" class="type-tag">文本</b>
                    <span class="arrow">→</span>
                    输出 <b id="cd-out-type" class="type-tag type-tag-out">文本</b>
                </span>
                <button id="cd-copy" class="coder-copy" type="button" title="一键复制">
                    <iconify-icon icon="fluent:copy-20-regular"></iconify-icon>
                    <span id="cd-copy-label">复制</span>
                </button>
            </div>
            <textarea id="cd-output" class="coder-output" readonly spellcheck="false"
                      placeholder="转换结果将显示在这里"></textarea>
        </div>

    </div>
</main>
<?php
$copyright     = $footer['copyright'];
$copyrightYear = $footer['year'];
require __DIR__ . '/view/footer.php';
