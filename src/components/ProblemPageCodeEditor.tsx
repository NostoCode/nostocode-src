import React, { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react'
import Editor from '@monaco-editor/react';
import type { OnMount } from '@monaco-editor/react';
import { Bookmark, ChevronUp, CodeXml, Copy, Info, Maximize, Maximize2, Minimize2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { useAppTheme } from '@/context/ThemeContext';
import {
    calculateAncientCodeScore,
    getInternalClipboard,
    logCodeSnapshot,
    logEditorEvent,
    resetEditorEvents,
    setInternalClipboard,
    type ScoringResult,
} from '@/lib/ancientScoring';

interface ProblemPageCodeEditorType {
    theme: string | undefined;
    selectedLanguage: string;
    setSelectedLanguageCode: React.Dispatch<React.SetStateAction<number>>;
    sourceCode: string;
    setSourceCode: React.Dispatch<React.SetStateAction<string>>;
}

export interface ProblemPageCodeEditorHandle {
    getScoringResult: () => ScoringResult;
    resetEvents: () => void;
}

interface MonacoSelection {
    isEmpty: () => boolean;
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
}

const ProblemPageCodeEditor = forwardRef<ProblemPageCodeEditorHandle, ProblemPageCodeEditorType & { starterCode?: string }>(function ProblemPageCodeEditor(
    { theme, selectedLanguage, setSelectedLanguageCode, sourceCode, setSourceCode, starterCode },
    ref
) {
    const [isFullScreen, setIsFullScreen] = useState(!document.fullscreenElement);
    const { isWin98, colorMode } = useAppTheme();
    const monacoTheme = isWin98 || colorMode === 'light' ? 'vs' : 'vs-dark';
    const editorFontFamily = isWin98
        ? '"Fixedsys", "Terminal", "Courier New", monospace'
        : '"Consolas", "Courier New", monospace';

    useImperativeHandle(ref, () => ({
        getScoringResult: () => calculateAncientCodeScore(),
        resetEvents: resetEditorEvents,
    }), []);

    useEffect(() => {
        if (typeof window !== "undefined") {
            window.getAncientCodeScore = () => calculateAncientCodeScore();
            window.resetEditorEvents = resetEditorEvents;
        }
        return () => {
            if (typeof window !== "undefined") {
                delete window.getAncientCodeScore;
                delete window.resetEditorEvents;
            }
        };
    }, []);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const editorRef = useRef<any>(null);

    useEffect(() => {
        const handleGlobalPaste = (e: ClipboardEvent) => {
            if (!editorRef.current?.hasTextFocus()) return;

            e.preventDefault();
            e.stopPropagation();

            void (async () => {
                let externalText = e.clipboardData?.getData("text") ?? "";
                if (!externalText) {
                    try {
                        externalText = await navigator.clipboard.readText();
                    } catch {
                        /* clipboard API unavailable */
                    }
                }

                const clipboard = getInternalClipboard();
                const hasInternal = clipboard.length > 0;
                const hasExternal = externalText.length > 0;

                if (!hasInternal && !hasExternal) return;

                if (!hasInternal && hasExternal) {
                    toast.error("External paste is disabled in Ancient Coding Mode");
                    return;
                }

                if (editorRef.current) {
                    const selections = editorRef.current.getSelections() as MonacoSelection[] | null;
                    if (selections && selections.length > 0) {
                        const clipLines = clipboard.split("\n");
                        const usePerCursor = selections.length > 1 && clipLines.length === selections.length;
                        const editOperations = selections.map((sel: MonacoSelection, i: number) => ({
                            identifier: { major: 1, minor: i },
                            range: sel,
                            text: usePerCursor ? clipLines[i] : clipboard,
                            forceMoveMarkers: true,
                        }));
                        editorRef.current.executeEdits("internal-paste", editOperations);
                        logEditorEvent({
                            type: "paste_internal",
                            length: clipboard.length,
                            timestamp: Date.now(),
                        });
                    }
                }

                if (!hasExternal) {
                    toast.success("Pasted from internal clipboard");
                } else if (clipboard !== externalText) {
                    toast.warning("External paste blocked, pasted from internal clipboard");
                }
            })();
        };

        document.addEventListener("paste", handleGlobalPaste, { capture: true });

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
            document.removeEventListener("paste", handleGlobalPaste, { capture: true });
            if (container) {
                container.removeEventListener('contextmenu', handleContextMenu);
            }
            window.removeEventListener("drop", handleDrop);
        };
    }, []);

    const handleCopyInternal = async () => {
        if (!editorRef.current) return;
        const model = editorRef.current.getModel();
        const selections = editorRef.current.getSelections() as MonacoSelection[] | null;
        if (!model || !selections || selections.length === 0) return;

        let textToCopy: string;
        if (selections.every(s => s.isEmpty())) {
            // All cursors with no selection → copy each cursor's line (VS Code behaviour)
            textToCopy = selections.map(s => model.getLineContent(s.startLineNumber)).join('\n') + '\n';
        } else {
            // One or more real selections → join each selection with newline
            textToCopy = selections.map(s => model.getValueInRange(s)).join('\n');
        }

        if (textToCopy) {
            setInternalClipboard(textToCopy);
            logEditorEvent({ type: "copy_internal", length: textToCopy.length, timestamp: Date.now() });
            // Sync to system clipboard so paste matrix works correctly
            try { await navigator.clipboard.writeText(textToCopy); } catch { /* permission denied ok */ }
            toast.success("Copied to internal clipboard");
        }
    };

    const handleCutInternal = async () => {
        if (!editorRef.current) return;
        const model = editorRef.current.getModel();
        const selections = editorRef.current.getSelections() as MonacoSelection[] | null;
        if (!model || !selections || selections.length === 0) return;

        const lineCount = model.getLineCount();
        let textToCut: string;
        let editOperations: { identifier: { major: number; minor: number }; range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number }; text: string; forceMoveMarkers: boolean }[];

        if (selections.every(s => s.isEmpty())) {
            // No selection → cut each cursor's whole line (VS Code behaviour)
            const parts: string[] = [];
            editOperations = selections.map((s, i) => {
                const ln = s.startLineNumber;
                const content = model.getLineContent(ln);
                let range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number };
                if (lineCount === 1) {
                    parts.push(content);
                    range = { startLineNumber: ln, startColumn: 1, endLineNumber: ln, endColumn: content.length + 1 };
                } else if (ln < lineCount) {
                    parts.push(content + '\n');
                    range = { startLineNumber: ln, startColumn: 1, endLineNumber: ln + 1, endColumn: 1 };
                } else {
                    parts.push('\n' + content);
                    range = { startLineNumber: ln - 1, startColumn: model.getLineLength(ln - 1) + 1, endLineNumber: ln, endColumn: content.length + 1 };
                }
                return { identifier: { major: 1, minor: i }, range, text: '', forceMoveMarkers: true };
            });
            textToCut = parts.join('');
        } else {
            // Cut each selection
            textToCut = selections.map(s => model.getValueInRange(s)).join('\n');
            editOperations = selections.map((s, i) => ({
                identifier: { major: 1, minor: i },
                range: { startLineNumber: s.startLineNumber, startColumn: s.startColumn, endLineNumber: s.endLineNumber, endColumn: s.endColumn },
                text: '',
                forceMoveMarkers: true
            }));
        }

        setInternalClipboard(textToCut);
        editorRef.current.executeEdits("internal-cut", editOperations);
        logEditorEvent({ type: "copy_internal", length: textToCut.length, timestamp: Date.now() });
        // Sync to system clipboard so paste matrix works correctly
        try { await navigator.clipboard.writeText(textToCut); } catch { /* permission denied ok */ }
        toast.success("Cut to internal clipboard");
    };

    const handlePasteButton = () => {
        const clipboard = getInternalClipboard();
        if (!editorRef.current || !clipboard) return;
        const selections = editorRef.current.getSelections() as MonacoSelection[] | null;
        if (!selections || selections.length === 0) return;
        const clipLines = clipboard.split('\n');
        const usePerCursor = selections.length > 1 && clipLines.length === selections.length;
        const editOperations = selections.map((sel: MonacoSelection, i: number) => ({
            identifier: { major: 1, minor: i },
            range: sel,
            text: usePerCursor ? clipLines[i] : clipboard,
            forceMoveMarkers: true
        }));
        editorRef.current.executeEdits("internal-paste", editOperations);
        logEditorEvent({ type: "paste_internal", length: clipboard.length, timestamp: Date.now() });
        toast.success("Pasted from internal clipboard");
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        logCodeSnapshot(value.length);
    };

    const handleEditorDidMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;

        // Use onKeyDown instead of addCommand — Monaco doesn't route clipboard shortcuts
        // (Ctrl+C, Ctrl+X, Ctrl+V) through its command dispatch; they fire as DOM clipboard events.
        // We intercept at the keydown level, prevent the default browser clipboard behavior,
        // and call our custom handlers instead.
        // Note: Ctrl+V is also handled by the global window "paste" event listener as a fallback,
        // but intercepting here ensures consistent behavior and prevents double-paste.
        editor.onKeyDown((e) => {
            const ctrl = e.ctrlKey || e.metaKey;
            if (!ctrl || e.shiftKey || e.altKey) return;

            if (e.keyCode === monaco.KeyCode.KeyC) {
                e.preventDefault();
                e.stopPropagation();
                handleCopyInternal();
            } else if (e.keyCode === monaco.KeyCode.KeyX) {
                e.preventDefault();
                e.stopPropagation();
                handleCutInternal();
            }
        });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedLanguage, starterCode, setSelectedLanguageCode, setSourceCode])

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
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button className="cursor-default"><Info className="resize-custom w-3.5 h-3.5 text-blue-400" /></button>
                            </TooltipTrigger>
                            <TooltipContent className={`bg-[var(--sidebar-accent)] border ${theme === "dark" ? 'text-neutral-200 border-gray-600' : 'text-gray-600 border-gray-300'}`}>Other languages support Coming Soon</TooltipContent>
                        </Tooltip>
                    </div>
                    <div className="flex gap-3">
                        <Bookmark onClick={() => toast.info("Bookmarks coming soon")} className='resize-custom w-4 cursor-pointer' />
                        <Tooltip>
                            <TooltipTrigger onClick={handleCopyInternal} className='cursor-pointer'>
                                <Copy className='resize-custom w-4' />
                            </TooltipTrigger>
                            <TooltipContent className={`bg-[var(--sidebar-accent)] border ${theme === "dark" ? 'text-neutral-200 border-gray-600' : 'text-gray-600 border-gray-300'}`}>Copy (Internal)</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger onClick={handlePasteButton} className='cursor-pointer'>
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
                theme={monacoTheme}
                onMount={handleEditorDidMount}
                options={{
                    automaticLayout: true,
                    minimap: { enabled: false },
                    lineNumbers: "on",
                    pasteAs: { enabled: false },
                    fontFamily: editorFontFamily,
                }}
                className='w-full h-[calc(100vh-8.7rem)]'
            />
        </div>
    )
});

export default ProblemPageCodeEditor;

declare global {
    interface Window {
        getAncientCodeScore?: () => ScoringResult;
        resetEditorEvents?: () => void;
    }
}
