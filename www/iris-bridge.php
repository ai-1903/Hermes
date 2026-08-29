<?php
/**
 * iris-bridge.php — 伊里斯桥（色彩转换桥梁）视图入口
 *
 * 分层：view 入口（展示）
 * 职责：颜色板与色彩编码转换工具。左侧可拖拽调色盘（含透明度条），
 *       右侧 RGB(A) / HEX / OKLCH / CMYK 输入框组，双向同步转换。
 *       - 每个输入框组行尾有圆形颜色示意 + 圆形复制按钮（悬停展开胶囊选项）
 *       - 输入框失焦时更新并同步其它格式
 *       - 色域不支持时以模态框提示（布局不偏移）
 *       逻辑在 resources/js/iris-bridge.js，样式在 resources/css/iris-bridge.css。
 */
require __DIR__ . '/system/App.php';

$footer = App::footer();

$siteName    = App::config()['name'];
$nav         = App::config()['nav'];
$pageTitle   = '伊里斯桥 — 色彩转换';
$pageStyles  = ['resources/css/iris-bridge.css'];
$pageScripts = ['resources/js/iris-bridge.js'];

require __DIR__ . '/view/header.php';
?>
<main class="iris-main">

    <!-- 左：调色盘 + 透明度条 -->
    <section class="iris-picker">
        <canvas id="ir-picker" class="ir-picker-canvas" width="280" height="240"></canvas>
        <div class="ir-alpha-track">
            <canvas id="ir-alpha" class="ir-alpha-canvas" width="280" height="18"></canvas>
            <div id="ir-alpha-thumb" class="ir-alpha-thumb"></div>
        </div>
    </section>

    <!-- 右：各颜色格式输入框组 -->
    <section class="iris-fields">

        <!-- RGBA -->
        <div class="ir-row" data-format="rgba">
            <label class="ir-label">RGBA</label>
            <div class="ir-inputs">
                <input type="number" class="ir-input ir-rgba" data-ch="r" min="0" max="255" step="1" placeholder="R">
                <input type="number" class="ir-input ir-rgba" data-ch="g" min="0" max="255" step="1" placeholder="G">
                <input type="number" class="ir-input ir-rgba" data-ch="b" min="0" max="255" step="1" placeholder="B">
                <input type="number" class="ir-input ir-rgba ir-alpha" data-ch="a" min="0" max="1" step="0.01" placeholder="A">
            </div>
            <span class="ir-swatch" data-format="rgba"></span>
            <div class="ir-copy" data-format="rgba">
                <button type="button" class="ir-copy-btn" title="复制 RGBA">
                    <iconify-icon icon="fluent:copy-20-regular"></iconify-icon>
                </button>
                <div class="ir-copy-menu">
                    <button type="button" class="ir-copy-opt" data-mode="space">空格分隔</button>
                    <button type="button" class="ir-copy-opt" data-mode="comma">逗号分隔</button>
                </div>
            </div>
        </div>

        <!-- HEX -->
        <div class="ir-row" data-format="hex">
            <label class="ir-label">HEX</label>
            <div class="ir-inputs ir-hex-inputs">
                <span class="ir-hash">#</span>
                <input type="text" class="ir-input ir-hex" maxlength="8" placeholder="RRGGBB" autocomplete="off" spellcheck="false">
            </div>
            <span class="ir-swatch" data-format="hex"></span>
            <div class="ir-copy" data-format="hex">
                <button type="button" class="ir-copy-btn" title="复制 HEX">
                    <iconify-icon icon="fluent:copy-20-regular"></iconify-icon>
                </button>
                <div class="ir-copy-menu">
                    <button type="button" class="ir-copy-opt" data-mode="hash">带 #</button>
                    <button type="button" class="ir-copy-opt" data-mode="nohash">不带 #</button>
                </div>
            </div>
        </div>

        <!-- OKLCH -->
        <div class="ir-row" data-format="oklch">
            <label class="ir-label">OKLCH</label>
            <div class="ir-inputs">
                <input type="number" class="ir-input ir-oklch" data-ch="l" step="0.01" placeholder="L">
                <input type="number" class="ir-input ir-oklch" data-ch="c" step="0.01" placeholder="C">
                <input type="number" class="ir-input ir-oklch" data-ch="h" step="0.1" placeholder="H">
                <input type="number" class="ir-input ir-oklch ir-alpha" data-ch="a" min="0" max="1" step="0.01" placeholder="A">
            </div>
            <span class="ir-swatch" data-format="oklch"></span>
            <div class="ir-copy" data-format="oklch">
                <button type="button" class="ir-copy-btn" title="复制 OKLCH">
                    <iconify-icon icon="fluent:copy-20-regular"></iconify-icon>
                </button>
                <div class="ir-copy-menu">
                    <button type="button" class="ir-copy-opt" data-mode="space">空格分隔</button>
                    <button type="button" class="ir-copy-opt" data-mode="comma">逗号分隔</button>
                </div>
            </div>
        </div>

        <!-- CMYK -->
        <div class="ir-row" data-format="cmyk">
            <label class="ir-label">CMYK</label>
            <div class="ir-inputs">
                <input type="number" class="ir-input ir-cmyk" data-ch="c" step="0.01" placeholder="C">
                <input type="number" class="ir-input ir-cmyk" data-ch="m" step="0.01" placeholder="M">
                <input type="number" class="ir-input ir-cmyk" data-ch="y" step="0.01" placeholder="Y">
                <input type="number" class="ir-input ir-cmyk" data-ch="k" step="0.01" placeholder="K">
            </div>
            <span class="ir-swatch" data-format="cmyk"></span>
            <div class="ir-copy" data-format="cmyk">
                <button type="button" class="ir-copy-btn" title="复制 CMYK">
                    <iconify-icon icon="fluent:copy-20-regular"></iconify-icon>
                </button>
                <div class="ir-copy-menu">
                    <button type="button" class="ir-copy-opt" data-mode="space">空格分隔</button>
                    <button type="button" class="ir-copy-opt" data-mode="comma">逗号分隔</button>
                </div>
            </div>
        </div>

    </section>

    <!-- 色域不支持模态框 -->
    <div class="ir-modal-overlay" id="ir-modal" hidden>
        <div class="ir-modal">
            <div class="ir-modal-icon">
                <iconify-icon icon="fluent:warning-20-regular"></iconify-icon>
            </div>
            <div class="ir-modal-title">色域提示</div>
            <div class="ir-modal-text" id="ir-modal-text"></div>
            <button type="button" class="ir-modal-btn" id="ir-modal-close">知道了</button>
        </div>
    </div>

</main>
<?php
$copyright     = $footer['copyright'];
$copyrightYear = $footer['year'];
require __DIR__ . '/view/footer.php';
