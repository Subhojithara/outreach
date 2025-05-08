'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, FileSpreadsheet, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// Import email components
import FindEmailPage from './find-email';
import BulkFindEmailPage from './Bulk-find-email';
import EmailHistory from './EmailHistory';

interface EmailTabsProps {
  defaultTab?: string;
}

const EmailTabs: React.FC<EmailTabsProps> = ({ defaultTab = 'single' }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-black dark:to-gray-900 py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-black dark:text-white mb-2">
            Email Finder <span className="text-primary">Pro</span>
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Find verified business email addresses with our powerful tools
          </p>
        </motion.div>

        <Tabs defaultValue={defaultTab} className="w-full">
          <div className="flex justify-center mb-8">
            <TabsList className="w-full max-w-md bg-gray-100 dark:bg-gray-800 p-1 rounded-full">
              <TabsTrigger 
                value="single" 
                className={cn(
                  "flex-1 rounded-full py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:shadow-md transition-all duration-200",
                  "data-[state=active]:text-primary"
                )}
              >
                <Mail className="mr-2 h-4 w-4" />
                <span>Single Email</span>
              </TabsTrigger>
              <TabsTrigger 
                value="bulk" 
                className={cn(
                  "flex-1 rounded-full py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:shadow-md transition-all duration-200",
                  "data-[state=active]:text-primary"
                )}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                <span>Bulk Finder</span>
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className={cn(
                  "flex-1 rounded-full py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:shadow-md transition-all duration-200",
                  "data-[state=active]:text-primary"
                )}
              >
                <Clock className="mr-2 h-4 w-4" />
                <span>History</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="single" className="mt-2">
            <FindEmailPage />
          </TabsContent>
          
          <TabsContent value="bulk" className="mt-2">
            <BulkFindEmailPage />
          </TabsContent>
          
          <TabsContent value="history" className="mt-2">
            <EmailHistory />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EmailTabs;