"use client";

import React from "react";

type NavItem = {
  label: string;
  href: string; // can be a path or hash to be prefixed with main site
};

const navItems: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/#about" },
  { label: "Journey", href: "https://gabedossantos.com/#journey" },
  { label: "Portfolio", href: "/#portfolio" },
  { label: "Blog", href: "https://gabedossantos.com/#blog" },
  { label: "The Lab", href: "https://gabedossantos.com/#the-lab" },
  { label: "Skills", href: "https://gabedossantos.com/#skills" },
  { label: "Contact", href: "https://gabedossantos.com/#contact" },
];


function resolveHref(href: string): string {
  return href;
}

export function SiteHeader() {
  return (
    <header className="fixed w-full top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
      <nav className="max-w-[1200px] mx-auto px-4 md:px-6 py-4">
        <div className="flex items-center justify-between">
          <a href="/" className="text-2xl font-display font-bold">
            
          </a>
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={resolveHref(item.href)}
                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                {item.label}
              </a>
            ))}
          </div>
          {/* Simple small-screen inline nav */}
          <div className="inline-flex md:hidden items-center gap-4">
            {navItems
              .filter((i) => ["Home", "About", "Journey", "Blog"].includes(i.label))
              .map((item) => (
                <a
                  key={item.label}
                  href={resolveHref(item.href)}
                  className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm"
                >
                  {item.label}
                </a>
              ))}
          </div>
        </div>
      </nav>
    </header>
  );
}

export default SiteHeader;
