import { prisma } from "@/lib/db/prisma";
import { SESSION_TTL_SECONDS, hashValue } from "./tokens";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

export async function createSession(userId: string, rawToken: string) {
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  const tokenHash = hashValue(rawToken);
  await prisma.session.create({
    data: { userId, tokenHash, expiresAt },
  });
}

export async function findSessionUser(
  rawToken: string,
): Promise<SessionUser | null> {
  if (!rawToken) return null;
  const tokenHash = hashValue(rawToken);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    select: {
      expiresAt: true,
      user: { select: { id: true, email: true, name: true } },
    },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { tokenHash } });
    return null;
  }
  return session.user;
}

export async function deleteSession(rawToken: string): Promise<void> {
  if (!rawToken) return;
  const tokenHash = hashValue(rawToken);
  await prisma.session.deleteMany({
    where: { tokenHash },
  });
}

export async function revokeAllSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}
