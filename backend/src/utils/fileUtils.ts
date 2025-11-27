import { promises as fs, constants } from 'fs';
import * as path from 'path';

/**
 * Atomic file write utility using temp file + rename pattern
 *
 * This ensures that configuration files are never partially written.
 * If the process crashes during write, the original file remains intact.
 *
 * The rename operation is atomic on POSIX systems (Linux/macOS).
 *
 * @param filePath - Target file path
 * @param data - Data to write (will be JSON.stringified)
 * @throws Error if write or rename fails
 */
export async function writeConfigAtomic(filePath: string, data: any): Promise<void> {
  const tempPath = `${filePath}.tmp`;
  let originalPermissions: number | undefined;

  try {
    // Preserve original file permissions if file exists
    try {
      const stats = await fs.stat(filePath);
      originalPermissions = stats.mode;
    } catch {
      // File doesn't exist, will use default permissions
      originalPermissions = undefined;
    }

    // Write to temp file with formatting (2-space indent)
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');

    // Verify write succeeded by checking temp file exists and has content
    const tempStats = await fs.stat(tempPath);
    if (tempStats.size === 0) {
      throw new Error('Temporary file is empty after write');
    }

    // Preserve permissions if they were captured
    if (originalPermissions !== undefined) {
      await fs.chmod(tempPath, originalPermissions);
    }

    // Atomic rename (POSIX guarantee)
    await fs.rename(tempPath, filePath);
  } catch (error) {
    // Clean up temp file on error
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignore cleanup errors (file may not exist)
    }

    throw new Error(`Failed to write configuration file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Read configuration file and parse JSON
 *
 * @param filePath - File to read
 * @returns Parsed JSON data
 * @throws Error if read or parse fails
 */
export async function readConfigFile<T>(filePath: string): Promise<T> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    throw new Error(`Failed to read configuration file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Ensure directory exists (create if missing)
 *
 * @param dirPath - Directory path
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    throw new Error(`Failed to create directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
