import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler";
import { HttpError } from "../middleware/errorHandler";
import { hashPassword } from "../lib/password";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

export const usersRouter = Router();

usersRouter.use(requireAuth, requireRole("ADMIN"));

const userSelect = {
  id: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

usersRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      select: userSelect,
      orderBy: { createdAt: "asc" },
    });
    res.json(users);
  })
);

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["ADMIN", "VIEWER"]).default("VIEWER"),
});

usersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) {
      throw new HttpError(409, "A user with that email already exists");
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await prisma.user.create({
      data: { email: parsed.data.email, passwordHash, role: parsed.data.role },
      select: userSelect,
    });
    res.status(201).json(user);
  })
);

const updateUserSchema = z.object({
  role: z.enum(["ADMIN", "VIEWER"]).optional(),
  password: z.string().min(8).optional(),
});

usersRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const data: { role?: "ADMIN" | "VIEWER"; passwordHash?: string } = {};
    if (parsed.data.role) data.role = parsed.data.role;
    if (parsed.data.password) data.passwordHash = await hashPassword(parsed.data.password);

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: userSelect,
    });
    res.json(user);
  })
);

usersRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user!.sub) {
      throw new HttpError(400, "You cannot delete your own account");
    }
    await prisma.user.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);
