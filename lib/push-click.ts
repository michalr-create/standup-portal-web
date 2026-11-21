export type PushWindow = {
  url: string;
  focused?: boolean;
  canFocus?: boolean;
  canNavigate?: boolean;
};

export function sameNotificationOrigin(url: string, origin: string): boolean {
  try {
    return new URL(url).origin === origin;
  } catch {
    return false;
  }
}

/**
 * A click on a parska notification focuses a window already on that URL.
 * Otherwise it navigates an open parska window (the focused one first).
 * A YouTube URL from an older notification opens a new window and does not
 * navigate the site out from under the user.
 */
export function planNotificationClick(
  clients: readonly PushWindow[],
  target: string,
  origin: string,
): { focusOnly: number | null; navigate: number[]; openWindow: boolean } {
  let absolute: URL;
  try {
    absolute = new URL(target, origin);
  } catch {
    return { focusOnly: null, navigate: [], openWindow: true };
  }
  const parska = clients
    .map((client, index) => ({ client, index }))
    .filter((entry) => sameNotificationOrigin(entry.client.url, origin));
  const exact = parska.find(
    (entry) => entry.client.url === absolute.href && entry.client.canFocus !== false,
  );
  if (exact) return { focusOnly: exact.index, navigate: [], openWindow: false };
  if (absolute.origin !== origin) return { focusOnly: null, navigate: [], openWindow: true };
  const usable = parska.filter(
    (entry) => entry.client.canNavigate !== false && entry.client.canFocus !== false,
  );
  const focused = usable.filter((entry) => entry.client.focused === true);
  const rest = usable.filter((entry) => entry.client.focused !== true);
  return {
    focusOnly: null,
    navigate: [...focused, ...rest].map((entry) => entry.index),
    openWindow: true,
  };
}
