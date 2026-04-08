import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
import Link from "next/link";
import { useSidebarContext } from "./sidebar-context";

const menuItemBaseStyles = cva(
  "rounded-lg px-3.5 font-medium text-gray-600 transition-all duration-200 dark:text-dark-6",
  {
    variants: {
      isActive: {
        true: "bg-[rgba(124,58,237,0.1)] text-primary hover:bg-[rgba(124,58,237,0.1)] dark:bg-[#FFFFFF1A] dark:text-white",
        false:
          "hover:bg-gray-100 hover:text-dark hover:dark:bg-[#FFFFFF1A] hover:dark:text-white",
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
