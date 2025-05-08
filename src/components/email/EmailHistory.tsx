'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Mail, FileSpreadsheet, Clock, ArrowLeft, RefreshCw, Loader2 } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface SingleEmailItem {
  key: string;
  searchId: string;
  firstName: string;
  lastName: string;
  companyName: string;
  linkedin?: string;
  email?: string;
  personalEmails?: string[];
  lastModified?: Date;
  timestamp?: Date; // Added timestamp property
}

interface BulkEmailItem {
  key: string;
  searchId: string;
  fileName: string;
  recordCount: number;
  successCount?: number;
  lastModified?: Date;
  timestamp?: string;
  results?: BulkResultRecord[];
}

interface BulkResultRecord {
  firstName: string;
  lastName: string;
  linkedin: string;
  companyName: string;
  foundEmail: string | null;
  personalEmails?: string[];
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      staggerChildren: 0.1,
      duration: 0.5,
      ease: 'easeOut'
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0, scale: 0.95 },
  visible: { 
    y: 0, 
    opacity: 1, 
    scale: 1,
    transition: { 
      type: 'spring',
      stiffness: 100,
      damping: 15,
      duration: 0.4 
    } 
  }
};

const tableRowVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.05,
      type: 'spring',
      stiffness: 100,
      damping: 15,
      duration: 0.3
    }
  }),
  exit: { 
    opacity: 0, 
    y: -10, 
    scale: 0.95,
    transition: { 
      duration: 0.2,
      ease: 'easeInOut'
    } 
  },
  hover: {
    scale: 1.01,
    transition: { duration: 0.2 }
  }
};

const EmailHistory = () => {
  const { user } = useUser();
  const [singleSearchHistory, setSingleSearchHistory] = useState<SingleEmailItem[]>([]);
  const [bulkSearchHistory, setBulkSearchHistory] = useState<BulkEmailItem[]>([]);
  const [isLoadingSingle, setIsLoadingSingle] = useState(true);
  const [isLoadingBulk, setIsLoadingBulk] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab,] = useState<'single' | 'bulk'>('single');

  const fetchSingleSearchHistory = useCallback(async (showRefreshIndicator = false) => {
    if (!user) return;
    
    if (showRefreshIndicator) {
      setIsRefreshing(true);
    } else {
      setIsLoadingSingle(true);
    }
    setError(null);
    
    try {
      const response = await fetch('/api/list-single-results');
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setSingleSearchHistory(data.results || []);
      if (showRefreshIndicator) {
        toast.success('Single email history refreshed');
      }
    } catch (err) {
      console.error('Failed to fetch single search history:', err);
      setError('Failed to load your search history. Please try again later.');
      if (showRefreshIndicator) {
        toast.error('Failed to refresh data. Please try again.');
      }
    } finally {
      setIsLoadingSingle(false);
      setIsRefreshing(false);
    }
  }, [user]);

  const fetchBulkSearchHistory = useCallback(async (showRefreshIndicator = false) => {
    if (!user) return;
    
    if (showRefreshIndicator) {
      setIsRefreshing(true);
    } else {
      setIsLoadingBulk(true);
    }
    setError(null);
    
    try {
      const response = await fetch('/api/list-bulk-results');
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setBulkSearchHistory(data.results || []);
      if (showRefreshIndicator) {
        toast.success('Bulk email history refreshed');
      }
    } catch (err) {
      console.error('Failed to fetch bulk search history:', err);
      setError('Failed to load your bulk search history. Please try again later.');
      if (showRefreshIndicator) {
        toast.error('Failed to refresh data. Please try again.');
      }
    } finally {
      setIsLoadingBulk(false);
      setIsRefreshing(false);
    }
  }, [user]);

  const handleRefresh = useCallback(() => {
    if (activeTab === 'single') {
      fetchSingleSearchHistory(true);
    } else {
      fetchBulkSearchHistory(true);
    }
  }, [activeTab, fetchSingleSearchHistory, fetchBulkSearchHistory]);

  useEffect(() => {
    fetchSingleSearchHistory();
    fetchBulkSearchHistory();
  }, [fetchSingleSearchHistory, fetchBulkSearchHistory]);

  const formatDate = (dateString?: Date) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

    const [selectedSingleSearch, setSelectedSingleSearch] = useState<string | null>(null);
  const [singleSearchDetails, setSingleSearchDetails] = useState<SingleEmailItem | null>(null);
  const [, setIsLoadingSingleDetails] = useState(false);

  const fetchSingleSearchDetails = async (searchId: string) => {
    setIsLoadingSingleDetails(true);
    try {
      const response = await fetch(`/api/single-result/${searchId}`);
      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      setSingleSearchDetails(data);
      setSelectedSingleSearch(searchId);
    } catch (err) {
      console.error('Failed to fetch single search details:', err);
      setError('Failed to load search details. Please try again later.');
    } finally {
      setIsLoadingSingleDetails(false);
    }
  };

  // Skeleton loader for the table
  const TableSkeleton = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex space-x-4">
          <Skeleton className="h-8 w-[250px]" />
        </div>
        <Skeleton className="h-8 w-[100px]" />
      </div>
      <div className="overflow-x-auto border rounded-md">
        <div className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <div className="bg-gray-50 dark:bg-gray-900">
            <div className="grid grid-cols-5 gap-2 px-4 py-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-black">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="grid grid-cols-5 gap-2 px-4 py-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );



  const renderSingleEmailHistory = () => {
    // Show refresh button and header
    const headerSection = (
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Email Search History</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={cn(
            "flex items-center gap-1 transition-all",
            isRefreshing && "opacity-70 cursor-not-allowed"
          )}
        >
          {isRefreshing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Refreshing...</span>
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </>
          )}
        </Button>
      </div>
    );

    if (isLoadingSingle) {
      return (
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="space-y-4"
        >
          {headerSection}
          <TableSkeleton />
        </motion.div>
      );
    }

    if (singleSearchHistory.length === 0) {
      return (
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="space-y-4"
        >
          {headerSection}
          <motion.div variants={itemVariants} className="p-8 text-center border rounded-md bg-gray-50 dark:bg-gray-900">
            <p className="text-muted-foreground mb-4">You haven&lsquo;t performed any email searches yet.</p>
            <Link href="/email">
              <Button>
                <Mail className="mr-2 h-4 w-4" />
                Find an Email
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      );
    }

    if (selectedSingleSearch && singleSearchDetails) {
      // Show details of selected single search
      return (
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="space-y-4"
        >
          <motion.div variants={itemVariants} className="mb-4 flex items-center justify-between">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setSelectedSingleSearch(null);
                setSingleSearchDetails(null);
              }}
              className="flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to List
            </Button>
            <div className="text-sm text-muted-foreground">
              Searched on: {formatDate(singleSearchDetails.timestamp || singleSearchDetails.lastModified)}
            </div>
          </motion.div>
          
          <motion.div 
            variants={itemVariants}
            className="grid gap-6 md:grid-cols-2 sm:grid-cols-1"
          >
            <motion.div variants={itemVariants} className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Search Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">First Name</p>
                    <p className="font-medium">{singleSearchDetails.firstName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Name</p>
                    <p className="font-medium">{singleSearchDetails.lastName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Company</p>
                    <p className="font-medium">{singleSearchDetails.companyName}</p>
                  </div>
                  {singleSearchDetails.linkedin && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">LinkedIn</p>
                      <p className="font-medium break-all">{singleSearchDetails.linkedin}</p>
                    </div>
                  )}
                   <div>
                    <p className="text-sm text-muted-foreground">Search ID</p>
                    <p className="font-mono text-xs break-all">{singleSearchDetails.searchId}</p>
                  </div>
                </div>
              </div>
            </motion.div>
            
            <motion.div variants={itemVariants} className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{singleSearchDetails.firstName} {singleSearchDetails.lastName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Company</p>
                    <p className="font-medium">{singleSearchDetails.companyName}</p>
                  </div>
                </div>
                {singleSearchDetails.linkedin && (
                  <div>
                    <p className="text-sm text-muted-foreground">LinkedIn</p>
                    <p className="font-medium break-all">{singleSearchDetails.linkedin}</p>
                  </div>
                )}
              </div>
            </motion.div>
            
            <motion.div variants={itemVariants} className="space-y-4 md:col-span-2">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Email Results</h3>
                {singleSearchDetails.email ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="p-3 bg-gray-50 dark:bg-gray-900 rounded-md"
                  >
                    <p className="text-sm text-muted-foreground mb-1">Business Email</p>
                    <p className="font-mono text-sm bg-black text-white dark:bg-white dark:text-black px-2 py-1 rounded inline-block">
                      {singleSearchDetails.email}
                    </p>
                  </motion.div>
                ) : (
                  <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-md">
                    <p className="text-sm text-muted-foreground">No business email found</p>
                  </div>
                )}
                
                {singleSearchDetails.personalEmails && singleSearchDetails.personalEmails.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="p-3 bg-gray-50 dark:bg-gray-900 rounded-md"
                  >
                    <p className="text-sm text-muted-foreground mb-1">Personal Emails ({singleSearchDetails.personalEmails.length})</p>
                    <div className="space-y-2">
                      {singleSearchDetails.personalEmails.map((email, index) => (
                        <motion.p 
                          key={index} 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.05 }}
                          className="font-mono text-sm bg-black text-white dark:bg-white dark:text-black px-2 py-1 rounded inline-block mr-2 mb-2"
                        >
                          {email}
                        </motion.p>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      );
    }

    return (
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="space-y-4"
      >
        {headerSection}
        <motion.div variants={itemVariants} className="overflow-x-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Name</TableHead>
                <TableHead className="hidden md:table-cell">Company</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {singleSearchHistory.map((item, i) => (
                  <motion.tr 
                    key={item.searchId}
                    custom={i}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={tableRowVariants}
                    className="border-b transition-colors hover:bg-gray-50 dark:hover:bg-gray-900"
                  >
                    <TableCell className="font-medium">{item.firstName} {item.lastName}</TableCell>
                    <TableCell className="hidden md:table-cell">{item.companyName}</TableCell>
                    <TableCell>
                      {item.email ? (
                        <div>
                          <span className="font-mono text-xs bg-black text-white dark:bg-white dark:text-black px-2 py-1 rounded">
                            {item.email}
                          </span>
                          {item.personalEmails && item.personalEmails.length > 0 && (
                            <div className="mt-1">
                              <span className="text-xs text-muted-foreground">+{item.personalEmails.length} personal {item.personalEmails.length === 1 ? 'email' : 'emails'}</span>
                            </div>
                          )}
                        </div>
                      ) : item.personalEmails && item.personalEmails.length > 0 ? (
                        <div>
                          <span className="font-mono text-xs bg-black text-white dark:bg-white dark:text-black px-2 py-1 rounded">
                            {item.personalEmails[0]}
                          </span>
                          {item.personalEmails.length > 1 && (
                            <div className="mt-1">
                              <span className="text-xs text-muted-foreground">+{item.personalEmails.length - 1} more {item.personalEmails.length === 2 ? 'email' : 'emails'}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">Not found</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                      {formatDate(item.lastModified)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => fetchSingleSearchDetails(item.searchId)}
                        className="h-8 px-2"
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        </motion.div>
      </motion.div>
    );
  };

  const [selectedBulkSearch, setSelectedBulkSearch] = useState<string | null>(null);
  const [bulkSearchDetails, setBulkSearchDetails] = useState<BulkResultRecord[] | null>(null);
  const [, setIsLoadingDetails] = useState(false);

  const fetchBulkSearchDetails = async (searchId: string) => {
    setIsLoadingDetails(true);
    try {
      const response = await fetch(`/api/bulk-result/${searchId}`);
      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      setBulkSearchDetails(data.results || []);
      setSelectedBulkSearch(searchId);
    } catch (err) {
      console.error('Failed to fetch bulk search details:', err);
      setError('Failed to load bulk search details. Please try again later.');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const renderBulkEmailHistory = () => {
    // Show refresh button and header
    const headerSection = (
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Bulk Email Search History</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={cn(
            "flex items-center gap-1 transition-all",
            isRefreshing && "opacity-70 cursor-not-allowed"
          )}
        >
          {isRefreshing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Refreshing...</span>
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </>
          )}
        </Button>
      </div>
    );

    if (isLoadingBulk) {
      return (
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="space-y-4"
        >
          {headerSection}
          <TableSkeleton />
        </motion.div>
      );
    }

    if (bulkSearchHistory.length === 0) {
      return (
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="space-y-4"
        >
          {headerSection}
          <motion.div variants={itemVariants} className="p-8 text-center border rounded-md bg-gray-50 dark:bg-gray-900">
            <p className="text-muted-foreground mb-4">You haven&lsquo;t performed any bulk email searches yet.</p>
            <Link href="/email">
              <Button>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Bulk Find Emails
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      );
    }

    if (selectedBulkSearch && bulkSearchDetails) {
      // Show details of selected bulk search
      const selectedSearch = bulkSearchHistory.find(item => item.searchId === selectedBulkSearch);
      
      return (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setSelectedBulkSearch(null);
                setBulkSearchDetails(null);
              }}
              className="flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to List
            </Button>
            <div className="text-sm text-muted-foreground">
              {selectedSearch?.fileName} • Searched on: {formatDate(selectedSearch?.timestamp ? new Date(selectedSearch.timestamp) : selectedSearch?.lastModified)} {/* Display timestamp */}
            </div>
          </div>
          
          {/* Add summary stats for the bulk search */}
          {selectedSearch && (
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="text-md font-medium mb-2">Bulk Search Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">File Name</p>
                  <p className="font-medium break-all">{selectedSearch.fileName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Records</p>
                  <p className="font-medium">{selectedSearch.recordCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Emails Found</p>
                  <p className="font-medium">{selectedSearch.successCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Success Rate</p>
                  <p className="font-medium">
                    {selectedSearch.recordCount > 0 
                      ? `${Math.round(((selectedSearch.successCount ?? 0) / selectedSearch.recordCount) * 100)}%`
                      : 'N/A'}
                  </p>
                </div>
                 <div>
                  <p className="text-muted-foreground">Search ID</p>
                  <p className="font-mono text-xs break-all">{selectedSearch.searchId}</p>
                </div>
              </div>
            </div>
          )}

          <h4 className="text-md font-medium mb-2">Detailed Results</h4>
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">First Name</TableHead>
                  <TableHead className="w-[150px]">Last Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Business Email</TableHead>
                  <TableHead>Personal Emails</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bulkSearchDetails.length > 0 ? (
                  bulkSearchDetails.map((record, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{record.firstName} {record.lastName}</TableCell>
                      <TableCell>{record.companyName}</TableCell>
                      <TableCell>
                        {record.foundEmail ? (
                          <div>
                            <span className="font-mono text-xs bg-black text-white dark:bg-white dark:text-black px-2 py-1 rounded">
                              {record.foundEmail}
                            </span>
                            {record.personalEmails && record.personalEmails.length > 0 && (
                              <div className="mt-1">
                                <span className="text-xs text-muted-foreground">+{record.personalEmails.length} personal {record.personalEmails.length === 1 ? 'email' : 'emails'}</span>
                              </div>
                            )}
                          </div>
                        ) : record.personalEmails && record.personalEmails.length > 0 ? (
                          <div>
                            <span className="font-mono text-xs bg-black text-white dark:bg-white dark:text-black px-2 py-1 rounded">
                              {record.personalEmails[0]}
                            </span>
                            {record.personalEmails.length > 1 && (
                              <div className="mt-1">
                                <span className="text-xs text-muted-foreground">+{record.personalEmails.length - 1} more {record.personalEmails.length === 2 ? 'email' : 'emails'}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">Not found</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-10 text-sm text-gray-500">No results found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File Name</TableHead>
              <TableHead>Records</TableHead>
              <TableHead>Success Rate</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bulkSearchHistory.map((item) => (
              <TableRow key={item.searchId}>
                <TableCell className="font-medium">{item.fileName}</TableCell>
                <TableCell>{item.recordCount} records</TableCell>
                <TableCell>
                  {item.successCount !== undefined ? (
                    <span>
                      {Math.round((item.successCount / item.recordCount) * 100)}% 
                      ({item.successCount}/{item.recordCount})
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">Unknown</span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDate(item.lastModified)}
                </TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => fetchBulkSearchDetails(item.searchId)}
                    className="h-8 px-2"
                  >
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Search History</CardTitle>
          <CardDescription>View your previous email searches</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 text-red-500">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Toaster position="top-center" theme="dark" />
      <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <span>Email Search History</span>
            </CardTitle>
            <CardDescription>
              View and manage your previous email search results
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setIsLoadingSingle(true);
              setIsLoadingBulk(true);
              setSelectedSingleSearch(null);
              setSingleSearchDetails(null);
              setSelectedBulkSearch(null);
              setBulkSearchDetails(null);
              
              // Fetch fresh data
              Promise.all([
                fetch('/api/list-single-results').then(res => res.json()),
                fetch('/api/list-bulk-results').then(res => res.json())
              ])
              .then(([singleData, bulkData]) => {
                setSingleSearchHistory(singleData.results || []);
                setBulkSearchHistory(bulkData.results || []);
                toast.success('History refreshed');
              })
              .catch(err => {
                console.error('Error refreshing history:', err);
                setError('Failed to refresh history. Please try again.');
              })
              .finally(() => {
                setIsLoadingSingle(false);
                setIsLoadingBulk(false);
              });
            }}
            className="h-9 px-2"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="single" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="single" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>Single Searches</span>
            </TabsTrigger>
            <TabsTrigger value="bulk" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              <span>Bulk Searches</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="single" className="mt-0">
            {renderSingleEmailHistory()}
          </TabsContent>
          <TabsContent value="bulk" className="mt-0">
            {renderBulkEmailHistory()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
    </>
  );
};

export default EmailHistory;