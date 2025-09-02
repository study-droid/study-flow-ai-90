import { log } from '@/lib/config';

// File validation configuration
export const FILE_VALIDATION_CONFIG = {
  // Maximum file sizes by type (in bytes)
  maxSizes: {
    image: 10 * 1024 * 1024,      // 10MB for images
    document: 25 * 1024 * 1024,    // 25MB for documents
    video: 100 * 1024 * 1024,      // 100MB for videos
    default: 10 * 1024 * 1024      // 10MB default
  },
  
  // Allowed MIME types by category
  allowedTypes: {
    images: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml'
    ],
    documents: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv'
    ],
    videos: [
      'video/mp4',
      'video/webm',
      'video/ogg'
    ],
    audio: [
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/mp3'
    ]
  },
  
  // Dangerous file extensions to block
  blockedExtensions: [
    '.exe', '.com', '.bat', '.cmd', '.msi', '.app',
    '.jar', '.scr', '.vbs', '.js', '.jse', '.ws',
    '.wsf', '.wsc', '.wsh', '.ps1', '.ps1xml', '.ps2',
    '.ps2xml', '.psc1', '.psc2', '.msh', '.msh1', '.msh2',
    '.mshxml', '.msh1xml', '.msh2xml', '.scf', '.lnk',
    '.inf', '.reg', '.dll', '.so', '.dylib'
  ],
  
  // Maximum filename length
  maxFilenameLength: 255,
  
  // Regex for safe filenames (alphanumeric, dash, underscore, dot)
  safeFilenameRegex: /^[a-zA-Z0-9._-]+$/
};

export interface FileValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedFilename?: string;
}

/**
 * Validates a file for upload
 */
export const validateFile = (
  file: File,
  options?: {
    maxSize?: number;
    allowedTypes?: string[];
    category?: 'images' | 'documents' | 'videos' | 'audio';
  }
): FileValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check if file exists
  if (!file) {
    return {
      valid: false,
      errors: ['No file provided'],
      warnings
    };
  }
  
  // Validate file size
  const maxSize = options?.maxSize || 
    (options?.category ? FILE_VALIDATION_CONFIG.maxSizes[options.category as keyof typeof FILE_VALIDATION_CONFIG.maxSizes] : null) ||
    FILE_VALIDATION_CONFIG.maxSizes.default;
    
  if (file.size > maxSize) {
    errors.push(`File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(maxSize)})`);
  }
  
  // Validate file type
  const allowedTypes = options?.allowedTypes || 
    (options?.category ? FILE_VALIDATION_CONFIG.allowedTypes[options.category] : null);
    
  if (allowedTypes && !allowedTypes.includes(file.type)) {
    errors.push(`File type "${file.type}" is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
  }
  
  // Check for blocked extensions
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (FILE_VALIDATION_CONFIG.blockedExtensions.includes(extension)) {
    errors.push(`File extension "${extension}" is not allowed for security reasons`);
  }
  
  // Validate filename
  const filename = file.name;
  if (filename.length > FILE_VALIDATION_CONFIG.maxFilenameLength) {
    errors.push(`Filename is too long (${filename.length} characters). Maximum allowed: ${FILE_VALIDATION_CONFIG.maxFilenameLength}`);
  }
  
  // Check for suspicious patterns in filename
  const suspiciousPatterns = [
    '../',  // Directory traversal
    '..\\', // Directory traversal (Windows)
    '%2e%2e', // URL encoded directory traversal
    '\x00', // Null byte
    '<script', // XSS attempt
    'javascript:', // XSS attempt
    'data:text/html', // Data URI XSS
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (filename.toLowerCase().includes(pattern)) {
      errors.push(`Filename contains suspicious pattern: "${pattern}"`);
    }
  }
  
  // Warn about special characters in filename
  if (!FILE_VALIDATION_CONFIG.safeFilenameRegex.test(filename)) {
    warnings.push('Filename contains special characters that may cause issues');
  }
  
  // Sanitize filename
  const sanitizedFilename = sanitizeFilename(filename);
  
  // Log validation attempt
  log.info('File validation', {
    originalName: file.name,
    sanitizedName: sanitizedFilename,
    size: file.size,
    type: file.type,
    valid: errors.length === 0,
    errors,
    warnings
  });
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    sanitizedFilename
  };
};

/**
 * Sanitizes a filename to make it safe for storage
 */
export const sanitizeFilename = (filename: string): string => {
  // Remove path components
  let sanitized = filename.split(/[/\\]/).pop() || 'unnamed';
  
  // Replace special characters with underscores
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  // Remove multiple consecutive dots (prevent directory traversal)
  sanitized = sanitized.replace(/\.{2,}/g, '_');
  
  // Remove leading/trailing dots and spaces
  sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, '');
  
  // Ensure filename is not empty
  if (!sanitized || sanitized === '_') {
    sanitized = 'file_' + Date.now();
  }
  
  // Truncate if too long (preserve extension if possible)
  if (sanitized.length > FILE_VALIDATION_CONFIG.maxFilenameLength) {
    const extension = sanitized.split('.').pop();
    const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'));
    const maxNameLength = FILE_VALIDATION_CONFIG.maxFilenameLength - (extension ? extension.length + 1 : 0);
    sanitized = nameWithoutExt.substring(0, maxNameLength) + (extension ? '.' + extension : '');
  }
  
  return sanitized;
};

/**
 * Validates multiple files
 */
export const validateFiles = (
  files: FileList | File[],
  options?: {
    maxFiles?: number;
    maxTotalSize?: number;
    maxSize?: number;
    allowedTypes?: string[];
    category?: 'images' | 'documents' | 'videos' | 'audio';
  }
): {
  valid: boolean;
  results: FileValidationResult[];
  errors: string[];
} => {
  const filesArray = Array.from(files);
  const errors: string[] = [];
  const results: FileValidationResult[] = [];
  
  // Check maximum number of files
  if (options?.maxFiles && filesArray.length > options.maxFiles) {
    errors.push(`Too many files selected (${filesArray.length}). Maximum allowed: ${options.maxFiles}`);
  }
  
  // Check total size
  const totalSize = filesArray.reduce((sum, file) => sum + file.size, 0);
  if (options?.maxTotalSize && totalSize > options.maxTotalSize) {
    errors.push(`Total file size (${formatFileSize(totalSize)}) exceeds maximum (${formatFileSize(options.maxTotalSize)})`);
  }
  
  // Validate each file
  for (const file of filesArray) {
    const result = validateFile(file, options);
    results.push(result);
  }
  
  const allValid = results.every(r => r.valid) && errors.length === 0;
  
  return {
    valid: allValid,
    results,
    errors
  };
};

/**
 * Formats file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Gets file extension from filename
 */
export const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

/**
 * Checks if file is an image
 */
export const isImageFile = (file: File): boolean => {
  return FILE_VALIDATION_CONFIG.allowedTypes.images.includes(file.type);
};

/**
 * Checks if file is a document
 */
export const isDocumentFile = (file: File): boolean => {
  return FILE_VALIDATION_CONFIG.allowedTypes.documents.includes(file.type);
};

/**
 * Creates a secure file upload handler
 */
export const createSecureFileUploadHandler = (
  onUpload: (file: File, sanitizedFilename: string) => Promise<void>,
  options?: {
    maxSize?: number;
    allowedTypes?: string[];
    category?: 'images' | 'documents' | 'videos' | 'audio';
  }
) => {
  return async (file: File): Promise<{ success: boolean; error?: string }> => {
    try {
      // Validate the file
      const validation = validateFile(file, options);
      
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join('; ')
        };
      }
      
      // Use sanitized filename for upload
      const sanitizedFilename = validation.sanitizedFilename || sanitizeFilename(file.name);
      
      // Call the upload handler
      await onUpload(file, sanitizedFilename);
      
      return { success: true };
    } catch (error: unknown) {
      log.error('File upload failed', error);
      return {
        success: false,
        error: error.message || 'Upload failed'
      };
    }
  };
};