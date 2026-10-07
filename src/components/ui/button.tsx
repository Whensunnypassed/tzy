import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:-translate-y-0.5 active:translate-y-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-primary to-accent text-white border-2 border-white/40 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40",
        destructive:
          "bg-gradient-to-r from-destructive to-rose-400 text-white border-2 border-white/40 shadow-lg shadow-destructive/30 hover:shadow-xl",
        outline:
          "bg-white/60 backdrop-blur-sm border-2 border-border text-foreground shadow-md hover:bg-white/80",
        secondary:
          "bg-gradient-to-r from-secondary to-accent/60 text-secondary-foreground border-2 border-white/50 shadow-md hover:shadow-lg",
        ghost: "border-2 border-transparent hover:bg-white/50",
      },
      size: {
        default: "min-h-10 px-5 py-2",
        sm: "min-h-8 rounded-full px-3.5 text-xs",
        lg: "min-h-12 rounded-full px-8 text-base",
        icon: "h-10 w-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
