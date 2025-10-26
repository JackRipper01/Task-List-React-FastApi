// src/components/TaskItem.tsx

import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { parseAndStyleTaskText, ParsedSegment } from "@/library/utils";
import { cn } from "@/library/utils";
import { Trash2, UserRound, Hash, Mail, Link as LinkIcon } from "lucide-react"; // MODIFIED: Import UserRound, Mail, LinkIcon
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
  const { nodes: styledTextNodes, segments } = parseAndStyleTaskText(task.text);

  // Filter out unique tag types (excluding 'text' type) for icon display
  // We need to store full segments to get 'value' for mentions/hashtags
  const uniqueTagSegments = Array.from(
    new Map(
      segments.filter((s) => s.type !== "text").map((s) => [s.type, s])
    ).values()
  );

  const getTagGlobe = (segment: ParsedSegment, index: number) => {
    let IconComponent;
    let textContent: string | React.ReactNode;
    let bgColorClass: string;
    let textColorClass: string;

    switch (segment.type) {
      case "mention":
        IconComponent = UserRound;
        textContent = segment.value; // Display the full @mention text
        bgColorClass = "bg-tag-mention-bg";
        textColorClass = "text-tag-mention-text";
        break;
      case "hashtag":
        IconComponent = Hash;
        textContent = segment.value; // Display the full #hashtag text
        bgColorClass = "bg-tag-hashtag-bg";
        textColorClass = "text-tag-hashtag-text";
        break;
      case "email":
        IconComponent = Mail;
        textContent = "Email"; // Display "Email" text
        bgColorClass = "bg-tag-email-bg";
        textColorClass = "text-tag-email-text";
        break;
      case "link":
        IconComponent = LinkIcon;
        textContent = "Link"; // Display "Link" text
        bgColorClass = "bg-tag-link-bg";
        textColorClass = "text-tag-link-text";
        break;
      default:
        return null;
    }

    return (
      <span
        key={`globe-${task.id}-${segment.type}-${index}`}
        className={cn(
          "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer",
          bgColorClass,
          textColorClass
        )}
      >
        <IconComponent className="h-3 w-3" /> {/* Smaller icon */}
        {textContent}
      </span>
    );
  };

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
          "flex-1 text-sm break-words pr-8 flex flex-col", // MODIFIED: Added flex flex-col for text + tags below
          isEditing && "pointer-events-none"
        )}
      >
        <div className="flex-1">
          {" "}
          {/* Wrapper for main text */}
          {styledTextNodes}
        </div>
        {/* Tag Globes (displayed only when NOT editing, below the text) */}
        {!isEditing && uniqueTagSegments.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {" "}
            {/* Flex container for globes */}
            {uniqueTagSegments.map((segment, index) =>
              getTagGlobe(segment, index)
            )}
          </div>
        )}
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
