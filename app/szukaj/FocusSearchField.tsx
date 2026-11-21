"use client";

import { useEffect } from "react";

const TRAP_ID = "header-search-keyboard-trap";

export default function FocusSearchField() {
  useEffect(() => {
    const input = document.getElementById("szukaj-q");
    if (input instanceof HTMLInputElement) input.focus();
    document.getElementById(TRAP_ID)?.remove();
  }, []);
  return null;
}
