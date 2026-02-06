import { google } from 'googleapis';
import stream from 'stream';
import dotenv from 'dotenv';

dotenv.config();

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_DRIVE_CLIENT_ID,
    process.env.GOOGLE_DRIVE_CLIENT_SECRET,
    process.env.GOOGLE_DRIVE_REDIRECT_URI
);

oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN
});

const drive = google.drive({
    version: 'v3',
    auth: oauth2Client
});

/**
 * Find or create a folder in Google Drive
 * @param {string} folderName - Name of the folder
 * @param {string} [parentFolderId] - Optional parent folder ID
 * @returns {Promise<string>} - The Folder ID
 */
export const getOrCreateFolder = async (folderName, parentFolderId = null) => {
    try {
        // Search for existing folder
        let query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
        if (parentFolderId) {
            query += ` and '${parentFolderId}' in parents`;
        }

        const response = await drive.files.list({
            q: query,
            fields: 'files(id, name)',
            spaces: 'drive'
        });

        if (response.data.files && response.data.files.length > 0) {
            const folderId = response.data.files[0].id;
            
            // Fetch full folder details to ensure webViewLink is populated
            const folderDetails = await drive.files.get({
                fileId: folderId,
                fields: 'id, name, webViewLink'
            });
            
            console.log(`📁 Found existing folder: ${folderName} (${folderId})`);
            return { id: folderDetails.data.id, webViewLink: folderDetails.data.webViewLink };
        }

        // Create new folder if not found
        const fileMetadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: parentFolderId ? [parentFolderId] : []
        };

        const folder = await drive.files.create({
            resource: fileMetadata,
            fields: 'id, webViewLink'
        });

        // Make folder public/viewable
        await drive.permissions.create({
            fileId: folder.data.id,
            resource: { role: 'reader', type: 'anyone' }
        });

        console.log(`📁 Created new folder: ${folderName} (${folder.data.id})`);
        return { id: folder.data.id, webViewLink: folder.data.webViewLink };
    } catch (error) {
        console.error('Error in getOrCreateFolder:', error);
        throw error;
    }
};

/**
 * Upload a file buffer to a specific subject folder in Google Drive
 * @param {Buffer} buffer - File data
 * @param {string} fileName - Name for the file
 * @param {string} subject - The subject (used for folder naming)
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<Object>} - Drive file info
 */
export const uploadFile = async (buffer, fileName, subject, mimeType) => {
    try {
        // 1. Get or create the root "Library files" folder
        const rootFolder = await getOrCreateFolder('Library files');
        
        // 2. Get or create the subject folder inside the root folder
        const folderInfo = await getOrCreateFolder(subject, rootFolder.id);
        const folderId = folderInfo.id;

        // 2. Setup upload
        const bufferStream = new stream.PassThrough();
        bufferStream.end(buffer);

        const fileMetadata = {
            name: fileName,
            parents: [folderId]
        };

        const media = {
            mimeType: mimeType,
            body: bufferStream
        };

        const file = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, name, webViewLink, webContentLink'
        });

        // 3. Make the file public (optional but usually needed for library links)
        await drive.permissions.create({
            fileId: file.data.id,
            resource: {
                role: 'reader',
                type: 'anyone'
            }
        });

        console.log(`✅ Uploaded ${fileName} to Drive. Link: ${file.data.webViewLink}`);

        return {
            fileId: file.data.id,
            webViewLink: file.data.webViewLink,
            webContentLink: file.data.webContentLink,
            folderUrl: folderInfo.webViewLink
        };
    } catch (error) {
        console.error('Error uploading to Google Drive:', error);
        throw error;
    }
};