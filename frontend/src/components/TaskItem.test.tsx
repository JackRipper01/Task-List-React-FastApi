// src/components/TaskItem.test.tsx
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TaskItem from "./TaskItem";
import { BrowserRouter } from "react-router-dom";
import { vi } from "vitest";

// Mock lucide-react icons globally for this test file to avoid direct rendering issues
vi.mock("lucide-react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("lucide-react")>();
  return {
    ...actual,
    Trash2: vi.fn((props) => (
      <svg {...props}>
        <title>{props["aria-label"] || props.title || "trash"}</title>
      </svg>
    )),
    UserRound: vi.fn(() => (
      <svg>
        <title>user</title>
      </svg>
    )),
    Hash: vi.fn(() => (
      <svg>
        <title>hash</title>
      </svg>
    )),
    Mail: vi.fn(() => (
      <svg>
        <title>mail</title>
      </svg>
    )),
    Link: vi.fn(() => (
      <svg>
        <title>link</title>
      </svg>
    )),
  };
});

describe("TaskItem", () => {
  const mockTask = {
    id: "task1",
    text: "Buy groceries #urgent @home",
    completed: false,
  };
  const mockOnToggleComplete = vi.fn();
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper to get the root div of a task item for querying its children or classes
  const getTaskItemRoot = (taskTextPart: string) => {
    const textElement = screen.getByText(taskTextPart, { exact: false });
    // FIX: Cast to HTMLElement
    return textElement.closest(".flex.items-start.gap-3.p-3") as HTMLElement;
  };

  // TDD: Initial Render
  it("should display task text and unchecked checkbox for an incomplete task", () => {
    render(
      <BrowserRouter>
        <TaskItem
          task={mockTask}
          onToggleComplete={mockOnToggleComplete}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          isEditing={false}
        />
      </BrowserRouter>
    );

    expect(screen.getByText(/Buy groceries/i)).toBeInTheDocument();
    expect(screen.getByText("urgent")).toBeInTheDocument(); // For #urgent
    expect(screen.getByText("home")).toBeInTheDocument(); // For @home

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();

    const taskItemRoot = getTaskItemRoot("Buy groceries");
    expect(taskItemRoot).not.toHaveClass("line-through");
  });

  it("should display task text and checked checkbox for a completed task with line-through style", () => {
    const completedTask = { ...mockTask, completed: true };
    render(
      <BrowserRouter>
        <TaskItem
          task={completedTask}
          onToggleComplete={mockOnToggleComplete}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          isEditing={false}
        />
      </BrowserRouter>
    );

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();

    const taskItemRoot = getTaskItemRoot("Buy groceries");
    expect(taskItemRoot).toHaveClass("opacity-70");
    expect(taskItemRoot).toHaveClass("line-through");
    expect(taskItemRoot).toHaveClass("text-muted-foreground");
  });

  // TDD: Interactivity - Toggling Completion
  it("should call onToggleComplete when checkbox is clicked", async () => {
    render(
      <BrowserRouter>
        <TaskItem
          task={mockTask}
          onToggleComplete={mockOnToggleComplete}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          isEditing={false}
        />
      </BrowserRouter>
    );
    const checkbox = screen.getByRole("checkbox");
    await userEvent.click(checkbox);
    expect(mockOnToggleComplete).toHaveBeenCalledWith(mockTask.id, true);
  });

  // TDD: Interactivity - Editing
  it("should call onEdit when the task item is clicked (not in editing mode)", async () => {
    render(
      <BrowserRouter>
        <TaskItem
          task={mockTask}
          onToggleComplete={mockOnToggleComplete}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          isEditing={false}
        />
      </BrowserRouter>
    );
    const taskItemRoot = getTaskItemRoot("Buy groceries");
    await userEvent.click(taskItemRoot);
    expect(mockOnEdit).toHaveBeenCalledWith(mockTask);
  });

  it("should NOT call onEdit when the task item is clicked if it is in editing mode", async () => {
    render(
      <BrowserRouter>
        <TaskItem
          task={mockTask}
          onToggleComplete={mockOnToggleComplete}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          isEditing={true}
        />
      </BrowserRouter>
    );
    const taskItemRoot = getTaskItemRoot("Buy groceries");
    await userEvent.click(taskItemRoot);
    expect(mockOnEdit).not.toHaveBeenCalled();
  });

  // TDD: Interactivity - Deleting
  it("should show delete button on hover and call onDelete when clicked", async () => {
    render(
      <BrowserRouter>
        <TaskItem
          task={mockTask}
          onToggleComplete={mockOnToggleComplete}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          isEditing={false}
        />
      </BrowserRouter>
    );

    const taskItemRoot = getTaskItemRoot("Buy groceries");
    fireEvent.mouseEnter(taskItemRoot);

    const deleteButton = within(taskItemRoot).getByRole("button", {
      name: /delete task/i,
    });
    expect(deleteButton).toBeInTheDocument();
    expect(deleteButton).not.toBeDisabled();

    await userEvent.click(deleteButton);
    expect(mockOnDelete).toHaveBeenCalledWith(mockTask.id);
  });

  it("should NOT show delete button or should disable it when in editing mode", async () => {
    render(
      <BrowserRouter>
        <TaskItem
          task={mockTask}
          onToggleComplete={mockOnToggleComplete}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          isEditing={true}
        />
      </BrowserRouter>
    );

    const taskItemRoot = getTaskItemRoot("Buy groceries");
    const deleteButton = within(taskItemRoot).queryByRole("button", {
      name: /delete task/i,
    });

    await waitFor(() => {
      expect(deleteButton).toBeInTheDocument();
      expect(deleteButton).toBeDisabled();
    });
  });

  it("should prevent event propagation when delete button is clicked", async () => {
    render(
      <BrowserRouter>
        <TaskItem
          task={mockTask}
          onToggleComplete={mockOnToggleComplete}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          isEditing={false}
        />
      </BrowserRouter>
    );
    const taskItemRoot = getTaskItemRoot("Buy groceries");
    fireEvent.mouseEnter(taskItemRoot);
    const deleteButton = within(taskItemRoot).getByRole("button", {
      name: /delete task/i,
    });

    await userEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith(mockTask.id);
    expect(mockOnEdit).not.toHaveBeenCalled();
  });
});
