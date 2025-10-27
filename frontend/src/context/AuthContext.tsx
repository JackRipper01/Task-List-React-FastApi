// project/frontend/alldone-task-list/src/context/AuthContext.tsx

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  Session,
  User,
  AuthError,
  AuthChangeEvent,
} from "@supabase/supabase-js";
import { supabase } from "@/services/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { WEB_APP_BASE_URL } from "@/services/api";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (
    email: string,
    password: string
  ) => Promise<{
    user: User | null;
    session: Session | null;
    error: AuthError | null;
  }>;
  signUp: (
    email: string,
    password: string,
    emailRedirectTo?: string
  ) => Promise<{
    user: User | null;
    session: Session | null;
    error: AuthError | null;
  }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  accessToken: string | null;
}

// ESLint directive for react-refresh, applied to the non-component export 'AuthContext'
// eslint-disable-next-line react-refresh/only-export-components

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ESLint directive for react-refresh, applied to the non-component export 'useAuth' hook
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthContextProvider");
  }
  return context;
};

export const AuthContextProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [initialSessionFetched, setInitialSessionFetched] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, currentSession: Session | null) => {
        console.log("Auth event:", event, "Session:", currentSession);
        setSession(currentSession);
        setUser(currentSession?.user || null);
        if (event !== "INITIAL_SESSION" || initialSessionFetched) {
          setLoading(false);
        }
      }
    );

    const getInitialSession = async () => {
      if (initialSessionFetched) return;

      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        setSession(data.session);
        setUser(data.session?.user || null);
      } catch (error: unknown) {
        let errorMessage =
          "An unknown error occurred fetching initial session.";
        if (error instanceof AuthError) {
          errorMessage = error.message;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }
        console.error("Error fetching initial Supabase session:", errorMessage);
      } finally {
        setLoading(false);
        setInitialSessionFetched(true);
      }
    };

    if (!initialSessionFetched) {
      getInitialSession();
    }

    return () => {
      subscription.unsubscribe();
    };
  }, [initialSessionFetched]);

  const signIn = useCallback(
    async (email, password) => {
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error("Sign-in error:", error.message);
          toast({
            title: "Sign-in Failed",
            description: error.message,
            variant: "destructive",
          });
          return { user: null, session: null, error };
        }

        toast({
          title: "Signed In",
          description: `Welcome back, ${data.user?.email || "user"}!`,
          variant: "success",
        });
        return { user: data.user, session: data.session, error: null };
      } catch (error: unknown) {
        let errorMessage = "An unexpected error occurred during sign-in.";
        if (error instanceof AuthError) {
          errorMessage = error.message;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        } else if (
          typeof error === "object" &&
          error !== null &&
          "message" in error &&
          typeof (error as { message: unknown }).message === "string"
        ) {
          errorMessage = (error as { message: string }).message;
        }
        console.error(
          "An unexpected error occurred during sign-in:",
          errorMessage
        );
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        return {
          user: null,
          session: null,
          error: {
            name: "UnexpectedError",
            message: errorMessage,
          } as AuthError,
        };
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  const signUp = useCallback(
    async (email, password, emailRedirectTo) => {
      setLoading(true);
      try {
        const redirectUrl = emailRedirectTo || `${WEB_APP_BASE_URL}/auth`;
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectUrl },
        });

        if (error) {
          console.error("Sign-up error:", error.message);
          toast({
            title: "Sign-up Failed",
            description: error.message,
            variant: "destructive",
          });
          return { user: null, session: null, error };
        }

        if (data.user && !data.session) {
          toast({
            title: "Account Created",
            description: "Please check your email to confirm your account.",
            variant: "info",
            duration: 8000,
          });
        } else {
          setSession(data.session);
          setUser(data.session?.user || null);
          toast({
            title: "Account Created & Signed In",
            description: `Welcome, ${data.user?.email || "new user"}!`,
            variant: "success",
          });
        }
        return { user: data.user, session: data.session, error: null };
      } catch (error: unknown) {
        let errorMessage = "An unexpected error occurred during sign-up.";
        if (error instanceof AuthError) {
          errorMessage = error.message;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        } else if (
          typeof error === "object" &&
          error !== null &&
          "message" in error &&
          typeof (error as { message: unknown }).message === "string"
        ) {
          errorMessage = (error as { message: string }).message;
        }
        console.error(
          "An unexpected error occurred during sign-up:",
          errorMessage
        );
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        return {
          user: null,
          session: null,
          error: {
            name: "UnexpectedError",
            message: errorMessage,
          } as AuthError,
        };
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Sign-out error:", error.message);
        toast({
          title: "Sign-out Failed",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
        variant: "info",
      });
      return { error: null };
    } catch (error: unknown) {
      let errorMessage = "An unexpected error occurred during sign-out.";
      if (error instanceof AuthError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as { message: unknown }).message === "string"
      ) {
        errorMessage = (error as { message: string }).message;
      }
      console.error(
        "An unexpected error occurred during sign-out:",
        errorMessage
      );
      return {
        error: { name: "UnexpectedError", message: errorMessage } as AuthError,
      };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const value = {
    session,
    user,
    loading,
    signIn,
    signUp,
    signOut,
    accessToken: session?.access_token || null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
