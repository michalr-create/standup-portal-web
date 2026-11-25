import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyLibraryDelta,
  applySlugRenames,
  emptyLibrary,
  mergeLibraries,
  planLibrarySync,
  resolveLibrary,
  sameLibrary,
} from "./library-sync.ts";
import {
  LIBRARY_STORAGE_KEYS,
  clearAccountLibrary,
  memoryStore,
  readLibrary,
  readSyncedUser,
  writeLibrary,
  writeSyncedUser,
} from "./library-storage.ts";

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";

test("stored favorite slugs follow the current slug and ignore unsafe targets", () => {
  const lists = {
    ...emptyLibrary(),
    people: ["ukasz-kowalski", "lukasz-kowalski", "lotek"],
    shows: ["micha-leja-show"],
  };
  const renamed = applySlugRenames(
    lists,
    { "ukasz-kowalski": "lukasz-kowalski" },
    { "micha-leja-show": "michal-leja-show" },
  );
  assert.deepEqual(renamed.people, ["lukasz-kowalski", "lotek"]);
  assert.deepEqual(renamed.shows, ["michal-leja-show"]);
  assert.equal(applySlugRenames(renamed, { "ukasz-kowalski": "lukasz-kowalski" }, {}), renamed);
  const unsafe = applySlugRenames(lists, { "ukasz-kowalski": "../admin" }, {});
  assert.equal(unsafe, lists);
});

test("merge unions local and account lists without duplicates and keeps local order", () => {
  const merged = mergeLibraries(
    {
      people: ["abelard-giza", "abelard-giza", "  Kacper-Rucinski  ", "nie slug!"],
      shows: ["wahanie"],
      watched: [
        "https://youtu.be/aaa",
        "https://youtu.be/aaa",
        "notaurl",
        " https://www.youtube.com/watch?v=bbb ",
      ],
      later: [4, 4, 0, -3, 9],
    },
    {
      people: ["kacper-rucinski", "rafal-pacze"],
      shows: ["wahanie", "dzin-z-komikiem"],
      watched: ["https://youtu.be/ccc", "https://youtu.be/aaa"],
      later: [9, 2],
    },
  );

  assert.deepEqual(merged.people, ["abelard-giza", "kacper-rucinski", "rafal-pacze"]);
  assert.deepEqual(merged.shows, ["wahanie", "dzin-z-komikiem"]);
  assert.deepEqual(merged.watched, [
    "https://youtu.be/aaa",
    "https://www.youtube.com/watch?v=bbb",
    "https://youtu.be/ccc",
  ]);
  assert.deepEqual(merged.later, [4, 9, 2]);
});

test("first login merges, a later login keeps the account, and another account does not inherit the cache", () => {
  const local = {
    people: ["lokalny"],
    shows: ["lokalny-format"],
    watched: ["https://youtu.be/local"],
    later: [1],
  };
  const remote = {
    people: ["konto"],
    shows: ["konto-format"],
    watched: ["https://youtu.be/remote"],
    later: [2],
  };

  const first = planLibrarySync({ userId: USER_A, syncedUserId: null });
  assert.deepEqual(first, { kind: "merge", reason: "first-login" });
  assert.deepEqual(resolveLibrary(first, local, remote), mergeLibraries(local, remote));

  const again = planLibrarySync({ userId: USER_A, syncedUserId: USER_A });
  assert.deepEqual(again, { kind: "account", reason: "already-merged" });
  assert.deepEqual(resolveLibrary(again, local, remote).people, ["konto"]);
  assert.deepEqual(resolveLibrary(again, local, remote).later, [2]);

  const other = planLibrarySync({ userId: USER_B, syncedUserId: USER_A });
  assert.deepEqual(other, { kind: "account", reason: "other-account" });
  assert.deepEqual(resolveLibrary(other, local, remote).people, ["konto"]);

  assert.deepEqual(planLibrarySync({ userId: null, syncedUserId: USER_A }), { kind: "local" });
  assert.deepEqual(resolveLibrary({ kind: "local" }, local, remote).people, ["lokalny"]);
});

test("edits during the request are kept and logged-out leftovers are not copied back onto the account", () => {
  const before = {
    people: ["z-konta", "zostal-lokalnie"],
    shows: [],
    watched: ["https://youtu.be/old"],
    later: [7],
  };
  const remote = {
    people: ["z-konta"],
    shows: ["format"],
    watched: ["https://youtu.be/old"],
    later: [7],
  };
  const after = {
    people: ["z-konta", "zostal-lokalnie", "klikniete"],
    shows: [],
    watched: [],
    later: [7, 8],
  };

  const next = applyLibraryDelta(remote, before, after);
  assert.deepEqual(next.people, ["z-konta", "klikniete"]);
  assert.deepEqual(next.shows, ["format"]);
  assert.deepEqual(next.watched, []);
  assert.deepEqual(next.later, [7, 8]);
  assert.equal(sameLibrary(next, remote), false);
});

test("localStorage round-trip keeps the existing keys and the sync marker", () => {
  const store = memoryStore({
    [LIBRARY_STORAGE_KEYS.people]: JSON.stringify(["Abelard-Giza", "Abelard-Giza", 12]),
    [LIBRARY_STORAGE_KEYS.watched]: JSON.stringify(["https://youtu.be/a", "https://youtu.be/a"]),
  });
  const read = readLibrary(store);
  assert.deepEqual(read.people, ["abelard-giza"]);
  assert.deepEqual(read.watched, ["https://youtu.be/a"]);

  writeLibrary(store, {
    ...emptyLibrary(),
    people: ["rafal-pacze"],
    later: [3, 3],
  });
  assert.equal(store.getItem(LIBRARY_STORAGE_KEYS.people), JSON.stringify(["rafal-pacze"]));
  assert.equal(store.getItem(LIBRARY_STORAGE_KEYS.later), JSON.stringify([3]));
  assert.equal(readSyncedUser(store), null);

  writeSyncedUser(store, USER_A);
  assert.equal(readSyncedUser(store), USER_A);
  writeSyncedUser(store, "not-a-user");
  assert.equal(readSyncedUser(store), USER_A);
});

test("logout clears an account cache and leaves anonymous lists in place", () => {
  const anonymous = memoryStore();
  writeLibrary(anonymous, {
    ...emptyLibrary(),
    people: ["lokalny"],
    watched: ["https://youtu.be/local"],
  });
  assert.equal(clearAccountLibrary(anonymous), false);
  assert.deepEqual(readLibrary(anonymous).people, ["lokalny"]);
  assert.equal(readSyncedUser(anonymous), null);

  const account = memoryStore();
  writeLibrary(account, {
    ...emptyLibrary(),
    people: ["konto"],
    shows: ["konto-format"],
    watched: ["https://youtu.be/remote"],
    later: [2],
  });
  writeSyncedUser(account, USER_A);
  assert.equal(clearAccountLibrary(account), true);
  assert.deepEqual(readLibrary(account), emptyLibrary());
  assert.equal(readSyncedUser(account), null);
  assert.equal(account.getItem(LIBRARY_STORAGE_KEYS.syncedUser), null);
});
