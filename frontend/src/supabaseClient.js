/**
 * PolicyPilot RAG - Supabase Authentication & History Client
 * Supports Email/Password, Google OAuth, and User Chat History Persistence
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http'));
};

// Initialize Supabase client if credentials exist, otherwise null
export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// ==============================================================================
// Authentication Methods
// ==============================================================================

/**
 * Register a new user with email, password, and full name.
 */
export async function signUpUser(email, password, fullName) {
  if (!isSupabaseConfigured()) {
    // Local development fallback
    const mockUser = { id: 'mock-user-1', email, user_metadata: { full_name: fullName } };
    localStorage.setItem('policypilot_mock_user', JSON.stringify(mockUser));
    return { data: { user: mockUser }, error: null };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName || email.split('@')[0],
      },
    },
  });
  return { data, error };
}

/**
 * Sign in an existing user with email and password.
 */
export async function signInUser(email, password) {
  if (!isSupabaseConfigured()) {
    const mockUser = { id: 'mock-user-1', email, user_metadata: { full_name: email.split('@')[0] } };
    localStorage.setItem('policypilot_mock_user', JSON.stringify(mockUser));
    return { data: { user: mockUser }, error: null };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

/**
 * Trigger one-click OAuth Sign-In with Google.
 */
export async function signInWithGoogleOAuth() {
  if (!isSupabaseConfigured()) {
    const mockUser = {
      id: 'google-mock-user',
      email: 'pilot.user@gmail.com',
      user_metadata: { full_name: 'Policy Pilot User', avatar_url: '' },
    };
    localStorage.setItem('policypilot_mock_user', JSON.stringify(mockUser));
    window.location.reload();
    return { data: { user: mockUser }, error: null };
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
  return { data, error };
}

/**
 * Sign out the currently active user.
 */
export async function signOutUser() {
  if (!isSupabaseConfigured()) {
    localStorage.removeItem('policypilot_mock_user');
    return { error: null };
  }
  return await supabase.auth.signOut();
}

/**
 * Get current authenticated user session.
 */
export async function getActiveUser() {
  if (!isSupabaseConfigured()) {
    const raw = localStorage.getItem('policypilot_mock_user');
    return raw ? JSON.parse(raw) : null;
  }
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

/**
 * Get JWT access token to attach to FastAPI Bearer requests.
 */
export async function getActiveSessionToken() {
  if (!isSupabaseConfigured()) {
    return 'mock-jwt-token-dev';
  }
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

// ==============================================================================
// User Chat History Persistence
// ==============================================================================

/**
 * Fetch past chat questions and responses for the current user.
 */
export async function fetchUserChatHistory(userId) {
  if (!userId) return [];

  if (!isSupabaseConfigured()) {
    const raw = localStorage.getItem(`policypilot_history_${userId}`);
    return raw ? JSON.parse(raw) : [];
  }

  try {
    const { data, error } = await supabase
      .from('chat_history')
      .select('id, question, answer, citations, is_refusal, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.warn('Could not load chat history from Supabase:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Error fetching chat history:', err);
    return [];
  }
}

/**
 * Save an inquiry turn to database under the user's account.
 */
export async function saveChatTurnToDatabase(userId, question, answer, citations = [], isRefusal = false) {
  if (!userId || !question || !answer) return;

  const entry = {
    user_id: userId,
    question,
    answer,
    citations: citations || [],
    is_refusal: Boolean(isRefusal),
    created_at: new Date().toISOString(),
  };

  if (!isSupabaseConfigured()) {
    const existing = JSON.parse(localStorage.getItem(`policypilot_history_${userId}`) || '[]');
    existing.unshift({ id: Date.now().toString(), ...entry });
    localStorage.setItem(`policypilot_history_${userId}`, JSON.stringify(existing.slice(0, 50)));
    return;
  }

  try {
    const { error } = await supabase.from('chat_history').insert([entry]);
    if (error) {
      console.warn('Could not save chat turn to Supabase:', error.message);
    }
  } catch (err) {
    console.error('Error saving chat turn:', err);
  }
}

/**
 * Clear chat history for a specific user.
 */
export async function clearUserChatHistory(userId) {
  if (!userId) return;

  if (!isSupabaseConfigured()) {
    localStorage.removeItem(`policypilot_history_${userId}`);
    return;
  }

  try {
    await supabase.from('chat_history').delete().eq('user_id', userId);
  } catch (err) {
    console.error('Error clearing chat history:', err);
  }
}
