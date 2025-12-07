/**
 * Token & Cost Overview Card
 * 
 * Displays total tokens used and estimated costs across all LLM calls
 */

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, DollarSign, Coins } from 'lucide-react';

interface TokenCostData {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCost: number;
  byModel: {
    model: string;
    tokens: number;
    cost: number;
  }[];
}

interface TokenCostCardProps {
  data: TokenCostData | null;
  loading?: boolean;
}

// Approximate costs per 1M tokens (as of Dec 2024)
const MODEL_COSTS = {
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.150, output: 0.600 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
} as const;

export function TokenCostCard({ data, loading }: TokenCostCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Token Usage & Costs
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.totalTokens === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Token Usage & Costs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No token usage data available for the selected period
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Token Usage & Costs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Total Overview */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Coins className="h-4 w-4" />
                Total Tokens
              </div>
              <div className="text-2xl font-bold">
                {data.totalTokens.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {data.promptTokens.toLocaleString()} input + {data.completionTokens.toLocaleString()} output
              </div>
            </div>
            
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                Estimated Cost
              </div>
              <div className="text-2xl font-bold text-green-600">
                ${data.estimatedCost.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                ~${(data.estimatedCost / (data.totalTokens / 1000000)).toFixed(2)}/1M tokens
              </div>
            </div>
          </div>

          {/* By Model Breakdown */}
          {data.byModel && data.byModel.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3">By Model</h4>
              <div className="space-y-2">
                {data.byModel.map((model) => (
                  <div key={model.model} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{model.model}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {model.tokens.toLocaleString()} tokens
                      </span>
                      <span className="font-medium text-green-600">
                        ${model.cost.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export { MODEL_COSTS };

