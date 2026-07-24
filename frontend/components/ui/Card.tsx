import { cn } from "@/lib/utils/cn";
import { card } from "@/lib/styles";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  padding?: "sm" | "md" | "lg";
};

const paddingMap = {
  sm: "p-4",
  md: "p-4 sm:p-6",
  lg: "p-5 sm:p-8",
};

export function Card({
  padding = "md",
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div className={cn(card, paddingMap[padding], className)} {...props}>
      {children}
    </div>
  );
}
