import {z} from "zod"

export const codeRunValidation = z.object({
    sourceCode: z.string().min(20, {message: "The Source code must be at least 20 characters"}),
    languageId: z.number().refine(
      // Local Judge0 extra IDs: C=1, C++=2, Java=4, Python(ML)=10, JavaScript=93
      (id) => [1, 2, 4, 10, 93].includes(id),
      { message: "Invalid language ID. Allowed: C, C++, Java, Python, JavaScript this languages" }
    ),
    problemId: z.string().optional(),
    testCases: z.array(
        z.object({
            input: z.string(),
            output: z.string(),
        })
    ).optional()
})