/**
 * PDF Export command - M0 implementation.
 * 
 * Attempts to create a hidden BrowserWindow directly from Obsidian plugin context
 * and call printToPDF() for the active note's content.
 */

import { Editor, Notice } from 'obsidian';
import type { TFile } from 'obsidian';

/**
 * Export result types.
 */
export interface ExportResult {
  success: boolean;
  pdf?: Buffer | null;
  error?: string | null;
}

/**
 * Simple Markdown to HTML converter for M0 baseline testing.
 */
function markdownToHtml(markdown: string): string {
  let html = '';
  
  // Handle horizontal rules
  html = markdown.replace(/^---+$/gm, '<hr />');
  
  // Handle headers
  html = markdown.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = markdown.replace(/^(##) (.+)$/gm, '<h2>$2</h2>');
  html = markdown.replace(/^(#) (.+)$/gm, '<h1>$2</h1>');
  
  // Handle paragraphs
  html = markdown.replace(/^((?!###|##|#| - ).*)$/gm, '<p>$1</p>');
  
  // Handle lists (basic support)
  html = markdown.replace(/^- (.+)$/gm, '<li>$1</li>');
  
  // Handle code blocks
  html = markdown.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
  
  // Handle inline code
  html = markdown.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Handle bold
  html = markdown.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Handle italic
  html = markdown.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  return html;
}

/**
 * Creates an HTML page from markdown content with print-friendly styling.
 */
function createPrintHtml(markdown: TFile | string): { html: string; title: string } {
  const content = typeof markdown === 'string' 
    ? markdown 
    : markdownToHtml(markdown as string);
  
  return {
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${markdown instanceof TFile ? markdown.name : 'Untitled'}</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #000;
      background: #fff;
    }
    h1, h2, h3, h4, h5, h6 { 
      margin-top: 1em; 
      margin-bottom: 0.5em;
      font-weight: bold;
    }
    p, li, code { 
      margin: 0.25em 0; 
    }
    .page-break { page-break-after: always; }
    pre { 
      background: #f4f4f4; 
      padding: 1em; 
      border-radius: 4px; 
      overflow-x: auto;
    }
    code { 
      font-family: 'SF Mono', Monaco, monospace; 
      background: #f0f0f0; 
      padding: 0.15em 0.25em; 
      border-radius: 3px;
    }
    @media print {
      body { 
        font-size: 12pt;
        margin: 0;
        padding: 0;
      }
      .page-break { page-break-after: always; }
    }
  </style>
</head>
<body>
${content}
</body>
</html>`,
    title: markdown instanceof TFile ? markdown.name : 'Untitled',
  };
}

/**
 * Exports the current active note as PDF.
 */
export async function exportActiveNoteAsPdf(): Promise<ExportResult> {
  try {
    const editor = window.app.workspace.getActiveEditor() as Editor | null;
    
    if (!editor) {
      return { success: false, error: 'No active editor' };
    }
    
    // Get the file being edited
    const file = editor.view.file || editor?.file as TFile | null;
    
    if (!file) {
      return { success: false, error: 'No markdown file open' };
    }
    
    // Read file content
    let markdown: string;
    try {
      markdown = await window.app.vault.read(file);
    } catch (err: any) {
      console.error('Failed to read file:', err);
      return { success: false, error: `Read error: ${err.message}` };
    }
    
    // Create print-ready HTML
    const { html, title } = createPrintHtml(markdown);
    
    // For M0, we attempt direct window creation via Obsidian's Electron API
    // This is the critical test - can plugins create their own windows?
    
    let pdfBuffer: Buffer | null = null;
    
    try {
      // Attempt to create a hidden BrowserWindow
      const win = new window.BrowserWindow({
        show: false,
        visible: false,
        frame: false,
        height: 500,
        width: 612, // Letter width in points (8.5in * 72 DPI)
        webPreferences: {
          sandbox: true,
          contextIsolation: true,
          nodeIntegration: false,
          enableBlinkFeatures: 'InputStyleLookup',
          devTools: false,
        },
        backgroundColor: '#ffffff',
      });
      
      // Load the HTML content
      const blob = new Blob([html], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      
      win.loadFile(blobUrl, { basePath: '' })
        .then(() => win.reload())
        .catch((err) => {
          console.error('Failed to load content:', err);
          pdfBuffer = null;
        });
      
      // Wait briefly for content to load
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Print to PDF
      pdfBuffer = await win.webContents.printToPDF(
        {
          landscape: false,
          paperWidth: 612,
          paperHeight: 792,
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
          preferStaticContent: true,
        },
        true // silent
      );
      
      win.destroy();
      
    } catch (err: any) {
      console.error('PDF export failed:', err);
      pdfBuffer = null;
    }
    
    return { 
      success: !!pdfBuffer, 
      pdf: pdfBuffer,
      error: null 
    };
    
  } catch (err: any) {
    console.error('Export error:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Registers the export command in Obsidian.
 */
export function registerExportCommand(app: any): void {
  const cmd = {
    id: 'brewvault.export-pdf',
    name: 'Export as PDF (M0)',
    editorCheckCallback: (editor: Editor) => {
      // Export available if we have a markdown file open
      return !!editor.view.file || !!editor?.file;
    },
    checkEditorMenuOfType: () => 'view',
    execute: async (): Promise<void> => {
      const result = await exportActiveNoteAsPdf();
      
      if (result.success) {
        // Show a notice with the PDF
        new Notice('PDF exported successfully!', 3000);
        console.log('PDF exported, size:', result.pdf?.length);
      } else {
        new Notice(result.error || 'Export failed', 5000);
      }
    },
  };
  
  app.addCommand(cmd);
}

/**
 * Initializes the M0 export functionality.
 */
export function initializeM0(app: any): void {
  console.log('[BrewVault] M0: Initializing PDF export');
  registerExportCommand(app);
}
