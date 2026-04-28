import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
import Link from "next/link";
import { useSidebarContext } from "@/context/SidebarContext";

const menuItemBaseStyles = cva(
  "rounded-lg px-3.5 font-medium text-gray-700 transition-all duration-200 dark:text-gray-300",
  {
    variants: {
      isActive: {
        true: "bg-white/60 text-gray-900 hover:bg-white/60 dark:bg-white/10 dark:text-white dark:hover:bg-white/10",
        false: "hover:bg-white/60 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white",
      },
    },
    defaultVariants: {
      isActive: false,
    },
  },
);

export function MenuItem(
  props: {
    className?: string;
    children: React.ReactNode;
    isActive: boolean;
    title?: string;
  } & (
    | { as?: "button"; onClick: () => void }
    | { as: "link"; href: string }
  ),
) {
  const { toggleSidebar, isMobile } = useSidebarContext();

  if (props.as === "link") {
    return (
      <Link
        href={props.href}
        title={props.title}
        // Close sidebar on clicking link if it's mobile
        onClick={() => isMobile && toggleSidebar()}
        className={cn(
          menuItemBaseStyles({
            isActive: props.isActive,
            className: "relative block py-2",
          }),
          "focus-visible:outline-none",
          props.className,
        )}
      >
        {props.children}
      </Link>
    );
  }

  return (
    <button
      onClick={() => 'onClick' in props && props.onClick()}
      aria-expanded={props.isActive}
      className={menuItemBaseStyles({
        isActive: props.isActive,
        className: "flex w-full items-center gap-3 py-3 focus-visible:outline-none",
      })}
    >
      {props.children}
    </button>
  );
}
