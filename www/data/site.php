<?php
/**
 * site.php — 站点配置数据
 *
 * 分层：data/（数据交换 / 读取）
 * 职责：返回站点全局配置；供 system/ 层读取，禁止在此混入业务逻辑。
 * 图标约定：统一使用 iconify:fluent 的 regular（线性）变体以确保可识别性。
 * 导航结构：一级菜单项含 groups（分类分组）时渲染为全宽 Mega 菜单，
 *           每个 group 一栏（title + links），links 支持 icon/desc。
 */
return [
    'name' => 'Hermes',
    'lang' => 'zh-CN',
    'nav'  => [
        [
            'label' => '首页',
            'href'  => 'index.php',
            'icon'  => 'fluent:home-20-regular',
        ],
        [
            'label'  => '网络工具',
            'icon'   => 'fluent:globe-20-regular',
            'groups' => [
                [
                    'title' => '网络检测',
                    'links' => [
                        [
                            'label' => 'Online Test',
                            'href'  => 'online-test.php',
                            'desc'  => '域名 / IP 在线检测',
                            'icon'  => 'fluent:wifi-3-20-regular',
                        ],
                        [
                            'label' => 'Hawkeye',
                            'href'  => 'hawkeye.php',
                            'desc'  => 'Whois 域名信息查询',
                            'icon'  => 'fluent:eye-20-regular',
                        ],
                        [
                            'label' => '天隼',
                            'href'  => 'falcon.php',
                            'desc'  => '公网 IP 与归属查询',
                            'icon'  => 'fluent:location-20-regular',
                        ],
                    ],
                ],
            ],
        ],
    ],
    'copyright' => [
        'holder' => 'iCerya',
        'url'    => 'https://icerya.com',
    ],
];
