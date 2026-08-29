<?php
/**
 * json.php — 通用 JSON 数据读取工具（数据层）
 *
 * 分层：data/（数据交换 / 读取）
 * 职责：从 data/json/ 目录安全地读取 JSON 字典文件并解析为 PHP 数组。
 *       只负责数据的存取，不含业务逻辑（业务逻辑在 system/，展示在 view/）。
 *
 * 用法：Json::read('isp-dict');   // 读取 data/json/isp-dict.json
 * 约定：文件不存在或 JSON 无效时返回 null（不抛异常），调用方自行处理。
 */
declare(strict_types=1);

final class Json
{
    /** data/json 目录绝对路径 */
    private static string $dir = __DIR__ . '/json';

    /**
     * 读取并解析 JSON 字典文件。
     * @param string $name 文件名（不含 .json 扩展名；仅允许安全字符）
     * @return array|null  解析后的数组；失败返回 null
     */
    public static function read(string $name): ?array
    {
        // 防御：仅允许文件名安全字符，防止路径穿越
        if (!preg_match('/^[A-Za-z0-9_-]+$/', $name)) {
            return null;
        }

        $file = self::$dir . '/' . $name . '.json';
        if (!is_file($file) || !is_readable($file)) {
            return null;
        }

        $raw = file_get_contents($file);
        if ($raw === false) {
            return null;
        }

        $data = json_decode($raw, true);
        return is_array($data) ? $data : null;
    }
}
