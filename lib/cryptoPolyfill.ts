import * as Crypto from 'expo-crypto';

if (typeof global.crypto !== 'object') {
  // @ts-expect-error - polyfilling a global that RN doesn't declare
  global.crypto = {};
}

if (typeof global.crypto.getRandomValues !== 'function') {
  // @ts-expect-error - polyfilling a global that RN doesn't declare
  global.crypto.getRandomValues = Crypto.getRandomValues;
}
