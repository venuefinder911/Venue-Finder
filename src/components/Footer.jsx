import { Link } from "react-router-dom";
import logo from "../assets/vfl.jpeg";
import { MapPin, Phone, Mail } from "lucide-react";

const Footer = () => (
  <footer className="bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

      {/* Brand */}
      <div>
        <Link to="/" className="flex items-center gap-3 mb-4">
          <img src={logo} className="w-10 h-10 rounded-xl" alt="logo" />
          <span className="text-xl font-extrabold text-gray-900 dark:text-white">
            Venue<span className="text-sky-500">Finder</span>
          </span>
        </Link>
        <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400 max-w-xs">
          Discover and book the perfect venue for your special events. We've got you covered.
        </p>
        <div className="flex gap-3 mt-5">
          {/* Facebook */}
          <a href="#" className="text-gray-400 dark:text-gray-500 hover:text-sky-500 dark:hover:text-sky-400 transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
          </a>
          {/* Instagram */}
          <a href="#" className="text-gray-400 dark:text-gray-500 hover:text-sky-500 dark:hover:text-sky-400 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
          </a>
          {/* Twitter / X */}
          <a href="#" className="text-gray-400 dark:text-gray-500 hover:text-sky-500 dark:hover:text-sky-400 transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <h4 className="text-gray-900 dark:text-white font-bold mb-4">Quick Links</h4>
        <ul className="space-y-2.5">
          {[
            { label: "Check Venues", to: "/dashboard/customer" },
            { label: "List Your Venue", to: "/dashboard/owner" },
            { label: "Contact Us", to: "#" },
          ].map((link) => (
            <li key={link.label}>
              <Link
                to={link.to}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-sky-500 dark:hover:text-sky-400 transition-colors"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Event Types */}
      <div>
        <h4 className="text-gray-900 dark:text-white font-bold mb-4">Event Types</h4>
        <ul className="space-y-2.5">
          {["Wedding", "Birthday", "Corporate", "Engagement", "Conference", "Party"].map((type) => (
            <li key={type}>
              <span className="text-sm text-gray-500 dark:text-gray-400">{type}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Contact */}
      <div>
        <h4 className="text-gray-900 dark:text-white font-bold mb-4">Contact Us</h4>
        <ul className="space-y-3">
          <li className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Mail className="w-4 h-4 text-sky-500 flex-shrink-0" />
            venuefinder911@gmail.com
          </li>
          <li className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Phone className="w-4 h-4 text-sky-500 flex-shrink-0" />
            +92 300 1231233
          </li>
          <li className="flex items-start gap-2 text-sm text-gray-500 dark:text-gray-400">
            <MapPin className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" />
            University of Gujrat, Punjab, Pakistan
          </li>
        </ul>
      </div>
    </div>

    {/* Bottom bar */}
    <div className="border-t border-gray-100 dark:border-gray-800 py-4">
      <p className="text-center text-xs text-gray-400 dark:text-gray-500">
        © 2026 VenueFinder. All rights reserved.
      </p>
    </div>
  </footer>
);

export default Footer;
