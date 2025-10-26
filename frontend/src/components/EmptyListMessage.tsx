// src/components/EmptyListMessage.tsx

import React from "react";
import { PlusCircle } from "lucide-react";

const EmptyListMessage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
      <PlusCircle className="w-12 h-12 mb-4" />
      <p className="text-lg font-semibold mb-2">No tasks yet!</p>
      <p className="text-sm">Click the '+' button to add your first task.</p>
    </div>
  );
};

export default EmptyListMessage;
