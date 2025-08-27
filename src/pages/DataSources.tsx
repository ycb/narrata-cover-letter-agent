import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  BarChart3, 
  Mail, 
  Plus, 
  Search, 
  Linkedin,
  FileText,
  TrendingUp,
  Link,
  BookOpen,
  CheckCircle,
  Clock,
  Trophy,
  MoreHorizontal
} from "lucide-react";
import { Link as RouterLink } from "react-router-dom";

export default function DataSources() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Mock data for data sources
  const mockDataSources = [
    {
      id: "ds-1",
      title: "LinkedIn Profile",
      type: "linkedin",
      status: "connected",
      strength: "strong",
      lastUpdated: "2024-01-15T10:30:00Z",
      metrics: {
        connections: 847,
        endorsements: 156,
        recommendations: 23
      }
    },
    {
      id: "ds-2",
      title: "Resume & CV",
      type: "resume",
      status: "uploaded",
      strength: "strong",
      lastUpdated: "2024-01-12T14:20:00Z",
      metrics: {
        sections: 8,
        keywords: 45,
        atsScore: 92
      }
    },
    {
      id: "ds-3",
      title: "Work History Stories",
      type: "stories",
      status: "active",
      strength: "average",
      lastUpdated: "2024-01-10T09:15:00Z",
      metrics: {
        totalStories: 47,
        completed: 42,
        pending: 5
      }
    },
    {
      id: "ds-4",
      title: "External Links & Evidence",
      type: "links",
      status: "active",
      strength: "weak",
      lastUpdated: "2024-01-08T11:00:00Z",
      metrics: {
        totalLinks: 3,
        verified: 2,
        pending: 1
      }
    }
  ];

  const filteredDataSources = mockDataSources.filter(source => {
    const matchesSearch = source.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         source.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || source.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
      case "uploaded":
        return "bg-success text-success-foreground";
      case "active":
        return "bg-primary text-primary-foreground";
      case "pending":
        return "bg-warning text-warning-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
      case "uploaded":
        return <CheckCircle className="h-3 w-3" />;
      case "active":
        return <TrendingUp className="h-3 w-3" />;
      case "pending":
        return <Clock className="h-3 w-3" />;
      default:
        return <MoreHorizontal className="h-3 w-3" />;
    }
  };

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case "strong":
        return "bg-success text-success-foreground";
      case "average":
        return "bg-warning text-warning-foreground";
      case "weak":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "linkedin":
        return <Linkedin className="h-4 w-4" />;
      case "resume":
        return <FileText className="h-4 w-4" />;
      case "stories":
        return <BookOpen className="h-4 w-4" />;
      case "links":
        return <Link className="h-4 w-4" />;
      default:
        return <BarChart3 className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCreateNew = () => {
    // TODO: Implement create new data source
    console.log("Create new data source");
  };

  const handleEdit = (source: any) => {
    // TODO: Implement edit data source
    console.log("Edit data source:", source);
  };

  const handleDelete = (source: any) => {
    // TODO: Implement delete data source
    console.log("Delete data source:", source);
  };

  const handleCopy = (source: any) => {
    // TODO: Implement copy data source
    console.log("Copy data source:", source);
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

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="shadow-soft">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sources</p>
                  <p className="text-2xl font-bold">{mockDataSources.length}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-soft">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Strong Sources</p>
                  <p className="text-2xl font-bold">{mockDataSources.filter(ds => ds.strength === 'strong').length}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-soft">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Sources</p>
                  <p className="text-2xl font-bold">{mockDataSources.filter(ds => ds.status === 'active').length}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-warning" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-soft">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Profile Strength</p>
                  <p className="text-2xl font-bold">Strong</p>
                </div>
                <Trophy className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search data sources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("all")}
            >
              All
            </Button>
            <Button
              variant={statusFilter === "active" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("active")}
            >
              Active
            </Button>
            <Button
              variant={statusFilter === "connected" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("connected")}
            >
              Connected
            </Button>
          </div>
        </div>

        {/* Data Sources Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredDataSources.map((source) => (
            <Card key={source.id} className="shadow-soft hover:shadow-medium transition-all duration-200">
              <CardHeader className="pb-3">
                {/* Header: Title + Status + Menu */}
                <div className="flex items-center justify-between mb-4">
                  <CardTitle className="text-lg truncate">{source.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(source.status)}>
                      {getStatusIcon(source.status)}
                      <span className="ml-1 capitalize">{source.status}</span>
                    </Badge>
                    
                    <Badge className={getStrengthColor(source.strength)}>
                      {source.strength}
                    </Badge>
                  </div>
                </div>
                
                {/* 2-Column Region: Type/Strength | Last Updated */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Left Column: Type + Strength */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {getTypeIcon(source.type)}
                      {source.type.charAt(0).toUpperCase() + source.type.slice(1)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Trophy className="h-3 w-3" />
                      {source.strength} strength
                    </div>
                  </div>
                  
                  {/* Right Column: Last Updated */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Updated {formatDate(source.lastUpdated)}
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {/* Metrics */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-2 bg-muted/20 rounded">
                    <div className="text-lg font-bold text-primary">
                      {source.type === 'linkedin' ? source.metrics.connections :
                       source.type === 'resume' ? source.metrics.sections :
                       source.type === 'stories' ? source.metrics.totalStories :
                       source.metrics.totalLinks}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {source.type === 'linkedin' ? 'Connections' :
                       source.type === 'resume' ? 'Sections' :
                       source.type === 'stories' ? 'Stories' :
                       'Links'}
                    </div>
                  </div>
                  <div className="text-center p-2 bg-muted/20 rounded">
                    <div className="text-lg font-bold text-success capitalize">
                      {source.type === 'linkedin' ? source.metrics.endorsements :
                       source.type === 'resume' ? source.metrics.keywords :
                       source.type === 'stories' ? source.metrics.completed :
                       source.metrics.verified}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {source.type === 'linkedin' ? 'Endorsements' :
                       source.type === 'resume' ? 'Keywords' :
                       source.type === 'stories' ? 'Completed' :
                       'Verified'}
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(source)}
                    className="flex-1"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(source)}
                    className="flex-1"
                  >
                    <MoreHorizontal className="h-4 w-4 mr-1" />
                    Manage
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredDataSources.length === 0 && (
          <Card className="shadow-soft">
            <CardContent className="text-center py-12">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No data sources found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== "all" 
                  ? "Try adjusting your search or filters"
                  : "Add your first data source to get started"
                }
              </p>
              {!searchTerm && statusFilter === "all" && (
                <Button onClick={handleCreateNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Data Source
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
