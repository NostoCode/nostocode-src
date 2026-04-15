import {z} from "zod"

export const chatOutputValidation = z.object({
    inputMessage: z.string().min(6, {message: "The input message at least 6 characters long"}),
    sourceCode: z.string().min(10, {message: "The source code at least 10 characters long"})
})