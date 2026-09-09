import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import "@/index.css";
import App from "@/App";
import { ThemeProvider } from "@/context/ThemeContext";
import CursorGlow from "@/components/CursorGlow";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <CursorGlow />
        <App />
        <Toaster position="top-right" richColors />
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
