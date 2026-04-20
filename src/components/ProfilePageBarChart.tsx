'use client';

import React from "react";
import { Construction } from "lucide-react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";

export default function ProblemPageBarChart() {
    return (
        <Card className="w-full h-full py-4 border-none">
            <CardHeader className='absolute top-0 left-0 gap-1'>
                <CardDescription className='font-semibold text-lg'>Top</CardDescription>
                <CardTitle className='text-2xl font-normal text-gray-400'>—</CardTitle>
            </CardHeader>
            <CardContent className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Construction className='w-8 h-8' />
                <span className='text-sm'>Coming Soon</span>
            </CardContent>
        </Card>
    );
}
