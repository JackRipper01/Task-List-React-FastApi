// project/frontend/src/pages/DashboardPage.tsx

import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import AuthPageHeader from "@/components/AuthPageHeader";
import TaskList from "@/components/TaskList";

const DashboardPageContent = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center bg-background p-4 pt-24">
      <AuthPageHeader />
      <div className="w-full max-w-4xl text-center">
        {" "}
        {/* MODIFIED: Changed max-w-2xl to max-w-4xl */}
        <h1 className="text-2xl font-bold mb-2">
          Welcome to Alldone, {user?.email}!
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          This is your personal task management area.
        </p>
      </div>
      <div className="w-full max-w-4xl mt-10">
        {" "}
        {/* MODIFIED: Changed max-w-2xl to max-w-4xl */}
        <TaskList />
      </div>
    </div>
  );
};

const DashboardPage = () => {
  return <DashboardPageContent />;
};

export default DashboardPage;
