"use client";

import React, { useState, useEffect } from "react";
import { Search, ChevronRight, CheckCircle, Star, Shield, Users, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
                                                                                        import Navbar from "@/components/navigation/nav";
import Link from "next/link";

const Page = () => {
  return (
    <>
      <Navbar />
      <HeroSection />
    </>
  );
};

const HeroSection = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isActive, setIsActive] = useState(false);
  
  // Text animation with smooth transitions
  const [textIndex, setTextIndex] = useState(0);
  const examples = [
    "Find Anyone's Email",
    "Reach Decision Makers",
    "Grow Your Network",
    "Boost Your Outreach",
  ];
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % examples.length);
    }, 4000);
    
    return () => clearInterval(interval);
  }, []);

  // Simplified background elements
  const particles = Array.from({ length: 6 }).map((_, i) => ({
    id: i,
    size: Math.random() * 4 + 2,
    x: Math.random() * 100,
    y: Math.random() * 100,
  }));

  const handleSearch = () => {
    if (email.trim() !== "") {
      setIsActive(true);
      setTimeout(() => {
        router.push(`/dashboard?search=${encodeURIComponent(email)}`);
      }, 800);
    } else {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 3000);
    }
  };

  return (
    <div className="relative overflow-hidden bg-white dark:bg-gray-950 min-h-screen">
      {/* Simplified gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50/30 via-purple-50/20 to-blue-50/30 dark:from-orange-900/20 dark:via-purple-900/10 dark:to-blue-900/20" />

      {/* Optimized background elements with fewer particles */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute rounded-full bg-gradient-to-r from-orange-300/20 to-purple-300/20 dark:from-orange-400/10 dark:to-purple-400/10"
            style={{
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              filter: `blur(${particle.size / 2}px)`,
            }}
            animate={{
              y: [0, 15, 0],
              x: [0, 5, 0],
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{
              duration: 8 + particle.id * 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* Just one gradient blob with slow movement */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-br from-orange-300/20 to-purple-300/20 dark:from-orange-500/15 dark:to-purple-500/15 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, 0],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-32 pb-24 relative">
        <div className="text-center">
          {/* Feature Badge with simpler animation */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="inline-block mb-8"
          >
            <span className="inline-flex items-center px-5 py-1.5 rounded-full text-sm font-medium bg-orange-500/10 dark:bg-orange-500/15 border border-orange-200/50 dark:border-orange-500/30 text-orange-800 dark:text-orange-300 backdrop-blur-sm">
              <span className="relative flex h-2 w-2 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
              </span>
              <span>New: Bulk email finder now available</span>
            </span>
          </motion.div>

          {/* Hero Title with improved text transition */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="mb-6"
          >
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              <div className="h-16 md:h-20 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={textIndex}
                    className="inline-block bg-gradient-to-r from-orange-600 via-purple-600 to-blue-600 dark:from-orange-400 dark:via-purple-400 dark:to-blue-400 bg-clip-text text-transparent"
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -40, opacity: 0 }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 100, 
                      damping: 20 
                    }}
                  >
                    {examples[textIndex]}
                  </motion.span>
                </AnimatePresence>
              </div>
              <motion.span 
                className="block mt-1 bg-gradient-to-r from-blue-600 via-purple-600 to-orange-600 dark:from-blue-400 dark:via-purple-400 dark:to-orange-400 bg-clip-text text-transparent text-3xl md:text-5xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  duration: 0.8, 
                  delay: 0.2 
                }}
              >
                in Seconds
              </motion.span>
            </h1>
          </motion.div>

          {/* Description with cleaner animation */}
          <motion.p
            className="text-lg md:text-xl mb-6 max-w-2xl mx-auto leading-relaxed text-gray-600 dark:text-gray-400"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            Connect with decision-makers and grow your network Our AI-powered
            tool finds verified email addresses instantly with{" "}
            <span className="relative font-semibold">
              <motion.span
                className="absolute -inset-1 rounded-lg bg-gradient-to-r from-orange-500/20 to-purple-500/20 blur-sm"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
              <span className="relative bg-gradient-to-r from-orange-600 to-purple-600 dark:from-orange-400 dark:to-purple-400 bg-clip-text text-transparent">
                95% accuracy
              </span>
            </span>.
          </motion.p>
          
          {/* CTA Button */}
          <motion.div
            className="flex justify-center mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <Link href="/sign-up">
              <motion.button
                className="relative overflow-hidden bg-gradient-to-r from-orange-500 to-purple-500 text-white py-3 px-8 rounded-xl text-base font-medium shadow-lg flex items-center gap-2"
                whileHover={{ 
                  scale: 1.05, 
                  boxShadow: "0 0 20px rgba(249, 115, 22, 0.5)",
                  y: -3
                }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="relative z-10">Get Started for Free</span>
                <motion.span
                  className="relative z-10"
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </motion.span>
                <motion.div 
                  className="absolute inset-0 -z-10"
                  animate={{
                    background: [
                      "linear-gradient(90deg, #f97316 0%, #a855f7 100%)",
                      "linear-gradient(90deg, #a855f7 0%, #f97316 100%)",
                      "linear-gradient(90deg, #f97316 0%, #a855f7 100%)",
                    ],
                  }}
                  transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                />
              </motion.button>
            </Link>
          </motion.div>

          {/* Search Box with optimized animation */}
          <motion.div 
            className="max-w-2xl mx-auto relative" 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <AnimatePresence>
              {showTooltip && (
                <motion.div
                  className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.4 }}
                >
                  Please enter a name and company
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-red-500"></div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <motion.div
              className={`flex items-center bg-white/90 dark:bg-gray-900/70 backdrop-blur-xl rounded-2xl shadow-xl dark:shadow-2xl p-2 border ${
                isInputFocused
                  ? "border-orange-300 dark:border-orange-500/40 ring-2 ring-orange-200 dark:ring-orange-500/30"
                  : "border-gray-200/50 dark:border-gray-800/50"
              }`}
              whileHover={{ 
                y: -3,
                boxShadow: "0 10px 25px -5px rgba(249, 115, 22, 0.3), 0 8px 10px -6px rgba(168, 85, 247, 0.2)",
                transition: { duration: 0.3 } 
              }}
              animate={{
                boxShadow: isInputFocused 
                  ? "0 10px 25px -5px rgba(249, 115, 22, 0.4), 0 8px 10px -6px rgba(168, 85, 247, 0.3)" 
                  : "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
              }}
            >
              <div className="flex items-center justify-center bg-gradient-to-br from-orange-500 to-purple-500 rounded-xl p-2 ml-2">
                <Search className="h-4 w-4 text-white" />
              </div>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Enter name and company (e.g. John Doe at Google)"
                className="flex-1 px-4 py-3 focus:outline-none text-base bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500"
              />
              <motion.button
                className="relative overflow-hidden bg-gradient-to-r from-orange-500 to-purple-500 dark:from-orange-400 dark:to-purple-400 px-6 py-3 rounded-xl text-white font-medium shadow-md mx-2 flex items-center space-x-2"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleSearch}
                disabled={isActive}
              >
                {isActive ? (
                  <motion.div
                    className="w-5 h-5 border-2 border-white rounded-full border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>Search</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                )}
                
                {/* Subtle gradient animation */}
                <motion.div
                  className="absolute inset-0 -z-10"
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
              </motion.button>
            </motion.div>
            
            {/* Free trial text */}
            <motion.p
              className="text-xs mt-3 text-gray-500 dark:text-gray-400 flex items-center justify-center space-x-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
              <span>Try for free</span>
              <span>•</span>
              <span>No credit card required</span>
              <motion.span
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Star className="h-3 w-3 text-yellow-500 ml-1" />
              </motion.span>
            </motion.p>
          </motion.div>
          
          {/* Trust indicators with staggered animation */}
          <motion.div
            className="mt-12 max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <motion.div 
              className="flex flex-wrap justify-center gap-6 md:gap-8"
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.1
                  }
                }
              }}
              initial="hidden"
              animate="show"
            >
              {[
                { icon: <Shield className="h-5 w-5 text-green-500" />, text: "Verified data" },
                { icon: <Users className="h-5 w-5 text-blue-500" />, text: "10M+ professionals found" },
                { icon: <Star className="h-5 w-5 text-purple-500" />, text: "AI-powered accuracy" },
                { icon: <ExternalLink className="h-5 w-5 text-orange-500" />, text: "API access available" }
              ].map((item, index) => (
                <motion.div 
                  key={index}
                  className="flex items-center space-x-2"
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    show: { opacity: 1, y: 0 }
                  }}
                >
                  {item.icon}
                  <span className="text-sm text-gray-600 dark:text-gray-400">{item.text}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Page;