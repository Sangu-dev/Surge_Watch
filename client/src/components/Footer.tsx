import type { FC } from 'react';
import { Activity, ShieldCheck, MapPin, AlertTriangle } from 'lucide-react';

export const Footer: FC = () => {
  return (
    <footer className="bg-slate-950 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-sky-500 text-slate-950 flex items-center justify-center font-bold">
                <Activity className="w-5 h-5 text-slate-950" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-white font-['Plus_Jakarta_Sans']">
                Surge<span className="text-sky-400">Watch</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Bengaluru's emergency hospital discovery and resource availability network. Designed to help patients, bystanders, and emergency responders identify verified nearby emergency facilities during critical moments.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-sky-400" />
              <span>Bengaluru Urban & Rural, Karnataka</span>
            </div>
          </div>

          {/* Emergency Hotlines */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Emergency Hotlines (India)
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg p-2">
                <span className="text-slate-300">National Emergency</span>
                <a href="tel:112" className="text-red-400 font-bold hover:underline">112</a>
              </li>
              <li className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg p-2">
                <span className="text-slate-300">Government Ambulance</span>
                <a href="tel:108" className="text-red-400 font-bold hover:underline">108</a>
              </li>
              <li className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg p-2">
                <span className="text-slate-300">Karnataka Health Helpline</span>
                <a href="tel:104" className="text-sky-400 font-bold hover:underline">104</a>
              </li>
              <li className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg p-2">
                <span className="text-slate-300">Apollo Emergency</span>
                <a href="tel:1066" className="text-amber-400 font-bold hover:underline">1066</a>
              </li>
            </ul>
          </div>

          {/* Platform Navigation */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Platform Links
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <a href="#search-section" className="hover:text-white transition-colors">
                  Find Hospitals by Radius (5-20km)
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-white transition-colors">
                  How SurgeWatch Works
                </a>
              </li>
              <li>
                <a href="#data-freshness" className="hover:text-white transition-colors">
                  Data Freshness & Verification
                </a>
              </li>
              <li>
                <a href="#admin-section" className="hover:text-white transition-colors">
                  Hospital Administrator Access
                </a>
              </li>
              <li>
                <a href="#safety" className="hover:text-white transition-colors">
                  Safety Disclaimer & Guidelines
                </a>
              </li>
            </ul>
          </div>

          {/* Privacy & Governance */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Trust & Transparency
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Location coordinates are held only in memory during emergency discovery sessions and are never permanently stored. We do not collect confidential patient medical data.
            </p>
            <div className="pt-1 flex items-center gap-2 text-xs text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Verified Hospital Admin Authentication</span>
            </div>
          </div>
        </div>

        {/* Safety Disclaimer Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 space-y-1.5">
          <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Emergency Medical Disclaimer</span>
          </div>
          <p className="leading-relaxed">
            SurgeWatch is an informational technology tool that assists with hospital discovery and capacity awareness. It does not replace professional emergency services or guarantee hospital admission or medical outcomes. In any critical life-threatening situation, always contact emergency dispatchers immediately via 112 or 108.
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 SurgeWatch. All rights reserved. Focused on Bengaluru, Karnataka, India.</p>
          <div className="flex items-center gap-4">
            <a href="#safety" className="hover:text-slate-300">Privacy Notice</a>
            <span>•</span>
            <a href="#safety" className="hover:text-slate-300">Terms of Use</a>
            <span>•</span>
            <a href="mailto:support@surgewatch.in" className="hover:text-slate-300">Emergency Desk Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
