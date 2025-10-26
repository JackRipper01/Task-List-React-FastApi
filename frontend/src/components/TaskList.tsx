// project/frontend/alldone-task-list/src/components/TaskList.tsx

import React, { useState, useEffect, useRef, useCallback } from "react";
import NewTaskInput from "./NewTaskInput";
import TaskItem from "./TaskItem";
// import EmptyListMessage from "./EmptyListMessage"; // REMOVED: No longer needed
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/services/api";
import { Loader2 } from "lucide-react";

interface Task {
  id: string;
  text: string;
  completed: boolean;
  user_id: string;
  created_at: string;
  status?: "pending-add" | "pending-update";
  original?: Task;
}

const TaskList: React.FC = () => {
  const { user, accessToken, loading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingTask, setEditingTask] = useState<{
    id: string;
    text: string;
  } | null>(null);
  const [fetchingTasks, setFetchingTasks] = useState(true);

  const hasFetchedRef = useRef<Record<string, boolean>>({});
  const tasksRef = useRef<Task[]>([]); // Ref to hold the current tasks state

  // Keep tasksRef updated with the latest tasks state
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
      return error.message;
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "detail" in error &&
      typeof (error as { detail: unknown }).detail === "string"
    ) {
      return (error as { detail: string }).detail;
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof (error as { message: unknown }).message === "string"
    ) {
      return (error as { message: string }).message;
    }
    return "An unexpected error occurred.";
  };

  useEffect(() => {
    const userId = user?.id;

    const fetchTasks = async () => {
      if (!userId || !accessToken) {
        setTasks([]);
        setFetchingTasks(false);
        hasFetchedRef.current = {};
        return;
      }

      if (hasFetchedRef.current[userId]) {
        setFetchingTasks(false);
        return;
      }

      setFetchingTasks(true);
      try {
        const response = await fetch(`${API_BASE_URL}/tasks/`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorBody = await response
            .json()
            .catch(() => ({ detail: response.statusText }));
          throw new Error(errorBody.detail || response.statusText);
        }

        const data: Task[] = await response.json();
        setTasks(
          data.sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
          )
        );
        toast({
          title: "Tasks Loaded",
          description: "Your tasks have been retrieved successfully.",
          variant: "info",
        });
        hasFetchedRef.current[userId] = true;
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error);
        console.error("Failed to fetch tasks:", errorMessage);
        toast({
          title: "Error fetching tasks",
          description: errorMessage,
          variant: "destructive",
        });
        setTasks([]);
        hasFetchedRef.current[userId] = false;
      } finally {
        setFetchingTasks(false);
      }
    };

    if (!authLoading && userId && accessToken) {
      fetchTasks();
    } else if (!authLoading && !userId) {
      setTasks([]);
      setFetchingTasks(false);
      hasFetchedRef.current = {};
    }
  }, [user?.id, accessToken, authLoading]);

  const handleDeleteTask = useCallback(
    async (id: string) => {
      if (!user || !accessToken) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to delete tasks.",
          variant: "warning",
        });
        return;
      }

      const taskToDelete = tasksRef.current.find((t) => t.id === id);
      if (!taskToDelete) {
        return;
      }

      setTasks((prev) => prev.filter((task) => task.id !== id));

      if (id.startsWith("temp-")) {
        toast({
          title: "Task Removed",
          description: "Optimistically added task removed.",
          variant: "info",
        });
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          const errorBody = await response
            .json()
            .catch(() => ({ detail: response.statusText }));
          throw new Error(errorBody.detail || response.statusText);
        }

        toast({
          title: "Task Deleted",
          description: "Your task has been successfully removed.",
          variant: "success",
        });
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error);
        console.error("Failed to delete task:", errorMessage);
        setTasks((prev) =>
          [...prev, { ...taskToDelete, status: undefined }].sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
          )
        );
        toast({
          title: "Error deleting task",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
    [user, accessToken]
  );

  const handleAddTask = async (text: string) => {
    if (!user || !accessToken) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to add tasks.",
        variant: "warning",
      });
      return;
    }

    const tempId = `temp-${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const optimisticTask: Task = {
      id: tempId,
      text,
      completed: false,
      user_id: user.id,
      created_at: now,
      status: "pending-add",
    };

    setTasks((prev) =>
      [...prev, optimisticTask].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    );
    setEditingTask(null);

    try {
      const response = await fetch(`${API_BASE_URL}/tasks/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errorBody = await response
          .json()
          .catch(() => ({ detail: response.statusText }));
        throw new Error(errorBody.detail || response.statusText);
      }

      const newTask: Task = await response.json();

      const currentTasksAfterAdd = tasksRef.current;
      const tempTaskStillPresent = currentTasksAfterAdd.some(
        (task) => task.id === tempId
      );

      if (!tempTaskStillPresent) {
        try {
          await fetch(`${API_BASE_URL}/tasks/${newTask.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          toast({
            title: "Task Deleted (post-add)",
            description:
              "A newly created task was instantly removed as requested.",
            variant: "info",
          });
        } catch (deleteError) {
          console.error("Failed to delete ghost task:", deleteError);
          toast({
            title: "Error cleaning up task",
            description:
              "A task created and immediately deleted could not be removed from backend.",
            variant: "destructive",
          });
        }
      } else {
        setTasks((prev) =>
          prev
            .map((task) =>
              task.id === tempId ? { ...newTask, status: undefined } : task
            )
            .sort(
              (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime()
            )
        );
        toast({
          title: "Task Added",
          description: "Your task has been successfully added.",
          variant: "success",
        });
      }
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      console.error("Failed to add task:", errorMessage);
      setTasks((prev) => prev.filter((task) => task.id !== tempId));
      toast({
        title: "Error adding task",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleUpdateTask = async (
    id: string,
    newText: string,
    completed?: boolean
  ) => {
    if (!user || !accessToken) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to update tasks.",
        variant: "warning",
      });
      return;
    }

    const taskIndex = tasks.findIndex((t) => t.id === id);
    if (taskIndex === -1) {
      toast({
        title: "Error updating task",
        description: "Task not found locally.",
        variant: "destructive",
      });
      return;
    }

    const originalTask = tasks[taskIndex];
    const updatedFields: Partial<Task> = { text: newText };
    if (completed !== undefined) {
      updatedFields.completed = completed;
    }

    setTasks((prev) =>
      prev
        .map((task) => {
          if (task.id === id) {
            const updatedOptimisticTask: Task = {
              ...task,
              ...updatedFields,
              status: "pending-update",
              original: originalTask,
            };
            return updatedOptimisticTask;
          }
          return task;
        })
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
    );
    setEditingTask(null);

    if (id.startsWith("temp-")) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedFields),
      });

      if (!response.ok) {
        const errorBody = await response
          .json()
          .catch(() => ({ detail: response.statusText }));
        throw new Error(errorBody.detail || response.statusText);
      }

      const backendUpdatedTask: Task = await response.json();
      setTasks((prev) =>
        prev
          .map((task) =>
            task.id === id
              ? {
                  ...backendUpdatedTask,
                  status: undefined,
                  original: undefined,
                }
              : task
          )
          .sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
          )
      );
      toast({
        title: "Task Updated",
        description: "Your task has been successfully updated.",
        variant: "success",
      });
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      console.error("Failed to update task:", errorMessage);
      setTasks((prev) =>
        prev
          .map((task) =>
            task.id === id && task.original
              ? { ...task.original, status: undefined }
              : task
          )
          .sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
          )
      );
      toast({
        title: "Error updating task",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleToggleComplete = async (id: string, completed: boolean) => {
    if (!user || !accessToken) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to update tasks.",
        variant: "warning",
      });
      return;
    }

    const taskIndex = tasks.findIndex((t) => t.id === id);
    if (taskIndex === -1) {
      toast({
        title: "Error updating task status",
        description: "Task not found locally.",
        variant: "destructive",
      });
      return;
    }

    const originalTask = tasks[taskIndex];

    setTasks((prev) =>
      prev.map((task) => {
        if (task.id === id) {
          const updatedOptimisticTask: Task = {
            ...task,
            completed: completed,
            status: "pending-update",
            original: originalTask,
          };
          return updatedOptimisticTask;
        }
        return task;
      })
    );

    if (id.startsWith("temp-")) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ completed: completed }),
      });

      if (!response.ok) {
        const errorBody = await response
          .json()
          .catch(() => ({ detail: response.statusText }));
        throw new Error(errorBody.detail || response.statusText);
      }

      const backendUpdatedTask: Task = await response.json();
      setTasks((prev) =>
        prev
          .map((task) =>
            task.id === id
              ? {
                  ...backendUpdatedTask,
                  status: undefined,
                  original: undefined,
                }
              : task
          )
          .sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
          )
      );
      toast({
        title: "Task Status Updated",
        description: `Task marked as ${
          completed ? "completed" : "incomplete"
        }.`,
        variant: "info",
      });
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      console.error("Failed to toggle task completion:", errorMessage);
      setTasks((prev) =>
        prev.map((task) =>
          task.id === id && task.original
            ? { ...task.original, status: undefined }
            : task
        )
      );
      toast({
        title: "Error toggling task status",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleEditTask = (task: { id: string; text: string }) => {
    setEditingTask(task);
  };

  const handleCancelEdit = () => {
    setEditingTask(null);
  };

  if (fetchingTasks) {
    return (
      <div className="p-4 flex flex-col items-center justify-center gap-4 min-h-[150px] text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p>Loading your tasks...</p>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <NewTaskInput
        onAddTask={handleAddTask}
        onSaveEdit={handleUpdateTask}
        onCancel={handleCancelEdit}
        initialText={editingTask?.text || ""}
        isEditing={!!editingTask}
        taskId={editingTask?.id}
      />
      <div className="flex flex-col gap-2">
        {tasks.length === 0
          ? // <EmptyListMessage /> // REMOVED: EmptyListMessage
            null // MODIFIED: Render null instead of EmptyListMessage
          : tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggleComplete={handleToggleComplete}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
                isEditing={editingTask?.id === task.id}
              />
            ))}
      </div>
    </div>
  );
};

export default TaskList;
