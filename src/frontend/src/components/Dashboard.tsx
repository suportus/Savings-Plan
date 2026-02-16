import { useState } from 'react';
import type { SavingGoal } from '../backend';
import { Currency } from '../backend';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, Calendar, Repeat } from 'lucide-react';
import GoalCard from './GoalCard';
import GoalTable from './GoalTable';
import EmergencyFundCard from './EmergencyFundCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDateByCurrency } from '../lib/dateUtils';
import { useGetCallerUserProfile } from '../hooks/useQueries';
import { calculateTotalMonthlyTarget } from '../utils/monthlyTarget';

interface DashboardProps {
  goals: SavingGoal[];
  isLoading: boolean;
  onCreateNew: () => void;
}

export default function Dashboard({ goals, isLoading, onCreateNew }: DashboardProps) {
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const { data: userProfile } = useGetCallerUserProfile();

  const totalTargetAmount = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const totalSavedAmount = goals.reduce((sum, goal) => sum + goal.currentSavedAmount, 0);
  const overallProgress = totalTargetAmount > 0 ? (totalSavedAmount / totalTargetAmount) * 100 : 0;

  // Use global currency from user profile
  const globalCurrency = userProfile?.defaultCurrency || Currency.usd;
  const currencySymbol = globalCurrency === Currency.eur ? '€' : '$';

  // Calculate total monthly target using shared utility
  const totalMonthlyTarget = calculateTotalMonthlyTarget(goals);

  // Find the goal with the nearest upcoming deadline (only consider goals with deadlines)
  const goalsWithDeadlines = goals.filter(goal => goal.deadline);
  const nextDeadlineGoal = goalsWithDeadlines.length > 0 
    ? goalsWithDeadlines.reduce((nearest, goal) => {
        const goalDeadline = new Date(Number(goal.deadline) / 1000000);
        const nearestDeadline = new Date(Number(nearest.deadline) / 1000000);
        const now = new Date();
        
        // Only consider future deadlines
        if (goalDeadline < now) return nearest;
        if (nearestDeadline < now) return goal;
        
        return goalDeadline < nearestDeadline ? goal : nearest;
      })
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your goals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-main-title">Your Saving Goals</h2>
          <p className="text-muted-foreground mt-1">
            {goals.length === 0 ? 'Start by creating your first goal' : `Tracking ${goals.length} ${goals.length === 1 ? 'goal' : 'goals'}`}
          </p>
        </div>
        <Button 
          onClick={onCreateNew}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Goal
        </Button>
      </div>

      {goals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="card-premium border border-border rounded-lg p-6 transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg icon-bg-blue flex items-center justify-center">
                <Repeat className="w-5 h-5 text-monthly-target" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Target</p>
                <p className="text-2xl font-bold text-monthly-target">{currencySymbol}{totalMonthlyTarget.toFixed(2)}</p>
              </div>
            </div>
          </div>
          
          <div className="card-premium border border-border rounded-lg p-6 transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg icon-bg-blue flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Target</p>
                <p className="text-2xl font-bold text-main-title">{currencySymbol}{totalTargetAmount.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div className="card-premium border border-border rounded-lg p-6 transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg icon-bg-purple flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Saved</p>
                <p className="text-2xl font-bold text-main-title">{currencySymbol}{totalSavedAmount.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="card-premium border border-border rounded-lg p-6 transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg icon-bg-orange flex items-center justify-center">
                <Calendar className="w-5 h-5 text-orange-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted-foreground">Next Deadline</p>
                {nextDeadlineGoal && nextDeadlineGoal.deadline ? (
                  <>
                    <p className="text-lg font-bold text-main-title truncate" title={nextDeadlineGoal.name}>
                      {nextDeadlineGoal.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateByCurrency(
                        new Date(Number(nextDeadlineGoal.deadline) / 1000000),
                        globalCurrency
                      )}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No upcoming</p>
                )}
              </div>
            </div>
          </div>

          <EmergencyFundCard />
        </div>
      )}

      {goals.length === 0 ? (
        <div className="text-center py-16 card-premium border border-dashed border-border rounded-lg transition-all duration-300">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Plus className="w-10 h-10 text-emerald-500" />
          </div>
          <h3 className="text-xl font-semibold text-main-title mb-2">No Saving Goals Yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Create your first saving goal to start tracking your financial progress
          </p>
          <Button 
            onClick={onCreateNew}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Goal
          </Button>
        </div>
      ) : (
        <Tabs value={view} onValueChange={(v) => setView(v as 'cards' | 'table')} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="cards">Card View</TabsTrigger>
            <TabsTrigger value="table">Table View</TabsTrigger>
          </TabsList>
          
          <TabsContent value="cards" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
              {goals.map((goal, index) => (
                <div
                  key={goal.id}
                  className="goal-card-entrance"
                  style={{
                    animationDelay: `${index * 0.1}s`
                  }}
                >
                  <GoalCard goal={goal} />
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="table" className="mt-6">
            <GoalTable goals={goals} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
