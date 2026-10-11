export const navItems = [
  { href: "/", label: "홈", icon: "🏠" },
  { href: "/course", label: "코스", icon: "🧭" },
  { href: "/media", label: "미디어", icon: "📷" },
  { href: "/log", label: "로그", icon: "📝" },
  { href: "/profile", label: "프로필", icon: "👤" },
];

export function isActive(pathname, href) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
