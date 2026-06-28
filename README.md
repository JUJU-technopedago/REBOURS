# Horloge DELF DALF

Application de chronometrage pour examens DELF/DALF avec:
- module epreuves collectives
- module salle de surveillance d'oraux
- durees configurables par niveau A1 a C2
- affichage global avec ou sans secondes

## Prerequis desktop (Tauri)

1. Installer Rust (toolchain stable):

```bash
winget install Rustlang.Rustup
```

2. Redemarrer le terminal puis verifier:

```bash
rustc --version
cargo --version
```

## Lancer sans serveur (desktop)

Cette application fonctionne en desktop via Tauri.

1. Installer les dependances:

```bash
npm install
```

2. Lancer en desktop (sans serveur):

```bash
npm run desktop
```

## Creer une version distribuable (Windows)

Generer le bundle Windows (NSIS):

```bash
npm run dist:win
```

Les fichiers generes se trouvent dans le dossier `src-tauri/target/release/bundle/`.

- Installateur NSIS: `src-tauri/target/release/bundle/nsis/*.exe`

## Lancer en mode web (optionnel)

```bash
npm run dev
```

## Preparer un dossier web telechargeable depuis GitHub

Cette commande cree un dossier pret a partager, avec JavaScript obfusque:

```bash
npm run web:github
```

Le resultat est genere dans `release/github-web/`.
L utilisateur peut telecharger ce dossier et ouvrir `index.html`.

## Notes techniques

- `vite.config.ts` utilise `base: './'` pour que les assets soient charges en chemins relatifs.
- la build web est generee dans `dist/web/`.
- `dist/index.html` redirige automatiquement vers `dist/web/index.html` pour conserver un point d'entree simple.
- le point d'entree desktop est `src-tauri/src/main.rs` avec configuration `src-tauri/tauri.conf.json`.
- les configurations de durees et l'option secondes sont persistees dans le stockage local.