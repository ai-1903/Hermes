<?php
/**
 * Hermes 示例页面
 */
$title  = 'Hermes';
$phpVer = PHP_VERSION;
$time   = date('Y-m-d H:i:s');
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($title, ENT_QUOTES, 'UTF-8') ?></title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
                         "Microsoft YaHei", sans-serif;
            background: linear-gradient(135deg, #0f2027, #203a43, #2c5364);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #e8f0f3;
        }
        .card {
            background: rgba(255, 255, 255, 0.06);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 16px;
            padding: 48px 56px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
        }
        h1 {
            font-size: 3rem;
            letter-spacing: 2px;
            background: linear-gradient(90deg, #64b5f6, #4dd0e1);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 12px;
        }
        .badge {
            display: inline-block;
            margin: 8px 4px;
            padding: 6px 16px;
            border-radius: 999px;
            font-size: 0.85rem;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .badge.green { color: #81c784; border-color: #81c78466; }
        .badge.blue  { color: #64b5f6; border-color: #64b5f666; }
        .time { margin-top: 20px; font-size: 0.9rem; opacity: 0.75; }
    </style>
</head>
<body>
    <div class="card">
        <h1><?= htmlspecialchars($title, ENT_QUOTES, 'UTF-8') ?></h1>
        <div>
            <span class="badge green">● Nginx 已运行</span>
            <span class="badge green">● PHP <?= htmlspecialchars($phpVer, ENT_QUOTES, 'UTF-8') ?> 已运行</span>
            <span class="badge blue">端口 9753</span>
        </div>
        <p class="time">服务器时间：<?= htmlspecialchars($time, ENT_QUOTES, 'UTF-8') ?></p>
    </div>
</body>
</html>
