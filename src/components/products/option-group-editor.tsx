import { Plus, Trash2 } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OptionGroup } from '@/components/products/types';
import { OptionValueEditor } from '@/components/products/option-value-editor';

interface OptionGroupEditorProps {
  groups: OptionGroup[];
  onChange: (groups: OptionGroup[]) => void;
}

export function OptionGroupEditor({ groups, onChange }: OptionGroupEditorProps) {
  const addGroup = () => {
    if (groups.length >= 3) return;

    onChange([
      ...groups,
      {
        id: crypto.randomUUID(),
        name: '',
        values: [],
      },
    ]);
  };

  const updateGroup = (groupId: string, patch: Partial<OptionGroup>) => {
    onChange(groups.map((group) => (group.id === groupId ? { ...group, ...patch } : group)));
  };

  const removeGroup = (groupId: string) => {
    onChange(groups.filter((group) => group.id !== groupId));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Option Group Editor</CardTitle>
            <CardDescription>Define variant options like Color, Size, and Material (max 3).</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addGroup} disabled={groups.length >= 3}>
            <Plus className="mr-2 h-4 w-4" />
            Add option
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">Add at least one option group to generate variants.</p>
        ) : (
          groups.map((group, index) => (
            <div key={group.id} className="space-y-3 rounded-md border p-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 space-y-2">
                  <Label htmlFor={`option-name-${group.id}`}>Option {index + 1} name</Label>
                  <Input
                    id={`option-name-${group.id}`}
                    placeholder="Color"
                    value={group.name}
                    onChange={(event) => updateGroup(group.id, { name: event.target.value })}
                  />
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeGroup(group.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Option values</Label>
                <OptionValueEditor values={group.values} onChange={(values) => updateGroup(group.id, { values })} />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
