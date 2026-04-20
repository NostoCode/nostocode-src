import { Schema, Types, Document, model, models } from "mongoose";

export interface IScoreDetails {
    typingRatio: number;   // % of actions that were inserts
    rhythmScore: number;   // typing rhythm variation score (0-100)
    editActivity: number;  // % of actions that were deletes
    largeInserts: number;  // count of large unexplained inserts
    speedScore: number;    // typing speed score (0-100)
    burstScore: number;    // burst injection detection score (0-100)
    sessionSecs: number;   // total session duration in seconds
}

export interface ISubmission extends Document {
    userId: Types.ObjectId,
    status: string,
    language: string,
    time: number,
    memory: number,
    sourceCode: string,
    ancientCodeScore: number,
    ancientCodeLevel: string,
    scoreDetails?: IScoreDetails,
    problemId: Types.ObjectId,
    createdAt?: Date,
    updatedAt?: Date
}

const submissionSchema = new Schema<ISubmission>({
    userId: {
        type: Schema.Types.ObjectId,
        required: [true, "User id is required"],
        ref: "User"
    },
    status: {
        type: String,
        required: [true, "Smitted code status required"]
    },
    language: {
        type: String,
        required: [true, "Coding language is required"]
    },
    time: {
        type: Number,
        required: [true, "Code run time required"]
    },
    memory: {
        type: Number,
        required: [true, "Code run time required"]
    },
    sourceCode: {
        type: String,
        required: [true, "Code required"]
    },
    problemId: {
        type: Schema.Types.ObjectId,
        required: [true, "User id is required"],
        ref: "Problem"
    },
    ancientCodeScore: {
        type: Number,
        default: 100
    },
    ancientCodeLevel: {
        type: String,
        default: "🟢 Ancient Master"
    },
    scoreDetails: {
        type: {
            typingRatio: Number,
            rhythmScore: Number,
            editActivity: Number,
            largeInserts: Number,
            speedScore: Number,
            burstScore: Number,
            sessionSecs: Number,
        },
        required: false,
        default: undefined,
    }
}, { timestamps: true });

const Submission = models?.Submission || model<ISubmission>("Submission", submissionSchema);

export default Submission;
