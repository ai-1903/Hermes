# Hermes

> 简约、高效的浏览器端网络工具集。在线检测、Whois 查询、公网 IP 定位、色彩转换、安全检测，全部在浏览器本地完成。

Hermes 是一套部署于 Docker 的 PHP 工具站，核心工具均以**纯前端**方式在浏览器本地运行，不上传数据、不依赖第三方后端，注重隐私与速度。

## ✨ 功能

### 网络检测
| 工具 | 说明 |
|---|---|
| Online Test | 域名 / IP 在线连通性检测 |
| Hawkeye | Whois 域名信息查询（RDAP） |
| 天隼 | 公网 IP 与归属、运营商识别 |

### Aegis 安全检测
| 工具 | 说明 |
|---|---|
| 智能检测 | 设备 IP / 连接安全 / 数据安全综合评分报告（可导出图片） |
| 连接安全检测 | 代理 / Tor-VPN / DNS 泄漏 / 加密 DNS 评估 |
| 数据安全检测 | 中间人劫持（TLS 指纹）+ 网络环境 + 内网稳定性（多次测量） |

### 实用工具
| 工具 | 说明 |
|---|---|
| Coder | 文本 / base64 / UTF-8 / Unicode / URL 编解码，支持手动指定输入输出类型 |
| 伊里斯桥 | 颜色板：RGBA / HEX / OKLCH / CMYK 双向转换，可拖拽调色盘 |
| Astraea | 文件 MD5 / SHA-256 哈希计算（浏览器本地） |

## 🧩 技术栈

- **后端**：PHP 8.3 + Nginx（Docker 容器编排）
- **前端**：原生 HTML / CSS / JavaScript（无框架）
- **图标**：Iconify（fluent 线性图标集）
- **架构**：MVC 分层——`view` 只做展示、`system` 只做逻辑、`data` 只做数据、`resources` 存放独立 CSS / JS

## 🚀 快速开始

### Docker 部署

```bash
docker compose up -d
```

启动后访问 `http://localhost:9753`。

### 目录结构

```
www/
├── index.php              # 首页（介绍落地页）
├── view/                  # 视图模型（header / footer / 公共片段）
├── system/                # 逻辑运算（App 核心类）
├── data/                  # 站点配置与 JSON 数据
└── resources/
    ├── css/               # 全部样式（按页面 / 组件分类）
    └── js/                # 全部脚本（按页面 / 组件分类）
```

## 🔒 隐私说明

- 所有工具（编解码、哈希、色彩转换、大部分网络检测）均在**浏览器本地**完成
- 少量检测（如 TLS 指纹比对）通过自有服务端中转，服务端带缓存与节流，不存储用户数据

## 📄 License

© iCerya. 保留所有权利。
