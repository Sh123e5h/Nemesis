import { supabase } from './supabase';
import { Preferences } from '@capacitor/preferences';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { executeGDriveRequest, UPLOADS_FOLDER_NAME } from './gdrive';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      resolve((reader.result as string).split(',')[1]);
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Calculates SHA-256 hash of a file for deduplication.
 */
export async function getSHA256(file: File | Blob): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Converts HEIC/HEIF images to WebP (client-side).
 */
async function handleHEIC(file: File): Promise<Blob> {
  if (!file.name.toLowerCase().match(/\.(heic|heif)$/) && file.type !== 'image/heic' && file.type !== 'image/heif') {
    return file;
  }
  try {
    const heic2any = (await import('heic2any')).default;
    const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.8 });
    return Array.isArray(blob) ? blob[0] : blob;
  } catch (err) {
    console.error('HEIC conversion failed:', err);
    return file;
  }
}

/**
 * Compresses video using ffmpeg.wasm.
 * Falls back to original if ffmpeg is not available, fails, or takes too long.
 * A 30s timeout guards against a silent WASM download hang which would freeze the upload UI.
 */
async function compressVideo(file: File): Promise<Blob | File> {
  if (!file.type.startsWith('video/') || file.size < 5 * 1024 * 1024) {
    return file; // Don't bother with small videos or non-videos
  }

  const compressionJob = async (): Promise<Blob | File> => {
    try {
      const { FFmpeg } = await import('@ffmpeg/ffmpeg');
      const { fetchFile, toBlobURL } = await import('@ffmpeg/util');

      const ffmpeg = new FFmpeg();
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      const inputName = 'input.' + (file.name.split('.').pop() || 'mp4');
      const outputName = 'output.mp4';

      await ffmpeg.writeFile(inputName, await fetchFile(file));

      // Compress to 720p, 24fps, CRF 28 (good balance)
      await ffmpeg.exec([
        '-i', inputName,
        '-vf', 'scale=-2:720',
        '-r', '24',
        '-vcodec', 'libx264',
        '-crf', '28',
        '-preset', 'ultrafast',
        '-acodec', 'aac',
        '-b:a', '128k',
        outputName
      ]);

      const data = await ffmpeg.readFile(outputName);
      return new Blob([data as any], { type: 'video/mp4' });
    } catch (err) {
      console.error('Video compression failed:', err);
      return file;
    }
  };

  // Race compression against a 30s timeout to prevent WASM load from freezing the upload
  const timeout = new Promise<File>(resolve => setTimeout(() => {
    console.warn('[Storage] Video compression timed out — uploading original.');
    resolve(file);
  }, 30000));

  return Promise.race([compressionJob(), timeout]);
}

/**
 * Generates a Low Quality Image Placeholder (LQIP) as a tiny base64 string.
 */
async function generateLQIP(file: Blob): Promise<string | null> {
  if (!file.type.startsWith('image/')) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 16;
      canvas.height = 16;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, 16, 16);
      const lqip = canvas.toDataURL('image/webp', 0.1);
      URL.revokeObjectURL(img.src);
      resolve(lqip);
    };
    img.onerror = () => resolve(null);
  });
}

/**
 * Compresses an image to WebP format using Canvas.
 */
export async function compressImage(file: File | Blob, quality = 0.8, maxWidth = 1200): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type.includes('gif')) return file;
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (!(window as any).Capacitor && width > maxWidth) {
          height = Math.round((maxWidth / width) * height);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas toBlob failed'));
          },
          'image/webp',
          quality
        );
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

/**
 * Smart upload that deduplicates by hash, handles HEIC, compresses images/videos, and strictly uploads to Google Drive.
 */
export async function uploadSmart(
  file: File, 
  _bucket: string, 
  _options?: { cacheControl?: string }
): Promise<{ url: string; path: string; hash: string; lqip?: string | null }> {
  void _options;

  // 0. Base64 Avatar Bypass
  // Since Google Drive blocks embedding public images, we compress avatars down to ~5-10KB
  // and store them as Data URLs directly in the database to guarantee they load instantly for everyone.
  if (_bucket === 'avatars') {
    const compressedBlob = await compressImage(file, 0.7, 256);
    const hash = await getSHA256(compressedBlob);
    
    const base64DataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(compressedBlob);
    });
    
    return { url: base64DataUrl, path: base64DataUrl, hash, lqip: null };
  }

  // 1. Handle HEIC/Video conversion
  let processedBlob: File | Blob = file;
  
  if (file.name.toLowerCase().match(/\.(heic|heif)$/)) {
    processedBlob = await handleHEIC(file);
  } else if (file.type.startsWith('video/')) {
    processedBlob = await compressVideo(file);
  }
  
  // 2. Compress image to WebP
  const isImage = processedBlob.type.startsWith('image/') && !processedBlob.type.includes('gif');
  let uploadBlob: File | Blob = processedBlob;
  let fileExt = file.name.split('.').pop() || '';

  if (isImage) {
    uploadBlob = await compressImage(processedBlob);
    fileExt = 'webp';
  } else if (processedBlob.type === 'video/mp4') {
    fileExt = 'mp4'; // Ensure consistent extension for transcoded videos
  }

  // 3. Calculate hash for deduplication
  const hash = await getSHA256(uploadBlob);
  const fileName = `${hash}.${fileExt}`;

  // 4. CHECK LOCAL DEDUPLICATION REGISTRY FIRST
  const registryRaw = await Preferences.get({ key: 'local_storage_registry' });
  const registry = registryRaw.value ? JSON.parse(registryRaw.value) : {};

  if (registry[hash]) {
    const isBadDriveUrl = registry[hash].path.includes('drive.google.com');
    // If the cached version is a bad Drive URL, we must re-upload to get the lh3.googleusercontent.com native thumbnail link.
    if (!isBadDriveUrl) {
      // Increment local ref count
      registry[hash].ref_count = (registry[hash].ref_count || 1) + 1;
      await Preferences.set({ key: 'local_storage_registry', value: JSON.stringify(registry) });
      
      return { 
        url: registry[hash].path, 
        path: registry[hash].path, 
        hash, 
        lqip: registry[hash].lqip 
      };
    }
  }

  // 5. WRITE TO LOCAL DEVICE STORAGE (The 'WhatsApp' Offline Data Rule)
  try {
    const base64Data = await blobToBase64(uploadBlob);
    await Filesystem.writeFile({
      path: `nemesis_media/${fileName}`,
      data: base64Data,
      directory: Directory.Data,
      recursive: true
    });
  } catch (fsErr) {
    console.warn("Local Filesystem Error (May be Web context):", fsErr);
  }  // 6. Generate LQIP
  const lqip = isImage ? await generateLQIP(uploadBlob) : null;

  // 7. UPLOAD TO GOOGLE DRIVE
  // A. Check for "Nemesis Uploads" Folder, or Create it
  const listRes = await executeGDriveRequest<any>((token: string) =>
    fetch(`https://www.googleapis.com/drive/v3/files?q=name+%3D+%27${encodeURIComponent(UPLOADS_FOLDER_NAME)}%27+and+mimeType+%3D+%27application%2Fvnd.google-apps.folder%27+and+%27me%27+in+owners`, {
      headers: { Authorization: `Bearer ${token}` }
    })
  );

  if (listRes.error) throw new Error(listRes.error);
  let folderId = listRes.data?.files?.[0]?.id;

  if (!folderId) {
    const createFolderRes = await executeGDriveRequest<any>((token: string) =>
      fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: UPLOADS_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' })
      })
    );
    
    if (createFolderRes.error) throw new Error(`Failed to create Nemesis Uploads folder: ${createFolderRes.error}`);
    folderId = createFolderRes.data.id;
  }

  // B. Multipart Upload
  let driveMimeType = uploadBlob.type || 'application/octet-stream';
  const ext = file.name.toLowerCase().split('.').pop();
  if (ext === 'csv') driveMimeType = 'text/csv';
  else if (ext === 'doc') driveMimeType = 'application/msword';
  else if (ext === 'docx') driveMimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  else if (ext === 'xls') driveMimeType = 'application/vnd.ms-excel';
  else if (ext === 'xlsx') driveMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  else if (ext === 'txt') driveMimeType = 'text/plain';
  else if (ext === 'rtf') driveMimeType = 'application/rtf';
  else if (ext === 'pdf') driveMimeType = 'application/pdf';

  const metadata = {
    name: fileName,
    mimeType: driveMimeType,
    parents: [folderId]
  };

  const boundary = `nemesis_storage_${Math.random().toString(36).substring(2)}`;
  const enc = new TextEncoder();
  const headerPart = enc.encode(
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${driveMimeType}\r\n\r\n`
  );
  const footerPart = enc.encode(`\r\n--${boundary}--`);
  const fileBuffer = await uploadBlob.arrayBuffer();

  const fullBody = new Blob([
    headerPart,
    new Uint8Array(fileBuffer),
    footerPart
  ], { type: `multipart/related; boundary=${boundary}` });

  const uploadRes = await executeGDriveRequest<any>((token: string) =>
    fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: fullBody
    }), { timeout: 120000 } // Higher timeout for large file uploads
  );

  if (uploadRes.error) throw new Error(`Google Drive Upload Failed: ${uploadRes.error}`);
  const fileId = uploadRes.data.id;

  if (!fileId) {
    throw new Error('Google Drive did not return a file ID. The upload may have been rejected silently.');
  }

  // C. Set permission to "Anyone with Link"
  await executeGDriveRequest<any>((token: string) =>
    fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'reader', type: 'anyone' })
    })
  );

  // D. Fetch the native thumbnailLink and webContentLink from Google Drive API
  const fileMetaRes = await executeGDriveRequest<any>((token: string) =>
    fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=webContentLink,thumbnailLink`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    })
  );

  let publicUrl = `https://drive.google.com/uc?export=view&id=${fileId}`; // Use view mode for proper image embedding

  if (!fileMetaRes.error && fileMetaRes.data) {
    if (!isImage && fileMetaRes.data.webContentLink) {
      // Only use webContentLink for non-images (downloads)
      publicUrl = fileMetaRes.data.webContentLink;
    }
    // We intentionally ignore thumbnailLink for images because Google Drive's lh3.googleusercontent.com 
    // links are now session-bound and often return 403 Forbidden for non-owners (e.g. group members).
  }

  // 8. Track in local Capacitor Preferences
  registry[hash] = {
    path: publicUrl,
    size_bytes: uploadBlob.size,
    mime_type: uploadBlob.type,
    lqip,
    ref_count: 1
  };
  await Preferences.set({ key: 'local_storage_registry', value: JSON.stringify(registry) });

  return { url: publicUrl, path: publicUrl, hash, lqip };
}

/**
 * Fetches total storage usage for a given user in bytes.
 */
export async function getUserStorageUsage(userId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_user_storage_usage', { p_user_id: userId });
  if (error) {
    console.error('Error fetching storage usage:', error);
    return 0;
  }
  return data || 0;
}

/**
 * Unified deletion handler that safely checks deduplication reference counts before wiping from Google Drive.
 */
export async function deleteSmart(fileUrl: string): Promise<boolean> {
  if (!fileUrl) return false;

  try {
    const registryRaw = await Preferences.get({ key: 'local_storage_registry' });
    const registry = registryRaw.value ? JSON.parse(registryRaw.value) : {};
    
    // Find the object from local registry by URL matching
    let targetHash = null;
    let obj = null;
    for (const [key, value] of Object.entries(registry)) {
      if ((value as any).path === fileUrl) {
        targetHash = key;
        obj = value as any;
        break;
      }
    }
    
    // If the file is only referenced once, or untracked but belongs to Drive, we can safely delete the native file
    if ((obj && obj.ref_count <= 1) || (!obj && fileUrl.includes('drive.google.com/uc'))) {
      if (fileUrl.includes('drive.google.com/uc')) {
        const urlParams = new URLSearchParams(fileUrl.split('?')[1]);
        const fileId = urlParams.get('id');
        
        if (fileId) {
          await executeGDriveRequest<any>((token: string) =>
            fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` }
            })
          );
        }
      }
      // Clean up the local tracking row
      if (targetHash) {
        delete registry[targetHash];
        await Preferences.set({ key: 'local_storage_registry', value: JSON.stringify(registry) });
        // Attempt physical deletion off device
        try {
          const dir = await Filesystem.readdir({
            path: 'nemesis_media',
            directory: Directory.Data
          });
          const matchingFile = dir.files.find(f => f.name.startsWith(`${targetHash}.`));
          if (matchingFile) {
            await Filesystem.deleteFile({
              path: `nemesis_media/${matchingFile.name}`,
              directory: Directory.Data
            });
          }
        } catch { /* ignore */ }
      }
      return true;
    } else if (targetHash && obj) {
      // Multiple references exist; just decrement the counter locally, leave the Drive file alone
      registry[targetHash].ref_count -= 1;
      await Preferences.set({ key: 'local_storage_registry', value: JSON.stringify(registry) });
      return true;
    }
    return false;
  } catch (err) {
    console.error('deleteSmart Error:', err);
    return false;
  }
}

/**
 * Helper to get an optimized image URL using Supabase transformation.
 */
export function getOptimizedUrl(url: string, width?: number, height?: number, quality = 80): string {
  if (!url || !url.includes('supabase.co/storage')) return url;
  
  const params = [];
  if (width) params.push(`width=${width}`);
  if (height) params.push(`height=${height}`);
  params.push(`quality=${quality}`);
  params.push('format=webp');

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${params.join('&')}`;
}
