import { z } from "zod";
import { mongodbObjectId } from "./similarQuestionSchema";

export const updateUserValidation = z.object({
    username: z.string().min(6, { message: "Username must be at least 6 characters" }),
    bio: z.string().min(10, { message: "Bio must be at least 10 characters" }).optional(),
    country: z.string().min(3, { message: "Country name must be at least 3 characters" }).optional().or(z.literal("")),
    university: z.string().min(3, { message: "University name must be at least 3 characters" }).optional().or(z.literal("")),
    github: z.string(),
    linkedin: z.string(),
    skills: z.array(
        z.string().min(3, { message: "Skills must be at least 3 characters" })
    )
})