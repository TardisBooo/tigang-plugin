# CONTRIBUTING

欢迎 issue / PR,中英文均可。

## 跑测试

```bash
npm test        # 零依赖,node >= 18,< 5 秒
```

测试会把状态目录重定向到临时目录(`TIGANG_STATE_DIR`),不会污染真实统计。

## 三条不变量(改代码前先读)

1. **检测阶段零 stdout**:`PostToolUse` / `tool_result` 里绝不打印任何内容 ——
   输出会进入模型上下文,烧 token。
2. **任何异常静默 exit 0**:hook 失败不能阻塞 git 操作或 agent 会话。
3. **不硬编码个人绝对路径**:用相对 require、`$CLAUDE_PLUGIN_ROOT` 或环境变量
   (`TIGANG_STATE_DIR` / `TIGANG_SKILL_DIR`)。

## 核心模式:新增一个 agent 适配器只需要两个事件

适配器共用 `hooks/tigang_core.js` 实现检测、统计和提醒:

| 事件 | 做什么 |
| --- | --- |
| 工具执行后(post-tool / tool_result) | `core.detect(command, outputText)` → boolean |
| 回合结束(Stop / turn end / agent_settled) | `core.takePendingMessage()` → 文案或 null,渲染出去 |

渲染通道必须是**纯显示层**(systemMessage / `ctx.ui.notify` / ANSI tty),
不进模型上下文。参考 `adapters/` 下任一实现。

## 提交规范

- conventional commits(`feat:` / `fix:` / `docs:` …),说明"为什么"而不只是"改了什么"。
- 改动后同步三处版本号:`package.json`、`.claude-plugin/plugin.json`、
  `.claude-plugin/marketplace.json`,并在 `CHANGELOG.md` 记录动机。

## 目录速览

```
core/      共享核心(检测正则、统计、pending、文案)
hooks/     Claude Code 插件入口(hooks.json + tigang_hook.js)
adapters/  其他 agent 的接入层(codex / dsh / pi)
commands/  /tigang-stats 斜杠命令
tests/     单元测试
```
