import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { put } from '@vercel/blob';
import prisma from './prisma.js';

const BACKUP_DIRS = [
  "c:\\Users\\uscha\\Documents\\Melkamu\\OneDrive\\Documents\\kewars\\kewars-data-backup",
  "c:\\Users\\uscha\\Documents\\Melkamu\\OneDrive\\Documents\\kewars\\reports-media-backup"
];

const mimeTypes = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'video/ogg',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain'
};

function findFileRecursive(dir, filename) {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      const found = findFileRecursive(filePath, filename);
      if (found) return found;
    } else if (file.toLowerCase() === filename.toLowerCase()) {
      return filePath;
    }
  }
  return null;
}

async function migrate() {
  console.log("Starting S3 legacy files migration to Vercel Blob...");

  try {
    // 1. Fetch all reports containing media
    const allReports = await prisma.reports.findMany({
      where: {
        has_media: true
      }
    });

    console.log(`Found ${allReports.length} reports with media files in the database.`);

    let totalUpdated = 0;
    const uploadedKeys = new Map();

    for (const report of allReports) {
      const { report_id, revision, media_files } = report;
      if (!media_files || media_files.length === 0) continue;

      let reportUpdated = false;
      const newMediaFiles = [...media_files];

      for (let i = 0; i < media_files.length; i++) {
        const fileUrl = media_files[i];

        // Only migrate legacy S3 files (relative keys containing ":" or "private/")
        const isS3Key = !fileUrl.startsWith('http') && (
          fileUrl.includes('private/') || fileUrl.includes('public/') || fileUrl.includes('protected/')
        );

        if (!isS3Key) {
          console.log(`Report [${report_id} v${revision}] file [${fileUrl}] is already migrated or not S3 key. Skipping.`);
          continue;
        }

        if (uploadedKeys.has(fileUrl)) {
          console.log(`Report [${report_id} v${revision}] key [${fileUrl}] already uploaded in this run. Reusing Vercel Blob URL.`);
          newMediaFiles[i] = uploadedKeys.get(fileUrl);
          reportUpdated = true;
          continue;
        }

        console.log(`Migrating S3 key [${fileUrl}] for Report [${report_id} v${revision}]...`);

        // Resolve local file path
        // Replace colon with underscore in identity ID folder
        let relativePath = fileUrl.startsWith('/') ? fileUrl.substring(1) : fileUrl;
        relativePath = relativePath.replace(':', '_');
        // Convert to Windows backslashes
        const normalizedRelPath = relativePath.replace(/\//g, path.sep);

        let localFilePath = null;
        for (const baseDir of BACKUP_DIRS) {
          const testPath = path.join(baseDir, normalizedRelPath);
          if (fs.existsSync(testPath)) {
            localFilePath = testPath;
            break;
          }
        }

        if (!localFilePath) {
          console.log(`exact path not found for S3 key [${fileUrl}]. Searching recursively...`);
          const filename = path.basename(normalizedRelPath);
          for (const baseDir of BACKUP_DIRS) {
            localFilePath = findFileRecursive(baseDir, filename);
            if (localFilePath) {
              console.log(`Found file via recursive search at: ${localFilePath}`);
              break;
            }
          }
        }

        if (!localFilePath) {
          console.error(`ERROR: Could not find local file for [${fileUrl}] under backup directories.`);
          continue;
        }

        console.log(`Found local file at: ${localFilePath}`);

        // Read file content
        const fileBuffer = fs.readFileSync(localFilePath);
        const ext = path.extname(localFilePath).toLowerCase();
        const mimeType = mimeTypes[ext] || 'application/octet-stream';
        const filename = path.basename(localFilePath);

        // Upload to Vercel Blob
        const blobFilename = `migrated/${report_id}/${filename}`;
        console.log(`Uploading to Vercel Blob as [${blobFilename}] with mime [${mimeType}]...`);

        const blob = await put(blobFilename, fileBuffer, {
          access: 'private',
          contentType: mimeType,
          allowOverwrite: true,
          token: process.env.BLOB_READ_WRITE_TOKEN
        });

        console.log(`Uploaded! New URL: ${blob.url}`);

        // Update in-memory array and cache
        newMediaFiles[i] = blob.url;
        uploadedKeys.set(fileUrl, blob.url);
        reportUpdated = true;
      }

      if (reportUpdated) {
        // Update database row
        await prisma.reports.update({
          where: {
            report_id_revision: {
              report_id,
              revision
            }
          },
          data: {
            media_files: newMediaFiles
          }
        });
        console.log(`Successfully updated database for Report [${report_id} v${revision}].`);
        totalUpdated++;
      }
    }

    console.log(`Migration complete! Total report rows updated: ${totalUpdated}`);
  } catch (err) {
    console.error("Migration failed with error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
