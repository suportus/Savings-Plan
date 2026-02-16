# Security Data Isolation Verification Guide

This document provides step-by-step instructions to verify that per-user data isolation is working correctly in the Savings Plan application.

## Overview

The application implements strict per-user data isolation where:
- Each user's data (goals, emergency fund, profile) is stored and indexed by their Internet Identity Principal
- Users can only access their own data
- Switching between users shows completely isolated data sets
- No cross-user data leakage occurs in the UI or backend

## Prerequisites

- Two separate browser profiles or incognito windows (to maintain separate Internet Identity sessions)
- Access to the deployed Savings Plan application

## Test Case: Two-User Isolation Verification

### Setup Phase

1. **Open Browser Profile A (User A)**
   - Open the application in a new browser profile or incognito window
   - Click "Login" and complete Internet Identity authentication
   - Set up profile with name "User A" and currency preference (e.g., EUR)
   - Note: You should see an empty dashboard with no goals

2. **Open Browser Profile B (User B)**
   - Open the application in a different browser profile or incognito window
   - Click "Login" and complete Internet Identity authentication (use a different identity)
   - Set up profile with name "User B" and currency preference (e.g., USD)
   - Note: You should see an empty dashboard with no goals

### Data Creation Phase (User B)

3. **Create Goals for User B**
   - In Browser Profile B (User B), create several saving goals:
     - Goal 1: "Vacation Fund" - €2000 target, €500 saved
     - Goal 2: "New Laptop" - €1500 target, €300 saved
     - Goal 3: "Emergency Savings" - €5000 target, €1000 saved
   - Verify all three goals appear in User B's dashboard

4. **Set Emergency Fund for User B**
   - In Browser Profile B (User B), set emergency fund:
     - Bank: €3000
     - Cash: €500
   - Verify the emergency fund card shows total €3500

### Isolation Verification Phase (User A)

5. **Verify User A Sees Empty Dashboard**
   - Switch to Browser Profile A (User A)
   - Refresh the page if needed
   - **Expected Result**: User A should see:
     - Empty goals list (no goals from User B)
     - Emergency fund showing €0 / $0
     - No data from User B visible anywhere

6. **Attempt to Access User B's Goal by ID**
   - In Browser Profile A (User A), if you attempt to edit, delete, or add funds to a goal ID that belongs to User B (through any means)
   - **Expected Backend Behavior**: Backend should reject the request with "Saving goal not found" trap
   - **Expected UI Behavior**: A toast notification should appear with one of these user-friendly messages:
     - "The requested item was not found or you do not have access to it"
     - "You do not have permission to perform this action"
   - **Note**: The backend returns "not found" for goals owned by other users to prevent information disclosure

7. **Create Data for User A**
   - In Browser Profile A (User A), create a goal:
     - Goal: "Car Savings" - $10000 target, $2000 saved
   - Set emergency fund:
     - Bank: $5000
     - Cash: $1000
   - **Expected Result**: User A's dashboard shows only their own data

### Cross-Verification Phase

8. **Verify User B Still Sees Only Their Data**
   - Switch back to Browser Profile B (User B)
   - Refresh the page
   - **Expected Result**: User B should see:
     - Their original 3 goals (Vacation Fund, New Laptop, Emergency Savings)
     - Their emergency fund (€3500 total)
     - No data from User A visible

9. **Verify User A Still Sees Only Their Data**
   - Switch back to Browser Profile A (User A)
   - Refresh the page
   - **Expected Result**: User A should see:
     - Only their 1 goal (Car Savings)
     - Their emergency fund ($6000 total)
     - No data from User B visible

### Logout and Re-login Verification

10. **Test Logout Data Clearing**
    - In Browser Profile A (User A), click logout
    - **Expected Result**: All cached data should be cleared
    - Log back in with the same Internet Identity
    - **Expected Result**: User A's data should load fresh from backend (Car Savings goal and emergency fund)

11. **Test Account Switching**
    - In Browser Profile A, logout
    - Login with a different Internet Identity (create a new one if needed)
    - **Expected Result**: Should see profile setup screen (new user)
    - Complete profile setup
    - **Expected Result**: Should see empty dashboard (no data from User A or User B)

## Expected Error Messages

When unauthorized access is attempted, the frontend displays user-friendly error messages via toast notifications. The backend may return various error messages, but the frontend normalizes them to:

### Authorization & Access Errors
- **"You do not have permission to perform this action"** - When attempting operations without proper authorization
- **"The requested item was not found or you do not have access to it"** - When trying to access goals or resources owned by other users (backend returns "not found" to prevent information disclosure)
- **"You do not have access to this resource"** - For explicit access denial scenarios

### Other Common Errors
- **"Profile not found"** - When trying to access a non-existent profile
- **"Actor not available"** - When the backend connection is not initialized

### Error Message Handling
The frontend's `parseBackendError` function:
- Handles case-insensitive matching (e.g., "Unauthorized", "unauthorized", "UNAUTHORIZED")
- Extracts specific error details when available
- Provides consistent, user-friendly messages across all operations
- Prevents technical backend error messages from being shown directly to users

## Success Criteria

✅ User A cannot see any of User B's goals, emergency fund, or profile data
✅ User B cannot see any of User A's goals, emergency fund, or profile data
✅ Creating data for User B does not affect User A's dashboard
✅ Creating data for User A does not affect User B's dashboard
✅ Attempting to access another user's goal by ID fails with a clear, user-friendly error message
✅ Logout clears all cached data
✅ Re-login loads only the authenticated user's data
✅ Switching accounts shows completely isolated data sets
✅ All error messages are user-friendly and consistent

## Troubleshooting

If you observe any cross-user data leakage:

1. **Check Browser Console**: Look for errors or warnings
2. **Verify Identity**: Ensure you're using different Internet Identity principals for User A and User B
3. **Clear Cache**: Try hard-refreshing the browser (Ctrl+Shift+R or Cmd+Shift+R)
4. **Check Network Tab**: Verify that backend calls include the correct identity
5. **Report Issue**: Document the exact steps that led to the data leakage

## Technical Implementation Notes

The isolation is achieved through:

1. **Backend**: All data is stored and indexed by the caller's Principal ID
2. **Frontend Query Keys**: React Query cache keys are scoped by principal ID (e.g., `['savingGoals', principalId]`)
3. **Cache Clearing**: All cached data is cleared on logout and identity changes
4. **Authorization Checks**: Backend validates that the caller owns the requested data
5. **Error Handling**: Frontend normalizes backend errors into user-friendly messages with case-insensitive matching
6. **Information Disclosure Prevention**: Backend returns "not found" for cross-user access attempts rather than "unauthorized" to prevent attackers from discovering which goal IDs exist
