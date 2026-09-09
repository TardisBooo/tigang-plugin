# pi 适配器(@earendil-works/pi-coding-agent)

pi 的扩展是 TypeScript 模块,由 jiti 直接加载、进程内运行:
`tigang-reminder.ts` 监听 `tool_result`(检测)与 `agent_settled`(渲染),
用 `ctx.ui.notify` 弹出提醒 —— 纯显示层,零 token。

## 安装(同目录部署,推荐)

```bash
cp adapters/pi/tigang-reminder.ts ~/.pi/agent/extensions/
cp core/tigang_core.js            ~/.pi/agent/extensions/
```

扩展默认加载同目录的 `./tigang_core.js`。

替代方案:只复制 `.ts` 文件,并设环境变量指向仓库本体:

```bash
export TIGANG_SKILL_DIR=/path/to/tigang-plugin
```

项目级安装(需项目受信任)则放到项目的 `.pi/extensions/` 下,同样两个文件。

## 行为

- `tool_result`:bash 工具(Windows 上是 `powershell` 工具)执行后,检测命令
  里的 `git commit` / `git push`;失败结果(`isError`)不计数。不发任何消息
  进 LLM 上下文,零 token。
- `agent_settled`:agent 回答彻底结束(无重试/压缩/后续消息)时,若有待提醒,
  `ctx.ui.notify(message, "warning")` 在终端弹出 —— 与 Claude Code 的
  Stop-hook systemMessage 同构。
- 统计与 Claude Code / Codex / dsh 共用 `~/.claude/tigang-reminder/stats.json`。
- `-p`(print)/ json 模式没有 UI(`ctx.hasUI === false`),提醒静默跳过,计数仍生效。
- 加载失败(找不到 core)时扩展整体静默停用,绝不影响 pi。

## 已实测(2026-09-09)

pi 0.74.2(Windows,自定义 anthropic-messages 兼容网关)真实执行
`git commit --allow-empty`:提交成功(`182ae2a`),共享统计 +1;
本次在 `-p` 模式下运行,notify 按设计静默跳过(无 UI)。
