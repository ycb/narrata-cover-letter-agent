// Basic tests for file upload service
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FileUploadService, normalizeRoleSummaryForStorage } from '../fileUploadService';
import { FILE_UPLOAD_CONFIG } from '@/lib/config/fileUpload';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn()
      }))
    },
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn()
      }))
    }))
  }
}));

// Mock text extraction service
vi.mock('../textExtractionService', () => ({
  TextExtractionService: vi.fn(() => ({
    extractText: vi.fn().mockResolvedValue({
      success: true,
      text: 'Mock extracted text'
    })
  }))
}));

// Mock OpenAI service
vi.mock('../openaiService', () => ({
  LLMAnalysisService: vi.fn(() => ({
    analyzeResume: vi.fn().mockResolvedValue({
      success: true,
      data: {
        workHistory: [],
        education: [],
        skills: [],
        achievements: [],
        contactInfo: {}
      }
    })
  }))
}));

describe('FileUploadService', () => {
  let fileUploadService: FileUploadService;

  beforeEach(() => {
    fileUploadService = new FileUploadService();
  });

  describe('validateFile', () => {
    it('should validate PDF files correctly', () => {
      const pdfFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const result = fileUploadService.validateFile(pdfFile, 'resume');
      
      expect(result.valid).toBe(true);
      expect(result.fileType).toBe('application/pdf');
      expect(result.fileSize).toBe(4);
    });

    it('should validate DOCX files correctly', () => {
      const docxFile = new File(['test'], 'test.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      const result = fileUploadService.validateFile(docxFile, 'resume');
      
      expect(result.valid).toBe(true);
      expect(result.fileType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });

    it('should reject files that are too large', () => {
      const largeFile = new File(['x'.repeat(FILE_UPLOAD_CONFIG.MAX_FILE_SIZE + 1)], 'large.pdf', { 
        type: 'application/pdf' 
      });
      const result = fileUploadService.validateFile(largeFile, 'resume');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('File is too large. Please upload a file smaller than 5MB.');
    });

    it('should reject invalid file types', () => {
      const pngFile = new File(['test'], 'test.png', { type: 'image/png' });
      const result = fileUploadService.validateFile(pngFile, 'resume');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Please upload a supported file type (PDF, DOCX, TXT, or MD).');
    });
  });

  describe('generateChecksum', () => {
    it('should generate consistent checksums for the same file', async () => {
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      (file as any).arrayBuffer = vi.fn().mockResolvedValue(new TextEncoder().encode('test content').buffer);
      
      // Access private method for testing
      const checksum1 = await (fileUploadService as any).generateChecksum(file);
      const checksum2 = await (fileUploadService as any).generateChecksum(file);
      
      expect(checksum1).toBe(checksum2);
      expect(typeof checksum1).toBe('string');
      expect(checksum1.length).toBe(64); // SHA-256 produces 64 character hex string
    });
  });

  describe('generateStoragePath', () => {
    it('should generate storage path with user ID and date structure', () => {
      const userId = 'test-user-123';
      const fileName = 'test-resume.pdf';
      
      // Access private method for testing
      const path = (fileUploadService as any).generateStoragePath(userId, fileName);
      
      expect(path).toContain(userId);
      expect(path).toContain('test-resume.pdf');
      expect(path).toMatch(/^[\w-]+\/\d{4}\/\d{2}\/\d{2}\/\d+_test-resume\.pdf$/);
    });
  });

  describe('normalizeRoleSummaryForStorage', () => {
    it('keeps concise role summaries unchanged', () => {
      const input = 'Led growth strategy for consumer onboarding and activation.';
      expect(normalizeRoleSummaryForStorage(input)).toBe(input);
    });

    it('reduces bullet-concatenated resume blocks to a single summary sentence', () => {
      const input = 'Delivered AI initiative with NVIDIA and launched CPC roadmap. ● Negotiated multi-million-dollar platform deals. ● Secured 35% cost reduction in engine agreement.';
      const normalized = normalizeRoleSummaryForStorage(input);

      expect(normalized).toContain('Delivered AI initiative with NVIDIA');
      expect(normalized).not.toContain('●');
      expect(normalized).not.toContain('Negotiated multi-million-dollar platform deals');
      expect(normalized.length).toBeLessThanOrEqual(320);
    });

    it('caps very long summaries to the storage max length', () => {
      const input = `${'Built and scaled partnerships across major platforms '.repeat(20)}.`;
      const normalized = normalizeRoleSummaryForStorage(input);

      expect(normalized.length).toBeLessThanOrEqual(320);
    });
  });
});
