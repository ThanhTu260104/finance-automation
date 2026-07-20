export const card = "rounded-2xl border border-border bg-surface shadow-sm";

export const pageTitle = "text-2xl font-bold text-slate-800";
export const pageSubtitle = "text-sm text-slate-500";

const btnBase =
  "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition";

export const buttonVariants = {
  primary: `${btnBase} bg-[#388e4a] text-white hover:bg-[#2f7a3f]`,
  secondary: `${btnBase} bg-slate-800 text-white hover:bg-slate-700`,
  outline: `${btnBase} border border-border bg-surface text-primary-700 hover:bg-primary-50`,
} as const;

export const sidebarLink =
  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-sidebar-text transition hover:bg-sidebar-hover";

export const sidebarLinkActive = "bg-primary-600 text-white hover:bg-primary-600";
