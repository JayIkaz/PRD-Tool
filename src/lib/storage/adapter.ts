/**
 * StorageAdapter (build-prompt-addendum-v2.md, Section 10).
 * Storage provider is a per-organisation setting (organisations.storageProvider),
 * chosen by the org admin at setup time — Supabase Storage by default, or a
 * local filesystem path for self-hosted deployments. The rest of the app
 * only ever talks to this interface, never to a specific backend.
 */
export interface StorageAdapter {
  upload(params: { organisationId: string; fileName: string; contents: Buffer; contentType: string }): Promise<{ storagePath: string }>;
  getUrl(storagePath: string): Promise<string>;
  delete(storagePath: string): Promise<void>;
}

/**
 * Returns the adapter configured for a given organisation. Fill in the
 * two implementations (Supabase Storage, local filesystem) before this
 * is used for real evidence uploads (Section 15).
 */
export async function getStorageAdapter(organisationId: string): Promise<StorageAdapter> {
  throw new Error(
    `getStorageAdapter not yet implemented for organisation ${organisationId} — ` +
      "add SupabaseStorageAdapter and LocalFilesystemStorageAdapter implementations."
  );
}
