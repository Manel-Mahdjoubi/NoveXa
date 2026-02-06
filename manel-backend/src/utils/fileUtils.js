import fs from 'fs';
import path from 'path';

/**
 * Delete folder and all its contents recursively
 * @param {string} folderPath - Path to folder to delete
 */
export const deleteFolderRecursive = (folderPath) => {
  if (fs.existsSync(folderPath)) {
    fs.rmSync(folderPath, { recursive: true, force: true });
  }
};