// project/frontend/src/components/LoadingScreen.tsx

import React from "react";
import { Loader2 } from "lucide-react"; // REMOVED: Brain import

const LoadingScreen: React.FC = () => {
  return (
    <div className="flex items-center justify-center h-screen w-full bg-background text-foreground flex-col p-4">
      <div className="flex items-center justify-center gap-4 mb-8">
        <div className="w-24 h-24 rounded-lg flex items-center justify-center">
          <img
            src="/alldone-logo.png" // NEW: Assuming you'll have an 'alldone-logo.png' in public folder
            alt="Alldone Logo" // MODIFIED
            className="w-full h-full object-contain"
          />
        </div>
        <span className="text-5xl font-bold text-foreground">Alldone</span>{" "}
        {/* MODIFIED: Changed text to Alldone */}
      </div>
      <Loader2 className="h-16 w-16 animate-spin text-primary" />
    </div>
  );
};

export default LoadingScreen;
