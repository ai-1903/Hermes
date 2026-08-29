<?php
/**
 * aegis-intelligent.php — 智能检测（视图入口）
 *
 * 分层：view 入口（展示）
 * 职责：暂为占位页，功能待实现。复用 view/placeholder.php 视图组件，
 *       并附加 aegis.css 的四芒星旋转辉光特效（区别于普通占位页）。
 */
require __DIR__ . '/system/App.php';

$footer = App::footer();

$siteName    = App::config()['name'];
$nav         = App::config()['nav'];
$pageTitle   = '智能检测 — Aegis 安全';
$pageStyles  = ['resources/css/placeholder.css', 'resources/css/aegis.css'];
$pageScripts = [];

$phIcon      = 'fluent:sparkle-20-regular';
$phName      = '智能检测';
$phDesc      = '多维安全信号智能分析，功能正在构建中。';
$phCardClass = 'placeholder-card--sparkle';

require __DIR__ . '/view/header.php';
require __DIR__ . '/view/placeholder.php';

$copyright     = $footer['copyright'];
$copyrightYear = $footer['year'];
require __DIR__ . '/view/footer.php';
