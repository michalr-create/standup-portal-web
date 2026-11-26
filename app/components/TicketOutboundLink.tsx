"use client";

import type { CSSProperties, ReactNode } from "react";
import { trackParska } from "@/lib/analytics";
import { withTicketUtm, type AnalyticsTicketProvider, type TicketPlacement } from "@/lib/ticket-utm";

type Props = {
  href: string;
  eventId: number;
  provider: AnalyticsTicketProvider;
  city: string;
  comedian: string;
  priceFrom: number | null;
  currency: string;
  placement: TicketPlacement;
  isPrimary: boolean;
  status: "on_sale" | "sold_out";
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

export default function TicketOutboundLink({
  href,
  eventId,
  provider,
  city,
  comedian,
  priceFrom,
  currency,
  placement,
  isPrimary,
  status,
  className,
  style,
  children,
}: Props) {
  const outbound = withTicketUtm(href, { placement, eventId });
  const track = () => {
    trackParska("kup_bilet", {
      event_id: eventId,
      provider,
      city,
      comedian,
      price_from: priceFrom,
      currency,
      placement,
      is_primary: isPrimary,
      status,
    });
  };
  return (
    <a
      href={outbound}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      style={style}
      onPointerDown={track}
      onClick={track}
    >
      {children}
    </a>
  );
}
