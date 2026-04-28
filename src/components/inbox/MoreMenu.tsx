import { useEffect, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MenuAction {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
  /** Render a divider above this item */
  divider?: boolean;
  /** Hide entirely */
  hidden?: boolean;
}

interface Props {
  actions: MenuAction[];
  align?: "left" | "right";
  variant?: "horizontal" | "vertical";
  className?: string;
  triggerClassName?: string;
  title?: string;
  trigger?: ReactNode;
}

export function MoreMenu({ actions, align = "right", variant = "horizontal", className, triggerClassName, title = "Más opciones", trigger }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const visible = actions.filter((a) => !a.hidden);
  if (visible.length === 0) return null;

  const Icon = variant === "vertical" ? MoreVertical : MoreHorizontal;

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen((v) => !v);
        }}
        title={title}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground",
          open && "bg-muted text-foreground",
          triggerClassName,
        )}
      >
        {trigger ?? <Icon className="h-4 w-4" />}
      </button>
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute z-50 mt-1.5 w-56 overflow-hidden rounded-xl border bg-popover p-1 text-popover-foreground shadow-2xl",
            align === "right" ? "right-0" : "left-0",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {visible.map((action, idx) => {
            const ActionIcon = action.icon;
            return (
              <div key={`${action.label}-${idx}`}>
                {action.divider && <div className="my-1 h-px bg-border" />}
                <button
                  role="menuitem"
                  type="button"
                  disabled={action.disabled}
                  onClick={() => {
                    if (action.disabled) return;
                    setOpen(false);
                    action.onClick();
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition",
                    action.destructive
                      ? "text-destructive hover:bg-destructive/10"
                      : "text-foreground hover:bg-muted",
                    action.disabled && "cursor-not-allowed opacity-40 hover:bg-transparent",
                  )}
                >
                  {ActionIcon && <ActionIcon className="h-4 w-4 shrink-0" />}
                  <span className="truncate">{action.label}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
