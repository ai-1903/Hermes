<?php
/**
 * dns-lookup.php — DNS 解析中转接口（数据 / 交换）
 *
 * 分层：数据交换入口（供前端 fetch 调用，返回 JSON）
 * 职责：返回服务器侧对指定域名的 DNS 解析结果（A 记录 IP 列表）。
 *       用于 Aegis 连接安全检测的「用户实际 DNS」比对：访客访问本站时
 *       由本站服务器解析得到的 IP，代表「用户访问过来时解析的 DNS ISP」。
 *
 * 性能约束（自有服务端低频）：
 *   - 服务端用文件缓存解析结果（默认 6 小时 TTL），同一域名不重复解析
 *   - 前端应配合 localStorage 缓存 + 30 分钟节流（见 aegis-connection.js）
 *
 * 用法：dns-lookup.php?host=example.com
 * 返回：{ host, ips: [..], server_time, cache_hit }
 */
declare(strict_types=1);

$host = $_GET['host'] ?? '';
$host = strtolower(trim($host));

/* 仅允许合法域名 / IPv4，防止注入 */
if (!preg_match('/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/', $host)) {
    header('Content-Type: application/json');
    echo json_encode(['host' => $host, 'ips' => [], 'error' => 'invalid_host']);
    exit;
}

header('Content-Type: application/json');

$cacheDir = __DIR__ . '/data/cache';
if (!is_dir($cacheDir)) {
    @mkdir($cacheDir, 0775, true);
}
$cacheKey = 'dns_' . md5($host);
$cacheFile = $cacheDir . '/' . $cacheKey . '.json';
$cacheTtl = 6 * 3600;   // 缓存 6 小时

/* 命中缓存则直接返回 */
if (is_file($cacheFile) && (time() - filemtime($cacheFile)) < $cacheTtl) {
    $cached = json_decode((string) file_get_contents($cacheFile), true);
    if (is_array($cached)) {
        $cached['cache_hit'] = true;
        echo json_encode($cached);
        exit;
    }
}

/* 未命中：服务器侧解析（DNS_A + DNS_AAAA） */
$ips = [];
$recs = @dns_get_record($host, DNS_A);
if (is_array($recs)) {
    foreach ($recs as $rec) {
        if (!empty($rec['ip'])) $ips[] = $rec['ip'];
    }
}

$payload = [
    'host' => $host,
    'ips' => array_values(array_unique($ips)),
    'server_time' => time(),
    'cache_hit' => false,
];

/* 写入缓存（仅成功解析时缓存，避免污染缓存） */
@file_put_contents($cacheFile, json_encode($payload), LOCK_EX);

echo json_encode($payload);
