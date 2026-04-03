// ==========================================================================
// AuthManager — Wraps Supabase Auth for Dad's Army
//
// Provides sign-up, sign-in (email + Google OAuth), sign-out, session
// management, and auth state change subscriptions.
// ==========================================================================

export class AuthManager {
  /**
   * @param {import('@supabase/supabase-js').SupabaseClient} supabase
   */
  constructor(supabase) {
    this._supabase = supabase;
    this._subscription = null;
  }

  // ---------- Sign Up ----------

  /**
   * Create a new account with email, password, and a display name stored
   * in user_metadata.
   *
   * @param {string} email
   * @param {string} password  — minimum 6 characters
   * @param {string} displayName
   * @returns {Promise<{user: object|null, error: object|null}>}
   */
  async signUp(email, password, displayName) {
    try {
      const { data, error } = await this._supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      });

      if (error) {
        return { user: null, error };
      }

      return { user: data.user, error: null };
    } catch (err) {
      console.error('[AuthManager] signUp failed:', err);
      return { user: null, error: { message: err.message } };
    }
  }

  // ---------- Sign In (Email / Password) ----------

  /**
   * Sign in with email and password.
   *
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{session: object|null, error: object|null}>}
   */
  async signIn(email, password) {
    try {
      const { data, error } = await this._supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { session: null, error };
      }

      return { session: data.session, error: null };
    } catch (err) {
      console.error('[AuthManager] signIn failed:', err);
      return { session: null, error: { message: err.message } };
    }
  }

  // ---------- Sign In (Google OAuth) ----------

  /**
   * Initiate Google OAuth sign-in via redirect.
   * The user will be redirected to Google and back to the app.
   *
   * @returns {Promise<{error: object|null}>}
   */
  async signInWithGoogle() {
    try {
      const { error } = await this._supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + window.location.pathname,
        },
      });

      if (error) {
        return { error };
      }

      // Redirect happens automatically; no return value needed on success
      return { error: null };
    } catch (err) {
      console.error('[AuthManager] signInWithGoogle failed:', err);
      return { error: { message: err.message } };
    }
  }

  // ---------- Sign Out ----------

  /**
   * Sign the current user out and clear the local session.
   *
   * @returns {Promise<{error: object|null}>}
   */
  async signOut() {
    try {
      const { error } = await this._supabase.auth.signOut();
      return { error: error || null };
    } catch (err) {
      console.error('[AuthManager] signOut failed:', err);
      return { error: { message: err.message } };
    }
  }

  // ---------- Session / User ----------

  /**
   * Get the current active session, or null if the user is not logged in.
   *
   * @returns {Promise<object|null>}
   */
  async getSession() {
    try {
      const { data, error } = await this._supabase.auth.getSession();
      if (error) {
        console.error('[AuthManager] getSession error:', error);
        return null;
      }
      return data.session;
    } catch (err) {
      console.error('[AuthManager] getSession failed:', err);
      return null;
    }
  }

  /**
   * Get the current authenticated user object, or null.
   *
   * @returns {Promise<object|null>}
   */
  async getUser() {
    try {
      const { data, error } = await this._supabase.auth.getUser();
      if (error) {
        console.error('[AuthManager] getUser error:', error);
        return null;
      }
      return data.user;
    } catch (err) {
      console.error('[AuthManager] getUser failed:', err);
      return null;
    }
  }

  // ---------- Auth State Change ----------

  /**
   * Subscribe to authentication state changes (SIGNED_IN, SIGNED_OUT, etc.).
   *
   * @param {(event: string, session: object|null) => void} callback
   * @returns {Function} unsubscribe function
   */
  onAuthStateChange(callback) {
    const { data } = this._supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });

    this._subscription = data.subscription;

    return () => {
      if (this._subscription) {
        this._subscription.unsubscribe();
        this._subscription = null;
      }
    };
  }

  // ---------- Display Name ----------

  /**
   * Extract the display name from the current user's metadata.
   * Falls back to the email prefix if no display_name is set.
   *
   * @param {object} user — Supabase user object
   * @returns {string}
   */
  getUserDisplayName(user) {
    if (!user) return 'Unknown';

    // Check user_metadata first (set during sign-up)
    const meta = user.user_metadata;
    if (meta?.display_name) return meta.display_name;

    // Google OAuth may set full_name or name
    if (meta?.full_name) return meta.full_name;
    if (meta?.name) return meta.name;

    // Fallback: email prefix
    if (user.email) return user.email.split('@')[0];

    return 'Soldier';
  }
}
