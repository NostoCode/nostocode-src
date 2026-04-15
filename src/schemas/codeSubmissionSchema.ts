import { z } from "zod";
import { mongodbObjectId } from "./similarQuestionSchema";

export const codeSubmissionValidation = z.object({
    userId: mongodbObjectId,
    language: z.string().min(1, {message: "Language must be at least 1 characters long"}),
    sourceCode: z.string().min(10, {message: "Source code must be at least 10 characters long"}),
    problemId: mongodbObjectId,
})