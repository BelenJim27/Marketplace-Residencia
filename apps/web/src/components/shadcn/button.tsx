import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-white hover:bg-primary/90 shadow-sm",
        destructive:
          "bg-red-500 text-white hover:bg-red-600 shadow-sm",
        outline:
          "border border-gray-300 bg-transparent hover:bg-gray-50 text-gray-700",
        secondary:
          "bg-gray-100 text-gray-700 hover:bg-gray-200",
        ghost: "hover:bg-gray-100 text-gray-700",
        link: "text-primary underline-offset-4 hover:underline",
        tierra:
          "bg-tierra-600 text-white hover:bg-tierra-700 shadow-sm",
        naturaleza:
          "bg-naturaleza-600 text-white hover:bg-naturaleza-700 shadow-sm",
        arcilla:
          "bg-arcilla-500 text-white hover:bg-arcilla-600 shadow-sm",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-lg px-8",
        xl: "h-12 rounded-lg px-10 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
