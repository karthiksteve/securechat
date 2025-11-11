// AES-256 and RSA encryption utilities for secure messaging

// Generate RSA key pair
export async function generateRSAKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );

  const publicKey = await crypto.subtle.exportKey("spki", keyPair.publicKey);
  const privateKey = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

  return {
    publicKey: btoa(String.fromCharCode(...new Uint8Array(publicKey))),
    privateKey: btoa(String.fromCharCode(...new Uint8Array(privateKey))),
  };
}

// Import RSA public key
async function importRSAPublicKey(pemKey: string): Promise<CryptoKey> {
  const binaryKey = Uint8Array.from(atob(pemKey), (c) => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    "spki",
    binaryKey,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  );
}

// Import RSA private key
async function importRSAPrivateKey(pemKey: string): Promise<CryptoKey> {
  const binaryKey = Uint8Array.from(atob(pemKey), (c) => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["decrypt"]
  );
}

// Generate AES-256 key
async function generateAESKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

// Encrypt message with AES-256 and encrypt the AES key with RSA
export async function encryptMessage(
  message: string,
  recipientPublicKey: string
): Promise<{ encryptedContent: string; encryptedKey: string; iv: string }> {
  // Generate AES key for this message
  const aesKey = await generateAESKey();
  
  // Generate IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt message with AES
  const encodedMessage = new TextEncoder().encode(message);
  const encryptedContent = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    aesKey,
    encodedMessage
  );

  // Export AES key
  const exportedAESKey = await crypto.subtle.exportKey("raw", aesKey);
  
  // Encrypt AES key with recipient's RSA public key
  const recipientKey = await importRSAPublicKey(recipientPublicKey);
  const encryptedKey = await crypto.subtle.encrypt(
    {
      name: "RSA-OAEP",
    },
    recipientKey,
    exportedAESKey
  );

  return {
    encryptedContent: btoa(String.fromCharCode(...new Uint8Array(encryptedContent))),
    encryptedKey: btoa(String.fromCharCode(...new Uint8Array(encryptedKey))),
    iv: btoa(String.fromCharCode(...new Uint8Array(iv))),
  };
}

// Encrypt message for multiple recipients (sender + recipient)
export async function encryptMessageForBoth(
  message: string,
  recipientPublicKey: string,
  senderPublicKey: string
): Promise<{ 
  encryptedContent: string; 
  recipientEncryptedKey: string; 
  senderEncryptedKey: string;
  iv: string 
}> {
  // Generate ONE AES key for this message
  const aesKey = await generateAESKey();
  
  // Generate IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt message with AES (ONCE)
  const encodedMessage = new TextEncoder().encode(message);
  const encryptedContent = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    aesKey,
    encodedMessage
  );

  // Export the SAME AES key
  const exportedAESKey = await crypto.subtle.exportKey("raw", aesKey);
  
  // Encrypt the SAME AES key with recipient's RSA public key
  const recipientKey = await importRSAPublicKey(recipientPublicKey);
  const recipientEncryptedKey = await crypto.subtle.encrypt(
    {
      name: "RSA-OAEP",
    },
    recipientKey,
    exportedAESKey
  );

  // Encrypt the SAME AES key with sender's RSA public key
  const senderKey = await importRSAPublicKey(senderPublicKey);
  const senderEncryptedKey = await crypto.subtle.encrypt(
    {
      name: "RSA-OAEP",
    },
    senderKey,
    exportedAESKey
  );

  return {
    encryptedContent: btoa(String.fromCharCode(...new Uint8Array(encryptedContent))),
    recipientEncryptedKey: btoa(String.fromCharCode(...new Uint8Array(recipientEncryptedKey))),
    senderEncryptedKey: btoa(String.fromCharCode(...new Uint8Array(senderEncryptedKey))),
    iv: btoa(String.fromCharCode(...new Uint8Array(iv))),
  };
}

// Decrypt message
export async function decryptMessage(
  encryptedContent: string,
  encryptedKey: string,
  iv: string,
  privateKey: string
): Promise<string> {
  try {
    // Import private RSA key
    const rsaPrivateKey = await importRSAPrivateKey(privateKey);
    
    // Decrypt AES key
    const encryptedKeyBuffer = Uint8Array.from(atob(encryptedKey), (c) => c.charCodeAt(0));
    const decryptedAESKey = await crypto.subtle.decrypt(
      {
        name: "RSA-OAEP",
      },
      rsaPrivateKey,
      encryptedKeyBuffer
    );

    // Import AES key
    const aesKey = await crypto.subtle.importKey(
      "raw",
      decryptedAESKey,
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["decrypt"]
    );

    // Decrypt content
    const encryptedContentBuffer = Uint8Array.from(atob(encryptedContent), (c) => c.charCodeAt(0));
    const ivBuffer = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));
    
    const decryptedContent = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: ivBuffer,
      },
      aesKey,
      encryptedContentBuffer
    );

    return new TextDecoder().decode(decryptedContent);
  } catch (error) {
    console.error("Decryption error:", error);
    return "[Decryption failed]";
  }
}

// Store keys in localStorage (in production, consider more secure storage)
export function storePrivateKey(privateKey: string): void {
  localStorage.setItem("privateKey", privateKey);
}

export function getPrivateKey(): string | null {
  return localStorage.getItem("privateKey");
}

export function clearKeys(): void {
  localStorage.removeItem("privateKey");
}
