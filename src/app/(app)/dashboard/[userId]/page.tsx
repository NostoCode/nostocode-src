import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import { getDashboardData } from "@/lib/data/dashboard";
import DashboardClient from "./DashboardClient";

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function Page({ params }: PageProps) {
  const { userId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?._id) {
    redirect("/sign-in");
  }

  if (session.user._id !== userId && session.user.userType !== "admin") {
    redirect(`/dashboard/${session.user._id}`);
  }

  const data = await getDashboardData(userId);

  return (
    <DashboardClient
      userId={userId}
      fullUserInfo={data.user}
      levelWiseSolvedQuestions={data.levelWiseSolvedQuestions}
      allQuestionsLevelWise={data.allQuestionsLevelWise}
      allSubmissions={data.allSubmissions}
      filterLanguageWiseSubmission={data.filterLanguageWiseSubmission}
    />
  );
}