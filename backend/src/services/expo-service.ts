import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as QRCode from 'qrcode';
import { ProjectSnapshot } from '../types/version-control';

export interface ExpoProjectConfig {
  name: string;
  slug: string;
  version: string;
  orientation: 'portrait' | 'landscape';
  icon?: string;
  splash?: {
    image: string;
    resizeMode: 'contain' | 'cover';
  };
  primaryColor?: string;
}

export interface ExpoExportResult {
  success: boolean;
  projectPath: string;
  qrCode?: string;
  qrCodeDataURL?: string;
  devServerUrl?: string;
  error?: string;
}

export class ExpoService {
  private expoPath: string;

  constructor() {
    // Use npx to run expo CLI
    this.expoPath = 'npx';
  }

  /**
   * Create a new Expo project from generated code
   */
  async createExpoProject(
    code: string,
    config: ExpoProjectConfig,
    outputDir: string = './exports'
  ): Promise<ExpoExportResult> {
    try {
      // Ensure output directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const projectPath = path.join(outputDir, config.slug);

      // Create Expo project using CLI
      await this.runExpoCommand(['create-expo-app', config.slug, '--template', 'blank'], outputDir);

      // Generate React Native component from the provided code
      const appJsx = this.generateReactNativeApp(code, config);

      // Write the main App.js
      const appPath = path.join(projectPath, 'App.js');
      fs.writeFileSync(appPath, appJsx, 'utf8');

      // Update package.json with project config
      const packageJsonPath = path.join(projectPath, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      packageJson.name = config.slug;
      packageJson.version = config.version;
      packageJson.expo = {
        name: config.name,
        slug: config.slug,
        version: config.version,
        orientation: config.orientation,
        icon: config.icon || './assets/icon.png',
        splash: config.splash || {
          image: './assets/splash.png',
          resizeMode: 'contain'
        },
        primaryColor: config.primaryColor || '#000000'
      };

      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');

      return {
        success: true,
        projectPath
      };
    } catch (error) {
      return {
        success: false,
        projectPath: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Start Expo development server for preview
   */
  async startDevServer(projectPath: string): Promise<ExpoExportResult> {
    try {
      let qrCodeUrl = '';
      let outputBuffer = '';

      // Start expo start command and capture output
      const child = spawn(this.expoPath, ['expo', 'start', '--web', '--tunnel'], {
        cwd: projectPath,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Capture stdout to parse QR code URL
      child.stdout?.on('data', (data) => {
        const output = data.toString();
        outputBuffer += output;

        // Parse QR code URL from Expo output
        const urlMatch = output.match(/exp:\/\/[^\s]+/);
        if (urlMatch && !qrCodeUrl) {
          qrCodeUrl = urlMatch[0];
        }

        // Also check for localhost URLs as fallback
        const localhostMatch = output.match(/http:\/\/localhost:\d+/);
        if (localhostMatch && !qrCodeUrl) {
          qrCodeUrl = localhostMatch[0];
        }
      });

      // Wait for server to start and QR code to be available
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout waiting for Expo server to start'));
        }, 15000); // 15 second timeout

        const checkReady = () => {
          if (qrCodeUrl) {
            clearTimeout(timeout);
            resolve();
          } else {
            setTimeout(checkReady, 500);
          }
        };

        checkReady();
      });

      // Generate QR code data URL
      const qrCodeDataURL = await QRCode.toDataURL(qrCodeUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      return {
        success: true,
        projectPath,
        devServerUrl: qrCodeUrl,
        qrCode: qrCodeUrl,
        qrCodeDataURL
      };
    } catch (error) {
      return {
        success: false,
        projectPath,
        error: error instanceof Error ? error.message : 'Failed to start dev server'
      };
    }
  }

  /**
   * Export project as APK/IPA
   */
  async exportProject(projectPath: string, platform: 'android' | 'ios'): Promise<ExpoExportResult> {
    try {
      await this.runExpoCommand(['expo', 'export', '--platform', platform], projectPath);

      return {
        success: true,
        projectPath
      };
    } catch (error) {
      return {
        success: false,
        projectPath,
        error: error instanceof Error ? error.message : 'Export failed'
      };
    }
  }

  /**
   * Generate React Native App component from code
   */
  private generateReactNativeApp(code: string, config: ExpoProjectConfig): string {
    // Try to extract React component from the generated code
    let componentCode = code;

    // If it's a complete React component, use it directly
    if (code.includes('export default') || code.includes('function') || code.includes('const')) {
      // Wrap in Expo App structure
      return `
import React from 'react';
import { StyleSheet, View } from 'react-native';

${componentCode}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '${config.primaryColor || '#ffffff'}',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default function App() {
  return (
    <View style={styles.container}>
      <GeneratedComponent />
    </View>
  );
}
`;
    } else {
      // Fallback: create a simple text display
      return `
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Generated App</Text>
      <Text style={styles.code}>${code.replace(/'/g, "\\'").substring(0, 200)}...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '${config.primaryColor || '#ffffff'}',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  code: {
    fontSize: 12,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
});
`;
    }
  }

  /**
   * Run Expo CLI command
   */
  private async runExpoCommand(args: string[], cwd?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.expoPath, ['expo', ...args], {
        cwd: cwd || process.cwd(),
        stdio: 'inherit'
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Expo command failed with code ${code}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Convert project snapshot to Expo project
   */
  async snapshotToExpoProject(snapshot: ProjectSnapshot, config: ExpoProjectConfig): Promise<ExpoExportResult> {
    try {
      const outputDir = './exports';
      const projectPath = path.join(outputDir, config.slug);

      // Create Expo project
      await this.runExpoCommand(['create-expo-app', config.slug, '--template', 'blank'], outputDir);

      // Copy snapshot files
      for (const file of snapshot.files) {
        if (file.language === 'javascript' || file.language === 'typescript') {
          const relativePath = file.path.startsWith('/') ? file.path.substring(1) : file.path;
          const targetPath = path.join(projectPath, relativePath);

          // Ensure directory exists
          const dir = path.dirname(targetPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }

          fs.writeFileSync(targetPath, file.content, 'utf8');
        }
      }

      // Create main App.js if not exists
      const appPath = path.join(projectPath, 'App.js');
      if (!fs.existsSync(appPath)) {
        const appJsx = this.generateReactNativeApp('', config);
        fs.writeFileSync(appPath, appJsx, 'utf8');
      }

      return {
        success: true,
        projectPath
      };
    } catch (error) {
      return {
        success: false,
        projectPath: '',
        error: error instanceof Error ? error.message : 'Failed to convert snapshot'
      };
    }
  }
}