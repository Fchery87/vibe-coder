import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "scroll-fade relative inline-flex items-center gap-[var(--gap-2)] overflow-x-auto rounded-[var(--radius)] bg-[rgba(17,24,38,0.55)] p-[var(--gap-2)] text-[var(--muted)]",
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-[var(--radius)] border border-[rgba(31,41,55,0.8)] bg-[rgba(15,20,33,0.9)] px-[var(--gap-4)] py-[var(--gap-2)] text-[var(--size-small)] font-medium text-[var(--muted)] transition-colors disabled:pointer-events-none disabled:opacity-50",
      "hover:text-[var(--text)] hover:border-[rgba(124,58,237,0.35)]",
      "data-[state=active]:border-[rgba(124,58,237,0.45)] data-[state=active]:bg-[rgba(124,58,237,0.12)] data-[state=active]:text-[var(--text)]",
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("mt-0 focus-visible:outline-none", className)}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };

