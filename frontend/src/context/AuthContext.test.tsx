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
  ) => void = () => {};
  let unsubscribeMock: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    mockedToast.mockClear();
    unsubscribeMock = vi.fn();

    const mockSubscription: Subscription = {
      id: "mock-subscription-id",
      callback: vi.fn(), // A simple mock function for the callback
      unsubscribe: unsubscribeMock,
    };

    mockSupabaseAuth.onAuthStateChange.mockImplementation((callback) => {
      onAuthStateChangeCallback = callback;
      return { data: { subscription: mockSubscription } };
    });

    mockSupabaseAuth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    act(() => {
      onAuthStateChangeCallback("INITIAL_SESSION", null);
    });
  });

  it("should initialize with loading true and no user/session, then resolve loading to false", async () => {
    // Re-mock onAuthStateChange and getSession for this specific test
    mockSupabaseAuth.onAuthStateChange.mockImplementation((cb) => {
      return {
        data: {
          subscription: {
            id: "test-sub-id",
            callback: vi.fn(),
            unsubscribe: vi.fn(),
          },
        },
      };
    });
    mockSupabaseAuth.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();

    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it("should call signInWithPassword on login attempt", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // FIX: Add missing properties to mockUser to match Supabase User type
    const mockUser: User = {
      id: "user1",
      email: "test@example.com",
      aud: "authenticated", // Minimal required aud
      role: "authenticated", // Minimal required role
      created_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      app_metadata: {},
      user_metadata: {},
    };
    const mockSession: Session = {
      access_token: "valid-token",
      token_type: "Bearer",
      user: mockUser,
      expires_at: 1234567890,
      expires_in: 3600,
      refresh_token: "refresh-token",
    };
    mockSupabaseAuth.signInWithPassword.mockResolvedValueOnce({
      data: { session: mockSession, user: mockSession.user },
      error: null,
    });

    await act(async () => {
      await result.current.signIn("test@example.com", "password");
    });
    expect(mockSupabaseAuth.signInWithPassword).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password",
    });
    await waitFor(() =>
      expect(mockedToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "success" })
      )
    );
    await waitFor(() =>
      expect(result.current.user?.email).toBe("test@example.com")
    );
  });

  it("should call signUp on signup attempt", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // FIX: Add missing properties to mockUser
    const mockUser: User = {
      id: "user2",
      email: "new@example.com",
      aud: "authenticated", // Minimal required aud
      role: "authenticated", // Minimal required role
      created_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      app_metadata: {},
      user_metadata: {},
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
  });

  it("should call signOut on logout attempt", async () => {
    // FIX: Add missing properties to mockUser
    const mockUser: User = {
      id: "user-active",
      email: "active@example.com",
      aud: "authenticated", // Minimal required aud
      role: "authenticated", // Minimal required role
      created_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      app_metadata: {},
      user_metadata: {},
    };
    const mockSession: Session = {
      access_token: "active-token",
      token_type: "Bearer",
      user: mockUser,
      expires_at: 1234567890,
      expires_in: 3600,
      refresh_token: "refresh-token",
    };
    mockSupabaseAuth.getSession.mockResolvedValueOnce({
      data: { session: mockSession },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).toBeDefined());

    mockSupabaseAuth.signOut.mockResolvedValueOnce({ error: null });

    await act(async () => {
      await result.current.signOut();
    });
    expect(mockSupabaseAuth.signOut).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.user).toBeNull());
    await waitFor(() =>
      expect(mockedToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "info" })
      )
    );
  });
});
