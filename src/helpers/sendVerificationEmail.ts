import { getResend } from "@/lib/resend";
import VerificationEmail from "../../emails/VerificationEmail";
import { ApiResponse } from "@/types/ApiResponse";


export const sendVerificationEmail = async (email: string, username: string, verifyCode: string): Promise<ApiResponse> => {
    try {
        await getResend().emails.send({
            from: 'onboarding@resend.dev',
            to: email,
            subject: "NostoCode Verification Code",
            react: VerificationEmail({username, otp: verifyCode})
        });
        
        return { success: true, message: "Verification email send successfully" };
    } catch {
        return { success: false, message: "Failed to send verification email" }
    }
}