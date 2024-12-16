import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { useTheme } from '~/components/theme';
import { CircleUser } from 'lucide-react';
import { authClient } from '~/lib/auth-client';
import { Link } from '@tanstack/react-router';

export function UserMenu() {
  const { value: theme, set: setTheme } = useTheme();
  const session = authClient.useSession();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-full">
          <CircleUser className="h-5 w-5" />
          <span className="sr-only">Toggle user menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {session.data && <DropdownMenuItem>Settings</DropdownMenuItem>}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Color Theme</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={theme}
              onValueChange={setTheme as (theme: string) => void}
            >
              <DropdownMenuRadioItem indicator="checkmark" value="light">
                Light
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem indicator="checkmark" value="dark">
                Dark
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem indicator="checkmark" value="system">
                System
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        {session.data ? (
          <DropdownMenuItem>Log out</DropdownMenuItem>
        ) : (
          <DropdownMenuItem asChild>
            <Link to="/login">Log in</Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
