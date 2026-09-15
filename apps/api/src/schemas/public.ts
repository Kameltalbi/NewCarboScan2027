import { z } from "zod";

export const publicLeadSchema = z.object({
  // Types libres bornés — pages publiques historiques (demo_request, etc.)
  requestType: z.string().min(2).max(64),
  email: z.string().email().max(320),
  phone: z.string().max(40).optional(),
  companyName: z.string().max(200).optional(),
  fullName: z.string().max(200).optional(),
  message: z.string().max(5000).optional(),
  payload: z.record(z.unknown()).optional(),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .max(200)
    .refine(
      (p) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,200}$/.test(p),
      "Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un symbole.",
    ),
  fullName: z.string().min(1).max(200),
  companyName: z.string().min(1).max(200),
  sector: z.string().max(200).optional(),
  phone: z.string().max(40).optional(),
});

export const freeBilanSchema = z.object({
  answers: z.record(z.string()).refine((o) => Object.keys(o).length > 0, {
    message: "answers required",
  }),
  lead: z
    .object({
      email: z.string().email().optional(),
      companyName: z.string().max(200).optional(),
      fullName: z.string().max(200).optional(),
    })
    .optional(),
});
