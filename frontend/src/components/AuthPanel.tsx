// project/src/components/AuthPanel.tsx

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Chrome, Loader2, Mail, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/services/supabaseClient";
import { WEB_APP_BASE_URL } from "@/services/api";
import AuthPageHeader from "./AuthPageHeader";

const AuthPanel = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const { toast } = useToast();
  const { signIn, signUp, loading } = useAuth();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      await signIn(email, password);
    } else {
      // Ensure emailRedirectTo is correctly set for sign-up confirmation
      await signUp(email, password, `${WEB_APP_BASE_URL}/confirmation`);
    }
  };

  const handleGoogleAuth = async () => {
    toast({
      title: "Google Auth (Coming Soon)",
      description: "Google OAuth is not yet implemented.", // MODIFIED: Generalized text
      variant: "info",
      duration: 5000,
    });
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter your email to reset your password.",
        variant: "warning",
      });
      return;
    }

    // The reset-password page will handle updating the password.
    const REDIRECT_TO_URL = `${WEB_APP_BASE_URL}`;
    const fullRedirectUrl = `${REDIRECT_TO_URL}/reset-password`;

    toast({
      title: "Sending Reset Link",
      description: "Please wait...",
      variant: "info",
    });

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        recoveryEmail,
        {
          redirectTo: fullRedirectUrl,
        }
      );

      if (error) {
        throw error;
      }

      toast({
        title: "Password Reset Email Sent",
        description:
          "Check your email for a password reset link to set a new password.",
        variant: "success",
        duration: 8000,
      });
      setShowForgotPassword(false);
      setRecoveryEmail("");
    } catch (error: unknown) {
      let errorMessage = "Could not send password reset email.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      console.error("Password reset error:", errorMessage);
      toast({
        title: "Password Reset Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 pt-16">
      <AuthPageHeader />
      <div className="w-full max-w-md">
        <Card className="shadow-sm border-border/80">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg font-semibold text-center">
              {showForgotPassword
                ? "Reset Password"
                : isLogin
                ? "Sign In to Alldone" // MODIFIED
                : "Sign Up for Alldone"}{" "}
              {/* MODIFIED */}
            </CardTitle>
            <CardDescription className="text-sm text-center text-muted-foreground">
              {showForgotPassword
                ? "Enter your email to receive a password reset link."
                : isLogin
                ? "Enter your credentials to access your task list" // MODIFIED
                : "Create an account to start managing your tasks"}{" "}
              {/* MODIFIED */}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showForgotPassword && (
              <Button
                variant="outline"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full"
              >
                <Chrome className="w-4 h-4 mr-2" />
                Continue with Google
              </Button>
            )}

            {!showForgotPassword && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with email
                  </span>
                </div>
              </div>
            )}

            {showForgotPassword ? (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="recovery-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="recovery-email"
                      type="email"
                      placeholder="Enter your email"
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      className="pl-10 placeholder:text-xs"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || !recoveryEmail.trim()}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full"
                  disabled={loading}
                >
                  Back to {isLogin ? "Sign In" : "Sign Up"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleEmailAuth} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 placeholder:text-xs"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 placeholder:text-xs"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="default"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please
                      wait...
                    </>
                  ) : isLogin ? (
                    "Sign In"
                  ) : (
                    "Create Account"
                  )}
                </Button>

                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => setShowForgotPassword(true)}
                    className="p-0 h-auto font-normal text-primary"
                    disabled={loading}
                  >
                    Forgot your password?
                  </Button>
                </div>
              </form>
            )}

            {!showForgotPassword && (
              <div className="text-center text-sm">
                <span className="text-muted-foreground">
                  {isLogin
                    ? "Don't have an Alldone account? " // MODIFIED
                    : "Already have an Alldone account? "}{" "}
                  {/* MODIFIED */}
                </span>
                <Button
                  type="button"
                  variant="link"
                  onClick={() => setIsLogin(!isLogin)}
                  className="p-0 h-auto font-normal"
                  disabled={loading}
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthPanel;
