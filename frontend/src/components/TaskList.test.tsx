// project/frontend/src/components/TaskList.test.tsx
import {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
  waitForElementToBeRemoved,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TaskList from "./TaskList";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/services/api";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { BrowserRouter } from "react-router-dom";

import { vi, type Mock, type Mocked } from "vitest";
import { useToast, toast } from "@/hooks/use-toast";
import { Loader2, PlusSquare, Trash2 } from "lucide-react"; // Import used Lucide icons

vi.mock("@/hooks/use-toast", () => {
  const mockToastFn = vi.fn();
  return {
    useToast: vi.fn(() => ({
      toast: mockToastFn,
      toasts: [],
      dismiss: vi.fn(),
    })),
    toast: mockToastFn,
  };
});

// Mock AuthContext
vi.mock("@/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

// Mock AuthPageHeader to avoid rendering its internals in TaskList tests
vi.mock("@/components/AuthPageHeader", () => {
  return {
    __esModule: true,
    default: vi.fn(() => <header>Mock Auth Page Header</header>),
  };
});

// Mock Lucide icons used by components that TaskList renders
vi.mock("lucide-react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("lucide-react")>();
  return {
    ...actual,
    // FIX: Ensure data-testid and other props are correctly passed to the SVG
    Loader2: vi.fn((props) => (
      <svg {...props} data-testid={props["data-testid"]}>
        <title>{props.title || "loader spinner"}</title>
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
    )),
    PlusSquare: vi.fn((props) => (
      <svg {...props} data-testid={props["data-testid"]}>
        <title>{props["aria-label"] || props.title || "add new task"}</title>
      </svg>
    )),
    Trash2: vi.fn((props) => (
      <svg {...props} data-testid={props["data-testid"]}>
        <title>{props["aria-label"] || props.title || "delete task"}</title>
      </svg>
    )),
    // Mock other icons used by NewTaskInput, which is rendered by TaskList
    Check: vi.fn((props) => (
      <svg {...props}>
        <title>{props.title || "check"}</title>
      </svg>
    )),
    Plus: vi.fn((props) => (
      <svg {...props}>
        <title>{props.title || "plus"}</title>
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

const mockUseAuth = useAuth as Mock;
const mockedToast = vi.mocked(toast);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const handlers = [
  http.get(`${API_BASE_URL}/tasks/`, ({ request }) => {
    if (request.headers.get("Authorization") === "Bearer valid-token") {
      return HttpResponse.json([
        {
          id: "1",
          text: "Existing task 1",
          completed: false,
          user_id: "user123",
          created_at: "2023-01-01T10:00:00Z",
          updated_at: "2023-01-01T10:00:00Z",
        },
        {
          id: "2",
          text: "Completed task 2",
          completed: true,
          user_id: "user123",
          created_at: "2023-01-02T11:00:00Z",
          updated_at: "2023-01-02T11:00:00Z",
        },
      ]);
    }
    return HttpResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }),
  http.post(`${API_BASE_URL}/tasks/`, async ({ request }) => {
    const body = (await request.json()) as { text: string };
    const { text } = body;
    if (request.headers.get("Authorization") === "Bearer valid-token") {
      const newTask = {
        id: `new-${Date.now()}`,
        text,
        completed: false,
        user_id: "user123",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return HttpResponse.json(newTask, { status: 201 });
    }
    return HttpResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }),
  http.put(`${API_BASE_URL}/tasks/:id`, async ({ request, params }) => {
    const { id } = params;
    const updateData = (await request.json()) as {
      text?: string;
      completed?: boolean;
    };
    if (request.headers.get("Authorization") === "Bearer valid-token") {
      const updatedTask = {
        id: String(id),
        text: "Updated text",
        completed: false,
        user_id: "user123",
        created_at: "2023-01-01T10:00:00Z",
        updated_at: new Date().toISOString(),
        ...updateData,
      };
      return HttpResponse.json(updatedTask);
    }
    return HttpResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }),
  http.delete(`${API_BASE_URL}/tasks/:id`, ({ request, params }) => {
    const { id } = params;
    if (request.headers.get("Authorization") === "Bearer valid-token") {
      return new HttpResponse(null, { status: 204 });
    }
    return HttpResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }),
];

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  queryClient.clear();
  vi.clearAllMocks();
  mockedToast.mockClear();
});
afterAll(() => server.close());

const renderTaskList = (
  authProps: {
    user: { id: string; email: string } | null;
    accessToken: string | null;
    loading: boolean;
  } = { user: null, accessToken: null, loading: false }
) => {
  mockUseAuth.mockReturnValue(authProps);
  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <TaskList />
      </QueryClientProvider>
    </BrowserRouter>
  );
};

const getTaskItemRootByText = (text: string) => {
  const textElement = screen.getByText(text, { exact: false });
  return textElement.closest(".flex.items-start.gap-3.p-3") as HTMLElement;
};

describe("TaskList (Light Tests)", () => {

  it("should fetch and display tasks for an authenticated user", async () => {
    renderTaskList({
      user: { id: "user123", email: "test@example.com" },
      accessToken: "valid-token",
      loading: false,
    });
    await waitFor(() =>
      expect(screen.getByText(/Existing task 1/i)).toBeInTheDocument()
    );
    expect(screen.getByText(/Completed task 2/i)).toBeInTheDocument();
  });

  it("should display no tasks if user is not authenticated", async () => {
    renderTaskList({ user: null, accessToken: null, loading: false });
    await waitFor(() =>
      expect(
        screen.queryByText(/loading your tasks.../i)
      ).not.toBeInTheDocument()
    );
    expect(screen.queryByText(/Existing task 1/i)).not.toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Type to add new task/i)
    ).toBeInTheDocument();
  });

  it("should allow adding a new task (happy path)", async () => {
    renderTaskList({
      user: { id: "user123", email: "test@example.com" },
      accessToken: "valid-token",
      loading: false,
    });
    await waitFor(() =>
      expect(screen.getByText(/Existing task 1/i)).toBeInTheDocument()
    );

    const textarea = screen.getByPlaceholderText(/Type to add new task/i);
    await userEvent.type(textarea, "My new task");
    await userEvent.click(screen.getByRole("button", { name: /Add/i }));

    await waitFor(() =>
      expect(screen.getByText(/My new task/i)).toBeInTheDocument()
    );
    expect(textarea).toHaveValue("");
  });

  it("should allow toggling a task to complete (happy path)", async () => {
    renderTaskList({
      user: { id: "user123", email: "test@example.com" },
      accessToken: "valid-token",
      loading: false,
    });
    await waitFor(() =>
      expect(screen.getByText(/Existing task 1/i)).toBeInTheDocument()
    );
    const taskItemRoot = getTaskItemRootByText("Existing task 1");
    const checkbox = within(taskItemRoot).getByRole("checkbox");

    await userEvent.click(checkbox);
    await waitFor(() => expect(taskItemRoot).toHaveClass("line-through"));
    expect(checkbox).toBeChecked();
  });

  it("should allow editing an existing task (happy path)", async () => {
    renderTaskList({
      user: { id: "user123", email: "test@example.com" },
      accessToken: "valid-token",
      loading: false,
    });
    await waitFor(() =>
      expect(screen.getByText(/Existing task 1/i)).toBeInTheDocument()
    );
    const taskItemTextElement = screen.getByText(/Existing task 1/i);

    await userEvent.click(taskItemTextElement);
    const editInput = screen.getByDisplayValue("Existing task 1");
    await userEvent.clear(editInput);
    await userEvent.type(editInput, "Edited task text");
    await userEvent.click(screen.getByRole("button", { name: /Save/i }));

    await waitFor(() =>
      expect(screen.getByText(/Edited task text/i)).toBeInTheDocument()
    );
    expect(
      screen.queryByDisplayValue("Edited task text")
    ).not.toBeInTheDocument();
  });


});
