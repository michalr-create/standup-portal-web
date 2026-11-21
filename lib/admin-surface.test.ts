import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  ADMIN_NAV_LABEL,
  EDIT_MATERIAL_LABEL,
  FEATURE_ADD_LABEL,
  FEATURE_REMOVE_LABEL,
  featuredActionLabel,
  materialEditPath,
  showAdminNav,
} from "./admin-surface.ts";

function source(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("admin chrome is hidden unless is_admin is true", () => {
  assert.equal(showAdminNav(false), false);
  assert.equal(showAdminNav(true), true);
  assert.equal(ADMIN_NAV_LABEL, "Admin");
});

test("featured label follows the current flag and edit points at the material page", () => {
  assert.equal(featuredActionLabel(false), FEATURE_ADD_LABEL);
  assert.equal(featuredActionLabel(true), FEATURE_REMOVE_LABEL);
  assert.equal(FEATURE_ADD_LABEL, "Dodaj do polecanych");
  assert.equal(FEATURE_REMOVE_LABEL, "Usuń z polecanych");
  assert.equal(EDIT_MATERIAL_LABEL, "Edytuj");
  assert.equal(materialEditPath(42), "/admin/material/42");
  assert.throws(() => materialEditPath(0));
});

test("the public header and drawer add a separate Admin link without reading cookies", () => {
  const layout = source("app/layout.tsx");
  const drawer = source("app/components/MobileDrawer.tsx");
  const link = source("app/components/AdminNavLink.tsx");

  assert.match(layout, /<AdminNavLink \/>/);
  assert.match(layout, /<AuthStatus \/>/);
  assert.match(layout, /<AdminModeProvider>/);
  assert.doesNotMatch(layout, /cookies\(/);
  assert.doesNotMatch(layout, /headers\(/);
  assert.match(drawer, /<AdminNavLink variant="drawer"/);
  assert.match(link, /showAdminNav/);
  assert.match(link, /href="\/admin"/);
  assert.match(link, /hidden lg:inline-flex/);
  assert.doesNotMatch(source("app/components/AuthStatus.tsx"), /\/admin/);
});

test("cards and the player expose feature and edit only through the admin actions", () => {
  for (const file of [
    "app/components/ItemsBrowser.tsx",
    "app/components/ScrollRow.tsx",
    "app/components/VideoModal.tsx",
    "app/ulubione/page.tsx",
  ]) {
    assert.match(source(file), /<AdminMaterialActions/);
  }
  const actions = source("app/components/AdminMaterialActions.tsx");
  assert.match(actions, /toggleFeatured/);
  assert.match(actions, /featuredActionLabel/);
  assert.match(actions, /materialEditPath/);
  assert.match(actions, /if \(!isAdmin\) return null/);
  assert.doesNotMatch(actions, /featuredIdsToClear|SUPABASE_SERVICE_KEY|supabase-admin/);
});

test("material writes check is_admin, use the service key, and revalidate", () => {
  const writes = source("app/admin/material/actions.ts");
  const featured = source("app/admin/actions.ts");
  const viewer = source("app/admin/viewer-actions.ts");

  assert.match(writes, /await requireAuth\(\)/);
  assert.match(writes, /getAdminSupabase/);
  assert.match(writes, /revalidatePath\("\/", "layout"\)/);
  assert.match(writes, /revalidatePath\("\/admin", "layout"\)/);
  assert.match(writes, /resolvePersonTagPlan/);
  assert.doesNotMatch(writes, /create policy|grant select|getBrowserSupabase/i);

  assert.match(viewer, /await requireAuth\(\)/);
  assert.match(viewer, /is_featured/);
  assert.match(featured, /export async function toggleFeatured/);
  assert.match(featured, /featuredIdsToClear/);
  assert.match(featured, /HOME_FEATURED_LIMIT/);

  for (const file of [
    "app/components/AdminMode.tsx",
    "app/components/AdminNavLink.tsx",
    "app/components/AdminMaterialActions.tsx",
    "app/admin/material/MaterialEditor.tsx",
  ]) {
    assert.doesNotMatch(source(file), /supabase-admin|SUPABASE_SERVICE_KEY/);
  }
});

test("the editor page is behind the admin layout and uses the combobox", () => {
  const page = source("app/admin/material/[id]/page.tsx");
  const editor = source("app/admin/material/MaterialEditor.tsx");
  assert.match(page, /getMaterialEditor/);
  assert.match(page, /notFound\(\)/);
  assert.match(editor, /OptionCombobox/);
  assert.match(editor, /updateMaterial/);
  assert.match(editor, /htmlFor="material-people"/);
  assert.match(editor, /htmlFor="material-category"/);
  assert.match(editor, /htmlFor="material-show"/);
});
