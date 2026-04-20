"use client"
import { codeSubmissionResultType, CodeRunResult, FailedCase } from '@/types/ApiResponse'
import { CircleCheckBig, Clock4, Info, Shield, SquarePen, X } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { Button } from './ui/button'
import { IProblem } from '@/models/Problem'
import { Skeleton } from './ui/skeleton'
import { Session } from 'next-auth'
import { formatDate } from '@/helpers/formatDate'
import MDEditor from '@uiw/react-md-editor';
import Link from 'next/link'
import { ancientScoreLevel } from '@/helpers/ancientScoreLevel'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

interface ProblemPageTestResultType {
    codeOutput: CodeRunResult[] | null,
    isCodeRunning: boolean, theme: string | undefined,
    problemInfo: IProblem,
    session: Session | null,
    submissionOutput: codeSubmissionResultType | null,
    setSubmissionOutput: React.Dispatch<React.SetStateAction<codeSubmissionResultType | null>>,
    totalTestCases?: number,
    runFailedCase?: FailedCase | null,
    submitFailedCase?: FailedCase | null,
}

export default function ProblemPageTestResult({ codeOutput, isCodeRunning, theme, problemInfo, session, submissionOutput, setSubmissionOutput, totalTestCases, runFailedCase, submitFailedCase }: ProblemPageTestResultType) {
    const [viewTestCase, setViewTestCase] = useState<number>(0);
    const [inputValues, setInputValues] = useState<string[]>([]);
    const [outputValues, setOutputValues] = useState<string[]>([]);
    const [avatarError, setAvatarError] = useState(false);
    const [isAccepted, setIsAccepted] = useState<boolean>(true);

    useEffect(() => {
        const setInputAndOutputValues = () => {
            // In template mode, testCases may still exist for display, but we don't need to show input/output
            if (!problemInfo.testCode && problemInfo.testCases.length > 0) {
                const inputArray = problemInfo.testCases[viewTestCase].input.split("\n");
                setInputValues(inputArray);
                const outputArray = problemInfo.testCases[viewTestCase].output.split("\n");
                setOutputValues(outputArray);
            }
        }
        setInputAndOutputValues();
    }, [viewTestCase]);

    useEffect(() => {
        const checkIsAllTestCasePass = () => {
            if (!codeOutput) return;
            setIsAccepted(true); // Reset before re-checking all cases
            for (let i = 0; i < codeOutput.length; i++) {
                if (codeOutput[i].status.description !== "Accepted") {
                    setIsAccepted(false);
                    setViewTestCase(i);
                    return;
                }
            }
        }
        checkIsAllTestCasePass();
    }, [codeOutput]);

    const handleSubmissionClose = () => {
        setSubmissionOutput(null);
    }

    return (
        <div style={{ background: "var(--card)" }} className='w-full min-h-[calc(100vh-6.5rem)] flex flex-col p-4 pb-12 relative'>
            {(!codeOutput && !isCodeRunning) && <div className='absolute top-0 left-0 w-full h-full flex justify-center items-center'>
                <h2 className='text-lg text-gray-500'>You must <span className="text-green-500">run</span> your code first</h2>
            </div>}
            {isCodeRunning &&
                <div className="absolute w-full h-[calc(100vh-6.5rem)] top-0 left-0 px-4 py-2">
                    <Skeleton className="w-[18rem] h-10 rounded-sm" />
                    <Skeleton className="w-[20rem] h-12 rounded-md mt-5" />
                    <Skeleton className="w-full h-24 rounded-md mt-5" />
                    <Skeleton className="w-full h-16 rounded-md mt-2" />
                    <Skeleton className="w-full h-24 rounded-md mt-2" />
                    <Skeleton className="w-full h-24 rounded-md mt-2" />
                </div>
            }
            {(codeOutput && !isCodeRunning) &&
                <div className="">
                    <div className="flex gap-4 items-center">
                        {isAccepted ?
                            <h1 className='text-2xl font-semibold text-green-500'>Accepted</h1> :
                            <h1 className='text-2xl font-semibold text-red-500'>Wrong Answer</h1>
                        }
                        <h2 className={`${theme === "dark" ? 'text-neutral-400' : ''}`}>Runtime: 0 ms</h2>
                    </div>
                    {problemInfo.testCode ? (
                        // Template mode: show single PASS/FAIL result
                        <div className="mt-4">
                            <h2 className={`mb-2 font-semibold ${theme === "dark" ? 'text-neutral-400' : ''}`}>Result</h2>
                            <div className={`w-full min-h-16 bg-[var(--sidebar-accent)] mb-2 p-4 rounded-md font-mono font-semibold ${codeOutput[0]?.stdout?.trim() === 'PASS' ? 'text-green-500' : 'text-red-400'}`}>
                                {codeOutput[0]?.stdout?.trim() || codeOutput[0]?.compile_output?.trim() || codeOutput[0]?.stderr?.trim() || 'No output'}
                            </div>
                            {(codeOutput[0]?.compile_output && !codeOutput[0]?.stdout) &&
                                <div className="w-full min-h-16 bg-[var(--sidebar-accent)] mb-2 p-4 rounded-md font-semibold text-red-500">{codeOutput[0].compile_output}</div>
                            }
                            {runFailedCase && (
                                <div className="mt-5 space-y-3">
                                    <h2 className="font-semibold text-red-400">Failing Testcase #{runFailedCase.index + 1}</h2>
                                    <div>
                                        <h3 className={`mb-1 text-sm font-medium ${theme === "dark" ? 'text-neutral-400' : 'text-neutral-500'}`}>Input</h3>
                                        <div className="w-full bg-[var(--sidebar-accent)] p-4 rounded-md font-mono text-sm whitespace-pre-wrap">{runFailedCase.input}</div>
                                    </div>
                                    <div>
                                        <h3 className={`mb-1 text-sm font-medium ${theme === "dark" ? 'text-neutral-400' : 'text-neutral-500'}`}>Expected Output</h3>
                                        <div className="w-full bg-[var(--sidebar-accent)] p-4 rounded-md font-mono text-sm text-green-500">{runFailedCase.expected}</div>
                                    </div>
                                    <div>
                                        <h3 className={`mb-1 text-sm font-medium ${theme === "dark" ? 'text-neutral-400' : 'text-neutral-500'}`}>Your Output</h3>
                                        <div className="w-full bg-[var(--sidebar-accent)] p-4 rounded-md font-mono text-sm text-red-400">{runFailedCase.actual}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        // Standard mode: show per-test-case input/output
                        <>
                            <div className="flex gap-4 my-6">
                                {codeOutput.map((ele, index) =>
                                    <Button key={index} onClick={() => setViewTestCase(index)} variant="secondary" className={`flex items-center gap-2 px-8 py-2  cursor-pointer font-semibold ${viewTestCase === index ? '' : 'opacity-60'} ${ele.status.description === "Accepted" ? 'text-green-500' : 'text-red-400'}`}><CircleCheckBig className='resize-custom w-4' /> Case{index + 1}</Button>
                                )}
                            </div>
                            <div className="">
                                <h2 className={`mb-2 font-semibold ${theme === "dark" ? 'text-neutral-400' : ''}`}>Input</h2>
                                {inputValues.map((value, index) =>
                                    <div key={index} className="w-full h-16 bg-[var(--sidebar-accent)] mb-2 p-4 rounded-md font-semibold">{value}</div>
                                )}
                                <h2 className={`mb-2 font-semibold ${theme === "dark" ? 'text-neutral-400' : ''}`}>Output</h2>
                                {codeOutput[viewTestCase].stdout?.trim().split("\n").map((value, index) =>
                                    <div key={index} className="w-full h-16 bg-[var(--sidebar-accent)] mb-2 p-4 rounded-md font-semibold">{value}</div>
                                )}
                                {(codeOutput[viewTestCase].compile_output && !codeOutput[viewTestCase].stdout) &&
                                    <div className="w-full min-h-16 bg-[var(--sidebar-accent)] mb-2 p-4 rounded-md font-semibold text-red-500">{codeOutput[viewTestCase].compile_output}</div>
                                }
                                <h2 className={`mb-2 font-semibold ${theme === "dark" ? 'text-neutral-400' : ''}`}>Expected</h2>
                                {outputValues.map((value, index) =>
                                    <div key={index} className="w-full h-16 bg-[var(--sidebar-accent)] mb-2 p-4 rounded-md font-semibold">{value}</div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            }

            {submissionOutput && <div style={{ background: "var(--card)" }} className="absolute w-full top-0 left-0  p-4 pb-10 transition-all duration-200">
                <div className="w-full flex justify-between items-end">
                    <div className="">
                        <div className="flex items-center gap-2 mb-3">
                            {submissionOutput.status === "Accepted" ?
                                <h2 className="text-xl font-semibold text-green-500">{submissionOutput.status}</h2> :
                                <h2 className="text-xl font-semibold text-red-500">{submissionOutput.status}</h2>
                            }
                            {submissionOutput.status === "Accepted" ?
                                <p className={`text-sm ${theme === "dark" ? 'text-neutral-400' : ''}`}>{totalTestCases ? `${totalTestCases} / ${totalTestCases} testcases passed` : 'All testcases passed'}</p> : <p className={`text-sm ${theme === "dark" ? 'text-neutral-400' : ''}`}>Some  testcases failed</p>
                            }
                        </div>
                        <div className="flex items-center gap-2">
                            {!avatarError && session?.user.avatar ? (
                              <img src={session.user.avatar} alt="" className="w-8 h-8 rounded-full bg-blue-200 object-contain" onError={() => setAvatarError(true)} />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 select-none">
                                {(session?.user.username || "?")[0].toUpperCase()}
                              </div>
                            )}
                            <h2 className="text-lg font-semibold">{session?.user.username}</h2>
                            <p className={`text-sm ${theme === "dark" ? 'text-neutral-400' : ''}`}>Submitted at {formatDate(submissionOutput.createdAt as Date)}</p>
                        </div>
                    </div>
                    {submissionOutput.status === "Accepted" ? <Link href={`/add-solution?id=${submissionOutput._id}`}><Button className='bg-green-500 text-white font-semibold cursor-pointer hover:bg-green-600 duration-300'><SquarePen className='resize-custom w-4 h-4' /> Solution</Button></Link> :
                        <Button onClick={handleSubmissionClose} className='bg-red-500 text-white font-semibold  cursor-pointer hover:bg-red-600 duration-300'><X className='resize-custom w-5 h-5' /> Close</Button>
                    }
                </div>
                <div className="flex gap-4 my-6">
                  <div className="flex-1 p-4 rounded-md bg-[var(--sidebar-accent)] flex flex-col gap-2">
                    <div className="w-full flex items-center justify-between">
                        <h2 className={`flex gap-2 items-center ${submissionOutput.status === "Accepted" ? '' : 'text-red-500'}`}><Clock4 className="resize-custom w-4 h-4" /> Runtime</h2>
                        <Tooltip>
                          <TooltipTrigger asChild><button className="cursor-default"><Info className={`resize-custom w-4 h-4 ${submissionOutput.status === "Accepted" ? '' : 'text-red-500'}`} /></button></TooltipTrigger>
                          <TooltipContent>Total execution time for your code submission</TooltipContent>
                        </Tooltip>
                    </div>
                    <h2 className={`text-xl ${submissionOutput.status === "Accepted" ? '' : 'text-red-500'}`}>{submissionOutput.status === "Accepted" ? `${(submissionOutput.time * 1000).toFixed(2)} ms` : 'N/A'}</h2>
                  </div>
                  <div className="flex-1 p-4 rounded-md bg-[var(--sidebar-accent)] flex flex-col gap-2">
                    <div className="w-full flex items-center justify-between">
                        <h2 className="flex gap-2 items-center"><Shield className="resize-custom w-4 h-4" /> Ancient Code Score</h2>
                        <Tooltip>
                          <TooltipTrigger asChild><button className="cursor-default"><Info className="resize-custom w-4 h-4" /></button></TooltipTrigger>
                          <TooltipContent>Reflects how authentically you wrote code — penalises external paste, large inserts, and unusual typing patterns</TooltipContent>
                        </Tooltip>
                    </div>
                    {submissionOutput.ancientCodeScore !== undefined ? (
                        <>
                            <h2 className={`text-xl font-bold ${
                                submissionOutput.ancientCodeScore >= 90 ? 'text-green-500' :
                                submissionOutput.ancientCodeScore >= 70 ? 'text-yellow-500' :
                                submissionOutput.ancientCodeScore >= 40 ? 'text-orange-500' :
                                'text-red-500'
                            }`}>{submissionOutput.ancientCodeScore} / 100</h2>
                            <h2 className="text-sm">{ancientScoreLevel(submissionOutput.ancientCodeScore!)}</h2>
                            {submissionOutput.scoreDetails && (
                                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                    <span>Typing Ratio</span><span className="font-mono text-right">{submissionOutput.scoreDetails.typingRatio}%</span>
                                    <span>Rhythm Score</span><span className="font-mono text-right">{submissionOutput.scoreDetails.rhythmScore}</span>
                                    <span>Edit Activity</span><span className="font-mono text-right">{submissionOutput.scoreDetails.editActivity}%</span>
                                    <span>Large Inserts</span><span className="font-mono text-right">{submissionOutput.scoreDetails.largeInserts}</span>
                                    <span>Speed Score</span><span className="font-mono text-right">{submissionOutput.scoreDetails.speedScore}</span>
                                    <span>Burst Score</span><span className="font-mono text-right">{submissionOutput.scoreDetails.burstScore}</span>
                                    <span>Session</span><span className="font-mono text-right">{submissionOutput.scoreDetails.sessionSecs}s</span>
                                </div>
                            )}
                        </>
                    ) : (
                        <h2 className="text-xl text-gray-400">N/A</h2>
                    )}
                  </div>
                </div>

                {(submissionOutput && submissionOutput.status !== "Accepted" && submitFailedCase) && (
                    <div className="mt-2 mb-6 space-y-3">
                        <h2 className="font-semibold text-red-400">Failing Testcase #{submitFailedCase.index + 1}</h2>
                        <div>
                            <h3 className={`mb-1 text-sm font-medium ${theme === "dark" ? 'text-neutral-400' : 'text-neutral-500'}`}>Input</h3>
                            <div className="w-full bg-[var(--sidebar-accent)] p-4 rounded-md font-mono text-sm whitespace-pre-wrap">{submitFailedCase.input}</div>
                        </div>
                        <div>
                            <h3 className={`mb-1 text-sm font-medium ${theme === "dark" ? 'text-neutral-400' : 'text-neutral-500'}`}>Expected Output</h3>
                            <div className="w-full bg-[var(--sidebar-accent)] p-4 rounded-md font-mono text-sm text-green-500">{submitFailedCase.expected}</div>
                        </div>
                        <div>
                            <h3 className={`mb-1 text-sm font-medium ${theme === "dark" ? 'text-neutral-400' : 'text-neutral-500'}`}>Your Output</h3>
                            <div className="w-full bg-[var(--sidebar-accent)] p-4 rounded-md font-mono text-sm text-red-400">{submitFailedCase.actual}</div>
                        </div>
                    </div>
                )}
                <div className={`flex items-center mt-6 mb-4 ${theme === "dark" ? 'text-neutral-400' : ''}`}>
                    <h2 className="font-semibold px-2 border-r-2">Code</h2>
                    <h2 className="font-semibold px-2">{submissionOutput.language}</h2>
                </div>
                <div className="w-full border rounded-md overflow-hidden mb-8">
                    <div data-color-mode="dark">
                        <MDEditor.Markdown
                            source={`\`\`\`\n${submissionOutput.sourceCode}\n\`\`\``}
                            className="markdown-body w-full" style={{ background: "var(--card)" }} />
                    </div>
                </div>
            </div>
            }
        </div>
    )
}
