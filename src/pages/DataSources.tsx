import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  Plus
} from "lucide-react";
import { Link as RouterLink } from "react-router-dom";

export default function DataSources() {


  // Mock data for data sources - matching Assessment Data Sources content
  const mockDataSources = [
    {
      id: "ds-1",
      title: "LinkedIn",
      type: "linkedin",
      status: "connected",
      value: "Connected",
      color: "success"
    },
    {
      id: "ds-2",
      title: "Resume",
      type: "resume",
      status: "uploaded",
      value: "Uploaded",
      color: "success"
    },
    {
      id: "ds-3",
      title: "Outcome Metrics",
      type: "metrics",
      status: "active",
      value: "5",
      color: "success"
    },
    {
      id: "ds-4",
      title: "Stories",
      type: "stories",
      status: "active",
      value: "47",
      color: "success"
    },
    {
      id: "ds-5",
      title: "External Links",
      type: "links",
      status: "active",
      value: "3",
      color: "success"
    }
  ];













  const handleCreateNew = () => {
    // TODO: Implement create new data source
    console.log("Create new data source");
  };



  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Data Sources</h1>
              <p className="text-muted-foreground">Manage and track your professional data sources</p>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" asChild>
                <RouterLink to="/assessment">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Assessment
                </RouterLink>
              </Button>
              <Button onClick={handleCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                Add Data Source
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Overview - Using Cover Letters widget styling */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          {mockDataSources.map((source) => (
            <Card key={source.id} className="shadow-soft">
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <div className={`h-2 w-2 rounded-full bg-${source.color}`}></div>
                    <span className="text-xs text-muted-foreground">{source.title}</span>
                  </div>
                  <div className="text-sm font-medium">{source.value}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Next Steps Section - Matching Assessment content */}
        <Card className="shadow-soft mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row items-center md:justify-end gap-4">
              <p className="text-sm text-muted-foreground text-right w-full md:w-auto">
                Improve your skills with more evidence
              </p>
              <Button 
                variant="secondary" 
                size="sm" 
                className="whitespace-nowrap"
                onClick={() => {
                  // TODO: Implement navigation to work history with appropriate tab
                  console.log("Navigate to work history");
                }}
              >
                Add External Links
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Data Sources are displayed in the 5-widget grid above */}
      </main>
    </div>
  );
}
