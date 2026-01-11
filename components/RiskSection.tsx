import React, { useState } from 'react';
import { 
  ShieldAlert, 
  ChevronDown, 
  Search, 
  Target, 
  TrendingDown, 
  Activity, 
  User, 
  Link as LinkIcon,
  AlertCircle,
  ExternalLink,
  DollarSign,
  Flame,
  MousePointer2,
  Info
} from 'lucide-react';
import { ExposureData } from '../types/api';
import { cn } from '../lib/utils';
import Tooltip from './Tooltip';

interface RiskSectionProps {
  data: ExposureData;
}

const RiskSection: React.FC<RiskSectionProps> = ({ data }) => {
  const [openItem, setOpenItem] = useState<string | null>('risks');

  const toggleItem = (id: string) => {
    setOpenItem(openItem === id ? null : id);
  };

  const AccordionItem = ({ 
    id, 
    title, 
    icon: Icon, 
    children, 
    badge,
    tooltipContent
  }: { 
    id: string; 
    title: string; 
    icon: any; 
    children: React.ReactNode; 
    badge?: string;
    tooltipContent?: string;
  }) => {
    const isOpen = openItem === id;
    return (
      <div className="border-b border-border last:border-0">
        <button
          onClick={() => toggleItem(id)}
          className="w-full py-6 flex items-center justify-between text-left group transition-colors hover:bg-white/[0.02] px-4 rounded-xl"
        >
          <div className="flex items-center gap-4">
            <div className={cn(
              "p-2 rounded-lg transition-colors",
              isOpen ? "bg-solana-purple/20 text-solana-purple" : "bg-secondary text-muted-foreground"
            )}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-3">
              <h4 className="font-bold text-lg tracking-tight">
                {title}
              </h4>
              {tooltipContent && (
                <Tooltip content={tooltipContent}>
                  <Info className="w-3.5 h-3.5 text-muted-foreground" />
                </Tooltip>
              )}
              {badge && (
                <span className="px-2 py-0.5 rounded-full bg-solana-purple/10 text-solana-purple text-[10px] font-black uppercase tracking-widest border border-solana-purple/20">
                  {badge}
                </span>
              )}
            </div>
          </div>
          <ChevronDown className={cn(
            "w-5 h-5 text-muted-foreground transition-transform duration-300",
            isOpen && "rotate-180"
          )} />
        </button>
        <div className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isOpen ? "max-h-[1000px] opacity-100 pb-8 px-4" : "max-h-0 opacity-0"
        )}>
          {children}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-secondary/10 border border-border rounded-[2.5rem] overflow-hidden">
      <AccordionItem 
        id="identity" 
        title="Identity Leakage" 
        icon={User}
        badge="Dox Check"
        tooltipContent="Explains why having a public address tied to your social profile is dangerous: it enables targetted harassment and social engineering."
      >
        <div className="space-y-6">
          <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl font-medium">
            If your address was ever posted publicly on social media or linked to a name service (SNS), 
            automated bots have already indexed it. <span className="text-foreground">Selective privacy like encrypt.trade allows you to trade without linking back to these public IDs.</span>
          </p>
          <div className="flex flex-wrap gap-4">
            <a 
              href={data.links.xSearch} 
              target="_blank" 
              className="flex items-center gap-2 px-4 py-2 bg-black border border-white/10 rounded-xl hover:border-solana-purple/50 transition-all text-xs font-bold"
            >
              <Search className="w-4 h-4 text-solana-purple" />
              Check X History
            </a>
            <a 
              href={data.links.arkham} 
              target="_blank" 
              className="flex items-center gap-2 px-4 py-2 bg-black border border-white/10 rounded-xl hover:border-solana-purple/50 transition-all text-xs font-bold"
            >
              <Target className="w-4 h-4 text-solana-purple" />
              Arkham Intelligence
            </a>
          </div>
        </div>
      </AccordionItem>

      <AccordionItem 
        id="financial" 
        title="Financial Profile" 
        icon={DollarSign}
        badge="Portfolio"
        tooltipContent="Shows how much of your wealth is visible. High visibility increases the risk of being targeted by exploiters."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Estimated Value</span>
              <span className="text-solana-green font-mono font-black">${data.netWorthUsd.toLocaleString()}</span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-solana-green w-[65%]" />
            </div>
            <p className="text-[10px] text-muted-foreground italic">Visibility of high-value assets makes you a target for spear-phishing.</p>
          </div>

          <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Memecoin Degeneracy</span>
              <span className="text-orange-400 font-mono font-black">{data.memecoinTrades} TRADES</span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-orange-400 w-[80%]" />
            </div>
            <p className="text-[10px] text-muted-foreground italic">High interaction with unverified tokens suggests behavioral risks.</p>
          </div>
        </div>
      </AccordionItem>

      <AccordionItem 
        id="clustering" 
        title="Clustering & Network" 
        icon={LinkIcon}
        badge="Connections"
        tooltipContent="Analyzes the 'crowd' you belong to. Clustering helps attackers guess your physical location or real-world identity via common touchpoints."
      >
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            You have interacted with <span className="text-foreground font-bold">{data.clustering.interactedCount}</span> unique addresses. 
            Behavioral clustering links you to these top nodes:
          </p>
          <div className="grid gap-2">
            {data.clustering.topAddresses.map((addr, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5 group hover:border-solana-purple/30 transition-all cursor-default">
                <span className="font-mono text-[11px] text-muted-foreground group-hover:text-foreground transition-colors truncate max-w-[200px] md:max-w-none">
                  {addr}
                </span>
                <MousePointer2 className="w-3.5 h-3.5 text-solana-purple opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
          <div className="mt-4 p-4 rounded-xl bg-solana-green/5 border border-solana-green/10 text-[11px] text-solana-green font-bold flex gap-2">
             <ShieldAlert className="w-4 h-4 flex-shrink-0" />
             Encrypting swaps on encrypt.trade breaks these cluster chains, preventing you from being grouped with compromised entities.
          </div>
        </div>
      </AccordionItem>

      <AccordionItem 
        id="risks" 
        title="Key Risks Detected" 
        icon={ShieldAlert}
        badge={`${data.risks.length} Critical`}
        tooltipContent="Specific vulnerabilities identified by our AI scanner. These require immediate attention."
      >
        <ul className="space-y-4">
          {data.risks.map((risk, idx) => (
            <li key={idx} className="flex gap-4 p-4 rounded-2xl bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 transition-colors">
              <div className="mt-1">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-sm font-medium leading-relaxed">{risk}</p>
            </li>
          ))}
        </ul>
      </AccordionItem>

      <AccordionItem 
        id="activity" 
        title="Recent Activity" 
        icon={Activity}
        badge="Footprints"
        tooltipContent="Your most recent public footprints. Each entry represents data leaked to MEV bots and trackers."
      >
        <div className="rounded-2xl border border-white/5 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5">
              <tr>
                <th className="px-4 py-3 font-black text-[10px] uppercase tracking-widest text-muted-foreground">Type</th>
                <th className="px-4 py-3 font-black text-[10px] uppercase tracking-widest text-muted-foreground">Description</th>
                <th className="px-4 py-3 font-black text-[10px] uppercase tracking-widest text-muted-foreground text-right">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.recentTxSummary.map((tx, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-md bg-secondary text-[10px] font-bold uppercase">{tx.type}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-muted-foreground">{tx.description}</td>
                  <td className={cn(
                    "px-4 py-3 font-mono font-black text-right",
                    tx.amountUsd > 0 ? "text-solana-green" : "text-red-400"
                  )}>
                    ${Math.abs(tx.amountUsd).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AccordionItem>
    </div>
  );
};

export default RiskSection;