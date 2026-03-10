'use client';

import { useState } from 'react';
import { activateSeller } from '@/lib/authApi';
import { useAuth } from '@/lib/auth';
import { UserRole } from '@/lib/auth/types';

/**
 * "Become a Seller" CTA button.
 * 
 * Shows when user has BUYER role but NOT SELLER.
 * On click: calls activate-seller API, refreshes auth context.
 */
export default function BecomeSellerButton() {
    const { user, login, token } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Don't render if user already has SELLER role or is not a buyer
    if (!user || user.roles?.includes(UserRole.SELLER)) {
        return null;
    }

    const handleActivate = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await activateSeller();
            if (result.success) {
                // Refresh the page to pick up new roles
                window.location.reload();
            } else {
                setError('Failed to activate seller role');
            }
        } catch (err: any) {
            setError(err?.message || 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="become-seller-btn"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
                }}
            >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Become a Seller
            </button>

            {/* Confirmation Modal */}
            {showModal && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setShowModal(false);
                    }}
                >
                    <div
                        style={{
                            background: 'white',
                            borderRadius: '16px',
                            padding: '32px',
                            maxWidth: '420px',
                            width: '90%',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                        }}
                    >
                        <h3 style={{ margin: '0 0 12px', fontSize: '20px', fontWeight: 700, color: '#1a1a2e' }}>
                            Become a Seller
                        </h3>
                        <p style={{ margin: '0 0 8px', color: '#64748b', fontSize: '14px', lineHeight: '1.6' }}>
                            Activating seller capabilities allows you to:
                        </p>
                        <ul style={{ margin: '0 0 20px', paddingLeft: '20px', color: '#475569', fontSize: '14px', lineHeight: '1.8' }}>
                            <li>List properties for sale</li>
                            <li>Receive and manage offers from buyers</li>
                            <li>Hire agents and manage visits</li>
                            <li>Complete property transactions</li>
                        </ul>
                        <p style={{ margin: '0 0 24px', color: '#94a3b8', fontSize: '13px' }}>
                            You'll keep your buyer capabilities too. You can switch roles anytime.
                        </p>

                        {error && (
                            <div style={{
                                background: '#fef2f2',
                                color: '#dc2626',
                                padding: '10px 14px',
                                borderRadius: '8px',
                                fontSize: '13px',
                                marginBottom: '16px',
                            }}>
                                {error}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowModal(false)}
                                disabled={isLoading}
                                style={{
                                    padding: '10px 20px',
                                    background: '#f1f5f9',
                                    color: '#475569',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleActivate}
                                disabled={isLoading}
                                style={{
                                    padding: '10px 24px',
                                    background: isLoading
                                        ? '#94a3b8'
                                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: isLoading ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {isLoading ? 'Activating...' : 'Activate Seller Role'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
