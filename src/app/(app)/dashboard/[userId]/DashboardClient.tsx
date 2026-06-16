"use client";

import ProfilePageLeftSection from "@/components/ProfilePageLeftSection";
import ProfilePageRightSection from "@/components/ProfilePageRightSection";
import type { IUser } from "@/models/User";
import type { codeSubmissionResultType } from "@/types/ApiResponse";
import type { LevelWiseProblemType } from "@/types/problems";
import type { FilteredLanguageType } from "@/lib/data/dashboard";

interface DashboardClientProps {
  userId: string;
  fullUserInfo: IUser | null;
  levelWiseSolvedQuestions: LevelWiseProblemType;
  allQuestionsLevelWise: LevelWiseProblemType;
  allSubmissions: codeSubmissionResultType[];
  filterLanguageWiseSubmission: FilteredLanguageType;
}

export default function DashboardClient({
  userId,
  fullUserInfo,
  levelWiseSolvedQuestions,
  allQuestionsLevelWise,
  allSubmissions,
  filterLanguageWiseSubmission,
}: DashboardClientProps) {
  return (
    <div className="flex justify-center gap-8 w-full py-8">
      <ProfilePageLeftSection
        fullUserInfo={fullUserInfo}
        filterLanguageWiseSubmission={filterLanguageWiseSubmission}
        userId={userId}
      />
      <ProfilePageRightSection
        levelWiseSolvedQuestions={levelWiseSolvedQuestions}
        allQuestioinsLevelWise={allQuestionsLevelWise}
        allSubmissions={allSubmissions}
        userId={userId}
      />
    </div>
  );
}