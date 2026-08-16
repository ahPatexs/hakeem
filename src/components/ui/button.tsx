import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 active:scale-95",
  {
    variants: {
      variant: {
        default: "bg-primary text-on-primary hover:bg-primary-container shadow-lg",
        secondary: "bg-med-green text-white hover:bg-on-secondary-container shadow-lg",
        outline: "border-2 border-primary/20 text-primary hover:bg-primary/5",
        ghost: "text-primary hover:bg-primary-fixed/30",
        soft: "bg-primary-fixed text-primary hover:bg-primary hover:text-white",
        auth: "!h-auto min-h-12 !rounded-full !whitespace-normal bg-[#071525] px-5 py-3.5 text-center text-sm font-bold uppercase leading-snug tracking-[0.08em] text-white shadow-[0_10px_24px_rgba(3,12,28,0.35)] hover:bg-[#0a1f38]",
        authOutline:
          "!h-auto min-h-12 !rounded-full !whitespace-normal border border-white/40 bg-transparent px-5 py-3.5 text-center text-sm font-semibold leading-snug text-white hover:bg-white/10",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-9 rounded-lg px-4",
        lg: "h-14 px-8 py-4 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
