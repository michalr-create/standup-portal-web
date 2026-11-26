import SizedImage from "./SizedImage";
import { IMAGE_SIZE } from "@/lib/image-alt";

/**
 * Full poster inside a fixed frame. The sharp copy uses object-contain so
 * ticket-portal art is never cropped. A second, lazy copy of the same URL
 * fills the letterbox: blurred, scaled, and darkened. The browser fetches
 * that URL once. The backdrop stays off the LCP path.
 */
export default function EventPoster({
  src,
  alt,
  priority = false,
}: {
  src: string;
  alt: string;
  /** Foreground only. The backdrop stays lazy and low priority. */
  priority?: boolean;
}) {
  return (
    <>
      <SizedImage
        src={src}
        alt=""
        decorative
        fetchPriority="low"
        width={IMAGE_SIZE.poster.width}
        height={IMAGE_SIZE.poster.height}
        className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover blur-[24px] brightness-50"
      />
      <SizedImage
        src={src}
        alt={alt}
        priority={priority}
        width={IMAGE_SIZE.poster.width}
        height={IMAGE_SIZE.poster.height}
        className="absolute inset-0 h-full w-full object-contain object-center"
      />
    </>
  );
}
