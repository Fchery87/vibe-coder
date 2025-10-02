import { randomBytes } from 'crypto';

interface TemporaryPreviewData {
  generatedCode?: string;
  sandboxLogs?: Array<{
    type: 'log' | 'error' | 'warn' | 'info';
    message: string;
    timestamp: Date;
  }>;
  executionResult?: {
    success: boolean;
    output: string;
    error?: string;
    executionTime: number;
  };
  createdAt: Date;
  expiresAt: Date;
}

class TemporaryPreviewService {
  private previews: Map<string, TemporaryPreviewData> = new Map();
  private readonly EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour cleanup interval

  constructor() {
    // Start cleanup interval
    setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
  }

  /**
   * Generate a unique temporary preview link
   */
  generatePreviewLink(previewData: Omit<TemporaryPreviewData, 'createdAt' | 'expiresAt'>): string {
    const id = randomBytes(16).toString('hex');
    const now = new Date();

    const preview: TemporaryPreviewData = {
      ...previewData,
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.EXPIRATION_TIME),
    };

    this.previews.set(id, preview);
    return id;
  }

  /**
   * Get preview data by ID
   */
  getPreview(id: string): TemporaryPreviewData | null {
    const preview = this.previews.get(id);

    if (!preview) {
      return null;
    }

    // Check if expired
    if (new Date() > preview.expiresAt) {
      this.previews.delete(id);
      return null;
    }

    return preview;
  }

  /**
   * Check if a preview link exists and is valid
   */
  isValidPreview(id: string): boolean {
    return this.getPreview(id) !== null;
  }

  /**
   * Clean up expired previews
   */
  private cleanup(): void {
    const now = new Date();
    for (const [id, preview] of this.previews.entries()) {
      if (now > preview.expiresAt) {
        this.previews.delete(id);
      }
    }
  }

  /**
   * Get statistics about current previews
   */
  getStats(): { total: number; active: number } {
    const now = new Date();
    let active = 0;

    for (const preview of this.previews.values()) {
      if (now <= preview.expiresAt) {
        active++;
      }
    }

    return {
      total: this.previews.size,
      active,
    };
  }
}

export default new TemporaryPreviewService();