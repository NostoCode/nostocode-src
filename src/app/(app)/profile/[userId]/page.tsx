"use client";
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { IUser } from '@/models/User';
import { ApiResponse } from '@/types/ApiResponse';
import axios, { isAxiosError } from 'axios';
import { CreditCard, ExternalLink, FlaskConical, Loader2, Package, Settings, ShieldCheck, University } from 'lucide-react'
import { useParams } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { useForm } from "react-hook-form";
import { z } from "zod";
import { updateUserValidation } from '@/schemas/updateUserSchema';
import { zodResolver } from '@hookform/resolvers/zod';

type ProfileTab = 'basic' | 'account' | 'labs' | 'privacy' | 'billing' | 'orders';

export default function Page() {

    const { userId } = useParams()
    const [fullUserInfo, setFullUserInfo] = useState<IUser | null>(null)
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState<ProfileTab>('basic');

    const form = useForm<z.infer<typeof updateUserValidation>>({
        resolver: zodResolver(updateUserValidation),
        defaultValues: {
            username: "",
            bio: "",
            country: "",
            university: "",
            github: "",
            linkedin: "",
            skills: []
        }
    })

    const allValues = form.watch();

    const fetchFullUserInfo = useCallback(async () => {
        try {
            const res = await axios.get<ApiResponse>(`/api/user/get-user?userId=${userId}`);

            setFullUserInfo(res.data.user || null);
            if (!res.data.user) return;

            form.reset({
                username: res.data.user.username,
                bio: res.data.user.bio,
                country: res.data.user.country,
                university: res.data.user.university,
                github: res.data.user.github,
                linkedin: res.data.user.linkedin,
                skills: res.data.user.skills || []
            });
        } catch (error) {
            if (isAxiosError(error) && error.response) {
                toast.error(error.response.data.message || "Problem occur while fetching userinfo")
            } else {
                toast.error("Error while fetching user info");
            }
        }
    }, [userId, setFullUserInfo]);

    useEffect(() => {
        fetchFullUserInfo();
    }, [fetchFullUserInfo]);

    const onSubmit = async (data: z.infer<typeof updateUserValidation>) => {
        setIsSubmitting(true);

        try {
            const res = await axios.post("/api/user/update-user", data);
            toast.success("User info updated successfully")
        } catch (error) {
            if(isAxiosError(error) && error.response){
                toast.error(error.response.data.message || "Problem occur while submitting info")
            }else{
                toast.error("Error while submitting user info")
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleShareProfile = () => {
        const url = `${window.location.origin}/dashboard/${userId}`;
        navigator.clipboard.writeText(url).then(() => {
            toast.success("Profile link copied!");
        }).catch(() => {
            toast.info(`Profile URL: ${url}`);
        });
    };

    const navItems: { key: ProfileTab; label: string; icon: React.ReactNode }[] = [
        { key: 'account', label: 'Account', icon: <Settings className='resize-custom w-5' /> },
        { key: 'labs', label: 'Labs', icon: <FlaskConical className='resize-custom w-5' /> },
        { key: 'privacy', label: 'Privacy', icon: <ShieldCheck className='resize-custom w-5' /> },
        { key: 'billing', label: 'Billing', icon: <CreditCard className='resize-custom w-5' /> },
        { key: 'orders', label: 'Orders', icon: <Package className='resize-custom w-5' /> },
    ];

    return (
        <div className='w-full min-h-screen'>
            <div className="w-full flex items-center gap-12 py-8 px-24">
                <div className="w-40 h-40 border-white border-4 rounded-lg overflow-hidden bg-gray-400 flex items-center justify-center relative">
                    <span className="text-4xl font-bold text-white z-0 select-none">
                      {fullUserInfo?.username?.[0]?.toUpperCase() ?? "?"}
                    </span>
                    {fullUserInfo?.avatar && (
                      <img 
                        src={fullUserInfo.avatar} 
                        alt="" 
                        className="w-full h-full object-cover absolute inset-0 z-10"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                </div>
                <div className="">
                    <h1 className="text-2xl font-semibold flex items-center gap-4">
                        {fullUserInfo?.username}
                        <button onClick={handleShareProfile} title="Copy profile link" className="cursor-pointer hover:opacity-70">
                            <ExternalLink className='resize-custom w-5 text-blue-500' />
                        </button>
                    </h1>
                    <p className="text-gray-500">NostoCode ID: {(fullUserInfo?._id || "").toString()}</p>
                </div>
            </div>
            <div className="w-full customBackground pb-8">
                <div className="w-full flex justify-center gap-8 items-start pt-8 px-8">
                    <div className="w-[20%]">
                        <h2 className="w-full bg-blue-400 py-4 px-8 text-lg rounded-md">Basic Info</h2>
                        {navItems.map(({ key, label, icon }) => (
                            <div key={key} onClick={() => setActiveTab(key)} className={`flex items-center gap-4 px-4 py-3 cursor-pointer ${activeTab === key ? 'text-foreground' : 'text-gray-500'}`}>
                                {icon}
                                <h3>{label}</h3>
                                <span className="ml-auto text-xs text-gray-400">Soon</span>
                            </div>
                        ))}
                    </div>
                    <div className="w-[60%] h-[48rem] customBackground rounded-md py-4 px-8 border relative overflow-hidden">
                        {activeTab !== 'basic' && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10">
                                <p className="text-xl font-semibold text-gray-500">Coming Soon</p>
                                <p className="text-sm text-gray-400 mt-2">This section is under construction.</p>
                                <Button variant="outline" className="mt-4 cursor-pointer" onClick={() => setActiveTab('basic')}>Back to Basic Info</Button>
                            </div>
                        )}
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col gap-4'>
                                <h1 className="font-semibold pt-2 pb-4">Basic Info</h1>
                                <FormField
                                    name="username"
                                    control={form.control}
                                    render={({ field }) => (
                                        <FormItem className='flex gap-12'>
                                            <FormLabel className='w-32'>Username</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Username" {...field} className='text-base p-4 h-11 w-[60%]' />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="flex items-center gap-12 mb-4">
                                    <h2 className="w-32">Email</h2>
                                    <h2 className="w-[60%] dark:bg-[#212124] focus-visible:border-ring border border-input h-10 rounded-md px-4 py-2 cursor-not-allowed">{fullUserInfo?.email}</h2>
                                </div>
                                <FormField
                                    name="bio"
                                    control={form.control}
                                    render={({ field }) => (
                                        <FormItem className='flex gap-12'>
                                            <FormLabel className='w-32'>Bio</FormLabel>
                                            <textarea className="w-[60%] h-24 rounded-md resize-none dark:bg-[#212124] border border-input focus-visible:border-ring px-4 py-2" onChange={(e) => field.onChange(e.target.value)} value={allValues.bio}></textarea>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    name="country"
                                    control={form.control}
                                    render={({ field }) => (
                                        <FormItem className='flex gap-12'>
                                            <FormLabel className='w-32'>Country</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Country" {...field} className='text-base p-4 h-11 w-[60%]' />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    name="university"
                                    control={form.control}
                                    render={({ field }) => (
                                        <FormItem className='flex gap-12'>
                                            <FormLabel className='w-32'>University</FormLabel>
                                            <FormControl>
                                                <Input placeholder="University" {...field} className='text-base p-4 h-11 w-[60%]' />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    name="github"
                                    control={form.control}
                                    render={({ field }) => (
                                        <FormItem className='flex gap-12'>
                                            <FormLabel className='w-32'>Github</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Github" {...field} className='text-base p-4 h-11 w-[60%]' />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    name="linkedin"
                                    control={form.control}
                                    render={({ field }) => (
                                        <FormItem className='flex gap-12'>
                                            <FormLabel className='w-32'>LinkedIn</FormLabel>
                                            <FormControl>
                                                <Input placeholder="LinkedIn" {...field} className='text-base p-4 h-11 w-[60%]' />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    name="skills"
                                    control={form.control}
                                    render={({ field }) => (
                                        <FormItem className='flex gap-12'>
                                            <FormLabel className='w-32'>Skills</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Skills (add space seperated tags | Max 6)" value={Array.isArray(field.value)? field.value.join(" ") : field.value} 
                                                onChange={(e) => {
                                                    const inputValue = e.target.value;
                                                    const allSkills = inputValue.split(" ").map((ele) => ele.trim());
                                                    form.setValue("skills", allSkills)
                                                }} className='text-base p-4 h-11 w-[60%]' autoComplete='off' />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="w-full flex justify-center">
                                    <div className="w-[60%] flex gap-2">
                                        {allValues.skills.map((skill, index) => 
                                        <h3 key={index} className="px-4 py-1 bg-[var(--sidebar-accent)] rounded-full">{skill}</h3>
                                        )}
                                    </div>
                                </div>
                                <div className="w-full flex justify-center mt-3">
                                    <Button disabled={isSubmitting} type='submit' className='w-[60%] font-semibold cursor-pointer h-10 text-base'>{isSubmitting ? <><Loader2 className='resize-custom animate-spin w-7 h-7' /> Please wait</> : 'Save'}</Button>
                                </div>
                            </form>
                        </Form>
                    </div>
                </div>
            </div>
        </div>
    )
}
