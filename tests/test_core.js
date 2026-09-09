#!/usr/bin/env node
/**
 * 提肛提醒 — 单元测试(零依赖)
 * 运行:npm test 或 node tests/test_core.js
 *
 * 状态目录重定向到临时目录(TIGANG_STATE_DIR),不污染真实统计。
 */
"use strict";

process.env.TIGANG_STATE_DIR = require("fs").mkdtempSync(
  require("path").join(require("os").tmpdir(), "tigang-test-")
);
process.env.TIGANG_LANG = "zh"; // 固定语言,让断言与机器系统语言无关

const assert = require("assert");
const core = require("../core/tigang_core");

let passed = 0;
const failures = [];

function t(name, fn) {
  try {
    fn();
    passed++;
    console.log("  ✓ " + name);
  } catch (e) {
    failures.push({ name, error: e });
    console.error("  ✗ " + name + "\n    " + e.message);
  }
}

console.log("\ndetectActions — 应当触发:");
t("git commit", () => {
  assert.deepStrictEqual(core.detectActions("git commit -m 'x'"), { commit: true, push: false });
});
t("git push", () => {
  assert.deepStrictEqual(core.detectActions("git push"), { commit: false, push: true });
});
t("cd x && git -C sub push origin main", () => {
  assert.deepStrictEqual(core.detectActions("cd /tmp/x && git -C sub push origin main"), {
    commit: false,
    push: true,
  });
});
t("git add . && git commit -m a && git push(同串双触发)", () => {
  assert.deepStrictEqual(core.detectActions("git add . && git commit -m a && git push"), {
    commit: true,
    push: true,
  });
});
t("FOO=1 git --no-pager commit(环境变量+全局选项)", () => {
  assert.ok(core.detectActions("FOO=1 git --no-pager commit").commit);
});
t("git commit -m \"消息里写着 push\" 不误判为 push", () => {
  assert.deepStrictEqual(core.detectActions('git commit -m "please push it"'), {
    commit: true,
    push: false,
  });
});

console.log("\ndetectActions — 不应触发:");
t("git log", () => {
  assert.deepStrictEqual(core.detectActions("git log --oneline"), { commit: false, push: false });
});
t("git log --grep commit(grep 参数里的关键词)", () => {
  assert.deepStrictEqual(core.detectActions("git log --grep commit"), {
    commit: false,
    push: false,
  });
});
t("git status / git show", () => {
  assert.deepStrictEqual(core.detectActions("git status; git show HEAD"), {
    commit: false,
    push: false,
  });
});
t("echo \"git push\" | tee log(引号内提到 git push)", () => {
  assert.deepStrictEqual(core.detectActions('echo "git push" | tee log'), {
    commit: false,
    push: false,
  });
});
t("普通命令", () => {
  assert.deepStrictEqual(core.detectActions("npm test"), { commit: false, push: false });
});

console.log("\nshouldSkip — 无效操作过滤:");
t("nothing to commit → skip", () => {
  assert.ok(core.shouldSkip("On branch main\nnothing to commit, working tree clean"));
});
t("push rejected → skip", () => {
  assert.ok(core.shouldSkip(" ! [rejected] main -> main (fetch first)"));
});
t("fatal → skip", () => {
  assert.ok(core.shouldSkip("fatal: not a git repository"));
});
t("正常输出 → 不跳过", () => {
  assert.ok(!core.shouldSkip("[main 1a2b3c4] fix: typo\n 1 file changed"));
});

console.log("\ndetect — 计数 + pending 生命周期:");
t("成功 commit:detect 返回 true,统计 total/commit 各 +1", () => {
  assert.strictEqual(core.detect("git commit -m 'x'", "[main 1a2b3c4] fix: typo"), true);
  const s = JSON.parse(require("fs").readFileSync(core.STATS_FILE, "utf8"));
  assert.strictEqual(s.total, 1);
  assert.strictEqual(s.commit, 1);
  assert.strictEqual(s.todayCount, 1);
});
t("无效 commit(nothing to commit):不计数", () => {
  assert.strictEqual(core.detect("git commit -m 'x'", "nothing to commit, working tree clean"), false);
  const s = JSON.parse(require("fs").readFileSync(core.STATS_FILE, "utf8"));
  assert.strictEqual(s.total, 1);
});
t("takePendingMessage:返回文案并消费,二次为 null", () => {
  const msg = core.takePendingMessage();
  assert.ok(msg && msg.includes("提肛提醒") && msg.includes("git commit"));
  assert.strictEqual(core.takePendingMessage(), null);
});
t("buildMessage:commit+push 双触发文案", () => {
  const msg = core.buildMessage({ commit: true, push: true }, { todayCount: 3, total: 9 });
  assert.ok(msg.includes("commit + push"));
  assert.ok(msg.includes("今日第 3 次") && msg.includes("累计第 9 次"));
});

console.log("\ni18n — 提醒语言适配:");
t("pickLang:zh_CN.UTF-8 → zh(简体)", () => {
  assert.strictEqual(core.pickLang("zh_CN.UTF-8"), "zh");
});
t("pickLang:zh-TW / zh_Hant → zh-TW(繁体)", () => {
  assert.strictEqual(core.pickLang("zh-TW"), "zh-TW");
  assert.strictEqual(core.pickLang("zh_Hant"), "zh-TW");
});
t("pickLang:en_US / ja_JP.eucJP / ko-KR / es_ES → 对应语言", () => {
  assert.strictEqual(core.pickLang("en_US"), "en");
  assert.strictEqual(core.pickLang("ja_JP.eucJP"), "ja");
  assert.strictEqual(core.pickLang("ko-KR"), "ko");
  assert.strictEqual(core.pickLang("es_ES"), "es");
});
t("pickLang:未覆盖语言(fr-FR)与空值 → null(回退英文)", () => {
  assert.strictEqual(core.pickLang("fr-FR"), null);
  assert.strictEqual(core.pickLang(""), null);
});
t("TIGANG_LANG=en:文案为英文", () => {
  process.env.TIGANG_LANG = "en";
  const msg = core.buildMessage({ commit: false, push: true }, { todayCount: 2, total: 7 });
  assert.ok(msg.includes("Kegel break") && msg.includes("git push"));
  process.env.TIGANG_LANG = "zh";
});
t("TIGANG_LANG=ja:文案为日文(端到端走 pending)", () => {
  core.detect("git push", "To github.com:example/repo.git");
  process.env.TIGANG_LANG = "ja";
  const msg = core.takePendingMessage();
  assert.ok(msg.includes("骨盤底トレーニング"));
  process.env.TIGANG_LANG = "zh";
});
t("未设置 TIGANG_LANG:detectLang 返回目录中的某种语言", () => {
  delete process.env.TIGANG_LANG;
  assert.ok(["zh", "zh-TW", "en", "ja", "ko", "es"].includes(core.detectLang()));
  process.env.TIGANG_LANG = "zh";
});

console.log(`\n结果:${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.error(`\nFAIL: ${f.name}\n${f.error.stack}`);
  process.exit(1);
}
process.exit(0);
