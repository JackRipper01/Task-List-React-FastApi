// src/components/TaskItem.tsx

import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { parseAndStyleTaskText } from "@/library/utils"; // Import the utility
import { cn } from "@/library/utils";
import { Pencil, Trash2 } from "lucide-react"; // NEW: Add icons for edit/delete buttons
import { Button } from "@/components/ui/button"; // NEW: Import Button

interface TaskItemProps {
  task: {
    id: string;
    text: string;
    completed: boolean;
  };
  onToggleComplete: (id: string, completed: boolean) => void;
  onEdit: (task: { id: string; text: string }) => void;
  onDelete: (id: string) => void; // NEW: Add onDelete prop
  isEditing: boolean; // To disable editing another task while one is open
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onToggleComplete,
  onEdit,
  onDelete,
  isEditing,
}) => {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-md transition-all duration-200 group relative",
        "hover:bg-muted/50",
        task.completed && "opacity-70 line-through text-muted-foreground"
      )}
    >
      <Checkbox
        checked={task.completed}
        onCheckedChange={(checked: boolean) =>
          onToggleComplete(task.id, checked)
        }
        disabled={isEditing}
      />
      <span className="flex-1 text-sm break-words">
        <span
          onClick={() => !isEditing && onEdit(task)} // Only allow editing if no other task is being edited
          style={{ cursor: isEditing ? "not-allowed" : "pointer" }} // Added conditional cursor style
          className="block w-full"
        >
          {parseAndStyleTaskText(task.text)}
        </span>
      </span>
      {/* Action buttons (Edit & Delete) */}
      <div
        className={cn(
          "flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute right-3",
          isEditing && "opacity-0 pointer-events-none" // Hide buttons when editing a task
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation(); // Prevent triggering onEdit from parent div
            onEdit(task);
          }}
          disabled={isEditing}
          className="h-8 w-8 text-muted-foreground hover:bg-accent/50"
        >
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Edit task</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation(); // Prevent triggering onEdit from parent div
            onDelete(task.id);
          }}
          disabled={isEditing}
          className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Delete task</span>
        </Button>
      </div>
    </div>
  );
};

export default TaskItem;
