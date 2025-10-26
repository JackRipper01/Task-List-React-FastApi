// project/frontend/src/pages/ConfirmationPage.tsx

import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react"; // REMOVED: Brain import
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import AuthPageHeader from "@/components/AuthPageHeader";

const ConfirmationPage: React.FC = () => {
  const location = useLocation();
  const [message, setMessage] = useState("Processing your request...");
  const [isError, setIsError] = useState(false);
  const [showLoginButton, setShowLoginButton] = useState(false);
  const [actionType, setActionType] = useState<
    "email_verification" | "password_reset" | "unknown"
  >("unknown");

  useEffect(() => {
    const url = new URL(window.location.href);
    const fragmentParams = new URLSearchParams(url.hash.substring(1));
    const type = fragmentParams.get("type");

    // Clear the hash fragment after reading to ensure a clean URL
    window.history.replaceState(
      {},
      document.title,
      window.location.pathname + window.location.search
    );

    if (type === "signup") {
      setMessage(
        "Your email has been successfully verified! You can now log into Alldone." // MODIFIED
      );
      setActionType("email_verification");
      setShowLoginButton(true);
    } else if (type === "recovery") {
      setMessage(
        "Your password has been successfully reset! You can now log into Alldone with your new password." // MODIFIED
      );
      setActionType("password_reset");
      setShowLoginButton(true);
    } else {
      setMessage(
        "Action confirmed. You can now proceed to log into Alldone." // MODIFIED
      );
      setActionType("unknown");
      setShowLoginButton(true); // Default to showing login button for general confirmation
    }
  }, [location.hash]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 pt-16">
      <AuthPageHeader />
      <div className="w-full max-w-md">
        <Card className="shadow-sm border-border/80 text-center">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg font-semibold">
              {isError ? "Something Went Wrong" : "Action Confirmed!"}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {message}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {showLoginButton && (
              <Link to="/auth" className="w-full">
                {" "}
                {/* MODIFIED: Link to /auth */}
                <Button className="w-full">Go to Login</Button>
              </Link>
            )}
            {!showLoginButton && !isError && (
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
            )}
            <Link
              to="/auth" // MODIFIED: Link to /auth
              className="text-sm text-primary hover:underline block mt-2"
            >
              Return to Login Page
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConfirmationPage;
