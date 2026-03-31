import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { SortAsc, SortDesc } from 'lucide-react';
import type { ListSortKey, SortDir } from '../lib/listSort';

interface ListSortControlsProps {
  sortBy: ListSortKey;
  sortDir: SortDir;
  onSortByChange: (v: ListSortKey) => void;
  onSortDirToggle: () => void;
  nameLabel?: string;
}

export function ListSortControls({
  sortBy,
  sortDir,
  onSortByChange,
  onSortDirToggle,
  nameLabel = 'Alphabetical',
}: ListSortControlsProps) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <Select value={sortBy} onValueChange={(v) => onSortByChange(v as ListSortKey)}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="name">{nameLabel}</SelectItem>
          <SelectItem value="createdAt">Created date</SelectItem>
          <SelectItem value="createdBy">Created by</SelectItem>
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={onSortDirToggle}
        title={sortDir === 'asc' ? 'Ascending — click for descending' : 'Descending — click for ascending'}
      >
        {sortDir === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
      </Button>
    </div>
  );
}
