<?php
/**
 * site.php — 站点配置数据
 *
 * 分层：data/（数据交换 / 读取）
 * 职责：返回站点全局配置；供 system/ 层读取，禁止在此混入业务逻辑。
 *       约定：data/ 目录只负责数据的存取与交换。
 */
return [
    'name' => 'Hermes',
    'lang' => 'zh-CN',
    'nav'  => [
        ['label' => '首页', 'href' => 'index.php'],
    ],
    'copyright' => [
        'holder' => 'iCerya',
        'url'    => 'https://icerya.com',
    ],
];
