// project/frontend/src/context/AuthContext.test.tsx
import { renderHook, act, waitFor } from "@testing-library/react";
import { AuthContextProvider, useAuth } from "./AuthContext";
import { supabase } from "@/services/supabaseClient";
import { WEB_APP_BASE_URL } from "@/services/api";
import { BrowserRouter } from "react-router-dom";
import { vi, type Mock, type Mocked } from "vitest";
import { useToast, toast } from "@/hooks/use-toast";
import {
  Session,
  User,
  AuthChangeEvent,
  Subscription,
} from "@supabase/supabase-js";

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

vi.mock("@/services/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(),
      updateUser: vi.fn(),
      resetPasswordForEmail: vi.fn(),
    },
  },
}));

const mockSupabaseAuth = supabase.auth as Mocked<typeof supabase.auth>;
const mockedToast = vi.mocked(toast);

describe("AuthContext", () => {
  const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <BrowserRouter>
      <AuthContextProvider>{children}</AuthContextProvider>
    </BrowserRouter>
  );

  let onAuthStateChangeCallback: (
    event: AuthChangeEvent,
    session: Session | null
  ) => void = vi.fn();
  let unsubscribeMock: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    mockedToast.mockClear();
    unsubscribeMock = vi.fn();

    // Reset all supabase.auth mocks for a clean slate before each test.
    // Ensure all mocks return promises or expected data structures.
    mockSupabaseAuth.getSession
      .mockReset()
      .mockResolvedValue({ data: { session: null }, error: null });
    mockSupabaseAuth.signInWithPassword
      .mockReset()
      .mockResolvedValue({ data: { session: null, user: null }, error: null });
    mockSupabaseAuth.signUp
      .mockReset()
      .mockResolvedValue({ data: { user: null, session: null }, error: null });
    mockSupabaseAuth.signOut.mockReset().mockResolvedValue({ error: null });
    mockSupabaseAuth.updateUser
      .mockReset()
      .mockResolvedValue({ data: { user: null }, error: null });
    mockSupabaseAuth.resetPasswordForEmail
      .mockReset()
      .mockResolvedValue({ data: null, error: null });

    mockSupabaseAuth.onAuthStateChange.mockImplementation((callback) => {
      onAuthStateChangeCallback = callback;
      const mockSubscription: Subscription = {
        id: "mock-subscription-id",
        callback: vi.fn(),
        unsubscribe: unsubscribeMock,
      };
      // For onAuthStateChange, data.subscription should be returned
      return { data: { subscription: mockSubscription } };
    });

    // Manually trigger the initial session event from the mock to simulate context initialization
    act(() => {
      onAuthStateChangeCallback("INITIAL_SESSION", null);
    });
  });

  it("should initialize with loading true and no user/session, then resolve loading to false", async () => {
    // This test specifically checks the initial loading state.
    // `getSession` is already mocked in beforeEach, but if needed for this test specifically
    // you could mock it again with `.mockResolvedValueOnce`
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();

    // Wait for the asynchronous actions (getSession and onAuthStateChange) to complete
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockSupabaseAuth.getSession).toHaveBeenCalledTimes(1); // Ensure getSession was called
  });


  it("should call signUp on signup attempt (email confirmation expected)", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const mockUser: User = {
      id: "user2",
      email: "new@example.com",
      aud: "authenticated",
      role: "authenticated",
      created_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      app_metadata: {},
      user_metadata: {},
      confirmation_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      email_confirmed_at: null,
      phone: null,
      factors: [],
    };
    mockSupabaseAuth.signUp.mockResolvedValueOnce({
      data: { user: mockUser, session: null },
      error: null,
    });

    await act(async () => {
      await result.current.signUp(
        "new@example.com",
        "newpassword",
        `${WEB_APP_BASE_URL}/confirmation`
      );
      // Simulate that after signup, the user is NOT immediately signed in (email confirmation needed)
      onAuthStateChangeCallback("SIGNED_OUT", null);
    });

    expect(mockSupabaseAuth.signUp).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "newpassword",
      options: { emailRedirectTo: `${WEB_APP_BASE_URL}/confirmation` },
    });
    await waitFor(() =>
      expect(mockedToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "info" })
      )
    );
    await waitFor(() => expect(result.current.user).toBeNull());
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

});
