"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Shield, Wallet, TrendingUp, Bot, MessageCircle } from "lucide-react";

const tabs = [
  { href: "/overview", label: "Overview", icon: Home },
  { href: "/notifications", label: "Security", icon: Shield },
  { href: "/budget", label: "Budget", icon: Wallet },
  { href: "/analysis", label: "Analysis", icon: TrendingUp },
  { href: "/ai-budget", label: "AI Budget", icon: Bot },
  { href: "/ask-ai", label: "Ask AI", icon: MessageCircle },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 backdrop-blur-xl bg-white/80 border-t border-gray-200/50 shadow-2xl">
      <div className="mx-auto flex max-w-md md:max-w-lg justify-center">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-all duration-300 ${
                active ? "text-teal-600" : "text-gray-500 hover:text-teal-500"
              }`}
            >
              {active && (
                <div className="absolute -top-0.5 left-1/2 h-1 w-12 -translate-x-1/2 rounded-full bg-gradient-to-r from-teal-500 to-cyan-600" />
              )}
              <div className={`rounded-xl p-1.5 transition-all ${
                active ? "bg-teal-50 scale-110" : "hover:bg-gray-100"
              }`}>
                <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
              </div>
              <span className={active ? "font-semibold" : ""}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
