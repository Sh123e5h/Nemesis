import { Filesystem, Directory } from '@capacitor/filesystem';
import { db } from './db';

declare global {
  interface Window {
    Capacitor?: {
      convertFileSrc: (uri: string) => string;
    };
  }
}

/**
 * Ensures a file is cached locally on the device (Capacitor only).
 * Returns the local file URI if successful, or the original public URL if not.
 */
export async function ensureFileCached(publicUrl: string, hash: string, fileName: string): Promise<string> {
  // Check if we're in a native environment
  if (!window.Capacitor) {
    return publicUrl;
  }

  try {
    // 1. Check Dexie for registration
    const cached = await db.files.get(hash);
    if (cached) {
      // Small sanity check if file actually exists on disk
      try {
        await Filesystem.stat({
          path: cached.local_path,
          directory: Directory.Data
        });
        return window.Capacitor.convertFileSrc(cached.local_path);
      } catch (e) {
        // File might have been deleted from disk, continue to download
        console.warn('Cached file not found on disk, re-downloading:', e);
        await db.files.delete(hash);
      }
    }

    // 2. Download file
    const response = await fetch(publicUrl);
    if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
    const blob = await response.blob();
    
    // 3. Convert Blob to Base64 (needed for Filesystem.writeFile)
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      const timeout = setTimeout(() => {
        reader.abort();
        reject(new Error('FileReader operation timed out (30s)'));
      }, 30000);

      reader.onloadend = () => {
        clearTimeout(timeout);
        if (typeof reader.result === 'string') {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('FileReader result is not a string'));
        }
      };
      
      reader.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('FileReader failed'));
      };
      
      reader.onabort = () => {
        clearTimeout(timeout);
        reject(new Error('FileReader aborted'));
      };

      reader.readAsDataURL(blob);
    });

    // 4. Save to Disk
    const path = `cached_files/${hash}_${fileName}`;
    
    // Ensure directory exists
    try {
      await Filesystem.mkdir({
        path: 'cached_files',
        directory: Directory.Data,
        recursive: true
      });
    } catch (e: any) {
      // Directory may already exist, ignore this specific error
      if (e?.message?.includes('already exists')) {
        // Expected
      } else {
        console.error('Directory creation failed:', e);
      }
    }

    await Filesystem.writeFile({
      path,
      data: base64Data,
      directory: Directory.Data
    });

    const result = await Filesystem.getUri({
      path,
      directory: Directory.Data
    });

    // 5. Register in Dexie
    await db.files.put({
      hash,
      local_path: result.uri,
      mime_type: blob.type,
      last_accessed: Date.now()
    });

    return window.Capacitor.convertFileSrc(result.uri);
  } catch (error) {
    console.error('File caching error:', error);
    return publicUrl;
  }
}
