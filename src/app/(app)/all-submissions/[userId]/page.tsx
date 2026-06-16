import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import { getUserAllSubmissions } from "@/lib/data/submissions";
import AllSubmissionsClient from "./AllSubmissionsClient";

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
    redirect(`/all-submissions/${session.user._id}`);
  }

  const submissions = await getUserAllSubmissions(userId);

  return <AllSubmissionsClient initialSubmissions={submissions} />;
}