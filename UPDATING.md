# Updating and running Savings Plan

All commands run in a terminal in the project folder, with the icp identity
that controls the canisters (`clockup-admin`). Check it with:

```bash
icp identity default        # should print clockup-admin
```

## Test locally

```bash
icp network start -d        # start a local test network (in the background)
icp deploy                  # build and deploy backend + frontend locally
```

Open the frontend URL that `icp deploy` prints (e.g.
`http://frontend.local.localhost:8000`). The local network has its own
Internet Identity, so your local principal differs from the mainnet one.

Stop the network when done:

```bash
icp network stop
```

## Deploy an update to mainnet

```bash
icp deploy -e ic
mops deployed backend       # save the deployed backend's stable types (upgrade-safety baseline)
```

Commit the changed `deployed/backend.most` together with the code.
`mops check` compares the code against this file, so an update that would lose
data fails before it is deployed. Never use `--mode reinstall` on mainnet: it
deletes all data.

Mainnet canister IDs are stored in `.icp/data/mappings/ic.ids.json`. Keep this
file in git.

## Users (allow-list)

Only principals on the allow-list can use the app. A new user signs in and
sees "Access denied" with their principal; they send it to you. Use `-e ic` for
mainnet, or `-e local` for the local test network.

```bash
# Add a user
icp canister call backend addUser '(principal "PRINCIPAL")' -e ic

# Remove a user
icp canister call backend removeUser '(principal "PRINCIPAL")' -e ic

# List users
icp canister call backend listUsers '()' -e ic
```

These calls only work for a controller of the backend canister.

## Cycles

The app's profile menu → **Cycles** shows both balances and canister IDs, and
moves cycles sent from Oisy onto a canister. A red dot on the avatar means one
of them is below 1 T.

The frontend balance is read by the backend, which works because the backend
is a controller of the frontend. If the frontend canister is ever recreated,
add it again (use the backend's canister ID):

```bash
icp canister settings update frontend --add-controller BACKEND_CANISTER_ID -e ic
```

To check or top up from the terminal:

```bash
icp canister status backend -e ic      # balance of the backend
icp canister status frontend -e ic     # balance of the frontend

icp cycles balance -n ic               # cycles held by your identity
icp canister top-up backend --amount 1t -e ic
icp canister top-up frontend --amount 1t -e ic
```

Don't use `icp cycles transfer` to fund a canister: those cycles don't reach
the canister's balance.
