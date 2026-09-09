# INSTALL — 各安装方式的具体影响与卸载

本仓库零依赖、零网络请求。所有"副作用"仅限下表列出的本地文件。

## 副作用总览

| 安装方式 | 写入/修改的文件 | 运行时产生的数据 |
| --- | --- | --- |
| Claude Code 插件 | `~/.claude/` 下的插件注册与缓存 | `~/.claude/tigang-reminder/stats.json`、`pending.json` |
| Codex CLI | `~/.codex/config.toml`(追加两个 hook 块) | 同上(共享) |
| pi | `~/.pi/agent/extensions/` 两个文件 | 同上(共享) |
| dsh | `$DSH_HOME/hooks.json` 合并 + 社区插件 | 同上(共享) |

## Claude Code

```bash
claude plugin marketplace add /path/to/tigang-plugin
claude plugin install tigang-reminder@tigang
```

- hook 通过 `$CLAUDE_PLUGIN_ROOT` 定位脚本,**不含任何绝对路径**。
- 已运行的旧会话不会热加载新装插件的 hook(已实证);执行 `/reload-plugins --force` 或开新会话。

卸载:

```bash
claude plugin uninstall tigang-reminder@tigang
claude plugin marketplace remove tigang
```

## Codex CLI(0.152+)

在 `~/.codex/config.toml`(Windows:`C:\Users\<user>\.codex\config.toml`)末尾追加:

```toml
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

`<TIGANG_DIR>` 换成本机仓库路径(Windows 下用正斜杠)。

- **首次使用**:在交互式 codex 会话里执行 `/hooks`,审查并信任这两个 hook。
  非托管 hook 的信任是 hash 固定的 —— 修改脚本后需要重新信任。
- Windows 上 Codex 的 agent shell 是 PowerShell,但工具名仍匹配 `Bash`;
  命令可能是 `git commit -m 'x'; git push` 语法,核心检测已兼容。

卸载:删除上述两个 `[[hooks...]]` 配置块。

## pi

```bash
cp adapters/pi/tigang-reminder.ts ~/.pi/agent/extensions/
cp core/tigang_core.js ~/.pi/agent/extensions/
```

- 扩展按"同目录的 `./tigang_core.js`"加载核心;若想指向仓库本体,
  设 `TIGANG_SKILL_DIR=/path/to/tigang-plugin` 并只复制 `.ts` 文件即可。
- `-p`(print)/ json 模式没有 UI,提醒静默跳过,计数仍然生效。

卸载:删除上述两个文件。

## dsh

```bash
dsh plugin --profile web add dsh-plugin-hooks
# 按该插件文档在 cordis.patch.yml 中 mount
# 再把 adapters/dsh/hooks.json 的内容合并进 $DSH_HOME/hooks.json(默认 ~/.dsh)
```

`hooks.json` 里的命令路径同样把 `<TIGANG_DIR>` 换成本机仓库路径。

- web 模式(`dsh web`,浏览器界面)没有控制终端,渲染脚本只能落到 stderr/日志 ——
  外部脚本 hook 的固有限制;计数不受影响。

卸载:从 `hooks.json` 移除 `tigang-detect`(及可选的 `tigang-remind`)条目,删除复制的脚本。

## 清除运行时数据

```bash
rm -rf ~/.claude/tigang-reminder        # 统计 + 待提醒(全部 agent 共享)
```

或临时重定向:`TIGANG_STATE_DIR=/tmp/tigang-isolated claude …`

提醒语言默认跟随系统语言(zh / zh-TW / en / ja / ko / es,其余回退英文);
`TIGANG_LANG=en` 可强制指定。
