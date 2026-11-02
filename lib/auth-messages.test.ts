import assert from "node:assert/strict";
import { test } from "node:test";
import { LINK_SENT_MESSAGE, loginErrorMessage } from "./auth-messages.ts";

test("link sent copy is Polish", () => {
  assert.match(LINK_SENT_MESSAGE, /Sprawdź skrzynkę/);
});

test("signups disabled is explained without a raw English error", () => {
  const message = loginErrorMessage("Signups not allowed for otp");
  assert.match(message, /Rejestracja nowych kont jest wyłączona/);
  assert.doesNotMatch(message, /Signups not allowed/);
});

test("a disabled Google provider is explained in Polish", () => {
  assert.match(
    loginErrorMessage("Unsupported provider: provider is not enabled"),
    /Google nie jest jeszcze włączone/,
  );
  assert.match(
    loginErrorMessage("Provider (google) is not enabled"),
    /Google nie jest jeszcze włączone/,
  );
});

test("other auth failures stay generic and Polish", () => {
  const message = loginErrorMessage("something unexpected");
  assert.match(message, /Nie udało się zalogować/);
});
