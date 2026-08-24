/**
 * Main process handler for PDF export.
 * 
 * This module handles creating BrowserWindow instances and calling
 * printToPDF() on behalf of the Obsidian plugin via IPC.
 * 
 * In M0, this will be used through Obsidian's main process registration
 * or direct window creation from plugin context.
 */

import { ipcMain } from 'electron';
import type { BrowserWindow } from 'electron';

/**
 * IPC handler request structure.
 */
export interface PdfExportRequest {
  html: string;
  width: number;
  timeoutMs: number;
}

/**
 * Creates a PDF from HTML content using a hidden window.
 */
export function createPdfExporter(): (request: PdfExportRequest) => Promise<Buffer | null> {
  let activeWindows = new Map<string, BrowserWindow>();
  const exports = new Map<string, { resolve: (value: Buffer | null | undefined) => void; reject: (reason?: any) => void }>();
  
  return async function exportHtml(
    contentId: string,
    request: PdfExportRequest
  ): Promise<Buffer | null> {
    // Clean up any previous window for this export
    const oldWin = activeWindows.get(contentId);
    if (oldWin) {
      oldWin.destroy();
    }

    // Create new hidden window
    const win = new BrowserWindow({
      show: false,
      visible: false,
      frame: false,
      height: 500,
      width: request.width,
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        enableBlinkFeatures: 'InputStyleLookup',
        devTools: false,
      },
      backgroundColor: '#ffffff',
    });

    activeWindows.set(contentId, win);

    // Load HTML content
    const blob = new Blob([request.html], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    
    return new Promise((resolve, reject) => {
      exports.set(contentId, { resolve, reject });
      
      win.loadFile(blobUrl, { basePath: '' })
        .then(() => win.reload())
        .catch(reject);

      // Set up window open handler to block navigation
      win.webContents.setWindowOpenHandler(({ url }) => {
        console.warn('Blocked navigation:', url);
        return { action: 'deny' };
      });

      // Cleanup on close
      win.on('closed', () => {
        activeWindows.delete(contentId);
        URL.revokeObjectURL(blobUrl);
      });

      // Wait for content to load
      const cleanupTimer = setTimeout(() => {
        win.destroy();
        activeWindows.delete(contentId);
        URL.revokeObjectURL(blobUrl);
        
        // Resolve with null if timeout
        exports.get(contentId)?.reject(new Error('Export timeout'));
      }, request.timeoutMs);

      win.webContents.on('did-finish-load', () => {
        clearTimeout(cleanupTimer);
        
        // Print to PDF
        win.webContents.printToPDF(
          {
            landscape: false,
            paperWidth: 612, // Letter in points
            paperHeight: 792, // Letter in points  
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
            preferStaticContent: true,
          },
          true, // silent
        ).then((pdfBuffer) => {
          exports.get(contentId)?.resolve(pdfBuffer);
        }).catch((err) => {
          console.error('PDF generation error:', err);
          exports.get(contentId)?.reject(err);
        });
      });

      win.webContents.on('did-fail-load', () => {
        clearTimeout(cleanupTimer);
        const error = new Error(`Failed to load content: ${win.webContents.lastKnownErrorException?.message}`);
        exports.get(contentId)?.reject(error);
      });
    });
  };
}

/**
 * IPC handler for PDF export requests.
 */
export function registerPdfExporter(): (req: PdfExportRequest) => Promise<Buffer> {
  const exporter = createPdfExporter();
  
  // Return a simple async function that works within Obsidian's plugin context
  return async (req: PdfExportRequest): Promise<Buffer> => {
    return await exporter(Date.now().toString(), req);
  };
}
