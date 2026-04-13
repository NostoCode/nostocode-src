import React, { useEffect, useState, useRef } from 'react'
import Editor from '@monaco-editor/react';
import { Bookmark, Braces, ChevronUp, CodeXml, Copy, Maximize, Maximize2, Minimize2, RotateCcw } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from 'sonner';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"

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

const editorEvents: EditorEvent[] = [];
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
    if (editorEvents.length === 0) {
        return { score: 100, level: "🟢 Ancient Master", details: { typingRatio: 1, rhythmScore: 1, editActivity: 0, largeInserts: 0, antiPasteScore: 1 } };
    }

    const insertEvents = editorEvents.filter(e => e.type === "insert");
    const deleteEvents = editorEvents.filter(e => e.type === "delete");
    const pasteEvents = editorEvents.filter(e => e.type === "paste_internal");

    const totalActions = insertEvents.length + deleteEvents.length;
    const totalInsertedChars = insertEvents.reduce((sum, e) => sum + e.length, 0);
    const totalDeletedChars = deleteEvents.reduce((sum, e) => sum + e.length, 0);

    const inputRatio = totalActions > 0 ? insertEvents.length / totalActions : 1;

    let rhythmScore = 0.8;
    if (insertEvents.length >= 2) {
        const intervals = [];
        for (let i = 1; i < insertEvents.length; i++) {
            const interval = insertEvents[i].timestamp - insertEvents[i - 1].timestamp;
            intervals.push(interval);
        }
        const meanInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((a, b) => a + Math.pow(b - meanInterval, 2), 0) / intervals.length;
        rhythmScore = Math.min(1, Math.max(0.3, 1 - (variance / (meanInterval * meanInterval + 0.01))));
    }

    const editActivity = totalActions > 0 ? deleteEvents.length / totalActions : 0;

    let largeInserts = 0;
    for (let i = 0; i < editorEvents.length; i++) {
        if (editorEvents[i].type === "insert" && editorEvents[i].length > 30) {
            let isBurst = false;
            for (let j = i + 1; j < Math.min(i + 5, editorEvents.length); j++) {
                if (editorEvents[j].timestamp - editorEvents[i].timestamp < 50) {
                    isBurst = true;
                    break;
                }
            }
            if (isBurst) largeInserts++;
        }
    }

    const antiPasteScore = Math.max(0, 1 - pasteEvents.length * 0.1);

    let rawScore =
        40 * inputRatio +
        20 * rhythmScore +
        20 * editActivity +
        20 * antiPasteScore;

    const normalizedScore = Math.min(100, Math.max(0, rawScore));

    let level: string;
    if (normalizedScore >= 90) {
        level = "🟢 Ancient Master";
    } else if (normalizedScore >= 70) {
        level = "🟡 Skilled Human";
    } else if (normalizedScore >= 40) {
        level = "🟠 Suspicious";
    } else {
        level = "🔴 Likely AI Generated";
    }

    return {
        score: Math.round(normalizedScore),
        level,
        details: {
            typingRatio: Math.round(inputRatio * 100),
            rhythmScore: Math.round(rhythmScore * 100),
            editActivity: Math.round(editActivity * 100),
            largeInserts,
            antiPasteScore: Math.round(antiPasteScore * 100)
        }
    };
}

function resetEditorEvents() {
    editorEvents.length = 0;
}

export default function ProblemPageCodeEditor({ theme, selectedLanguage, setSelectedLanguage, setSelectedLanguageCode, sourceCode, setSourceCode }: ProblemPageCodeEditorType) {
    const [isFullScreen, setIsFullScreen] = useState(!document.fullscreenElement);
    const editorRef = useRef<any>(null);

    useEffect(() => {
        const handleGlobalPaste = (e: ClipboardEvent) => {
            e.preventDefault();
            toast.error("External paste is disabled in Ancient Coding Mode");
        };

        window.addEventListener("paste", handleGlobalPaste);

        const handleContextMenu = (e: MouseEvent) => {
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
                    toast.success("Copied to internal clipboard");
                }
            }
        }
    };

    const handlePasteInternal = () => {
        if (internalClipboard && editorRef.current) {
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
                toast.success("Pasted from internal clipboard");
            }
        } else if (!internalClipboard) {
            toast.error("Internal clipboard is empty. Copy something first.");
        }
    };

    const handleEditorChange = (value: string | undefined, ev: any) => {
        if (!value || !editorRef.current) return;

        const changes = ev?.changes;

        if (changes && changes.length > 0) {
            for (const change of changes) {
                const deletedText = change.deletedText;
                const textLength = deletedText ? deletedText.length : (change.text?.length || 0);

                if (deletedText && deletedText.length > 0) {
                    logEditorEvent({
                        type: "delete",
                        length: deletedText.length,
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
    };

    const handleEditorDidMount = (editor: any) => {
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

    const coddingLanguages = {
        "C": { "compilorId": "c", "apiId": 50 },
        "C++": { "compilorId": "cpp", "apiId": 54 },
        "Java": { "compilorId": "java", "apiId": 62 },
        "Javascript": { "compilorId": "javascript", "apiId": 93 },
        "Python": { "compilorId": "python", "apiId": 71 }
    }

    type coddingLanguagesType = keyof typeof coddingLanguages;

    useEffect(() => {
        const changeLanguageCode = () => {
            setSelectedLanguageCode(coddingLanguages[selectedLanguage as coddingLanguagesType].apiId);
            setSourceCode("");
            resetEditorEvents();
        }
        changeLanguageCode();
    }, [selectedLanguage])

    const handleResetCode = () => {
        setSourceCode("");
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
                    <DropdownMenu>
                        <DropdownMenuTrigger className='flex items-center gap-2 outline-none transition-all duration-300 hover:bg-[var(--sidebar-accent)] px-1 rounded-sm cursor-pointer'>{selectedLanguage} <ChevronUp className='resize-custom w-4 rotate-180' /></DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClickCapture={() => { setSelectedLanguage("C") }}>C</DropdownMenuItem>
                            <DropdownMenuItem onClickCapture={() => setSelectedLanguage("C++")}>C++</DropdownMenuItem>
                            <DropdownMenuItem onClickCapture={() => setSelectedLanguage("Java")}>Java</DropdownMenuItem>
                            <DropdownMenuItem onClickCapture={() => setSelectedLanguage("Javascript")}>Javascript</DropdownMenuItem>
                            <DropdownMenuItem onClickCapture={() => setSelectedLanguage("Python")}>Python</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
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
