/**
 * PolicyPilot RAG - Supabase Authentication & History Client
 * Supports Email/Password, Google OAuth, and User Chat History Persistence
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

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
 * Register a new user with email, password, full name, and contact number.
 */
export async function signUpUser(email, password, fullName, contactNumber = '') {
  const cleanEmail = (email || '').trim().toLowerCase();

  if (!isSupabaseConfigured()) {
    // Local development fallback
    const mockUser = {
      id: 'mock-user-1',
      email: cleanEmail,
      user_metadata: {
        full_name: fullName,
        contact_number: contactNumber
      }
    };
    localStorage.setItem('policypilot_mock_user', JSON.stringify(mockUser));
    return { data: { user: mockUser, session: { access_token: 'mock-token' } }, error: null };
  }

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: {
        full_name: fullName || cleanEmail.split('@')[0],
        contact_number: contactNumber || '',
      },
    },
  });
  return { data, error };
}

/**
 * Send password reset email to user's registered email address.
 */
export async function sendPasswordResetEmail(email) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!isSupabaseConfigured()) {
    return { data: {}, error: null };
  }

  const { data, error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo: `${window.location.origin}`,
  });
  return { data, error };
}

/**
 * Update the password for the current authenticated user (e.g. after clicking reset link).
 */
export async function updateUserPassword(newPassword) {
  if (!isSupabaseConfigured()) {
    return { data: { user: { id: 'mock-user-1' } }, error: null };
  }
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  return { data, error };
}

/**
 * Listen for auth events (e.g. PASSWORD_RECOVERY, SIGNED_IN, SIGNED_OUT).
 */
export function onAuthStateChange(callback) {
  if (!isSupabaseConfigured()) {
    return { data: { subscription: { unsubscribe: () => {} } } };
  }
  return supabase.auth.onAuthStateChange(callback);
}

/**
 * Sign in an existing user with email and password.
 */
export async function signInUser(email, password) {
  const cleanEmail = (email || '').trim().toLowerCase();

  if (!isSupabaseConfigured()) {
    const mockUser = { id: 'mock-user-1', email: cleanEmail, user_metadata: { full_name: cleanEmail.split('@')[0] } };
    localStorage.setItem('policypilot_mock_user', JSON.stringify(mockUser));
    return { data: { user: mockUser }, error: null };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
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

  // Instant local cache: return cached history immediately in 0ms
  const cached = localStorage.getItem(`policypilot_history_${userId}`);
  const cachedList = cached ? JSON.parse(cached) : [];

  if (!isSupabaseConfigured()) {
    return cachedList;
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
      return cachedList;
    }

    if (data && data.length > 0) {
      localStorage.setItem(`policypilot_history_${userId}`, JSON.stringify(data));
      return data;
    }
    return cachedList;
  } catch (err) {
    console.error('Error fetching chat history:', err);
    return cachedList;
  }
}

/**
 * Save an inquiry turn to database under the user's account with deduplication.
 */
export async function saveChatTurnToDatabase(
  userId,
  question,
  answer,
  citations = [],
  isRefusal = false,
  sessionId = 'default'
) {
  if (!userId || !question || !answer) return;

  const entry = {
    user_id: userId,
    session_id: sessionId || 'default',
    question: question.trim(),
    answer,
    citations: citations || [],
    is_refusal: Boolean(isRefusal),
    created_at: new Date().toISOString(),
  };

  // Always sync immediately to localStorage for instant 0ms offline/SWR read
  try {
    const existing = JSON.parse(localStorage.getItem(`policypilot_history_${userId}`) || '[]');
    const normQ = question.trim().toLowerCase();
    const filtered = existing.filter(item => item.question?.trim().toLowerCase() !== normQ);
    filtered.unshift({ id: Date.now().toString(), ...entry });
    localStorage.setItem(`policypilot_history_${userId}`, JSON.stringify(filtered.slice(0, 50)));
  } catch (e) {
    // Ignore localStorage quota errors
  }

  if (!isSupabaseConfigured()) {
    return;
  }

  try {
    // Professional Deduplication: check if this user already asked this exact question
    const { data: existingRows } = await supabase
      .from('chat_history')
      .select('id, question')
      .eq('user_id', userId)
      .eq('question', question.trim())
      .limit(1);

    if (existingRows && existingRows.length > 0) {
      // Update existing record: touch created_at to bring it to top, update answer & citations without wasting space
      await supabase
        .from('chat_history')
        .update({
          session_id: sessionId || 'default',
          answer,
          citations: citations || [],
          is_refusal: Boolean(isRefusal),
          created_at: new Date().toISOString(),
        })
        .eq('id', existingRows[0].id);
      return;
    }

    // Insert new entry with session_id
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
