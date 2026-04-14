import {z} from "zod"

export const codeRunValidation = z.object({
    sourceCode: z.string().min(20, {message: "The Source code must be atleast 20 charecters"}),
    languageId: z.number().refine(
      // Local Judge0 extra IDs: C=1, C++=2, Java=4, Python(ML)=10, JavaScript=93
      (id) => [1, 2, 4, 10, 93].includes(id),
      { message: "Invalid language ID. Allowed: C, C++, Java, Python, JavaScript this languages" }
    ),
    testCases: z.array(
        z.object({
            input: z.string().min(1, { message: "Input is required" }),
            output: z.string().min(1, { message: "Output is required" }),
        })
    )
})