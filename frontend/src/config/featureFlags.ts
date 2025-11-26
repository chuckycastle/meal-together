/**
 * Feature Flags Configuration
 * Controls gradual rollout of Supabase migration
 */

export interface FeatureFlags {
  // Supabase Migration Flags
  supabase_auth: boolean;
  supabase_timers: boolean;
  supabase_shopping: boolean;
  disable_socketio: boolean;

  // Additional feature toggles
  debug_mode: boolean;
  enable_telemetry: boolean;
  recipe_ai_import: boolean;
}

// Default feature flags (all Supabase features disabled initially)
const defaultFlags: FeatureFlags = {
  supabase_auth: false,
  supabase_timers: false,
  supabase_shopping: false,
  disable_socketio: false,
  debug_mode: import.meta.env.DEV,
  enable_telemetry: true,
  recipe_ai_import: false,
};

// Environment variable overrides
const envFlags: Partial<FeatureFlags> = {
  supabase_auth: import.meta.env.VITE_FEATURE_SUPABASE_AUTH === 'true',
  supabase_timers: import.meta.env.VITE_FEATURE_SUPABASE_TIMERS === 'true',
  supabase_shopping: import.meta.env.VITE_FEATURE_SUPABASE_SHOPPING === 'true',
  disable_socketio: import.meta.env.VITE_FEATURE_DISABLE_SOCKETIO === 'true',
  debug_mode: import.meta.env.VITE_FEATURE_DEBUG_MODE === 'true',
  enable_telemetry: import.meta.env.VITE_FEATURE_TELEMETRY !== 'false',
  recipe_ai_import: import.meta.env.VITE_FEATURE_RECIPE_AI_IMPORT === 'true',
};

// Merge defaults with environment overrides
export const featureFlags: FeatureFlags = {
  ...defaultFlags,
  ...envFlags,
};

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return featureFlags[feature];
}

/**
 * Get all enabled features
 */
export function getEnabledFeatures(): Array<keyof FeatureFlags> {
  return (Object.keys(featureFlags) as Array<keyof FeatureFlags>).filter(
    (key) => featureFlags[key]
  );
}

/**
 * Feature flag hooks for use in components
 */
export function useFeatureFlag(feature: keyof FeatureFlags): boolean {
  return isFeatureEnabled(feature);
}

/**
 * Migration phase detection
 */
export function getMigrationPhase(): 'flask' | 'hybrid' | 'supabase' {
  const {supabase_auth, supabase_timers, supabase_shopping, disable_socketio} =
    featureFlags;

  // Full Supabase mode
  if (supabase_auth && supabase_timers && supabase_shopping && disable_socketio) {
    return 'supabase';
  }

  // Hybrid mode (some Supabase features enabled)
  if (supabase_auth || supabase_timers || supabase_shopping) {
    return 'hybrid';
  }

  // Flask-only mode
  return 'flask';
}

/**
 * Log feature flags status (development only)
 */
if (import.meta.env.DEV) {
  console.log('🚩 Feature Flags:', featureFlags);
  console.log('📊 Migration Phase:', getMigrationPhase());
  console.log('✅ Enabled Features:', getEnabledFeatures());
}
