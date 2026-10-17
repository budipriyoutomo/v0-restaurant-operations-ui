// Icon of an issue category (Todo-Ops-Checklist P1). Categories store a lucide
// icon name; only the names below are offered in Master Data, anything else
// (or none) shows the generic tag.
import {
  CircleHelp, Droplets, Flame, GraduationCap, Megaphone, MessageSquareWarning, Monitor, Package, ShieldCheck,
  ShoppingCart, Sparkles, Tag, Thermometer, Truck, Users, UtensilsCrossed, Wind, Wrench, Zap,
} from 'lucide-react'
import type { ElementType } from 'react'

export const CATEGORY_ICONS: Record<string, ElementType> = {
  wrench: Wrench,
  monitor: Monitor,
  'shield-check': ShieldCheck,
  thermometer: Thermometer,
  'graduation-cap': GraduationCap,
  'shopping-cart': ShoppingCart,
  megaphone: Megaphone,
  package: Package,
  'message-square-warning': MessageSquareWarning,
  'circle-help': CircleHelp,
  sparkles: Sparkles,
  droplets: Droplets,
  zap: Zap,
  wind: Wind,
  flame: Flame,
  'utensils-crossed': UtensilsCrossed,
  truck: Truck,
  users: Users,
  tag: Tag,
}

export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS)

export function CategoryIcon({ name, className }: { name: string | null | undefined; className?: string }) {
  const Icon = (name && CATEGORY_ICONS[name]) || Tag
  return <Icon className={className} aria-hidden />
}
