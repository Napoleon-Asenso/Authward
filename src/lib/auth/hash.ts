import bcrypt from "bcrypt";

const BCRYPT_ROUNDS = 12;
const DUMMY_PASSWORD = "authward-constant-time-dummy-password";
let dummyHash: string | null = null;

function getDummyHash(): string {
  if (!dummyHash) {
    dummyHash = bcrypt.hashSync(DUMMY_PASSWORD, BCRYPT_ROUNDS);
  }
  return dummyHash;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Constant-time credential check. When no stored hash exists (unknown user),
 * we still run a real bcrypt comparison against a fixed dummy hash so that
 * response timing does not reveal whether the account exists.
 */
export async function verifyPasswordConstantTime(
  plain: string,
  hash: string | null,
): Promise<boolean> {
  const target = hash ?? getDummyHash();
  const valid = await bcrypt.compare(plain, target);
  return hash === null ? false : valid;
}
