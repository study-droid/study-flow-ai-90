import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Trash2, 
  Edit, 
  TestTube, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  XCircle, 
  Clock,
  Brain,
  Cpu,
  Sparkles,
  Globe,
  ExternalLink,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { userAIConnectionsService, UserAIConnection, CreateConnectionData, TestConnectionResult } from '@/services/user-mcp/user-ai-connections';
import { AIProvider } from '@/services/mcp/mcp-client';

export function AIConnectionsManager() {
  const [connections, setConnections] = useState<UserAIConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('claude');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<UserAIConnection | null>(null);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  
  const [createForm, setCreateForm] = useState({
    provider: 'claude' as AIProvider,
    connection_name: '',
    api_key: ''
  });

  const [editForm, setEditForm] = useState({
    connection_name: '',
    api_key: ''
  });

  const { toast } = useToast();

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      setIsLoading(true);
      const userConnections = await userAIConnectionsService.getUserConnections();
      setConnections(userConnections);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load AI connections',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getProviderIcon = (provider: AIProvider) => {
    switch (provider) {
      case 'claude': return <Brain className="h-4 w-4" />;
      case 'openai': return <Cpu className="h-4 w-4" />;
      case 'gemini': return <Sparkles className="h-4 w-4" />;
      case 'perplexity': return <Globe className="h-4 w-4" />;
    }
  };

  const getProviderColor = (provider: AIProvider) => {
    switch (provider) {
      case 'claude': return 'bg-orange-500';
      case 'openai': return 'bg-green-500';
      case 'gemini': return 'bg-blue-500';
      case 'perplexity': return 'bg-purple-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleCreateConnection = async () => {
    try {
      if (!createForm.connection_name || !createForm.api_key) {
        toast({
          title: 'Missing Information',
          description: 'Please fill in all required fields',
          variant: 'destructive'
        });
        return;
      }

      await userAIConnectionsService.createConnection(createForm);
      
      toast({
        title: 'Success',
        description: `${createForm.provider} connection created successfully`,
      });

      setCreateForm({ provider: 'claude', connection_name: '', api_key: '' });
      setIsCreateDialogOpen(false);
      await loadConnections();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create connection',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateConnection = async () => {
    try {
      if (!editingConnection) return;

      await userAIConnectionsService.updateConnection(editingConnection.id, editForm);
      
      toast({
        title: 'Success',
        description: 'Connection updated successfully',
      });

      setEditForm({ connection_name: '', api_key: '' });
      setIsEditDialogOpen(false);
      setEditingConnection(null);
      await loadConnections();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update connection',
        variant: 'destructive'
      });
    }
  };

  const handleTestConnection = async (connectionId: string) => {
    try {
      setTestingConnection(connectionId);
      const result = await userAIConnectionsService.retestConnection(connectionId);
      
      toast({
        title: result.success ? 'Connection Successful' : 'Connection Failed',
        description: result.success 
          ? `Successfully connected to ${result.provider}` 
          : result.error,
        variant: result.success ? 'default' : 'destructive'
      });

      await loadConnections();
    } catch (error) {
      toast({
        title: 'Test Failed',
        description: error instanceof Error ? error.message : 'Failed to test connection',
        variant: 'destructive'
      });
    } finally {
      setTestingConnection(null);
    }
  };

  const handleToggleConnection = async (connectionId: string, isActive: boolean) => {
    try {
      await userAIConnectionsService.toggleConnection(connectionId, isActive);
      await loadConnections();
      
      toast({
        title: 'Success',
        description: `Connection ${isActive ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to toggle connection',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteConnection = async (connectionId: string) => {
    try {
      await userAIConnectionsService.deleteConnection(connectionId);
      await loadConnections();
      
      toast({
        title: 'Success',
        description: 'Connection deleted successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete connection',
        variant: 'destructive'
      });
    }
  };

  const openEditDialog = (connection: UserAIConnection) => {
    setEditingConnection(connection);
    setEditForm({
      connection_name: connection.connection_name,
      api_key: '' // Don't pre-fill API key for security
    });
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI Provider Connections
              </CardTitle>
              <CardDescription>
                Connect your personal AI provider accounts to use in StudyFlow AI
              </CardDescription>
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Connection
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add AI Provider Connection</DialogTitle>
                  <DialogDescription>
                    Connect your personal AI account to use in StudyFlow
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="provider">AI Provider</Label>
                    <Select value={createForm.provider} onValueChange={(value) => 
                      setCreateForm({ ...createForm, provider: value as AIProvider })
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="claude">
                          <div className="flex items-center gap-2">
                            <Brain className="h-4 w-4" />
                            Claude AI (Anthropic)
                          </div>
                        </SelectItem>
                        <SelectItem value="openai">
                          <div className="flex items-center gap-2">
                            <Cpu className="h-4 w-4" />
                            ChatGPT (OpenAI)
                          </div>
                        </SelectItem>
                        <SelectItem value="gemini">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            Gemini (Google)
                          </div>
                        </SelectItem>
                        <SelectItem value="perplexity">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            Perplexity AI
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="connection-name">Connection Name</Label>
                    <Input
                      id="connection-name"
                      placeholder="My Claude Account"
                      value={createForm.connection_name}
                      onChange={(e) => setCreateForm({ ...createForm, connection_name: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="api-key">API Key</Label>
                    <div className="relative">
                      <Input
                        id="api-key"
                        type={showApiKey ? "text" : "password"}
                        placeholder="sk-..."
                        value={createForm.api_key}
                        onChange={(e) => setCreateForm({ ...createForm, api_key: e.target.value })}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="mt-1">
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        onClick={() => {
                          const providerInfo = userAIConnectionsService.getProviderInfo(createForm.provider);
                          window.open(providerInfo.setupUrl, '_blank');
                        }}
                      >
                        Get API Key <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Your API key will be encrypted and stored securely. Only you can access your connections.
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateConnection} className="flex-1">
                      Create Connection
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading connections...</span>
            </div>
          ) : connections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No AI connections configured</p>
              <p className="text-sm">Add your first AI provider connection to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {connections.map((connection) => (
                <Card key={connection.id} className="relative">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full ${getProviderColor(connection.provider)} flex items-center justify-center`}>
                          {getProviderIcon(connection.provider)}
                        </div>
                        <div>
                          <h3 className="font-medium">{connection.connection_name}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {userAIConnectionsService.getProviderInfo(connection.provider).name}
                            </Badge>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(connection.test_status)}
                              <span>{connection.test_status}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right text-sm text-muted-foreground">
                          <div>Used {connection.usage_count} times</div>
                          {connection.last_tested_at && (
                            <div>
                              Tested {new Date(connection.last_tested_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>

                        <Switch
                          checked={connection.is_active}
                          onCheckedChange={(checked) => handleToggleConnection(connection.id, checked)}
                        />

                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleTestConnection(connection.id)}
                          disabled={testingConnection === connection.id}
                        >
                          {testingConnection === connection.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <TestTube className="h-4 w-4" />
                          )}
                        </Button>

                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openEditDialog(connection)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDeleteConnection(connection.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {connection.test_error && (
                      <Alert className="mt-3" variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {connection.test_error}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Connection Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Connection</DialogTitle>
            <DialogDescription>
              Update your AI provider connection details
            </DialogDescription>
          </DialogHeader>
          
          {editingConnection && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-connection-name">Connection Name</Label>
                <Input
                  id="edit-connection-name"
                  value={editForm.connection_name}
                  onChange={(e) => setEditForm({ ...editForm, connection_name: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="edit-api-key">API Key (leave empty to keep current)</Label>
                <div className="relative">
                  <Input
                    id="edit-api-key"
                    type={showApiKey ? "text" : "password"}
                    placeholder="Enter new API key to update"
                    value={editForm.api_key}
                    onChange={(e) => setEditForm({ ...editForm, api_key: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateConnection} className="flex-1">
                  Update Connection
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}