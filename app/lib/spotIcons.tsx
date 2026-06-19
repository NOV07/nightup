import {
  LuGlassWater,
  LuUtensils,
  LuMoon,
  LuMusic,
  LuCoffee,
  LuZap,
  LuPalette,
  LuLeaf,
} from "react-icons/lu";
import type { IconType } from "react-icons";
import type { SpotCategory } from "../spots/types";

const ICON_MAP: Record<SpotCategory, IconType> = {
  drink:     LuGlassWater,
  food:      LuUtensils,
  nightlife: LuMoon,
  show:      LuMusic,
  chill:     LuCoffee,
  activity:  LuZap,
  art:       LuPalette,
  wellness:  LuLeaf,
};

export function SpotCategoryIcon({
  category,
  size = 14,
}: {
  category: SpotCategory;
  size?: number;
}) {
  const Icon = ICON_MAP[category];
  if (!Icon) return null;
  return (
    <Icon
      size={size}
      color="#E8A020"
      style={{ strokeWidth: "1.5", flexShrink: 0 }}
    />
  );
}
