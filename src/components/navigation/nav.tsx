"use client"

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useRouter, usePathname } from 'next/navigation';

interface NavItemProps {
  href: string;
  label: string;
  icon?: React.ReactNode;
  isActive?: boolean;
}

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const pathname = usePathname();
  const router = useRouter();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isOpen && !target.closest('nav')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Handle Escape key press to close search
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const navItems = [
    { 
      href: '/features', 
      label: 'Features',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    { 
      href: '/pricing', 
      label: 'Pricing',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    { 
      href: '/about', 
      label: 'About',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
  ];

  const resourceItems = [
    { 
      href: '/docs', 
      label: 'Documentation',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    { 
      href: '/api', 
      label: 'API Reference',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      )
    },
    { 
      href: '/blog', 
      label: 'Blog',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
      )
    },
    { 
      href: '/tutorials', 
      label: 'Tutorials',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
      )
    },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <motion.nav
      className={`
        fixed top-4 left-0 right-0 max-w-6xl mx-auto px-4 py-3 z-50
        ${scrolled ? 'backdrop-blur-lg bg-white/90 dark:bg-gray-900/90 shadow-lg border border-orange-100/30 dark:border-purple-900/30' : 'backdrop-blur-md bg-white/70 dark:bg-gray-900/70'}
        rounded-xl transition-all duration-300
      `}
      initial={{ y: -20, opacity: 0 }}
      animate={{ 
        y: scrolled ? 0 : 4,
        opacity: 1 
      }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      
    >
      <div className="flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="z-10">
          <motion.div
            className="flex items-center gap-2"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <motion.div
              className="bg-gradient-to-tr from-orange-500 to-purple-500 rounded-lg p-2"
              whileHover={{ 
                rotate: [0, 10, -10, 0], 
                scale: [1, 1.1, 1],
                transition: { duration: 0.6 } 
              }}
            >
              <svg
                className="w-5 h-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
            </motion.div>
            <div className="flex flex-col">
              <motion.span
                className="text-lg font-semibold text-gray-800 dark:text-white"
                animate={{
                  color: theme === 'dark' 
                    ? ['#f0f0f0', '#f97316', '#f0f0f0'] 
                    : ['#9333ea', '#f97316', '#9333ea'],
                }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                Outscaler
              </motion.span>
              <motion.span 
                className="text-xs text-gray-500 dark:text-gray-400"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                Scale without limits
              </motion.span>
            </div>
          </motion.div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          {navItems.map(item => (
            <NavItem 
              key={item.href} 
              href={item.href} 
              label={item.label} 
              icon={item.icon}
              isActive={pathname === item.href}
            />
          ))}

          {/* Resources Dropdown */}
          <div className="relative group">
            <motion.button
              className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 font-medium"
              whileHover={{ y: -1 }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Resources
              <svg className="w-4 h-4 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </motion.button>

            <motion.div
              className="absolute left-0 mt-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200"
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg py-2 border border-gray-100 dark:border-gray-700 overflow-hidden">
                {resourceItems.map(item => (
                  <DropdownItem key={item.href} href={item.href} label={item.label} icon={item.icon} />
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-3">
          {/* Search Button */}
          <motion.button
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setSearchOpen(true)}
            className="p-2 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Search"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </motion.button>

          {/* Theme Toggle */}
          <motion.button
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Toggle theme"
          >
            <AnimatePresence mode="wait" initial={false}>
              {theme === "dark" ? (
                <motion.svg
                  key="moon"
                  className="w-5 h-5"
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 90 }}
                  transition={{ duration: 0.2 }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </motion.svg>
              ) : (
                <motion.svg
                  key="sun"
                  className="w-5 h-5"
                  initial={{ scale: 0, rotate: 90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: -90 }}
                  transition={{ duration: 0.2 }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </motion.svg>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Notification Bell */}
          <motion.button
            whileHover={{ scale: 1.1, y: -1 }}
            whileTap={{ scale: 0.9 }}
            className="hidden sm:block p-2 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 relative"
            aria-label="Notifications"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <motion.div 
              className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ 
                type: "spring", 
                stiffness: 500, 
                damping: 15 
              }}
            />
          </motion.button>

          {/* Login Button */}
          <Link href="/sign-in">
            <motion.button
              className="relative overflow-hidden bg-gradient-to-r from-orange-500 to-purple-500 text-white py-2 px-5 rounded-full text-sm font-medium hidden sm:block group"
              whileHover={{
                scale: 1.05,
                boxShadow: "0 0 20px rgba(249, 115, 22, 0.6)"
              }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="relative z-10 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                <span>Sign In</span>
              </span>
              <motion.div
                className="absolute inset-0 -z-0"
                initial={{ opacity: 0.8 }}
                animate={{
                  background: [
                    "linear-gradient(90deg, #f97316 0%, #a855f7 100%)",
                    "linear-gradient(90deg, #a855f7 0%, #f97316 100%)",
                    "linear-gradient(90deg, #f97316 0%, #a855f7 100%)",
                  ],
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
              <motion.div 
                className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-orange-600 to-purple-600 blur-sm -z-10 rounded-full"
                transition={{ duration: 0.3 }}
              />
            </motion.button>
          </Link>

          {/* Sign Up Button - visible on mobile */}
          <Link href="/sign-up">
            <motion.button
              className="relative overflow-hidden bg-gradient-to-r from-orange-500 to-purple-500 text-white py-2 px-5 rounded-full text-sm font-medium block sm:hidden group"
              whileHover={{
                scale: 1.05,
                boxShadow: "0 0 20px rgba(249, 115, 22, 0.6)"
              }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="relative z-10 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span>Sign Up</span>
              </span>
              <motion.div
                className="absolute inset-0 -z-0"
                initial={{ opacity: 0.8 }}
                animate={{
                  background: [
                    "linear-gradient(90deg, #f97316 0%, #a855f7 100%)",
                    "linear-gradient(90deg, #a855f7 0%, #f97316 100%)",
                    "linear-gradient(90deg, #f97316 0%, #a855f7 100%)",
                  ],
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
              <motion.div 
                className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-orange-600 to-purple-600 blur-sm -z-10 rounded-full"
                transition={{ duration: 0.3 }}
              />
            </motion.button>
          </Link>

          {/* Mobile Menu Button */}
          <motion.button
            className="block md:hidden p-2 rounded-full text-gray-600 dark:text-gray-300"
            onClick={() => setIsOpen(!isOpen)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label="Toggle menu"
          >
            <motion.div
              animate={isOpen ? "open" : "closed"}
              variants={{
                open: { rotate: 180 },
                closed: { rotate: 0 }
              }}
              transition={{ duration: 0.3 }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <motion.path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  variants={{
                    open: { d: "M6 18L18 6M6 6l12 12" },
                    closed: { d: "M4 6h16M4 12h16M4 18h16" }
                  }}
                />
              </svg>
            </motion.div>
          </motion.button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="block md:hidden mt-4"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-100 dark:border-gray-700">
              <div className="flex flex-col gap-2 py-2">
                {navItems.map(item => (
                  <MobileNavItem 
                    key={item.href} 
                    href={item.href} 
                    label={item.label} 
                    icon={item.icon}
                    isActive={pathname === item.href}
                  />
                ))}

                <MobileAccordion 
                  title="Resources" 
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  }
                >
                  <div className="ml-3 mt-1 flex flex-col gap-1">
                    {resourceItems.map(item => (
                      <MobileDropdownItem 
                        key={item.href} 
                        href={item.href} 
                        label={item.label} 
                        icon={item.icon}
                        isActive={pathname === item.href}
                      />
                    ))}
                  </div>
                </MobileAccordion>

                <div className="grid grid-cols-2 gap-2 mt-3">
                  <Link href="/sign-in" className="w-full">
                    <motion.button
                      className="relative overflow-hidden bg-gradient-to-r from-orange-500/80 to-purple-500/80 text-white py-2.5 px-4 rounded-lg text-sm font-medium w-full group"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <span className="relative z-10 flex items-center justify-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                        <span>Sign In</span>
                      </span>
                      <motion.div
                        className="absolute inset-0 -z-0"
                        initial={{ opacity: 0.8 }}
                        animate={{
                          background: [
                            "linear-gradient(90deg, #f97316 0%, #a855f7 100%)",
                            "linear-gradient(90deg, #a855f7 0%, #f97316 100%)",
                            "linear-gradient(90deg, #f97316 0%, #a855f7 100%)",
                          ],
                        }}
                        transition={{
                          duration: 6,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      />
                      <motion.div 
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-orange-600 to-purple-600 blur-sm -z-10 rounded-lg"
                        transition={{ duration: 0.3 }}
                      />
                    </motion.button>
                  </Link>
                  <Link href="/sign-up" className="w-full">
                    <motion.button
                      className="relative overflow-hidden bg-gradient-to-r from-orange-500 to-purple-500 text-white py-2.5 px-4 rounded-lg text-sm font-medium w-full group"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <span className="relative z-10 flex items-center justify-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        <span>Sign Up</span>
                      </span>
                      <motion.div
                        className="absolute inset-0 -z-0"
                        initial={{ opacity: 0.8 }}
                        animate={{
                          background: [
                            "linear-gradient(90deg, #f97316 0%, #a855f7 100%)",
                            "linear-gradient(90deg, #a855f7 0%, #f97316 100%)",
                            "linear-gradient(90deg, #f97316 0%, #a855f7 100%)",
                          ],
                        }}
                        transition={{
                          duration: 6,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      />
                      <motion.div 
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-orange-600 to-purple-600 blur-sm -z-10 rounded-lg"
                        transition={{ duration: 0.3 }}
                      />
                    </motion.button>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Modal */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setSearchOpen(false)}
          >
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl p-4 relative"
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
            >
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search everything..."
                  className="w-full py-3 pl-12 pr-10 text-lg rounded-lg bg-gray-100 dark:bg-gray-700 border-0 focus:ring-2 focus:ring-blue-500 dark:text-white"
                  autoFocus
                />
                <div className="absolute left-3 top-3.5 text-gray-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <button
                  type="button"
                  className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  onClick={() => setSearchOpen(false)}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </form>
              <div className="mt-4">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Suggested searches:</div>
                <div className="flex flex-wrap gap-2">
                  {['Getting started', 'API documentation', 'Pricing plans', 'Integrations', 'Use cases'].map((tag) => (
                    <motion.button
                      key={tag}
                      className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-md text-sm text-gray-600 dark:text-gray-300"
                      whileHover={{ scale: 1.05, backgroundColor: theme === 'dark' ? '#4B5563' : '#E5E7EB' }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setSearchQuery(tag);
                        router.push(`/search?q=${encodeURIComponent(tag)}`);
                        setSearchOpen(false);
                      }}
                    >
                      {tag}
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

// Desktop Nav Item
const NavItem = ({ href, label, isActive }: NavItemProps) => (
  <motion.div 
    whileHover={{ y: -2 }} 
    whileTap={{ y: 0 }}
    className="relative"
  >
    <Link href={href} 
      className={`flex items-center gap-1.5 font-medium ${
        isActive 
          ? 'text-orange-600 dark:text-orange-400' 
          : 'text-gray-600 dark:text-gray-300 hover:text-orange-500 dark:hover:text-orange-400'
      }`}
    >
      {label}
    </Link>
    {isActive && (
      <motion.div
        className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-purple-500"
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: "100%", opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
    )}
  </motion.div>
);

// Dropdown Item
const DropdownItem = ({ href, label, icon }: NavItemProps) => (
  <motion.div
    whileHover={{ x: 2, backgroundColor: "rgba(249, 115, 22, 0.08)" }}
    className="transition-colors"
  >
    <Link href={href} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-orange-500 dark:hover:text-orange-400 flex items-center gap-2">
      {icon}
      {label}
    </Link>
  </motion.div>
);

// Mobile Nav Item
const MobileNavItem = ({ href, label, icon, isActive }: NavItemProps) => (
  <motion.div
    whileHover={{ x: 2 }}
    className={`border-b border-gray-100 dark:border-gray-800 pb-2 ${
      isActive ? 'border-l-4 border-l-orange-500 pl-2' : 'pl-0'
    }`}
  >
    <Link 
      href={href} 
      className={`flex items-center gap-2 py-1.5 ${
        isActive 
          ? 'text-orange-600 dark:text-orange-400 font-medium' 
          : 'text-gray-700 dark:text-gray-300 font-medium'
      }`}
    >
      {icon}
      {label}
    </Link>
  </motion.div>
);

// Mobile Dropdown Item
const MobileDropdownItem = ({ href, label, icon, isActive }: NavItemProps) => (
  <motion.div
    whileHover={{ x: 2 }}
    className={`pl-4 border-l-2 ${isActive ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-700 dark:text-gray-300'}`}
  >
    <Link href={href} className="flex items-center gap-2 py-1.5">
      {icon}
      {label}
    </Link>
  </motion.div>
);

interface MobileAccordionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

// Mobile Accordion Component
const MobileAccordion = ({ title, icon, children }: MobileAccordionProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <motion.div
        whileHover={{ x: 2 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between py-2 cursor-pointer"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-gray-700 dark:text-gray-300">{title}</span>
        </div>
        <motion.svg
          className="w-4 h-4 text-gray-600 dark:text-gray-300"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </motion.svg>
      </motion.div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Navbar;
