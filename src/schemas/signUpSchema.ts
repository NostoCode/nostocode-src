import {z} from "zod";

export const signUpValidation = z.object({
    username: z.string().min(6, {message: "Username must be at least 6 characters"}),
    email: z.email({message: "Invalid email address"}),
    password: z.string().min(8, {message: "Password must be at least 8 characters"})
})