/**
 * Job type filter dropdown for Evals dashboard
 */

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface JobTypeFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function JobTypeFilter({ value, onChange }: JobTypeFilterProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="All job types" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Job Types</SelectItem>
        <SelectItem value="coverLetter">Cover Letter</SelectItem>
        <SelectItem value="pmLevels">PM Levels</SelectItem>
      </SelectContent>
    </Select>
  );
}

