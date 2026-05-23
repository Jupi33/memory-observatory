declare module 'lucide-react' {
  import type { FC, SVGProps } from 'react'

  export type LucideIcon = FC<
    SVGProps<SVGSVGElement> & {
      absoluteStrokeWidth?: boolean
      size?: number | string
      strokeWidth?: number | string
    }
  >

  export const Compass: LucideIcon
  export const Heart: LucideIcon
  export const ImagePlus: LucideIcon
  export const Link2: LucideIcon
  export const Pencil: LucideIcon
  export const Plus: LucideIcon
  export const Route: LucideIcon
  export const Save: LucideIcon
  export const ScrollText: LucideIcon
  export const Trash2: LucideIcon
  export const Volume2: LucideIcon
  export const VolumeX: LucideIcon
  export const X: LucideIcon
}
