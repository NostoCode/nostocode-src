import { connectToDb } from "@/lib/dbConnect";
import { serializeForClient } from "@/lib/serialize";
import userModel from "@/models/User";
import type { IUser } from "@/models/User";

export async function getProfileUser(userId: string): Promise<IUser | null> {
  await connectToDb();
  const user = await userModel.findById(userId).select("-password").lean();
  if (!user) return null;
  return serializeForClient(user) as unknown as IUser;
}