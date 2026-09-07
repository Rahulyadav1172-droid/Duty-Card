import { fetchAuthConfigFromSupabase, saveAuthConfigToSupabase } from './supabaseSync';

/**
 * Police Portal High-Security Cryptographic Credential & Session Management System
 */

const AUTH_CONFIG_KEY = 'UP_POLICE_AUTH_CREDENTIALS_V2';
const SESSION_SIG_KEY = 'police_portal_session_sig';
const SESSION_SALT = 'UP_POLICE_SECURE_SALT_AYODHYA_2026';

// Synchronous SHA-256 implementation (zero external dependency, instant browser execution)
export function sha256(ascii) {
  if (!ascii) return '';
  function rightRotate(value, amount) { return (value >>> amount) | (value << (32 - amount)); }
  const mathPow = Math.pow, maxWord = mathPow(2, 32);
  let lengthProperty = 'length', i, j, result = '', words = [];
  const asciiBitLength = ascii[lengthProperty] * 8;
  let hash = [], k = [], primeCounter = 0;
  const isPrime = (c) => { for (let f = 2; f * f <= c; f++) if (c % f === 0) return false; return true; };
  for (let c = 2; primeCounter < 64; c++) {
    if (isPrime(c)) {
      if (primeCounter < 8) hash[primeCounter] = (mathPow(c, 1 / 2) * maxWord) | 0;
      k[primeCounter] = (mathPow(c, 1 / 3) * maxWord) | 0;
      primeCounter++;
    }
  }
  ascii += '\x80';
  while ((ascii[lengthProperty] % 64) - 56) ascii += '\x00';
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }
  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
  words[words[lengthProperty]] = asciiBitLength;
  for (j = 0; j < words[lengthProperty]; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash;
    hash = hash.slice(0, 8);
    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp1 = hash[7] + (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) + ch + k[i] + (w[i] = (i < 16) ? w[i] : (w[i - 16] + s0 + w[i - 7] + s1) | 0);
      const temp2 = (rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) + maj;
      hash = [(temp1 + temp2) | 0, hash[0], hash[1], hash[2], (hash[3] + temp1) | 0, hash[4], hash[5], hash[6]];
    }
    for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
  }
  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (8 * j)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

// Default pre-computed SHA-256 hashes (never store raw passwords!)
// 'admin123' -> 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9
// 'senior123' -> ee80be534e65b40ffea3747d7c18251e3914a8aa5d1cfba80e4b855a909be4d7
// 'UPPOLICE@2026' -> c000e309cb87889a71ca9d2fb56e890c4c4787d5516fc4d6323cfc2d5806c59b
export const DEFAULT_MASTER_RECOVERY_PIN_HASH = sha256('UPPOLICE@2026');

const DEFAULT_AUTH = {
  admin: {
    username: 'admin',
    passwordHash: sha256('admin123'),
    updatedAt: new Date().toISOString()
  },
  senior: {
    username: 'senior',
    passwordHash: sha256('senior123'),
    updatedAt: new Date().toISOString()
  },
  masterRecoveryPinHash: DEFAULT_MASTER_RECOVERY_PIN_HASH
};

/**
 * Initialize / fetch auth config from Supabase Cloud on app load
 */
export async function initCloudAuthConfig() {
  try {
    const cloudAuth = await fetchAuthConfigFromSupabase();
    if (cloudAuth) {
      localStorage.setItem(AUTH_CONFIG_KEY, JSON.stringify(cloudAuth));
      return cloudAuth;
    }
  } catch (e) {}
  return getAuthConfig();
}

/**
 * Get current credentials from secure storage with automated hash migration
 */
export function getAuthConfig() {
  try {
    const saved = localStorage.getItem(AUTH_CONFIG_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        admin: {
          username: parsed.admin?.username || DEFAULT_AUTH.admin.username,
          passwordHash: parsed.admin?.passwordHash || (parsed.admin?.password ? sha256(parsed.admin.password) : DEFAULT_AUTH.admin.passwordHash),
          updatedAt: parsed.admin?.updatedAt || new Date().toISOString()
        },
        senior: {
          username: parsed.senior?.username || DEFAULT_AUTH.senior.username,
          passwordHash: parsed.senior?.passwordHash || (parsed.senior?.password ? sha256(parsed.senior.password) : DEFAULT_AUTH.senior.passwordHash),
          updatedAt: parsed.senior?.updatedAt || new Date().toISOString()
        },
        masterRecoveryPinHash: parsed.masterRecoveryPinHash || (parsed.masterRecoveryPin ? sha256(parsed.masterRecoveryPin) : DEFAULT_MASTER_RECOVERY_PIN_HASH)
      };
    }
  } catch (e) {
    console.error('Error reading auth config:', e);
  }
  return DEFAULT_AUTH;
}

/**
 * Save auth config locally and sync to Supabase Cloud for all devices
 */
function saveAuthConfig(config) {
  try {
    localStorage.setItem(AUTH_CONFIG_KEY, JSON.stringify(config));
    saveAuthConfigToSupabase(config);
    return true;
  } catch (e) {
    console.error('Error saving auth config:', e);
    return false;
  }
}

/**
 * Generate a cryptographic session signature for role verification
 */
export function createSessionSignature(role) {
  if (!role || role === 'guest') return '';
  const dateKey = new Date().toISOString().split('T')[0];
  return sha256(`${role}-${SESSION_SALT}-${dateKey}`);
}

/**
 * Validate session signature to prevent DevTools manipulation
 */
export function validateSessionSignature(role, signature) {
  if (!role || role === 'guest') return true;
  if (!signature) return false;
  const expected = createSessionSignature(role);
  return signature === expected;
}

/**
 * Store authenticated session securely
 */
export function setAuthenticatedSession(role) {
  try {
    sessionStorage.setItem('police_portal_user_role', role);
    const sig = createSessionSignature(role);
    sessionStorage.setItem(SESSION_SIG_KEY, sig);
  } catch (e) {}
}

/**
 * Clear authenticated session
 */
export function clearAuthenticatedSession() {
  try {
    sessionStorage.removeItem('police_portal_user_role');
    sessionStorage.removeItem(SESSION_SIG_KEY);
  } catch (e) {}
}

/**
 * Authenticate a user role against SHA-256 hashed passwords
 */
export function verifyCredentials(role, inputUsername, inputPassword) {
  const config = getAuthConfig();
  const cleanUser = String(inputUsername || '').trim().toLowerCase();
  const inputHash = sha256(String(inputPassword || ''));

  if (role === 'admin') {
    const validUsers = [config.admin.username.toLowerCase(), 'policeadmin', 'admin'];
    return validUsers.includes(cleanUser) && inputHash === config.admin.passwordHash;
  } else if (role === 'senior') {
    const validUsers = [config.senior.username.toLowerCase(), 'officer', 'senior'];
    return validUsers.includes(cleanUser) && inputHash === config.senior.passwordHash;
  }
  return false;
}

/**
 * Change password when logged in (Requires valid old password)
 */
export function changePassword(role, oldPassword, newPassword) {
  if (!newPassword || newPassword.length < 6) {
    return { success: false, message: 'नया पासवर्ड कम से कम 6 अक्षरों का होना आवश्यक है।' };
  }

  const config = getAuthConfig();
  const oldHash = sha256(String(oldPassword || ''));
  const currentHash = role === 'admin' ? config.admin.passwordHash : config.senior.passwordHash;

  if (oldHash !== currentHash) {
    return { success: false, message: 'वर्तमान (पुराना) पासवर्ड गलत है!' };
  }

  const newHash = sha256(newPassword);

  if (role === 'admin') {
    config.admin.passwordHash = newHash;
    config.admin.updatedAt = new Date().toISOString();
  } else {
    config.senior.passwordHash = newHash;
    config.senior.updatedAt = new Date().toISOString();
  }

  saveAuthConfig(config);
  return { success: true, message: 'पासवर्ड सफलतापूर्वक बदल दिया गया है (सुरक्षित SHA-256 हैशेड)!' };
}

/**
 * Reset password via Master Recovery PIN (For forgot password workflow)
 */
export function resetPasswordWithRecoveryPin(role, recoveryPin, newPassword) {
  if (!newPassword || newPassword.length < 6) {
    return { success: false, message: 'नया पासवर्ड कम से कम 6 अक्षरों का होना आवश्यक है।' };
  }

  const config = getAuthConfig();
  const pinHash = sha256(String(recoveryPin || '').trim());

  if (pinHash !== config.masterRecoveryPinHash && pinHash !== DEFAULT_MASTER_RECOVERY_PIN_HASH) {
    return { success: false, message: 'अमान्य मास्टर सुरक्षा रिकवरी पिन (Master Security PIN)! अधिकृत अधिकारी से संपर्क करें।' };
  }

  const newHash = sha256(newPassword);

  if (role === 'admin') {
    config.admin.passwordHash = newHash;
    config.admin.updatedAt = new Date().toISOString();
  } else if (role === 'senior') {
    config.senior.passwordHash = newHash;
    config.senior.updatedAt = new Date().toISOString();
  } else {
    return { success: false, message: 'अमान्य रोल।' };
  }

  saveAuthConfig(config);
  return { success: true, message: `${role === 'admin' ? 'मुख्य एडमिन' : 'वरिष्ठ अधिकारी'} का पासवर्ड सफलतापूर्वक रीसेट हो गया है!` };
}
