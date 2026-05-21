import { Injectable } from '@nestjs/common';
import { Client as MinioClient } from 'minio';
import * as JSZipModule from 'jszip';

type AssetType = 'image' | 'video' | 'audio' | 'document' | 'archive' | 'other';

@Injectable()
export class LibraryMinioService {
  private readonly jsZip: {
    loadAsync: (data: Buffer) => Promise<{
      files: Record<string, { dir?: boolean; name: string; async: (type: 'nodebuffer') => Promise<Buffer> }>;
    }>;
  } = ((JSZipModule as unknown as { default?: unknown }).default ?? JSZipModule) as {
    loadAsync: (data: Buffer) => Promise<{
      files: Record<string, { dir?: boolean; name: string; async: (type: 'nodebuffer') => Promise<Buffer> }>;
    }>;
  };
  private readonly minio = new MinioClient({
    endPoint: process.env.MINIO_ENDPOINT ?? 'localhost',
    port: Number(process.env.MINIO_PORT ?? '9000'),
    useSSL: String(process.env.MINIO_USE_SSL ?? 'false').toLowerCase() === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin'
  });

  private readonly bucket = String(process.env.MINIO_LIBRARY_BUCKET ?? process.env.MINIO_BUCKET ?? 'general')
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '-');
  private readonly rootPrefix = this.sanitizeSegment(
    String(process.env.MINIO_LIBRARY_ROOT_PREFIX ?? 'Fintrax/Library')
  );

  private sanitizeSegment(input: string): string {
    return String(input ?? '')
      .replace(/\\/g, '/')
      .replace(/\.\./g, '')
      .replace(/\/+/g, '/')
      .replace(/[^a-zA-Z0-9/_\-. ]/g, '')
      .replace(/^\/+|\/+$/g, '');
  }

  private stripLegacyLibraryPrefix(input: string): string {
    const normalized = this.sanitizeSegment(input);
    if (!normalized) return '';
    return normalized
      .replace(/^fintrax\/library\//i, '')
      .replace(/^library\//i, '')
      .replace(/^fintrax\//i, '');
  }

  sanitizeFolder(input?: string): string {
    const cleaned = this.stripLegacyLibraryPrefix(String(input ?? ''));
    return cleaned || '';
  }

  sanitizeKey(input?: string): string {
    return this.stripLegacyLibraryPrefix(String(input ?? ''));
  }

  private extractKeyFromUrl(input: string): string {
    try {
      const url = new URL(input);
      const rawPath = String(url.pathname || '').replace(/^\/+/, '');
      if (!rawPath) return '';

      const bucketPrefix = `${this.bucket}/`;
      const withoutBucket = rawPath.startsWith(bucketPrefix) ? rawPath.slice(bucketPrefix.length) : rawPath;
      return this.stripRootPrefix(withoutBucket);
    } catch (_) {
      return '';
    }
  }

  private normalizeIncomingKey(input?: string): string {
    const raw = String(input ?? '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) {
      const fromUrl = this.extractKeyFromUrl(raw);
      return this.sanitizeKey(fromUrl);
    }

    const direct = this.sanitizeKey(raw);
    return this.stripRootPrefix(direct);
  }

  private prefixedKey(key: string): string {
    const safe = this.sanitizeKey(key);
    return this.rootPrefix ? `${this.rootPrefix}/${safe}` : safe;
  }

  private stripRootPrefix(fullKey: string): string {
    const normalized = this.sanitizeKey(fullKey);
    if (!this.rootPrefix) return normalized;
    const prefix = `${this.rootPrefix}/`;
    return normalized.startsWith(prefix) ? normalized.slice(prefix.length) : normalized;
  }

  private detectAssetType(key: string): AssetType {
    const lower = key.toLowerCase();
    if (/\.(png|jpg|jpeg|gif|webp|svg)$/.test(lower)) return 'image';
    if (/\.(mp4|webm|mov|mkv|avi)$/.test(lower)) return 'video';
    if (/\.(mp3|wav|ogg|m4a)$/.test(lower)) return 'audio';
    if (/\.(pdf|doc|docx|ppt|pptx|xls|xlsx|txt)$/.test(lower)) return 'document';
    if (/\.(zip|rar|7z|tar|gz)$/.test(lower)) return 'archive';
    return 'other';
  }

  private async ensureBucket() {
    const exists = await this.minio.bucketExists(this.bucket).catch(() => false);
    if (!exists) {
      await this.minio.makeBucket(this.bucket, 'us-east-1');
    }
  }

  async list(folder?: string, q?: string, pageRaw?: string, pageSizeRaw?: string) {
    await this.ensureBucket();
    const safeFolder = this.sanitizeFolder(folder);
    const keyword = String(q ?? '').trim().toLowerCase();
    const page = Math.max(1, Number(pageRaw ?? '1') || 1);
    const pageSize = Math.min(100, Math.max(1, Number(pageSizeRaw ?? '30') || 30));

    const rows: Array<{
      key: string;
      folder: string;
      type: AssetType;
      size: number;
      lastModified: string;
      previewUrl: string;
    }> = [];
    const foldersSet = new Set<string>();

    const prefix = safeFolder ? this.prefixedKey(`${safeFolder}/`) : this.prefixedKey('');
    const stream = this.minio.listObjectsV2(this.bucket, prefix, true);
    await new Promise<void>((resolve, reject) => {
      stream.on('data', (obj: { name?: string; size?: number; lastModified?: Date }) => {
        const fullKey = String(obj.name ?? '');
        if (!fullKey) return;
        const key = this.stripRootPrefix(fullKey);
        if (!key) return;
        const folderPrefix = safeFolder ? `${safeFolder}/` : '';
        const relative = folderPrefix && key.startsWith(folderPrefix) ? key.slice(folderPrefix.length) : key;
        if (!relative) return;
        const slashIdx = relative.indexOf('/');
        if (slashIdx >= 0) {
          const childFolder = relative.slice(0, slashIdx).trim();
          if (childFolder) foldersSet.add(childFolder);
          return;
        }
        if (keyword && !key.toLowerCase().includes(keyword)) return;
        rows.push({
          key,
          folder: safeFolder,
          type: this.detectAssetType(key),
          size: Number(obj.size ?? 0),
          lastModified: obj.lastModified ? obj.lastModified.toISOString() : '',
          previewUrl: ''
        });
      });
      stream.on('end', () => resolve());
      stream.on('error', (error: Error) => reject(error));
    });

    rows.sort((a, b) => (a.lastModified < b.lastModified ? 1 : -1));
    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const paged = rows.slice((safePage - 1) * pageSize, safePage * pageSize);

    await Promise.all(
      paged.map(async (item) => {
        item.previewUrl = await this.minio.presignedGetObject(
          this.bucket,
          this.prefixedKey(item.key),
          15 * 60
        );
      })
    );

    return {
      bucket: this.bucket,
      folder: safeFolder,
      parentFolder: safeFolder.includes('/') ? safeFolder.slice(0, safeFolder.lastIndexOf('/')) : '',
      page: safePage,
      pageSize,
      total,
      totalPages,
      folders: Array.from(foldersSet).sort((a, b) => a.localeCompare(b)),
      files: paged,
      items: paged
    };
  }

  async presign(key?: string) {
    await this.ensureBucket();
    const safeKey = this.normalizeIncomingKey(key);
    if (!safeKey) {
      return { key: '', previewUrl: '' };
    }
    const fullKey = this.prefixedKey(safeKey);
    const url = await this.minio.presignedGetObject(this.bucket, fullKey, 15 * 60);
    return { key: safeKey, previewUrl: url };
  }

  async upload(folder: string, file: { originalname: string; mimetype: string; buffer: Buffer }) {
    await this.ensureBucket();
    const safeFolder = this.sanitizeFolder(folder);
    const baseName = this.sanitizeKey(file.originalname).split('/').pop() || `file-${Date.now()}`;
    const safeName = baseName.replace(/\s+/g, '_');
    const ts = Date.now();
    const key = safeFolder ? `${safeFolder}/${ts}-${safeName}` : `${ts}-${safeName}`;
    const fullKey = this.prefixedKey(key);
    await this.minio.putObject(
      this.bucket,
      fullKey,
      file.buffer,
      file.buffer.length,
      { 'Content-Type': file.mimetype || 'application/octet-stream' }
    );
    const uploadInfo = await this.presign(key);

    const isScormFolder = /(^|\/)courses\/scorm(\/|$)/i.test(safeFolder);
    const isZip = /\.zip$/i.test(safeName) || /application\/(zip|x-zip-compressed)/i.test(String(file.mimetype || ''));
    if (!isScormFolder || !isZip) return uploadInfo;

    try {
      const scorm = await this.extractScormPackage(safeFolder, safeName, file.buffer, ts);
      return {
        ...uploadInfo,
        scormEntryKey: scorm.entryKey,
        scormIndexFile: scorm.indexFile,
        scormExtractedBase: scorm.extractedBase
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'SCORM extraction failed';
      return {
        ...uploadInfo,
        scormExtractError: message
      };
    }
  }

  private async getObjectBuffer(fullKey: string): Promise<Buffer> {
    const stream = await this.minio.getObject(this.bucket, fullKey);
    return await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', (e: Error) => reject(e));
    });
  }

  private sanitizeZipEntryPath(input: string): string {
    return String(input || '')
      .replace(/\\/g, '/')
      .replace(/\.\./g, '')
      .replace(/^\/+/, '')
      .trim();
  }

  private pickScormLaunchFile(entries: string[]): string {
    const normalized = entries.map((x) => this.sanitizeZipEntryPath(x)).filter(Boolean);
    const lc = normalized.map((x) => x.toLowerCase());

    const manifestIndex = lc.findIndex((x) => x.endsWith('imsmanifest.xml'));
    if (manifestIndex >= 0) {
      const manifestPath = normalized[manifestIndex];
      const manifestDir = manifestPath.includes('/') ? manifestPath.slice(0, manifestPath.lastIndexOf('/')) : '';
      const sameDirHtml = normalized.find((entry) => {
        const lower = entry.toLowerCase();
        if (!lower.endsWith('.html') && !lower.endsWith('.htm')) return false;
        if (!manifestDir) return !entry.includes('/');
        return entry.startsWith(manifestDir + '/');
      });
      if (sameDirHtml) return sameDirHtml;
    }

    const preferred = [
      // Captivate / iSpring / common SCORM launch files
      'index_lms.html',
      'indexapi.html',
      'index_scorm.html',
      'scormdriver/indexapi.html',
      'story.html',
      'story_html5.html',
      'launch.html',
      'start.html',
      'player.html',
      'scorm.html',
      'index.html'
    ];

    const preferredIdx = preferred
      .map((cand) => lc.findIndex((x) => x.endsWith('/' + cand) || x === cand))
      .find((idx) => idx != null && idx >= 0);
    if (preferredIdx != null && preferredIdx >= 0) return normalized[preferredIdx];

    // Fallback scoring for custom exports:
    // 1) html/xhtml
    // 2) shallower paths
    // 3) filenames containing launch/index/scorm/story/player
    const htmlCandidates = normalized
      .filter((entry) => /\.(html?|xhtml)$/i.test(entry))
      .map((entry) => {
        const lower = entry.toLowerCase();
        const depth = entry.split('/').length;
        const base = lower.split('/').pop() || lower;
        const keywordScore =
          (/(index|launch|start|scorm|story|player)/i.test(base) ? 8 : 0) +
          (/manifest/i.test(base) ? -5 : 0) +
          (/readme|license|changelog/i.test(base) ? -4 : 0);
        return { entry, score: keywordScore - depth };
      })
      .sort((a, b) => b.score - a.score);

    return htmlCandidates[0]?.entry || '';
  }

  private async extractScormPackage(
    safeFolder: string,
    safeName: string,
    buffer: Buffer,
    ts: number
  ): Promise<{ entryKey: string; indexFile: string; extractedBase: string }> {
    const zip = await this.jsZip.loadAsync(buffer);
    const archiveBaseName = safeName.replace(/\.zip$/i, '') || `scorm_${ts}`;
    const extractedBase = safeFolder ? `${safeFolder}/${ts}-${archiveBaseName}` : `${ts}-${archiveBaseName}`;

    const fileEntries = Object.values(zip.files).filter((f) => !f.dir);
    if (!fileEntries.length) {
      throw new Error('SCORM package has no files.');
    }

    const uploadedEntries: string[] = [];
    for (const entry of fileEntries) {
      const rel = this.sanitizeZipEntryPath(entry.name);
      if (!rel) continue;
      const objectKey = `${extractedBase}/${rel}`;
      const fullObjectKey = this.prefixedKey(objectKey);
      const content = await entry.async('nodebuffer');
      const ct = /\.(html?)$/i.test(rel)
        ? 'text/html'
        : /\.(js)$/i.test(rel)
          ? 'application/javascript'
          : /\.(css)$/i.test(rel)
            ? 'text/css'
            : /\.(png)$/i.test(rel)
              ? 'image/png'
              : /\.(jpe?g)$/i.test(rel)
                ? 'image/jpeg'
                : /\.(svg)$/i.test(rel)
                  ? 'image/svg+xml'
                  : /\.(json)$/i.test(rel)
                    ? 'application/json'
                    : 'application/octet-stream';
      await this.minio.putObject(this.bucket, fullObjectKey, content, content.length, { 'Content-Type': ct });
      uploadedEntries.push(rel);
    }

    const launchRel = this.pickScormLaunchFile(uploadedEntries);
    const launchFile = launchRel || uploadedEntries[0];
    const launchKey = `${extractedBase}/${launchFile}`;
    const indexFile = launchFile.includes('/') ? launchFile.slice(launchFile.lastIndexOf('/') + 1) : launchFile;

    return {
      entryKey: launchKey,
      indexFile,
      extractedBase
    };
  }

  async resolveScormEntry(key?: string, indexFile?: string) {
    await this.ensureBucket();
    const safeKey = this.normalizeIncomingKey(key);
    if (!safeKey) return { key: '', previewUrl: '' };
    if (!/\.zip$/i.test(safeKey)) return this.presign(safeKey);

    const fullZipKey = this.prefixedKey(safeKey);
    const zipBuffer = await this.getObjectBuffer(fullZipKey);
    const safeFolder = safeKey.includes('/') ? safeKey.slice(0, safeKey.lastIndexOf('/')) : '';
    const safeName = safeKey.split('/').pop() || `scorm_${Date.now()}.zip`;
    const tsMatch = safeName.match(/^(\d{10,})-/);
    const ts = tsMatch ? Number(tsMatch[1]) : Date.now();
    const extractedBase = safeKey.replace(/\.zip$/i, '');

    const zip = await this.jsZip.loadAsync(zipBuffer);
    const fileEntries = Object.values(zip.files).filter((f) => !f.dir);
    if (!fileEntries.length) return this.presign(safeKey);

    const uploadedEntries = fileEntries
      .map((f) => this.sanitizeZipEntryPath(f.name))
      .filter(Boolean);

    const preferredLaunch = String(indexFile || '').trim();
    const launchRel =
      (preferredLaunch
        ? uploadedEntries.find((entry) => entry.toLowerCase().endsWith('/' + preferredLaunch.toLowerCase()) || entry.toLowerCase() === preferredLaunch.toLowerCase())
        : '') || this.pickScormLaunchFile(uploadedEntries);
    const launchFile = launchRel || uploadedEntries[0];
    const launchKey = `${extractedBase}/${launchFile}`;

    const fullLaunchKey = this.prefixedKey(launchKey);
    const exists = await this.minio
      .statObject(this.bucket, fullLaunchKey)
      .then(() => true)
      .catch(() => false);

    if (!exists) {
      await this.extractScormPackage(safeFolder, safeName, zipBuffer, ts);
    }

    return this.presign(launchKey);
  }

  async createFolder(folder: string, name: string) {
    await this.ensureBucket();
    const safeFolder = this.sanitizeFolder(folder);
    const safeName = this.sanitizeKey(name).replace(/\//g, '');
    const key = safeFolder ? `${safeFolder}/${safeName}/.keep` : `${safeName}/.keep`;
    const fullKey = this.prefixedKey(key);
    const content = Buffer.from('');
    await this.minio.putObject(this.bucket, fullKey, content, content.length);
    return { ok: true, key };
  }

  async deleteKey(key?: string) {
    await this.ensureBucket();
    const safeKey = this.sanitizeKey(key);
    if (safeKey.endsWith('/')) {
      const fullPrefix = this.prefixedKey(safeKey);
      const keys: string[] = [];
      const stream = this.minio.listObjectsV2(this.bucket, fullPrefix, true);
      await new Promise<void>((resolve, reject) => {
        stream.on('data', (obj: { name?: string }) => {
          if (obj.name) keys.push(String(obj.name));
        });
        stream.on('end', () => resolve());
        stream.on('error', (error: Error) => reject(error));
      });
      if (keys.length) {
        await this.minio.removeObjects(this.bucket, keys);
      }
    } else {
      await this.minio.removeObject(this.bucket, this.prefixedKey(safeKey));
    }
    return { ok: true };
  }

  async renameOrMove(key: string, destinationFolder: string, newName?: string) {
    await this.ensureBucket();
    const safeKey = this.sanitizeKey(key);
    const fullSource = this.prefixedKey(safeKey);
    const folder = this.sanitizeFolder(destinationFolder);
    const currentName = safeKey.split('/').pop() || 'file';
    const nextName = this.sanitizeKey(newName ?? currentName).replace(/\//g, '') || currentName;
    const targetKey = folder ? `${folder}/${nextName}` : nextName;
    const fullTarget = this.prefixedKey(targetKey);
    await this.minio.copyObject(this.bucket, fullTarget, `/${this.bucket}/${fullSource}`);
    await this.minio.removeObject(this.bucket, fullSource);
    return this.presign(targetKey);
  }
}
