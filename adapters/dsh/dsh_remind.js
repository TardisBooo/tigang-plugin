#!/usr/bin/env node
/**
 * 提肛提醒 — dsh 适配器(渲染入口)
 * 配合社区插件 dsh-hooks 的 turn/end 事件调用(fire-and-forget)。
 *
 * 行为:若有待提醒,向控制终端(/dev/tty,失败则 stderr)打印一条
 *       ANSI 黄色的提肛提醒。CLI/headless 模式下可见;
 *       web 模式(dsh web)没有控制终端,只能落到 stderr/日志 —— 这是
 *       外部脚本 hook 的固有限制,见 adapters/dsh/README.md。
 */
"use strict";

const fs = require("fs");
const core = require("../../core/tigang_core");

try {
  const message = core.takePendingMessage();
  if (!message) process.exit(0);
  const line = `\x1b[33m${message}\x1b[0m\n`;
  try {
    fs.writeFileSync("/dev/tty", line);
  } catch (_) {
    process.stderr.write(line);
  }
} catch (_) {
  /* 静默 */
}
process.exit(0);
