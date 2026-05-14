import { User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { cn } from "@/lib/utils";

interface AvatarDisplayProps {
  url?: string | null;
  className?: string;
  fallbackClassName?: string;
  iconClassName?: string;
}

export function AvatarDisplay({ url, className, fallbackClassName, iconClassName }: AvatarDisplayProps) {
  return (
    <Avatar className={cn("h-10 w-10", className)}>
      {url && <AvatarImage src={url} alt="Avatar" className="object-cover" />}
      <AvatarFallback className={cn("bg-muted", fallbackClassName)}>
        <User className={cn("h-1/2 w-1/2 text-muted-foreground", iconClassName)} />
      </AvatarFallback>
    </Avatar>
  );
}
