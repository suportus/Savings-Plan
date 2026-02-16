import Map "mo:core/Map";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Array "mo:core/Array";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Float "mo:core/Float";

import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";


// Apply migration using the with-clause

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public type ThemePreference = { #light; #dark };
  public type Currency = { #eur; #usd };

  public type UserProfile = {
    name : Text;
    themePreference : ThemePreference;
    defaultCurrency : Currency;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap(
        "Unauthorized: Only users can access profiles"
      );
    };
    userProfiles.get(caller);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not (AccessControl.isAdmin(
      accessControlState,
      caller,
    ))) {
      Runtime.trap(
        "Unauthorized: Can only view your own profile"
      );
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
    if (not (AccessControl.hasPermission(
      accessControlState,
      caller,
      #user,
    ))) {
      Runtime.trap(
        "Unauthorized: Only users can create saving goals"
      );
    };

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
    if (not (AccessControl.hasPermission(
      accessControlState,
      caller,
      #user,
    ))) {
      Runtime.trap(
        "Unauthorized: Only users can view saving goals"
      );
    };
    getAllSavingGoalsForUser(caller);
  };

  public query ({ caller }) func getSavingGoal(id : SavingGoalId) : async ?SavingGoal {
    if (not (AccessControl.hasPermission(
      accessControlState,
      caller,
      #user,
    ))) {
      Runtime.trap(
        "Unauthorized: Only users can view saving goals"
      );
    };

    switch (savingGoals.get(caller)) {
      case (?goals) { goals.get(id) };
      case (null) { null };
    };
  };

  public shared ({ caller }) func updateSavingGoal(
    id : SavingGoalId,
    data : SavingGoalDTO
  ) : async () {
    if (not (AccessControl.hasPermission(
      accessControlState,
      caller,
      #user,
    ))) {
      Runtime.trap(
        "Unauthorized: Only users can update saving goals"
      );
    };

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
            switch (data.deadline) {
              case (?deadline) {
                let currentTime = Time.now();
                if (deadline <= currentTime) {
                  Runtime.trap("Deadline must be in the future");
                };
              };
              case (null) {};
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
    if (not (AccessControl.hasPermission(
      accessControlState,
      caller,
      #user,
    ))) {
      Runtime.trap(
        "Unauthorized: Only users can delete saving goals"
      );
    };

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
    if (not (AccessControl.hasPermission(
      accessControlState,
      caller,
      #user,
    ))) {
      Runtime.trap(
        "Unauthorized: Only users can view saving goals"
      );
    };

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
    if (not (AccessControl.hasPermission(
      accessControlState,
      caller,
      #user,
    ))) {
      Runtime.trap(
        "Unauthorized: Only users can update emergency fund"
      );
    };
    if (bank < 0.0 or cash < 0.0) {
      Runtime.trap("Amounts cannot be negative");
    };
    let newFund : EmergencyFund = { bankAmount = bank; cashAmount = cash };
    emergencyFunds.add(caller, newFund);
  };

  public query ({ caller }) func getEmergencyFund() : async EmergencyFund {
    if (not (AccessControl.hasPermission(
      accessControlState,
      caller,
      #user,
    ))) {
      Runtime.trap(
        "Unauthorized: Only users can access emergency fund"
      );
    };
    switch (emergencyFunds.get(caller)) {
      case (?fund) { fund };
      case (null) { emptyEmergencyFund };
    };
  };

  public query ({ caller }) func getAllEmergencyFunds() : async [(Principal, EmergencyFund)] {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap(
        "Unauthorized: Only admins can view all emergency funds"
      );
    };
    emergencyFunds.entries().toArray();
  };

  public query ({ caller }) func getStatistics() : async ?{
    totalGoalsCreated : Nat;
    completedGoals : Nat;
    totalSavedAmount : Float;
    biggestAchievement : Float;
  } {
    if (not (AccessControl.hasPermission(
      accessControlState,
      caller,
      #user,
    ))) {
      Runtime.trap(
        "Unauthorized: Only users can access statistics"
      );
    };
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
    if (not (AccessControl.hasPermission(
      accessControlState,
      caller,
      #user,
    ))) {
      Runtime.trap(
        "Unauthorized: Only users can update saving goals"
      );
    };
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
