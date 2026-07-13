import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 active:translate-y-px",
        accent:
          "bg-signal text-signal-foreground hover:brightness-105 hover:shadow-[0_0_24px_hsl(var(--signal)/0.35)] active:translate-y-px",
        outline:
          "border border-border bg-transparent text-foreground hover:border-foreground/40 hover:bg-secondary",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/70",
        ghost: "text-foreground hover:bg-secondary",
        link: "text-foreground underline-offset-4 hover:underline",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90"
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 px-4 text-[0.8rem]",
        lg: "h-12 px-7 text-base",
        icon: "h-10 w-10"
      },
      shape: {
        default: "rounded-md",
        pill: "rounded-full",
        square: "rounded-none"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      shape: "default"
    }
  }
);

const Button = React.forwardRef(
  ({ className, variant, size, shape, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, shape, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
