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
  { label: "Blog", href: "https://gabedossantos.com/#blog" },
];


function resolveHref(href: string): string {
  return href;
}

export function SiteHeader() {
  return null;
}

export default SiteHeader;
