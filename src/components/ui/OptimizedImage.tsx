import { useState } from "react";

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: string;
}

export function OptimizedImage({ src, alt, fallback = "/placeholder.svg", className, ...props }: OptimizedImageProps) {
  const [error, setError] = useState(false);
  const imgSrc = error ? fallback : src || fallback;

  return (
    <img
      src={imgSrc}
      alt={alt || ""}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setError(true)}
      {...props}
    />
  );
}
