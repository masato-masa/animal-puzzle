# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Deploy

After any code change is finished (tests/typecheck green), commit + redeploy without waiting to be asked:

1. Commit the change and push to `master` (this is the source of truth for the live build).
2. `npx expo export -p web`
3. `cp dist/+not-found.html dist/404.html` (SPA fallback so direct links like `/game/stage-1` don't 404 on reload)
4. Push the contents of `dist/` to the `gh-pages` branch (e.g. via a throwaway `git worktree`), leaving `master`'s working tree untouched.

Live URL: https://masato-masa.github.io/animal-puzzle/

