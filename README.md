# 甲骨文财务面板 (Oracle Finance Dashboard)

这是一个基于 React (Vite) + TailwindCSS 开发，后端基于 Cloudflare Pages Functions + D1 数据库 + KV 存储构建的全栈 Serverless 个人财务与账号资产管理面板。

## ✨ 功能特性
- **财务大盘**：收支统计、支出分类图表、月度趋势分析。
- **账号库存管理**：高级账号(包含区域信息、双击复制等)，采用 AES-GCM 端到端数据加密，保证隐私安全。
- **无感安全防御**：通过 Telegram 机器人接收动态验证码登录，支持 IP 与 User-Agent 会话状态保护。
- **完全免费托管**：基于 Cloudflare Pages 体系，零服务器成本。

---

## 🚀 部署指南 (Cloudflare Pages)

此项目可以直接部署到 Cloudflare Pages。在部署前或部署后，您需要在 Cloudflare Dashboard 中完成以下几步核心配置。

### 步骤 1：准备数据库与存储空间
1. 前往 **Workers & Pages -> KV**，创建一个名为 `oracle_finance_auth` 的命名空间（名称可自定义）。
2. 前往 **Workers & Pages -> D1 SQL 数据库**，创建一个名为 `oracle_finance_db` 的数据库。

### 步骤 2：初始化 D1 数据库
进入刚刚创建的 D1 数据库详情页，点击右上角的 **控制台 (Console)**，执行以下 SQL 语句来创建表结构：

```sql
-- 1. 创建账号库存表
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY, 
  email TEXT NOT NULL, 
  password TEXT NOT NULL, 
  twoFactor TEXT, 
  cost REAL DEFAULT 0, 
  status TEXT DEFAULT 'alive', 
  date TEXT NOT NULL, 
  description TEXT,
  region TEXT DEFAULT ''
);

-- 如果是从旧版本升级（没有 region 字段），请单独执行这句：
-- ALTER TABLE accounts ADD COLUMN region TEXT DEFAULT '';

-- 2. 创建财务流水表
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  category TEXT NOT NULL,
  date TEXT NOT NULL,
  description TEXT
);
```

### 步骤 3：配置 Pages 项目的变量与绑定
将您的代码推送并部署到 Cloudflare Pages 后，进入您的 **Pages 项目设置 -> 设置 -> 函数 (Functions)**。

**1. 绑定 KV 命名空间 (KV namespace bindings)**
* 变量名称 (Variable name): `AUTH_KV`  *(⚠️ 必须全大写)*
* KV 命名空间: 选择您在步骤1创建的 KV。

**2. 绑定 D1 数据库 (D1 database bindings)**
* 变量名称 (Variable name): `DB` *(⚠️ 必须全大写)*
* D1 数据库: 选择您在步骤1创建的 D1 数据库。

**3. 配置环境变量 (Environment variables)**
添加以下环境变量（建议将涉及到密钥的变量点击右侧的 **加密/Encrypt** 按钮进行加密隐藏）：

| 变量名称 (Variable name) | 说明 | 示例值 |
| ---------------------- | ---- | ----- |
| `TG_BOT_TOKEN` | 您的 Telegram Bot Token (用于发送验证码) | `123456789:ABCdefGhIJKlmNoPQRstuVWXyz` |
| `ADMIN_CHAT_ID` | 接收验证码的 TG 数字ID | `12345678` |
| `AES_SECRET_KEY` | 用于加密账号敏感信息的 32 位密钥 | `my_super_secret_key_2026_CHANGE_ME` |

*(注：配置完成后，需要 **重新部署 (Retry Deployment)** 一次 Pages 项目，绑定才会生效。)*

---

## 💻 本地开发指南

如果您希望在本地进行开发，并请求您已部署在线上的后端数据，请按如下操作：

1. 在项目根目录创建一个 `.env.local` 文件。
2. 在文件中写入您线上的前端域名（不要以 `/` 结尾）：
   ```env
   VITE_API_TARGET=https://您的线上域名.com
   ```
3. 运行启动命令：
   ```bash
   npm install
   npm run dev
   ```
本地的 Vite 服务器会自动通过代理解决跨域问题，让您像访问本地接口一样访问线上云端的数据。

---

## 🔒 隐私与安全
所有通过该面板保存的敏感信息（账号及密码、两步验证码）在存入 D1 数据库前，都会在 Cloudflare 后端使用您的 `AES_SECRET_KEY` 进行强制的 AES-GCM 加密，只有在拥有密钥的受信任环境下才能解密查阅。请妥善保管您的 `AES_SECRET_KEY`！
