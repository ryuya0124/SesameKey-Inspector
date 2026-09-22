/**
 * English translation table
 */
export const en = {
  // App general
  appTitle: "SesameKey Inspector",
  appSubtitle: "Analyze SESAME Bot 2 / Bot 3 QR codes entirely in your browser",
  privacyBadge: "100% Client-Side — Images & Secrets are never sent to any server",

  // Upload area
  uploadTitle: "Select QR Code Image",
  uploadDesc: "Drag & Drop, click, or paste with Ctrl+V",
  uploadButton: "Choose Image",
  uploadPaste: "Paste from Clipboard",
  uploadPasteError: "Clipboard access was denied",
  uploadPasteNoImage: "No image found in clipboard",
  uploadHint: "PNG / JPEG / WebP / HEIC and more",
  uploadDragging: "Drop here",

  // Analyzing
  analyzingTitle: "Analyzing QR code…",
  analyzingStage: "Processing: {stage}",

  // Success
  successTitle: "QR Code Detected",
  labelModel: "Device Model",
  labelUri: "SESAME URI",
  labelDeviceName: "Device Name",
  labelAccessLevel: "Access Level",
  labelSecretKey: "Secret Key",
  labelPublicKey: "Public Key",
  labelKeyIndex: "Key Index",
  labelUuid: "Device UUID",
  labelDecodeMethod: "Decode Method",

  // Bot 3 → Bot 2 disguise
  disguiseTitle: "Nature Home Disguise",
  disguiseDescription: "Generates a QR code that changes only the SESAME Bot 3 product code to Bot 2. The secret, UUID, and access level remain unchanged.",
  disguiseButton: "Generate Bot 2 Disguised QR",
  disguiseGenerating: "Generating…",
  disguiseReady: "Disguised QR generated",
  disguiseInstruction: "Scan this QR code in the Nature Home app. It will appear as SESAME Bot 2.",
  disguiseWarning: "This QR code contains the device control key. Do not share it with anyone.",
  disguiseDownload: "Save QR Image",
  disguiseFailed: "Failed to generate the disguised QR code",

  // Secret Key controls
  secretMasked: "••••••••••••••••••••••••••••••••",
  btnShowSecret: "Show",
  btnHideSecret: "Hide",
  btnCopySecret: "Copy",
  btnCopied: "Copied!",
  btnCopyUri: "Copy URI",
  btnReset: "Analyze Another Image",

  // Access levels
  accessOwner: "Owner",
  accessManager: "Manager",
  accessGuest: "Guest",
  accessUnknown: "Unknown",

  // Errors
  errorTitle: "Could Not Read QR Code",
  errorQrNotFound: "No QR code was found in the image.",
  errorQrDecodeFailed: "A QR code was detected but its content could not be read.",
  errorInvalidUri: "The QR code does not contain a valid SESAME URI.",
  errorMissingSk: "The QR code does not contain Secret Key information.",
  errorInvalidBase64url: "Failed to decode the Secret Key. Invalid Base64URL format.",
  errorInvalidSesameData: "The SESAME data format is invalid.",
  errorUnsupportedModel: "This device model is not supported.",
  errorSecretExtractionFailed: "Failed to extract the Secret Key.",
  errorEncryptedQrUnsupported: "Encrypted QR codes are not supported. Turn off 'Encrypt QR code' in the SESAME app and generate a new QR code.",
  errorUnknown: "An unexpected error occurred.",

  // Error hints
  hintTitle: "Troubleshooting",
  hint1: "Make sure the entire QR code is visible in the image",
  hint2: "Ensure there is enough white space (Quiet Zone) around the QR code",
  hint3: "Check that the image is not blurry",
  hint4: "Use the 'Share Key' → 'Owner' or 'Manager' QR code from the official SESAME app",
  hint5: "If using a screenshot, try cropping to just the QR code area",

  // Language toggle
  langJa: "日本語",
  langEn: "English",
} as const;
