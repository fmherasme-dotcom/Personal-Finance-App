# Reclaim

A household finance app that finds wasted money and redirects it into savings and investments. Built from the Claude Design handoff in `../project/`.

```sh
npm install
npm run dev
```

All screens are connected and save data: onboarding, Home (weekly pulse), Waste Finder, Business, Net Worth, Stocks & crypto, Bills, AI Coach, Retirement, Budget, Settings, Category rules, Import (placeholder).

- **Storage:** inside claude.ai the page uses the artifact's shared `db`, so everyone the page is shared with sees the same household. Run locally, it falls back to `localStorage`.
- **AI coach:** follow-up questions use the `sample` capability (the viewer's Claude account). The weekly briefing itself is computed from the data.
- **Example data:** `node scripts/seed.mjs` prints the example household as `{collection: {id: doc}}`.
- Code: `src/store` (data model, calculations, persistence), `src/screens`, `src/sheets` (forms), `src/components`.
