<?php
/**
 * network-overview.php — 网络检测分类概览（视图入口）
 *
 * 分层：view 入口（展示）
 * 职责：顶部横排展示「网络检测」分类下所有功能（大图标+文字块，横向居中），
 *       下方展示分类介绍。数据由 system/App::overview() 装配，
 *       渲染复用 view/category-overview.php 视图组件。
 */
require __DIR__ . '/system/App.php';

$footer = App::footer();

$siteName    = App::config()['name'];
$nav         = App::config()['nav'];
$pageTitle   = '网络检测 — 概览';
$pageStyles  = ['resources/css/overview.css'];
$pageScripts = [];

$overview = App::overview('网络工具', '网络检测');

$overviewTitle = $overview['title'] ?? '网络检测';
$overviewItems = $overview['items'] ?? [];
$overviewIntro = $overview['intro'] ?? [];

require __DIR__ . '/view/header.php';
require __DIR__ . '/view/category-overview.php';

$copyright     = $footer['copyright'];
$copyrightYear = $footer['year'];
require __DIR__ . '/view/footer.php';
