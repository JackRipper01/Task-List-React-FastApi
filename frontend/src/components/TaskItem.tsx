// src/components/TaskItem.tsx

import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { parseAndStyleTaskText, ParsedSegment } from "@/library/utils"; // Removed ParsedSegment import as it's not directly used for rendering here anymore
import { cn } from "@/library/utils";
import { Trash2 } from "lucide-react"; // Only Trash2 needed for actions
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
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onToggleComplete,
  onEdit,
  onDelete,
  isEditing,
}) => {
  const { nodes: styledTextNodes } = parseAndStyleTaskText(task.text); // MODIFIED: Only get nodes

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-md transition-all duration-200 group relative",
        !isEditing && "hover:bg-muted/50 cursor-pointer",
        task.completed && "opacity-70 line-through text-muted-foreground"
      )}
      onClick={() => !isEditing && onEdit(task)}
    >
      <Checkbox
        checked={task.completed}
        onCheckedChange={(checked: boolean) =>
          onToggleComplete(task.id, checked)
        }
        disabled={isEditing}
        className="mt-1"
      />
      <span
        className={cn(
          "flex-1 text-sm break-words pr-8 flex flex-col",
          isEditing && "pointer-events-none"
        )}
      >
        <div className="flex-1">
          {styledTextNodes} {/* MODIFIED: Directly render styledTextNodes */}
        </div>
      </span>
      {/* Action buttons (Delete) */}
      <div
        className={cn(
          "flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute right-3 top-1/2 -translate-y-1/2",
          isEditing && "opacity-0 pointer-events-none"
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
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
