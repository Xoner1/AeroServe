# Rapport — Application Mobile AeroServe (Flutter)
## Guide d'utilisation, rôles et configuration — Juin 2026

---

## 1. Profils autorisés sur mobile

L'accès à l'application mobile est restreint par une liste blanche de rôles. Seuls les profils suivants peuvent se connecter :

| Rôle | Nom | Accès |
|------|-----|-------|
| `SUPER_ADMIN` | Super Administrateur | Dashboard + Commandes + Ventes + Stocks + Planning + Profil |
| `RESPONSABLE_FB` | Responsable F&B | Dashboard + Gestion Caissiers + Commandes + Planning + Profil |
| `RESPONSABLE_HYGIENE` | Responsable Hygiène | Contrôle Produits + Profil |
| `CAISSIER` | Agent de caisse | Planning + Chatbot IA + Profil |

> [!WARNING]
> Tout autre rôle (Chef de Cuisine, Chef Magasin, Responsable Achat) est bloqué à la connexion avec le message :
> *"Accès refusé : Ce profil n'est pas autorisé à utiliser l'application mobile."*

---

## 2. Fonctionnalités par rôle

### A. Responsable F&B (`RESPONSABLE_FB`)

- **Gestion des Caissiers** : Écran à deux onglets (Actifs / Inactifs). Activation ou suspension d'un caissier par simple bouton. Assignation dynamique d'un Point de Vente pour chaque caissier.
- **Commandes internes** : Création de commandes d'approvisionnement depuis un catalogue visuel interactif (sélecteur de quantité `[−] Qty [+]`, filtre par type, date de livraison).
- **Planning** : Consultation des shifts de l'équipe avec affichage du Point de Vente par shift.
- **Notifications en temps réel** : Bannière flottante lors de toute affectation PDV ou changement de statut.

### B. Responsable Hygiène (`RESPONSABLE_HYGIENE`)

- **Écran de Contrôle Produits** : Liste tous les plats et aliments approuvés. Recherche par nom. Badge de statut (Conforme / Non conforme / En cours) basé sur le dernier rapport d'inspection.
- **Fiche d'inspection** : Affichage des allergènes déclarés et de la date DLC. L'inspecteur valide les allergènes, vérifie la DLC, sélectionne le statut de conformité et soumet le rapport (`POST /hygiene-reports`).
- **Scanner QR Code** : Redirige directement vers la fiche d'inspection du produit scanné.

### C. Caissier (`CAISSIER`)

- **Planning personnel** : Calendrier complet avec shifts, horaires début/fin, jours de congé, et Point de Vente assigné — synchronisé en temps réel.
- **Chatbot IA** : Assistant nutritionnel pour conseiller les clients. Peut être utilisé sans scanner un produit. Répond uniquement aux questions sur les allergènes, ingrédients et compatibilité santé.

### D. Super Administrateur (`SUPER_ADMIN`)

- Tableau de bord complet (KPIs, stocks bas, commandes en attente).
- Accès à la gestion des commandes, ventes, stocks et planning.

---

## 3. Architecture technique

- **Framework** : Flutter (Android & iOS)
- **Backend** : API REST Laravel avec base de données MySQL (`AlwaysData`)
- **Authentification** : Tokens JWT stockés localement via `SharedPreferences`
- **Notifications** : Polling toutes les 15 secondes avec SnackBar premium pour les nouvelles alertes

---

## 4. Guide de connexion et de test

### Étape 1 — Démarrer le serveur Laravel
```bash
php artisan serve --host=0.0.0.0 --port=8000
```

### Étape 2 — Connecter l'appareil au même réseau Wi-Fi
Le smartphone et l'ordinateur doivent être sur le **même réseau Wi-Fi local**.

### Étape 3 — Trouver l'adresse IP de l'ordinateur

**macOS (Terminal) :**
```bash
ipconfig getifaddr en0
```

**Windows (CMD) :**
```cmd
ipconfig
```
→ Chercher la ligne "Adresse IPv4" (ex: `192.168.1.53`)

### Étape 4 — Configurer l'URL dans l'application
1. Lancer l'application AeroServe.
2. Sur l'écran de connexion, appuyer sur l'icône **⚙️** en haut à droite.
3. Appuyer sur **"Par défaut"** — l'adresse est pré-remplie.
4. Appuyer sur **"Enregistrer"**.

```
URL de l'API : http://[IP_DE_VOTRE_ORDINATEUR]:8000/api
Exemple      : http://192.168.1.53:8000/api
```

### Étape 5 — Comptes de test disponibles

| Email | Mot de passe | Rôle | Scénario de test |
|-------|-------------|------|-----------------|
| `hygiene@aeroserve.com` | `password` | Responsable Hygiène | Soumettre un rapport de conformité sur un produit |
| `fb@aeroserve.com` | `password` | Responsable F&B | Gérer les caissiers, créer une commande interne |
| `cashier@aeroserve.com` | `password` | Caissier | Consulter le planning, utiliser le chatbot IA |
| `admin@aeroserve.com` | `password` | Super Admin | Consulter le tableau de bord global |

---

> [!TIP]
> **Compilation validée :** L'application mobile a été auditée et compilée sans aucune erreur (`No issues found`). Toutes les corrections de la session du 13–14 juin 2026 sont intégrées.
