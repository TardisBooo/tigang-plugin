# Changelog

## Unreleased

- 为 DSH headless 提供原生安装。在回合结束时通过 stderr 显示提醒，并将 NDJSON 事件流保留在 stdout。

## 1.3.0

- Codex CLI 可通过 marketplace 安装。它和 Claude Code 共用检测与提醒钩子。
- 在自定义状态目录下，Claude Code 的统计命令读取该目录内的 `stats.json`。
- 宿主报告 Git 命令退出非零时，统计会跳过这次操作。

## 1.2.0 — 2026-09-09

多 agent 支持与开源发布。

- 新增 **Codex CLI** 适配器:Codex 0.152+ 的 hooks 与 Claude Code 的 payload 完全兼容,
  因此零新代码 —— 直接复用 `hooks/tigang_hook.js`,只在 `~/.codex/config.toml` 注册。
  为什么:用户并不只活在一个 agent 里;同一份核心应当覆盖所有终端,而不是每个工具各养一套逻辑。
- 新增 **pi** 适配器(@earendil-works/pi-coding-agent 扩展):`tool_result` 检测 +
  `agent_settled` 时 `ctx.ui.notify` 渲染,与 Stop-hook systemMessage 同构,零 token。
- 新增 **dsh** 适配器:基于社区插件 dsh-plugin-hooks 的 `post-tool` 事件调外部脚本。
- 四个 agent 共享同一份统计(`~/.claude/tigang-reminder/stats.json`):
  健康是跨工具累计的,提醒次数也应该是。
- 提醒文案多语言:自动识别系统语言(`LC_ALL`/`LANG`/ICU locale),支持
  zh / zh-TW / en / ja / ko / es,`TIGANG_LANG` 可强制覆盖,未覆盖语言回退英文。
  为什么:开源后的用户不再只有中文环境,提醒要用用户看得懂的语言。
- 源码移除全部个人绝对路径(AgentLint S7);pi 扩展改为"同目录部署优先,
  `TIGANG_SKILL_DIR` 可覆盖"。
- 开源整理:LICENSE(MIT)/ INSTALL / CONTRIBUTING / SECURITY / CLAUDE.md /
  单元测试与 `npm test` / .gitignore。
- 实测:Claude Code 2.1.258、Codex 0.152.1(gpt-5.6-sol)、pi 0.74.2 均通过真实
  commit 验证;dsh 适配器通过模拟 stdin 载荷的单元测试。

## 1.1.0 — 2026-09-09

提醒改为"追加在 AI 回答末尾"。

- 检测阶段(PostToolUse)不再产生任何 stdout;新增 Stop hook,回答结束时以
  `systemMessage` 渲染提醒。为什么:让模型"说出"提醒需要注入上下文 + 生成文字,
  每次 commit 都在烧 token;显示层追加效果相同,却完全绕过模型。
- 新增 `pending.json` 暂存"待提醒"(30 分钟 TTL,同回合多次触发合并为一条)。
- 修复误报:命令串里引号内提到的 `git push`(如 `git log --grep "push"`)不再触发 ——
  先剥离引号内内容,再分段匹配。

## 1.0.0 — 2026-09-09

初次发布。

- Claude Code 插件:PostToolUse hook(matcher: Bash)检测 git commit/push,
  终端提醒 + 累计统计;`/tigang-stats` 查看统计。
  为什么用 hook 而不是 skill:hook 由终端在工具调用时确定性执行,不依赖模型自觉,
  才能保证"每次 commit 一定提醒"。
