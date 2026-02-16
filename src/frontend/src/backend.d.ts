import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Time = bigint;
export interface SavingGoal {
    id: SavingGoalId;
    name: string;
    currentSavedAmount: number;
    deadline?: Time;
    targetAmount: number;
    currency: Currency;
}
export interface EmergencyFund {
    bankAmount: number;
    cashAmount: number;
}
export type SavingGoalId = string;
export interface UserProfile {
    name: string;
    themePreference: ThemePreference;
    defaultCurrency: Currency;
}
export interface SavingGoalDTO {
    name: string;
    currentSavedAmount: number;
    deadline?: Time;
    targetAmount: number;
    currency: Currency;
}
export enum Currency {
    eur = "eur",
    usd = "usd"
}
export enum ThemePreference {
    dark = "dark",
    light = "light"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addToCurrentSavedAmount(id: SavingGoalId, amount: number): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createSavingGoal(data: SavingGoalDTO): Promise<SavingGoalId>;
    deleteSavingGoal(id: SavingGoalId): Promise<void>;
    getAllEmergencyFunds(): Promise<Array<[Principal, EmergencyFund]>>;
    getAllSavingGoals(): Promise<Array<SavingGoal>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getEmergencyFund(): Promise<EmergencyFund>;
    getFilteredSavingGoals(currency: Currency | null, deadline: Time | null): Promise<Array<SavingGoal>>;
    getSavingGoal(id: SavingGoalId): Promise<SavingGoal | null>;
    getStatistics(): Promise<{
        biggestAchievement: number;
        completedGoals: bigint;
        totalGoalsCreated: bigint;
        totalSavedAmount: number;
    } | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateEmergencyFund(bank: number, cash: number): Promise<void>;
    updateSavingGoal(id: SavingGoalId, data: SavingGoalDTO): Promise<void>;
}
