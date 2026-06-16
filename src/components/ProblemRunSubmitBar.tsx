"use client";

import { Button } from "./ui/button";
import { CloudUpload, Loader2, Play } from "lucide-react";

interface ProblemRunSubmitBarProps {
  onRun: () => void;
  onSubmit: () => void;
  isCodeRunning: boolean;
  isSubmitLoading: boolean;
  isLoggedIn: boolean;
}

export default function ProblemRunSubmitBar({
  onRun,
  onSubmit,
  isCodeRunning,
  isSubmitLoading,
  isLoggedIn,
}: ProblemRunSubmitBarProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={onRun}
        disabled={!isLoggedIn || isCodeRunning}
        variant="secondary"
        className="cursor-pointer"
        size="sm"
      >
        {isCodeRunning ? (
          <Loader2 className="resize-custom w-4 animate-spin" />
        ) : (
          <Play className="resize-custom w-4" />
        )}
        Run
      </Button>
      <Button
        disabled={!isLoggedIn || isSubmitLoading}
        onClick={onSubmit}
        variant="secondary"
        className="cursor-pointer font-semibold"
        size="sm"
      >
        {isSubmitLoading ? (
          <>
            <Loader2 className="resize-custom w-4 animate-spin" />
            Running
          </>
        ) : (
          <>
            <CloudUpload className="resize-custom w-4" />
            Submit
          </>
        )}
      </Button>
    </div>
  );
}