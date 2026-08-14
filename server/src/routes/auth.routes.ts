import { Router } from "express";
import { z } from "zod";
import { env, isProduction } from "../config/env";
import { asyncHandler } from "../lib/asyncHandler";
import { signToken } from "../lib/jwt";
import { verifyPassword } from "../lib/password";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const cookieOptions = {
  httpOnly: true,
  secure: isProduction || env.cookieSecure,
  sameSite: "lax" as const,
  maxAge: 8 * 60 * 60 * 1000,
};

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid email or password format" });
    }

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = signToken({ sub: user.id, email: user.email, role: user.role });
    res.cookie(env.cookieName, token, cookieOptions);
    return res.json({ id: user.id, email: user.email, role: user.role });
  })
);

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(env.cookieName, { httpOnly: true, sameSite: "lax" });
  res.status(204).send();
});

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    return res.json({ id: user.id, email: user.email, role: user.role });
  })
);
