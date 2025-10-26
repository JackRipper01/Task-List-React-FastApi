// src/components/NewTaskInput.tsx (Revised for single toggle button logic)

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  X,
  Save,
  Tag,
  Calendar,
  UserRound,
  Paperclip,
  Flag,
} from "lucide-react"; // Using Lucide icons
import { cn, parseAndStyleTaskText } from "@/library/utils";

interface NewTaskInputProps {
  onAddTask: (text: string) => void;
  onSaveEdit: (id: string, text: string) => void;
  onCancel: () => void; // This cancel is for the whole input area
  initialText?: string;
  isEditing?: boolean;
  taskId?: string;
}

const NewTaskInput: React.FC<NewTaskInputProps> = ({
  onAddTask,
  onSaveEdit,
  onCancel,
  initialText = "",
  isEditing = false,
  taskId,
}) => {
  const [isExpanded, setIsExpanded] = useState(isEditing);
  const [taskText, setTaskText] = useState(initialText);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setIsExpanded(isEditing);
    setTaskText(initialText);
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        initialText.length,
        initialText.length
      ); // Put cursor at end
    }
  }, [isEditing, initialText]);

  const handleToggleExpand = () => {
    setIsExpanded(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleAddOrSave = () => {
    if (taskText.trim()) {
      if (isEditing && taskId) {
        onSaveEdit(taskId, taskText.trim());
      } else {
        onAddTask(taskText.trim());
      }
      setTaskText("");
      setIsExpanded(false);
      onCancel(); // Call general cancel to clear editingTask from parent
    }
  };

  const handleCancelInternal = () => {
    setTaskText("");
    setIsExpanded(false);
    onCancel(); // Propagate cancel upwards
  };

  // Auto-resize textarea on input
  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTaskText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  };

  // Determine the primary action button's icon and text for the expanded state footer
  const primaryActionButtonText = isEditing ? "Save" : "Add";
  const primaryActionButtonIcon = isEditing ? (
    <Save className="h-4 w-4" />
  ) : (
    <Plus className="h-4 w-4" />
  );

  return (
    <div className="relative border rounded-md p-2 shadow-sm bg-card transition-all duration-200">
      {isExpanded && (
        // Expanded state
        <div className="flex flex-col gap-2">
          {/* Top-right "X" button to collapse */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleCancelInternal} // X button always cancels/collapses
            className="absolute top-2 right-2 z-10 w-8 h-8 p-0 rounded-md hover:bg-muted/50"
          >
            <X className="h-5 w-5" />
          </Button>

          <Textarea
            ref={textareaRef}
            placeholder="What needs to be done?"
            value={taskText}
            onChange={handleTextareaInput}
            className="min-h-[40px] border-0 focus-visible:ring-0 resize-none text-base pr-10"
            rows={1}
            onInput={(e) => {
              e.currentTarget.style.height = "auto";
              e.currentTarget.style.height =
                e.currentTarget.scrollHeight + "px";
            }}
          />
          <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-sm">
            {/* Disabled action buttons as per UX */}
            <Button variant="ghost" size="sm" disabled className="h-8 gap-1">
              <Flag className="h-4 w-4" />
              <span className="hidden md:inline">Priority</span>
            </Button>
            <Button variant="ghost" size="sm" disabled className="h-8 gap-1">
              <UserRound className="h-4 w-4" />
              <span className="hidden md:inline">Assign</span>
            </Button>
            <Button variant="ghost" size="sm" disabled className="h-8 gap-1">
              <Calendar className="h-4 w-4" />
              <span className="hidden md:inline">Date</span>
            </Button>
            <Button variant="ghost" size="sm" disabled className="h-8 gap-1">
              <Paperclip className="h-4 w-4" />
              <span className="hidden md:inline">Attach</span>
            </Button>
            <Button variant="ghost" size="sm" disabled className="h-8 gap-1">
              <Tag className="h-4 w-4" />
              <span className="hidden md:inline">Tag</span>
            </Button>

            {/* Avatar placeholder */}
            <div
              className={cn(
                "ml-auto w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground",
                (taskText.trim() || isEditing) && "opacity-100 cursor-pointer"
              )}
            >
              JD {/* Placeholder for Avatar initials */}
            </div>

            {/* Footer action buttons */}
            <div className="flex justify-end w-full gap-2 mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelInternal}
                className="h-8"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleAddOrSave}
                disabled={!taskText.trim()} // Only enable if text is present
                className="h-8 gap-1"
              >
                {primaryActionButtonIcon} {primaryActionButtonText}
              </Button>
            </div>
          </div>
        </div>
      )}
      {!isExpanded && (
        <Button
          type="button"
          variant="ghost"
          onClick={handleToggleExpand}
          className="w-full justify-start text-muted-foreground gap-2"
        >
          <Plus className="h-5 w-5" />
          <span>Add a new task...</span>
        </Button>
      )}
    </div>
  );
};

export default NewTaskInput;
