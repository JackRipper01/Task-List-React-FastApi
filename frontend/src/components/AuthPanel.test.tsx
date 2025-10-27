// project/frontend/src/components/AuthPanel.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuthPanel from "./AuthPanel";
import { useAuth, AuthContextProvider } from "@/context/AuthContext";
import { supabase } from "@/services/supabaseClient";
import { BrowserRouter } from "react-router-dom";
import AuthPageHeader from "./AuthPageHeader";
import { WEB_APP_BASE_URL } from "@/services/api";

// NEW: Import vi for mocking and type checking
import { vi, type Mock, type Mocked } from "vitest";
import { useToast, toast } from "@/hooks/use-toast"; // Import the actual functions to mock

// NEW: Mock the entire module and ensure `vi.fn()` is inside the factory
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

vi.mock("@/context/AuthContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/context/AuthContext")>();
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

vi.mock("@/services/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(), // Ensure getSession is mocked
      resetPasswordForEmail: vi.fn(),
      signInWithPassword: vi.fn(), // Add missing mock
      signUp: vi.fn(), // Add missing mock
      signOut: vi.fn(), // Add missing mock
      onAuthStateChange: vi.fn(), // Add missing mock
      updateUser: vi.fn(), // Add missing mock
    },
  },
}));

vi.mock("./AuthPageHeader", () => {
  return {
    __esModule: true,
    default: vi.fn(() => <header>AuthPageHeader content</header>),
  };
});

const mockUseAuth = useAuth as Mock; // Correct type
const mockSupabaseAuth = supabase.auth as Mocked<typeof supabase.auth>; // Correct type
// NEW: Get the mocked toast function using vi.mocked
const mockedToast = vi.mocked(toast);

describe("AuthPanel", () => {
  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <BrowserRouter>
        <AuthContextProvider>{ui}</AuthContextProvider>
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockedToast.mockClear(); // Clear toast calls specifically
    mockUseAuth.mockReturnValue({
      session: null,
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      accessToken: null,
    });
    mockSupabaseAuth.resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: null,
    });
    // Add default mock for getSession since AuthContextProvider uses it
    mockSupabaseAuth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
  });

  // Minimal tests:
  it("should render Sign In form by default", () => {
    renderWithProviders(<AuthPanel />);
    expect(
      screen.getByRole("heading", { name: /sign in to alldone/i })
    ).toBeInTheDocument();
  });

  it("should allow user to type into email and password fields", async () => {
    renderWithProviders(<AuthPanel />);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    await userEvent.type(emailInput, "test@example.com");
    await userEvent.type(passwordInput, "password123");
    expect(emailInput).toHaveValue("test@example.com");
    expect(passwordInput).toHaveValue("password123");
  });

  it('should show an info toast when "Continue with Google" is clicked', async () => {
    renderWithProviders(<AuthPanel />);
    const googleButton = screen.getByRole("button", {
      name: /continue with google/i,
    });
    await userEvent.click(googleButton);
    expect(mockedToast).toHaveBeenCalledWith(
      // Use mockedToast here
      expect.objectContaining({
        title: "Google Auth (Coming Soon)",
        variant: "info",
      })
    );
  });
});
