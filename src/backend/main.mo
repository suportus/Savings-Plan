import Map "mo:core/Map";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Array "mo:core/Array";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Float "mo:core/Float";
import Cycles "mo:core/Cycles";

actor SavingsPlan {
  // Only principals in this list may read or write data.
  // The list is managed by a canister controller (your icp identity).
  let allowedUsers = Map.empty<Principal, Bool>();

  // ---------- Access control ----------

  func requireUser(caller : Principal) {
    if (caller.isAnonymous()) {
      Runtime.trap("Anonymous access is not allowed");
    };
    if (not allowedUsers.containsKey(caller)) {
      Runtime.trap("Access denied");
    };
  };

  func requireController(caller : Principal) {
    if (not caller.isController()) {
      Runtime.trap("Only a canister controller can do this");
    };
  };

  public shared ({ caller }) func addUser(user : Principal) : async () {
    requireController(caller);
    allowedUsers.add(user, true);
  };

  public shared ({ caller }) func removeUser(user : Principal) : async () {
    requireController(caller);
    allowedUsers.remove(user);
  };

  public shared ({ caller }) func listUsers() : async [Principal] {
    requireController(caller);
    allowedUsers.keys().toArray();
  };

  // Cycle balance of this (backend) canister, shown in the Cycles dialog.
  public shared query ({ caller }) func getCycleBalance() : async Nat {
    requireUser(caller);
    Cycles.balance();
  };

  // ---------- Top-up from a wallet (cycles ledger) ----------

  // Cycles held in a wallet (e.g. Oisy) are tokens on the cycles ledger.
  // Sending them to this canister's principal only credits its ledger
  // account; `claimCycles` moves them onto a canister's real cycle balance.
  type LedgerAccount = { owner : Principal; subaccount : ?Blob };
  type WithdrawArgs = {
    amount : Nat;
    from_subaccount : ?Blob;
    to : Principal;
    created_at_time : ?Nat64;
  };
  type RejectionCode = {
    #NoError;
    #CanisterError;
    #SysTransient;
    #DestinationInvalid;
    #Unknown;
    #SysFatal;
    #CanisterReject;
  };
  type WithdrawError = {
    #GenericError : { message : Text; error_code : Nat };
    #TemporarilyUnavailable;
    #FailedToWithdraw : {
      fee_block : ?Nat;
      rejection_code : RejectionCode;
      rejection_reason : Text;
    };
    #Duplicate : { duplicate_of : Nat };
    #BadFee : { expected_fee : Nat };
    #InvalidReceiver : { receiver : Principal };
    #CreatedInFuture : { ledger_time : Nat64 };
    #TooOld;
    #InsufficientFunds : { balance : Nat };
  };

  transient let cyclesLedger = actor "um5iw-rqaaa-aaaaq-qaaba-cai" : actor {
    icrc1_balance_of : shared query LedgerAccount -> async Nat;
    withdraw : shared WithdrawArgs -> async { #Ok : Nat; #Err : WithdrawError };
  };
  transient let cyclesLedgerFee = 100_000_000;

  // Cycles waiting in this canister's cycles-ledger account. An update call:
  // the cycles ledger is on another subnet, which a composite query can't reach.
  public shared ({ caller }) func getWalletCycles() : async Nat {
    requireUser(caller);
    await cyclesLedger.icrc1_balance_of({
      owner = Principal.fromActor(SavingsPlan);
      subaccount = null;
    });
  };

  // Moves all waiting cycles (minus the ledger fee) onto the backend or the
  // frontend canister. Returns the amount moved.
  public shared ({ caller }) func claimCycles(target : { #backend; #frontend }) : async Nat {
    requireUser(caller);
    let self = Principal.fromActor(SavingsPlan);
    let to = switch (target) {
      case (#backend) { self };
      case (#frontend) {
        switch (Runtime.envVar<system>("PUBLIC_CANISTER_ID:frontend")) {
          case (?id) { Principal.fromText(id) };
          case (null) { Runtime.trap("Frontend canister ID is not configured") };
        };
      };
    };
    let balance = await cyclesLedger.icrc1_balance_of({
      owner = self;
      subaccount = null;
    });
    if (balance <= cyclesLedgerFee) {
      Runtime.trap("No cycles to claim");
    };
    let amount : Nat = balance - cyclesLedgerFee;
    switch (await cyclesLedger.withdraw({ amount; from_subaccount = null; to; created_at_time = null })) {
      case (#Ok(_)) { amount };
      case (#Err(e)) { Runtime.trap("Withdraw failed: " # debug_show (e)) };
    };
  };

  // ---------- Profiles ----------

  public type ThemePreference = { #light; #dark };
  public type Currency = { #eur; #usd };

  public type UserProfile = {
    name : Text;
    themePreference : ThemePreference;
    defaultCurrency : Currency;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    requireUser(caller);
    userProfiles.get(caller);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    requireUser(caller);
    userProfiles.add(caller, profile);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    // Your own profile, or any profile for a canister controller.
    if (caller.isController()) {
      return userProfiles.get(user);
    };
    requireUser(caller);
    if (caller != user) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public type SavingGoalId = Text;
  public type SavingGoal = {
    id : SavingGoalId;
    name : Text;
    currency : Currency;
    targetAmount : Float;
    currentSavedAmount : Float;
    deadline : ?Time.Time;
  };

  public type SavingGoalDTO = {
    name : Text;
    currency : Currency;
    targetAmount : Float;
    currentSavedAmount : Float;
    deadline : ?Time.Time;
  };

  module SavingGoal {
    public func compare(goal1 : SavingGoal, goal2 : SavingGoal) : Order.Order {
      Text.compare(goal1.name, goal2.name);
    };
  };

  let savingGoals = Map.empty<Principal, Map.Map<SavingGoalId, SavingGoal>>();
  var nextId : Nat = 0;

  public type EmergencyFund = {
    bankAmount : Float;
    cashAmount : Float;
  };

  let emptyEmergencyFund : EmergencyFund = {
    bankAmount = 0.0;
    cashAmount = 0.0;
  };

  let emergencyFunds = Map.empty<Principal, EmergencyFund>();

  public type Statistics = {
    var totalGoalsCreated : Nat;
    var completedGoals : Nat;
    var totalSavedAmount : Float;
    var biggestAchievement : Float;
  };

  let userStatistics = Map.empty<Principal, Statistics>();

  public shared ({ caller }) func createSavingGoal(data : SavingGoalDTO) : async SavingGoalId {
    requireUser(caller);

    let idText = nextId.toText();
    nextId += 1;

    if (data.targetAmount < 0.0 or data.currentSavedAmount < 0.0) {
      Runtime.trap("Amounts cannot be negative");
    };
    if (data.currentSavedAmount > data.targetAmount) {
      Runtime.trap(
        "Current saved amount cannot exceed target amount"
      );
    };
    switch (data.deadline) {
      case (?deadline) {
        let currentTime = Time.now();
        if (deadline <= currentTime) {
          Runtime.trap("Deadline must be in the future");
        };
      };
      case (null) {};
    };

    let newGoal : SavingGoal = {
      id = idText;
      name = data.name;
      currency = data.currency;
      targetAmount = data.targetAmount;
      currentSavedAmount = data.currentSavedAmount;
      deadline = data.deadline;
    };

    // Get or create the individual goals map for the caller
    let userGoals = switch (savingGoals.get(caller)) {
      case (?goals) { goals };
      case (null) { Map.empty<SavingGoalId, SavingGoal>() };
    };
    userGoals.add(idText, newGoal);
    savingGoals.add(caller, userGoals);

    updateStatsForGoalCompletion(caller, newGoal, null);

    idText;
  };

  func getAllSavingGoalsForUser(caller : Principal) : [SavingGoal] {
    switch (savingGoals.get(caller)) {
      case (?goals) { goals.values().toArray().sort() };
      case (null) { [] };
    };
  };

  public query ({ caller }) func getAllSavingGoals() : async [SavingGoal] {
    requireUser(caller);
    getAllSavingGoalsForUser(caller);
  };

  public query ({ caller }) func getSavingGoal(id : SavingGoalId) : async ?SavingGoal {
    requireUser(caller);

    switch (savingGoals.get(caller)) {
      case (?goals) { goals.get(id) };
      case (null) { null };
    };
  };

  public shared ({ caller }) func updateSavingGoal(
    id : SavingGoalId,
    data : SavingGoalDTO
  ) : async () {
    requireUser(caller);

    switch (savingGoals.get(caller)) {
      case (?goals) {
        switch (goals.get(id)) {
          case (?existingGoal) {
            if (data.targetAmount < 0.0 or data.currentSavedAmount < 0.0) {
              Runtime.trap("Amounts cannot be negative");
            };
            if (data.currentSavedAmount > data.targetAmount) {
              Runtime.trap(
                "Current saved amount cannot exceed target amount"
              );
            };
            // Only a new or changed deadline must be in the future, so a goal
            // whose deadline has passed can still be edited.
            if (data.deadline != existingGoal.deadline) {
              switch (data.deadline) {
                case (?deadline) {
                  let currentTime = Time.now();
                  if (deadline <= currentTime) {
                    Runtime.trap("Deadline must be in the future");
                  };
                };
                case (null) {};
              };
            };
            let updatedGoal : SavingGoal = {
              id = id;
              name = data.name;
              currency = data.currency;
              targetAmount = data.targetAmount;
              currentSavedAmount = data.currentSavedAmount;
              deadline = data.deadline;
            };
            goals.add(id, updatedGoal);
            updateStatsForGoalCompletion(
              caller,
              updatedGoal,
              ?existingGoal,
            );
          };
          case (null) { Runtime.trap("Saving goal not found") };
        };
      };
      case (null) { Runtime.trap("Saving goal not found") };
    };
  };

  public shared ({ caller }) func deleteSavingGoal(id : SavingGoalId) : async () {
    requireUser(caller);

    switch (savingGoals.get(caller)) {
      case (?goals) {
        if (goals.containsKey(id)) {
          goals.remove(id);
        } else {
          Runtime.trap("Saving goal not found");
        };
      };
      case (null) {
        Runtime.trap("Saving goal not found");
      };
    };
  };

  public query ({ caller }) func getFilteredSavingGoals(
    currency : ?Currency,
    deadline : ?Time.Time
  ) : async [SavingGoal] {
    requireUser(caller);

    let allGoals = getAllSavingGoalsForUser(caller);
    let filteredGoals = allGoals.filter(
      func(goal) {
        switch (currency) {
          case (null) { true };
          case (?cur) { goal.currency == cur };
        };
      }
    ).filter(
      func(goal) {
        switch (deadline) {
          case (null) { true };
          case (?dl) {
            switch (goal.deadline) {
              case (null) { false };
              case (?d) { d == dl };
            };
          };
        };
      }
    );
    filteredGoals;
  };

  public shared ({ caller }) func updateEmergencyFund(bank : Float, cash : Float) : async () {
    requireUser(caller);
    if (bank < 0.0 or cash < 0.0) {
      Runtime.trap("Amounts cannot be negative");
    };
    let newFund : EmergencyFund = { bankAmount = bank; cashAmount = cash };
    emergencyFunds.add(caller, newFund);
  };

  public query ({ caller }) func getEmergencyFund() : async EmergencyFund {
    requireUser(caller);
    switch (emergencyFunds.get(caller)) {
      case (?fund) { fund };
      case (null) { emptyEmergencyFund };
    };
  };

  public query ({ caller }) func getAllEmergencyFunds() : async [(Principal, EmergencyFund)] {
    requireController(caller);
    emergencyFunds.entries().toArray();
  };

  public query ({ caller }) func getStatistics() : async ?{
    totalGoalsCreated : Nat;
    completedGoals : Nat;
    totalSavedAmount : Float;
    biggestAchievement : Float;
  } {
    requireUser(caller);
    switch (userStatistics.get(caller)) {
      case (?stats) {
        ?{
          totalGoalsCreated = stats.totalGoalsCreated;
          completedGoals = stats.completedGoals;
          totalSavedAmount = stats.totalSavedAmount;
          biggestAchievement = stats.biggestAchievement;
        };
      };
      case (null) { null };
    };
  };

  public shared ({ caller }) func addToCurrentSavedAmount(id : SavingGoalId, amount : Float) : async () {
    requireUser(caller);
    if (amount <= 0.0) {
      Runtime.trap("Amount to add must be positive");
    };
    switch (savingGoals.get(caller)) {
      case (?goals) {
        switch (goals.get(id)) {
          case (?goal) {
            let newTotal = goal.currentSavedAmount + amount;
            if (newTotal > goal.targetAmount) {
              Runtime.trap(
                "Total saved amount cannot exceed target amount"
              );
            };
            let updatedGoal : SavingGoal = { goal with currentSavedAmount = newTotal };
            goals.add(id, updatedGoal);
            updateStatsForGoalCompletion(
              caller,
              updatedGoal,
              ?goal,
            );
          };
          case (null) { Runtime.trap("Saving goal not found") };
        };
      };
      case (null) { Runtime.trap("Saving goal not found") };
    };
  };

  func updateStatsForGoalCompletion(
    caller : Principal,
    newGoal : SavingGoal,
    oldGoal : ?SavingGoal,
  ) {
    if (newGoal.currentSavedAmount >= newGoal.targetAmount) {
      let alreadyCompleted = switch (oldGoal) {
        case (?goal) { goal.currentSavedAmount >= goal.targetAmount };
        case (null) { false };
      };
      if (not alreadyCompleted) {
        switch (userStatistics.get(caller)) {
          case (?stats) {
            stats.completedGoals += 1;
            stats.totalSavedAmount += newGoal.targetAmount;
            stats.biggestAchievement := Float.max(
              stats.biggestAchievement,
              newGoal.targetAmount,
            );
          };
          case (null) {
            let newStats : Statistics = {
              var totalGoalsCreated = 0;
              var completedGoals = 1;
              var totalSavedAmount = newGoal.targetAmount;
              var biggestAchievement = newGoal.targetAmount;
            };
            userStatistics.add(caller, newStats);
          };
        };
      };
    };
  };
};
