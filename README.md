
AUTH_KV
DB (必须全大写)
Variable name: TG_BOT_TOKEN | Value: 您的 Telegram Bot Token

Variable name: ADMIN_CHAT_ID | Value: 您接收验证码的 TG 数字ID
🛠️ 接下来您需要在 Cloudflare D1 中执行的步骤：

由于新增了账号功能，您需要在您的 Cloudflare D1 数据库中建立一个新的 accounts 表。请在本地终端运行或进入 Cloudflare 面板执行以下 SQL 创建语句：



```bash
CREATE TABLE accounts (id TEXT PRIMARY KEY, email TEXT NOT NULL, password TEXT NOT NULL, twoFactor TEXT, cost REAL, status TEXT DEFAULT 'alive', date TEXT NOT NULL, description TEXT);
```
  
