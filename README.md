
AUTH_KV
DB (必须全大写)
Variable name: TG_BOT_TOKEN | Value: 您的 Telegram Bot Token

Variable name: ADMIN_CHAT_ID | Value: 您接收验证码的 TG 数字ID
🛠️ **Cloudflare D1 数据库初始化与更新说明**

在 Cloudflare 面板的 **Workers & Pages -> D1** 中创建数据库后，请进入 **控制台 (Console)** 执行以下完整的 SQL 语句，以创建或更新您的数据表结构：

```sql
-- 1. 创建账号库存表 (如果表已存在则不会重复创建)
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

-- 如果您之前已经创建了 accounts 表但遗漏了 region 字段，请单独执行这句来补充字段：
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
