/**
 * Isolated Electron print adapter for M0.
 * 
 * Provides methods to create managed renderer windows that call
 * webContents.printToPDF(). This is used by the Obsidian plugin through
 * its own main process, not through a separate Electron executable.
 * 
 * @module electron/renderer
 */

import type { BrowserWindow } from 'electron';

/**
 * Options for creating the print renderer window.
 */
export interface PrintOptions {
  html: string;
  width: number;
  timeoutMs: number;
  printOptions?: any;
}

/**
 * Result of a PDF generation attempt.
 */
export interface PdfGenerationResult {
  success: boolean;
  data?: Buffer | null;
  error?: string | null;
}

/**
 * Creates and manages the isolated print renderer window.
 * 
 * This class is instantiated from within Obsidian's main process context.
 * It creates a hidden BrowserWindow, loads HTML content, and calls
 * printToPDF() after content is ready.
 */
export class PrintAdapter {
  private windowId: number | null = null;
  private timeoutId: NodeJS.Timeout | null = null;
  private cleanupScheduled: boolean = false;
  
  /**
   * Opens a hidden renderer window with controlled HTML content.
   */
  open(html: string, width: number): void {
    // Clean up any existing window first
    this.cleanup();

    const win = new BrowserWindow({
      show: false,
      visible: false,
      frame: false,
      height: 500,
      width: width,
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        enableBlinkFeatures: 'InputStyleLookup',
        devTools: false,
      },
      backgroundColor: '#ffffff',
    });

    // Navigate to blob URL with controlled HTML
    const blob = new Blob([html], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    
    win.loadURL(`file://${blobUrl}`);

    // Prevent any navigation or external requests
    win.webContents.setWindowOpenHandler(({ url }) => {
      console.warn('Blocked navigation:', url);
      return { action: 'deny' };
    });

    // Cleanup on window close
    win.on('closed', () => {
      this.cleanup();
    });

    this.windowId = win.id;
  }

  /**
   * Triggers PDF generation after content is loaded.
   */
  print(timeoutMs: number, printOptions: any = {}): Promise<PdfGenerationResult> {
    return new Promise((resolve) => {
      if (!this.windowId) {
        resolve({
          success: false,
          error: 'No renderer window active',
        });
        return;
      }

      // Schedule cleanup on timeout
      this.scheduleCleanup(timeoutMs).then(() => {
        win.webContents.printToPDF(
          {
            ...printOptions,
            landscape: false,
            paperWidth: 612, // Letter width in points (72 DPI * 8.5 inches)
            paperHeight: 792, // Letter height in points (72 DPI * 11 inches)
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
          },
          true, // silent
        ).then((data) => {
          this.cleanup();
          resolve({
            success: true,
            data: data || null,
          });
        }).catch((err: any) => {
          console.error('PDF generation error:', err);
          this.cleanup();
          resolve({
            success: false,
            error: err.message || String(err),
          });
        });
      });
    });
  }

  /**
   * Cancels pending operations and destroys the window.
   */
  cleanup(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    
    if (this.cleanupScheduled) {
      return;
    }
    this.cleanupScheduled = true;

    if (this.windowId !== null) {
      try {
        const win = BrowserWindow.fromId(this.windowId);
        if (win) {
          win.destroy();
        }
      } catch (err) {
        console.error('Cleanup window error:', err);
      }
      this.windowId = null;
    }
  }

  /**
   * Schedules automatic cleanup after the operation completes.
   */
  private scheduleCleanup(timeoutMs: number): Promise<void> {
    return new Promise((resolve) => {
      this.cleanupScheduled = true;
      
      const window = BrowserWindow.fromId(this.windowId!);
      if (!window) {
        this.cleanup();
        resolve();
        return;
      }
      
      // Wait for content to load, then print
      window.webContents.on('did-finish-load', () => {
        if (this.timeoutId) clearTimeout(this.timeoutId);
        
        this.timeoutId = setTimeout(() => {
          this.cleanup();
          resolve();
        }, timeoutMs - 500); // Allow time for printing
      });

      window.webContents.on('did-fail-load', () => {
        if (this.timeoutId) clearTimeout(this.timeoutId);
        this.cleanup();
        resolve();
      });
    });
  }
}
