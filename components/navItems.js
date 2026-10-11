export const navItems = [
  { href: "/", label: "홈", icon: "🏠" },
  { href: "/course", label: "코스", icon: "🧭" },
  { href: "/log", label: "로그", icon: "📝" },
];

export function isActive(pathname, href) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
