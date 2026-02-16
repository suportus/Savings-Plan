import { useState } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useGetCallerUserProfile, useUpdateThemePreference, useUpdateUserCurrency, useUpdateUserName } from '../hooks/useQueries';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User, Info, Sun, Moon, BarChart3, Pencil } from 'lucide-react';
import { useTheme } from 'next-themes';
import AboutShareModal from './AboutShareModal';
import StatisticsModal from './StatisticsModal';
import { ThemePreference, Currency } from '../backend';
import { Input } from '@/components/ui/input';

export default function Header() {
  const { login, clear, loginStatus, identity } = useInternetIdentity();
  const { data: userProfile } = useGetCallerUserProfile();
  const queryClient = useQueryClient();
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showStatisticsModal, setShowStatisticsModal] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const { theme, setTheme } = useTheme();
  const { mutate: updateThemePreference } = useUpdateThemePreference();
  const { mutate: updateCurrency } = useUpdateUserCurrency();
  const { mutate: updateName } = useUpdateUserName();

  const isAuthenticated = !!identity;
  const disabled = loginStatus === 'logging-in';

  const handleAuth = async () => {
    if (isAuthenticated) {
      // Clear all cached data before logout
      await clear();
      queryClient.clear();
    } else {
      try {
        await login();
      } catch (error: any) {
        console.error('Login error:', error);
        if (error.message === 'User is already authenticated') {
          await clear();
          setTimeout(() => login(), 300);
        }
      }
    }
  };

  const handleLogout = async () => {
    // Clear all cached application data on logout
    await clear();
    queryClient.clear();
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    
    // Sync with backend if authenticated
    if (isAuthenticated) {
      updateThemePreference(newTheme === 'dark' ? ThemePreference.dark : ThemePreference.light);
    }
  };

  const handleCurrencyChange = (newCurrency: Currency) => {
    if (isAuthenticated && userProfile) {
      updateCurrency(newCurrency);
    }
  };

  const startEditingName = () => {
    if (userProfile) {
      setEditedName(userProfile.name);
      setIsEditingName(true);
    }
  };

  const handleNameSave = () => {
    if (editedName.trim() && editedName !== userProfile?.name) {
      updateName(editedName.trim(), {
        onSuccess: () => {
          setIsEditingName(false);
        },
      });
    } else {
      setIsEditingName(false);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50 transition-colors duration-300">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src="https://nar7q-4iaaa-aaaao-qksbq-cai.raw.icp0.io/Caffeine/pictures/Savingsplan.png" 
                alt="Savings Plan Logo" 
                className="w-10 h-10 rounded-lg object-contain"
              />
              <div>
                <h1 className="text-xl font-bold">Savings Plan</h1>
                <p className="text-xs text-muted-foreground">Track Your Goals</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {isAuthenticated && userProfile ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-background">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-emerald-500 text-white text-xs">
                          {getInitials(userProfile.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium hidden sm:inline">{userProfile.name}</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="end" 
                    className="w-56 profile-menu-glass border-profile-menu animate-in fade-in-0 zoom-in-95"
                  >
                    <div className="px-2 py-1.5">
                      {isEditingName ? (
                        <Input
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          onBlur={handleNameSave}
                          onKeyDown={handleNameKeyDown}
                          className="text-sm font-medium h-7 px-2"
                          autoFocus
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <p 
                            className="text-sm font-medium cursor-pointer hover:text-emerald-500 transition-colors flex-1"
                            onClick={startEditingName}
                          >
                            {userProfile.name}
                          </p>
                          <button
                            onClick={startEditingName}
                            className="opacity-40 transition-opacity p-1 hover:bg-muted rounded hover:opacity-100"
                            aria-label="Edit name"
                          >
                            <Pencil className="w-3 h-3 text-muted-foreground hover:text-emerald-500" />
                          </button>
                        </div>
                      )}
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={toggleTheme}
                      className="cursor-pointer"
                    >
                      {theme === 'dark' ? (
                        <>
                          <Sun className="w-4 h-4 mr-2" />
                          Light Mode
                        </>
                      ) : (
                        <>
                          <Moon className="w-4 h-4 mr-2" />
                          Dark Mode
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setShowStatisticsModal(true)}
                      className="cursor-pointer"
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Statistics
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5">
                      <div className="flex items-center gap-1 text-sm">
                        <button
                          onClick={() => handleCurrencyChange(Currency.eur)}
                          className={`font-medium transition-colors ${
                            userProfile.defaultCurrency === Currency.eur
                              ? 'text-emerald-500'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          EUR
                        </button>
                        <span className="text-muted-foreground">/</span>
                        <button
                          onClick={() => handleCurrencyChange(Currency.usd)}
                          className={`font-medium transition-colors ${
                            userProfile.defaultCurrency === Currency.usd
                              ? 'text-emerald-500'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          USD
                        </button>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setShowAboutModal(true)}
                      className="cursor-pointer"
                    >
                      <Info className="w-4 h-4 mr-2" />
                      About & Share
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleLogout}
                      className="text-destructive focus:text-destructive cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  onClick={handleAuth}
                  disabled={disabled}
                  variant="default"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {disabled ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      Logging in...
                    </>
                  ) : (
                    <>
                      <User className="w-4 h-4 mr-2" />
                      Login
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <AboutShareModal open={showAboutModal} onOpenChange={setShowAboutModal} />
      <StatisticsModal open={showStatisticsModal} onOpenChange={setShowStatisticsModal} />
    </>
  );
}
