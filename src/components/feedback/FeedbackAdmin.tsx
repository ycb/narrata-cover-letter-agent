import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Download, RefreshCw } from 'lucide-react';
import { feedbackService } from '@/services/feedbackService';
import { FeedbackData } from '@/types/feedback';

export const FeedbackAdmin: React.FC = () => {
  const [submissions, setSubmissions] = useState<FeedbackData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleFormsConfigured, setIsGoogleFormsConfigured] = useState(false);

  useEffect(() => {
    loadSubmissions();
    setIsGoogleFormsConfigured(feedbackService.isGoogleFormsConfigured());
  }, []);

  const loadSubmissions = () => {
    setIsLoading(true);
    try {
      const data = feedbackService.getSubmissions();
      setSubmissions(data);
    } catch (error) {
      console.error('Error loading submissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearSubmissions = () => {
    if (confirm('Are you sure you want to clear all submissions?')) {
      feedbackService.clearSubmissions();
      setSubmissions([]);
    }
  };

  const exportToCSV = () => {
    if (submissions.length === 0) {
      alert('No submissions to export');
      return;
    }

    const headers = [
      'Timestamp',
      'Page URL',
      'Category',
      'Sentiment',
      'Message',
      'Email',
      'Click Location',
      'User Agent'
    ];

    const csvContent = [
      headers.join(','),
      ...submissions.map(submission => [
        new Date(submission.timestamp).toLocaleString(),
        submission.pageUrl,
        submission.category,
        submission.sentiment,
        `"${submission.message.replace(/"/g, '""')}"`, // Escape quotes
        submission.email || 'No email',
        `${submission.clickLocation.x}, ${submission.clickLocation.y}`,
        `"${submission.userAgent.replace(/"/g, '""')}"` // Escape quotes
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feedback-submissions-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'bug': return 'bg-red-100 text-red-800';
      case 'suggestion': return 'bg-blue-100 text-blue-800';
      case 'praise': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSentimentEmoji = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return '😊';
      case 'neutral': return '😐';
      case 'negative': return '😞';
      default: return '😐';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Feedback Admin</h1>
          <p className="text-muted-foreground">
            View and manage feedback submissions
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={loadSubmissions}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={exportToCSV}
            disabled={submissions.length === 0}
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button
            onClick={clearSubmissions}
            disabled={submissions.length === 0}
            variant="destructive"
            size="sm"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isGoogleFormsConfigured ? 'bg-green-500' : 'bg-yellow-500'}`} />
          <span className="text-sm font-medium">
            Google Forms: {isGoogleFormsConfigured ? 'Configured' : 'Not Configured'}
          </span>
        </div>
        <div className="text-sm text-muted-foreground">
          {submissions.length} submission{submissions.length !== 1 ? 's' : ''} stored
        </div>
      </div>

      {submissions.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-muted-foreground mb-2">No feedback submissions yet</p>
              <p className="text-sm text-muted-foreground">
                Use the feedback button to submit some feedback and see it here
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {submissions.map((submission, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {new Date(submission.timestamp).toLocaleString()}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={getCategoryColor(submission.category)}>
                      {submission.category}
                    </Badge>
                    <span className="text-2xl">
                      {getSentimentEmoji(submission.sentiment)}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-medium mb-1">Message:</p>
                  <p className="text-muted-foreground">{submission.message}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Page URL:</p>
                    <p className="text-muted-foreground break-all">{submission.pageUrl}</p>
                  </div>
                  <div>
                    <p className="font-medium">Email:</p>
                    <p className="text-muted-foreground">
                      {submission.email || 'No email provided'}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Click Location:</p>
                    <p className="text-muted-foreground">
                      X: {submission.clickLocation.x}, Y: {submission.clickLocation.y}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">User Agent:</p>
                    <p className="text-muted-foreground text-xs break-all">
                      {submission.userAgent}
                    </p>
                  </div>
                </div>

                {submission.screenshot && (
                  <div>
                    <p className="font-medium mb-2">Screenshot:</p>
                    <img
                      src={submission.screenshot}
                      alt="Feedback screenshot"
                      className="max-w-full h-32 object-cover rounded border"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
