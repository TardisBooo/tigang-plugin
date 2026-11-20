# dsh 适配器(DeepSeek Harness)

## headless 原生包

在 DSH 0.2.2-rc.1 上使用以下命令。

```bash
dsh plugin --profile headless add github:TardisBooo/tigang-plugin
```

用 `dsh headless --dump-config` 确认 `tigang-reminder` 条目已加载。执行一次 Git 提交或推送后，
headless 在当前回合结束时向 stderr 显示一条提醒。使用 `--json` 时，事件流仍可从 stdout 解析。
安装前，移除同一 profile 中的 Tigang 手工钩子。

卸载命令为 `dsh plugin --profile headless remove tigang-plugin`。

## 手工适配

dsh 的原生插件(Cordis 内核)在进程内运行 `tools/pre-execute`、
`tools/post-execute` 事件;对外部脚本最实用的路径是社区插件:

- **dsh-plugin-hooks** —— Claude 风格的外部脚本 hook,stdin 传一行 JSON:
  `{ "event": "PostToolUse", "toolName": "bash", "args": { "command": "..." },
  "result": { "exitCode": 0, ... } }`,配 `$DSH_HOME/hooks.json`。
- **dsh-hooks**(可选)—— `turn/end` 事件回调,用于把提醒渲染到终端。

## 安装

```bash
# 1. 安装社区 hook 插件(以 web profile 为例)
dsh plugin --profile web add dsh-plugin-hooks
# 按插件文档在 cordis.patch.yml 中 mount 该插件

# 2. 部署 hooks 配置($DSH_HOME 默认 ~/.dsh,或对应 profile 目录)
#    把本目录 hooks.json 的内容合并进去,<TIGANG_DIR> 换成本机仓库路径
```

`hooks.json`(检测,静默、绝不阻塞工具执行):

```json
{
  "hooks": [
    {
      "id": "tigang-detect",
      "event": "post-tool",
      "tools": ["bash", "pwsh"],
      "command": "node <TIGANG_DIR>/adapters/dsh/dsh_detect.js",
      "timeoutMs": 15000,
      "enabled": true
    }
  ]
}
```

若安装了 dsh-hooks,再加一条 `turn/end` 渲染:

```json
{
  "id": "tigang-remind",
  "event": "turn/end",
  "command": "node <TIGANG_DIR>/adapters/dsh/dsh_remind.js",
  "timeoutMs": 5000,
  "enabled": true
}
```

## 行为与限制

- `dsh_detect.js`:检测 `git commit` / `git push`(引号剥离防误报;`exitCode`
  非零或 `isError` 视为失败,不计数),写入共享统计与待提醒;永远 exit 0、无输出。
- `dsh_remind.js`:回合结束时把待提醒以 ANSI 黄色打印到控制终端
  (`/dev/tty`,不可用则 stderr)。
- **限制**:dsh 的 web 模式(`dsh web`,界面在浏览器 127.0.0.1:3080)没有
  控制终端,外部脚本的提醒只能落到 stderr/日志,计数不受影响。要在 web UI 内
  渲染需要写原生 Cordis 插件订阅 `tools/post-execute`(进程内),属于后续增强。
- 统计与 Claude Code / Codex / pi 共用 `~/.claude/tigang-reminder/stats.json`。

## 已完成的本机验证(2026-09-09)

对 `dsh_detect.js` / `dsh_remind.js` 用模拟 stdin 载荷做了单元测试:
普通命令不触发;成功 commit 计数 + 暂存;失败 push(exitCode 1 + `fatal:`)
不计数;remind 消费 pending 输出 ANSI 提醒,再次运行为空。
(dsh 本体未安装,进程内集成待实际安装后验证。)
