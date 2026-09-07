import { SITE_NAME } from "@/lib/site";

interface BrandLogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export function BrandLogo({
  className = "h-14 w-14",
  width = 56,
  height = 56,
}: BrandLogoProps) {
  return (
    <img
      src="/icon.svg"
      alt={`${SITE_NAME} logo`}
      width={width}
      height={height}
      className={className}
    />
  );
}
