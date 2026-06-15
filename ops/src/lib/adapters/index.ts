import { StorageAdapter } from "../storage-adapter";
import { LocalStorageAdapter } from "./local-storage-adapter";

let _adapter: StorageAdapter | null = null;

/**
 * Returns the appropriate StorageAdapter based on environment configuration.
 *
 * - If NEXT_PUBLIC_SUPABASE_URL is set → SupabaseAdapter (lazy-loaded)
 * - Otherwise → LocalStorageAdapter (default)
 */
export function getAdapter(): StorageAdapter {
  if (_adapter) return _adapter;

  const supabaseUrl =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_SUPABASE_URL
      : undefined;

  if (supabaseUrl && supabaseUrl.trim() !== "") {
    // Lazy require avoids pulling @supabase/supabase-js into the build
    // when the env vars are not set. The require only executes at runtime
    // when Supabase is actually configured.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { SupabaseAdapter } = require("./supabase-adapter");
    _adapter = new SupabaseAdapter() as StorageAdapter;
  } else {
    _adapter = new LocalStorageAdapter();
  }

  return _adapter;
}

export type { StorageAdapter };
export { LocalStorageAdapter } from "./local-storage-adapter";
