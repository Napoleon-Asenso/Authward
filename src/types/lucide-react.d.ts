declare module "lucide-react" {
  import type { FC, SVGProps } from "react";

  export type LucideIcon = FC<SVGProps<SVGSVGElement>>;

  export const Eye: LucideIcon;
  export const EyeOff: LucideIcon;
}