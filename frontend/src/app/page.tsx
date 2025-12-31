import './landing.css';
import Navbar from '@/components/Navbar';

export default function LandingPage() {
    return (
        <div className="landing-page">
            <Navbar />

            {/* 2. HERO SECTION */}
            <section className="hero">
                <div className="hero-container">
                    <h1>Find Your Perfect Home with Trusted Agents</h1>
                    <p>
                        NestFind connects you with verified real estate agents who prioritize your trust.
                        Transparent transactions, secure processes, and expert guidance every step of the way.
                    </p>
                    <a href="#featured-properties" className="hero-cta">
                        Browse Properties
                    </a>
                </div>
            </section>

            {/* TRUST STATISTICS BAR */}
            <section className="trust-stats">
                <div className="stats-container">
                    <div className="stat-item">
                        <div className="stat-number">2,500+</div>
                        <div className="stat-label">Verified Properties</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-number">15,000+</div>
                        <div className="stat-label">Successful Visits</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-number">500+</div>
                        <div className="stat-label">Verified Agents</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-number">1,200+</div>
                        <div className="stat-label">Completed Transactions</div>
                    </div>
                </div>
            </section>

            {/* 3. HOW NESTFIND WORKS */}
            <section className="how-it-works" id="how-it-works">
                <div className="section-container">
                    <h2 className="section-title">How NestFind Works</h2>
                    <div className="steps-grid">
                        <div className="step">
                            <div className="step-number">1</div>
                            <h3>Browse Listings</h3>
                            <p>
                                Explore verified properties from our network of trusted agents.
                                All listings are verified for accuracy and authenticity.
                            </p>
                        </div>
                        <div className="step">
                            <div className="step-number">2</div>
                            <h3>Connect with Agents</h3>
                            <p>
                                Reach out to verified agents with proven track records.
                                View their credentials, reviews, and specialties.
                            </p>
                        </div>
                        <div className="step">
                            <div className="step-number">3</div>
                            <h3>Secure Transactions</h3>
                            <p>
                                All communications and transactions are monitored for security.
                                Your information is protected at every stage.
                            </p>
                        </div>
                        <div className="step">
                            <div className="step-number">4</div>
                            <h3>Close with Confidence</h3>
                            <p>
                                Complete your purchase or sale with full transparency.
                                We ensure compliance with all legal requirements.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. TRUST SIGNALS */}
            <section className="trust-signals">
                <div className="section-container">
                    <h2 className="section-title">Why Trust NestFind?</h2>
                    <div className="trust-grid">
                        <div className="trust-card">
                            <div className="trust-icon">
                                <svg viewBox="0 0 24 24">
                                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3>Verified Agents</h3>
                            <p>
                                Every agent on our platform undergoes rigorous background checks
                                and credential verification. Only licensed professionals are approved.
                            </p>
                        </div>
                        <div className="trust-card">
                            <div className="trust-icon">
                                <svg viewBox="0 0 24 24">
                                    <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <h3>Secure Transactions</h3>
                            <p>
                                Bank-grade encryption protects all your communications and financial
                                information. We never share your data without explicit consent.
                            </p>
                        </div>
                        <div className="trust-card">
                            <div className="trust-icon">
                                <svg viewBox="0 0 24 24">
                                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3>Full Compliance</h3>
                            <p>
                                All transactions comply with local and federal real estate regulations.
                                Complete audit trails ensure transparency and legal protection.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 5. FEATURED PROPERTIES */}
            <section className="featured-properties" id="featured-properties">
                <div className="section-container">
                    <h2 className="section-title">Featured Properties</h2>
                    <p className="properties-disclaimer">Sample listings for demonstration only</p>
                    <div className="properties-grid">
                        <div className="property-card">
                            <div className="property-image-container">
                                <span className="status-badge status-active">ACTIVE</span>
                                <div className="property-image"></div>
                            </div>
                            <div className="property-info">
                                <div className="verification-badge">
                                    <svg viewBox="0 0 24 24" fill="none">
                                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#16A34A" strokeWidth="2" />
                                    </svg>
                                    <span>Verified by Agent</span>
                                </div>
                                <div className="property-price">$750,000</div>
                                <h3 className="property-title">Modern Family Home</h3>
                                <p className="property-location">San Francisco, CA</p>
                                <div className="property-details">
                                    <span>🛏️ 4 beds</span>
                                    <span>🛁 3 baths</span>
                                    <span>📐 2,400 sq ft</span>
                                </div>
                            </div>
                        </div>

                        <div className="property-card">
                            <div className="property-image-container">
                                <span className="status-badge status-reserved">RESERVED</span>
                                <div className="property-image"></div>
                            </div>
                            <div className="property-info">
                                <div className="verification-badge">
                                    <svg viewBox="0 0 24 24" fill="none">
                                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#16A34A" strokeWidth="2" />
                                    </svg>
                                    <span>Verified by Agent</span>
                                </div>
                                <div className="property-price">$525,000</div>
                                <h3 className="property-title">Downtown Luxury Condo</h3>
                                <p className="property-location">Austin, TX</p>
                                <div className="property-details">
                                    <span>🛏️ 2 beds</span>
                                    <span>🛁 2 baths</span>
                                    <span>📐 1,200 sq ft</span>
                                </div>
                            </div>
                        </div>

                        <div className="property-card">
                            <div className="property-image-container">
                                <span className="status-badge status-active">ACTIVE</span>
                                <div className="property-image"></div>
                            </div>
                            <div className="property-info">
                                <div className="verification-badge">
                                    <svg viewBox="0 0 24 24" fill="none">
                                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#16A34A" strokeWidth="2" />
                                    </svg>
                                    <span>Verified by Agent</span>
                                </div>
                                <div className="property-price">$920,000</div>
                                <h3 className="property-title">Waterfront Estate</h3>
                                <p className="property-location">Seattle, WA</p>
                                <div className="property-details">
                                    <span>🛏️ 5 beds</span>
                                    <span>🛁 4 baths</span>
                                    <span>📐 3,600 sq ft</span>
                                </div>
                            </div>
                        </div>

                        <div className="property-card">
                            <div className="property-image-container">
                                <span className="status-badge status-active">ACTIVE</span>
                                <div className="property-image"></div>
                            </div>
                            <div className="property-info">
                                <div className="verification-badge">
                                    <svg viewBox="0 0 24 24" fill="none">
                                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#16A34A" strokeWidth="2" />
                                    </svg>
                                    <span>Verified by Agent</span>
                                </div>
                                <div className="property-price">$425,000</div>
                                <h3 className="property-title">Suburban Retreat</h3>
                                <p className="property-location">Portland, OR</p>
                                <div className="property-details">
                                    <span>🛏️ 3 beds</span>
                                    <span>🛁 2 baths</span>
                                    <span>📐 1,800 sq ft</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* TRUST FOOTER BANNER */}
            <section className="trust-footer-banner">
                <div className="trust-banner-content">
                    <div className="trust-banner-item">
                        <strong>🔒 Secure Transactions</strong>
                        <span>Bank-grade encryption on all communications</span>
                    </div>
                    <div className="trust-banner-item">
                        <strong>✓ Fully Compliant</strong>
                        <span>Licensed & regulated real estate marketplace</span>
                    </div>
                    <div className="trust-banner-item">
                        <strong>🛡️ Trust Verified</strong>
                        <span>Every agent undergoes rigorous background checks</span>
                    </div>
                </div>
            </section>

            {/* 6. FOOTER */}
            <footer className="footer">
                <div className="footer-container">
                    <div className="footer-grid">
                        <div className="footer-section">
                            <h4>Compliance</h4>
                            <ul>
                                <li><a href="#privacy">Privacy Policy</a></li>
                                <li><a href="#terms">Terms of Service</a></li>
                                <li><a href="#fair-housing">Fair Housing Act</a></li>
                                <li><a href="#licenses">State Licenses</a></li>
                            </ul>
                        </div>
                        <div className="footer-section">
                            <h4>Security</h4>
                            <ul>
                                <li><a href="#data-protection">Data Protection</a></li>
                                <li><a href="#encryption">Encryption Standards</a></li>
                                <li><a href="#secure-payments">Secure Payments</a></li>
                                <li><a href="#audit-logs">Audit & Transparency</a></li>
                            </ul>
                        </div>
                        <div className="footer-section">
                            <h4>Contact</h4>
                            <ul>
                                <li><a href="mailto:support@nestfind.com">support@nestfind.com</a></li>
                                <li><a href="tel:1-800-NESTFIND">1-800-NESTFIND</a></li>
                                <li><a href="#help">Help Center</a></li>
                                <li><a href="#agents">For Agents</a></li>
                            </ul>
                        </div>
                        <div className="footer-section">
                            <h4>Company</h4>
                            <ul>
                                <li><a href="#about">About NestFind</a></li>
                                <li><a href="#careers">Careers</a></li>
                                <li><a href="#press">Press</a></li>
                                <li><a href="#investors">Investors</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="footer-bottom">
                        © 2025 NestFind. All rights reserved. Licensed real estate marketplace.
                    </div>
                </div>
            </footer>
        </div >
    );
}
