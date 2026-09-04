import * as React from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ButtonWithIconProps extends ButtonProps {
  text: string;
  icon?: React.ReactNode;
}

export default function ButtonWithIcon({ 
  text, 
  icon, 
  className, 
  ...props 
}: ButtonWithIconProps) {
  return (
    <Button 
      className={cn(
        "relative text-sm font-medium rounded-full h-12 p-1 ps-6 pe-14 group transition-all duration-500 hover:ps-14 hover:pe-6 w-fit overflow-hidden cursor-pointer bg-gray-200 text-slate-900 hover:bg-gray-300 border-none shadow-none",
        className
      )}
      {...props}
    >
      <span className="relative z-10 transition-all duration-500">
        {text}
      </span>
      <div 
        className="absolute right-1 w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center transition-all duration-500 group-hover:right-[calc(100%-44px)] group-hover:rotate-45"
      >
        {icon || <ArrowUpRight size={16} strokeWidth={2} />}
      </div>
    </Button>
  );
}