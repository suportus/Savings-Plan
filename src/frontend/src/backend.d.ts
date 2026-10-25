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
export type Result = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: Error_;
};
export interface EmergencyFund {
    bankAmount: number;
    cashAmount: number;
}
export type Error_ = {
    __kind__: "FrontendOriginsNotConfigured";
    FrontendOriginsNotConfigured: null;
} | {
    __kind__: "MixedSsoSources";
    MixedSsoSources: {
        otherKeys: Array<string>;
        ssoKeys: Array<string>;
    };
} | {
    __kind__: "Stale";
    Stale: {
        ageNs: bigint;
    };
} | {
    __kind__: "MalformedCandid";
    MalformedCandid: null;
} | {
    __kind__: "AmbiguousAttribute";
    AmbiguousAttribute: {
        field: string;
        sources: Array<string>;
    };
} | {
    __kind__: "NoAttributes";
    NoAttributes: null;
} | {
    __kind__: "UnknownNonce";
    UnknownNonce: null;
} | {
    __kind__: "UntrustedSsoSource";
    UntrustedSsoSource: {
        domain: string;
    };
} | {
    __kind__: "MissingField";
    MissingField: string;
} | {
    __kind__: "FrontendOriginMismatch";
    FrontendOriginMismatch: {
        got: string;
        expected: Array<string>;
    };
};
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
