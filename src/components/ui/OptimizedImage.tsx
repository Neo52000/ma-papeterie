import { useState, memo, type ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "onLoad" | "onError"> {
  /** Image source URL */
  src: string;
  /** Alt text (required for a11y) */
  alt: string;
  /** srcSet for responsive images (optional) */
  srcSet?: string;
  /** sizes attribute for responsive images (optional) */
  sizes?: string;
  /** Width hint for aspect-ratio placeholder (prevents CLS) */
  width?: number;
  /** Height hint for aspect-ratio placeholder (prevents CLS) */
  height?: number;
  /** Show a blurred low-res placeholder while loading (default: true for lazy images) */
  blur?: boolean;
  /** Wrapper className */
  wrapperClassName?: string;
}

/**
 * Performance-optimized image component:
 * - Native lazy loading via loading="lazy" (unless overridden)
 * - decoding="async" to avoid blocking the main thread
 * - Fade-in transition on load
 * - Optional blur placeholder to reduce perceived load time
 * - fetchpriority="high" when loading="eager" (LCP images)
 * - Supports srcSet/sizes for responsive images
 */
const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  srcSet,
  sizes,
  width,
  height,
  blur = true,
  loading = "lazy",
  className,
  wrapperClassName,
  ...rest
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const isEager = loading === "eager";

  return (
    <span
      className={cn(
        "inline-block overflow-hidden",
        wrapperClassName,
      )}
      style={
        width && height
          ? { aspectRatio: `${width} / ${height}` }
          : undefined
      }
    >
      {!error ? (
        <img
          src={src}
          alt={alt}
          srcSet={srcSet}
          sizes={sizes}
          width={width}
          height={height}
          loading={loading}
          decoding="async"
          // @ts-expect-error fetchpriority not yet in React types
          fetchpriority={isEager ? "high" : undefined}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={cn(
            "transition-all duration-300",
            blur && !loaded && "scale-105 blur-sm",
            loaded && "scale-100 blur-0",
            className,
          )}
          {...rest}
        />
      ) : (
        <span
          className={cn(
            "flex items-center justify-center bg-muted text-muted-foreground text-xs",
            className,
          )}
          role="img"
          aria-label={alt}
        >
          Image indisponible
        </span>
      )}
    </span>
  );
});

export { OptimizedImage };
export type { OptimizedImageProps };
