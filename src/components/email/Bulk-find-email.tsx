'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, FileUp, Loader2, ArrowLeft } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import Link from 'next/link';

// Types
interface BulkResultRecord {
  firstName: string;
  lastName: string;
  linkedin: string;
  companyName: string;
  foundEmail: string | null;
  personalEmails?: string[];
  personalEmailsString?: string; // Added property
  isVerified?: boolean | null;
  emailQuality?: string | null;
  retryCount?: number;
  lastRetry?: Date;
}

interface BulkResultPayload {
  fileName: string;
  recordCount: number;
  successCount: number;
  results: BulkResultRecord[];
}

const BulkFindEmailPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<BulkResultRecord[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState<{index: number, email: string} | null>(null);
  const [verifyingBatch, setVerifyingBatch] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'verified' | 'unverified' | 'not-found'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [retryingEmail, setRetryingEmail] = useState<{index: number, email: string} | null>(null);

  // Handle file selection
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResults(null);
    }
  }, []);

  // Submit handler
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please select a file.');
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/bulk-find-email', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || `Error: ${response.statusText}`;
        toast.error(errorMessage);
      } else {
        setResults(data.results || []);
        toast.success(`Processed ${data.results?.length || 0} records successfully`);
        setFile(null);
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
        // Save the bulk search result to history
        try {
            await fetch('/api/bulk-result', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: file.name,
              recordCount: data.results?.length || 0,
              successCount: data.results?.filter((r: BulkResultRecord) => r.foundEmail).length || 0,
              results: data.results as BulkResultRecord[],
            } as BulkResultPayload),
            });
        } catch (saveErr) {
          console.error("Error saving bulk search history:", saveErr);
          // Continue even if saving fails
        }
      }
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Failed to process file. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [file]);

  // Verify email manually
  const verifyEmail = useCallback(async (email: string, index: number) => {
    if (!email) return;
    
    setVerifyingEmail({ index, email });
    
    try {
      const response = await fetch('/api/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (response.ok && results) {
        const updatedResults = [...results];
        updatedResults[index] = {
          ...updatedResults[index],
          isVerified: data.isVerified,
          emailQuality: data.emailQuality || updatedResults[index].emailQuality
        };
        setResults(updatedResults);
        
        if (data.isVerified) {
          toast.success(`Email ${email} verified successfully!`);
        } else {
          toast.error(`Email ${email} verification failed.`);
        }
      } else {
        toast.error(data.error || 'Failed to verify email');
      }
    } catch (error) {
      console.error('Error verifying email:', error);
      toast.error('Failed to verify email. Please try again.');
    } finally {
      setVerifyingEmail(null);
    }
  }, [results]);

  // Verify all emails in batch
  const verifyAllEmails = useCallback(async () => {
    if (!results || results.length === 0) return;
    
    const emailsToVerify = results
      .filter(record => record.foundEmail && record.isVerified === undefined)
      .map(record => record.foundEmail!);
    
    if (emailsToVerify.length === 0) {
      toast.info('No unverified emails to process');
      return;
    }
    
    setVerifyingBatch(true);
    toast.info(`Verifying ${emailsToVerify.length} emails...`);
    
    let verifiedCount = 0;
    let failedCount = 0;
    
    const updatedResults = [...results];
    
    for (let i = 0; i < emailsToVerify.length; i++) {
      const email = emailsToVerify[i];
      const recordIndex = results.findIndex(r => r.foundEmail === email);
      
      if (recordIndex === -1) continue;
      
      try {
        const response = await fetch('/api/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
          updatedResults[recordIndex] = {
            ...updatedResults[recordIndex],
            isVerified: data.isVerified,
            emailQuality: data.emailQuality || updatedResults[recordIndex].emailQuality
          };
          
          if (data.isVerified) {
            verifiedCount++;
          } else {
            failedCount++;
          }
        } else {
          failedCount++;
        }
      } catch (error) {
        console.error(`Error verifying email ${email}:`, error);
        failedCount++;
      }
      
      // Update results after each verification to show progress
      if (i % 5 === 0 || i === emailsToVerify.length - 1) {
        setResults([...updatedResults]);
      }
    }
    
    setResults(updatedResults);
    setVerifyingBatch(false);
    
    if (verifiedCount > 0 && failedCount === 0) {
      toast.success(`Successfully verified ${verifiedCount} emails`);
    } else if (verifiedCount > 0 && failedCount > 0) {
      toast.success(`Verified ${verifiedCount} emails, ${failedCount} failed`);
    } else if (verifiedCount === 0 && failedCount > 0) {
      toast.error(`Failed to verify ${failedCount} emails`);
    }
  }, [results]);

  // Retry finding email for a specific record
  const retryFindEmail = useCallback(async (record: BulkResultRecord, index: number) => {
    if (!record) return;
    
    setRetryingEmail({ index, email: record.foundEmail || '' });
    
    try {
      const response = await fetch('/api/find-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: record.firstName,
          lastName: record.lastName,
          linkedin: record.linkedin,
          companyName: record.companyName
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && results) {
        const updatedResults = [...results];
        updatedResults[index] = {
          ...updatedResults[index],
          foundEmail: data.email || null,
          personalEmails: data.personalEmails || [],
          isVerified: undefined,
          emailQuality: undefined,
          retryCount: (record.retryCount || 0) + 1,
          lastRetry: new Date()
        };
        setResults(updatedResults);
        
        if (data.email) {
          toast.success(`Found email: ${data.email}`);
        } else if (data.personalEmails && data.personalEmails.length > 0) {
          toast.success(`Found ${data.personalEmails.length} personal email(s)`);
        } else {
          toast.error('No email found on retry');
        }
      } else {
        toast.error(data.error || 'Failed to retry email lookup');
      }
    } catch (error) {
      console.error('Error retrying email lookup:', error);
      toast.error('Failed to retry. Please try again.');
    } finally {
      setRetryingEmail(null);
    }
  }, [results]);

  // Download CSV with enhanced information
  const downloadResults = useCallback(() => {
    if (!results || results.length === 0) return;

    // Create a modified version of results that includes personal emails as a comma-separated string
    const csvData = results.map(record => {
      const recordCopy = { ...record };
      // Convert personalEmails array to a string if it exists
      if (recordCopy.personalEmails && recordCopy.personalEmails.length > 0) {
        recordCopy.personalEmailsString = recordCopy.personalEmails.join('; ');
      } else {
        recordCopy.personalEmailsString = '';
      }
      return recordCopy;
    });

    // Define headers manually to ensure personalEmailsString is included
    const headers: (keyof BulkResultRecord)[] = [
      'firstName', 'lastName', 'linkedin', 'companyName', 'foundEmail', 
      'personalEmailsString', 'isVerified', 'emailQuality', 'retryCount', 'lastRetry'
    ];
    
    // Create CSV content
    const csvContent = csvData.map(row => 
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) {
          return '';
        } else if (header === 'lastRetry' && value instanceof Date) {
          return value.toISOString();
        } else {
          return String(value).includes(',') ? `"${value}"` : value;
        }
      }).join(',')
    ).join('\n');

    const blob = new Blob([`${headers.join(',')}\n${csvContent}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-results-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Downloaded results with verification status');
  }, [results]);

  // Filter results based on status and search term
  const filteredResults = useCallback(() => {
    if (!results) return [];
    
    return results.filter(record => {
      // Apply status filter
      if (filterStatus === 'verified' && record.isVerified !== true) return false;
      if (filterStatus === 'unverified' && record.isVerified !== false) return false;
      if (filterStatus === 'not-found' && record.foundEmail) return false;
      
      // Apply search term filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          record.firstName?.toLowerCase().includes(searchLower) ||
          record.lastName?.toLowerCase().includes(searchLower) ||
          record.companyName?.toLowerCase().includes(searchLower) ||
          record.foundEmail?.toLowerCase().includes(searchLower) ||
          record.personalEmails?.some(email => email.toLowerCase().includes(searchLower))
        );
      }
      
      return true;
    });
  }, [results, filterStatus, searchTerm]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        duration: 0.5
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5 } }
  };

  // const tableRowVariants = {
  //   hidden: { opacity: 0, y: 10 },
  //   visible: (i) => ({
  //     opacity: 1,
  //     y: 0,
  //     transition: {
  //       delay: i * 0.05,
  //       duration: 0.3
  //     }
  //   })
  // };

  return (
    <>
      <Toaster position="top-center" theme="dark" />
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div variants={itemVariants}>
          <Card className="mb-8 border-gray-200 dark:border-gray-800 shadow-lg overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">Upload Your Data</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 pb-6 bg-white dark:bg-black">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center transition-colors hover:border-black dark:hover:border-white">
                <label htmlFor="file-upload" className="flex flex-col items-center justify-center cursor-pointer gap-2">
                  <div className="bg-black dark:bg-white p-3 rounded-full">
                    <FileUp className="h-6 w-6 text-white dark:text-black" />
                  </div>
                  <span className="text-base font-medium text-black dark:text-white">
                    Select CSV/Excel file
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
                    File must include columns for firstName, lastName, linkedin, and companyName
                  </span>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              {file && (
                <Alert className="bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-700">
                  <AlertDescription className="flex items-center text-sm font-medium text-black dark:text-white">
                    Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                disabled={isLoading || !file} 
                className="w-full py-6 bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black transition-colors font-medium relative overflow-hidden"
              >
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <motion.div 
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center justify-center gap-2 w-full"
                    >
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Processing your data...</span>
                    </motion.div>
                  ) : (
                    <motion.span
                      key="find"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      Find Emails
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </form>
          </CardContent>
          </Card>
        </motion.div>

        <AnimatePresence>
          {results && (
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="border-gray-200 dark:border-gray-800 shadow-lg overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-3 bg-black dark:bg-white text-white dark:text-black">
              <CardTitle className="text-xl">Results</CardTitle>
              <div className="flex gap-2">
                <Button 
                  onClick={verifyAllEmails} 
                  variant="outline" 
                  disabled={verifyingBatch}
                  className="bg-transparent hover:bg-gray-800 text-white border-white hover:border-white dark:bg-transparent dark:hover:bg-gray-200 dark:text-black dark:border-black dark:hover:border-black relative overflow-hidden"
                >
                  <AnimatePresence mode="wait">
                    {verifyingBatch ? (
                      <motion.div
                        key="verifying"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center justify-center gap-1"
                      >
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        <span>Verifying...</span>
                      </motion.div>
                    ) : (
                      <motion.span
                        key="verify"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        Verify All
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
                <Button onClick={downloadResults} variant="outline" className="bg-transparent hover:bg-gray-800 text-white border-white hover:border-white dark:bg-transparent dark:hover:bg-gray-200 dark:text-black dark:border-black dark:hover:border-black">
                  <Download className="mr-2 h-4 w-4" />Download CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0 bg-white dark:bg-black">
              <div className="bg-gray-100 dark:bg-gray-900 px-6 py-3 border-b border-gray-200 dark:border-gray-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-sm font-medium text-black dark:text-white">{results.filter(r => r.foundEmail).length} of {results.length} emails found</span>
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{Math.round((results.filter(r => r.foundEmail).length / results.length) * 100)}% success rate</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      placeholder="Search results..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-8 w-full sm:w-48 text-sm"
                    />
                    <div className="flex">
                      <Button 
                        size="sm" 
                        variant={filterStatus === 'all' ? 'default' : 'outline'}
                        onClick={() => setFilterStatus('all')}
                        className="h-8 text-xs rounded-l-md rounded-r-none"
                      >
                        All
                      </Button>
                      <Button 
                        size="sm" 
                        variant={filterStatus === 'verified' ? 'default' : 'outline'}
                        onClick={() => setFilterStatus('verified')}
                        className="h-8 text-xs rounded-none border-l-0 border-r-0"
                      >
                        Verified
                      </Button>
                      <Button 
                        size="sm" 
                        variant={filterStatus === 'unverified' ? 'default' : 'outline'}
                        onClick={() => setFilterStatus('unverified')}
                        className="h-8 text-xs rounded-none border-r-0"
                      >
                        Unverified
                      </Button>
                      <Button 
                        size="sm" 
                        variant={filterStatus === 'not-found' ? 'default' : 'outline'}
                        onClick={() => setFilterStatus('not-found')}
                        className="h-8 text-xs rounded-l-none rounded-r-md"
                      >
                        Not Found
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-black dark:bg-white text-white dark:text-black">
                      <TableHead className="text-xs font-semibold">Full Name</TableHead>
                      <TableHead className="text-xs font-semibold">Company</TableHead>
                      <TableHead className="text-xs font-semibold">Email</TableHead>
                      <TableHead className="text-xs font-semibold">Status</TableHead>
                      <TableHead className="text-xs font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResults().length > 0 ? (
                      filteredResults().map((record, index) => (
                        <TableRow key={index} className={index % 2 === 0 ? 'bg-white dark:bg-black' : 'bg-gray-50 dark:bg-gray-900'}>
                          <TableCell className="py-3 text-sm font-medium text-black dark:text-white">{record.firstName} {record.lastName}</TableCell>
                          <TableCell className="py-3 text-sm text-gray-600 dark:text-gray-400">{record.companyName}</TableCell>
                          <TableCell className="py-3">
                            {record.foundEmail ? (
                              <div>
                                <span className="font-mono text-sm bg-black dark:bg-white text-white dark:text-black px-2 py-1 rounded">{record.foundEmail}</span>
                                {record.personalEmails && record.personalEmails.length > 0 && (
                                  <div className="mt-1">
                                    <span className="text-xs text-muted-foreground">+{record.personalEmails.length} personal {record.personalEmails.length === 1 ? 'email' : 'emails'}</span>
                                  </div>
                                )}
                              </div>
                            ) : record.personalEmails && record.personalEmails.length > 0 ? (
                              <div>
                                <span className="font-mono text-sm bg-black dark:bg-white text-white dark:text-black px-2 py-1 rounded">{record.personalEmails[0]}</span>
                                {record.personalEmails.length > 1 && (
                                  <div className="mt-1">
                                    <span className="text-xs text-muted-foreground">+{record.personalEmails.length - 1} more {record.personalEmails.length === 2 ? 'email' : 'emails'}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-500 text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">Not Found</span>
                            )}
                          </TableCell>
                          <TableCell className="py-3">
                            {record.foundEmail ? (
                              <div>
                                {record.isVerified === true ? (
                                  <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded-full font-medium">
                                    Verified
                                  </span>
                                ) : record.isVerified === false ? (
                                  <span className="text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-2 py-1 rounded-full font-medium">
                                    Unverified
                                  </span>
                                ) : (
                                  <span className="text-xs bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 px-2 py-1 rounded-full font-medium">
                                    Unknown
                                  </span>
                                )}
                                {record.emailQuality && (
                                  <div className="mt-1">
                                    <span className="text-xs text-muted-foreground">
                                      {record.emailQuality === 'business' ? '🏢 Business' : '👤 Personal'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">N/A</span>
                            )}
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex flex-col sm:flex-row gap-2">
                              {record.foundEmail && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-xs h-8 relative overflow-hidden"
                                  onClick={() => verifyEmail(record.foundEmail!, index)}
                                  disabled={verifyingEmail?.index === index}
                                >
                                  <AnimatePresence mode="wait">
                                    {verifyingEmail?.index === index ? (
                                      <motion.div
                                        key="verifying-single"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="flex items-center justify-center gap-1"
                                      >
                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                        <span>Verifying...</span>
                                      </motion.div>
                                    ) : (
                                      <motion.span
                                        key="verify-single"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                      >
                                        Verify Email
                                      </motion.span>
                                    )}
                                  </AnimatePresence>
                                </Button>
                              )}
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-xs h-8 relative overflow-hidden"
                                onClick={() => retryFindEmail(record, index)}
                                disabled={retryingEmail?.index === index}
                              >
                                <AnimatePresence mode="wait">
                                  {retryingEmail?.index === index ? (
                                    <motion.div
                                      key="retrying"
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      exit={{ opacity: 0 }}
                                      className="flex items-center justify-center gap-1"
                                    >
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      <span>Retrying...</span>
                                    </motion.div>
                                  ) : (
                                    <motion.span
                                      key="retry"
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      exit={{ opacity: 0 }}
                                    >
                                      Retry Lookup
                                    </motion.span>
                                  )}
                                </AnimatePresence>
                              </Button>
                            </div>
                            {record.retryCount && (
                              <div className="mt-1">
                                <span className="text-xs text-muted-foreground">Retried {record.retryCount} {record.retryCount === 1 ? 'time' : 'times'}</span>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-sm text-gray-500">
                          {results.length > 0 ? 'No results match your filters' : 'No results found'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="py-4 flex justify-center border-t border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900">
              <Link href="/email" className="inline-flex items-center text-sm text-black hover:text-gray-700 dark:text-white dark:hover:text-gray-300">
                <ArrowLeft className="h-4 w-4 mr-1" />Switch to Single Email Lookup
              </Link>
            </CardFooter>
            </Card>
          </motion.div>
        )}
        </AnimatePresence>
      </motion.div>
    </>
  );
};

export default BulkFindEmailPage;
