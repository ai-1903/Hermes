<?php
/**
 * aegis-data.php — 数据安全检测（视图入口）
 *
 * 分层：view 入口（展示）
 * 职责：暂为占位页，功能待实现。复用 view/placeholder.php 视图组件。
 */
require __DIR__ . '/system/App.php';

$footer = App::footer();

$siteName    = App::config()['name'];
$nav         = App::config()['nav'];
$pageTitle   = '数据安全检测 — Aegis 安全';
$pageStyles  = ['resources/css/placeholder.css'];
$pageScripts = [];

$phIcon = 'fluent:lock-20-regular';
$phName = '数据安全检测';
$phDesc = '我的数据会被窃听吗？';

require __DIR__ . '/view/header.php';
require __DIR__ . '/view/placeholder.php';

$copyright     = $footer['copyright'];
$copyrightYear = $footer['year'];
require __DIR__ . '/view/footer.php';
