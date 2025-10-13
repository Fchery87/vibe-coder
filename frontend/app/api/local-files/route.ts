/**
 * Local File System API
 * Provides file listing for the local workspace
 * Used by FileTree component when GitHub integration is disabled
 */

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  size?: number;
  children?: FileNode[];
}

// Workspace directory for generated files
const WORKSPACE_DIR = path.join(process.cwd(), 'workspace');

// Ensure workspace directory exists
if (!fs.existsSync(WORKSPACE_DIR)) {
  fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
}

function buildFileTree(dirPath: string, relativePath: string = ''): FileNode[] {
  const nodes: FileNode[] = [];

  try {
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const itemRelativePath = relativePath ? `${relativePath}/${item}` : item;
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        const children = buildFileTree(fullPath, itemRelativePath);
        nodes.push({
          id: itemRelativePath,
          name: item,
          path: itemRelativePath,
          type: 'folder',
          children,
        });
      } else {
        nodes.push({
          id: itemRelativePath,
          name: item,
          path: itemRelativePath,
          type: 'file',
          size: stats.size,
        });
      }
    }
  } catch (err) {
    console.error('Error reading directory:', err);
  }

  return nodes;
}

export async function GET() {
  try {
    const tree = buildFileTree(WORKSPACE_DIR);

    return NextResponse.json({
      success: true,
      tree,
      workspacePath: WORKSPACE_DIR,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      tree: [],
    });
  }
}

export async function POST(request: Request) {
  try {
    const { files } = await request.json();

    if (!files || !Array.isArray(files)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid files array',
      });
    }

    const savedFiles: string[] = [];

    for (const file of files) {
      const { path: filePath, content } = file;

      if (!filePath || content === undefined) {
        continue;
      }

      const fullPath = path.join(WORKSPACE_DIR, filePath);
      const dirPath = path.dirname(fullPath);

      // Create directory if it doesn't exist
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      // Write file
      fs.writeFileSync(fullPath, content, 'utf-8');
      savedFiles.push(filePath);
    }

    return NextResponse.json({
      success: true,
      savedFiles,
      message: `Saved ${savedFiles.length} file(s)`,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}
