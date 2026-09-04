"use client";

import ButtonWithIconDemo from "@/components/ui/button-with-icon";
import { Button } from "@/components/ui/button";
import { LoaderCircle } from "lucide-react";
import React, { useState } from "react";

export function DemoOne() {
  return <ButtonWithIconDemo />;
}

export function Component() {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleClick = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      data-loading={isLoading}
      className="group relative disabled:opacity-100"
    >
      <span className="group-data-[loading=true]:text-transparent">Click me</span>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <LoaderCircle className="animate-spin" size={16} strokeWidth={2} aria-hidden="true" />
        </div>
      )}
    </Button>
  );
}

export default DemoOne;
