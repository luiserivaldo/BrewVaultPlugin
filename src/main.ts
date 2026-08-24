/**
 * Plugin lifecycle entry point.
 * 
 * M0 implementation - proves Electron PDF generation feasibility inside Obsidian.
 */

import { App, Plugin } from 'obsidian';

// Import export functionality (but don't bundle it yet for M0)
import type { initializeM0 } from './commands/exportPdf';

/**
 * BrewVault PDF plugin that uses Obsidian's APIs and Electron runtime for PDF export.
 */
export default class BrewVaultPdfPlugin extends Plugin {
  /**
   * Plugin initialization hook.
   */
  async onload(): Promise<void> {
    console.log('[BrewVault] Loading plugin version 0.1.0');
    
    // For M0, we attempt to register the PDF export command
    try {
      // This may fail in Obsidian - the key test for M0
      // We'll handle both success and failure paths
      const app = this.app;
      
      if (app) {
        // Attempt to initialize M0 functionality
        // Note: BrowserWindow may not be available from plugin context without special flags
        try {
          // Try direct window creation first
          const win = new window.BrowserWindow({
            show: false,
            width: 612,
            height: 500,
            webPreferences: {
              sandbox: true,
              contextIsolation: true,
              nodeIntegration: false,
            },
          });
          
          if (win) {
            console.log('[BrewVault] BrowserWindow creation succeeded');
            win.destroy();
            
            // Success path - M0 is feasible with direct window creation
            await this.registerM0Exports(app);
          } else {
            console.warn('[BrewVault] No BrowserWindow available');
            
            // Fallback path - may need main process registration or IPC
            // Register command anyway but note it won't work yet
            this.addCommand({
              id: 'brewvault.test-export',
              name: 'Test Export (M0)',
              editorCheckCallback: (_editor) => true,
              execute: async (): Promise<void> => {
                const result = await import('./commands/exportPdf')
                  .then(m => m.exportActiveNoteAsPdf())
                  .catch(() => null);
                
                if (result?.success) {
                  new Notice('PDF exported!', 2000);
                } else {
                  new Notice(result?.error || 'Export failed (BrowserWindow unavailable)', 5000);
                }
              },
            });
            
            console.log('[BrewVault] Registered test command with fallback');
          }
        } catch (winErr: any) {
          // BrowserWindow not available from plugin context - common in Obsidian
          console.warn('[BrewVault]', winErr.message);
          
          // Register fallback command that will fail gracefully
          this.addCommand({
            id: 'brewvault.pdf-export',
            name: 'Export Active Note as PDF',
            editorCheckCallback: (_editor) => true,
            execute: async (): Promise<void> => {
              const result = await import('./commands/exportPdf')
                .then(m => m.exportActiveNoteAsPdf())
                .catch(() => null);
              
              if (result?.success) {
                new Notice('PDF exported successfully!', 3000);
              } else {
                new Notice(result?.error || 'Export not yet available', 5000);
              }
            },
          });
          
          console.log('[BrewVault] M0: Export command registered (awaiting BrowserWindow availability)');
        }
      }
      
    } catch (err: any) {
      console.error('[BrewVault] Error during load:', err);
    }
  }

  /**
   * Registers the main PDF export functionality.
   */
  private async registerM0Exports(app: App): Promise<void> {
    // Register export command
    this.addCommand({
      id: 'brewvault.pdf-export',
      name: 'Export Active Note as PDF',
      editorCheckCallback: (_editor) => true,
      execute: async (): Promise<void> => {
        const result = await import('./commands/exportPdf')
          .then(m => m.exportActiveNoteAsPdf())
          .catch(() => null);
        
        if (result?.success) {
          new Notice('PDF exported successfully!', 3000);
        } else {
          new Notice(result?.error || 'Export failed', 5000);
        }
      },
    });

    console.log('[BrewVault] PDF export command registered');
  }
}
