import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-120 ease-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground rounded-flowmind px-6 py-3 shadow-flowmind-primary hover:bg-primary/90 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
        destructive:
          "bg-destructive text-destructive-foreground rounded-flowmind px-6 py-3 shadow-sm hover:bg-destructive/90",
        outline:
          "border-2 border-accent-2 text-accent-2 bg-transparent rounded-flowmind px-6 py-3 hover:bg-accent-2 hover:text-white transition-all duration-120",
        secondary:
          "bg-secondary text-secondary-foreground rounded-flowmind px-6 py-3 shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground rounded-flowmind px-6 py-3",
        link: "text-primary underline-offset-4 hover:underline px-6 py-3",
      },
      size: {
        default: "h-12 px-6 py-3 text-base",
        sm: "h-10 rounded-flowmind-md px-4 text-sm",
        lg: "h-14 rounded-flowmind px-8 text-lg",
        icon: "h-12 w-12 rounded-flowmind",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    (<Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props} />)
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }
