# Ballmania

Jeu de tir de billes en chaîne réinventé : campagne de six mondes, nouveaux modes,
destruction spectaculaire, en français, anglais et indonésien. Vue 3, TypeScript, mobile
d'abord.

- Cahier des charges : [docs/CAHIER_DES_CHARGES.md](docs/CAHIER_DES_CHARGES.md)
- Journal des modifications : [CHANGELOG.md](CHANGELOG.md)

## Démarrer

Node 22.12 ou plus récent (voir `.nvmrc`).

```bash
npm install
npm run dev
```

## Commandes

| Commande             | Rôle                                                         |
| -------------------- | ------------------------------------------------------------ |
| `npm run dev`        | Serveur de développement                                     |
| `npm run build`      | Vérification des types puis build de production (`dist/`)    |
| `npm run verify`     | Lint, format, types, tests unitaires et build (avant commit) |
| `npm test`           | Tests unitaires (Vitest)                                     |
| `npm run test:e2e`   | Parcours Playwright, mobile et ordinateur                    |
| `npm run lighthouse` | Audit Lighthouse mobile du build (`-- --desktop` sinon)      |
