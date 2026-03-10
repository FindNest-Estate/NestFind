"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Loader2, Upload, CheckCircle, AlertTriangle } from "lucide-react";
import { recordPaymentWithProof } from "@/lib/api/finance";
import { useToast } from "@/components/ui/Toast";
import { PAYMENT_METHODS } from "@/lib/types/finance";

interface BookingProofUploadProps {
    dealId: string;
    entryType?: string;
    onUploadSuccess: (entryId: string) => void;
}

export function BookingProofUpload({
    dealId,
    entryType = "BOOKING_RECEIVED",
    onUploadSuccess,
}: BookingProofUploadProps) {
    const [proofUrl, setProofUrl] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("");
    const [bankReference, setBankReference] = useState("");
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [notes, setNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showToast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!proofUrl.trim() || !paymentMethod || !amount) return;

        setIsSubmitting(true);
        try {
            const result = await recordPaymentWithProof(dealId, {
                entry_type: entryType,
                amount: parseFloat(amount),
                description: description || `${entryType.replace(/_/g, " ").toLowerCase()} via ${paymentMethod}`,
                proof_url: proofUrl.trim(),
                payment_method: paymentMethod,
                bank_reference: bankReference || undefined,
                notes: notes || undefined,
            });
            if (result.success) {
                showToast("Payment recorded successfully", "success");
                onUploadSuccess(result.entry_id);
                // Reset form
                setProofUrl("");
                setPaymentMethod("");
                setBankReference("");
                setAmount("");
                setDescription("");
                setNotes("");
            } else {
                showToast("Recording failed. Please try again.", "error");
            }
        } catch (error) {
            showToast("An unexpected error occurred.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Record Payment</CardTitle>
                <CardDescription>
                    Submit payment details with proof. The counterparty will be asked to confirm.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Amount */}
                    <div className="space-y-1.5">
                        <Label htmlFor="payment-amount">Amount (₹)</Label>
                        <Input
                            id="payment-amount"
                            type="number"
                            min="1"
                            step="0.01"
                            placeholder="e.g. 500000"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            disabled={isSubmitting}
                            required
                        />
                    </div>

                    {/* Payment Method */}
                    <div className="space-y-1.5">
                        <Label htmlFor="payment-method">Payment Method</Label>
                        <select
                            id="payment-method"
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            disabled={isSubmitting}
                            required
                            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                        >
                            <option value="">Select method</option>
                            {PAYMENT_METHODS.map((m) => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Bank Reference */}
                    <div className="space-y-1.5">
                        <Label htmlFor="bank-ref">Bank Reference / UTR (Optional)</Label>
                        <Input
                            id="bank-ref"
                            placeholder="e.g. UTR1234567890"
                            value={bankReference}
                            onChange={(e) => setBankReference(e.target.value)}
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Proof URL */}
                    <div className="space-y-1.5">
                        <Label htmlFor="proof-url">Proof URL (Receipt / Screenshot)</Label>
                        <Input
                            id="proof-url"
                            placeholder="https://example.com/receipt.pdf"
                            value={proofUrl}
                            onChange={(e) => setProofUrl(e.target.value)}
                            disabled={isSubmitting}
                            required
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                        <Label htmlFor="payment-desc">Description (Optional)</Label>
                        <Input
                            id="payment-desc"
                            placeholder="e.g. Token amount transfer to seller"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Disclaimer */}
                    <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-amber-800">
                            By submitting, you are declaring that this payment has occurred.
                            NestFind does not verify or hold funds. The counterparty will be asked to confirm.
                        </p>
                    </div>

                    <Button type="submit" disabled={isSubmitting || !proofUrl || !paymentMethod || !amount} className="w-full">
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                <Upload className="mr-2 h-4 w-4" />
                                Record Payment
                            </>
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
