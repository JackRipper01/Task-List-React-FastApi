// project/frontend/src/setupTests.ts
import '@testing-library/jest-dom';
import 'whatwg-fetch'; // Polyfill fetch for JSDOM environment
import 'vitest-canvas-mock'; // If you use any canvas elements, otherwise optional

// Mock environment variables for tests
vi.stubEnv('VITE_API_BASE_URL', 'http://127.0.0.1:8000');
vi.stubEnv('VITE_WEB_APP_BASE_URL', 'http://localhost:5173');
vi.stubEnv('VITE_SUPABASE_URL', 'http://mock.supabase.url');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'mock_anon_key');

// NEW: Mock window.matchMedia for JSDOM environment
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false, // Default to false, adjust if specific tests need true
        media: query,
        onchange: null,
        addListener: vi.fn(), // Deprecated
        removeListener: vi.fn(), // Deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// REMOVED: The problematic `declare global { namespace jest { ... } }` block.
// Vitest's global types are typically handled by the 'types' field in tsconfig.