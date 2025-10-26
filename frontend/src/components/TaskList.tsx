// project/frontend/alldone-task-list/src/components/TaskList.tsx

import React, { useState, useEffect, useRef } from "react"; // NEW: useRef
import NewTaskInput from "./NewTaskInput";
import TaskItem from "./TaskItem";
import EmptyListMessage from "./EmptyListMessage";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/services/api";

interface Task {
  id: string;
  text: string;
  completed: boolean;
  user_id: string;
  created_at: string;
}

const TaskList: React.FC = () => {
  const { user, accessToken, loading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingTask, setEditingTask] = useState<{
    id: string;
    text: string;
  } | null>(null);
  const [fetchingTasks, setFetchingTasks] = useState(true);

  // NEW: Ref to track if tasks have been fetched for a specific user ID
  const hasFetchedRef = useRef<Record<string, boolean>>({});

  // Helper function to safely get error message from unknown error
  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
      return error.message;
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

  // Fetch tasks when user.id or accessToken changes, but only once per user.id
  useEffect(() => {
    const userId = user?.id;

    const fetchTasks = async () => {
      // If no user ID or accessToken, clear tasks and reset state
      if (!userId || !accessToken) {
        setTasks([]);
        setFetchingTasks(false);
        hasFetchedRef.current = {}; // Clear fetched status for any user if no user is logged in
        return;
      }

      // Only fetch if we haven't fetched for this specific user ID yet
      if (hasFetchedRef.current[userId]) {
        setFetchingTasks(false); // Already fetched for this user ID, no need to re-fetch
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
        hasFetchedRef.current[userId] = true; // Mark as fetched for this user ID
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error);
        console.error("Failed to fetch tasks:", errorMessage);
        toast({
          title: "Error fetching tasks",
          description: errorMessage,
          variant: "destructive",
        });
        setTasks([]); // Clear tasks on error
        hasFetchedRef.current[userId] = false; // Allow retry if fetch failed
      } finally {
        setFetchingTasks(false);
      }
    };

    // Trigger fetch only if AuthContext is not loading AND we have a user ID and accessToken
    // This will run:
    // 1. On initial component mount *after* AuthContext is done loading and a user is present.
    // 2. When `user.id` changes (e.g., logout then login as different user).
    // It will NOT run if only `accessToken` changes due to refresh (as user.id is same),
    // because `hasFetchedRef.current[userId]` will already be true.
    if (!loading && userId && accessToken) {
      fetchTasks();
    } else if (!loading && !userId) {
      // If not loading and no user, ensure tasks are cleared
      setTasks([]);
      setFetchingTasks(false);
      hasFetchedRef.current = {}; // Clear all fetched flags if no user is logged in
    }
  }, [user?.id, accessToken, loading]); // Dependencies: user.id (for user identity), accessToken (for auth header), loading (from AuthContext)

  const handleAddTask = async (text: string) => {
    if (!user || !accessToken) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to add tasks.",
        variant: "warning",
      });
      return;
    }

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
      setTasks((prev) =>
        [...prev, newTask].sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      );
      toast({
        title: "Task Added",
        description: "Your task has been successfully added.",
        variant: "success",
      });
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      console.error("Failed to add task:", errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setEditingTask(null);
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

    const taskToUpdate = tasks.find((t) => t.id === id);
    if (!taskToUpdate) {
      toast({
        title: "Error updating task",
        description: "Task not found locally.",
        variant: "destructive",
      });
      return;
    }

    const updatedFields: Partial<Task> = { text: newText };
    if (completed !== undefined) {
      updatedFields.completed = completed;
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

      const updatedTask: Task = await response.json();
      setTasks((prev) =>
        prev
          .map((task) => (task.id === id ? updatedTask : task))
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
      toast({
        title: "Error updating task",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setEditingTask(null);
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

    const taskToUpdate = tasks.find((t) => t.id === id);
    if (!taskToUpdate) {
      toast({
        title: "Error updating task",
        description: "Task not found locally.",
        variant: "destructive",
      });
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

      const updatedTask: Task = await response.json();
      setTasks((prev) =>
        prev
          .map((task) => (task.id === id ? updatedTask : task))
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
      toast({
        title: "Error toggling task status",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!user || !accessToken) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to delete tasks.",
        variant: "warning",
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

      setTasks((prev) => prev.filter((task) => task.id !== id));
      toast({
        title: "Task Deleted",
        description: "Your task has been successfully removed.",
        variant: "success",
      });
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      console.error("Failed to delete task:", errorMessage);
      toast({
        title: "Error deleting task",
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

  if (loading || fetchingTasks) {
    return (
      <div className="p-4 flex flex-col gap-4">
        <NewTaskInput
          onAddTask={handleAddTask}
          onSaveEdit={handleUpdateTask}
          onCancel={handleCancelEdit}
          isEditing={false}
        />
        <EmptyListMessage />
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
        {tasks.length === 0 ? (
          <EmptyListMessage />
        ) : (
          tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggleComplete={handleToggleComplete}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
              isEditing={editingTask?.id === task.id}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default TaskList;
