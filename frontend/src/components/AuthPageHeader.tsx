// project/frontend/src/components/AuthPageHeader.tsx

import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface AuthPageHeaderProps {
  children?: React.ReactNode; // REMOVED: Children slot is no longer dynamically populated for landing page
}

const AuthPageHeader: React.FC<AuthPageHeaderProps> = () => {
  const { session, signOut } = useAuth();
  const { toast } = useToast();

  const handleLogout = async () => {
    const { error } = await signOut();
    if (!error) {
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
        variant: "info",
      });
      // AuthRedirectHandler will handle redirect to /auth
    }
  };

  return (
    <header className="absolute top-0 left-0 right-0 h-16">
      <div className="container mx-auto px-4 flex items-center h-full">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center">
            {/* Using a generic icon or replace with your Alldone logo */}
            <img
              src="/alldone-logo.png" // NEW: Assuming you'll have an 'alldone-logo.png' in public folder
              alt="Alldone Logo" // MODIFIED
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-xl font-bold text-foreground">Alldone</span>{" "}
          {/* MODIFIED: Changed text to Alldone */}
        </Link>
        {session ? (
          <div className="flex items-center gap-4 ml-auto">
            <Link to="/dashboard">
              <Button variant="ghost" className="gap-2">
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </Button>
            </Link>
            <Button variant="outline" onClick={handleLogout} className="gap-2">
              <LogOut className="w-4 h-4" /> Log Out
            </Button>
          </div>
        ) : (
          <div className="ml-auto"></div>
        )}
      </div>
    </header>
  );
};

export default AuthPageHeader;
