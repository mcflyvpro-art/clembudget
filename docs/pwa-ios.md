# PWA iOS — vraie app plein écran

## ⚠️ À faire une fois sur l'iPhone après ce déploiement

iOS fige les réglages d'une app au moment où on l'ajoute à l'écran d'accueil.
Une icône installée avant ce correctif restera un marque-page Safari **pour
toujours**, même après mise à jour du site.

1. **Supprimer** l'ancienne icône « Mon Budget » de l'écran d'accueil
2. Ouvrir le site dans **Safari** (pas Chrome : seul Safari sait installer une PWA sur iOS)
3. **Partager** → **Sur l'écran d'accueil** → **Ajouter**
4. Lancer depuis la nouvelle icône : plus de barre d'adresse, plus de barre d'outils

## Ce qui cassait l'installation

Le matcher de `proxy.ts` faisait passer `/manifest.webmanifest` par le
contrôle d'authentification. Or **Safari télécharge le manifeste sans
cookies** : il recevait donc une redirection 307 vers `/login`, puis du HTML
au lieu du JSON. Sans manifeste valide, `display: standalone` n'était jamais
lu et « Ajouter à l'écran d'accueil » ne créait qu'un marque-page.

`/sw.js` subissait le même sort, donc le service worker ne s'enregistrait pas
non plus.

Ces deux fichiers — plus les icônes et les splash screens — sont maintenant
exclus du matcher. **Toute nouvelle ressource PWA publique doit l'être aussi.**

## Comment le vérifier

```bash
# doit répondre 200 + application/manifest+json, jamais 307
curl -i https://<domaine>/manifest.webmanifest
curl -i https://<domaine>/sw.js
```

## Blocage du zoom

Safari iOS **ignore volontairement** `user-scalable=no` : la balise viewport
seule ne suffit pas. Le blocage tient sur trois couches :

| Couche | Fichier | Rôle |
|---|---|---|
| `viewport` (`userScalable: false`, `maximumScale: 1`) | `app/layout.tsx` | Android + navigateurs non-WebKit |
| `touch-action: pan-x pan-y` | `app/globals.css` | supprime le double-tap zoom |
| `gesturestart/change/end` + touchmove à 2 doigts | `components/native-app.tsx` | supprime le pincement sur Safari iOS |

Quatrième piège, le plus courant : **iOS zoome tout seul quand on focalise un
champ dont la police fait moins de 16 px**. `globals.css` force donc 16 px sur
tous les champs en `pointer: coarse`, sauf ceux marqués `text-lg`/`text-xl`/
`text-2xl`… ou `keep-font-size`.

## Splash screens

`public/splash/` contient 22 PNG (11 modèles d'iPhone × 2 orientations),
générés à partir de `public/logo.png` sur le fond `#FAF6F1`. Sans eux, le
lancement affiche une page blanche — le signe le plus évident d'un site web.

Chaque image doit faire **exactement** `largeur CSS × DPR` par
`hauteur CSS × DPR`. La table des correspondances est dans
`lib/apple-startup-images.ts`. Pour un nouveau modèle d'iPhone : ajouter la
taille au script de génération, puis la ligne correspondante dans ce fichier.

## Coquille d'app

Sur mobile (`< lg`), `.app-shell` fige la hauteur à `100dvh` avec
`overflow: hidden`, et seul `<main id="app-scroll">` défile. Conséquences :

- plus de rebond élastique en bout de liste
- plus de pull-to-refresh
- la barre d'onglets et l'en-tête sont réellement fixes
- **tout code qui faisait `window.scrollTo()` doit viser `#app-scroll`**

Quand le clavier s'ouvre, `native-app.tsx` pose `is-keyboard-open` sur `<html>` :
la barre d'onglets et le bouton `+` s'escamotent, comme dans une app native.
