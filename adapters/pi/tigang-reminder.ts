/**
 * 提肛提醒 — pi 扩展(@earendil-works/pi-coding-agent)
 *
 * 安装(同目录部署,推荐):
 *   cp adapters/pi/tigang-reminder.ts ~/.pi/agent/extensions/
 *   cp hooks/tigang_core.js          ~/.pi/agent/extensions/
 * 或只复制本文件,并设 TIGANG_SKILL_DIR 指向仓库根目录。
 *
 * 机制(与 Claude Code 插件同构,共享同一份统计):
 *   tool_result  → 检测 bash/powershell 工具里的 git commit/push(含防误报),
 *                  计数并暂存"待提醒",不进入 LLM 上下文,零 token
 *   agent_settled→ agent 回答彻底结束(无重试/压缩/后续消息)时,
 *                  用 ctx.ui.notify 在终端弹出提醒(纯显示层,零 token)
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

interface TigangCore {
  detect(command: string, responseText: string): boolean;
  takePendingMessage(): string | null;
}

function loadCore(): TigangCore | null {
  try {
    // jiti 环境下 require 可用,相对路径相对本文件解析;
    // 失败则整个扩展静默停用,绝不影响 pi
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const req = require as any;
    const root = process.env.TIGANG_SKILL_DIR;
    if (root) return req(`${root}/core/tigang_core.js`) as TigangCore;
    return req("./tigang_core.js") as TigangCore;
  } catch {
    return null;
  }
}

/** pi 的 bash/powershell 结果 content 可能是字符串或内容块数组 */
function resultText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return content.map((b: any) => (b && typeof b.text === "string" ? b.text : "")).join("\n");
  }
  try {
    return JSON.stringify(content ?? {});
  } catch {
    return "";
  }
}

export default function (pi: ExtensionAPI) {
  const core = loadCore();
  if (!core) return; // 找不到核心模块时整个扩展不生效

  pi.on("tool_result", async (event) => {
    try {
      // Windows 上 pi 用 powershell 工具,其他平台用 bash
      if (event.toolName !== "bash" && event.toolName !== "powershell" && event.toolName !== "pwsh") return;
      const command = String(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((event.input as any) || {}).command || ""
      );
      if (!command) return;
      if (event.isError === true) return; // 命令失败,不提醒
      core.detect(command, resultText(event.content));
    } catch {
      /* 静默 */
    }
  });

  pi.on("agent_settled", async (_event, ctx) => {
    try {
      const message = core.takePendingMessage();
      if (message && ctx.hasUI) ctx.ui.notify(message, "warning");
    } catch {
      /* 静默 */
    }
  });
}
