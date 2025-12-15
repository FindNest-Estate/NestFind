"use client";

import { useState } from "react";
import { Sparkles, Calculator, PenTool, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

export default function AgentAITools() {
    const [activeTool, setActiveTool] = useState<'price' | 'description'>('price');

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                        <Sparkles className="text-purple-600" />
                        AI Tools
                    </h1>
                    <p className="text-gray-500 mt-1">Power up your workflow with AI-driven insights and content generation</p>
                </div>
            </div>

            {/* Tool Selection Tabs */}
            <div className="flex p-1 bg-gray-100/80 backdrop-blur-sm rounded-xl w-fit">
                <button
                    onClick={() => setActiveTool('price')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTool === 'price'
                        ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                        }`}
                >
                    <Calculator size={16} className={activeTool === 'price' ? "text-purple-600" : ""} />
                    Price Estimator
                </button>
                <button
                    onClick={() => setActiveTool('description')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTool === 'description'
                        ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                        }`}
                >
                    <PenTool size={16} className={activeTool === 'description' ? "text-purple-600" : ""} />
                    Description Generator
                </button>
            </div>

            {/* Tool Content */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden min-h-[500px]">
                {activeTool === 'price' ? <PriceEstimator /> : <DescriptionGenerator />}
            </div>
        </div>
    );
}

function PriceEstimator() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        location: "",
        sqft: "",
        bhk: "",
        type: "apartment"
    });

    const handleEstimate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await api.ai.estimatePrice({
                location: formData.location,
                sqft: parseInt(formData.sqft),
                bhk: parseInt(formData.bhk),
                property_type: formData.type
            });
            setResult(response.estimate);
        } catch (error) {
            console.error("Failed to estimate price", error);
            toast.error("Failed to generate estimate. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Property Valuation</h2>
                    <p className="text-gray-500 text-sm">Get an instant estimated price range for any property based on current market trends.</p>
                </div>

                <form onSubmit={handleEstimate} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Location / Area</label>
                        <input
                            type="text"
                            required
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none"
                            placeholder="e.g. Indiranagar, Bangalore"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Area (Sq.ft)</label>
                            <input
                                type="number"
                                required
                                value={formData.sqft}
                                onChange={(e) => setFormData({ ...formData, sqft: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none"
                                placeholder="1200"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Configuration (BHK)</label>
                            <input
                                type="number"
                                required
                                value={formData.bhk}
                                onChange={(e) => setFormData({ ...formData, bhk: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none"
                                placeholder="2"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Property Type</label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none"
                        >
                            <option value="apartment">Apartment</option>
                            <option value="villa">Villa</option>
                            <option value="plot">Plot</option>
                            <option value="commercial">Commercial</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 px-8 py-3.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/20 disabled:opacity-70 font-medium mt-4"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <Calculator size={20} />}
                        Estimate Price
                    </button>
                </form>
            </div>

            <div className="bg-gray-50 rounded-2xl p-8 flex items-center justify-center relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#a855f7_1px,transparent_1px)] [background-size:16px_16px]"></div>

                {result ? (
                    <div className="relative w-full bg-white rounded-2xl shadow-xl p-6 space-y-6 animate-in fade-in zoom-in duration-300 max-h-[400px] overflow-y-auto">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">AI Market Analysis</p>
                            <div className="prose prose-purple prose-sm max-w-none">
                                <p className="whitespace-pre-wrap text-gray-800 leading-relaxed">{result}</p>
                            </div>
                        </div>

                        <div className="bg-purple-50 rounded-xl p-4 text-xs text-purple-700 leading-relaxed">
                            <Sparkles size={14} className="inline mr-1" />
                            This estimate is generated by AI (Mistral 7B) based on general market knowledge. Always verify with local experts.
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-gray-400 max-w-xs relative">
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 text-purple-200">
                            <Calculator size={32} />
                        </div>
                        <p>Enter property details to generate an AI-powered price estimation.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function DescriptionGenerator() {
    const [loading, setLoading] = useState(false);
    const [generated, setGenerated] = useState("");
    const [copied, setCopied] = useState(false);
    const [features, setFeatures] = useState("");
    const [tone, setTone] = useState("professional");
    const [propertyType, setPropertyType] = useState("Apartment");

    const handleGenerate = async () => {
        if (!features.trim()) {
            toast.error("Please enter some features");
            return;
        }
        setLoading(true);
        try {
            const response = await api.ai.generateDescription({
                features,
                tone,
                property_type: propertyType
            });
            setGenerated(response.description);
        } catch (error) {
            console.error("Failed to generate description", error);
            toast.error("Failed to generate description. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generated);
        setCopied(true);
        toast.success("Copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Description Generator</h2>
                    <p className="text-gray-500 text-sm">Create compelling property descriptions in seconds using AI.</p>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Property Type</label>
                        <input
                            type="text"
                            value={propertyType}
                            onChange={(e) => setPropertyType(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none"
                            placeholder="e.g. Luxury Apartment, Villa"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Key Features</label>
                        <textarea
                            value={features}
                            onChange={(e) => setFeatures(e.target.value)}
                            rows={5}
                            className="w-full px-4 py-3 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none resize-none"
                            placeholder="e.g. 3 BHK, Sea View, Italian Marble Flooring, Modular Kitchen, Swimming Pool, Gym..."
                        />
                        <p className="text-xs text-gray-400 text-right">Separate features with commas</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Tone of Voice</label>
                        <div className="grid grid-cols-3 gap-3">
                            {['Professional', 'Luxury', 'Cozy'].map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setTone(t.toLowerCase())}
                                    className={`py-2 px-4 rounded-lg text-sm font-medium border transition-all ${tone === t.toLowerCase()
                                        ? 'bg-purple-50 border-purple-200 text-purple-700'
                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 px-8 py-3.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all shadow-lg shadow-gray-900/20 disabled:opacity-70 font-medium mt-4"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                        Generate Description
                    </button>
                </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-8 flex flex-col relative overflow-hidden min-h-[400px]">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#111827_1px,transparent_1px)] [background-size:16px_16px]"></div>

                {generated ? (
                    <div className="relative flex-1 flex flex-col bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Generated Content</span>
                            <button
                                onClick={handleCopy}
                                className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition-colors"
                                title="Copy to clipboard"
                            >
                                {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                            </button>
                        </div>
                        <div className="p-6 flex-1 overflow-y-auto max-h-[400px]">
                            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap font-serif text-lg">
                                {generated}
                            </p>
                        </div>
                        <div className="p-3 bg-gray-50 text-xs text-center text-gray-400 border-t border-gray-100">
                            Generated by Llama 3.1 8B
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 relative">
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 text-gray-300">
                            <PenTool size={32} />
                        </div>
                        <p>Your AI-generated description will appear here.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
