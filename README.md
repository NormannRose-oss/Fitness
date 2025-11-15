# Gym Planner — Full Production-Ready Repo

This repository is a full-featured web app prototype (React + Three.js) for planning fitness rooms.
It includes:
- 2.5D isometric rendering with orthographic camera
- Room dimensions in cm
- Add objects via quick buttons or free-text (mocked LLM)
- Drag & drop, snap-to-grid, snap-to-wall
- Usage radius and collision visualization
- Save to IndexedDB (localforage), export JSON
- Mobile-optimized UI

## Deploy to GitHub Pages automatically (recommended)

1. Create a new GitHub repository and push this project.
2. In the repo, go to Settings → Secrets → Actions and add `OPENAI_API_KEY` if you plan to enable OpenAI calls.
3. Add the GitHub Action workflow (already included in `.github/workflows/deploy.yml`) which builds and deploys to the `gh-pages` branch.

### Quick steps

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<yourname>/<repo>.git
git push -u origin main
```

After pushing, Actions will build and deploy. GitHub Pages will serve from `gh-pages` branch.

## Local dev

```bash
npm install
npm run dev
```

## Replace mocked LLM with OpenAI

Edit `src/App.tsx` function `suggest` — replace with fetch to OpenAI API. Use the secret `OPENAI_API_KEY` via GitHub Actions for server-side calls, or prompt for user key on client (less secure).

