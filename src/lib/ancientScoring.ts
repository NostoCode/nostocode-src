export interface EditorEvent {
  type: "insert" | "delete" | "copy_internal" | "paste_internal";
  length: number;
  timestamp: number;
}

export interface CodeSnapshot {
  length: number;
  timestamp: number;
}

export interface ScoringResult {
  score: number;
  level: string;
  details: {
    typingRatio: number;
    rhythmScore: number;
    editActivity: number;
    largeInserts: number;
    speedScore: number;
    burstScore: number;
    sessionSecs: number;
  };
}

let internalClipboard = "";
const editorEvents: EditorEvent[] = [];
const codeSnapshots: CodeSnapshot[] = [];
const MAX_EVENTS = 1000;

export function getInternalClipboard(): string {
  return internalClipboard;
}

export function setInternalClipboard(text: string): void {
  internalClipboard = text;
}

export function logEditorEvent(event: EditorEvent): void {
  editorEvents.push(event);
  if (editorEvents.length > MAX_EVENTS) {
    editorEvents.shift();
  }
}

export function logCodeSnapshot(length: number, timestamp = Date.now()): void {
  codeSnapshots.push({ length, timestamp });
}

export function resetEditorEvents(): void {
  editorEvents.length = 0;
  codeSnapshots.length = 0;
}

export function calculateAncientCodeScore(): ScoringResult {
  if (editorEvents.length === 0) {
    return {
      score: 0,
      level: "🔴 Likely AI Generated",
      details: {
        typingRatio: 0,
        rhythmScore: 0,
        editActivity: 0,
        largeInserts: 0,
        speedScore: 0,
        burstScore: 0,
        sessionSecs: 0,
      },
    };
  }

  const insertEvents = editorEvents.filter((e) => e.type === "insert");
  const deleteEvents = editorEvents.filter((e) => e.type === "delete");
  const pasteEvents = editorEvents.filter((e) => e.type === "paste_internal");

  const totalActions = insertEvents.length + deleteEvents.length;
  const inputRatio = totalActions > 0 ? insertEvents.length / totalActions : 1;

  let rhythmScore = 0.3;
  if (insertEvents.length >= 2) {
    const intervals: number[] = [];
    for (let i = 1; i < insertEvents.length; i++) {
      intervals.push(insertEvents[i].timestamp - insertEvents[i - 1].timestamp);
    }
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    if (mean > 0) {
      const variance =
        intervals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / intervals.length;
      const cv = Math.sqrt(variance) / mean;
      rhythmScore = Math.min(1, Math.max(0, cv * 2));
    } else {
      rhythmScore = 0;
    }
  }

  const editActivity = totalActions > 0 ? deleteEvents.length / totalActions : 0;

  let largeInserts = 0;
  const pasteTimestamps = pasteEvents.map((e) => e.timestamp);
  for (const ev of editorEvents) {
    if (ev.type === "insert" && ev.length > 50) {
      const isPastedInternally = pasteTimestamps.some(
        (pt) => Math.abs(pt - ev.timestamp) < 200
      );
      if (!isPastedInternally) largeInserts++;
    }
  }

  const genuineInsertEvents = insertEvents.filter(
    (e) => !pasteTimestamps.some((pt) => Math.abs(pt - e.timestamp) < 200)
  );
  const totalGenuineInsertedChars = genuineInsertEvents.reduce(
    (sum, e) => sum + e.length,
    0
  );

  const sessionSecs =
    editorEvents.length >= 2
      ? (editorEvents[editorEvents.length - 1].timestamp - editorEvents[0].timestamp) /
        1000
      : 0;

  let speedScore = 0.8;
  if (sessionSecs > 0 && totalGenuineInsertedChars > 0) {
    const avgSpeed = totalGenuineInsertedChars / sessionSecs;
    speedScore = Math.min(1, Math.max(0, 1 - Math.max(0, avgSpeed - 15) / 15));
  }

  let maxBurst = 0;
  const BURST_WINDOW_MS = 1000;
  let windowStart = 0;
  let windowChars = 0;
  for (let i = 0; i < genuineInsertEvents.length; i++) {
    windowChars += genuineInsertEvents[i].length;
    while (
      windowStart < i &&
      genuineInsertEvents[i].timestamp - genuineInsertEvents[windowStart].timestamp >
        BURST_WINDOW_MS
    ) {
      windowChars -= genuineInsertEvents[windowStart].length;
      windowStart++;
    }
    if (windowChars > maxBurst) maxBurst = windowChars;
  }
  const burstScore = Math.min(1, Math.max(0, 1 - Math.max(0, maxBurst - 20) / 100));

  const rawScore =
    15 * inputRatio +
    40 * rhythmScore +
    10 * editActivity +
    20 * speedScore +
    15 * burstScore;

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
      typingRatio: Math.round(inputRatio * 100),
      rhythmScore: Math.round(rhythmScore * 100),
      editActivity: Math.round(editActivity * 100),
      largeInserts,
      speedScore: Math.round(speedScore * 100),
      burstScore: Math.round(burstScore * 100),
      sessionSecs: Math.round(sessionSecs),
    },
  };
}