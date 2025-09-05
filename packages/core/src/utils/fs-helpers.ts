import { access } from 'node:fs/promises';

/**
 * Check if a file or directory exists.
 */
export async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}