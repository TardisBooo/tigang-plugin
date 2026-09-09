# Codex CLI 适配器(零新代码)

Codex CLI(0.152+)的 hooks 与 Claude Code **payload 完全兼容**
(`tool_input.command`、`tool_response`、`hook_event_name`、`Stop` 事件、
stdout `{"systemMessage": ...}`),因此直接复用 Claude 插件的入口脚本
`hooks/tigang_hook.js`,只需在 Codex 配置里注册两个 hook。

## 安装

在 `~/.codex/config.toml`(Windows:`C:\Users\<user>\.codex\config.toml`)末尾追加:

```toml
# ---- tigang-reminder(提肛提醒)----
[[hooks.PostToolUse]]
matcher = "^Bash$"

[[hooks.PostToolUse.hooks]]
type = "command"
command = 'node <TIGANG_DIR>/hooks/tigang_hook.js detect'
timeout = 15

[[hooks.Stop]]

[[hooks.Stop.hooks]]
type = "command"
command = 'node <TIGANG_DIR>/hooks/tigang_hook.js remind'
timeout = 15
```

`<TIGANG_DIR>` 换成本机仓库路径(Windows 下用正斜杠,如 `D:/code/tigang-plugin`)。

**首次使用**:在交互式 codex 会话里执行 `/hooks`,审查并信任这两个 hook
(非托管 hook 必须信任后才会运行;信任与脚本 hash 绑定,脚本改动后需重新信任)。

## 行为

- `PostToolUse`(matcher `^Bash$`)→ 检测命令里的 `git commit` / `git push`,
  失败输出(`fatal:` / `! [rejected]` 等)不计数;零 stdout,不进模型上下文。
- `Stop`(每轮回答结束)→ 若本轮检测到提交,输出
  `{"systemMessage": "💪 [提肛提醒] ..."}`,由 Codex 终端渲染在回答末尾,
  零 token 消耗。
- 统计与 Claude Code / pi / dsh 共用 `~/.claude/tigang-reminder/stats.json`。

## 注意事项

- Windows 上 Codex 的 agent shell 是 PowerShell,但工具名仍匹配 `Bash`,
  命令可能是 `git commit -m 'x'; git push` 这类语法 —— 核心检测同时支持
  `;`、`&&`、`||`、`|`、换行分隔,单/双引号内容会被剥离后再匹配,不会误报。
- `notify` 配置与 hooks 互不干扰,可并存。
- headless 测试:`codex exec --dangerously-bypass-hook-trust --sandbox danger-full-access "…"`;
  沙箱的 workspace-write 模式会把 `.git/` 设为只读,测 commit 需要上面的 full-access。
- 验证 hook 是否触发:观察统计文件,或输出里的 `hook: PostToolUse Completed` /
  `hook: Stop Completed` 字样,或 `[otel] hooks.run` 指标。
- 卸载:删除上述两个 `[[hooks...]]` 配置块。

## 已实测(2026-09-09)

Codex 0.152.1(Windows,模型 gpt-5.6-sol)headless 执行真实
`git commit --allow-empty`:输出 `hook: PostToolUse Completed`、`hook: Stop Completed`,
共享统计 +1。

注:模型可用性因账号而异(如 ChatGPT 账号会被网关拒绝部分 `gpt-5.1*`/`gpt-5.2*`
型号),与 hook 无关 —— hook 在工具调用层工作,与所用模型无关。
