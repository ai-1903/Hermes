<?php
/**
 * App.php — 应用核心 / 控制器入口
 *
 * 分层：system/（逻辑运算）
 * 职责：读取 data/ 配置，组装视图所需数据；不直接输出 HTML。
 * 解耦：本文件只负责「数据 → 视图数据」的装配，不包含任何展示逻辑。
 */
declare(strict_types=1);

final class App
{
    /** 站点配置缓存 */
    private static ?array $config = null;

    /** 读取站点配置（data/site.php） */
    public static function config(): array
    {
        if (self::$config === null) {
            self::$config = require __DIR__ . '/../data/site.php';
        }
        return self::$config;
    }

    /** 组装首页展示数据 */
    public static function home(): array
    {
        return [
            'title'       => self::config()['name'],
            'phpVersion'  => PHP_VERSION,
            'serverTime'  => date('Y-m-d H:i:s'),
        ];
    }

    /** 组装公共尾部数据（版权信息） */
    public static function footer(): array
    {
        return [
            'copyright' => self::config()['copyright'],
            'year'      => (int) date('Y'),
        ];
    }

    /**
     * 组装分类概览数据。
     * 找到一级菜单下指定标题的 group，返回其介绍与功能项（去掉「概览」自身）。
     * @param string $menuLabel 一级菜单标签（如「网络工具」）
     * @param string $groupTitle 分组标题（如「网络检测」）
     * @return array|null { title, intro, items }；找不到返回 null
     */
    public static function overview(string $menuLabel, string $groupTitle): ?array
    {
        foreach (self::config()['nav'] as $menu) {
            if ($menu['label'] !== $menuLabel || empty($menu['groups'])) {
                continue;
            }
            foreach ($menu['groups'] as $group) {
                if ($group['title'] !== $groupTitle) {
                    continue;
                }
                // 过滤掉「概览」自身项
                $items = array_values(array_filter($group['links'] ?? [], function ($link) {
                    return ($link['label'] ?? '') !== '概览';
                }));
                return [
                    'title' => $group['title'] ?? $groupTitle,
                    'intro' => $group['intro'] ?? [],
                    'items' => $items,
                ];
            }
        }
        return null;
    }
}
