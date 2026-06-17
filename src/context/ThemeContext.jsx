import { createContext, useContext, useLayoutEffect, useState, useCallback } from "react";

// Modes: "light" | "dark" | "system"
const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => localStorage.getItem("theme-mode") || "system");

  useLayoutEffect(() => {
    const root = document.documentElement;

    // Always persist the chosen mode
    localStorage.setItem("theme-mode", mode);

    if (mode === "light") {
      root.classList.remove("dark");
      return;
    }

    if (mode === "dark") {
      root.classList.add("dark");
      return;
    }

    // system — track OS preference
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      if (mq.matches) root.classList.add("dark");
      else root.classList.remove("dark");
    };
    apply();
    mq.addEventListener("change", apply);
    // Re-check when user switches back to the tab or the window regains OS focus
    const onVisible = () => { if (document.visibilityState === "visible") apply(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", apply);
    return () => {
      mq.removeEventListener("change", apply);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", apply);
    };
  }, [mode]);

  const cycleMode = useCallback(() => {
    setMode((prev) => {
      if (prev === "light") return "dark";
      if (prev === "dark") return "system";
      return "light";
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, setMode, cycleMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
