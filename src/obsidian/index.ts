/**
 * Obsidian adapters for M0.
 * 
 * Provides adapters for Vault, Workspace, and file operations.
 */

import type { TFile, MetadataCache } from 'obsidian';
import type { ExportOptions, PdfGenerationResult } from '../pipeline/exportService';

/**
 * Obsidian Vault adapter for reading markdown files.
 */
export class ObsidianVaultAdapter {
  private static instance: ObsidianVaultAdapter;
  
  constructor(public vault: any) {} // TitledVault
    
  /**
   * Reads the content of a markdown file.
   */
  async readFile(file: TFile): Promise<string> {
    return this.vault.read(file);
  }

  /**
   * Gets all markdown files in the vault.
   */
  listFiles(): TFile[] {
    return this.vault.getMarkdownFiles();
  }

  /**
   * Gets a file by path.
   */
  getFile(path: string): TFile | null {
    return this.vault.getAbstractFileByPath(path) as TFile || null;
  }
}

/**
 * Workspace adapter for getting the active editor and current file.
 */
export class ObsidianWorkspaceAdapter {
  private static instance: ObsidianWorkspaceAdapter;
  
  constructor(public workspace: any) {} // Workspace
   
  /**
   * Gets the currently open file from the active editor.
   */
  getCurrentFile(): TFile | null {
    const editor = this.workspace.getActiveEditor();
    if (!editor) return null;
    
    const model = editor?.file || editor.view.file;
    return model as TFile || null;
  }

  /**
   * Gets the markdown content from the active editor.
   */
  getCurrentMarkdown(): string | null {
    const editor = this.workspace.getActiveEditor();
    if (!editor) return null;
    
    // Get text from state or file
    return editor?.cursor || '';
  }

  /**
   * Gets the current working directory.
   */
  getRootFolder(): string {
    return this.vault.root.path || '';
  }
}
