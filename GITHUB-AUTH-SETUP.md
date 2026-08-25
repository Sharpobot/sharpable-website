# GitHub Auth Setup (for Claude's tool environment)

This file is about **Claude's own terminal tool authenticating to GitHub** so it can `git push` directly — not about the website itself. Kept separate from `CLAUDE.md` since it's a tooling/environment concern, not a site-architecture one.

## The core problem

Claude's Bash/PowerShell tool runs in a **separate environment from the user's own terminal** on the same machine — logging into an account in the user's terminal (e.g. via their browser, or `gh auth login` run *in their window*) does **not** make that login visible to Claude's tool. Confirmed directly this project: the user ran `gh auth login` in their own PowerShell window and logged in as `FriezerGH`, but Claude's `gh auth status` still only showed unrelated accounts — different keyring/config location entirely, despite being the "same machine."

The fix is to have **Claude run the login command itself**, so the resulting credential lands in the environment Claude's tool actually uses.

## Quick fix: switching between accounts already logged in

If `gh auth status` (run by Claude) already shows the right account (just not active), no new login is needed:

```bash
gh auth switch --hostname github.com --user <account-name>
git push origin main
```

**This machine's `gh` CLI has multiple accounts logged into Claude's environment already** (`Aidid-Marcello`, `AliffDanish`, `Sharpobot`, as of this writing), and **the active one reverts to `Aidid-Marcello` between sessions/restarts** — that account does not have write access to `Sharpobot/sharpable-website`, so `git push` fails with a 403 (`Permission ... denied to Aidid-Marcello`). Run the `gh auth switch` command above (swap in `Sharpobot`) before pushing whenever this happens — it's routine, not a bug.

## Full setup: adding a brand-new account (device-flow login)

Use this if the account Claude needs isn't logged in at all yet (`gh auth status` doesn't list it). This is genuinely how `Sharpobot` got added to Claude's environment in this project — recorded here so a future session can repeat it without re-discovering the approach.

1. Claude runs, in its own Bash tool (**not** something the user runs in their own terminal):
   ```bash
   gh auth login --hostname github.com --git-protocol https --web
   ```
   Run this **in the background** (it polls until the browser step below completes) so Claude isn't blocked waiting on it.

2. This prints a one-time code and a URL, e.g.:
   ```
   ! First copy your one-time code: EADE-FA5A
   Open this URL to continue in your web browser: https://github.com/login/device
   ```
   Claude relays both to the user in chat.

3. **The user** — not Claude — opens that URL in their own browser, pastes the code, and logs in/authorizes as whichever account should be added. This is the only manual step; no token or password is ever typed into the chat.

4. Once the user approves it in their browser, the background command completes on its own (Claude gets a task-completion notification — no need to poll or ask the user to confirm "done").

5. Claude verifies with `gh auth status` — the new account should now be listed. Set it active with `gh auth switch --hostname github.com --user <account-name>` if it isn't already, then `git push` works directly from then on (until the active account reverts again — see Quick Fix above).

**Why this method over inviting Claude's existing account as a collaborator:** simpler for a solo/small-team repo, and doesn't require the repo owner to manage collaborator permissions on GitHub's side. If the project ever wants a *permanent, no-repeat-login* fix instead, adding whichever account Claude's tool already authenticates as (e.g. `Aidid-Marcello`) as a collaborator with write access on the target repo is the alternative — trades "occasionally re-switch active account" for "manage a standing collaborator grant."

## Alternative: fine-grained Personal Access Token (PAT)

Discussed as an option in this project but **not the method actually used** (device-flow above was simpler and avoided handling a raw secret at all) — recorded in case device-flow login ever isn't available or preferred:

1. Log into GitHub as the target account → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. **Repository access**: "Only select repositories" → pick just the repo(s) that need it — never "All repositories."
3. **Permissions**: Contents → **Read and write** only. Don't grant more than needed.
4. **Expiration**: set a real expiry (e.g. 90 days), not "no expiration."
5. Paste the generated token into chat. Claude would use it to configure a git credential (e.g. via a credential helper or an embedded-token remote URL) scoped to just that repo.

**Trade-off vs. device-flow login**: the token is a literal secret that ends up in the chat transcript once pasted, and needs manual rotation before it expires. Device-flow login never exposes a secret to Claude or the chat at all — the user approves entirely within GitHub's own browser flow. Prefer device-flow unless there's a specific reason a PAT is needed (e.g. device-flow login itself is unavailable for some reason).
