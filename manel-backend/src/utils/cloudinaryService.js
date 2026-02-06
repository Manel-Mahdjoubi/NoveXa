import { v2 as cloudinary } from 'cloudinary';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Download a file from a Cloudinary URL and return it as a Buffer
 * @param {string} url - The Cloudinary URL
 * @returns {Promise<Buffer>} - The file data
 */
export const downloadFromUrl = async (url) => {
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    };

    try {
        console.log('📥 Primary fetch attempt:', url);
        let response = await fetch(url, { headers });
        
        // If 404, 401, or 403, we might need a signed URL or resource type swap
        if (!response.ok && (response.status === 404 || response.status === 401 || response.status === 403)) {
            console.log(`⚠️ Primary fetch failed (${response.status}). Attempting signed URL fallback...`);
            
            try {
                // Extract public_id and resource_type from URL
                const parts = url.split('/');
                const filenameIdx = parts.length - 1;
                const uploadIdx = parts.indexOf('upload');
                
                if (uploadIdx !== -1 && uploadIdx + 2 < parts.length) {
                    const resourceType = parts[uploadIdx - 1]; // e.g., 'image', 'video', 'raw'
                    const publicIdWithExt = parts.slice(uploadIdx + 2).join('/');
                    const publicId = publicIdWithExt.split('.')[0];
                    
                    console.log(`🔐 Generating signed URL for resource: ${publicId} (${resourceType})`);
                    
                    // Generate a signed URL using SDK
                    const signedUrl = cloudinary.url(publicId, {
                        resource_type: resourceType === 'upload' ? 'image' : resourceType,
                        sign_url: true,
                        secure: true,
                        type: 'upload'
                    });
                    
                    console.log('📥 Signed URL fetch attempt:', signedUrl);
                    response = await fetch(signedUrl, { headers });
                }
            } catch (signError) {
                console.warn('⚠️ Could not generate signed URL:', signError.message);
            }
            
            // If still failing, try the old resource_type swap logic
            if (!response.ok) {
                let altUrl = url;
                if (url.includes('/image/upload/')) {
                    altUrl = url.replace('/image/upload/', '/raw/upload/');
                } else if (url.includes('/raw/upload/')) {
                    altUrl = url.replace('/raw/upload/', '/image/upload/');
                }
                
                if (altUrl !== url) {
                    console.log('📥 Alternative resource type fetch attempt:', altUrl);
                    response = await fetch(altUrl, { headers });
                }
            }

            // Final attempt: removing version number
            if (!response.ok && url.includes('/v')) {
                const versionlessUrl = url.replace(/\/v\d+\//, '/');
                if (versionlessUrl !== url) {
                    console.log('📥 Version-less fetch attempt:', versionlessUrl);
                    response = await fetch(versionlessUrl, { headers });
                }
            }
        }

        if (!response.ok) {
            throw new Error(`Failed to fetch file from Cloudinary: ${response.status} ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
    } catch (error) {
        console.error('Error downloading from Cloudinary:', error.message);
        throw error;
    }
};

/**
 * Upload a certificate file (buffer) to Cloudinary
 * @param {Buffer} buffer - The file buffer
 * @param {string} folder - The folder name
 * @param {string} filename - The desired filename (public_id)
 * @returns {Promise<Object>} - Cloudinary upload result
 */
export const uploadCertificate = (buffer, folder, filename) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                public_id: filename,
                resource_type: 'auto', // Better for images like certificates
                overwrite: true
            },
            (error, result) => {
                if (error) {
                    console.error('Cloudinary upload error:', error);
                    return reject(error);
                }
                resolve(result);
            }
        );
        uploadStream.end(buffer);
    });
};

/**
 * Delete a file from Cloudinary using its URL
 * @param {string} url - The Cloudinary URL
 * @param {string} resourceType - The resource type (image, video, raw)
 * @returns {Promise<Object>} - Cloudinary deletion result
 */
export const deleteByUrl = async (url, resourceType = 'auto') => {
    try {
        if (!url || !url.includes('cloudinary.com')) {
            console.log('ℹ️ Not a Cloudinary URL, skipping deletion');
            return null;
        }

        const parts = url.split('/');
        const uploadIdx = parts.indexOf('upload');
        if (uploadIdx === -1) {
            console.warn('⚠️ Could not find "upload" in Cloudinary URL');
            return null;
        }

        // Determine if there is a version number (v1234567) after 'upload'
        let startIndex = uploadIdx + 1;
        while (startIndex < parts.length) {
            const segment = parts[startIndex];
            if (segment.includes('=') || segment.includes(',') || (segment.startsWith('v') && !isNaN(segment.substring(1)))) {
                startIndex++;
            } else {
                break;
            }
        }
        
        const publicIdWithExt = parts.slice(startIndex).join('/');
        const lowerUrl = url.toLowerCase();
        const isRaw = lowerUrl.endsWith('.pdf') || lowerUrl.endsWith('.doc') || lowerUrl.endsWith('.docx') || 
                      lowerUrl.endsWith('.ppt') || lowerUrl.endsWith('.pptx') || lowerUrl.endsWith('.xls') || 
                      lowerUrl.endsWith('.xlsx') || lowerUrl.endsWith('.mp4') || lowerUrl.endsWith('.mp3');
        
        const finalResourceType = resourceType !== 'auto' ? resourceType : (isRaw ? 'raw' : 'image');

        let publicId = publicIdWithExt;
        if (finalResourceType === 'image') {
            publicId = publicIdWithExt.split('.')[0];
        }

        console.log(`🗑️ Deleting from Cloudinary: ${publicId} (${finalResourceType})`);

        return await cloudinary.uploader.destroy(publicId, {
            resource_type: finalResourceType
        });
    } catch (error) {
        console.error('Error deleting from Cloudinary:', error.message);
        throw error;
    }
};