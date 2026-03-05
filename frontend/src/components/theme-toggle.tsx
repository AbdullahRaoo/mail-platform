"use client";

import React from "react";
import { useTheme } from "@/context/theme-context";
import { Button } from "@/components/ui";
import { Sun, Moon, Monitor } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const cycle = () => {
    const next =
      theme === "system" ? "light" : theme === "light" ? "dark" : "system";
    setTheme(next);
  };

  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  const label =
    theme === "dark" ? "Dark" : theme === "light" ? "Light" : "System";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycle}
      title={`Theme: ${label}`}
      aria-label={`Toggle theme (currently ${label})`}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}
