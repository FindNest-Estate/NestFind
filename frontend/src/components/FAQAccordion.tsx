'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FAQItemProps {
    question: string;
    answer: string;
}

function FAQItem({ question, answer }: FAQItemProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border-b border-gray-200 last:border-0">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between py-6 text-left hover:text-emerald-600 transition-colors group"
                aria-expanded={isOpen}
            >
                <span className="text-lg font-semibold text-gray-900 group-hover:text-emerald-600 pr-8">
                    {question}
                </span>
                <ChevronDown
                    className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-emerald-600' : ''
                        }`}
                />
            </button>
            <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 pb-6' : 'max-h-0'
                    }`}
            >
                <p className="text-gray-600 leading-relaxed">{answer}</p>
            </div>
        </div>
    );
}

interface FAQAccordionProps {
    items: FAQItemProps[];
}

export default function FAQAccordion({ items }: FAQAccordionProps) {
    return (
        <div className="divide-y divide-gray-200 bg-white rounded-2xl border border-gray-100">
            {items.map((item, index) => (
                <FAQItem key={index} question={item.question} answer={item.answer} />
            ))}
        </div>
    );
}
