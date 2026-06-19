# Rapport Technique : Assistant Client Intelligent AeroServe

Ce document présente l'architecture, le fonctionnement et le guide de déploiement de l'application Chatbot Client d'AeroServe. Ce module est conçu pour être déployé sur le cloud (Vercel) afin de permettre aux clients de l'aéroport d'accéder à l'assistant virtuel en scannant des QR Codes placés sur les tables des points de vente.

---

## 1. Contexte et Objectifs du Module

Dans le cadre du système de gestion F&B AeroServe, l'assistant client joue un rôle crucial de médiateur d'information. Ses objectifs principaux sont :
- Offrir une interface conversationnelle fluide et multilingue (arabe, français, anglais).
- Assurer une sécurité alimentaire stricte en fournissant des informations fiables sur les allergènes et la conformité hygiénique des plats.
- Garantir l'exactitude des informations en interdisant à l'intelligence artificielle de spéculer ou d'inventer des données (hallucinations), en la forçant à lire directement les rapports saisis par le Responsable Hygiène dans la base de données.

---

## 2. Architecture Technique

L'application est développée selon une architecture moderne découplée :

### Composants Technologiques
- **Framework Frontend/Backend** : Next.js (version 16) avec l'architecture App Router. Cette technologie permet de gérer l'interface utilisateur et de déployer des fonctions API sans serveur (Serverless) au même endroit.
- **Moteur d'Intelligence Artificielle** : API Groq utilisant le modèle Llama 3.3 (modèle `llama-3.3-70b-versatile`). Ce choix offre des performances de raisonnement élevées et un temps de réponse inférieur à une seconde.
- **Accès aux données** : Utilisation du client standard `mysql2/promise` pour Node.js avec implémentation d'un pool de connexions (Connection Pool) pour optimiser les performances d'accès à la base de données.
- **Interface Utilisateur** : Composants React stylisés avec CSS sur mesure assurant une interface fluide et responsive, optimisée pour les smartphones.

---

## 3. Fonctionnement Interne de l'Agent IA

L'originalité technique du chatbot repose sur l'intégration du **Tool Calling** (Function Calling). L'agent IA n'est pas un simple modèle de discussion textuelle, mais un agent actif capable de déclencher des actions logiques sur le serveur.

### Processus d'exécution d'une requête client :
1. L'utilisateur envoie une question (exemple : "Est-ce que la salade césar contient du gluten ?").
2. L'API Route (`/api/chat`) envoie l'historique et la question à Groq avec la définition de l'outil `obtenir_infos_produit`.
3. Le modèle analyse la question et détermine s'il a besoin de lire la base de données.
4. Si nécessaire, le modèle retourne une demande d'appel de fonction contenant les arguments nécessaires (exemple : `obtenir_infos_produit(nom_produit: "salade césar")`).
5. Le serveur Next.js intercepte cette demande, exécute la requête SQL correspondante sur la base de données MySQL locale ou distante, puis renvoie le résultat brut au modèle.
6. Le modèle combine ces informations fiables pour générer une réponse claire et structurée à l'utilisateur dans sa langue.

---

## 4. Schéma de la Base de Données et Requête SQL

L'outil `obtenir_infos_produit` exécute la requête SQL suivante pour récupérer les données de conformité et d'allergènes :

```sql
SELECT p.id, p.name, p.description, p.type, h.status as hygiene_status, p.allergens, h.remarks 
FROM products p 
LEFT JOIN hygiene_reports h ON p.id = h.product_id 
WHERE p.name LIKE ? AND p.type = 'food'
ORDER BY h.created_at DESC LIMIT 1;
```

### Explication de la requête :
- **Filtre strict (`p.type = 'food'`)** : Garantit que l'assistant ne répond qu'aux requêtes concernant la nourriture et les boissons, bloquant l'accès aux matières premières ou produits commerciaux du stock.
- **Jointure externe gauche (`LEFT JOIN`)** : Permet de récupérer les informations du produit même si aucun rapport d'hygiène n'a encore été soumis.
- **Tri chronologique (`ORDER BY h.created_at DESC LIMIT 1`)** : Assure que seul le rapport d'hygiène le plus récent est pris en compte pour l'évaluation de la conformité du produit.

---

## 5. Guide de Connexion entre Vercel et le Serveur Local (Pinggy / Bore)

Pour les besoins de la soutenance académique (PFE) ou des phases de test client, la base de données MySQL s'exécute sur une machine locale, tandis que le chatbot est déployé sur Vercel. Pour permettre au serveur Vercel de franchir le pare-feu local et de lire la base de données sans requérir de carte bancaire, nous utilisons un tunnel TCP via **Pinggy** (sans installation via SSH) ou **Bore**.

### Protocole de configuration :

1. **Démarrage de la base de données locale** :
   S'assurer que MySQL est actif sur le port standard `3306` (via XAMPP, Laragon ou MySQL autonome).

2. **Initialisation du Tunnel TCP** :
   * **Option A (Pinggy - Recommandé, limite de 60 minutes)** :
     Exécuter la commande suivante dans le terminal :
     ```bash
     ssh -p 443 -R0:localhost:3306 tcp.pinggy.io
     ```
     L'adresse générée sera de la forme : `tcp.pinggy.io:12345` (nom d'hôte : `tcp.pinggy.io`, port : `12345`).
   
   * **Option B (Bore - Pas de limite de temps)** :
     Exécuter la commande suivante :
     ```bash
     bore local 3306 --to bore.pub
     ```
     L'adresse générée sera de la forme : `bore.pub:54321` (nom d'hôte : `bore.pub`, port : `54321`).

3. **Mise à jour des variables d'environnement sur Vercel** :
   Dans l'interface de gestion du projet Vercel, accédez aux paramètres des variables d'environnement et configurez les clés suivantes :
   - `DB_HOST` : `tcp.pinggy.io` (ou `bore.pub` selon l'option choisie)
   - `DB_PORT` : Le port dynamique fourni (ex: `12345` ou `54321`)
   - `DB_USER` : `root` (ou utilisateur local configuré)
   - `DB_PASSWORD` : (laissez vide si aucun mot de passe n'est configuré localement)
   - `DB_NAME` : `aeroserve`
   - `GROQ_API_KEY` : (clé d'accès Groq active)

   Déclencher un nouveau déploiement sur Vercel pour appliquer les nouveaux paramètres de connexion. Le chatbot Vercel est alors directement connecté à la base de données s'exécutant sur la machine locale.

---

## 6. Structure du Code Source (Dossier `chatbot_client`)

- **`src/app/page.tsx`** : Interface utilisateur réactive gérant l'état des messages, les animations de chargement et le défilement automatique.
- **`src/app/api/chat/route.ts`** : Contrôleur API principal orchestrant les appels à l'API Groq, la gestion de l'historique conversationnel et l'appel de l'outil de base de données.
- **`src/app/lib/db.ts`** : Module d'initialisation du pool de connexions MySQL réutilisable par les fonctions serveurs.
- **`src/app/globals.css`** : Feuille de style intégrant la palette de couleurs officielle d'AeroServe (Sage, Moss, Cream, Terracotta) et assurant le design responsive.
