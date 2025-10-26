// src/components/NewTaskInput.tsx

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
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
  onCancel: () => void;
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
  const [isExpanded, setIsExpanded] = useState(
    isEditing || initialText.length > 0
  );
  const [taskText, setTaskText] = useState(initialText);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Effect to handle initial editing state, text, and focus
  useEffect(() => {
    const shouldExpand = isEditing || initialText.length > 0;
    setIsExpanded(shouldExpand);
    setTaskText(initialText);

    if (shouldExpand) {
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          // Set cursor to end if editing
          textareaRef.current.setSelectionRange(
            initialText.length,
            initialText.length
          );
          // Adjust height immediately
          textareaRef.current.style.height = "auto";
          textareaRef.current.style.height =
            textareaRef.current.scrollHeight + "px";
        }
      }, 0);
    }
  }, [isEditing, initialText]);

  // Handle click outside to collapse
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Only collapse if currently expanded, not in editing mode, and textarea is empty
      if (
        isExpanded &&
        !isEditing &&
        taskText.trim() === "" &&
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        handleCancelInternal();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isExpanded, isEditing, taskText]);

  // Function to handle "Add" or "OK" button click
  const handlePrimaryAction = () => {
    if (taskText.trim()) {
      if (isEditing && taskId) {
        onSaveEdit(taskId, taskText.trim());
      } else {
        onAddTask(taskText.trim());
      }
      setTaskText("");
      setIsExpanded(false);
      onCancel();
    } else {
      handleCancelInternal(); // "Ok" when empty means cancel/collapse
    }
  };

  const handleCancelInternal = () => {
    setTaskText("");
    setIsExpanded(false);
    onCancel();
  };

  // Auto-resize textarea on input
  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTaskText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  };

  const isTyping = taskText.trim().length > 0;

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "relative transition-all duration-200 group",
        isExpanded
          ? "border rounded-md shadow-sm bg-card pt-3 pb-3 px-3" // MODIFIED: Specific padding for expanded box
          : "border-b border-primary/20 rounded-none pb-2"
      )}
    >
      <div className="flex items-start gap-2 relative">
        {/* PlusSquare icon visible only when collapsed */}
        {!isExpanded && (
          <PlusSquare className="h-5 w-5 text-primary mt-2.5 flex-shrink-0 absolute left-0" />
        )}

        <Textarea
          ref={textareaRef}
          placeholder={
            isExpanded ? "What needs to be done?" : "Type to add new task"
          }
          value={taskText}
          onChange={handleTextareaInput}
          onClick={() => {
            if (!isExpanded) setIsExpanded(true);
            textareaRef.current?.focus();
          }}
          onFocus={() => !isExpanded && setIsExpanded(true)}
          onBlur={(e) => {
            if (!isEditing && e.target.value.trim() === "" && isExpanded) {
              setIsExpanded(false);
            }
          }}
          className={cn(
            "w-full resize-none border-0 focus-visible:ring-0 text-base flex-grow bg-transparent",
            "min-h-[40px] py-2",
            !isExpanded && "cursor-pointer text-muted-foreground",
            !isExpanded ? "pl-7 pr-3" : "px-3" // MODIFIED: pl-7 for collapsed, px-3 for expanded for consistent text spacing
          )}
          rows={1}
        />
        {/* REMOVED: Top-right X button */}
      </div>

      {isExpanded && (
        <>
          {/* Action Buttons & Avatar */}
          <div className="flex flex-wrap items-center gap-2 text-sm border-t border-border pt-2 mt-2">
            {/* Open Button */}
            <Button
              variant="ghost"
              size="sm"
              disabled={!isTyping}
              className={cn(
                "h-8 gap-1 px-2",
                !isTyping
                  ? "text-muted-foreground opacity-50 pointer-events-none"
                  : "text-foreground hover:bg-accent/50"
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
                "h-8 gap-1 px-2",
                !isTyping
                  ? "text-muted-foreground opacity-50 pointer-events-none"
                  : "text-foreground hover:bg-accent/50"
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
                "h-8 gap-1 px-2",
                !isTyping
                  ? "text-muted-foreground opacity-50 pointer-events-none"
                  : "text-foreground hover:bg-accent/50"
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
                "h-8 gap-1 px-2",
                !isTyping
                  ? "text-muted-foreground opacity-50 pointer-events-none"
                  : "text-foreground hover:bg-accent/50"
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
                "h-8 gap-1 px-2",
                !isTyping
                  ? "text-muted-foreground opacity-50 pointer-events-none"
                  : "text-foreground hover:bg-accent/50"
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
                !isTyping
                  ? "opacity-50 pointer-events-none"
                  : "opacity-100 cursor-pointer"
              )}
            >
              JD {/* Placeholder for Avatar initials */}
            </div>
          </div>

          {/* Footer action buttons (Cancel & OK/Add) */}
          <div className="flex justify-end w-full gap-2 mt-2">
            <Button
              type="button"
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
              onClick={handlePrimaryAction}
              className="h-8 gap-1"
            >
              {isTyping ? (
                <Plus className="h-4 w-4" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {isTyping ? "Add" : "Ok"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default NewTaskInput;
