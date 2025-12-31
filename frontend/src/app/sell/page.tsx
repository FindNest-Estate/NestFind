import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import FAQAccordion from '@/components/FAQAccordion';
import {
    ArrowRight,
    ShieldCheck,
    CheckCircle,
    TrendingUp,
    Clock,
    FileCheck,
    Home,
    Users,
    Star,
    Building2,
    MapPin,
    BadgeCheck,
    FileText,
    Camera,
    MessageCircle
} from 'lucide-react';

/**
 * STATIC MARKETING PAGE - /sell
 * 
 * Purpose: Education, Trust Building & Conversion.
 * Constraints:
 * - NO API calls.
 * - NO user data fetching.
 * - Clear funnel with dual CTAs for new/existing sellers.
 */

export default function SellPage() {
    const faqItems = [
        {
            question: "Are there any fees to list my property?",
            answer: "No upfront fees. NestFind only charges a small commission when your property successfully sells. Our verified agents work on your behalf to get the best price, and we only succeed when you do."
        },
        {
            question: "Is my listing exclusive to NestFind?",
            answer: "No. You maintain full control of your listing. While we recommend exclusivity for the best results with our verified agents, you're free to list on other platforms simultaneously."
        },
        {
            question: "Who sets the price for my property?",
            answer: "You do. Your assigned agent will provide market analysis and pricing recommendations based on recent sales, but the final listing price is always your decision."
        },
        {
            question: "How long until my listing goes live?",
            answer: "Typically 2-4 days. Once you submit your draft, an agent is assigned within 24 hours. After verification (document check + site visit), your listing goes live to qualified buyers."
        },
        {
            question: "What if my property doesn't sell?",
            answer: "Your listing remains active until sold. Your agent will continuously optimize pricing and marketing strategy. You can pause or delist anytime from your dashboard with no penalties."
        },
        {
            question: "Can I edit my listing after it's live?",
            answer: "Yes. You can update photos, description, and price anytime from your dashboard. Major changes (like property details) require agent re-verification to maintain listing quality."
        },
        {
            question: "How do I contact support?",
            answer: "Your assigned agent is your primary contact. For platform issues, use the chat widget (bottom-right) or email support@nestfind.com. We respond within 4 business hours."
        },
        {
            question: "What documents do I need to list my property?",
            answer: "Basic documents: property title deed, tax receipts, and recent photos. Your agent will guide you through any additional requirements based on your location and property type during verification."
        }
    ];

    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            {/* Hero Section - Enhanced with Dual CTAs */}
            <section className="relative pt-24 pb-20 px-6 sm:px-12 bg-gradient-to-b from-emerald-50 via-white to-white overflow-hidden">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        {/* Left: Text + CTAs */}
                        <div className="text-center lg:text-left">
                            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight leading-tight">
                                Sell your home with{' '}
                                <span className="text-emerald-600">confidence</span>.
                            </h1>
                            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                                NestFind connects you with <strong>verified</strong> top-tier agents who handle
                                everything from verification to closing. No hassle, just results.
                            </p>

                            {/* Value Bullets */}
                            <ul className="space-y-3 mb-10 text-left inline-block">
                                <li className="flex items-start gap-3">
                                    <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                                    <span className="text-gray-700"><strong>Faster sales</strong> — verified buyers only, no time-wasters</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                                    <span className="text-gray-700"><strong>Higher trust</strong> — every listing is agent-verified</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                                    <span className="text-gray-700"><strong>No fake leads</strong> — real data, real buyers, zero speculation</span>
                                </li>
                            </ul>

                            {/* Dual CTAs */}
                            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                                <Link
                                    href="/sell/create"
                                    className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-emerald-600 rounded-full hover:bg-emerald-700 transition-all transform hover:scale-105 shadow-lg shadow-emerald-200"
                                >
                                    List My Property
                                    <ArrowRight className="ml-2 w-5 h-5" />
                                </Link>
                                <Link
                                    href="/sell/dashboard"
                                    className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-emerald-600 bg-white border-2 border-emerald-600 rounded-full hover:bg-emerald-50 transition-all"
                                >
                                    Go to Dashboard
                                </Link>
                            </div>
                        </div>

                        {/* Right: Illustration/Visual */}
                        <div className="hidden lg:flex items-center justify-center">
                            <div className="relative w-full max-w-md">
                                {/* Decorative placeholder - replace with actual illustration */}
                                <div className="aspect-square bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-3xl shadow-2xl flex items-center justify-center border-8 border-white">
                                    <Home className="w-32 h-32 text-emerald-600 opacity-30" />
                                </div>
                                {/* Floating badge */}
                                <div className="absolute -top-4 -right-4 bg-white px-6 py-3 rounded-full shadow-xl border border-gray-100 flex items-center gap-2">
                                    <BadgeCheck className="w-5 h-5 text-emerald-600" />
                                    <span className="font-bold text-gray-900">Verified</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Trust & Proof Section - Stats */}
            <section className="py-16 bg-white border-y border-gray-100">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        <div className="space-y-2">
                            <div className="text-4xl font-bold text-emerald-600">2,000+</div>
                            <div className="text-gray-600 font-medium">Verified Listings</div>
                        </div>
                        <div className="space-y-2">
                            <div className="text-4xl font-bold text-emerald-600">95%</div>
                            <div className="text-gray-600 font-medium">Verified Buyers</div>
                        </div>
                        <div className="space-y-2">
                            <div className="text-4xl font-bold text-emerald-600">10+</div>
                            <div className="text-gray-600 font-medium">Cities</div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-center gap-1 text-4xl font-bold text-emerald-600">
                                <span>4.8</span>
                                <Star className="w-8 h-8 fill-emerald-600" />
                            </div>
                            <div className="text-gray-600 font-medium">Average Rating</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonials */}
            <section className="py-20 bg-gray-50">
                <div className="max-w-7xl mx-auto px-6">
                    <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
                        Trusted by sellers across India
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Testimonial 1 */}
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex items-center gap-1 mb-4">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="w-5 h-5 fill-emerald-600 text-emerald-600" />
                                ))}
                            </div>
                            <p className="text-gray-700 mb-6 leading-relaxed">
                                "Sold in 18 days! The agent verification process gave me confidence,
                                and every inquiry was from serious buyers. Best decision I made."
                            </p>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                                    <span className="text-emerald-600 font-bold text-lg">RP</span>
                                </div>
                                <div>
                                    <div className="font-semibold text-gray-900">Rajesh Patel</div>
                                    <div className="text-sm text-gray-500">Mumbai, Maharashtra</div>
                                </div>
                            </div>
                        </div>

                        {/* Testimonial 2 */}
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex items-center gap-1 mb-4">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="w-5 h-5 fill-emerald-600 text-emerald-600" />
                                ))}
                            </div>
                            <p className="text-gray-700 mb-6 leading-relaxed">
                                "No spam calls, no fake offers. My agent handled everything professionally.
                                Got ₹15L more than my initial estimate!"
                            </p>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                                    <span className="text-emerald-600 font-bold text-lg">SK</span>
                                </div>
                                <div>
                                    <div className="font-semibold text-gray-900">Sunita Krishnan</div>
                                    <div className="text-sm text-gray-500">Bangalore, Karnataka</div>
                                </div>
                            </div>
                        </div>

                        {/* Testimonial 3 */}
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex items-center gap-1 mb-4">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="w-5 h-5 fill-emerald-600 text-emerald-600" />
                                ))}
                            </div>
                            <p className="text-gray-700 mb-6 leading-relaxed">
                                "The dashboard made tracking everything so easy. Drafting took 20 minutes,
                                and my listing was live in 3 days. Highly recommend!"
                            </p>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                                    <span className="text-emerald-600 font-bold text-lg">AM</span>
                                </div>
                                <div>
                                    <div className="font-semibold text-gray-900">Arjun Mehta</div>
                                    <div className="text-sm text-gray-500">Pune, Maharashtra</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works - Enhanced with Details */}
            <section className="py-24 px-6 bg-white">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4">
                        How selling on NestFind works
                    </h2>
                    <p className="text-center text-gray-600 mb-16 max-w-2xl mx-auto">
                        A simple, transparent 3-step process designed to get your property verified and in front of serious buyers quickly.
                    </p>

                    <div className="relative">
                        {/* Connector line - hidden on mobile, visible on md+ */}
                        <div className="hidden md:block absolute left-6 top-6 bottom-6 w-0.5 bg-gradient-to-b from-emerald-600 via-emerald-400 to-emerald-300" style={{ height: 'calc(100% - 3rem)' }}></div>

                        <div className="space-y-0">
                            {/* Step 1 */}
                            <div className="relative flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start pb-16">
                                <div className="relative flex-shrink-0 w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xl font-bold shadow-lg z-10">
                                    1
                                </div>
                                <div className="flex-grow bg-white p-8 rounded-2xl shadow-sm border border-gray-100 w-full md:w-auto text-center md:text-left transition-all hover:shadow-md hover:-translate-y-0.5">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="p-3 bg-emerald-50 rounded-xl">
                                            <FileText className="w-6 h-6 text-emerald-600" />
                                        </div>
                                        <div className="flex-grow">
                                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Create Your Draft</h3>
                                            <div className="flex items-center gap-2 text-sm text-emerald-600 font-semibold mb-3">
                                                <Clock className="w-4 h-4" />
                                                <span>20-30 minutes</span>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-gray-600 leading-relaxed mb-4">
                                        Fill in your property details, upload photos, and set your asking price.
                                        Your draft stays private until you're ready to submit for verification.
                                    </p>
                                    <div className="bg-gray-50 p-4 rounded-xl">
                                        <div className="font-semibold text-gray-900 mb-2 text-sm">You'll need:</div>
                                        <ul className="text-sm text-gray-600 space-y-1">
                                            <li className="flex items-start gap-2">
                                                <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                                                <span>Property address and basic details</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                                                <span>5-10 clear photos (interior & exterior)</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                                                <span>Preferred asking price (can be adjusted later)</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div className="relative flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start pb-16">
                                <div className="relative flex-shrink-0 w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xl font-bold shadow-lg z-10">
                                    2
                                </div>
                                <div className="flex-grow bg-white p-8 rounded-2xl shadow-sm border border-gray-100 w-full md:w-auto text-center md:text-left transition-all hover:shadow-md hover:-translate-y-0.5">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="p-3 bg-emerald-50 rounded-xl">
                                            <BadgeCheck className="w-6 h-6 text-emerald-600" />
                                        </div>
                                        <div className="flex-grow">
                                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Agent Verification</h3>
                                            <div className="flex items-center gap-2 text-sm text-emerald-600 font-semibold mb-3">
                                                <Clock className="w-4 h-4" />
                                                <span>2-3 days</span>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-gray-600 leading-relaxed mb-4">
                                        A verified agent is assigned within 24 hours. They'll review documents,
                                        conduct a site visit, and confirm all details match your listing.
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="bg-gray-50 p-4 rounded-xl">
                                            <div className="font-semibold text-gray-900 mb-2 text-sm">You provide:</div>
                                            <ul className="text-sm text-gray-600 space-y-1">
                                                <li>• Title deed</li>
                                                <li>• Tax receipts</li>
                                                <li>• Site access</li>
                                            </ul>
                                        </div>
                                        <div className="bg-emerald-50 p-4 rounded-xl">
                                            <div className="font-semibold text-gray-900 mb-2 text-sm">Agent verifies:</div>
                                            <ul className="text-sm text-gray-600 space-y-1">
                                                <li>• Document authenticity</li>
                                                <li>• Property condition</li>
                                                <li>• Pricing accuracy</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div className="relative flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start">
                                <div className="relative flex-shrink-0 w-12 h-12 rounded-full bg-emerald-400 text-white flex items-center justify-center text-xl font-bold shadow-lg z-10">
                                    3
                                </div>
                                <div className="flex-grow bg-white p-8 rounded-2xl shadow-sm border border-gray-100 w-full md:w-auto text-center md:text-left transition-all hover:shadow-md hover:-translate-y-0.5">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="p-3 bg-emerald-50 rounded-xl">
                                            <TrendingUp className="w-6 h-6 text-emerald-600" />
                                        </div>
                                        <div className="flex-grow">
                                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Go Live</h3>
                                            <div className="flex items-center gap-2 text-sm text-emerald-600 font-semibold mb-3">
                                                <Clock className="w-4 h-4" />
                                                <span>Instant activation</span>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-gray-600 leading-relaxed mb-4">
                                        Once verified, your listing becomes visible to qualified, verified buyers.
                                        Track views, inquiries, and manage your listing from your dashboard.
                                    </p>
                                    <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-4 rounded-xl border border-emerald-200">
                                        <div className="font-semibold text-gray-900 mb-2 text-sm">What happens next:</div>
                                        <ul className="text-sm text-gray-600 space-y-1">
                                            <li className="flex items-start gap-2">
                                                <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                                                <span>Listing appears in search results for verified buyers</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                                                <span>Agent markets your property to their network</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                                                <span>You receive real-time notifications for all inquiries</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Verification Explainer */}
            <section className="py-24 px-6 bg-gray-50">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                            How verification works
                        </h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">
                            We verify both agents and properties to ensure every transaction on NestFind is trustworthy and transparent.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                        {/* Agent Verification */}
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-4 bg-emerald-50 rounded-xl">
                                    <Users className="w-8 h-8 text-emerald-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900">Agent Verification</h3>
                            </div>
                            <ul className="space-y-4">
                                <li className="flex items-start gap-3">
                                    <ShieldCheck className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <div className="font-semibold text-gray-900 mb-1">RERA Registration Check</div>
                                        <div className="text-gray-600 text-sm">Valid Real Estate Regulatory Authority registration verified</div>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <FileCheck className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <div className="font-semibold text-gray-900 mb-1">Background Screening</div>
                                        <div className="text-gray-600 text-sm">Professional history and client references verified</div>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <Star className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <div className="font-semibold text-gray-900 mb-1">Performance Track Record</div>
                                        <div className="text-gray-600 text-sm">Minimum 3 years experience with proven sales record</div>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <BadgeCheck className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <div className="font-semibold text-gray-900 mb-1">Continuous Monitoring</div>
                                        <div className="text-gray-600 text-sm">Regular audits and client feedback reviews</div>
                                    </div>
                                </li>
                            </ul>
                        </div>

                        {/* Property Verification */}
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-4 bg-emerald-50 rounded-xl">
                                    <Building2 className="w-8 h-8 text-emerald-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900">Property Verification</h3>
                            </div>
                            <ul className="space-y-4">
                                <li className="flex items-start gap-3">
                                    <FileText className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <div className="font-semibold text-gray-900 mb-1">Document Authentication</div>
                                        <div className="text-gray-600 text-sm">Title deed, tax receipts, and NOCs verified with authorities</div>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <MapPin className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <div className="font-semibold text-gray-900 mb-1">Physical Site Visit</div>
                                        <div className="text-gray-600 text-sm">Agent inspects property to confirm condition and details</div>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <Camera className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <div className="font-semibold text-gray-900 mb-1">Photo & Detail Accuracy</div>
                                        <div className="text-gray-600 text-sm">Listed photos and dimensions match actual property</div>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <TrendingUp className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <div className="font-semibold text-gray-900 mb-1">Market Price Validation</div>
                                        <div className="text-gray-600 text-sm">Asking price compared against recent comparable sales</div>
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Privacy Note */}
                    <div className="bg-white p-6 rounded-xl border border-emerald-200 max-w-3xl mx-auto">
                        <div className="flex items-start gap-3">
                            <ShieldCheck className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <div className="font-semibold text-gray-900 mb-1">Your data is secure</div>
                                <div className="text-gray-600 text-sm">
                                    All documents are encrypted and stored securely. Personal information is never shared with
                                    buyers without your explicit consent. Agents sign NDAs before accessing sensitive property details.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-24 px-6 bg-white">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4">
                        Frequently asked questions
                    </h2>
                    <p className="text-center text-gray-600 mb-12">
                        Everything you need to know about selling on NestFind
                    </p>

                    <FAQAccordion items={faqItems} />

                    {/* Support CTA */}
                    <div className="mt-12 text-center">
                        <p className="text-gray-600 mb-4">Still have questions?</p>
                        <Link
                            href="/sell/dashboard"
                            className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-semibold transition-colors"
                        >
                            <MessageCircle className="w-5 h-5" />
                            <span>Chat with our team</span>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-20 bg-gray-900 text-white text-center px-6">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to list your property?</h2>
                    <p className="text-gray-400 mb-10 text-lg max-w-2xl mx-auto">
                        Join thousands of sellers who've successfully sold their homes with verified agents and zero hassle.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/sell/create"
                            className="inline-flex items-center justify-center px-10 py-4 text-base font-bold text-gray-900 bg-white rounded-full hover:bg-gray-100 transition-all transform hover:scale-105"
                        >
                            Get Started Now
                            <ArrowRight className="ml-2 w-5 h-5" />
                        </Link>
                        <Link
                            href="/sell/dashboard"
                            className="inline-flex items-center justify-center px-10 py-4 text-base font-bold text-white border-2 border-white rounded-full hover:bg-white hover:text-gray-900 transition-all"
                        >
                            View Dashboard
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}


