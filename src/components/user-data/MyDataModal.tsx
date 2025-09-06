import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DATA_SOURCES } from '@/types/dataSources';
import { CheckCircle, XCircle, Clock, AlertCircle, Settings, Link, Unlink } from 'lucide-react';

interface MyDataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MyDataModal({ isOpen, onClose }: MyDataModalProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'disconnected':
        return <XCircle className="h-4 w-4 text-gray-400" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge variant="default" className="bg-green-100 text-green-800">Connected</Badge>;
      case 'disconnected':
        return <Badge variant="outline">Not Connected</Badge>;
      case 'pending':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getActionButton = (source: any) => {
    switch (source.action) {
      case 'connect':
        return (
          <Button size="sm" variant="default">
            <Link className="h-4 w-4 mr-2" />
            Connect
          </Button>
        );
      case 'disconnect':
        return (
          <Button size="sm" variant="outline">
            <Unlink className="h-4 w-4 mr-2" />
            Disconnect
          </Button>
        );
      case 'configure':
        return (
          <Button size="sm" variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
        );
      default:
        return null;
    }
  };

  const formatLastSync = (lastSync?: string) => {
    if (!lastSync) return null;
    const date = new Date(lastSync);
    return `Last synced ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>My Data</DialogTitle>
          <DialogDescription>
            Manage your connected data sources and integrations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {DATA_SOURCES.map((source, index) => (
            <div key={source.id}>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(source.status)}
                    <div>
                      <h3 className="font-medium">{source.name}</h3>
                      <p className="text-sm text-muted-foreground">{source.description}</p>
                      {source.lastSync && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatLastSync(source.lastSync)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {getStatusBadge(source.status)}
                  {getActionButton(source)}
                </div>
              </div>
              {index < DATA_SOURCES.length - 1 && <Separator className="my-4" />}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-6">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
