// Security utility functions

/**
 * Sanitizes error messages for production use
 * Removes sensitive information and provides safe user-friendly messages
 */
export const sanitizeError = (error: any): string => {
  // In development, show detailed errors
  if (process.env.NODE_ENV === "development") {
    return error.message || "An error occurred";
  }

  // In production, return generic messages for security
  const safeMessages: { [key: string]: string } = {
    // Auth errors
    "Invalid login credentials": "Invalid email or password.",
    "Email not confirmed": "Please check your email and confirm your account.",
    "Too many requests": "Too many attempts. Please try again later.",
    "User not found": "Invalid email or password.",
    "Invalid email": "Please enter a valid email address.",
    "Weak password": "Password does not meet security requirements.",

    // Database errors
    "duplicate key value": "This record already exists.",
    "foreign key constraint":
      "Cannot complete this action due to related data.",
    "check constraint": "The provided data is invalid.",
    "not null violation": "Required information is missing.",

    // Network errors
    NetworkError:
      "Network connection error. Please check your internet connection.",
    "Failed to fetch": "Unable to connect to the server. Please try again.",
    timeout: "Request timed out. Please try again.",
  };

  const errorMessage = error.message || "";

  // Check for known error patterns
  for (const [pattern, safeMessage] of Object.entries(safeMessages)) {
    if (errorMessage.toLowerCase().includes(pattern.toLowerCase())) {
      return safeMessage;
    }
  }

  // Default safe message
  return "An unexpected error occurred. Please try again.";
};

/**
 * Sanitizes user input to prevent XSS and other injection attacks
 */
export const sanitizeInput = (input: string): string => {
  if (!input) return "";

  return input
    .trim()
    .replace(/[<>]/g, "") // Remove potential HTML tags
    .substring(0, 1000); // Limit length to prevent DoS
};

/**
 * Validates email format with enhanced security
 */
export const isValidEmail = (email: string): boolean => {
  if (!email || email.length > 254) return false;

  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
};

/**
 * Validates password strength with enhanced security requirements
 */
export const isValidPassword = (password: string): boolean => {
  if (!password || password.length < 8 || password.length > 128) return false;

  return (
    /[a-z]/.test(password) && // lowercase letter
    /[A-Z]/.test(password) && // uppercase letter
    /[0-9]/.test(password) && // number
    /[!@#$%^&*(),.?":{}|<>]/.test(password) // special character
  );
};

/**
 * Rate limiting helper (simple client-side implementation)
 */
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();

  canAttempt(
    key: string,
    maxAttempts: number = 5,
    windowMs: number = 15 * 60 * 1000
  ): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];

    // Remove old attempts outside the window
    const recentAttempts = attempts.filter((time) => now - time < windowMs);

    if (recentAttempts.length >= maxAttempts) {
      return false;
    }

    // Record this attempt
    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);

    return true;
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }

  // Clear old attempts periodically to prevent memory leaks
  cleanup(): void {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour

    // Convert entries to array to avoid TypeScript iteration issues
    const entriesArray = Array.from(this.attempts.entries());

    for (const [key, attempts] of entriesArray) {
      const recentAttempts = attempts.filter(
        (time: number) => now - time < maxAge
      );
      if (recentAttempts.length === 0) {
        this.attempts.delete(key);
      } else {
        this.attempts.set(key, recentAttempts);
      }
    }
  }
}

// Global rate limiter instance
export const globalRateLimiter = new RateLimiter();

// Cleanup old attempts every 10 minutes
if (typeof window !== "undefined") {
  setInterval(() => {
    globalRateLimiter.cleanup();
  }, 10 * 60 * 1000);
}
