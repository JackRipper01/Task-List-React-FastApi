// project/frontend/src/App.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { useAuth } from "@/context/AuthContext";
import { vi, type Mock } from "vitest";

// Mock all internal components of App to render simple text, avoiding their complex trees.
vi.mock("@/components/LoadingScreen", () => ({
  default: vi.fn(() => <div>Mock Loading Screen</div>),
}));
vi.mock("./pages/AuthPage", () => ({
  default: vi.fn(() => <div>Mock Auth Page</div>),
}));
vi.mock("./pages/DashboardPage", () => ({
  default: vi.fn(() => <div>Mock Dashboard Page</div>),
}));
vi.mock("./pages/ResetPasswordPage", () => ({
  default: vi.fn(() => <div>Mock Reset Password Page</div>),
}));
vi.mock("./pages/ConfirmationPage", () => ({
  default: vi.fn(() => <div>Mock Confirmation Page</div>),
}));

// Mock AuthContext hook to control loading/session state
vi.mock("@/context/AuthContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/context/AuthContext")>();
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

const mockUseAuth = useAuth as Mock;

const renderApp = (
  initialEntries = ["/"],
  authState: {
    session: { user: { id: string; email: string } } | null;
    loading: boolean;
  } = { session: null, loading: false }
) => {
  mockUseAuth.mockReturnValue(authState);
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <App />
    </MemoryRouter>
  );
};

describe("App basic rendering and initial redirects (light test)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "location", {
      value: {
        ...window.location,
        hash: "",
        replace: vi.fn(),
      },
      writable: true,
    });
  });

  it("should render LoadingScreen when authentication is loading", async () => {
    renderApp(["/"], { session: null, loading: true });
    await waitFor(() =>
      expect(screen.getByText("Mock Loading Screen")).toBeInTheDocument()
    );
  });

  it("should render AuthPage when unauthenticated and on root path", async () => {
    renderApp(["/"], { session: null, loading: false });
    await waitFor(() =>
      expect(screen.getByText("Mock Auth Page")).toBeInTheDocument()
    );
  });

  it("should render DashboardPage when authenticated and on root path", async () => {
    const mockSession = {
      user: { id: "user1", email: "test@example.com" },
    };
    renderApp(["/"], { session: mockSession, loading: false });
    await waitFor(() =>
      expect(screen.getByText("Mock Dashboard Page")).toBeInTheDocument()
    );
  });

});
