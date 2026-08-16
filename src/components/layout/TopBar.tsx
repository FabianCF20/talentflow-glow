import { Link } from "@tanstack/react-router";
import { Menu, Moon, Sun, LogOut, User, KeyRound } from "lucide-react";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationsMenu } from "./NotificationsMenu";
import { useTheme } from "@/lib/theme";
import { CURRENT_USER } from "@/data/mock";
import { ROLE_LABEL } from "@/config/roles";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TopBar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur lg:px-6">
      <button
        onClick={onOpenMobileNav}
        aria-label="Abrir menú"
        className="grid size-9 place-items-center rounded-md border border-input bg-card text-muted-foreground lg:hidden"
      >
        <Menu className="size-4.5" />
      </button>

      <div className="flex-1">
        <GlobalSearch />
      </div>

      <button
        onClick={toggleTheme}
        aria-label="Cambiar tema"
        className="grid size-9 place-items-center rounded-md border border-input bg-card text-muted-foreground transition-colors hover:text-foreground"
      >
        {theme === "dark" ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
      </button>

      <NotificationsMenu />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2.5 rounded-md border border-input bg-card py-1 pl-1 pr-2.5 text-left transition-colors hover:border-ring">
            <span className="grid size-7 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {CURRENT_USER.iniciales}
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-xs font-semibold text-foreground">
                {CURRENT_USER.nombres} {CURRENT_USER.apellidos}
              </span>
              <span className="block text-[11px] text-muted-foreground">
                {ROLE_LABEL[CURRENT_USER.roles[0]]}
              </span>
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            {CURRENT_USER.email}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <User className="size-4" /> Mi perfil
          </DropdownMenuItem>
          <DropdownMenuItem>
            <KeyRound className="size-4" /> Cambiar contraseña
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/login">
              <LogOut className="size-4" /> Cerrar sesión
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
