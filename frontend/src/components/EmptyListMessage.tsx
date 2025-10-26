// project/frontend/alldone-task-list/src/components/EmptyListMessage.tsx

import React from "react";
import { FileText } from "lucide-react"; // Using Lucide icons

const EmptyListMessage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
      <FileText className="h-12 w-12 mb-4" />
      <p className="text-lg font-medium">
        No tasks yet. Get started by typing below!
      </p>{" "}
      {/* MODIFIED text */}
      {/* <p className="text-sm">Your tasks will appear here.</p> */}{" "}
      {/* REMOVED redundant line */}
    </div>
  );
};

export default EmptyListMessage;
