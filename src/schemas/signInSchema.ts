import {z} from "zod";

export const signInValidation = z.object({
    email: z.email({message: "Invalid email address"}),
    password: z.string().min(8, {message: "Password must be at least 8 characters"})
});