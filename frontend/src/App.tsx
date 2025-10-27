// project/src/App.tsx

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AuthContextProvider, useAuth } from "@/context/AuthContext";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import LoadingScreen from "./components/LoadingScreen";
import { useState, useEffect } from "react";

import {
  Routes,
  Route,
  useLocation,
  useNavigate,
  Outlet,
} from "react-router-dom";

const queryClient = new QueryClient();

const AuthRedirectHandler = () => {
  const { session, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [hashParamsHandled, setHashParamsHandled] = useState(false);

  useEffect(() => {
    if (loading || hashParamsHandled) {
      return;
    }

    const url = new URL(window.location.href);
    const fragmentParams = new URLSearchParams(url.hash.substring(1));
    const typeFromHash = fragmentParams.get("type");
    const accessTokenFromHash = fragmentParams.get("access_token");

    const clearHashIfSafe = () => {
      if (
        window.location.hash &&
        (accessTokenFromHash || typeFromHash) &&
        typeFromHash !== "recovery"
      ) {
        console.log("Web App: Cleaning up non-recovery auth hash from URL.");
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname + window.location.search
        );
      }
    };

    if (typeFromHash === "recovery") {
      if (location.pathname !== "/reset-password") {
        console.log(
          "Web App: Detected password recovery in URL hash. Navigating to /reset-password."
        );
        navigate("/reset-password", { replace: true });
      }
      setHashParamsHandled(true);
      return;
    }

    if (typeFromHash === "signup" && session) {
      if (location.pathname !== "/confirmation") {
        console.log(
          "Web App: Detected signup verification and session established. Navigating to /confirmation."
        );
        navigate("/confirmation", { replace: true, state: { type: "signup" } });
      }
      clearHashIfSafe();
      setHashParamsHandled(true);
      return;
    }

    if (accessTokenFromHash && session && !typeFromHash) {
      console.log(
        "Web App: Detected general access_token in hash, session active. Clearing URL hash."
      );
      clearHashIfSafe();
      if (location.pathname === "/auth" || location.pathname === "/") {
        console.log(
          "Web App: Logged in (general token), redirecting from auth/root to dashboard."
        );
        navigate("/dashboard", { replace: true });
      }
      setHashParamsHandled(true);
      return;
    }

    if (!accessTokenFromHash && !typeFromHash) {
      setHashParamsHandled(true);
    }
  }, [loading, session, location.pathname, navigate, hashParamsHandled]);

  useEffect(() => {
    if (loading) return;

    if (session) {
      if (location.pathname === "/" || location.pathname === "/auth") {
        console.log(
          "Web App: Logged in, redirecting from root/auth to dashboard."
        );
        navigate("/dashboard", { replace: true });
      }
    } else {
      if (location.pathname === "/dashboard") {
        console.log(
          "Web App: Not logged in, redirecting from dashboard to auth."
        );
        navigate("/auth", { replace: true });
      }
      if (location.pathname === "/") {
        console.log("Web App: Not logged in, redirecting from root to auth.");
        navigate("/auth", { replace: true });
      }
    }
  }, [session, loading, location.pathname, navigate]);

  if (loading) {
    return <LoadingScreen />;
  }

  return <Outlet />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthContextProvider>
        <Routes>
          <Route path="/" element={<AuthRedirectHandler />}>
            <Route index element={<AuthPage />} />
            <Route path="auth" element={<AuthPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="reset-password" element={<ResetPasswordPage />} />
            {/* Ensure ConfirmationPage is routed */}
          </Route>
        </Routes>
      </AuthContextProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
