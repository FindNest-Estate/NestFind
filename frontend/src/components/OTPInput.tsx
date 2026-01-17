"use client";

import { useState, useRef, useEffect } from "react";

interface OTPInputProps {
    length?: number;
    onComplete: (otp: string) => void;
    disabled?: boolean;
}

export function OTPInput({ length = 6, onComplete, disabled = false }: OTPInputProps) {
    const [otp, setOtp] = useState<string[]>(new Array(length).fill(""));
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (inputRefs.current[0] && !disabled) {
            inputRefs.current[0].focus();
        }
    }, [disabled]);

    const handleChange = (index: number, value: string) => {
        if (isNaN(Number(value))) return;

        const newOtp = [...otp];
        newOtp[index] = value.substring(value.length - 1);
        setOtp(newOtp);

        const combinedOtp = newOtp.join("");
        if (combinedOtp.length === length) {
            onComplete(combinedOtp);
        }

        // Move to next input if value entered
        if (value && index < length - 1 && inputRefs.current[index + 1]) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !otp[index] && index > 0 && inputRefs.current[index - 1]) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData("text/plain").slice(0, length);
        if (/^\d+$/.test(pastedData)) {
            const newOtp = [...otp];
            pastedData.split("").forEach((char, i) => {
                newOtp[i] = char;
            });
            setOtp(newOtp);
            if (newOtp.join("").length === length) {
                onComplete(newOtp.join(""));
            }
        }
    };

    return (
        <div className="flex gap-2 justify-center">
            {otp.map((value, index) => (
                <input
                    key={index}
                    ref={(ref) => { inputRefs.current[index] = ref }}
                    type="text"
                    value={value}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    onClick={() => inputRefs.current[index]?.select()}
                    disabled={disabled}
                    className="w-10 h-12 text-center text-xl font-bold border rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition disabled:bg-gray-100 disabled:text-gray-400"
                    maxLength={1}
                />
            ))}
        </div>
    );
}
