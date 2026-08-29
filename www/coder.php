<?php
/**
 * coder.php — Coder（开发辅助工具）视图入口
 *
 * 分层：view 入口（展示）
 * 职责：暂为占位页，功能待实现。复用 view/placeholder.php 视图组件。
 */
require __DIR__ . '/system/App.php';

$footer = App::footer();

$siteName    = App::config()['name'];
$nav         = App::config()['nav'];
$pageTitle   = 'Coder — 开发辅助工具';
$pageStyles  = ['resources/css/placeholder.css'];
$pageScripts = [];

$phIcon = 'fluent:code-20-regular';
$phName = 'Coder';
$phDesc = '面向开发者的辅助工具集，功能正在构建中。';

require __DIR__ . '/view/header.php';
require __DIR__ . '/view/placeholder.php';

$copyright     = $footer['copyright'];
$copyrightYear = $footer['year'];
require __DIR__ . '/view/footer.php';
