import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import { getProfileUser } from "@/lib/data/profile";
import ProfileClient from "./ProfileClient";

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
    redirect(`/profile/${session.user._id}`);
  }

  const user = await getProfileUser(userId);

  return <ProfileClient userId={userId} initialUser={user} />;
}