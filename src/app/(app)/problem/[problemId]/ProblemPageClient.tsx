"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import ProblemPageNavigation from "@/components/ProblemPageNavigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import ProblemSideFooter from "@/components/ProblemPageSideFooter";
import { toast } from "sonner";
import axios from "axios";
import { ApiResponse, codeSubmissionResultType, CodeRunResult, FailedCase } from "@/types/ApiResponse";
import { IProblem } from "@/models/Problem.js";
import ProblemPageDescription from "@/components/ProblemPageDescription";
import ProblemPageCodeEditor, {
  ProblemPageCodeEditorHandle,
} from "@/components/ProblemPageCodeEditor";
import { useAppTheme } from "@/context/ThemeContext";
import { useSession } from "next-auth/react";
import { codeRunValidation } from "@/schemas/codeRunSchema";
import ProblemPageSoluction from "@/components/ProblemPageSoluction";
import ProblemPageSubmission from "@/components/ProblemPageSubmission";
import ProblemPageTestResult from "@/components/ProblemPageTestResult";
import { codeSubmissionValidation } from "@/schemas/codeSubmissionSchema";
import confetti from "canvas-confetti";
import ProblemRunSubmitBar from "@/components/ProblemRunSubmitBar";
import { PROBLEM_RUN_SUBMIT_PORTAL_ID } from "@/components/NavLinks";
import { handleApiError } from "@/lib/apiError";

interface ProblemPageClientProps {
  problemId: string;
  initialProblem: IProblem | null;
  isSolved?: boolean;
}

export default function ProblemPageClient({
  problemId,
  initialProblem,
  isSolved = false,
}: ProblemPageClientProps) {
  const [mounted, setMounted] = useState(false);
  const { theme } = useAppTheme();
  const { data: session } = useSession();
  const [problemInfo, setProblemInfo] = useState<IProblem | null>(initialProblem);
  const editorRef = useRef<ProblemPageCodeEditorHandle>(null);

  const [sourceCode, setSourceCode] = useState("");
  const [selectedLanguage] = useState("Python");
  const [selectedLanguageCode, setSelectedLanguageCode] = useState(10);
  const [isCodeRunning, setIsCodeRunning] = useState(false);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState("description");
  const [codeOutput, setCodeOutput] = useState<CodeRunResult[] | null>(null);
  const [submissionOutput, setSubmissionOutput] = useState<codeSubmissionResultType | null>(null);
  const [totalTestCases, setTotalTestCases] = useState(0);
  const [runFailedCase, setRunFailedCase] = useState<FailedCase | null>(null);
  const [submitFailedCase, setSubmitFailedCase] = useState<FailedCase | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
    setPortalTarget(document.getElementById(PROBLEM_RUN_SUBMIT_PORTAL_ID));
  }, []);

  useEffect(() => {
    setProblemInfo(initialProblem);
  }, [initialProblem]);

  const handleCodeRun = useCallback(async () => {
    if (!problemInfo || !session) return;

    setIsCodeRunning(true);
    setCurrentTab("testResult");
    setCodeOutput(null);
    setSubmissionOutput(null);
    setRunFailedCase(null);
    try {
      const data = {
        sourceCode,
        languageId: selectedLanguageCode,
        problemId,
        testCases: problemInfo.testCases,
      };

      const parsedData = codeRunValidation.safeParse(data);
      if (!parsedData.success) {
        toast.error(parsedData.error.issues[0].message);
        return;
      }

      const res = await axios.post<ApiResponse>("/api/code/run-code", data);
      toast.success("Code run successfully");
      setCodeOutput(res.data.results ?? null);
      setRunFailedCase(res.data.failedCase ?? null);
    } catch (error) {
      toast.error(handleApiError(error, "Error while running the code"));
    } finally {
      setIsCodeRunning(false);
    }
  }, [problemInfo, session, sourceCode, selectedLanguageCode, problemId]);

  const showConfetti = () => {
    confetti({
      particleCount: 200,
      spread: 100,
      origin: { y: 0.65 },
    });
  };

  const handleCodeSubmission = useCallback(async () => {
    if (!problemInfo || !session) return;

    const scoringResult = editorRef.current?.getScoringResult() ?? null;

    setIsSubmitLoading(true);
    setCurrentTab("testResult");
    try {
      const data = {
        userId: session.user._id,
        language: selectedLanguage,
        problemId: problemInfo._id,
        sourceCode,
        languageId: selectedLanguageCode,
        testCases: problemInfo.testCases,
        ancientCodeScore: scoringResult ? scoringResult.score : 100,
        ancientCodeLevel: scoringResult ? scoringResult.level : "🟢 Ancient Master",
        scoreDetails: scoringResult ? scoringResult.details : undefined,
      };

      const parsedData = codeSubmissionValidation.safeParse(data);
      if (!parsedData.success) {
        toast.error(parsedData.error.issues[0].message);
        return;
      }

      const res = await axios.post<ApiResponse>("/api/code/submit-code", data);
      toast.success("Code submitted successfully");
      setSubmissionOutput(res.data.submissionOutput ?? null);
      setTotalTestCases(res.data.totalTestCases ?? 0);
      setSubmitFailedCase(res.data.failedCase ?? null);
      if (res.data.submissionOutput?.status === "Accepted") showConfetti();
    } catch (error) {
      toast.error(handleApiError(error, "Error while submitting the code"));
    } finally {
      setIsSubmitLoading(false);
    }
  }, [problemInfo, session, sourceCode, selectedLanguage, selectedLanguageCode]);

  if (!mounted) {
    return null;
  }

  const runSubmitBar = (
    <ProblemRunSubmitBar
      onRun={handleCodeRun}
      onSubmit={handleCodeSubmission}
      isCodeRunning={isCodeRunning}
      isSubmitLoading={isSubmitLoading}
      isLoggedIn={!!session?.user}
    />
  );

  return (
    <>
      {portalTarget && createPortal(runSubmitBar, portalTarget)}
      <div className="w-full h-[calc(100vh-3rem)] px-3 py-2">
      <ResizablePanelGroup direction="horizontal" className="w-full gap-1">
        <ResizablePanel
          defaultSize={50}
          minSize={31}
          className="rounded-md bg-[var(--sidebar-accent)] border"
        >
          <ProblemPageNavigation currentTab={currentTab} setCurrentTab={setCurrentTab} />
          <ScrollArea className="relative w-full h-[calc(100vh-3.5rem-3rem)]">
            {!problemInfo && (
              <div
                style={{ background: "var(--card)" }}
                className="absolute left-0 top-0 w-full h-full z-[90] p-4 text-sm text-muted-foreground"
              >
                Problem not found.
              </div>
            )}
            {problemInfo && currentTab === "description" && (
              <ProblemPageDescription problemInfo={problemInfo} isSolved={isSolved} />
            )}
            {problemInfo && currentTab === "solutions" && (
              <ProblemPageSoluction problemId={problemId} />
            )}
            {problemInfo && currentTab === "submissions" && (
              <ProblemPageSubmission
                theme={theme}
                problemInfo={problemInfo}
                setCurrentTab={setCurrentTab}
                setSubmissionOutput={setSubmissionOutput}
              />
            )}
            {problemInfo && currentTab === "testResult" && (
              <ProblemPageTestResult
                codeOutput={codeOutput}
                isCodeRunning={isCodeRunning}
                theme={theme}
                problemInfo={problemInfo}
                session={session}
                submissionOutput={submissionOutput}
                setSubmissionOutput={setSubmissionOutput}
                totalTestCases={totalTestCases}
                runFailedCase={runFailedCase}
                submitFailedCase={submitFailedCase}
                setCurrentTab={setCurrentTab}
              />
            )}
            <ProblemSideFooter />
          </ScrollArea>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={50} minSize={30} className="rounded-md">
          <ProblemPageCodeEditor
            ref={editorRef}
            theme={theme}
            selectedLanguage={selectedLanguage}
            setSelectedLanguageCode={setSelectedLanguageCode}
            sourceCode={sourceCode}
            setSourceCode={setSourceCode}
            starterCode={problemInfo?.starterCode}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
    </>
  );
}