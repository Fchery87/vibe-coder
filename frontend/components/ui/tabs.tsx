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
      "scroll-fade relative inline-flex items-center gap-[var(--gap-2)] overflow-x-auto rounded-[var(--radius)] bg-[var(--panel-muted-bg)] p-[var(--gap-2)] text-[var(--muted)] border border-[var(--border)]",
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
      "inline-flex items-center justify-center whitespace-nowrap rounded-[var(--radius)] border border-[var(--tab-border)] bg-[var(--tab-bg)] px-[var(--gap-4)] py-[var(--gap-2)] text-[var(--size-small)] font-medium text-[var(--muted)] transition-colors disabled:pointer-events-none disabled:opacity-50",
      "hover:text-[var(--foreground)] hover:border-[var(--accent)] hover:bg-[var(--tab-hover-bg)]",
      "data-[state=active]:border-[var(--accent)] data-[state=active]:bg-[var(--tab-active-bg)] data-[state=active]:text-[var(--foreground)]",
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
