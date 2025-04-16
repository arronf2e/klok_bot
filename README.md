# klok 自动聊天机器人

邀请链接：https://klokapp.ai?referral_code=VECHW2KC

这是一个用于自动完成 klok 平台每日聊天任务的 Node.js 脚本。

## 功能特性
- 自动登录 klok 平台
- 自动完成每日聊天任务
- 支持多账号并发执行
- 支持代理设置
- 定时任务功能（默认每天北京时间早上8点执行）

## 使用说明

### 1. 环境准备
确保已安装 Node.js (建议版本 16+)

### 2. 安装依赖
```bash
npm install
```
### 3. 配置账号信息
在 `private_keys.txt` 文件中配置你的 Coresky 私钥（一行一个）。
```txt
private_key1
private_key2
...
```

在 `proxies.txt` 文件中配置你的 代理信息（一行一个）。
```txt
socks5://127.0.0.1:1080
...
```

在 `messages.txt` 文件中配置你的随机问题（一行一个）。
```txt
who are you?
...
```

新建 `config.json` 文件并写入
```json
{
    "clientKey": ""
}
```

在 `config.yaml` 文件中配置基础配置。
```yaml
base:
  api_base_url: 'https://api1-pp.klokapp.ai/v1' # 不用改
  referral_code: "VECHW2KC"  # 填写你的邀请码

runner:
  thread_count: 1  # 线程池大小，同时跑多少个号
  max_thread_delay: 60  # 最大线程延迟，单位秒

# 定时任务配置
scheduler:
  jobs:
    - name: "chat_daily"
      schedule: "0 9 * * *"  # 每天上午8点
```


### 4. 运行脚本(默认每天早上8点执行，推荐使用pm2启动)
```bash
node main.js # 直接运行
pm2 start main.js # 使用pm2启动
```
