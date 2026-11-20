"use strict";

const core = require("../../hooks/tigang_core");

exports.name = "tigang-reminder";
exports.inject = ["headlessStartup"];

exports.apply = function apply(ctx) {
  const pending = new Map();

  ctx.on("tools/result", (exec, result) => {
    if (exec.name !== "bash" && exec.name !== "pwsh") return;
    const value = result.value;
    if (result.isError || value?.kind !== "foreground" || value.exitCode !== 0) return;

    const actions = core.detectActions(exec.arguments.command);
    if (!actions.commit && !actions.push) return;
    const output = [value.stdout?.text, value.stderr?.text].join("\n");
    if (core.shouldSkip(output)) return;

    const stats = core.bumpStats(actions);
    const previous = pending.get(exec.agent.id);
    pending.set(exec.agent.id, {
      actions: {
        commit: actions.commit || Boolean(previous?.actions.commit),
        push: actions.push || Boolean(previous?.actions.push),
      },
      stats,
    });
  });

  ctx.on("agent/turn-stopping", ({ agent }) => {
    const reminder = pending.get(agent.id);
    if (!reminder) return;
    pending.delete(agent.id);
    process.stderr.write(core.buildMessage(reminder.actions, reminder.stats) + "\n");
  });
};
