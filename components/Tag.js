export default function Tag({ children }) {
  return (
    <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand">
      {children}
    </span>
  );
}
