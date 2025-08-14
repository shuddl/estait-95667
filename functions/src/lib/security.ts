
import * as crypto from 'crypto';
import * as functions from 'firebase-functions';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

const secret = functions.config().encryption.key;
const salt = crypto.randomBytes(SALT_LENGTH);

const getKey = (salt) => {
    return crypto.pbkdf2Sync(secret, salt, 100000, KEY_LENGTH, 'sha512');
}

export const encrypt = (text) => {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getKey(salt);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([salt, iv, tag, encrypted]).toString('hex');
};

export const decrypt = (encrypted) => {
    const data = Buffer.from(encrypted, 'hex');
    const salt = data.slice(0, SALT_LENGTH);
    const iv = data.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = data.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encryptedText = data.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const key = getKey(salt);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encryptedText, 'hex', 'utf8') + decipher.final('utf8');
};
