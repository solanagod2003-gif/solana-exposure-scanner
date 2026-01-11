import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Shield, Zap, Lock, AlertCircle, Sparkles, TrendingUp, Fingerprint } from 'lucide-react';

const Landing: React.FC = () => {
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const EXAMPLE_WALLETS = [
    { name: 'Ansem', address: '8k9f...M5uH', actual: '8k9fM5uH8P8P8P8P8P8P8P8P8P8P8P8P8P8P8P8P' },
    { name: 'Toly', address: '7m8v...Q4pR', actual: '7m8vQ4pR7P7P7P7P7P7P7P7P7P7P7P7P7P7P7P7P' },
    { name: 'Whale', address: 'vW1A...9zK2', actual: 'vW1A9zK2vW1A9zK2vW1A9zK2vW1A9zK2vW1A9zK2' }
  ];

  const validateAddress = (val: string) => {
    if (!val) return 'Address is required';
    // Basic Solana address format check (Base58, 32-44 chars)
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    if (!base58Regex.test(val)) return 'Invalid Solana address format';
    return '';
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAddress = address.trim();
    const err = validateAddress(cleanAddress);
    if (err) {
      setError(err);
      return;
    }
    navigate(`/scan/${cleanAddress}`);
  };

  return (
    <div className="flex flex-col items-center text-center py-10 md:py-24 animate-in fade-in slide-in-from-top-8 duration-1000 relative">
      {/* Background Decor */}
      <div className="absolute top-0 -left-48 w-96 h-96 bg-solana-purple/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 -right-48 w-96 h-96 bg-solana-green/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="mb-10 px-6 py-2 rounded-full border border-solana-purple/20 bg-solana-purple/5 text-solana-purple text-[10px] font-black uppercase tracking-[0.5em] flex items-center gap-3">
        <Sparkles className="w-3 h-3" />
        Advanced Privacy Intelligence
      </div>
      
      <h2 className="text-6xl md:text-9xl font-black mb-10 tracking-tighter leading-[0.85] uppercase">
        Reveal your <br />
        <span className="solana-text-gradient">On-chain dossier</span>
      </h2>
      
      <p className="text-lg md:text-2xl text-muted-foreground max-w-3xl mb-16 font-semibold leading-relaxed">
        The ledger is permanent. We analyze your behavior, clusters, and social links to see how much of your <span className="text-foreground">real identity</span> is currently exposed.
      </p>

      <form 
        onSubmit={handleSearch}
        className="w-full max-w-4xl space-y-6 mb-12"
      >
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-solana-green to-solana-purple rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
          <div className="relative flex flex-col md:flex-row gap-4 p-2 bg-secondary/50 backdrop-blur-xl border border-white/10 rounded-[2rem]">
            <div className="relative flex-grow">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground w-6 h-6" />
              <input
                type="text"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setError('');
                }}
                placeholder="Paste Solana address (Base58)..."
                className="w-full bg-transparent h-16 pl-16 pr-6 rounded-2xl focus:outline-none transition-all text-xl font-mono placeholder:text-muted-foreground/30"
              />
            </div>
            <button
              type="submit"
              className="bg-solana-purple hover:bg-solana-purple/90 h-16 px-12 rounded-2xl font-black text-xl shadow-2xl shadow-solana-purple/20 transition-all active:scale-95 whitespace-nowrap uppercase tracking-widest text-white"
            >
              Analyze Wallet
            </button>
          </div>
        </div>
        {error && (
          <div className="flex items-center justify-center gap-2 text-red-500 text-sm font-black uppercase tracking-widest animate-in slide-in-from-top-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </form>

      <div className="flex flex-wrap justify-center items-center gap-6 mb-24">
        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-50">Degen Examples:</span>
        {EXAMPLE_WALLETS.map((w) => (
          <button
            key={w.name}
            type="button"
            onClick={() => {
              setAddress(w.actual);
              setError('');
            }}
            className="px-5 py-3 bg-secondary/80 border border-white/5 rounded-2xl text-xs font-black uppercase tracking-widest hover:border-solana-purple/50 transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
          >
            <div className="w-2 h-2 rounded-full bg-solana-purple" />
            {w.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 text-left w-full max-w-7xl">
        <div className="p-10 rounded-[3rem] bg-secondary/20 border border-white/5 hover:bg-secondary/30 transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Fingerprint className="w-32 h-32 text-solana-green" />
          </div>
          <Shield className="w-12 h-12 text-solana-green mb-8 group-hover:scale-110 transition-transform" />
          <h3 className="text-2xl font-black mb-4 tracking-tighter uppercase">Identity Leakage</h3>
          <p className="text-muted-foreground font-medium leading-relaxed text-sm">Automated detection of SNS names (.sol), public social handles, and exchange-associated clusters.</p>
        </div>
        <div className="p-10 rounded-[3rem] bg-secondary/20 border border-white/5 hover:bg-secondary/30 transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Zap className="w-32 h-32 text-solana-purple" />
          </div>
          <Zap className="w-12 h-12 text-solana-purple mb-8 group-hover:scale-110 transition-transform" />
          <h3 className="text-2xl font-black mb-4 tracking-tighter uppercase">Pattern Pulse</h3>
          <p className="text-muted-foreground font-medium leading-relaxed text-sm">Real-time behavior analysis identifies high-frequency trading signatures unique to your footprint.</p>
        </div>
        <div className="p-10 rounded-[3rem] bg-secondary/20 border border-white/5 hover:bg-secondary/30 transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Lock className="w-32 h-32 text-solana-green" />
          </div>
          <Lock className="w-12 h-12 text-solana-green mb-8 group-hover:scale-110 transition-transform" />
          <h3 className="text-2xl font-black mb-4 tracking-tighter uppercase">Stealth Advice</h3>
          <p className="text-muted-foreground font-medium leading-relaxed text-sm">Actionable intelligence on using selective privacy tools like encrypt.trade to decouple your assets.</p>
        </div>
      </div>
    </div>
  );
};

export default Landing;