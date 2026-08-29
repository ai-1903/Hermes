<?php
/**
 * janus-overview.php — 雅努斯之门分类概览（视图入口）
 *
 * 分层：view 入口（展示）
 * 职责：顶部横排展示「雅努斯之门」分类下所有功能（大图标+文字块，横向居中），
 *       下方展示分类介绍。数据由 system/App::overview() 装配，
 *       渲染复用 view/category-overview.php 视图组件。
 */
require __DIR__ . '/system/App.php';

$footer = App::footer();

$siteName    = App::config()['name'];
$nav         = App::config()['nav'];
$pageTitle   = '雅努斯之门 — 概览';
$pageStyles  = ['resources/css/overview.css'];
$pageScripts = [];

$overview = App::overview('实用工具', '雅努斯之门');

$overviewTitle = $overview['title'] ?? '雅努斯之门';
$overviewItems = $overview['items'] ?? [];
$overviewIntro = $overview['intro'] ?? [];

require __DIR__ . '/view/header.php';
require __DIR__ . '/view/category-overview.php';

$copyright     = $footer['copyright'];
$copyrightYear = $footer['year'];
require __DIR__ . '/view/footer.php';
