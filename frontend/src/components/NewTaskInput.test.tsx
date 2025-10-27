// project/frontend/src/components/NewTaskInput.test.tsx
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NewTaskInput from "./NewTaskInput";
import { BrowserRouter } from "react-router-dom";
import { vi, type Mock } from "vitest";

// Mock lucide-react icons globally for this test file to provide accessible names
vi.mock("lucide-react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("lucide-react")>();
  return {
    ...actual,
    PlusSquare: vi.fn((props) => (
      <svg {...props}>
        <title>{props["aria-label"] || props.title || "plus square"}</title>
      </svg>
    )),
    Save: vi.fn((props) => (
      <svg {...props}>
        <title>{props["aria-label"] || props.title || "save"}</title>
      </svg>
    )),
    Plus: vi.fn((props) => (
      <svg {...props}>
        <title>{props["aria-label"] || props.title || "plus"}</title>
      </svg>
    )),
    Check: vi.fn((props) => (
      <svg {...props}>
        <title>{props["aria-label"] || props.title || "check"}</title>
      </svg>
    )),
    Maximize: vi.fn((props) => (
      <svg {...props}>
        <title>{props.title || "maximize"}</title>
      </svg>
    )),
    Calendar: vi.fn((props) => (
      <svg {...props}>
        <title>{props.title || "calendar"}</title>
      </svg>
    )),
    Lock: vi.fn((props) => (
      <svg {...props}>
        <title>{props.title || "lock"}</title>
      </svg>
    )),
    Lightbulb: vi.fn((props) => (
      <svg {...props}>
        <title>{props.title || "lightbulb"}</title>
      </svg>
    )),
    Circle: vi.fn((props) => (
      <svg {...props}>
        <title>{props.title || "circle"}</title>
      </svg>
    )),
  };
});

describe("NewTaskInput", () => {
  const mockOnAddTask = vi.fn();
  const mockOnSaveEdit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderNewTaskInput = (props = {}) => {
    return render(
      <BrowserRouter>
        <NewTaskInput
          onAddTask={mockOnAddTask}
          onSaveEdit={mockOnSaveEdit}
          onCancel={mockOnCancel}
          {...props}
        />
      </BrowserRouter>
    );
  };

  it('should render expanded with "Add" button if initialText is provided but not in editing mode', async () => {
    renderNewTaskInput({ initialText: "Existing task", isEditing: false });
    const textarea = screen.getByDisplayValue("Existing task");
    expect(textarea).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /add/i })).toBeInTheDocument()
    );
    expect(
      screen.queryByRole("img", { name: "Add new task" })
    ).not.toBeInTheDocument();
  });

  it('should render expanded with "Save" button if in editing mode', async () => {
    renderNewTaskInput({
      initialText: "Task to edit",
      isEditing: true,
      taskId: "task-123",
    });
    const textarea = screen.getByDisplayValue("Task to edit");
    expect(textarea).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    );
  });

  it("should expand when textarea is clicked/focused", async () => {
    renderNewTaskInput();
    const textarea = screen.getByPlaceholderText(/type to add new task/i);
    await userEvent.click(textarea);
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ok/i })).toBeInTheDocument();
  });

  it("should collapse and call onCancel when clicked outside with empty text", async () => {
    render(
      <div>
        <NewTaskInput
          onAddTask={mockOnAddTask}
          onSaveEdit={mockOnSaveEdit}
          onCancel={mockOnCancel}
        />
        <div data-testid="outside-element">Click outside</div>
      </div>,
      { wrapper: BrowserRouter }
    );
    await userEvent.click(screen.getByPlaceholderText(/type to add new task/i));
    await userEvent.click(screen.getByTestId("outside-element"));
    expect(
      screen.queryByRole("button", { name: /cancel/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /ok/i })
    ).not.toBeInTheDocument();
    await waitFor(() => expect(mockOnCancel).toHaveBeenCalledTimes(1));
  });

  it("should NOT collapse when clicked outside if text is present", async () => {
    render(
      <div>
        <NewTaskInput
          onAddTask={mockOnAddTask}
          onSaveEdit={mockOnSaveEdit}
          onCancel={mockOnCancel}
        />
        <div data-testid="outside-element">Click outside</div>
      </div>,
      { wrapper: BrowserRouter }
    );
    const textarea = screen.getByPlaceholderText(/type to add new task/i);
    await userEvent.type(textarea, "Some text");
    await userEvent.click(screen.getByTestId("outside-element"));
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add/i })).toBeInTheDocument();
    await waitFor(() => expect(mockOnCancel).not.toHaveBeenCalled());
  });

  it("should NOT collapse when clicked outside if in editing mode", async () => {
    render(
      <div>
        <NewTaskInput
          onAddTask={mockOnAddTask}
          onSaveEdit={mockOnSaveEdit}
          onCancel={mockOnCancel}
          initialText="Editing this"
          isEditing={true}
          taskId="task-123"
        />
        <div data-testid="outside-element">Click outside</div>
      </div>,
      { wrapper: BrowserRouter }
    );
    await userEvent.click(screen.getByTestId("outside-element"));
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    await waitFor(() => expect(mockOnCancel).not.toHaveBeenCalled());
  });

  it('should call onAddTask and reset state on "Add" button click', async () => {
    renderNewTaskInput();
    const textarea = screen.getByPlaceholderText(/type to add new task/i);
    await userEvent.type(textarea, "New task to add");
    await userEvent.click(screen.getByRole("button", { name: /add/i }));
    expect(mockOnAddTask).toHaveBeenCalledWith("New task to add");
    expect(textarea).toHaveValue("");
    expect(
      screen.queryByRole("button", { name: /add/i })
    ).not.toBeInTheDocument();
    await waitFor(() => expect(mockOnCancel).toHaveBeenCalledTimes(1));
  });

  it('should call onCancel if text is empty when "Ok" is clicked', async () => {
    renderNewTaskInput();
    const textarea = screen.getByPlaceholderText(/type to add new task/i);
    await userEvent.click(textarea);
    await userEvent.click(screen.getByRole("button", { name: /ok/i }));
    expect(mockOnAddTask).not.toHaveBeenCalled();
    await waitFor(() => expect(mockOnCancel).toHaveBeenCalledTimes(1));
    expect(
      screen.queryByRole("button", { name: /ok/i })
    ).not.toBeInTheDocument();
  });

  it('should call onSaveEdit and reset state on "Save" button click when editing', async () => {
    renderNewTaskInput({
      initialText: "Original text",
      isEditing: true,
      taskId: "task-456",
    });
    const textarea = screen.getByDisplayValue("Original text");
    await userEvent.clear(textarea);
    await userEvent.type(textarea, "Updated text");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(mockOnSaveEdit).toHaveBeenCalledWith("task-456", "Updated text");
    expect(textarea).toHaveValue("");
    expect(
      screen.queryByRole("button", { name: /save/i })
    ).not.toBeInTheDocument();
    await waitFor(() => expect(mockOnCancel).toHaveBeenCalledTimes(1));
  });

  it('should disable "Save" button if text is empty when editing', async () => {
    renderNewTaskInput({
      initialText: "Original text",
      isEditing: true,
      taskId: "task-456",
    });
    const textarea = screen.getByDisplayValue("Original text");
    await userEvent.clear(textarea);
    const saveButton = screen.getByRole("button", { name: /save/i });
    expect(saveButton).toBeDisabled();
    await userEvent.click(saveButton);
    await waitFor(() => expect(mockOnSaveEdit).not.toHaveBeenCalled());
  });

  it('should call onCancel and reset state on "Cancel" button click', async () => {
    renderNewTaskInput();
    const textarea = screen.getByPlaceholderText(/type to add new task/i);
    await userEvent.type(textarea, "Text to cancel");
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(textarea).toHaveValue("");
    expect(
      screen.queryByRole("button", { name: /cancel/i })
    ).not.toBeInTheDocument();
    await waitFor(() => expect(mockOnCancel).toHaveBeenCalledTimes(1));
  });

  it("should show styled text in the overlay matching the input text", async () => {
    renderNewTaskInput();
    const textarea = screen.getByPlaceholderText(/type to add new task/i);
    await userEvent.type(textarea, "Meeting @Alice for #project");
    const styledDiv = textarea.previousElementSibling as HTMLElement;
    expect(styledDiv).toBeInTheDocument();
    expect(styledDiv).toHaveTextContent("Meeting @Alice for #project");
    expect(within(styledDiv).getByText("@Alice")).toHaveClass(
      "text-tag-mention-text",
      "font-semibold"
    );
    expect(within(styledDiv).getByText("#project")).toHaveClass(
      "text-tag-hashtag-text",
      "font-semibold"
    );
  });
});
