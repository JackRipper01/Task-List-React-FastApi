// src/components/NewTaskInput.tsx

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  X,
  Check, // For "Ok" button when no text
  PlusSquare, // For collapsed state icon
  Maximize, // For "Open" button (expand text field)
  Calendar, // For "Today" button
  Lock, // For "Public" button
  Lightbulb, // For "Highlight" button
  Circle, // For "Estimation" icon
} from "lucide-react";
import { cn } from "@/library/utils";

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

  // Function to expand the input, typically called when clicking the collapsed button
  const handleExpand = () => {
    setIsExpanded(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  // Function to handle "Add" or "OK" button click
  const handlePrimaryAction = () => {
    if (taskText.trim()) {
      // If there's text, it's an "Add" or "Save" action
      if (isEditing && taskId) {
        onSaveEdit(taskId, taskText.trim());
      } else {
        onAddTask(taskText.trim());
      }
      setTaskText("");
      setIsExpanded(false); // Collapse after adding/saving
      onCancel(); // Propagate cancel to clear editingTask from parent
    } else {
      // If no text, it's an "Ok" action, which means cancel/collapse
      handleCancelInternal();
    }
  };

  const handleCancelInternal = () => {
    setTaskText("");
    setIsExpanded(false);
    onCancel(); // Propagate cancel upwards
  };

  // Auto-resize textarea on input
  const handleTextareaInput = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setTaskText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  };

  // Determine if action buttons (and avatar) should be enabled
  const isTyping = taskText.trim().length > 0;

  return (
    <div className="relative">
      {!isExpanded ? (
        // Collapsed State: "Type to add new task" line
        <Button
          type="button"
          variant="ghost"
          onClick={handleExpand}
          className="w-full justify-start text-muted-foreground hover:bg-transparent hover:text-primary gap-2 p-0 h-10 border-b border-primary/20 rounded-none focus-visible:ring-0" // Styling for the single line
        >
          <PlusSquare className="h-5 w-5 text-primary" />{" "}
          {/* Blue plus square icon */}
          <span className="text-base font-normal">
            Type to add new task
          </span>{" "}
          {/* Text */}
        </Button>
      ) : (
        // Expanded State: The full box with textarea, actions, avatar, and footer buttons
        <div className="flex flex-col gap-2 p-3 border rounded-md shadow-sm bg-card transition-all duration-200">
          {/* Textarea */}
          <Textarea
            ref={textareaRef}
            placeholder="What needs to be done?"
            value={taskText}
            onChange={handleTextareaInput}
            className="min-h-[40px] border-0 focus-visible:ring-0 resize-none text-base pr-10"
            rows={1}
          />

          {/* Action Buttons & Avatar (below textarea, inside the same box) */}
          <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-sm border-t border-border pt-2 mt-2">
            {/* Open Button */}
            <Button
              variant="ghost"
              size="sm"
              disabled={!isTyping}
              className={cn(
                "h-8 gap-1 px-2 text-muted-foreground",
                isTyping && "text-foreground hover:bg-accent/50"
              )}
            >
              <Maximize className="h-4 w-4" />
              <span className="hidden md:inline">Open</span>
            </Button>
            {/* Today Button */}
            <Button
              variant="ghost"
              size="sm"
              disabled={!isTyping}
              className={cn(
                "h-8 gap-1 px-2 text-muted-foreground",
                isTyping && "text-foreground hover:bg-accent/50"
              )}
            >
              <Calendar className="h-4 w-4" />
              <span className="hidden md:inline">Today</span>
            </Button>
            {/* Public Button */}
            <Button
              variant="ghost"
              size="sm"
              disabled={!isTyping}
              className={cn(
                "h-8 gap-1 px-2 text-muted-foreground",
                isTyping && "text-foreground hover:bg-accent/50"
              )}
            >
              <Lock className="h-4 w-4" />
              <span className="hidden md:inline">Public</span>
            </Button>
            {/* Highlight Button */}
            <Button
              variant="ghost"
              size="sm"
              disabled={!isTyping}
              className={cn(
                "h-8 gap-1 px-2 text-muted-foreground",
                isTyping && "text-foreground hover:bg-accent/50"
              )}
            >
              <Lightbulb className="h-4 w-4" />
              <span className="hidden md:inline">Highlight</span>
            </Button>
            {/* Estimation Button (custom icon with 0 inside) */}
            <Button
              variant="ghost"
              size="sm"
              disabled={!isTyping}
              className={cn(
                "h-8 gap-1 px-2 text-muted-foreground",
                isTyping && "text-foreground hover:bg-accent/50"
              )}
            >
              <span className="relative inline-flex items-center justify-center">
                <Circle className="h-4 w-4" />
                <span className="absolute text-[8px] font-bold top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  0
                </span>
              </span>
              <span className="hidden md:inline">Estimation</span>
            </Button>

            {/* Avatar placeholder */}
            <div
              className={cn(
                "ml-auto w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground",
                isTyping && "opacity-100 cursor-pointer"
              )}
            >
              JD {/* Placeholder for Avatar initials */}
            </div>

            {/* Footer action buttons (Cancel & OK/Add) */}
            <div className="flex justify-end w-full gap-2 mt-2">
              <Button
                type="button"
                variant="ghost" // "Cancel" is ghost variant
                size="sm"
                onClick={handleCancelInternal}
                className="h-8"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="default" // "OK"/"Add" is default (blue filled)
                size="sm"
                onClick={handlePrimaryAction}
                className="h-8 gap-1"
              >
                {isTyping ? (
                  <Plus className="h-4 w-4" />
                ) : (
                  <Check className="h-4 w-4" />
                )}{" "}
                {/* Icon changes */}
                {isTyping ? "Add" : "Ok"} {/* Text changes */}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewTaskInput;
