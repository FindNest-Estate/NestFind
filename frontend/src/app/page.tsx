'use client';

import './landing.css';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Search, MapPin, Key, ShieldCheck, Clock, 
  ArrowRight, HeartHandshake, CheckCircle2, Instagram, Twitter, Facebook, Building
} from 'lucide-react';
import { browseProperties, PropertyCard as IPropertyCard } from '@/lib/api/public';
import PropertyCard from '@/components/PropertyCard';

export default function LandingPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [properties, setProperties] = useState<IPropertyCard[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchLatestProperties = async () => {
            try {
                const response = await browseProperties({ per_page: 6, sort_by: 'newest' });
                setProperties(response.properties);
            } catch (error) {
                console.error("Failed to fetch properties", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLatestProperties();
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/properties?city=${encodeURIComponent(searchQuery.trim())}`);
        } else {
            router.push('/properties');
        }
    };

    return (
        <div className="landing-page-root">
            {/* Navbar */}
            <nav className="landing-nav">
                <div className="nav-container">
                    <Link href="/" className="nav-logo">
                        <Building size={28} />
                        NestFind
                    </Link>
                    <div className="nav-links">
                        <Link href="/properties">Buy</Link>
                        <Link href="/sell">Sell</Link>
                        <Link href="/agents">Find Agents</Link>
                        <Link href="#how-it-works">How it Works</Link>
                    </div>
                    <div className="nav-auth">
                        <Link href="/login" className="btn-login">Log in</Link>
                        <Link href="/register" className="btn-signup">Sign up</Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-container">
                    <div className="hero-content">
                        <div className="hero-tag">
                            <ShieldCheck size={16} /> Verified Premium Real Estate
                        </div>
                        <h1 className="hero-title">
                            Find the home <br /> that perfectly <br /> fits <span>your life.</span>
                        </h1>
                        <p className="hero-subtitle">
                            NestFind connects you with verified agents and premium properties globally. 
                            Experience transparent transactions and secure processes from start to finish.
                        </p>

                        <form onSubmit={handleSearch} className="search-wrapper">
                            <div className="search-input-group">
                                <MapPin size={24} />
                                <input 
                                    type="text" 
                                    className="search-input" 
                                    placeholder="City, zip, or neighborhood..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <button type="submit" className="search-btn">
                                Search <ArrowRight size={18} />
                            </button>
                        </form>
                    </div>
                    <div className="hero-visual">
                        <img 
                            src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80" 
                            alt="Beautiful modern home" 
                            className="hero-image-main"
                        />
                        <div className="floating-card fc-1">
                            <div className="fc-icon">
                                <Key size={24} />
                            </div>
                            <div className="fc-text">
                                <h4>100% Secure</h4>
                                <p>Encrypted Transactions</p>
                            </div>
                        </div>
                        <div className="floating-card fc-2">
                            <div className="fc-icon">
                                <HeartHandshake size={24} />
                            </div>
                            <div className="fc-text">
                                <h4>500+ Agents</h4>
                                <p>Fully Verified</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="stats-section">
                <div className="stats-grid">
                    <div className="stat-box">
                        <div className="stat-num">2.5k+</div>
                        <div className="stat-label">Verified Listings</div>
                    </div>
                    <div className="stat-box">
                        <div className="stat-num">15k+</div>
                        <div className="stat-label">Happy Families</div>
                    </div>
                    <div className="stat-box">
                        <div className="stat-num">500+</div>
                        <div className="stat-label">Expert Agents</div>
                    </div>
                    <div className="stat-box">
                        <div className="stat-num">99%</div>
                        <div className="stat-label">Success Rate</div>
                    </div>
                </div>
            </section>

            {/* Live Properties Section */}
            <section className="properties-section">
                <div className="section-header">
                    <div className="section-title">
                        <h2>Explore New Listings</h2>
                        <p>Discover the latest premium properties added to our platform</p>
                    </div>
                    <Link href="/properties" className="view-all-link">
                        View all properties <ArrowRight size={16} />
                    </Link>
                </div>
                
                <div className="properties-grid">
                    {isLoading ? (
                        /* Skeleton loader */
                        [...Array(6)].map((_, i) => (
                            <div key={i} className="skeleton-card">
                                <div className="skeleton-img"></div>
                                <div className="skeleton-content">
                                    <div className="skeleton-line"></div>
                                    <div className="skeleton-line short"></div>
                                </div>
                            </div>
                        ))
                    ) : properties.length > 0 ? (
                        properties.map((property) => (
                            <PropertyCard key={property.id} property={property} />
                        ))
                    ) : (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px 0', color: '#717171' }}>
                            No properties available right now. Check back soon!
                        </div>
                    )}
                </div>
            </section>

            {/* Features Section */}
            <section className="features-section" id="how-it-works">
                <div className="section-header" style={{ textAlign: 'center', margin: '0 auto 48px', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="section-title">
                        <h2>Why choose NestFind?</h2>
                        <p>We're reinventing the real estate experience</p>
                    </div>
                </div>
                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon"><CheckCircle2 size={32} /></div>
                        <h3>Verified Excellence</h3>
                        <p>Every single property and agent undergoes a rigorous vetting process to guarantee authenticity and quality.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon"><Clock size={32} /></div>
                        <h3>Streamlined Process</h3>
                        <p>From virtual tours to digital signing, our platform minimizes hassle and accelerates your journey to ownership.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon"><ShieldCheck size={32} /></div>
                        <h3>Complete Security</h3>
                        <p>Bank-grade encryption and full legal compliance safeguard your data and transactions at every single step.</p>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta-section">
                <div className="cta-container">
                    <h2 className="cta-title">Ready to find your dream home?</h2>
                    <p className="cta-subtitle">Join thousands of others who found their perfect match with NestFind's premium real estate platform today.</p>
                    <Link href="/register" className="cta-btn">Get Started Now</Link>
                </div>
            </section>

            {/* Footer Section */}
            <footer className="footer-section">
                <div className="footer-grid">
                    <div className="footer-brand">
                        <Link href="/" className="nav-logo">
                            <Building size={24} />
                            NestFind
                        </Link>
                        <p className="footer-desc">
                            The worlds most trusted real estate marketplace. Verified properties, expert agents, secure transactions.
                        </p>
                    </div>
                    <div>
                        <h4 className="footer-title">Platform</h4>
                        <ul className="footer-links">
                            <li><Link href="/properties">Browse Properties</Link></li>
                            <li><Link href="/agents">Find an Agent</Link></li>
                            <li><Link href="/sell">Sell your Home</Link></li>
                            <li><Link href="/pricing">Pricing Plans</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="footer-title">Company</h4>
                        <ul className="footer-links">
                            <li><Link href="/about">About Us</Link></li>
                            <li><Link href="/careers">Careers</Link></li>
                            <li><Link href="/blog">Blog</Link></li>
                            <li><Link href="/contact">Contact</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="footer-title">Legal</h4>
                        <ul className="footer-links">
                            <li><Link href="/privacy">Privacy Policy</Link></li>
                            <li><Link href="/terms">Terms of Service</Link></li>
                            <li><Link href="/trust">Trust & Safety</Link></li>
                            <li><Link href="/licenses">Licenses</Link></li>
                        </ul>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p>© 2026 NestFind. All rights reserved.</p>
                    <div className="footer-socials">
                        <Link href="#"><Twitter size={20} /></Link>
                        <Link href="#"><Facebook size={20} /></Link>
                        <Link href="#"><Instagram size={20} /></Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
