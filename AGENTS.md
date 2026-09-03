# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Deploy

After any code change is finished (tests/typecheck green), commit + redeploy without waiting to be asked:

1. Commit the change and push to `master` (this is the source of truth for the live build).
2. `npx expo export -p web`
3. `cp dist/+not-found.html dist/404.html` (SPA fallback so direct links like `/game/stage-1` don't 404 on reload)
4. `touch dist/.nojekyll` — **required.** GitHub Pages runs Jekyll by default, which silently excludes any file/directory starting with `_` (all of `_expo/`, `_sitemap.html`, etc.) unless `.nojekyll` exists at the published root. Without it the JS bundle 404s and the site is dead, in a way that looks exactly like a CDN caching bug (intermittent "the file exists but still 404s") — don't misdiagnose it as caching and go bump build-marker hashes instead, that was tried on 2026-09-03 and did nothing because the file was never being served at all.
5. Push the contents of `dist/` (including `.nojekyll`) to the `gh-pages` branch (e.g. via a throwaway `git worktree`), leaving `master`'s working tree untouched.
6. Verify the deploy actually landed: `curl -sI` a real `_expo/...` asset URL (not just `index.html`, which Jekyll doesn't touch either way) and confirm it's 200.

Live URL: https://masato-masa.github.io/animal-puzzle/

