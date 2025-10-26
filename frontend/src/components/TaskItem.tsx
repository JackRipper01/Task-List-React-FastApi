// src/components/TaskItem.tsx

import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { parseAndStyleTaskText } from "@/library/utils"; // Import the utility
import { cn } from "@/library/utils";
import { Pencil, Trash2, Loader2 } from "lucide-react"; // NEW: Add Loader2 icon
import { Button } from "@/components/ui/button";

interface TaskItemProps {
  task: {
    id: string;
    text: string;
    completed: boolean;
  };
  onToggleComplete: (id: string, completed: boolean) => void;
  onEdit: (task: { id: string; text: string }) => void;
  onDelete: (id: string) => void;
  isEditing: boolean;
  isLoading?: boolean; // NEW: Prop to indicate loading state for actions
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onToggleComplete,
  onEdit,
  onDelete,
  isEditing,
  isLoading = false, // Default to false
}) => {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-md transition-all duration-200 group relative",
        "hover:bg-muted/50",
        task.completed && "opacity-70 line-through text-muted-foreground",
        isLoading && "opacity-50 pointer-events-none" // Dim and disable interactions if loading
      )}
    >
      <Checkbox
        checked={task.completed}
        onCheckedChange={(checked: boolean) =>
          onToggleComplete(task.id, checked)
        }
        disabled={isEditing || isLoading} // Disable if editing or loading
      />
      <span className="flex-1 text-sm break-words">
        <span
          onClick={() => !isEditing && !isLoading && onEdit(task)} // Disable click if editing or loading
          style={{ cursor: isEditing || isLoading ? "not-allowed" : "pointer" }}
          className="block w-full"
        >
          {parseAndStyleTaskText(task.text)}
        </span>
      </span>
      {/* Action buttons (Edit & Delete) */}
      <div
        className={cn(
          "flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute right-3",
          (isEditing || isLoading) && "opacity-0 pointer-events-none" // Hide buttons if editing or loading
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(task);
          }}
          disabled={isEditing || isLoading} // Disable if editing or loading
          className="h-8 w-8 text-muted-foreground hover:bg-accent/50"
        >
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Edit task</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
          disabled={isEditing || isLoading} // Disable if editing or loading
          className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}{" "}
          {/* Show spinner if loading */}
          <span className="sr-only">Delete task</span>
        </Button>
      </div>
      {isLoading && ( // NEW: Overlay spinner for pending delete
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-md">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
};

export default TaskItem;
