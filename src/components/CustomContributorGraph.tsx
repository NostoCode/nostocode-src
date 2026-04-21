import React from "react";
import { codeSubmissionResultType } from "@/types/ApiResponse";

const NUM_WEEKS = 53;

const getDaysInYear = (startDate: Date): string[] => {
  const days: string[] = [];
  for (let i = 0; i < 365; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() - i);
    days.unshift(d.toISOString().substring(0, 10));
  }
  return days;
};

const colorMap = [
  "bg-gray-200 dark:bg-gray-800",
  "bg-teal-300 dark:bg-[#00661f]",
  "bg-teal-500 dark:bg-[#1f8f36]",
  "bg-teal-700 dark:bg-[#28c047]",
  "bg-teal-900 dark:bg-[#80df88]",
];

interface CustomContributorGraphProps {
  submissions: codeSubmissionResultType[];
}

export default function CustomContributorGraph({ submissions }: CustomContributorGraphProps) {
  const today = new Date();
  const allDays = getDaysInYear(today);

  // Build activity map from real submission dates
  const activityData = new Map<string, number>();
  for (const sub of submissions) {
    if (!sub.createdAt) continue;
    const date = new Date(sub.createdAt as Date).toISOString().substring(0, 10);
    activityData.set(date, (activityData.get(date) || 0) + 1);
  }

  const getColorLevel = (count: number): number => {
    if (count > 5) return 4;
    if (count > 3) return 3;
    if (count > 1) return 2;
    if (count > 0) return 1;
    return 0;
  };

  return (
    <div className="p-4 bg-white dark:bg-transparent rounded-lg shadow-sm overflow-x-auto w-full">
      <div
        className="grid gap-[0.43rem] w-full"
        style={{
            gridTemplateColumns: `repeat(${NUM_WEEKS}, 10px)`,
            gridTemplateRows: `repeat(7, 10px)`,
            gridAutoFlow: "column",
        }}
    >
        {allDays.map((date) => {
          const count = activityData.get(date) || 0;
          const level = getColorLevel(count);

          return (
            <div
              key={date}
              className={`w-[0.8rem] h-[0.8rem] rounded-[2px] ${colorMap[level]} transition-colors`}
              title={`${date}: ${count} submission${count !== 1 ? 's' : ''}`}
            />
          );
        })}
      </div>

      <div className="flex justify-between text-sm text-gray-500 mt-10">
        <span>Less</span>
        <div className="flex gap-1">
          {colorMap.map((color, i) => (
            <span key={i} className={`w-[0.8rem] h-[0.8rem] rounded-[2px] ${color}`} />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
