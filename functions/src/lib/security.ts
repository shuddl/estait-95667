
import * as crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

const secret = process.env.ENCRYPTION_KEY || process.env.FIREBASE_CONFIG?.encryption_key || "default-dev-key-replace-in-production";
const salt = crypto.randomBytes(SALT_LENGTH);

const getKey = (salt: crypto.BinaryLike): Buffer => {
    return crypto.pbkdf2Sync(secret, salt, 100000, KEY_LENGTH, "sha512");
}

export const encrypt = (text: string): string => {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getKey(salt);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([salt, iv, tag, encrypted]).toString("hex");
};

export const decrypt = (encrypted: string): string => {
    const data = Buffer.from(encrypted, "hex");
    const salt = data.slice(0, SALT_LENGTH);
    const iv = data.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = data.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encryptedText = data.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const key = getKey(salt);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    // Correctly handle the Buffer output from update before concatenating with final's output
    const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
    return decrypted.toString("utf8");
};

// Aliases for backward compatibility
export const encryptToken = encrypt;
export const decryptToken = decrypt;
