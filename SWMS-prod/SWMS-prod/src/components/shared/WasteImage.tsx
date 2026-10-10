import React, { useState } from 'react';

// Elegant SVG fallback for waste recycling categories
const FALLBACK_SVGS: Record<string, string> = {
  metal: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect width="200" height="150" fill="%23E2E8F0"/><circle cx="100" cy="75" r="45" fill="%23CBD5E1"/><text x="100" y="82" font-family="sans-serif" font-size="28" text-anchor="middle" fill="%23475569">🥫</text></svg>',
  organic: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect width="200" height="150" fill="%23DCFCE7"/><circle cx="100" cy="75" r="45" fill="%23BBF7D0"/><text x="100" y="82" font-family="sans-serif" font-size="28" text-anchor="middle" fill="%23166534">🍃</text></svg>',
  plastic: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect width="200" height="150" fill="%23E0F2FE"/><circle cx="100" cy="75" r="45" fill="%23BAE6FD"/><text x="100" y="82" font-family="sans-serif" font-size="28" text-anchor="middle" fill="%230369A1">🧴</text></svg>',
  paper: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect width="200" height="150" fill="%23FEF3C7"/><circle cx="100" cy="75" r="45" fill="%23FDE68A"/><text x="100" y="82" font-family="sans-serif" font-size="28" text-anchor="middle" fill="%2392400E">📦</text></svg>',
  ewaste: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect width="200" height="150" fill="%23F1F5F9"/><circle cx="100" cy="75" r="45" fill="%23E2E8F0"/><text x="100" y="82" font-family="sans-serif" font-size="28" text-anchor="middle" fill="%23334155">⚡</text></svg>',
  glass: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect width="200" height="150" fill="%23F0FDFA"/><circle cx="100" cy="75" r="45" fill="%23CCFBF1"/><text x="100" y="82" font-family="sans-serif" font-size="28" text-anchor="middle" fill="%230F766E">🍾</text></svg>',
  default: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect width="200" height="150" fill="%23F3F4F6"/><circle cx="100" cy="75" r="45" fill="%23E5E7EB"/><text x="100" y="82" font-family="sans-serif" font-size="28" text-anchor="middle" fill="%236B7280">♻️</text></svg>',
};

interface WasteImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  categorySlug?: string;
  fallbackUrl?: string;
}

export const WasteImage: React.FC<WasteImageProps> = ({
  src,
  alt = 'Recyclable waste item',
  categorySlug,
  fallbackUrl,
  className = 'w-full h-full object-cover',
  ...rest
}) => {
  const [hasError, setHasError] = useState(false);

  const fallback =
    fallbackUrl ||
    (categorySlug ? FALLBACK_SVGS[categorySlug.toLowerCase()] : null) ||
    FALLBACK_SVGS.default;

  return (
    <img
      src={hasError ? fallback : src || fallback}
      alt={alt}
      onError={() => {
        if (!hasError) {
          setHasError(true);
        }
      }}
      className={className}
      loading="lazy"
      {...rest}
    />
  );
};
