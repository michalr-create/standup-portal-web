import type { CSSProperties, ImgHTMLAttributes, SyntheticEvent } from "react";

type SizedImageProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  style?: CSSProperties;
  /**
   * LCP hero. Eager load and high fetch priority.
   * List, grid, and strip images leave this off and stay lazy.
   */
  priority?: boolean;
  /** Set false for an image that is on screen as soon as it mounts. */
  lazy?: boolean;
  /** Empty alt plus aria-hidden. The picture is not content. */
  decorative?: boolean;
  onError?: (event: SyntheticEvent<HTMLImageElement>) => void;
};

type ImgProps = ImgHTMLAttributes<HTMLImageElement> & {
  /** React 18.3 passes this lowercase attribute through to the DOM. */
  fetchpriority?: "high" | "low" | "auto";
};

/**
 * Content `<img>` with an explicit box. Classes still decide the painted
 * size (`w-full h-full`, `object-cover`, absolute inset), so this does not
 * change layout. Native `<img>` stays off the Vercel image optimizer.
 */
export default function SizedImage({
  src,
  alt,
  width,
  height,
  className,
  style,
  priority = false,
  lazy = true,
  decorative = false,
  onError,
}: SizedImageProps) {
  const eager = priority || !lazy;
  const props: ImgProps = {
    src,
    alt: decorative ? "" : alt,
    width,
    height,
    className,
    style,
    loading: eager ? "eager" : "lazy",
    decoding: priority ? "auto" : "async",
    onError,
  };
  if (decorative) props["aria-hidden"] = true;
  if (priority) props.fetchpriority = "high";
  return <img {...props} />;
}
