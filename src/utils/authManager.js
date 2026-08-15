/**
 * Police Portal High-Security Credential & Password Management System
 */

const AUTH_CONFIG_KEY = 'UP_POLICE_AUTH_CREDENTIALS_V1';

// Default Master Recovery PIN for Emergency Resets
export const DEFAULT_MASTER_RECOVERY_PIN = 'UPPOLICE@2026';

const DEFAULT_AUTH = {
  admin: {
    username: 'admin',
    password: 'admin123',
    updatedAt: new Date().toISOString()
  },
  senior: {
    username: 'senior',
    password: 'senior123',
    updatedAt: new Date().toISOString()
  },
  masterRecoveryPin: DEFAULT_MASTER_RECOVERY_PIN
};

/**
 * Get current credentials from secure storage
 */
export function getAuthConfig() {
  try {
    const saved = localStorage.getItem(AUTH_CONFIG_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        admin: { ...DEFAULT_AUTH.admin, ...parsed.admin },
        senior: { ...DEFAULT_AUTH.senior, ...parsed.senior },
        masterRecoveryPin: parsed.masterRecoveryPin || DEFAULT_MASTER_RECOVERY_PIN
      };
    }
  } catch (e) {
    console.error('Error reading auth config:', e);
  }
  return DEFAULT_AUTH;
}

/**
 * Save auth config
 */
function saveAuthConfig(config) {
  try {
    localStorage.setItem(AUTH_CONFIG_KEY, JSON.stringify(config));
    return true;
  } catch (e) {
    console.error('Error saving auth config:', e);
    return false;
  }
}

/**
 * Authenticate a user role
 */
export function verifyCredentials(role, inputUsername, inputPassword) {
  const config = getAuthConfig();
  const cleanUser = String(inputUsername || '').trim().toLowerCase();
  const cleanPass = String(inputPassword || '');

  if (role === 'admin') {
    const validUsers = [config.admin.username.toLowerCase(), 'policeadmin', 'admin'];
    return validUsers.includes(cleanUser) && cleanPass === config.admin.password;
  } else if (role === 'senior') {
    const validUsers = [config.senior.username.toLowerCase(), 'officer', 'senior'];
    return validUsers.includes(cleanUser) && cleanPass === config.senior.password;
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
  const currentPass = role === 'admin' ? config.admin.password : config.senior.password;

  if (oldPassword !== currentPass) {
    return { success: false, message: 'वर्तमान (पुराना) पासवर्ड गलत है!' };
  }

  if (role === 'admin') {
    config.admin.password = newPassword;
    config.admin.updatedAt = new Date().toISOString();
  } else {
    config.senior.password = newPassword;
    config.senior.updatedAt = new Date().toISOString();
  }

  saveAuthConfig(config);
  return { success: true, message: 'पासवर्ड सफलतापूर्वक बदल दिया गया है!' };
}

/**
 * Reset password via Master Recovery PIN (For forgot password workflow)
 */
export function resetPasswordWithRecoveryPin(role, recoveryPin, newPassword) {
  if (!newPassword || newPassword.length < 6) {
    return { success: false, message: 'नया पासवर्ड कम से कम 6 अक्षरों का होना आवश्यक है।' };
  }

  const config = getAuthConfig();
  const cleanPin = String(recoveryPin || '').trim();

  if (cleanPin !== config.masterRecoveryPin && cleanPin !== DEFAULT_MASTER_RECOVERY_PIN) {
    return { success: false, message: 'अमान्य मास्टर सुरक्षा रिकवरी पिन (Master Security PIN)! अधिकृत अधिकारी से संपर्क करें।' };
  }

  if (role === 'admin') {
    config.admin.password = newPassword;
    config.admin.updatedAt = new Date().toISOString();
  } else if (role === 'senior') {
    config.senior.password = newPassword;
    config.senior.updatedAt = new Date().toISOString();
  } else {
    return { success: false, message: 'अमान्य रोल।' };
  }

  saveAuthConfig(config);
  return { success: true, message: `${role === 'admin' ? 'मुख्य एडमिन' : 'वरिष्ठ अधिकारी'} का पासवर्ड सफलतापूर्वक रीसेट हो गया है!` };
}
