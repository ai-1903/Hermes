<?php
/**
 * tls-check.php — TLS 证书指纹检测中转接口（数据 / 交换）
 *
 * 分层：数据交换入口（供前端 fetch 调用，返回 JSON）
 * 职责：服务器侧与目标域名建立 TLS 连接，抓取对端证书，计算 SHA-256
 *       指纹，并与基线库（data/json/tls-fingerprints.json）比对，
 *       判断是否存在中间人劫持 / 私签证书。
 *       注意：verify_peer 关闭（依赖指纹比对），以识别即使「操作系统信任
 *       但非官方」的证书（如公司 DPI 中间人），这是指纹法的目的。
 *
 * 性能约束（自有服务端低频，与 dns-lookup.php 一致）：
 *   - 服务端文件缓存（默认 6 小时 TTL），同一域名不重复连接
 *   - 前端配合 localStorage 缓存 + 新网络环境重新请求 + 30 分钟最小周期
 *
 * 用法：tls-check.php?host=www.baidu.com
 * 返回：{ host, fingerprint, issuer, subject_cn, tls_version,
 *         trusted_match, cache_hit, error }
 *   trusted_match: true=与基线一致 / false=不一致(疑似劫持) / null=无基线
 */
declare(strict_types=1);

$host = $_GET['host'] ?? '';
$host = strtolower(trim($host));

/* 仅允许合法域名，防止注入 */
if (!preg_match('/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/', $host)) {
    header('Content-Type: application/json');
    echo json_encode(['host' => $host, 'error' => 'invalid_host', 'cache_hit' => false]);
    exit;
}

header('Content-Type: application/json');

$cacheDir = __DIR__ . '/data/cache';
if (!is_dir($cacheDir)) {
    @mkdir($cacheDir, 0775, true);
}
$cacheKey = 'tls_' . md5($host);
$cacheFile = $cacheDir . '/' . $cacheKey . '.json';
$cacheTtl = 6 * 3600;   // 缓存 6 小时

/* 命中缓存则直接返回 */
if (is_file($cacheFile) && (time() - filemtime($cacheFile)) < $cacheTtl) {
    $cached = json_decode((string) file_get_contents($cacheFile), true);
    if (is_array($cached) && !empty($cached['fingerprint'])) {
        $cached['cache_hit'] = true;
        echo json_encode($cached);
        exit;
    }
}

/* 连接 TLS，抓取对端证书（verify_peer 关闭，依靠指纹比对） */
$context = stream_context_create([
    'ssl' => [
        'capture_peer_cert' => true,
        'verify_peer' => false,
        'verify_peer_name' => false,
        'allow_self_signed' => true,
    ],
]);
$client = @stream_socket_client("ssl://{$host}:443", $errno, $errstr, 20, STREAM_CLIENT_CONNECT, $context);

if (!$client) {
    echo json_encode([
        'host' => $host,
        'fingerprint' => '',
        'issuer' => '',
        'subject_cn' => '',
        'tls_version' => '',
        'trusted_match' => false,
        'error' => 'connect_failed',
        'msg' => $errstr,
        'cache_hit' => false,
    ]);
    exit;
}

$params = stream_context_get_params($client);
$cert = $params['options']['ssl']['peer_certificate'] ?? null;

if (!$cert) {
    echo json_encode([
        'host' => $host, 'fingerprint' => '', 'issuer' => '',
        'subject_cn' => '', 'tls_version' => '', 'trusted_match' => false,
        'error' => 'no_cert', 'cache_hit' => false,
    ]);
    fclose($client);
    exit;
}

$fingerprint = openssl_x509_fingerprint($cert, 'sha256');
$parsed = openssl_x509_parse($cert);
$issuer = $parsed['issuer']['CN'] ?? '';
$subject = $parsed['subject']['CN'] ?? '';
$meta = stream_get_meta_data($client);
$tlsVersion = $meta['crypto']['protocol'] ?? '';
fclose($client);

/* 与基线库比对 */
$baselineRaw = @file_get_contents(__DIR__ . '/data/json/tls-fingerprints.json');
$baseline = $baselineRaw ? json_decode($baselineRaw, true) : null;
$trusted = ($baseline['fingerprints'][$host] ?? null);
$trustedMatch = $trusted ? ($trusted === $fingerprint) : null;

$payload = [
    'host' => $host,
    'fingerprint' => $fingerprint,
    'issuer' => $issuer,
    'subject_cn' => $subject,
    'tls_version' => $tlsVersion,
    'trusted_match' => $trustedMatch,
    'server_time' => time(),
    'cache_hit' => false,
];

/* 仅成功获取指纹时缓存 */
@file_put_contents($cacheFile, json_encode($payload), LOCK_EX);

echo json_encode($payload);
