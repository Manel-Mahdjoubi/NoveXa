/**
 * NoveXa Certificate Generation Service
 * 
 * This service handles secure certificate generation with:
 * - PSD template text layer manipulation
 * - Multiple export formats (PNG, JPG, PDF)
 * - QR code generation for verification
 * - RTL/Arabic text support
 * - Database encryption and storage
 */

import { readPsd, writePsdBuffer, initializeCanvas } from 'ag-psd';
import sharp from 'sharp';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import CryptoJS from 'crypto-js';
import fs from 'fs/promises';
import path from 'path';
import { createCanvas, Image } from 'canvas';

// Initialize ag-psd with node-canvas
initializeCanvas((width, height) => createCanvas(width, height));

class CertificateService {
  constructor() {
    // Encryption key from environment variable
    this.encryptionKey = process.env.CERTIFICATE_ENCRYPTION_KEY || 'novexa-certificate-secret-key-2026';
    
    // Base URL for verification (should be your production domain)
    this.baseVerificationUrl = process.env.BASE_URL || 'http://localhost:3000';
    
    // PSD template path - pointing to frontend certificate directory
    // NOTE: For production, export your PSD as PNG and use that instead
    this.templatePath = path.join(process.cwd(), '..', 'frontend', 'certificate NoveXa', 'certificate.psd');
    this.templatePngPath = path.join(process.cwd(), '..', 'frontend', 'certificate NoveXa', 'certificate.png');
  }

  /**
   * Generate a unique certificate ID
   * Format: NOVX-YYYY-XXXXXXXX (e.g., NOVX-2026-A3F7B9C1)
   */
  generateCertificateId() {
    const year = new Date().getFullYear();
    const uniqueId = uuidv4().split('-')[0].toUpperCase();
    return `NOVX-${year}-${uniqueId}`;
  }

  /**
   * Recursively find a text layer by name in PSD structure
   * Supports nested layer groups
   */
  findTextLayer(layers, layerName) {
    if (!layers || !Array.isArray(layers)) return null;

    for (const layer of layers) {
      // Check if this layer matches (trim spaces from layer name)
      const normalizedLayerName = layer.name ? layer.name.trim().toLowerCase() : '';
      const normalizedSearchName = layerName.trim().toLowerCase();
      
      if (normalizedLayerName === normalizedSearchName && layer.text) {
        return layer;
      }

      // Recursively search in child layers
      if (layer.children && layer.children.length > 0) {
        const found = this.findTextLayer(layer.children, layerName);
        if (found) return found;
      }
    }

    return null;
  }

  /**
   * Get all layer names from PSD (for debugging)
   */
  getAllLayerNames(layers, prefix = '') {
    if (!layers || !Array.isArray(layers)) return [];
    
    const names = [];
    for (const layer of layers) {
      const layerName = prefix + (layer.name || 'Unnamed');
      names.push(layerName + (layer.text ? ' [TEXT]' : ''));
      
      if (layer.children && layer.children.length > 0) {
        names.push(...this.getAllLayerNames(layer.children, layerName + ' > '));
      }
    }
    return names;
  }

  /**
   * Update text content of a specific layer while preserving formatting
   */
  updateTextLayer(layer, newText) {
    if (!layer || !layer.text) {
      throw new Error('Invalid text layer');
    }

    // Preserve original text formatting properties
    const originalStyle = {
      font: layer.text.style?.font || 'Arial',
      fontSize: layer.text.style?.fontSize || 48,
      fillColor: layer.text.style?.fillColor || { r: 0, g: 0, b: 0 },
      alignment: layer.text.style?.alignment || 'center',
      direction: layer.text.style?.direction || 'ltr' // Support RTL for Arabic
    };

    // Update the text content
    layer.text.text = newText;

    // Ensure style is preserved
    if (layer.text.style) {
      Object.assign(layer.text.style, originalStyle);
    }

    return layer;
  }

  /**
   * Generate QR code as base64 data URL and return verification link
   */
  async generateQRCode(certificateId) {
    const verificationUrl = `${this.baseVerificationUrl}/api/certificates/verify/${certificateId}`;
    
    try {
      const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      return {
        qrCodeData: qrDataUrl,
        verificationLink: verificationUrl
      };
    } catch (error) {
      throw new Error(`QR code generation failed: ${error.message}`);
    }
  }

  /**
   * Process PSD template and replace text layers
   * Uses PNG template for exact design preservation, with text overlay
   */
  async processPsdTemplate(certificateData) {
    const { studentName, courseName, completionDate, certificateId } = certificateData;

    try {
      // Try PNG template first (exported from Photoshop - best quality)
      let templateBuffer;
      
      try {
        templateBuffer = await fs.readFile(this.templatePngPath);
        console.log('✓ Using PNG template (best quality)');
      } catch (pngError) {
        // Fall back to PSD extraction (may have quality issues)
        console.log('⚠ PNG template not found, falling back to PSD extraction...');
        console.log('  For best results, export certificate.png from Photoshop');
        
        const psdBuffer = await fs.readFile(this.templatePath);
        const arrayBuffer = psdBuffer.buffer.slice(
          psdBuffer.byteOffset,
          psdBuffer.byteOffset + psdBuffer.byteLength
        );

        const psd = readPsd(arrayBuffer, { skipCompositeImageData: false });
        
        if (psd.canvas) {
          // With node-canvas, we can get the buffer directly
          const rawBuffer = psd.canvas.toBuffer(); 
          // Note: readPsd with node-canvas usually returns a canvas that has toBuffer() for PNG by default
          // But since we initialized with node-canvas, psd.canvas IS a node-canvas instance
          
          templateBuffer = await sharp(rawBuffer).png().toBuffer();
          console.log(`✓ PSD extracted: ${psd.width}x${psd.height}`);
        } else {
          throw new Error('Could not extract image from PSD');
        }
      }

      // Get image dimensions
      const metadata = await sharp(templateBuffer).metadata();
      const { width, height } = metadata;

      // Format the completion date
      const dateStr = completionDate instanceof Date 
        ? completionDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : completionDate;

      // ============================================================
      // TEXT POSITION CONFIGURATION - Exact positions from design
      // ============================================================
      // Certificate dimensions: 3580 x 2552 pixels
      // Positions provided by designer (X = horizontal, Y = vertical from top)
      
      const textConfig = {
        studentName: {
          x: 1802,                // Centered at X=1802
          y: 1160,                // Y=1160 from top (moved down)
          fontSize: 120,          // Font size in pixels (increased)
          fontFamily: 'Georgia, serif',
          fontWeight: 'bold',
          color: '#1a1a1a',
          stroke: '#ffffff',      // White stroke for contrast
          strokeWidth: 2
        },
        courseName: {
          x: 1760,                // X=1760
          y: 1760,                // Y=1760 from top
          fontSize: 85,           // Font size in pixels (increased)
          fontFamily: 'Georgia, serif',
          fontWeight: 'normal',
          color: '#333333',
          stroke: '#ffffff',
          strokeWidth: 1
        },
        date: {
          x: 1803,                // X=1803
          y: 2145,                // Y=2145 from top
          fontSize: 45,           // Font size in pixels
          fontFamily: 'Arial, sans-serif',
          fontWeight: 'normal',
          color: '#444444',
          stroke: '#ffffff',
          strokeWidth: 1
        }
        // certificateId is hidden (not displayed on UI)
      };

      // Create SVG text overlay with stroke for better visibility
      const svgText = `
        <svg width="${width}" height="${height}">
          <!-- Student Name -->
          <text x="${textConfig.studentName.x}" y="${textConfig.studentName.y}" 
                text-anchor="middle" 
                font-family="${textConfig.studentName.fontFamily}"
                font-size="${textConfig.studentName.fontSize}px"
                font-weight="${textConfig.studentName.fontWeight}"
                fill="${textConfig.studentName.color}"
                stroke="${textConfig.studentName.stroke}"
                stroke-width="${textConfig.studentName.strokeWidth}"
                paint-order="stroke fill">
            ${this.escapeXml(studentName)}
          </text>
          
          <!-- Course Name -->
          <text x="${textConfig.courseName.x}" y="${textConfig.courseName.y}" 
                text-anchor="middle"
                font-family="${textConfig.courseName.fontFamily}"
                font-size="${textConfig.courseName.fontSize}px"
                font-weight="${textConfig.courseName.fontWeight}"
                fill="${textConfig.courseName.color}"
                stroke="${textConfig.courseName.stroke}"
                stroke-width="${textConfig.courseName.strokeWidth}"
                paint-order="stroke fill">
            ${this.escapeXml(courseName)}
          </text>
          
          <!-- Date -->
          <text x="${textConfig.date.x}" y="${textConfig.date.y}" 
                text-anchor="middle"
                font-family="${textConfig.date.fontFamily}"
                font-size="${textConfig.date.fontSize}px"
                font-weight="${textConfig.date.fontWeight}"
                fill="${textConfig.date.color}"
                stroke="${textConfig.date.stroke}"
                stroke-width="${textConfig.date.strokeWidth}"
                paint-order="stroke fill">
            ${this.escapeXml(dateStr)}
          </text>
        </svg>
      `;

      // Composite text overlay on template
      const finalBuffer = await sharp(templateBuffer)
        .composite([{
          input: Buffer.from(svgText),
          top: 0,
          left: 0
        }])
        .png()
        .toBuffer();

      console.log(`✓ Text overlay added: ${studentName}, ${courseName}`);
      
      return finalBuffer;
      
    } catch (error) {
      throw new Error(`PSD processing failed: ${error.message}`);
    }
  }

  /**
   * Escape special XML characters for SVG text
   */
  escapeXml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Convert image buffer to PNG
   * Input is already PNG from processPsdTemplate, just pass through
   */
  async convertToPNG(imageBuffer) {
    try {
      // The buffer is already PNG from processPsdTemplate
      // Just ensure it's properly formatted
      const pngBuffer = await sharp(imageBuffer)
        .png()
        .toBuffer();
      return pngBuffer;
    } catch (error) {
      throw new Error(`PNG conversion failed: ${error.message}`);
    }
  }

  /**
   * Convert image buffer to JPG
   */
  async convertToJPG(imageBuffer, quality = 90) {
    try {
      const jpgBuffer = await sharp(imageBuffer)
        .jpeg({ quality })
        .toBuffer();
      return jpgBuffer;
    } catch (error) {
      throw new Error(`JPG conversion failed: ${error.message}`);
    }
  }

  /**
   * Convert image buffer to PDF using PDFKit
   */
  async convertToPDF(imageBuffer, format = 'png') {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape',
          margins: { top: 0, bottom: 0, left: 0, right: 0 }
        });

        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Add image to PDF (fit to page)
        const imgType = format.toUpperCase();
        doc.image(imageBuffer, 0, 0, {
          fit: [doc.page.width, doc.page.height],
          align: 'center',
          valign: 'center'
        });

        doc.end();
      } catch (error) {
        reject(new Error(`PDF conversion failed: ${error.message}`));
      }
    });
  }

  /**
   * Encrypt certificate data for secure storage
   */
  encryptData(data) {
    try {
      const encrypted = CryptoJS.AES.encrypt(
        data.toString('base64'),
        this.encryptionKey
      ).toString();
      return Buffer.from(encrypted, 'utf-8');
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt certificate data for retrieval
   */
  decryptData(encryptedBuffer) {
    try {
      const encryptedString = encryptedBuffer.toString('utf-8');
      const decrypted = CryptoJS.AES.decrypt(encryptedString, this.encryptionKey);
      const base64String = decrypted.toString(CryptoJS.enc.Utf8);
      return Buffer.from(base64String, 'base64');
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Main certificate generation function
   * 
   * @param {Object} params - Certificate parameters
   * @param {string} params.studentName - Full student name
   * @param {string} params.courseName - Course title
   * @param {Date} params.completionDate - Course completion date
   * @param {string} params.format - Export format (png, jpg, pdf)
   * @returns {Object} Certificate data including encrypted file and QR code
   */
  async generateCertificate(params) {
    const {
      studentName,
      courseName,
      completionDate,
      format = 'png'
    } = params;

    // Validate format
    const validFormats = ['png', 'jpg', 'pdf'];
    if (!validFormats.includes(format.toLowerCase())) {
      throw new Error(`Invalid format. Must be one of: ${validFormats.join(', ')}`);
    }

    try {
      console.log('   [Service] Starting generation...');
      // Generate unique certificate ID
      const certificateId = this.generateCertificateId();
      console.log('   [Service] ID created:', certificateId);

      // Format completion date for display
      const formattedDate = new Date(completionDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Process PSD template
      console.log('   [Service] Processing PSD template...');
      const modifiedPsdBuffer = await this.processPsdTemplate({
        studentName,
        courseName,
        completionDate: formattedDate,
        certificateId
      });
      console.log('   [Service] PSD processed, buffer size:', modifiedPsdBuffer.length);

      // Convert to requested format
      let certificateBuffer;
      const formatLower = format.toLowerCase();
      console.log('   [Service] Converting to:', formatLower);

      switch (formatLower) {
        case 'png':
          certificateBuffer = await this.convertToPNG(modifiedPsdBuffer);
          break;
        case 'jpg':
          certificateBuffer = await this.convertToJPG(modifiedPsdBuffer);
          break;
        case 'pdf':
          const pngBuffer = await this.convertToPNG(modifiedPsdBuffer);
          certificateBuffer = await this.convertToPDF(pngBuffer, 'png');
          break;
        default:
          throw new Error('Unsupported format');
      }

      // Generate QR code and verification link
      const { qrCodeData, verificationLink } = await this.generateQRCode(certificateId);

      // Encrypt certificate data for secure storage
      const encryptedData = this.encryptData(certificateBuffer);

      return {
        certificateId,
        studentName,
        courseName,
        completionDate: new Date(completionDate),
        qrCodeData,
        verificationLink,
        format: formatLower,
        fileData: encryptedData,        // Encrypted data for database storage
        rawFileData: certificateBuffer,  // Raw PNG/JPG/PDF for Cloudinary upload
        metadata: {
          fileSize: certificateBuffer.length,
          encryptedSize: encryptedData.length,
          generatedAt: new Date()
        }
      };
    } catch (error) {
      throw new Error(`Certificate generation failed: ${error.message}`);
    }
  }

  /**
   * Retrieve and decrypt certificate
   */
  async retrieveCertificate(encryptedData) {
    try {
      return this.decryptData(encryptedData);
    } catch (error) {
      throw new Error(`Certificate retrieval failed: ${error.message}`);
    }
  }

  /**
   * Verify certificate template exists and is valid
   */
  async verifyTemplate() {
    try {
      // Check if PNG template exists first (preferred)
      let hasPng = false;
      let hasPsd = false;
      
      try {
        await fs.access(this.templatePngPath);
        hasPng = true;
      } catch (e) {}
      
      try {
        await fs.access(this.templatePath);
        hasPsd = true;
      } catch (e) {}
      
      if (!hasPng && !hasPsd) {
        return {
          exists: false,
          valid: false,
          error: 'No template found. Please provide certificate.png or certificate.psd',
          path: this.templatePngPath
        };
      }

      // If PNG exists, use it (preferred method - text overlay mode)
      if (hasPng) {
        return {
          exists: true,
          valid: true,
          foundLayers: ['PNG template with text overlay (preferred)'],
          missingLayers: [],
          templateType: 'png'
        };
      }

      // If PSD exists, verify layers
      const psdBuffer = await fs.readFile(this.templatePath);
      const arrayBuffer = psdBuffer.buffer.slice(
        psdBuffer.byteOffset,
        psdBuffer.byteOffset + psdBuffer.byteLength
      );
      const psd = readPsd(arrayBuffer);

      // Get all layer names for debugging
      const allLayers = this.getAllLayerNames(psd.children);

      // Check for required layers
      const requiredLayers = ['username', 'coursename', 'date', 'certificateid'];
      const foundLayers = [];

      for (const layerName of requiredLayers) {
        if (this.findTextLayer(psd.children, layerName)) {
          foundLayers.push(layerName);
        }
      }

      return {
        exists: true,
        valid: foundLayers.length === requiredLayers.length,
        foundLayers,
        missingLayers: requiredLayers.filter(l => !foundLayers.includes(l)),
        allLayers // Include all layers for debugging
      };
    } catch (error) {
      return {
        exists: false,
        valid: false,
        error: error.message,
        path: this.templatePath
      };
    }
  }

  /**
   * Export certificate to file system (for development/testing)
   * @param {Buffer} certificateBuffer - Decrypted certificate buffer
   * @param {string} certificateId - Certificate ID
   * @param {string} format - File format (png/jpg/pdf)
   * @param {string} outputDir - Output directory path (default: certificates-export)
   */
  async exportCertificateToFile(certificateBuffer, certificateId, format, outputDir = 'certificates-export') {
    try {
      const exportPath = path.join(process.cwd(), outputDir);
      
      // Create export directory if it doesn't exist
      await fs.mkdir(exportPath, { recursive: true });

      const fileName = `Certificate_${certificateId}.${format}`;
      const filePath = path.join(exportPath, fileName);

      // Write file to disk
      await fs.writeFile(filePath, certificateBuffer);

      return {
        success: true,
        filePath,
        fileName,
        message: `Certificate exported to ${filePath}`
      };
    } catch (error) {
      throw new Error(`Certificate export failed: ${error.message}`);
    }
  }
}

export default new CertificateService();