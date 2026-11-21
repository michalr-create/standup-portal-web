/** Public admin chrome. Visibility is a hint; writes still call is_admin(). */

export const ADMIN_NAV_LABEL = "Admin";
export const EDIT_MATERIAL_LABEL = "Edytuj";
export const FEATURE_ADD_LABEL = "Dodaj do polecanych";
export const FEATURE_REMOVE_LABEL = "Usuń z polecanych";

export function showAdminNav(isAdmin: boolean): boolean {
  return isAdmin === true;
}

export function featuredActionLabel(isFeatured: boolean): string {
  return isFeatured ? FEATURE_REMOVE_LABEL : FEATURE_ADD_LABEL;
}

export function materialEditPath(itemId: number): string {
  if (!Number.isInteger(itemId) || itemId <= 0) {
    throw new Error("Nieprawidłowy materiał.");
  }
  return `/admin/material/${itemId}`;
}
