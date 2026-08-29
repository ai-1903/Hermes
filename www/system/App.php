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
}
