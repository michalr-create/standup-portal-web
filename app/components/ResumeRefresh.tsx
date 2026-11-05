"use client";

import { startTransition, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { bindResumeRefresh, type ControlLike } from "@/lib/resume-refresh";

export default function ResumeRefresh() {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const pathnameRef = useRef(pathname);
  const routerRef = useRef(router);
  pathnameRef.current = pathname;
  routerRef.current = router;

  useEffect(() => {
    const doc = document;
    const win = window;
    return bindResumeRefresh({
      document: {
        get visibilityState() {
          return doc.visibilityState;
        },
        addEventListener: (type, listener) => doc.addEventListener(type, listener),
        removeEventListener: (type, listener) => doc.removeEventListener(type, listener),
        querySelector: (selector) => doc.querySelector(selector),
        querySelectorAll: (selector) => doc.querySelectorAll(selector) as Iterable<ControlLike>,
      },
      window: {
        addEventListener: (type, listener) => win.addEventListener(type, listener),
        removeEventListener: (type, listener) => win.removeEventListener(type, listener),
        setInterval: (handler, timeout) => win.setInterval(handler, timeout),
        clearInterval: (id) => win.clearInterval(id as number),
      },
      navigator: {
        get onLine() {
          return navigator.onLine;
        },
      },
      pathname: () => pathnameRef.current,
      now: () => Date.now(),
      refresh: () => {
        startTransition(() => {
          routerRef.current.refresh();
        });
      },
    });
  }, []);

  return null;
}
