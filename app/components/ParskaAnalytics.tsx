"use client";

import { Analytics } from "@vercel/analytics/next";
import { analyticsBeforeSend } from "@/lib/analytics";

export default function ParskaAnalytics() {
  return <Analytics beforeSend={analyticsBeforeSend} />;
}
