"use client";
import Navbar from "@/components/navbar/Navbar";
import PropertyCard from "@/components/listing/PropertyCard";
import Container from "@/components/Container";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Loader2, Search, MapPin, Home as HomeIcon, Building2, TrendingUp, Shield, Users, Star, ArrowRight, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Hero Search Component
function HeroSearch() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"buy" | "rent">("buy");
  const [location, setLocation] = useState("");

  const handleSearch = () => {
    const params = new URLSearchParams();
    params.append("listing_type", activeTab === "rent" ? "rent" : "sale");
    if (location) params.append("location", location);
    router.push(`/properties?${params.toString()}`);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex justify-center mb-4">
        <div className="bg-white/10 backdrop-blur-md p-1 rounded-full inline-flex">
          <button
            onClick={() => setActiveTab("buy")}
            className={`px-6 py-2 rounded-full font-medium text-sm transition-all ${activeTab === "buy" ? "bg-white text-gray-900 shadow-sm" : "text-white hover:bg-white/10"
              }`}
          >
            Buy
          </button>
          <button
            onClick={() => setActiveTab("rent")}
            className={`px-6 py-2 rounded-full font-medium text-sm transition-all ${activeTab === "rent" ? "bg-white text-gray-900 shadow-sm" : "text-white hover:bg-white/10"
              }`}
          >
            Rent
          </button>
        </div>
      </div>
      <div className="bg-white rounded-full p-2 shadow-xl flex items-center">
        <div className="flex-1 flex items-center px-4">
          <MapPin size={18} className="text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Enter city, neighborhood, or address..."
            className="w-full py-2 outline-none text-gray-800 text-sm"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <button
          onClick={handleSearch}
          className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-full font-semibold text-sm flex items-center gap-2 transition-colors"
        >
          <Search size={16} />
          Search
        </button>
      </div>
    </div>
  );
}

// Stats Section
const stats = [
  { number: "10K+", label: "Properties Listed" },
  { number: "5K+", label: "Happy Customers" },
  { number: "500+", label: "Expert Agents" },
  { number: "50+", label: "Cities Covered" },
];

// Popular Cities
const cities = [
  { name: "Mumbai", image: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=400&h=300&fit=crop", properties: 1250 },
  { name: "Delhi", image: "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400&h=300&fit=crop", properties: 980 },
  { name: "Bangalore", image: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=400&h=300&fit=crop", properties: 870 },
  { name: "Hyderabad", image: "https://images.unsplash.com/photo-1572953109213-3be8e32a98e5?w=400&h=300&fit=crop", properties: 650 },
];

// Services
const services = [
  { icon: HomeIcon, title: "Buy a Property", description: "Find your dream home from thousands of listings", link: "/properties?listing_type=sale" },
  { icon: Building2, title: "Rent a Property", description: "Discover rental properties that fit your lifestyle", link: "/properties?listing_type=rent" },
  { icon: TrendingUp, title: "Sell Property", description: "List your property and reach millions of buyers", link: "/sell" },
  { icon: Users, title: "Find an Agent", description: "Connect with expert real estate professionals", link: "/find-agent" },
];

// Testimonials
const testimonials = [
  { name: "Priya Sharma", role: "Home Buyer", text: "NestFind made finding my dream home so easy. The agents were professional and helpful throughout.", rating: 5 },
  { name: "Rahul Mehta", role: "Property Seller", text: "Sold my apartment in just 2 weeks! The platform's reach is incredible.", rating: 5 },
  { name: "Anita Desai", role: "Investor", text: "Best platform for real estate investment. Transparent and trustworthy.", rating: 5 },
];

export default function Home() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const data = await api.properties.list({});
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const filtered = data.filter((p: any) => {
          if (p.status === 'available') return true;
          if (p.status === 'sold' && p.sold_at) {
            const soldTime = new Date(p.sold_at);
            return soldTime > twentyFourHoursAgo;
          }
          return false;
        });

        setProperties(filtered.slice(0, 4));
      } catch (error) {
        console.error("Failed to fetch properties", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, []);

  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative h-[90vh] flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          <img
            src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&h=1080&fit=crop"
            alt="Luxury Home"
            className="w-full h-full object-cover opacity-50"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
            Find Your <span className="text-rose-500">Perfect</span> Home
          </h1>
          <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
            Discover the best properties across India. Buy, rent, or sell with confidence.
          </p>
          <HeroSearch />
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-gray-50 border-y border-gray-100">
        <Container>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-gray-900">{stat.number}</div>
                <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Services Section */}
      <section className="py-16">
        <Container>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">What We Offer</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Everything you need to find, buy, sell, or rent properties</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, index) => {
              const Icon = service.icon;
              return (
                <Link href={service.link} key={index} className="group p-6 bg-white border border-gray-100 rounded-2xl hover:shadow-lg hover:border-rose-100 transition-all">
                  <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500 mb-4 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                    <Icon size={24} />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{service.title}</h3>
                  <p className="text-sm text-gray-500">{service.description}</p>
                </Link>
              );
            })}
          </div>
        </Container>
      </section>

      {/* Featured Properties */}
      <section className="py-16 bg-gray-50">
        <Container>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Featured Properties</h2>
              <p className="text-gray-500">Handpicked properties just for you</p>
            </div>
            <Link href="/properties" className="hidden md:flex items-center gap-2 text-rose-500 font-semibold hover:text-rose-600 transition-colors">
              View All <ArrowRight size={18} />
            </Link>
          </div>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="animate-spin text-rose-500" size={40} />
            </div>
          ) : properties.length === 0 ? (
            <div className="text-center text-gray-500 py-16">
              <p>No properties available at the moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {properties.map((property: any) => (
                <PropertyCard key={property.id} data={property} />
              ))}
            </div>
          )}
          <div className="flex justify-center mt-8 md:hidden">
            <Link href="/properties" className="flex items-center gap-2 text-rose-500 font-semibold">
              View All Properties <ArrowRight size={18} />
            </Link>
          </div>
        </Container>
      </section>

      {/* Popular Cities */}
      <section className="py-16">
        <Container>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Explore Popular Cities</h2>
            <p className="text-gray-500">Find properties in India's most sought-after locations</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {cities.map((city, index) => (
              <Link href={`/properties?location=${city.name}`} key={index} className="group relative overflow-hidden rounded-2xl aspect-[4/3]">
                <img src={city.image} alt={city.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-4 text-white">
                  <h3 className="font-bold text-lg">{city.name}</h3>
                  <p className="text-sm text-gray-300">{city.properties}+ Properties</p>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 bg-gray-900 text-white">
        <Container>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Why Choose NestFind?</h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-rose-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shield size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Verified Listings</h3>
                    <p className="text-gray-400 text-sm">All properties are verified by our team for authenticity</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-rose-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Expert Agents</h3>
                    <p className="text-gray-400 text-sm">Connect with certified real estate professionals</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-rose-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Best Deals</h3>
                    <p className="text-gray-400 text-sm">Get the best market prices with transparent pricing</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <img src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&h=400&fit=crop" alt="Happy Family" className="rounded-2xl" />
            </div>
          </div>
        </Container>
      </section>

      {/* Testimonials */}
      <section className="py-16">
        <Container>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">What Our Customers Say</h2>
            <p className="text-gray-500">Trusted by thousands of happy customers</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, index) => (
              <div key={index} className="p-6 bg-white border border-gray-100 rounded-2xl">
                <div className="flex gap-1 mb-4">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} size={16} className="fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-600 mb-4">"{t.text}"</p>
                <div>
                  <div className="font-semibold text-gray-900">{t.name}</div>
                  <div className="text-sm text-gray-500">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-rose-500">
        <Container>
          <div className="text-center text-white">
            <h2 className="text-3xl font-bold mb-4">Ready to Find Your Dream Home?</h2>
            <p className="text-rose-100 mb-8 max-w-xl mx-auto">Join thousands of happy homeowners who found their perfect property with NestFind</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/properties" className="px-8 py-3 bg-white text-rose-600 font-semibold rounded-full hover:bg-gray-100 transition-colors">
                Browse Properties
              </Link>
              <Link href="/find-agent" className="px-8 py-3 border-2 border-white text-white font-semibold rounded-full hover:bg-white/10 transition-colors">
                Find an Agent
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900 text-white">
        <Container>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-lg mb-4">NestFind</h3>
              <p className="text-gray-400 text-sm">Your trusted partner in finding the perfect property.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <div className="space-y-2 text-sm text-gray-400">
                <Link href="/properties" className="block hover:text-white">Properties</Link>
                <Link href="/find-agent" className="block hover:text-white">Find Agent</Link>
                <Link href="/loans" className="block hover:text-white">Home Loans</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <div className="space-y-2 text-sm text-gray-400">
                <Link href="#" className="block hover:text-white">About Us</Link>
                <Link href="#" className="block hover:text-white">Careers</Link>
                <Link href="#" className="block hover:text-white">Contact</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <div className="space-y-2 text-sm text-gray-400">
                <Link href="#" className="block hover:text-white">Privacy Policy</Link>
                <Link href="#" className="block hover:text-white">Terms of Service</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
            <p>© 2024 NestFind. All rights reserved.</p>
          </div>
        </Container>
      </footer>
    </main>
  );
}
