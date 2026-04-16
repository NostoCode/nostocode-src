import {z} from "zod"

export const codeRunValidation = z.object({
    sourceCode: z.string().min(20, {message: "The Source code must be at least 20 characters"}),
    languageId: z.number().refine(
      (id) => id === 10,
      { message: "Only Python is currently supported (languageId: 10)" }
    ),
    problemId: z.string().optional(),
    testCases: z.array(
        z.object({
            input: z.string(),
            output: z.string(),
        })
    ).optional()
})