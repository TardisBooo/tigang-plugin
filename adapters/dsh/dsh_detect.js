#!/usr/bin/env node
/**
 * 提肛提醒 — dsh 适配器(检测入口)
 * 配合社区插件 dsh-plugin-hooks 使用(其 "post-tool" 事件,stdin 收一行 JSON):
 *   { "event": "PostToolUse", "toolName": "bash"|"pwsh",
 *     "args": { "command": "..." }, "result": { "exitCode": 0, ... } }
 *
 * 行为:检测 git commit/push → 计数并暂存待提醒(与 Claude/pi 共享统计)。
 *       永远 exit 0、无输出,绝不影响 dsh 工具执行。
 */
"use strict";

const core = require("../../core/tigang_core");

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  try {
    const e = JSON.parse(raw || "{}");
    const args = e.args || {};
    const command = String(args.command || args.cmd || "");
    if (!command) process.exit(0);

    const r = e.result || {};
    const parts = [r.output, r.stdout, r.stderr, r.error]
      .map((x) => (typeof x === "string" ? x : ""))
      .filter(Boolean);
    // 非零退出码视同失败:拼一个 "fatal:" 让 core 的跳过逻辑过滤掉
    if (r.isError || (typeof r.exitCode === "number" && r.exitCode !== 0)) {
      parts.push("fatal:");
    }
    core.detect(command, parts.join("\n"));
  } catch (_) {
    /* 静默 */
  }
  process.exit(0);
});
