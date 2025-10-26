// project/frontend/src/pages/ResetPasswordPage.tsx

import React, { useState, useEffect } from "react";
import { supabase } from "@/services/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Lock } from "lucide-react"; // REMOVED: Brain import
import { useNavigate } from "react-router-dom";
import AuthPageHeader from "@/components/AuthPageHeader";

const ResetPasswordPage: React.FC = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAndProcessSession = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay for AuthContext

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setError(
          "Invalid or expired password reset link. Please request a new one."
        );
        toast({
          title: "Invalid Link",
          description: "Please request a new password reset link.",
          variant: "destructive",
          duration: 10000,
        });
        navigate("/auth", { replace: true });
        return;
      }

      console.log(
        "ResetPasswordPage: Session detected, user can set new password."
      );

      // Important: Clear the URL hash *after* we've confirmed a session is available.
      if (window.location.hash) {
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname + window.location.search
        );
      }
    };

    checkAndProcessSession();
  }, [navigate, toast]);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      toast({
        title: "Password Mismatch",
        description: "The new password and confirmation do not match.",
        variant: "warning",
      });
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "warning",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Password Reset Successful",
        description: "Your password has been updated. You are now logged in.",
        variant: "success",
        duration: 5000,
      });
      setIsSuccess(true);
      setNewPassword("");
      setConfirmPassword("");

      // After successful reset, redirect to confirmation page, passing the type
      navigate("/confirmation", { replace: true, state: { type: "recovery" } });
    } catch (err: any) {
      console.error("Password reset error:", err);
      setError(err.message || "Failed to reset password.");
      toast({
        title: "Password Reset Failed",
        description: err.message || "An error occurred during password reset.",
        variant: "destructive",
        duration: 8000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Removed handleGoToDashboard as the flow now goes through ConfirmationPage

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 pt-16">
      <AuthPageHeader />
      <div className="w-full max-w-md">
        <Card className="shadow-sm border-border/80">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg font-semibold text-center">
              {isSuccess ? "Password Successfully Reset!" : "Set New Password"}
            </CardTitle>
            <CardDescription className="text-sm text-center text-muted-foreground">
              {isSuccess
                ? "Your password has been updated. Redirecting to confirmation page..."
                : "Enter and confirm your new password below."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isSuccess ? (
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
            ) : (
              <form onSubmit={handlePasswordUpdate} className="space-y-3">
                {error && (
                  <p className="text-red-500 text-sm text-center">{error}</p>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10 placeholder:text-xs"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 placeholder:text-xs"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    isSubmitting ||
                    !newPassword.trim() ||
                    !confirmPassword.trim() ||
                    newPassword.length < 6
                  }
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Setting
                      Password...
                    </>
                  ) : (
                    "Set New Password"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
