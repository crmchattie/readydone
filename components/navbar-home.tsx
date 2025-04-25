"use client";

import Link from "next/link";
import Image from "next/image";
import { Menu } from "lucide-react";
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from "@/components/ui/navigation-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react"

export default function NavbarHome() {
  const { status } = useSession()
  const [isOpen, setIsOpen] = useState(false);

  const getStartedLink = status === "authenticated" ? "/dashboard" : "/register"
  const getStartedText = status === "authenticated" ? "Dashboard" : "Get Started"

  const menuItems = [
    { href: "/home", label: "Home" },
    { href: "/pricing", label: "Pricing" },
    { href: "/examples", label: "Examples" },
    { href: getStartedLink, label: getStartedText },
  ];

  return (
    <nav className="border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/home" className="flex items-center space-x-2">
              <Image
                src="/images/logo.png"
                alt="Plot Logo"
                width={40}
                height={40}
                className="w-auto"
              />
              <span className="ml-3 text-3xl font-semibold">Plot</span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden sm:flex items-center space-x-4">
            <NavigationMenu>
              <NavigationMenuList className="space-x-8">
                {menuItems.map((item) => (
                  <NavigationMenuItem key={item.href}>
                    <NavigationMenuLink asChild>
                      <Link href={item.href} className="text-sm font-medium transition-colors hover:text-primary">
                        {item.label}
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>
            <ThemeToggle />
          </div>

          {/* Mobile Menu Button */}
          <div className="sm:hidden flex items-center space-x-4">
            <ThemeToggle />
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
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-3 py-2 rounded-md text-base font-medium hover:bg-secondary/100 hover:text-primary transition-colors"
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}