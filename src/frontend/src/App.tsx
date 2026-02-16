import { useState, useEffect } from 'react';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile, useGetAllSavingGoals } from './hooks/useQueries';
import Header from './components/Header';
import Footer from './components/Footer';
import ProfileSetupModal from './components/ProfileSetupModal';
import Dashboard from './components/Dashboard';
import CreateGoalForm from './components/CreateGoalForm';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from 'next-themes';

export default function App() {
  const { identity, isInitializing } = useInternetIdentity();
  const { data: userProfile, isLoading: profileLoading, isFetched } = useGetCallerUserProfile();
  const { data: savingGoals = [], isLoading: goalsLoading } = useGetAllSavingGoals();
  const [showCreateForm, setShowCreateForm] = useState(false);

  const isAuthenticated = !!identity;
  const showProfileSetup = isAuthenticated && !profileLoading && isFetched && userProfile === null;

  if (isInitializing) {
    return (
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <div className="min-h-screen flex items-center justify-center bg-background transition-colors duration-300">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Initializing...</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <div className="min-h-screen flex flex-col bg-background transition-colors duration-300">
        <Header />
        
        <main className="flex-1 container mx-auto px-4 py-8">
          {!isAuthenticated ? (
            <div className="max-w-2xl mx-auto text-center py-16">
              <div className="mb-8">
                <div className="w-32 h-32 mx-auto mb-6 flex items-center justify-center">
                  <img 
                    src="https://nar7q-4iaaa-aaaao-qksbq-cai.raw.icp0.io/Caffeine/pictures/Savingsplan.png" 
                    alt="Savings Plan Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
                  Welcome to Savings Plan
                </h1>
                <p className="text-xl text-muted-foreground mb-8">
                  Track your financial goals with a decentralized savings tracker
                </p>
              </div>
              
              <div className="bg-card border border-border rounded-xl p-8 mb-8 shadow-sm transition-colors duration-300">
                <h2 className="text-2xl font-semibold mb-4">Get Started</h2>
                <p className="text-muted-foreground mb-6">
                  Login to create and manage your personal saving goals securely on the blockchain
                </p>
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-3 text-left">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-emerald-500 font-semibold">1</span>
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">Create Saving Goals</h3>
                      <p className="text-sm text-muted-foreground">Set target amounts and deadlines for your financial objectives</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-left">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-emerald-500 font-semibold">2</span>
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">Track Progress</h3>
                      <p className="text-sm text-muted-foreground">Monitor your savings progress with visual indicators</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-left">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-emerald-500 font-semibold">3</span>
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">Achieve Your Goals</h3>
                      <p className="text-sm text-muted-foreground">Stay motivated and reach your financial milestones</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : showProfileSetup ? (
            <ProfileSetupModal />
          ) : (
            <>
              {showCreateForm ? (
                <CreateGoalForm onClose={() => setShowCreateForm(false)} />
              ) : (
                <Dashboard 
                  goals={savingGoals} 
                  isLoading={goalsLoading}
                  onCreateNew={() => setShowCreateForm(true)}
                />
              )}
            </>
          )}
        </main>

        <Footer />
        <Toaster />
      </div>
    </ThemeProvider>
  );
}
