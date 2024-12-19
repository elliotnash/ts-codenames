import { createFileRoute, Link } from '@tanstack/react-router';
import { Check, ChevronsUpDown, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { GridBG } from '~/components/background';
import { Button } from '~/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '~/components/ui/command';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import { Separator } from '~/components/ui/separator';
import { cn } from '~/lib/utils';

export const Route = createFileRoute('/create')({
  component: RouteComponent,
});

// Mock data for buckets
const mockBuckets = [
  { id: '1', label: 'Standard' },
  { id: '2', label: 'Pop Culture' },
  { id: '3', label: 'Science' },
  { id: '4', label: 'History' },
  { id: '5', label: 'Custom 1' },
];

function RouteComponent() {
  const [open, setOpen] = useState(false);
  const [selectedBucket, setSelectedBucket] = useState('');
  const [startingTeam, setStartingTeam] = useState('red');
  const [gameCode, setGameCode] = useState('a');
  const [isGameCodeAvailable, setIsGameCodeAvailable] = useState(true);

  const handleGameCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGameCode(e.target.value);
    setIsGameCodeAvailable(e.target.value === 'hi');
  };

  const handleCreateNewBucket = () => {
    // Implement the logic to create a new bucket
    console.log('Create new bucket');
    setOpen(false);
  };

  return (
    <main className="container mx-auto p-4 min-h-screen flex flex-col items-center justify-center">
      <GridBG />
      <div className="w-full max-w-md space-y-8">
        <h2 className="text-center text-3xl font-bold tracking-tight">Create New Game</h2>

        <div className="space-y-4">
          <div>
            <Label htmlFor="bucket-select">Select Bucket</Label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  // biome-ignore lint/a11y/useSemanticElements:
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between mt-2"
                >
                  {selectedBucket
                    ? mockBuckets.find((bucket) => bucket.id === selectedBucket)?.label
                    : 'Select bucket...'}
                  <ChevronsUpDown className="opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <Command>
                  <CommandInput placeholder="Search framework..." className="h-9" />
                  <CommandList>
                    <CommandEmpty>No bucket found.</CommandEmpty>
                    <CommandGroup>
                      {mockBuckets.map((bucket) => (
                        <CommandItem
                          key={bucket.id}
                          value={bucket.label}
                          onSelect={() => {
                            setSelectedBucket(bucket.id === selectedBucket ? '' : bucket.id);
                            setOpen(false);
                          }}
                        >
                          {bucket.label}
                          <Check
                            className={cn(
                              'ml-auto',
                              selectedBucket === bucket.id ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label>Starting Team</Label>
            <RadioGroup
              value={startingTeam}
              onValueChange={setStartingTeam}
              className="flex space-x-4 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem className="text-card-red border-card-red" value="red" id="red" />
                <Label htmlFor="red">Red</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  className="text-card-blue border-card-blue"
                  value="blue"
                  id="blue"
                />
                <Label htmlFor="blue">Blue</Label>
              </div>
            </RadioGroup>
          </div>
          <div>
            <Label htmlFor="game-code">Game Code</Label>
            <div className="relative mt-2">
              <Input
                id="game-code"
                value={gameCode}
                onChange={handleGameCodeChange}
                placeholder="Enter game code"
              />
              {gameCode &&
                (isGameCodeAvailable ? (
                  <Check className="absolute right-2 top-2.5 h-4 w-4 text-green-500" />
                ) : (
                  <X className="absolute right-2 top-2.5 h-4 w-4 text-red-500" />
                ))}
            </div>
          </div>

          <Button className="w-full">Create Game</Button>
        </div>

        <Separator />

        <div className="text-center">
          <Button asChild variant="link">
            <Link to="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
