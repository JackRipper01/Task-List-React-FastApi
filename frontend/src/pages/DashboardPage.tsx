// project/frontend/alldone-task-list/src/pages/DashboardPage.tsx

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
      <div className="w-full max-w-2xl text-center">
        {" "}
        {/* MODIFIED: max-w-2xl for wider tasks */}
        <h1 className="text-2xl font-bold mb-2">
          Welcome to Alldone, {user?.email}!
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          This is your personal task management area.
        </p>
      </div>
      <div className="w-full max-w-2xl mt-10">
        {" "}
        {/* MODIFIED: max-w-2xl for wider tasks */}
        <TaskList />
      </div>
    </div>
  );
};

const DashboardPage = () => {
  return <DashboardPageContent />;
};

export default DashboardPage;
