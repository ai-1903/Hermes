<?php
/**
 * astraea.php — Astraea（天平与正义）视图入口
 *
 * 分层：view 入口（展示）
 * 职责：暂为占位页，功能待实现。复用 view/placeholder.php 视图组件。
 */
require __DIR__ . '/system/App.php';

$footer = App::footer();

$siteName    = App::config()['name'];
$nav         = App::config()['nav'];
$pageTitle   = 'Astraea — 天平与正义';
$pageStyles  = ['resources/css/placeholder.css'];
$pageScripts = [];

$phIcon = 'fluent:scale-20-regular';
$phName = 'Astraea';
$phDesc = '天平与正义，功能正在构建中。';

require __DIR__ . '/view/header.php';
require __DIR__ . '/view/placeholder.php';

$copyright     = $footer['copyright'];
$copyrightYear = $footer['year'];
require __DIR__ . '/view/footer.php';
