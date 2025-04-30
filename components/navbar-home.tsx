"use client";

import Link from "next/link";
import Image from "next/image";
import { Menu, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button";

export default function NavbarHome() {
  const { status } = useSession()
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const controlNavbar = () => {
      const currentScrollY = window.scrollY;
      
      // Show navbar when scrolling down, hide when at top
      if (currentScrollY > 100) { // Only show after scrolling 100px
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', controlNavbar);

    return () => {
      window.removeEventListener('scroll', controlNavbar);
    };
  }, [lastScrollY]);

  const getStartedLink = status === "authenticated" ? "/" : "/register"
  const getStartedText = status === "authenticated" ? "Dashboard" : "Get Started"

  const menuItems = [
    // { href: "/home", label: "Home" },
    // { href: "/pricing", label: "Pricing" },
    // { href: "/examples", label: "Examples" },
    { href: getStartedLink, label: getStartedText },
  ];

  return (
    <nav className={cn(
      "border-b fixed w-full top-0 z-50 transition-all duration-300",
      isVisible 
        ? "translate-y-0 bg-background/80 backdrop-blur-sm" 
        : "-translate-y-full bg-transparent"
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/home" className="flex items-center space-x-2">
              <Image
                src="/images/logo.png"
                alt="ReadyDone Logo"
                width={40}
                height={40}
                className="w-auto"
              />
              <span className="ml-3 text-3xl font-semibold">ReadyDone</span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden sm:flex items-center space-x-4">
            <Button asChild size="lg" className="font-medium px-8">
              <Link href={getStartedLink}>
                {getStartedText}
                <ChevronRight className="ml-2 size-4" />
              </Link>
            </Button>
            {/* <ThemeToggle /> */}
          </div>

          {/* Mobile Menu Button */}
          <div className="sm:hidden flex items-center space-x-4">
            {/* <ThemeToggle /> */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-md hover:bg-secondary/100 hover:text-primary transition-colors"
            >
              <Menu className="size-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <div className={cn(
        "sm:hidden",
        isOpen ? "block" : "hidden"
      )}>
        <div className="px-2 pt-2 pb-3 space-y-1">
          <Button asChild size="lg" className="w-full font-medium">
            <Link
              href={getStartedLink}
              className="block px-3 py-2 rounded-md text-base font-medium hover:bg-secondary/100 hover:text-primary transition-colors"
              onClick={() => setIsOpen(false)}
            >
              {getStartedText}
              <ChevronRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}