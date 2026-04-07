#!/usr/bin/env node

import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

const DEFAULT_ITERATIONS = 210_000;
const MIN_ITERATIONS = 100_000;
const MAX_ITERATIONS = 1_000_000;
const DIGEST_BYTES = 32;

const usage = () => {
  console.log("Usage:");
  console.log("  npm run admin:hash -- \"<plaintext_password>\" [iterations]");
  console.log("  npm run admin:hash -- --verify \"<plaintext_password>\" \"<pbkdf2_hash>\"");
  console.log("");
  console.log(
    "Expected hash format: pbkdf2_sha256$<iterations>$<salt>$<hex_digest>",
  );
};

const parseHash = (hashValue) => {
  const [scheme, iterationsValue, salt, digest] = hashValue.split("$");
  if (!scheme || !iterationsValue || !salt || !digest) {
    return { ok: false, reason: "Hash must contain 4 '$'-separated segments." };
  }

  if (scheme !== "pbkdf2_sha256") {
    return { ok: false, reason: "Only pbkdf2_sha256 is supported." };
  }

  const iterations = Number(iterationsValue);
  if (!Number.isInteger(iterations) || iterations < MIN_ITERATIONS || iterations > MAX_ITERATIONS) {
    return {
      ok: false,
      reason: `Iterations must be an integer between ${MIN_ITERATIONS} and ${MAX_ITERATIONS}.`,
    };
  }

  const normalizedDigest = digest.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/i.test(normalizedDigest)) {
    return { ok: false, reason: "Digest must be 64 hex chars (sha256)." };
  }

  const normalizedSalt = salt.trim();
  if (!normalizedSalt) {
    return { ok: false, reason: "Salt cannot be empty." };
  }

  return {
    ok: true,
    value: {
      iterations,
      salt: normalizedSalt,
      digest: normalizedDigest,
    },
  };
};

const toSafeBuffer = (value) => Buffer.from(value, "utf8");

const verifyHash = (password, hashValue) => {
  const parsed = parseHash(hashValue);
  if (!parsed.ok) {
    console.error(`Invalid hash: ${parsed.reason}`);
    process.exitCode = 1;
    return;
  }

  const derived = pbkdf2Sync(
    password,
    parsed.value.salt,
    parsed.value.iterations,
    DIGEST_BYTES,
    "sha256",
  )
    .toString("hex")
    .toLowerCase();

  const left = toSafeBuffer(derived);
  const right = toSafeBuffer(parsed.value.digest);
  const matches = left.length === right.length && timingSafeEqual(left, right);

  if (!matches) {
    console.error("Hash verification failed: password does not match.");
    process.exitCode = 1;
    return;
  }

  console.log("Hash verification succeeded.");
};

const createHash = (password, iterationsRaw) => {
  const iterations = iterationsRaw ? Number(iterationsRaw) : DEFAULT_ITERATIONS;
  if (!Number.isInteger(iterations) || iterations < MIN_ITERATIONS || iterations > MAX_ITERATIONS) {
    console.error(
      `Invalid iterations. Provide an integer between ${MIN_ITERATIONS} and ${MAX_ITERATIONS}.`,
    );
    process.exitCode = 1;
    return;
  }

  const salt = randomBytes(16).toString("hex");
  const digest = pbkdf2Sync(password, salt, iterations, DIGEST_BYTES, "sha256").toString("hex");
  const hash = `pbkdf2_sha256$${iterations}$${salt}$${digest}`;

  console.log(hash);
};

const args = process.argv.slice(2);
if (args.length === 0) {
  usage();
  process.exitCode = 1;
} else if (args[0] === "--verify") {
  if (args.length !== 3) {
    usage();
    process.exitCode = 1;
  } else {
    const password = args[1]?.trim() ?? "";
    const hashValue = args[2]?.trim() ?? "";
    if (!password || !hashValue) {
      usage();
      process.exitCode = 1;
    } else {
      verifyHash(password, hashValue);
    }
  }
} else {
  const password = args[0]?.trim() ?? "";
  if (!password) {
    usage();
    process.exitCode = 1;
  } else {
    createHash(password, args[1]);
  }
}
