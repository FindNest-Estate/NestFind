'use client';

import './landing.css';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Search, MapPin, Key, ShieldCheck, Clock, 
  ArrowRight, HeartHandshake, CheckCircle2, Instagram, Twitter, Facebook, Building,
  Star, Award, Scale, Briefcase, Menu, X, Shield, Lock, Users
} from 'lucide-react';
import { browseProperties, PropertyCard as IPropertyCard } from '@/lib/api/public';
import PropertyCard from '@/components/PropertyCard';

export default function LandingPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [properties, setProperties] = useState<IPropertyCard[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const fetchLatestProperties = async () => {
            try {
                // Fetch the 4 newest properties for the landing page showcase
                const response = await browseProperties({ per_page: 4, sort_by: 'newest' });
                setProperties(response.properties);
            } catch (error) {
                console.error("Failed to fetch properties", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLatestProperties();
    }, []);

    // Prevent scrolling when mobile menu is open
    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isMobileMenuOpen]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/properties?city=${encodeURIComponent(searchQuery.trim())}`);
        } else {
            router.push('/properties');
        }
    };

    const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
        setIsMobileMenuOpen(false);
        if (targetId.startsWith('#')) {
            e.preventDefault();
            const element = document.querySelector(targetId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        }
    };

    return (
        <div className="landing-root">
            {/* 1. NAVBAR SECTION */}
            <nav className="landing-nav">
                <div className="landing-nav-container">
                    <Link href="/" className="landing-nav-logo" onClick={() => setIsMobileMenuOpen(false)}>
                        NestFind
                    </Link>
                    
                    {/* Desktop Links */}
                    <div className="landing-nav-links">
                        <Link href="/properties?type=sale">Buy</Link>
                        <Link href="/properties?type=rent">Rent</Link>
                        <Link href="/sell">Sell</Link>
                        <Link href="/agents">Find Agents</Link>
                        <Link href="/lawyers">Lawyers</Link>
                        <Link href="/consultants">Consultants</Link>
                    </div>
                    
                    {/* Desktop Auth */}
                    <div className="landing-nav-auth">
                        <Link href="/login" className="landing-btn-login">Log in</Link>
                        <Link href="/register" className="landing-btn-signup">Sign up</Link>
                    </div>

                    {/* Mobile Toggle */}
                    <button 
                        className="landing-mobile-toggle"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        aria-label="Toggle menu"
                    >
                        {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
                    </button>
                    
                    {/* Mobile Menu Dropdown */}
                    {isMobileMenuOpen && (
                        <div className="landing-mobile-menu">
                            <Link href="/properties?type=sale" onClick={(e) => handleNavClick(e, '/properties?type=sale')}>Buy</Link>
                            <Link href="/properties?type=rent" onClick={(e) => handleNavClick(e, '/properties?type=rent')}>Rent</Link>
                            <Link href="/sell" onClick={(e) => handleNavClick(e, '/sell')}>Sell Property</Link>
                            <Link href="/agents" onClick={(e) => handleNavClick(e, '/agents')}>Find Agents</Link>
                            <Link href="/lawyers" onClick={() => setIsMobileMenuOpen(false)}>Lawyers</Link>
                            <Link href="/consultants" onClick={(e) => handleNavClick(e, '/consultants')}>Consultants</Link>
                            <div style={{ height: '1px', background: 'var(--gray-200, #E5E7EB)', margin: '8px 0' }} />
                            <Link href="/login" onClick={(e) => handleNavClick(e, '/login')}>Log in</Link>
                            <Link href="/register" className="landing-btn-signup" onClick={(e) => handleNavClick(e, '/register')}>Sign up Free</Link>
                        </div>
                    )}
                </div>
            </nav>

            {/* 2. HERO SECTION */}
            <section className="landing-hero">
                <div className="landing-hero-container">
                    <div className="landing-hero-content">
                        <div className="landing-hero-tag">
                            <ShieldCheck size={16} /> Verified Premium Real Estate
                        </div>
                        <h1 className="landing-hero-title">
                            Find the home <br /> that perfectly <br /> fits <span className="landing-text-gradient">your life.</span>
                        </h1>
                        <p className="landing-hero-subtitle">
                            NestFind connects you with verified agents and premium properties globally. 
                            Experience transparent transactions and secure processes from start to finish.
                        </p>

                        <form onSubmit={handleSearch} className="landing-search">
                            <div className="landing-search-input-group">
                                <MapPin size={24} />
                                <input 
                                    type="text" 
                                    className="landing-search-input" 
                                    placeholder="City, zip, or neighborhood..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <button type="submit" className="landing-search-btn">
                                Search <ArrowRight size={18} />
                            </button>
                        </form>
                    </div>
                    
                    <div className="landing-hero-visual">
                        <img 
                            src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80" 
                            alt="Beautiful modern home" 
                            className="landing-hero-img"
                        />
                        <div className="landing-hero-card landing-hero-card-1">
                            <div className="landing-hero-card-icon">
                                <Key size={24} />
                            </div>
                            <div className="landing-hero-card-text">
                                <h4>100% Secure</h4>
                                <p>Encrypted Transactions</p>
                            </div>
                        </div>
                        <div className="landing-hero-card landing-hero-card-2">
                            <div className="landing-hero-card-icon">
                                <HeartHandshake size={24} />
                            </div>
                            <div className="landing-hero-card-text">
                                <h4>500+ Agents</h4>
                                <p>Fully Verified</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. STATS SECTION */}
            <section className="landing-stats">
                <div className="landing-stats-bg"></div>
                <div className="landing-stats-grid">
                    <div className="landing-stat-item">
                        <div className="landing-stat-num">2.5k+</div>
                        <div className="landing-stat-label">Verified Listings</div>
                    </div>
                    <div className="landing-stat-item">
                        <div className="landing-stat-num">15k+</div>
                        <div className="landing-stat-label">Happy Families</div>
                    </div>
                    <div className="landing-stat-item">
                        <div className="landing-stat-num">500+</div>
                        <div className="landing-stat-label">Expert Agents</div>
                    </div>
                    <div className="landing-stat-item">
                        <div className="landing-stat-num landing-text-gradient">99%</div>
                        <div className="landing-stat-label">Success Rate</div>
                    </div>
                </div>
            </section>

            {/* 4. EXPLORE LISTINGS SECTION */}
            <section className="landing-explore">
                <div className="landing-explore-bg"></div>
                <div className="landing-section-container">
                    <div className="landing-section-header">
                        <div className="landing-section-title-wrap">
                            <div className="landing-badge brand">
                                <Star size={14} className="fill-current" /> Handpicked Collection
                            </div>
                            <h2 className="landing-h2">Explore New Listings</h2>
                            <p className="landing-p">
                                Discover the latest premium properties matching our high standards. Exclusive estates and modern apartments tailored for you.
                            </p>
                        </div>
                        <Link href="/properties" className="landing-btn-outline">
                            View all properties <ArrowRight size={18} />
                        </Link>
                    </div>
                    
                    <div className="landing-grid-4">
                        {isLoading ? (
                            /* Skeletons */
                            [...Array(4)].map((_, i) => (
                                <div key={i} className="landing-skeleton">
                                    <div className="landing-skel-img" />
                                    <div className="landing-skel-body">
                                        <div className="landing-skel-line w-1-3" />
                                        <div className="landing-skel-line w-3-4" />
                                        <div className="landing-skel-line w-1-2" />
                                    </div>
                                </div>
                            ))
                        ) : properties.length > 0 ? (
                            /* Properties */
                            properties.map((property) => (
                                <div className="landing-card-hover" key={property.id}>
                                    <PropertyCard property={property} />
                                </div>
                            ))
                        ) : (
                            /* Empty State */
                            <div className="landing-empty">
                                <div className="landing-empty-icon">
                                    <Building size={40} />
                                </div>
                                <h3>No properties found</h3>
                                <p>We couldn't find any premium properties in the database right now.</p>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* 5. VERIFIED AGENTS SECTION (NEW) */}
            <section className="landing-agents">
                <div className="landing-section-container">
                    <div className="landing-section-header" style={{ alignItems: 'center', textAlign: 'center', flexDirection: 'column' }}>
                        <div className="landing-section-title-wrap" style={{ margin: '0 auto' }}>
                            <div className="landing-badge blue">
                                <Award size={14} className="fill-current" /> Top Performers
                            </div>
                            <h2 className="landing-h2">Verified Agents</h2>
                            <p className="landing-p" style={{ margin: '0 auto' }}>
                                Work with the industry's finest. Our verified agents maintain a 99% client satisfaction rate and are local market experts.
                            </p>
                        </div>
                    </div>

                    <div className="landing-grid-3">
                        {/* Agent 1 */}
                        <div className="landing-agent-card">
                            <div className="landing-agent-img-wrap">
                                <img src="https://images.unsplash.com/photo-1556157382-97eda2d62296?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Agent" className="landing-agent-img" />
                                <div className="landing-agent-rating">
                                    <Star size={16} className="fill-current text-[#FBBF24]" color="#FBBF24" /> 4.9
                                </div>
                            </div>
                            <div className="landing-agent-info">
                                <h3 className="landing-agent-name">Marcus Thorne</h3>
                                <p className="landing-agent-title">Senior Luxury Specialist</p>
                                <div className="landing-agent-footer">
                                    <span className="landing-agent-deals">42 Deals Closed</span>
                                    <button className="landing-agent-btn"><ArrowRight size={20} /></button>
                                </div>
                            </div>
                        </div>
                        
                        {/* Agent 2 */}
                        <div className="landing-agent-card">
                            <div className="landing-agent-img-wrap">
                                <img src="https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Agent" className="landing-agent-img" />
                                <div className="landing-agent-rating">
                                    <Star size={16} className="fill-current text-[#FBBF24]" color="#FBBF24" /> 5.0
                                </div>
                            </div>
                            <div className="landing-agent-info">
                                <h3 className="landing-agent-name">Elena Rodriguez</h3>
                                <p className="landing-agent-title">Commercial Director</p>
                                <div className="landing-agent-footer">
                                    <span className="landing-agent-deals">89 Deals Closed</span>
                                    <button className="landing-agent-btn"><ArrowRight size={20} /></button>
                                </div>
                            </div>
                        </div>

                        {/* Agent 3 */}
                        <div className="landing-agent-card">
                            <div className="landing-agent-img-wrap">
                                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Agent" className="landing-agent-img" />
                                <div className="landing-agent-rating">
                                    <Star size={16} className="fill-current text-[#FBBF24]" color="#FBBF24" /> 4.8
                                </div>
                            </div>
                            <div className="landing-agent-info">
                                <h3 className="landing-agent-name">David Chen</h3>
                                <p className="landing-agent-title">Residential Expert</p>
                                <div className="landing-agent-footer">
                                    <span className="landing-agent-deals">124 Deals Closed</span>
                                    <button className="landing-agent-btn"><ArrowRight size={20} /></button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 6. LEGAL SUPPORT SECTION (NEW) */}
            <section className="landing-legal" id="legal">
                <div className="landing-section-container">
                    <div className="landing-legal-grid">
                        <div className="landing-legal-content">
                            <div className="landing-badge emerald">
                                <Scale size={14} className="fill-current" /> Legal Support
                            </div>
                            <h2 className="landing-h2">
                                Lawyers as well. <br/> <span style={{ color: 'var(--gray-400)', fontSize: '0.85em' }}>Secure your future.</span>
                            </h2>
                            <p className="landing-p" style={{ marginBottom: '32px' }}>
                                Navigating real estate contracts can be complex. NestFind provides in-house top-tier legal representatives and escrow officers to ensure every detail of your transaction is legally sound and fully protected.
                            </p>
                            
                            <ul className="landing-checklist">
                                <li className="landing-check-item">
                                    <div className="landing-check-icon"><CheckCircle2 size={20} /></div>
                                    Title Search & Verification
                                </li>
                                <li className="landing-check-item">
                                    <div className="landing-check-icon"><CheckCircle2 size={20} /></div>
                                    Smart Escrow Management
                                </li>
                                <li className="landing-check-item">
                                    <div className="landing-check-icon"><CheckCircle2 size={20} /></div>
                                    Contract Review & Drafting
                                </li>
                            </ul>

                            <button className="landing-btn-secondary">
                                Meet our Legal Team <Briefcase size={20} />
                            </button>
                        </div>
                        
                        <div className="landing-legal-images">
                            <img src="https://images.unsplash.com/photo-1575505586569-646b2ca898fc?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Law Firm Details" className="landing-legal-img" />
                            <img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Legal Team Meeting" className="landing-legal-img" />
                        </div>
                    </div>
                </div>
            </section>

            {/* 7. FEATURES / HOW IT WORKS SECTION (NEW) */}
            <section className="landing-features" id="how-it-works">
                <div className="landing-section-container">
                    <div className="landing-features-header">
                        <h2 className="landing-h2">How NestFind Works</h2>
                        <p className="landing-p">We've simplified the real estate journey to bring you peace of mind from start to finish.</p>
                    </div>
                    
                    <div className="landing-grid-3">
                        <div className="landing-feature-card">
                            <div className="landing-feature-icon">
                                <Search size={32} />
                            </div>
                            <h3>Search & Discover</h3>
                            <p>Browse thousands of premium verified listings with high-quality media, authentic reviews, and transparent pricing histories.</p>
                        </div>
                        <div className="landing-feature-card">
                            <div className="landing-feature-icon">
                                <Users size={32} />
                            </div>
                            <h3>Verified Professionals</h3>
                            <p>Connect instantly with top-rated local agents and legal counsel who have passed our rigorous background and performance checks.</p>
                        </div>
                        <div className="landing-feature-card">
                            <div className="landing-feature-icon">
                                <Shield size={32} />
                            </div>
                            <h3>Secure Transactions</h3>
                            <p>Close with confidence using our integrated smart escrow system, automated title searches, and encrypted digital signatures.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 8. CTA SECTION */}
            <section className="landing-cta">
                <div className="landing-cta-bg"></div>
                <div className="landing-cta-container">
                    <h2>
                        Ready to find your <br/> <span className="landing-text-gradient">dream home?</span>
                    </h2>
                    <p>
                        Join thousands of others who found their perfect match with NestFind's premium real estate platform today.
                    </p>
                    <Link href="/register" className="landing-btn-primary">
                        Get Started Now <ArrowRight size={20} />
                    </Link>
                </div>
            </section>

            {/* 9. FOOTER SECTION */}
            <footer className="landing-footer">
                <div className="landing-footer-grid">
                    <div className="landing-footer-brand">
                        <Link href="/" className="landing-nav-logo">
                            NestFind
                        </Link>
                        <p>
                            The world's most trusted real estate marketplace. Verified properties, expert luxury agents, and completely secure transactions.
                        </p>
                    </div>
                    
                    <div>
                        <h4 className="landing-footer-title">Platform</h4>
                        <ul className="landing-footer-links">
                            <li><Link href="/properties">Browse Properties</Link></li>
                            <li><Link href="/agents">Find an Agent</Link></li>
                            <li><Link href="/sell">Sell your Home</Link></li>
                            <li><Link href="/pricing">Pricing Plans</Link></li>
                        </ul>
                    </div>
                    
                    <div>
                        <h4 className="landing-footer-title">Company</h4>
                        <ul className="landing-footer-links">
                            <li><Link href="/about">About Us</Link></li>
                            <li><Link href="/careers">Careers</Link></li>
                            <li><Link href="/blog">Blog</Link></li>
                            <li><Link href="/contact">Contact</Link></li>
                        </ul>
                    </div>
                    
                    <div>
                        <h4 className="landing-footer-title">Legal & Connect</h4>
                        <ul className="landing-footer-links">
                            <li><Link href="/privacy">Privacy Policy</Link></li>
                            <li><Link href="/terms">Terms of Service</Link></li>
                            <li><Link href="/trust">Trust & Safety</Link></li>
                        </ul>
                    </div>
                </div>
                
                <div className="landing-footer-bottom">
                    <p className="landing-footer-copy">© 2026 NestFind. All rights reserved.</p>
                    <div className="landing-socials">
                        <Link href="#" className="landing-social-btn" aria-label="Twitter"><Twitter size={20} /></Link>
                        <Link href="#" className="landing-social-btn" aria-label="Facebook"><Facebook size={20} /></Link>
                        <Link href="#" className="landing-social-btn" aria-label="Instagram"><Instagram size={20} /></Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
