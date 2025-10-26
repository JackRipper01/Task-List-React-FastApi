// project/frontend/alldone-task-list/src/pages/DashboardPage.tsx - MODIFIED FOR DEPLOYED WEB APP ONLY

import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import AuthPageHeader from "@/components/AuthPageHeader";
import TaskList from "@/components/TaskList"; // NEW: Import TaskList

// This component serves as a placeholder "dashboard" for the deployed web app.
// It will simply show that the user is logged in and offer a logout button.
// The real dashboard/coaching functionality remains within the extension.
const WebAppDashboardContent = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/", { replace: true }); // Redirect to landing page after logout
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-background p-4 pt-24">
      {" "}
      {/* MODIFIED: pt-24 for header spacing */}
      <AuthPageHeader />
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-2">
          Welcome to Alldone, {user?.email}!
        </h1>
        <p className="text-muted-foreground"></p>
        <p className="mt-4 text-sm text-muted-foreground">
          This is your personal task management area.
        </p>
      </div>
      {/* NEW: Integrate TaskList here */}
      <div className="w-full max-w-md mt-10">
        {" "}
        {/* Add some margin-top for spacing */}
        <TaskList />
      </div>
    </div>
  );
};

const DashboardPage = () => {
  return <WebAppDashboardContent />;
};

export default DashboardPage;
