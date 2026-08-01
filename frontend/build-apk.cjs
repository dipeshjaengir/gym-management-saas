const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');
const { execSync } = require('child_process');

const frontendDir = __dirname;
const distDir = path.join(frontendDir, 'dist');
const androidDir = path.join(frontendDir, 'android');
const versionFile = path.join(frontendDir, 'src', 'utils', 'version.ts');
const downloadsDir = path.join(frontendDir, 'public', 'downloads');
const metadataFile = path.join(downloadsDir, 'metadata.json');
const releaseNotesFile = path.join(downloadsDir, 'release-notes.json');
const pendingNotesFile = path.join(frontendDir, 'release-notes-pending.json');
const keystorePropsFile = path.join(androidDir, 'keystore.properties');

console.log('=== Starting GymLedger Android Release Pipeline ===');

// Helper to dereference reparse points/symbolic links in the build output
function dereferenceDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.lstatSync(filePath);
    if (stat.isDirectory()) {
      dereferenceDir(filePath);
    } else if (stat.isFile()) {
      const content = fs.readFileSync(filePath);
      fs.unlinkSync(filePath);
      fs.writeFileSync(filePath, content);
    }
  }
}

// 1. Repository Security Scanner
const SECURITY_PATTERNS = [
  { name: 'MongoDB URI', regex: /mongodb(?:\+srv)?:\/\/[^\s"'`]+/i, severity: 'HIGH', rec: 'Remove plain database connections. Use environment variables.' },
  { name: 'Private Key / Cert', regex: /-----BEGIN (?:RSA )?PRIVATE KEY-----/, severity: 'HIGH', rec: 'Remove private keys. Use keyrings or secret managers.' },
  { name: 'Google OAuth Secrets', regex: /client_secret_[a-zA-Z0-9-_.]{24}/, severity: 'HIGH', rec: 'Remove hardcoded Google Client Secrets.' },
  { name: 'JWT Secret Hardcode', regex: /jwt_secret\s*=\s*["'][a-zA-Z0-9_]{16,}["']/i, severity: 'HIGH', rec: 'Remove hardcoded JWT Secrets. Move to .env.' },
  { name: 'Razorpay Secret / Key ID', regex: /rzp_(live|test)_[a-zA-Z0-9]{14,}/, severity: 'HIGH', rec: 'Remove Razorpay credentials. Use variables.' },
  { name: 'Cloudinary Secret', regex: /cloudinary:\/\/[0-9]+:[a-zA-Z0-9-_]+@[a-zA-Z0-9-_]+/i, severity: 'HIGH', rec: 'Remove Cloudinary secret string.' },
  { name: 'GitHub Token', regex: /gh[opr]_[a-zA-Z0-9]{36}/, severity: 'HIGH', rec: 'Revoke token and use environment secrets.' },
  { name: 'OpenAI API Key', regex: /sk-[a-zA-Z0-9]{48}/, severity: 'HIGH', rec: 'Remove AI provider secret keys.' },
  { name: 'Anthropic Key', regex: /sk-ant-sid01-[a-zA-Z0-9]{80}/, severity: 'HIGH', rec: 'Remove Anthropic secret keys.' },
  { name: 'Gemini Key', regex: /AIzaSy[a-zA-Z0-9-_]{33}/, severity: 'HIGH', rec: 'Remove Gemini API key.' },
  { name: 'AWS Secret Access Key', regex: /(?:AWS_SECRET_ACCESS_KEY|aws_secret_key)\s*=\s*["'][a-zA-Z0-9/+=]{40}["']/i, severity: 'HIGH', rec: 'Use AWS IAM roles or task credentials.' },
  { name: 'Firebase Credentials', regex: /"apiKey"\s*:\s*["']AIza[a-zA-Z0-9-_]{35}["']/i, severity: 'HIGH', rec: 'Avoid hardcoding apiKey in plain configurations.' },
  { name: 'Service Account JSON', regex: /"type"\s*:\s*"service_account"/i, severity: 'HIGH', rec: 'Do not commit Service Account JSON keys to source control.' },
  { name: 'Hardcoded Password', regex: /password\s*:\s*["'][a-zA-Z0-9_!@#\$%\^&\*\(\)-=\+]{6,}["']/i, severity: 'HIGH', rec: 'Do not hardcode plain password strings.' }
];

function isTrackedByGit(relativeFilePath) {
  try {
    execSync(`git ls-files --error-unmatch "${relativeFilePath}"`, { stdio: 'ignore', cwd: frontendDir });
    return true;
  } catch (e) {
    return false;
  }
}

function isIgnoredByGit(relativeFilePath) {
  try {
    execSync(`git check-ignore "${relativeFilePath}"`, { stdio: 'ignore', cwd: frontendDir });
    return true;
  } catch (e) {
    return false;
  }
}

function performSecurityScan() {
  console.log('\nRunning Repository Security Scan...');
  const reportPath = path.join(downloadsDir, 'security-report.json');
  const results = [];
  let highCount = 0;

  if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
  }

  function scanDir(dir) {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const relative = path.relative(frontendDir, fullPath);
      
      if (
        relative.includes('node_modules') || 
        relative.includes('.git') || 
        relative.includes('dist') || 
        relative.includes('build') || 
        relative.includes('public/downloads') ||
        relative.includes('android/app/build') ||
        relative.includes('.gradle') ||
        relative.includes('security-report.json') ||
        relative.includes('release-report.json') ||
        relative.endsWith('.apk') ||
        relative.endsWith('.keystore') ||
        relative.endsWith('.jks') ||
        relative.endsWith('.png') ||
        relative.endsWith('.jpg') ||
        relative.endsWith('.xlsx')
      ) {
        continue;
      }

      const stat = fs.lstatSync(fullPath);
      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (stat.isFile()) {
        const baseName = path.basename(fullPath);
        
        // Check if file is tracked by git or not ignored
        const isTracked = isTrackedByGit(relative);
        const isIgnored = isIgnoredByGit(relative);
        const isLeakRisk = isTracked || !isIgnored;

        if (baseName === '.env' || baseName === 'keystore.properties' || baseName.endsWith('.keystore') || baseName.endsWith('.jks')) {
          if (isLeakRisk) {
            results.push({
              file: relative,
              lineNumber: 1,
              severity: 'HIGH',
              pattern: `Sensitive File (${baseName})`,
              recommendation: 'Remove file or add it to .gitignore.'
            });
            highCount++;
          }
          continue;
        }

        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          for (const pattern of SECURITY_PATTERNS) {
            if (pattern.regex.test(line)) {
              if (isLeakRisk) {
                results.push({
                  file: relative,
                  lineNumber: idx + 1,
                  severity: pattern.severity,
                  pattern: pattern.name,
                  recommendation: pattern.rec
                });
                if (pattern.severity === 'HIGH') highCount++;
              }
            }
          }
        });
      }
    }
  }

  scanDir(frontendDir);
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`✓ Security scan complete. Issues found: ${results.length} (${highCount} HIGH)`);
  
  if (highCount > 0) {
    console.error(`❌ ERROR: Security scan detected ${highCount} HIGH severity secret leaks! Release aborted.`);
    console.error(`Refer to detailed report at: public/downloads/security-report.json`);
    process.exit(1);
  }
  
  return { results, status: 'PASSED' };
}

// 2. Dynamic Gradle Config Fetcher
function getExpectedAndroidConfig() {
  const variablesFile = path.join(androidDir, 'variables.gradle');
  const appBuildGradleFile = path.join(androidDir, 'app', 'build.gradle');
  
  let minSdkVersion = 24;
  let targetSdkVersion = 36;
  let packageName = 'com.gymledger.app';
  
  if (fs.existsSync(variablesFile)) {
    const content = fs.readFileSync(variablesFile, 'utf8');
    const minMatch = content.match(/minSdkVersion\s*=\s*(\d+)/);
    const targetMatch = content.match(/targetSdkVersion\s*=\s*(\d+)/);
    if (minMatch) minSdkVersion = parseInt(minMatch[1], 10);
    if (targetMatch) targetSdkVersion = parseInt(targetMatch[1], 10);
  }
  
  if (fs.existsSync(appBuildGradleFile)) {
    const content = fs.readFileSync(appBuildGradleFile, 'utf8');
    const appMatch = content.match(/applicationId\s+["']([^"']+)["']/);
    if (appMatch) packageName = appMatch[1];
  }
  
  return { minSdkVersion, targetSdkVersion, packageName };
}

// 3. Pre-Publishing APK Verification
function validateApk(apkPath, expectedVersion, expectedBuild) {
  console.log('\nValidating APK signature and metadata...');
  
  const config = getExpectedAndroidConfig();
  console.log(`- Expected Package: ${config.packageName}`);
  console.log(`- Expected Min SDK: ${config.minSdkVersion}`);
  console.log(`- Expected Target SDK: ${config.targetSdkVersion}`);
  
  const sdkDir = process.env.ANDROID_HOME || 'C:\\Users\\Dipesh\\android-sdk';
  const buildToolsDir = path.join(sdkDir, 'build-tools');
  let apksignerPath = '';
  let aapt2Path = '';
  
  if (fs.existsSync(buildToolsDir)) {
    const versions = fs.readdirSync(buildToolsDir).sort().reverse();
    for (const v of versions) {
      const apksigner = path.join(buildToolsDir, v, 'apksigner.bat');
      const aapt2 = path.join(buildToolsDir, v, 'aapt2.exe');
      if (fs.existsSync(apksigner) && fs.existsSync(aapt2)) {
        apksignerPath = apksigner;
        aapt2Path = aapt2;
        break;
      }
    }
  }
  
  if (!apksignerPath || !aapt2Path) {
    console.error('❌ ERROR: Could not locate apksigner or aapt2 under build-tools! Stopping pipeline.');
    process.exit(1);
  }
  
  let certFingerprint = '';
  
  // Verify signature & integrity
  try {
    const verifyOutput = execSync(`"${apksignerPath}" verify --verbose --print-certs "${apkPath}"`, {
      env: { ...process.env, JAVA_HOME: process.env.JAVA_HOME || 'C:\\Users\\Dipesh\\jdk21\\jdk21.0.12_8' },
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    
    if (verifyOutput.includes('CN=Android Debug')) {
      console.error('❌ ERROR: APK is signed with a DEBUG keystore! Production release rejected.');
      process.exit(1);
    }
    
    const fingerprintMatch = verifyOutput.match(/SHA-256 digest:\s*([a-fA-F0-9]{64})/);
    if (fingerprintMatch) {
      certFingerprint = fingerprintMatch[1].toLowerCase();
      console.log(`- Cert SHA-256 Fingerprint: ${certFingerprint}`);
    }
    
    console.log('✓ APK Signature verification and integrity check passed.');
  } catch (e) {
    console.error('❌ ERROR: APK signature validation failed:', e.message);
    process.exit(1);
  }
  
  // Verify dynamic package, versions, target SDK
  try {
    const badgingOutput = execSync(`"${aapt2Path}" dump badging "${apkPath}"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    
    const match = badgingOutput.match(/package: name='([^']+)' versionCode='(\d+)' versionName='([^']+)'/);
    if (!match) {
      console.error('❌ ERROR: Could not parse package info from aapt2 badging output.');
      process.exit(1);
    }
    
    const apkPackage = match[1];
    const apkVersionCode = parseInt(match[2], 10);
    const apkVersionName = match[3];
    
    const minSdkMatch = badgingOutput.match(/minSdkVersion:'(\d+)'/);
    const targetSdkMatch = badgingOutput.match(/targetSdkVersion:'(\d+)'/);
    const apkMinSdk = minSdkMatch ? parseInt(minSdkMatch[1], 10) : 0;
    const apkTargetSdk = targetSdkMatch ? parseInt(targetSdkMatch[1], 10) : 0;
    
    if (apkPackage !== config.packageName) {
      console.error(`❌ ERROR: APK package name (${apkPackage}) does not match Gradle config (${config.packageName})!`);
      process.exit(1);
    }
    if (apkVersionName !== expectedVersion) {
      console.error(`❌ ERROR: APK versionName (${apkVersionName}) does not match configuration version (${expectedVersion})!`);
      process.exit(1);
    }
    if (apkVersionCode !== expectedBuild) {
      console.error(`❌ ERROR: APK versionCode (${apkVersionCode}) does not match configuration build number (${expectedBuild})!`);
      process.exit(1);
    }
    if (apkMinSdk !== config.minSdkVersion) {
      console.error(`❌ ERROR: APK minSdkVersion (${apkMinSdk}) does not match Gradle configuration (${config.minSdkVersion})!`);
      process.exit(1);
    }
    if (apkTargetSdk !== config.targetSdkVersion) {
      console.error(`❌ ERROR: APK targetSdkVersion (${apkTargetSdk}) does not match Gradle configuration (${config.targetSdkVersion})!`);
      process.exit(1);
    }
    
    console.log('✓ APK Badging package, version, and SDK verification passed.');
  } catch (e) {
    console.error('❌ ERROR: APK badging verification failed:', e.message);
    process.exit(1);
  }

  return { status: 'PASSED', certFingerprint, packageName: config.packageName, minSdkVersion: config.minSdkVersion, targetSdkVersion: config.targetSdkVersion };
}

// 4. GitHub API Clients
function getGithubToken() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || null;
  return token ? token.trim() : null;
}

function requestGitHub(method, urlPath, token, bodyObj = null) {
  return new Promise((resolve, reject) => {
    const headers = {
      'User-Agent': 'GymLedger-Build-Script',
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    };

    let dataString = '';
    if (bodyObj) {
      dataString = JSON.stringify(bodyObj);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(dataString);
    }

    const options = {
      hostname: 'api.github.com',
      path: urlPath,
      method: method,
      headers: headers
    };

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => { responseBody += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(responseBody));
          } catch (e) {
            resolve(responseBody);
          }
        } else {
          reject(new Error(`GitHub API Error: ${res.statusCode} ${res.statusMessage}\nBody: ${responseBody}`));
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (bodyObj) {
      req.write(dataString);
    }
    req.end();
  });
}

function uploadReleaseAsset(uploadUrlTemplate, filePath, fileName, token) {
  return new Promise((resolve, reject) => {
    const uploadUrl = uploadUrlTemplate.replace(/\{\?name,label\}$/, '');
    const urlObj = new URL(`${uploadUrl}?name=${fileName}`);
    const fileBuffer = fs.readFileSync(filePath);
    
    const headers = {
      'User-Agent': 'GymLedger-Build-Script',
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Length': fileBuffer.length
    };

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: headers
    };

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => { responseBody += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(responseBody));
          } catch (e) {
            resolve(responseBody);
          }
        } else {
          reject(new Error(`GitHub Asset Upload Error: ${res.statusCode} ${res.statusMessage}\nBody: ${responseBody}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(fileBuffer);
    req.end();
  });
}

// 5. Post-Deployment Verification
function verifyUrlAsset(targetUrl, expectedSize) {
  return new Promise((resolve, reject) => {
    console.log(`- Verifying download asset health for: ${targetUrl}`);
    const checkUrl = (url, depth = 0) => {
      if (depth > 5) return reject(new Error('Too many redirects'));
      
      const client = url.startsWith('https') ? https : http;
      client.request(url, { method: 'HEAD', headers: { 'User-Agent': 'GymLedger-Verify' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          checkUrl(res.headers.location, depth + 1);
        } else if (res.statusCode === 200) {
          const contentType = res.headers['content-type'] || '';
          const contentLength = parseInt(res.headers['content-length'] || '0', 10);
          
          if (!contentType.includes('application/vnd.android.package-archive') && !contentType.includes('application/octet-stream')) {
            return reject(new Error(`Invalid content-type: ${contentType}`));
          }
          if (contentLength !== expectedSize) {
            return reject(new Error(`Content-Length mismatch: expected ${expectedSize}, got ${contentLength}`));
          }
          resolve(true);
        } else {
          reject(new Error(`HEAD request failed with status: ${res.statusCode}`));
        }
      }).on('error', reject).end();
    };
    checkUrl(targetUrl);
  });
}

// Check keystore credentials
console.log('Checking signing configuration...');
let keystorePath = path.join(androidDir, 'app', 'gymledger-release.keystore');
if (!fs.existsSync(keystorePropsFile) || !fs.existsSync(keystorePath)) {
  console.error('\n❌ ERROR: Production Release Keystore configurations NOT found!');
  console.error('Please configure keystore.properties and release keystore locally. Pipeline aborted.');
  process.exit(1);
}

// Main execution transaction flow
async function runReleaseTransaction() {
  // A. Security scan first
  const securityScan = performSecurityScan();

  // B. Read version and build values
  if (!fs.existsSync(versionFile)) {
    console.error(`❌ ERROR: Centralized version file not found at ${versionFile}`);
    process.exit(1);
  }

  const versionContent = fs.readFileSync(versionFile, 'utf8');
  const versionMatch = versionContent.match(/export const APP_VERSION\s*=\s*["']([^"']+)["']/);
  const buildMatch = versionContent.match(/export const BUILD_NUMBER\s*=\s*(\d+)/);

  if (!versionMatch || !buildMatch) {
    console.error('❌ ERROR: Could not parse central version configuration.');
    process.exit(1);
  }

  const currentVersion = versionMatch[1];
  const currentBuild = parseInt(buildMatch[1], 10);

  const newBuild = currentBuild + 1;
  const versionParts = currentVersion.split('.').map(Number);
  if (versionParts.length === 3 && !isNaN(versionParts[2])) {
    versionParts[2] = versionParts[2] + 1;
  }
  const newVersion = versionParts.join('.');
  const today = new Date().toISOString().split('T')[0];

  console.log(`Synchronizing Versions:`);
  console.log(`- Version: ${currentVersion} -> ${newVersion}`);
  console.log(`- Build: ${currentBuild} -> ${newBuild}`);
  console.log(`- Release Date: ${today}`);

  let updatedVersionContent = versionContent
    .replace(/export const APP_VERSION\s*=\s*["']([^"']+)["']/, `export const APP_VERSION = "${newVersion}"`)
    .replace(/export const BUILD_NUMBER\s*=\s*(\d+)/, `export const BUILD_NUMBER = ${newBuild}`)
    .replace(/export const RELEASE_DATE\s*=\s*["']([^"']+)["']/, `export const RELEASE_DATE = "${today}"`);

  fs.writeFileSync(versionFile, updatedVersionContent, 'utf8');
  console.log('✓ Central version file updated.');

  // C. Build React bundle
  console.log('Building React Frontend...');
  try {
    execSync('npm run build', { cwd: frontendDir, stdio: 'inherit' });
    console.log('✓ React Frontend built successfully.');
    
    console.log('Dereferencing reparse points/symlinks in dist...');
    dereferenceDir(distDir);
    console.log('✓ Build output dereferenced successfully.');
  } catch (err) {
    console.error('❌ ERROR: Failed to build React frontend.');
    process.exit(1);
  }

  // D. Sync Capacitor
  console.log('Syncing Capacitor Android assets...');
  try {
    execSync('npx cap sync android', { cwd: frontendDir, stdio: 'inherit' });
    console.log('✓ Capacitor assets synced successfully.');
    
    console.log('Dereferencing reparse points/symlinks in android assets...');
    const androidPublicDir = path.join(androidDir, 'app', 'src', 'main', 'assets', 'public');
    dereferenceDir(androidPublicDir);
    console.log('✓ Android assets dereferenced successfully.');
  } catch (err) {
    console.error('❌ ERROR: Failed to sync Capacitor assets.');
    process.exit(1);
  }

  // E. Compile Signed APK
  console.log('Cleaning old build folders to prevent OneDrive reparse-point conflicts...');
  try {
    const appBuildDir = path.join(androidDir, 'app', 'build');
    const rootBuildDir = path.join(androidDir, 'build');
    if (fs.existsSync(appBuildDir)) {
      fs.rmSync(appBuildDir, { recursive: true, force: true });
    }
    if (fs.existsSync(rootBuildDir)) {
      fs.rmSync(rootBuildDir, { recursive: true, force: true });
    }
    console.log('✓ Old build folders cleaned.');
  } catch (cleanErr) {
    console.log('⚠️ WARNING: Could not delete build folders: ' + cleanErr.message);
  }

  console.log('Compiling Signed Release APK with Gradle...');
  const gradleCmd = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
  try {
    execSync(`${gradleCmd} assembleRelease --no-daemon --no-watch-fs`, { cwd: androidDir, stdio: 'inherit' });
    console.log('✓ Gradle compiled release APK successfully.');
  } catch (err) {
    console.error('❌ ERROR: Gradle compilation failed.');
    process.exit(1);
  }

  console.log('Compiling Production Android App Bundle (.aab) with Gradle...');
  try {
    execSync(`${gradleCmd} bundleRelease --no-daemon --no-watch-fs`, { cwd: androidDir, stdio: 'inherit' });
    console.log('✓ Gradle compiled Android App Bundle (.aab) successfully.');
  } catch (err) {
    console.error('❌ ERROR: Gradle App Bundle compilation failed.');
    process.exit(1);
  }

  // F. Validate generated APK
  const builtApkPath = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
  const builtAabPath = path.join(androidDir, 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');
  
  if (!fs.existsSync(builtApkPath)) {
    console.error(`❌ ERROR: Could not locate built release APK at ${builtApkPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(builtAabPath)) {
    console.error(`❌ ERROR: Could not locate built Android App Bundle at ${builtAabPath}`);
    process.exit(1);
  }

  const validationResults = validateApk(builtApkPath, newVersion, newBuild);

  // G. Calculate SHA256 & Size
  console.log('Calculating SHA256 Checksum...');
  const stats = fs.statSync(builtApkPath);
  const sizeBytes = stats.size;
  const fileSizeMB = `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
  
  const shaSum = crypto.createHash('sha256');
  shaSum.update(fs.readFileSync(builtApkPath));
  const sha256 = shaSum.digest('hex');
  console.log(`✓ SHA256: ${sha256}`);
  console.log(`✓ APK Size: ${fileSizeMB}`);

  // H. Deploy to GitHub Releases (Safe upload sequence)
  const token = getGithubToken();
  if (!token) {
    console.error('❌ ERROR: GITHUB_TOKEN is not set in environment variables! GitHub Release automation aborted.');
    process.exit(1);
  }

  const repoOwner = 'dipeshjaengir';
  const repoName = 'gym-management-saas';
  const tagName = `v${newVersion}`;
  const versionedApkName = `GymLedger-v${newVersion}.apk`;

  console.log('\nDeploying release asset to GitHub (Safe Sequence)...');
  let release = null;
  try {
    release = await requestGitHub('GET', `/repos/${repoOwner}/${repoName}/releases/tags/${tagName}`, token);
    console.log(`- Located existing release for tag ${tagName}.`);
  } catch (e) {
    console.log(`- Creating new release for tag ${tagName}...`);
    // Read pending release notes
    let changes = ["Performance optimizations", "Version update telemetry"];
    let bugFixes = ["Stability enhancements"];
    if (fs.existsSync(pendingNotesFile)) {
      try {
        const pending = JSON.parse(fs.readFileSync(pendingNotesFile, 'utf8'));
        if (pending.changes) changes = pending.changes;
        if (pending.bugFixes) bugFixes = pending.bugFixes;
      } catch (e) {
        console.log('⚠️ Could not parse pending release notes. Using defaults.');
      }
    }

    const body = {
      tag_name: tagName,
      target_commitish: 'main',
      name: tagName,
      body: `### Release Notes for ${tagName} (Build ${newBuild})\n\n` +
            `#### New Features:\n` + changes.map(c => `- ${c}`).join('\n') + `\n\n` +
            `#### Bug Fixes:\n` + bugFixes.map(f => `- ${f}`).join('\n'),
      draft: false,
      prerelease: false
    };
    release = await requestGitHub('POST', `/repos/${repoOwner}/${repoName}/releases`, token, body);
    console.log(`✓ Created new release for tag ${tagName}.`);
  }

  // Clean old duplicate version-specific assets if present
  let uploadedVersionedAssetId = null;
  if (release.assets) {
    for (const asset of release.assets) {
      if (asset.name === versionedApkName) {
        console.log(`- Deleting duplicate asset: ${asset.name}...`);
        await requestGitHub('DELETE', `/repos/${repoOwner}/${repoName}/releases/assets/${asset.id}`, token);
      }
    }
  }

  // Upload version-specific asset first
  console.log(`- Uploading versioned APK: ${versionedApkName}...`);
  const uploadedVersionedAsset = await uploadReleaseAsset(release.upload_url, builtApkPath, versionedApkName, token);
  uploadedVersionedAssetId = uploadedVersionedAsset.id;
  console.log(`✓ Uploaded ${versionedApkName}`);

  // I. Post-Deployment Verification
  const assetDownloadUrl = `https://github.com/${repoOwner}/${repoName}/releases/download/${tagName}/${versionedApkName}`;
  console.log('\nRunning post-deployment verification...');
  try {
    await verifyUrlAsset(assetDownloadUrl, sizeBytes);
    console.log('✓ Post-deployment verification successful!');
  } catch (err) {
    console.error('❌ ERROR: Post-deployment verification failed! Release Rollback triggered.');
    console.error(`Reason: ${err.message}`);
    // Rollback: delete the uploaded versioned asset
    if (uploadedVersionedAssetId) {
      await requestGitHub('DELETE', `/repos/${repoOwner}/${repoName}/releases/assets/${uploadedVersionedAssetId}`, token);
    }
    process.exit(1);
  }

  // J. Copy stable assets and update redirects (Verified path)
  if (release.assets) {
    for (const asset of release.assets) {
      if (asset.name === 'GymLedger.apk') {
        console.log(`- Deleting old GymLedger.apk...`);
        await requestGitHub('DELETE', `/repos/${repoOwner}/${repoName}/releases/assets/${asset.id}`, token);
      }
    }
  }

  console.log(`- Uploading stable GymLedger.apk...`);
  await uploadReleaseAsset(release.upload_url, builtApkPath, 'GymLedger.apk', token);
  console.log(`✓ Uploaded GymLedger.apk`);

  // Update local files
  fs.copyFileSync(builtApkPath, path.join(downloadsDir, versionedApkName));
  fs.copyFileSync(builtApkPath, path.join(downloadsDir, 'latest.apk'));
  fs.copyFileSync(builtAabPath, path.join(downloadsDir, `GymLedger-v${newVersion}.aab`));
  fs.copyFileSync(builtAabPath, path.join(downloadsDir, 'latest.aab'));

  // Load and format release-notes.json
  let changes = ["Performance optimizations", "Version update telemetry"];
  let bugFixes = ["Stability enhancements"];
  if (fs.existsSync(pendingNotesFile)) {
    try {
      const pending = JSON.parse(fs.readFileSync(pendingNotesFile, 'utf8'));
      if (pending.changes) changes = pending.changes;
      if (pending.bugFixes) bugFixes = pending.bugFixes;
      fs.unlinkSync(pendingNotesFile);
    } catch (e) {}
  }

  let allNotes = {};
  if (fs.existsSync(releaseNotesFile)) {
    try {
      allNotes = JSON.parse(fs.readFileSync(releaseNotesFile, 'utf8'));
    } catch (e) {}
  }

  allNotes[newVersion] = {
    version: newVersion,
    build: newBuild,
    releaseDate: today,
    changes,
    bugFixes
  };

  fs.writeFileSync(releaseNotesFile, JSON.stringify(allNotes, null, 2), 'utf8');
  console.log('✓ release-notes.json updated.');

  // Create metadata.json
  const metadata = {
    version: newVersion,
    build: newBuild,
    releaseDate: today,
    releaseChannel: 'Production',
    minAndroidVersion: `Android 5.0 (API Level ${validationResults.minSdkVersion})`,
    fileSize: fileSizeMB,
    sha256: sha256,
    downloadUrl: '/downloads/latest.apk',
    githubUrl: `https://github.com/${repoOwner}/${repoName}/releases/download/${tagName}/GymLedger.apk`,
    backupUrl: `https://github.com/${repoOwner}/${repoName}/releases/download/${tagName}/${versionedApkName}`
  };

  fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2), 'utf8');
  console.log('✓ metadata.json updated.');

  const gitCommitHash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();

  // Generate release report
  const releaseReport = {
    version: newVersion,
    buildNumber: newBuild,
    gitCommitHash,
    releaseDate: today,
    packageName: validationResults.packageName,
    versionName: newVersion,
    versionCode: newBuild,
    minSdk: validationResults.minSdkVersion,
    targetSdk: validationResults.targetSdkVersion,
    apkSize: fileSizeMB,
    sha256,
    signingCertFingerprint: validationResults.certFingerprint,
    securityScanStatus: securityScan.status,
    apkValidationStatus: validationResults.status,
    githubReleaseUrl: `https://github.com/${repoOwner}/${repoName}/releases/tag/${tagName}`,
    downloadUrl: `https://github.com/${repoOwner}/${repoName}/releases/download/${tagName}/GymLedger.apk`,
    verificationResult: 'SUCCESSFUL'
  };

  fs.writeFileSync(path.join(downloadsDir, 'release-report.json'), JSON.stringify(releaseReport, null, 2), 'utf8');
  console.log('✓ release-report.json generated.');

  console.log('\n=================================================');
  console.log('🎉 GymLedger Android Release Build Successful!');
  console.log(`Version: v${newVersion} (Build ${newBuild})`);
  console.log(`SHA256: ${sha256}`);
  console.log(`GitHub Release: ${releaseReport.githubReleaseUrl}`);
  console.log('=================================================\n');
}

runReleaseTransaction().catch(err => {
  console.error('\n❌ TRANSACTION ERROR: Build Pipeline failed with error:', err.message);
  process.exit(1);
});
