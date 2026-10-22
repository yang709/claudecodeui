# CloudCLI 手机端定制

管理当前部署在 [codex.zxcvdesk.top](https://codex.zxcvdesk.top) 的 CloudCLI 修改。基于上游 `@cloudcli-ai/cloudcli@1.37.5`，保存可读源码、校验过的补丁和可复现构建工具。首次提交是当前可运行版本的基线；之前未使用 Git 的修改不会伪造提交历史。

## GitHub 分支

本目录位于 [yang709/claudecodeui 的 phone-custom 分支](https://github.com/yang709/claudecodeui/tree/phone-custom/phone-customizations)。`main` 保留上游版本；手机端定制目前作为独立覆盖层维护，仍固定原版 npm 1.37.5，并未宣称已移植到上游最新源码。

克隆后先进入 `phone-customizations/`，再运行下文命令。首次基线来自本地提交 `dbafa16`。原机器的发布包位于原工作区；新克隆按下文 npm 下载步骤准备。

## 已管理的功能

- PWA 安装配置、正确尺寸的图标和默认新聊天，记住上次项目与模型提供方。
- 模型选择器只显示已连接的提供方。
- 默认开启点击录音的语音输入；无独立后端时使用浏览器语音识别。
- Settings 下方的 `5h` / `1w` 剩余额度、进度条、各自重置时间与刷新时间，每分钟更新。
- Codex 沙箱内运行，越界请求通过自动审批；额外允许 Documents/Codex 工作区。
- 本地缓存优先显示应用界面，合并启动与模型请求，移除外部字体依赖，预压缩静态资源。

## 目录

| 目录 | 内容 |
|---|---|
| `src/client/` | 语音、侧边栏额度与 Service Worker 的可读源码 |
| `src/server/` | 额度、启动接口、静态文件和 Codex 审批启动器 |
| `patches/` | 原版核心界面及 3 个服务端文件的校验补丁 |
| `config/` | HTML 模板、PWA manifest、上游版本与校验信息 |
| `scripts/` | 构建、测试、部署和运行版本比对 |
| `tests/` | 不需要登录凭据或网络的自动测试 |

核心界面来自上游发布包，原始前端源码不在该 npm 包中，因此相关修改保存为 **17 处带原始文本和 SHA-256 校验的补丁**。构建读取原版文件后应用补丁；未修改的上游依赖不重复提交。构建产物在 `build/`，不纳入 Git。

## 构建与验证

需要 Python 3.9+、Node.js（基线使用 24.19.0）。不需要安装额外 Python/Node 依赖。

当前机器已经保留原版发布包：

```sh
python3 scripts/test.py
python3 scripts/build.py --base-package work/cloudcli/inspect/package
python3 scripts/deploy.py --check
```

新克隆可先取得同一版本的原版 npm 发布包：

```sh
mkdir -p .local/upstream
npm pack @cloudcli-ai/cloudcli@1.37.5 --pack-destination .local
tar -xzf .local/cloudcli-ai-cloudcli-1.37.5.tgz -C .local/upstream
python3 scripts/build.py --base-package .local/upstream/package
```

构建先验证上游文件哈希，再验证补丁结果哈希，并进行 JS 语法检查。所有待部署文件的哈希写入 `build/manifest.json`。

## 修改、部署与回滚

1. 修改 `src/` 或模板，运行测试与构建。
2. 执行 `python3 scripts/deploy.py --check` 查看与安装目录的差异；此命令不写文件、不读取登录状态。
3. 授权部署后执行：

```sh
python3 scripts/deploy.py --apply --restart
```

部署默认目标是当前 Mac 的 CloudCLI 安装包目录，可用 `--root` 指定其他位置。工具只允许写入包内的 `dist/`、`public/`、`dist-server/`；先备份改动文件，以原子方式替换，并在后端健康后切换页面。发生错误会恢复已写入的文件。不会写入账户、数据库或隧道配置。

需要回退某次修改时，切换到之前的 Git 提交或标签，重新构建后部署。运行时文件备份另存于 `CloudCLI-Phone/git-backups/`，不提交到 Git。手机可能需要刷新并重新打开一至两次，让本地缓存更新。

## 不纳入版本管理

`work/`、`outputs/`、安装依赖、构建产物、登录账号/密码、JWT、Cloudflare 隧道令牌、数据库、日志和会话记录均不提交。域名、账号与现有 LaunchAgent 配置仍由当前运行环境管理。本仓库不保存这些环境中的敏感值，也不自动上传远端。

## 上游与许可

上游：[siteboon/claudecodeui](https://github.com/siteboon/claudecodeui)，npm 版本 1.37.5。遵循上游 AGPL-3.0-or-later；原许可文本保存在 [LICENSE](LICENSE)。
