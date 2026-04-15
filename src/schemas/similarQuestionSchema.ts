import { z } from "zod";

// Example: you might define ObjectId as a string for validation
export const mongodbObjectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId");

export const similarQuestionValidation = z.object({
    _id: mongodbObjectId,
    title: z.string().min(6, {message: "Title must be at least 6 characters"}),
    level: z.string().max(6, {message: "Level consist maximum 6 characters"})
})