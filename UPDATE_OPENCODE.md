# Updating OpenCode (quick reference)

This doc is a quick reminder for keeping your local copy of OpenCode up to date.

In this project, OpenCode lives at `packages/opencode` and is managed as a **git submodule**.

---

## First-time clone (new machine / CI)

```bash
git submodule update --init --recursive
```

## Update OpenCode to the latest upstream commit

```bash
git submodule update --remote --merge packages/opencode
```

Then **commit the updated submodule pointer** (this is the step people often forget):

```bash
git add packages/opencode
git commit -m "chore: bump opencode submodule"
```

## Verify which commit the submodule is pinned to

```bash
git submodule status
```

## Inspect the submodule (debugging)

```bash
git -C packages/opencode remote -v
git -C packages/opencode fetch origin
git -C packages/opencode branch -a
```

---

## Common gotchas

### 1) "I updated the submodule but teammates/CI didn't get it"

You likely forgot to commit the submodule pointer:

```bash
git add packages/opencode
git commit -m "chore: bump opencode submodule"
```

### 2) Detached HEAD inside submodule

This is normal when you are pinning a submodule to a commit. You generally **should not** create commits inside the submodule repo unless you intentionally plan to maintain a fork.

### 3) Merge conflicts during update

If you never modify OpenCode directly, conflicts are uncommon. If you *did* modify it, consider:

- Moving your changes into your wrapper package (`packages/agent`)
- Or upstreaming changes via PR to OpenCode

---

## Note: if OpenCode is not a submodule

If you later switch to a setup where OpenCode is a normal git repo (not a submodule), you update it with:

```bash
git fetch origin
git pull --ff-only
```

---

## Recommended workflow (low maintenance)

- Treat OpenCode as **read-only** vendor code.
- Put all your custom logic in a separate wrapper package.
- Update OpenCode on a dedicated branch and merge after CI passes.
