import { useState } from 'react';
import { useSaveCallerUserProfile } from '../hooks/useQueries';
import { Currency, ThemePreference } from '../backend';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

export default function ProfileSetupModal() {
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<'eur' | 'usd'>('usd');
  const { mutate: saveProfile, isPending } = useSaveCallerUserProfile();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      saveProfile({
        name: name.trim(),
        defaultCurrency: currency === 'eur' ? Currency.eur : Currency.usd,
        themePreference: ThemePreference.dark, // Default to dark mode
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-colors duration-300">
      <Card className="w-full max-w-md border-emerald-500/20 shadow-2xl">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <CardTitle className="text-2xl">Welcome!</CardTitle>
          <CardDescription>
            Let's set up your profile to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isPending}
                className="border-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="currency-toggle">Default Currency</Label>
              <div className="flex items-center justify-between p-4 rounded-lg border border-emerald-500/20 bg-card/50">
                <div className="flex items-center gap-3">
                  <span className={`text-2xl transition-opacity ${currency === 'usd' ? 'opacity-100' : 'opacity-40'}`}>
                    $
                  </span>
                  <span className={`font-medium transition-opacity ${currency === 'usd' ? 'opacity-100' : 'opacity-40'}`}>
                    USD
                  </span>
                </div>
                
                <Switch
                  id="currency-toggle"
                  checked={currency === 'eur'}
                  onCheckedChange={(checked) => setCurrency(checked ? 'eur' : 'usd')}
                  disabled={isPending}
                  className="data-[state=checked]:bg-emerald-600"
                />
                
                <div className="flex items-center gap-3">
                  <span className={`font-medium transition-opacity ${currency === 'eur' ? 'opacity-100' : 'opacity-40'}`}>
                    EUR
                  </span>
                  <span className={`text-2xl transition-opacity ${currency === 'eur' ? 'opacity-100' : 'opacity-40'}`}>
                    €
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                This will be the default currency for new saving goals
              </p>
            </div>

            <Button
              type="submit"
              disabled={isPending || !name.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
