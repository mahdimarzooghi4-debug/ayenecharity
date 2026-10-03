import assert from "node:assert/strict";
import test from "node:test";

import { normalizePublicSettings, PUBLIC_SETTING_KEYS } from "./public-content";

test("public settings only expose the V1 allowlist", () => {
  const result = normalizePublicSettings([
    { key: "center.phone", value: "02100000000" },
    { key: "internal.secret", value: "must-not-leak" },
  ]);

  assert.equal(result["center.phone"], "02100000000");
  assert.equal("internal.secret" in result, false);
});

test("V1 public setting keys include social and contribution information", () => {
  assert.equal(PUBLIC_SETTING_KEYS.includes("social.instagram"), true);
  assert.equal(PUBLIC_SETTING_KEYS.includes("social.bale"), true);
  assert.equal(PUBLIC_SETTING_KEYS.includes("social.telegram"), true);
  assert.equal(PUBLIC_SETTING_KEYS.includes("contribution.cardNumber"), true);
});
