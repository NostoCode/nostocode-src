import React, { useEffect, useState, useRef } from 'react'
import Editor from '@monaco-editor/react';
import type { OnMount } from '@monaco-editor/react';
import { Bookmark, ChevronUp, CodeXml, Copy, Maximize, Maximize2, Minimize2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"

// Prop types for this component
interface ProblemPageCodeEditorType {
    theme: string | undefined;
    selectedLanguage: string;
    setSelectedLanguage: React.Dispatch<React.SetStateAction<string>>;
    setSelectedLanguageCode: React.Dispatch<React.SetStateAction<number>>;
    sourceCode: string;
    setSourceCode: React.Dispatch<React.SetStateAction<string>>;
}

// Expose testing helpers on window (used by browser automation)
declare global {
    interface Window {
        getAncientCodeScore?: () => ScoringResult;
        resetEditorEvents?: () => void;
    }
}

// ============================================
// Ancient Coding Mode - Anti-Cheat & Scoring
// ============================================

// Internal clipboard - never uses system clipboard
let internalClipboard = "";

// Event logging for scoring
interface EditorEvent {
    type: "insert" | "delete" | "copy_internal" | "paste_internal",
    length: number,
    timestamp: number
}

// Code-length snapshots used for burst/progression analysis
interface CodeSnapshot { length: number; timestamp: number }

const editorEvents: EditorEvent[] = [];
const codeSnapshots: CodeSnapshot[] = [];
const MAX_EVENTS = 1000;

// Ancient Coding Score System
interface ScoringResult {
    score: number;
    level: string;
    details: {
        typingRatio: number;
        rhythmScore: number;
        editActivity: number;
        largeInserts: number;
        antiPasteScore: number;
        speedScore: number;
        burstScore: number;
        sessionSecs: number;
    }
}

function logEditorEvent(event: EditorEvent) {
    editorEvents.push(event);
    if (editorEvents.length > MAX_EVENTS) {
        editorEvents.shift();
    }
}

// Calculate Ancient Coding Score
function calculateAncientCodeScore(): ScoringResult {
    // No events = code was not typed (starter code submitted or externally injected)
    if (editorEvents.length === 0) {
        return {
            score: 0, level: "🔴 Likely AI Generated",
            details: { typingRatio: 0, rhythmScore: 0, editActivity: 0, largeInserts: 0, antiPasteScore: 100, speedScore: 0, burstScore: 0, sessionSecs: 0 }
        };
    }

    const insertEvents = editorEvents.filter(e => e.type === "insert");
    const deleteEvents = editorEvents.filter(e => e.type === "delete");
    const pasteEvents  = editorEvents.filter(e => e.type === "paste_internal");

    const totalActions       = insertEvents.length + deleteEvents.length;
    const totalInsertedChars = insertEvents.reduce((sum, e) => sum + e.length, 0);

    // --- inputRatio (gameable but still indicative) ---
    const inputRatio = totalActions > 0 ? insertEvents.length / totalActions : 1;

    // --- rhythmScore: reward irregular (human) timing, penalize uniform (robot) ---
    let rhythmScore = 0.3;
    if (insertEvents.length >= 2) {
        const intervals: number[] = [];
        for (let i = 1; i < insertEvents.length; i++) {
            intervals.push(insertEvents[i].timestamp - insertEvents[i - 1].timestamp);
        }
        const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        if (mean > 0) {
            const variance = intervals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / intervals.length;
            const cv = Math.sqrt(variance) / mean; // humans: 0.4–1.5; robots: <0.1
            rhythmScore = Math.min(1, Math.max(0, cv * 2));
        } else {
            rhythmScore = 0;
        }
    }

    // --- editActivity: fraction of actions that are deletions ---
    const editActivity = totalActions > 0 ? deleteEvents.length / totalActions : 0;

    // --- Detect large unexplained inserts (injection signal) ---
    let largeInserts = 0;
    const pasteTimestamps = pasteEvents.map(e => e.timestamp);
    for (const ev of editorEvents) {
        if (ev.type === "insert" && ev.length > 50) {
            const isPastedInternally = pasteTimestamps.some(pt => Math.abs(pt - ev.timestamp) < 200);
            if (!isPastedInternally) largeInserts++;
        }
    }

    // --- antiPasteScore ---
    // First 2 internal pastes are free (normal refactoring); penalize beyond that.
    const excessPastes = Math.max(0, pasteEvents.length - 2);
    const antiPasteScore = Math.max(0, 1 - excessPastes * 0.15);

    // --- speedScore: avg chars/sec over the session.
    //     Normal: 2–15 chars/sec. Fast typist: ~15/sec. Script: 100+/sec. ---
    const sessionSecs = editorEvents.length >= 2
        ? (editorEvents[editorEvents.length - 1].timestamp - editorEvents[0].timestamp) / 1000
        : 0;
    let speedScore = 0.8; // default if we have no timing data
    if (sessionSecs > 0 && totalInsertedChars > 0) {
        const avgSpeed = totalInsertedChars / sessionSecs; // chars/sec
        // Full score for ≤15/s, 0 for ≥30/s, linear decay between
        speedScore = Math.min(1, Math.max(0, 1 - Math.max(0, avgSpeed - 15) / 15));
    }

    // --- burstScore: max chars inserted in any 1-second sliding window.
    //     Humans: ~10 chars/sec in a burst. Scripts: 200+/sec. ---
    let maxBurst = 0;
    const BURST_WINDOW_MS = 1000;
    let windowStart = 0;
    let windowChars = 0;
    for (let i = 0; i < insertEvents.length; i++) {
        windowChars += insertEvents[i].length;
        // drop events older than BURST_WINDOW_MS
        while (windowStart < i && insertEvents[i].timestamp - insertEvents[windowStart].timestamp > BURST_WINDOW_MS) {
            windowChars -= insertEvents[windowStart].length;
            windowStart++;
        }
        if (windowChars > maxBurst) maxBurst = windowChars;
    }
    // Full score ≤20 chars/s burst, 0 for ≥120 chars/s burst
    const burstScore = Math.min(1, Math.max(0, 1 - Math.max(0, maxBurst - 20) / 100));

    // --- Weighted formula (sums to 100) ---
    let rawScore =
        15 * inputRatio     +  // gameable but still indicative
        30 * rhythmScore    +  // strongest human signal
        10 * editActivity   +  // small signal
        15 * antiPasteScore +
        15 * speedScore     +  // overall session speed
        15 * burstScore;       // burst injection detection

    // Each unexplained large inject deducts 40 points (hard cap)
    const largeInsertPenalty = Math.min(rawScore, largeInserts * 40);
    const score = Math.round(Math.min(100, Math.max(0, rawScore - largeInsertPenalty)));

    let level: string;
    if (score >= 90) {
        level = "🟢 Ancient Master";
    } else if (score >= 70) {
        level = "🟡 Skilled Human";
    } else if (score >= 40) {
        level = "🟠 Suspicious";
    } else {
        level = "🔴 Likely AI Generated";
    }

    return {
        score,
        level,
        details: {
            typingRatio:   Math.round(inputRatio * 100),
            rhythmScore:   Math.round(rhythmScore * 100),
            editActivity:  Math.round(editActivity * 100),
            largeInserts,
            antiPasteScore: Math.round(antiPasteScore * 100),
            speedScore:    Math.round(speedScore * 100),
            burstScore:    Math.round(burstScore * 100),
            sessionSecs:   Math.round(sessionSecs),
        }
    };
}

function resetEditorEvents() {
    editorEvents.length = 0;
    codeSnapshots.length = 0;
}

export default function ProblemPageCodeEditor({ theme, selectedLanguage, setSelectedLanguage, setSelectedLanguageCode, sourceCode, setSourceCode, starterCode }: ProblemPageCodeEditorType & { starterCode?: string }) {
    const [isFullScreen, setIsFullScreen] = useState(!document.fullscreenElement);
    const editorRef = useRef<any>(null);

    useEffect(() => {
        const handleGlobalPaste = (e: ClipboardEvent) => {
            e.preventDefault();
            toast.error("禁止从外部粘贴 - External paste is disabled in Ancient Coding Mode");
        };

        window.addEventListener("paste", handleGlobalPaste);

        const handleContextMenu = (e: Event) => {
            e.preventDefault();
        };

        const container = document.querySelector('.monaco-editor');
        if (container) {
            container.addEventListener('contextmenu', handleContextMenu);
        }

        const handleDrop = (e: DragEvent) => {
            e.preventDefault();
        };
        window.addEventListener("drop", handleDrop);

        return () => {
            window.removeEventListener("paste", handleGlobalPaste);
            if (container) {
                container.removeEventListener('contextmenu', handleContextMenu);
            }
            window.removeEventListener("drop", handleDrop);
        };
    }, []);

    const handleCopyInternal = () => {
        if (editorRef.current) {
            const model = editorRef.current?.getModel();
            const selection = editorRef.current?.getSelection();

            if (selection && model) {
                const selectedText = model.getValueInRange(selection);
                if (selectedText) {
                    internalClipboard = selectedText;
                    logEditorEvent({
                        type: "copy_internal",
                        length: selectedText.length,
                        timestamp: Date.now()
                    });
                    toast.success("已复制到内部剪贴板 - Copied to internal clipboard");
                }
            }
        }
    };

    const handlePasteInternal = () => {
        // If internal clipboard is empty, block external paste
        if (!internalClipboard) {
            toast.error("禁止从外部粘贴 - External paste is disabled in Ancient Coding Mode");
            return;
        }

        if (editorRef.current) {
            const position = editorRef.current?.getPosition();
            const model = editorRef.current?.getModel();

            if (position && model) {
                const editOperations = [{
                    identifier: { major: 1, minor: 0 },
                    range: {
                        startLineNumber: position.lineNumber,
                        startColumn: position.column,
                        endLineNumber: position.lineNumber,
                        endColumn: position.column
                    },
                    text: internalClipboard,
                    forceMoveMarkers: false
                }];

                editorRef.current?.executeEdits("internal-paste", editOperations);
                logEditorEvent({
                    type: "paste_internal",
                    length: internalClipboard.length,
                    timestamp: Date.now()
                });
                toast.success("已从内部剪贴板粘贴 - Pasted from internal clipboard");
            }
        }
    };

    const handleEditorChange = (value: string | undefined, ev: any) => {
        if (!value || !editorRef.current) return;

        const changes = ev?.changes;

        if (changes && changes.length > 0) {
            for (const change of changes) {
                // Monaco provides rangeLength (chars removed), not deletedText
                const deletedLength = change.rangeLength || 0;

                if (deletedLength > 0 && (!change.text || change.text.length === 0)) {
                    // Pure deletion (backspace, delete key)
                    logEditorEvent({
                        type: "delete",
                        length: deletedLength,
                        timestamp: Date.now()
                    });
                } else if (change.text && change.text.length > 0) {
                    logEditorEvent({
                        type: "insert",
                        length: change.text.length,
                        timestamp: Date.now()
                    });
                }
            }
        }

        setSourceCode(value);
        // Track code length snapshot for burst/progression analysis
        codeSnapshots.push({ length: value.length, timestamp: Date.now() });
    };

    const handleEditorDidMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;

        editor.addCommand(
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC,
            handleCopyInternal
        );

        editor.addCommand(
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV,
            handlePasteInternal
        );
    };

    // Only Python is supported (template-based execution)
    const coddingLanguages = {
        "Python": { "compilorId": "python", "apiId": 10 }
    }

    type coddingLanguagesType = keyof typeof coddingLanguages;

    useEffect(() => {
        setSelectedLanguageCode(coddingLanguages[selectedLanguage as coddingLanguagesType].apiId);
        if (selectedLanguage === "Python" && starterCode) {
            // Only load starter code if editor is currently empty (don't overwrite user code)
            setSourceCode((prev: string) => prev || starterCode || "");
        } else if (!starterCode) {
            // starterCode not yet loaded from server — don't clear editor
        } else {
            setSourceCode("");
        }
        if (selectedLanguage) resetEditorEvents();
    }, [selectedLanguage, starterCode])

    const handleResetCode = () => {
        if (selectedLanguage === "Python" && starterCode) {
            setSourceCode(starterCode);
        } else {
            setSourceCode("");
        }
        resetEditorEvents();
    }

    const handleFullScreen = () => {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
            setIsFullScreen(!isFullScreen);
        }
    };

    const handleExitFullScreen = () => {
        if (document.fullscreenElement) {
            document.exitFullscreen();
            setIsFullScreen(!isFullScreen);
        }
    };

    const getScoringResult = () => {
        return calculateAncientCodeScore();
    };

    window.getAncientCodeScore = getScoringResult;
    window.resetEditorEvents = resetEditorEvents;

    return (
        <div className="w-full h-full bg-[var(--sidebar-accent)]">
            <div className="header">
                <div className="w-full flex justify-between px-3 py-2">
                    <div className='flex gap-2 items-center'>
                        <CodeXml className='text-green-500' />
                        <h1 className=''>Code</h1>
                        <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-500 border border-orange-500/30">
                            ANCIENT CODING MODE
                        </span>
                    </div>
                    <div className="flex items-center gap-4 px-2">
                        <Tooltip>
                            <TooltipTrigger>
                                {isFullScreen ?
                                    <Maximize onClick={handleFullScreen} className='resize-custom w-4 cursor-pointer' /> :
                                    <Maximize onClick={handleExitFullScreen} className='resize-custom w-4 cursor-pointer' />
                                }
                            </TooltipTrigger>
                            <TooltipContent className={`bg-[var(--sidebar-accent)] border ${theme === "dark" ? 'text-neutral-200 border-gray-600' : 'text-gray-600 border-gray-300'}`}>{isFullScreen ? 'Full screen' : 'Exit Full Screen'}</TooltipContent>
                        </Tooltip>
                        <ChevronUp className='resize-custom w-5 cursor-pointer' />
                    </div>
                </div>
                <div style={{ background: "var(--card)" }} className={`w-full h-6 px-3 py-4 flex items-center justify-between ${theme === "dark" ? 'text-neutral-400' : ''}`}>
                    <div className='flex items-center gap-2 px-1'>
                        <span className="font-medium">Python</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">Only</span>
                    </div>
                    <div className="flex gap-3">
                        <Bookmark className='resize-custom w-4' />
                        <Tooltip>
                            <TooltipTrigger onClick={handleCopyInternal} className='cursor-pointer'>
                                <Copy className='resize-custom w-4' />
                            </TooltipTrigger>
                            <TooltipContent className={`bg-[var(--sidebar-accent)] border ${theme === "dark" ? 'text-neutral-200 border-gray-600' : 'text-gray-600 border-gray-300'}`}>Copy (Internal)</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger onClick={handlePasteInternal} className='cursor-pointer'>
                                <CodeXml className='resize-custom w-4' />
                            </TooltipTrigger>
                            <TooltipContent className={`bg-[var(--sidebar-accent)] border ${theme === "dark" ? 'text-neutral-200 border-gray-600' : 'text-gray-600 border-gray-300'}`}>Paste (Internal Only)</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger onClick={handleResetCode} className='cursor-pointer'>
                                <RotateCcw className='resize-custom w-4' />
                            </TooltipTrigger>
                            <TooltipContent className={`bg-[var(--sidebar-accent)] border ${theme === "dark" ? 'text-neutral-200 border-gray-600' : 'text-gray-600 border-gray-300'}`}>Reset Editor</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger>
                                {isFullScreen ?
                                    <Maximize2 onClick={handleFullScreen} className='resize-custom w-4 ml-2 cursor-pointer' /> :
                                    <Minimize2 onClick={handleExitFullScreen} className='resize-custom w-4 ml-2 cursor-pointer' />
                                }
                            </TooltipTrigger>
                            <TooltipContent className={`bg-[var(--sidebar-accent)] border ${theme === "dark" ? 'text-neutral-200 border-gray-600' : 'text-gray-600 border-gray-300'}`}>{isFullScreen ? 'Full screen' : 'Exit Full Screen'}</TooltipContent>
                        </Tooltip>
                    </div>
                </div>
            </div>
            <Editor
                language={coddingLanguages[selectedLanguage as coddingLanguagesType].compilorId}
                value={sourceCode}
                onChange={handleEditorChange}
                theme='vs-dark'
                onMount={handleEditorDidMount}
                options={{
                    automaticLayout: true,
                    minimap: { enabled: false },
                    lineNumbers: "on",
                    pasteAs: false,
                }}
                className='w-full h-[calc(100vh-8.7rem)]'
            />
        </div>
    )
}
