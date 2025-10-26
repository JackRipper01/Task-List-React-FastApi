// src/components/TaskItem.tsx

import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { parseAndStyleTaskText } from "@/library/utils";
import { cn } from "@/library/utils";
import { Trash2 } from "lucide-react"; // Removed Pencil and Loader2 icons
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
  isEditing: boolean; // Retained to disable interaction when in edit mode
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onToggleComplete,
  onEdit,
  onDelete,
  isEditing, // Passed through
}) => {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-md transition-all duration-200 group relative",
        !isEditing && "hover:bg-muted/50 cursor-pointer", // Only allow hover background/cursor if not editing
        task.completed && "opacity-70 line-through text-muted-foreground"
      )}
      onClick={() => !isEditing && onEdit(task)} // Clicking the item triggers edit
    >
      <Checkbox
        checked={task.completed}
        onCheckedChange={(checked: boolean) =>
          onToggleComplete(task.id, checked)
        }
        disabled={isEditing}
      />
      <span
        className={cn(
          "flex-1 text-sm break-words pr-8", // MODIFIED: Added pr-8 to make space for delete button
          isEditing && "pointer-events-none" // Disable clicks on text if in edit mode (as the whole item is clickable)
        )}
      >
        {parseAndStyleTaskText(task.text)}
      </span>
      {/* Action buttons (Delete) */}
      <div
        className={cn(
          "flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute right-3 top-1/2 -translate-y-1/2", // MODIFIED: Centered vertically
          isEditing && "opacity-0 pointer-events-none" // Hide buttons if editing
        )}
      >
        {/* REMOVED: Pencil button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation(); // Prevent triggering onEdit from parent div
            onDelete(task.id);
          }}
          disabled={isEditing} // Disable if editing
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
