# tigang-plugin

提肛提醒:git commit / push 触发的终端健康提醒插件,支持 Claude Code、
Codex CLI、pi、dsh,四个 agent 共享同一份统计。

## 常用命令

- 跑测试:`npm test`(零依赖,node >= 18,< 5 秒;自动把状态目录重定向到临时目录)

## 目录

- `core/tigang_core.js` — 共享核心(检测正则、统计、pending、文案)。所有适配器复用,不要在适配器里复制逻辑。
- `hooks/` — Claude Code 插件入口(hooks.json 注册 PostToolUse + Stop,tigang_hook.js 是 detect/remind 双模式入口)。
- `adapters/{codex,dsh,pi}/` — 其他 agent 的接入层与安装说明。
- `commands/tigang-stats.md` — `/tigang-stats` 查统计。
- `tests/test_core.js` — 单元测试。

## 三条不变量

1. 检测阶段(PostToolUse / tool_result)绝不产生 stdout:输出会进入模型上下文,烧 token。
2. 任何异常静默 exit 0:hook 失败不能阻塞 git 或会话。
3. 不硬编码个人绝对路径:用相对 require、`$CLAUDE_PLUGIN_ROOT` 或环境变量。

## 新增 agent 适配器

只需两个事件:工具执行后 → `core.detect(command, outputText)`;回合结束 →
`core.takePendingMessage()` 并渲染。渲染通道必须纯显示层,不进模型上下文。
改完记得补 README 与 INSTALL.md,并跑 `npm test`。

## 版本

改动后同步三处版本号(package.json / .claude-plugin/plugin.json / marketplace.json),
CHANGELOG.md 写"为什么"。
