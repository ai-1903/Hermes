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
                    'intro' => [
                        '网络检测分类为你提供全面的网站与网络可达性诊断工具。',
                        '从基础的在线状态探测、WHOIS 域名信息查询，到公网 IP 归属与运营商识别，',
                        '所有检测均在浏览器本地完成，快速、私密、无需注册。',
                    ],
                    'links' => [
                        [
                            'label' => '概览',
                            'href'  => 'network-overview.php',
                            'desc'  => '网络检测分类总览',
                            'icon'  => 'fluent:apps-20-regular',
                        ],
                        [
                            'label' => 'Online Test',
                            'href'  => 'online-test.php',
                            'desc'  => '域名 / IP 在线检测',
                            'icon'  => 'fluent:earth-20-regular',
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
                [
                    'title' => 'Aegis',
                    'intro' => [
                        'Aegis 安全检测栏目为你提供网络与数据安全的体检工具。',
                        '从多维度智能风险检测，到连接安全与数据传输安全评估，',
                        '帮助你了解当前的网络环境是否值得信赖。',
                    ],
                    'links' => [
                        [
                            'label' => '概览',
                            'href'  => 'aegis-overview.php',
                            'desc'  => 'Aegis 安全检测分类总览',
                            'icon'  => 'fluent:apps-20-regular',
                        ],
                        [
                            'label' => '智能检测',
                            'href'  => 'aegis-intelligent.php',
                            'desc'  => '多维安全信号智能分析',
                            'icon'  => 'fluent:sparkle-20-regular',
                        ],
                        [
                            'label' => '连接安全检测',
                            'href'  => 'aegis-connection.php',
                            'desc'  => '我的网络安全吗？',
                            'icon'  => 'fluent:globe-shield-20-regular',
                        ],
                        [
                            'label' => '数据安全检测',
                            'href'  => 'aegis-data.php',
                            'desc'  => '我的数据会被窃听吗？',
                            'icon'  => 'fluent:lock-20-regular',
                        ],
                    ],
                ],
            ],
        ],
        [
            'label'  => '实用工具',
            'icon'   => 'fluent:toolbox-20-regular',
            'groups' => [
                [
                    'title' => '雅努斯之门',
                    'intro' => [
                        '雅努斯之门汇集面向开发与创作的实用工具。',
                        '从代码辅助、数据可视化编辑，到色彩编码转换，',
                        '为你日常开发与设计工作提供一站式便捷入口。',
                    ],
                    'links' => [
                        [
                            'label' => '概览',
                            'href'  => 'janus-overview.php',
                            'desc'  => '雅努斯之门分类总览',
                            'icon'  => 'fluent:apps-20-regular',
                        ],
                        [
                            'label' => 'Coder',
                            'href'  => 'coder.php',
                            'desc'  => '开发辅助工具',
                            'icon'  => 'fluent:code-20-regular',
                        ],
                        [
                            'label' => '普罗米修斯',
                            'href'  => 'prometheus.php',
                            'desc'  => 'JSON 等数据可视化编辑',
                            'icon'  => 'fluent:data-usage-20-regular',
                        ],
                        [
                            'label' => '伊里斯桥',
                            'href'  => 'iris-bridge.php',
                            'desc'  => '颜色板与色彩编码转换',
                            'icon'  => 'fluent:color-20-regular',
                        ],
                    ],
                ],
                [
                    'title' => 'Astraea',
                    'links' => [
                        [
                            'label' => 'Astraea',
                            'href'  => 'astraea.php',
                            'desc'  => 'MD5 / 哈希校验工具',
                            'icon'  => 'fluent:shield-checkmark-20-regular',
                        ],
                    ],
                ],
            ],
        ],
    ],
    'copyright' => [
        'holder' => 'iCerya',
        'url'    => 'https://icerya.com',
        'repo'   => 'https://github.com/ai-1903/Hermes',
    ],
];
