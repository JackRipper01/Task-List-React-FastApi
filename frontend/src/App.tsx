// project/src/App.tsx - MODIFIED TO REMOVE LANDING PAGE

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AuthContextProvider, useAuth } from "@/context/AuthContext";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
// import LandingPage from "./components/LandingPage"; // REMOVED: No longer needed
import ResetPasswordPage from "./pages/ResetPasswordPage";
import LoadingScreen from "./components/LoadingScreen";
import { useState, useEffect } from "react";

import {
  BrowserRouter,
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

    // --- High-priority: Supabase Auth Redirects based on URL hash ---

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

    // General access token handling for login/refresh and redirection
    if (accessTokenFromHash && session && !typeFromHash) {
      console.log(
        "Web App: Detected general access_token in hash, session active. Clearing URL hash."
      );
      clearHashIfSafe();
      // Redirect to dashboard from auth or root after a successful login/refresh
      if (location.pathname === "/auth" || location.pathname === "/") {
        console.log(
          "Web App: Logged in (general token), redirecting from auth/root to dashboard."
        );
        navigate("/dashboard", { replace: true });
      }
      setHashParamsHandled(true);
      return;
    }

    // Mark as handled if there was no relevant hash
    if (!accessTokenFromHash && !typeFromHash) {
      setHashParamsHandled(true);
    }
  }, [loading, session, location.pathname, navigate, hashParamsHandled]);

  // Use a separate useEffect for standard redirection *after* hash processing is done or irrelevant
  useEffect(() => {
    if (loading) return; // Still loading session, do nothing yet

    if (session) {
      // User IS logged in
      // If on / or /auth, redirect to /dashboard
      if (location.pathname === "/" || location.pathname === "/auth") {
        console.log(
          "Web App: Logged in, redirecting from root/auth to dashboard."
        );
        navigate("/dashboard", { replace: true });
      }
      // If already on dashboard, reset-password, or confirmation, stay there.
    } else {
      // User is NOT logged in
      // If trying to access /dashboard, redirect to /auth
      if (location.pathname === "/dashboard") {
        console.log(
          "Web App: Not logged in, redirecting from dashboard to auth."
        );
        navigate("/auth", { replace: true });
      }
      // If on / (root) or /auth, allow them to stay.
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
        <BrowserRouter>
          <Routes>
            {/* The root path is handled by AuthRedirectHandler for conditional redirects */}
            <Route path="/" element={<AuthRedirectHandler />}>
              <Route index element={<AuthPage />} />{" "}
              {/* Default route now goes to AuthPage if not logged in */}
              <Route path="auth" element={<AuthPage />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="reset-password" element={<ResetPasswordPage />} />
            </Route>

            {/* Optionally, add a NotFoundPage route */}
            {/* <Route path="*" element={<NotFoundPage />} /> */}
          </Routes>
        </BrowserRouter>
      </AuthContextProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
