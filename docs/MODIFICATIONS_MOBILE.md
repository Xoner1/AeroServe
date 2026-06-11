# Modifications Apportées à l'Application Mobile (Flutter)

Ce document répertorie et documente toutes les modifications apportées à l'application mobile companion d'AeroServe pour répondre aux besoins spécifiques et unifier le design avec la version web.

---

## 1. Ajustement Thématique & Unification Visuelle

### Correction des couleurs de sélection
* **Fichier modifié :** [app_theme.dart](file:///Users/fakhreddinefarhat/Downloads/AeroServe%20/aeroservemobileahlem-main/lib/core/app_theme.dart)
* **Description :** Le curseur d'édition et la surbrillance de sélection des textes dans les champs de saisie étaient par défaut de couleur bleue (la couleur par défaut des plateformes Android/iOS). Nous avons configuré la propriété `textSelectionTheme` dans le thème global de l'application pour utiliser l'accent principal de la charte graphique : **Electric Teal (`#0D9488`)**.
* **Impact :** Les curseurs, poignées de sélection et fonds de sélection de texte sont maintenant homogènes sur toute l'application.

---

## 2. Refonte Graphique de la Page de Connexion

### Fond de page clair et moderne
* **Fichier modifié :** [login_screen.dart](file:///Users/fakhreddinefarhat/Downloads/AeroServe%20/aeroservemobileahlem-main/lib/screens/login_screen.dart)
* **Description :** Remplacement de la couleur de fond globale de la page (anciennement `AppTheme.primary` - Slate 900 sombre `#0F172A`) par la couleur claire et apaisante `AppTheme.surface` (Slate 50 gris très clair `#F8FAFC`).
* **Impact :** La carte de connexion blanche (`#FFFFFF`) se détache désormais parfaitement avec son ombre portée raffinée et ses bordures légères, reproduisant l'esthétique premium de la version Angular d'AeroServe.

---

## 3. Fonctionnalité de Réinitialisation du Mot de Passe

### Ajout du bouton et du modal interactif
* **Fichier modifié :** [login_screen.dart](file:///Users/fakhreddinefarhat/Downloads/AeroServe%20/aeroservemobileahlem-main/lib/screens/login_screen.dart)
* **Description :**
  * Ajout d'un bouton discret et élégant **"Mot de passe oublié ?"** sous le champ de mot de passe.
  * Création d'une méthode `_showForgotPasswordDialog` qui affiche une fenêtre d'alerte modale intégrant la validation de l'e-mail.
  * Liaison directe avec le point d'accès API public de Laravel (`POST /forgot-password`) pour envoyer le mail de réinitialisation.
  * Gestion complète de l'expérience utilisateur : état de chargement avec spinner, affichage dynamique des erreurs réseau ou serveur en rouge, et fermeture de la modale avec SnackBar verte de confirmation en cas de réussite.

---

## 4. Limitation d'Accès par Rôle (Liste Blanche)

### Sécurisation de l'application
* **Fichier modifié :** [auth_provider.dart](file:///Users/fakhreddinefarhat/Downloads/AeroServe%20/aeroservemobileahlem-main/lib/providers/auth_provider.dart)
* **Description :** Configuration d'une liste blanche de rôles autorisés à utiliser le canal mobile : `['CAISSIER', 'SUPER_ADMIN', 'RESPONSABLE_HYGIENE']` (SUPER_ADMIN conservé pour le contrôle d'administration et les tests, RESPONSABLE_HYGIENE ajouté pour le suivi de l'hygiène).
* **Impact :** 
  * Au moment de la connexion (`login`), si l'utilisateur possède un rôle non autorisé (ex: *Responsable F&B*, *Chef de cuisine*, *Magasinier*), l'application rejette l'authentification et lève une exception avec le message *"Accès refusé : Ce profil n'est pas autorisé à utiliser l'application mobile."*.
  * Au démarrage de l'application (`_checkAuth`), si la session en cours appartient à un rôle qui a été retiré de la liste blanche, elle est nettoyée et le utilisateur est déconnecté automatiquement.

---

## 5. Intégration du Chatbot IA Général pour le Caissier

### Nouvel onglet et flexibilité de l'IA
* **Fichiers modifiés :**
  * [api_service.dart](file:///Users/fakhreddinefarhat/Downloads/AeroServe%20/aeroservemobileahlem-main/lib/services/api_service.dart) (Remplacement de `productId` obligatoire par un type nullable `int?` pour la méthode d'interrogation IA).
  * [chatbot_screen.dart](file:///Users/fakhreddinefarhat/Downloads/AeroServe%20/aeroservemobileahlem-main/lib/screens/chatbot_screen.dart) (Adaptation de l'écran pour être autonome sans produit : message d'accueil ajusté invitant à scanner/rechercher, masquage des puces d'accès rapide aux allergènes si aucun produit n'est chargé).
  * [home_screen.dart](file:///Users/fakhreddinefarhat/Downloads/AeroServe%20/aeroservemobileahlem-main/lib/screens/home_screen.dart) (Importation de la vue et ajout de l'onglet dans la barre de navigation inférieure).
* **Description :** Le caissier a maintenant accès à un onglet dédié **Chatbot IA** directement dans la navigation inférieure. Il peut y poser ses questions globales de manière autonome, ce qui complète sa fiche d'horaires (Planning) et son profil.

---

## 6. Correction de la Récupération du Planning pour le Caissier

### Correction du mapping des champs JSON
* **Fichiers modifiés :**
  * [models.dart](file:///Users/fakhreddinefarhat/Downloads/AeroServe%20/aeroservemobileahlem-main/lib/models/models.dart) (Correction du constructeur factory `Planning.fromJson`).
  * [planning_screen.dart](file:///Users/fakhreddinefarhat/Downloads/AeroServe%20/aeroservemobileahlem-main/lib/screens/planning_screen.dart) (Ajout de logs de débogage pour les erreurs de chargement).
* **Description :**
  * **Nom de l'utilisateur (`userName`) :** Auparavant, le parser cherchait la clé `json['user']`. Cependant, la relation retournée par Laravel est nommée `caissier`. Nous avons adapté le parser pour chercher en priorité `json['caissier']` puis `json['user']`.
  * **Heures de début et fin de shift (`shiftStart`, `shiftEnd`) :** Le parser cherchait `shift_start` et `shift_end` qui étaient nuls. Nous les avons liés aux clés correctes retournées par l'API Laravel : `start_time` et `end_time`.
  * **Détection du jour de repos (`isDayOff`) :** Prise en compte de la valeur textuelle `day_status` (`OFF` ou `CONGE`) en plus de la valeur booléenne `is_day_off` pour assurer le bon rendu visuel.

---

## 7. Initialisation des Données Régionales (Date formatting)

### Résolution de LocaleDataException
* **Fichier modifié :** [main.dart](file:///Users/fakhreddinefarhat/Downloads/AeroServe%20/aeroservemobileahlem-main/lib/main.dart)
* **Description :** L'utilisation de la locale `fr_FR` dans l'affichage des dates du planning levait une exception `LocaleDataException` car les symboles régionaux n'étaient pas initialisés au démarrage du moteur Flutter.
* **Impact :** 
  * Initialisation asynchrone des liaisons Flutter et chargement des symboles de date via `WidgetsFlutterBinding.ensureInitialized()` et `await initializeDateFormatting('fr_FR', null)` avant le lancement de l'application dans la méthode `main()`.

---

## 8. Unification de la Barre de Titre Supérieure (AppBar)

### Passage au style clair (White/Light Premium)
* **Fichiers modifiés :**
  * [app_theme.dart](file:///Users/fakhreddinefarhat/Downloads/AeroServe%20/aeroservemobileahlem-main/lib/core/app_theme.dart) (Configuration globale du `appBarTheme`).
  * [planning_screen.dart](file:///Users/fakhreddinefarhat/Downloads/AeroServe%20/aeroservemobileahlem-main/lib/screens/planning_screen.dart), [chatbot_screen.dart](file:///Users/fakhreddinefarhat/Downloads/AeroServe%20/aeroservemobileahlem-main/lib/screens/chatbot_screen.dart), [profile_screen.dart](file:///Users/fakhreddinefarhat/Downloads/AeroServe%20/aeroservemobileahlem-main/lib/screens/profile_screen.dart), [dashboard_screen.dart](file:///Users/fakhreddinefarhat/Downloads/AeroServe%20/aeroservemobileahlem-main/lib/screens/dashboard_screen.dart), [qr_scanner_screen.dart](file:///Users/fakhreddinefarhat/Downloads/AeroServe%20/aeroservemobileahlem-main/lib/screens/qr_scanner_screen.dart), [orders_screen.dart](file:///Users/fakhreddinefarhat/Downloads/AeroServe%20/aeroservemobileahlem-main/lib/screens/orders_screen.dart), [sales_screen.dart](file:///Users/fakhreddinefarhat/Downloads/AeroServe%20/aeroservemobileahlem-main/lib/screens/sales_screen.dart), [menu_planning_screen.dart](file:///Users/fakhreddinefarhat/Downloads/AeroServe%20/aeroservemobileahlem-main/lib/screens/menu_planning_screen.dart) et [stock_alerts_screen.dart](file:///Users/fakhreddinefarhat/Downloads/AeroServe%20/aeroservemobileahlem-main/lib/screens/stock_alerts_screen.dart) (Suppression des surcharges manuelles de couleur).
* **Description :**
  * Pour unifier le design et supprimer le bandeau bleu foncé (qui n'était pas apprécié), la barre de titre supérieure (`AppBar`) utilise désormais un **style blanc/clair premium**.
  * **Configuration globale :** Fond blanc (`AppTheme.card`), texte et icônes gris foncé (`AppTheme.textPrimary` - Slate 800), suppression de l'ombre portée imposante au profit d'une **bordure inférieure très fine et subtile** (`AppTheme.divider` - Slate 200) pour marquer la séparation avec le reste de la page.
  * Tous les écrans (Planning, Chatbot, Profil, Dashboard, Scanner QR, Commandes, Ventes, Menus, Stocks) héritent désormais automatiquement de ce style épuré et moderne, sans aucune surcharge manuelle de couleur.

---

## 9. Édition de Profil (Image, Nom, Téléphone)

### Gestion complète et universelle des profils
* **Fichiers modifiés :**
  * [pubspec.yaml](file:///Users/fakhreddinefarhat/Downloads/AeroServe%20/aeroservemobileahlem-main/pubspec.yaml) (Ajout du paquet `image_picker` pour la capture/sélection de photos).
  * [models.dart](file:///Users/fakhreddinefarhat/Downloads/AeroServe%20/aeroservemobileahlem-main/lib/models/models.dart) (Ajout du champ `phone` au modèle `User` et prise en charge dans le parser JSON).
  * [api_service.dart](file:///Users/fakhreddinefarhat/Downloads/AeroServe%20/aeroservemobileahlem-main/lib/services/api_service.dart) (Création de `updateProfile` avec `http.MultipartRequest` et spoofing HTTP `POST` -> `PUT` pour Laravel).
  * [auth_provider.dart](file:///Users/fakhreddinefarhat/Downloads/AeroServe%20/aeroservemobileahlem-main/lib/providers/auth_provider.dart) (Méthode `updateProfile` synchronisant l'état local avec `SharedPreferences`).
  * [profile_screen.dart](file:///Users/fakhreddinefarhat/Downloads/AeroServe%20/aeroservemobileahlem-main/lib/screens/profile_screen.dart) (Conception du bouton "Modifier le profil" et de la feuille modale d'édition avec sélecteur de photo d'avatar cliquable).
* **Description :**
  * **Accès universel :** L'option d'édition est implémentée sur l'écran partagé `ProfileScreen`. Par conséquent, tout utilisateur de l'application, quel que soit son rôle (Caissier, Admin, etc.), peut éditer son profil.
  * **Sélecteur d'avatar :** Intégration d'un sélecteur visuel d'image cliquable avec aperçu immédiat et badge appareil photo.
  * **Champs éditables :** Prénom, Nom et Numéro de téléphone.
  * **Synchronisation et persistance :** Les modifications sont envoyées au serveur sous forme de données Multipart (gérant le fichier image et les textes) et sauvegardées localement dans `SharedPreferences` pour persister après reconnexion ou redémarrage.

---

## 10. Contrôle d'Hygiène Alimentaire (Scannage & Rapports)

### Processus d'inspection et rapport de non-conformité pour le Responsable Hygiène
* **Fichiers modifiés :**
  * [models.dart](file:///Users/fakhreddinefarhat/Downloads/AeroServe%20/aeroservemobileahlem-main/lib/models/models.dart) (Mise à jour du modèle `Product` pour inclure et parser les allergènes et la date d'expiration).
  * [qr_scanner_screen.dart](file:///Users/fakhreddinefarhat/Downloads/AeroServe%20/aeroservemobileahlem-main/lib/screens/qr_scanner_screen.dart) (Redirection dynamique : si l'utilisateur connecté est `RESPONSABLE_HYGIENE`, le scannage d'un QR code de produit l'oriente vers le contrôle d'hygiène au lieu du Chatbot IA).
  * [hygiene_check_screen.dart](file:///Users/fakhreddinefarhat/Downloads/AeroServe%20/aeroservemobileahlem-main/lib/screens/hygiene_check_screen.dart) (Création de l'écran de formulaire d'inspection d'hygiène).
* **Description :**
  * **Sécurisation par Type de Produit :** L'écran de contrôle vérifie que le produit scanné est de type `food` ou `plat`. Si ce n'est pas le cas, un message d'avertissement empêche la validation.
  * **Champs de Contrôle :** L'inspecteur peut visualiser les allergènes déclarés et la date d'expiration du produit, puis cocher s'ils ont été vérifiés.
  * **Statut de Conformité :** Choix rapide du statut : `conforme`, `non_conforme` ou `en_cours` avec indicateurs colorés premium.
  * **Envoi et Notification :** Les remarques saisies sont envoyées via `POST /hygiene-reports` à l'API Laravel, ce qui crée le rapport et déclenche automatiquement des notifications pour les rôles F&B et magasin en cas de non-conformité.

---

## 11. Résolution du débordement visuel (StatCard Overflow)

### Correction de la hauteur des cartes statistiques du tableau de bord
* **Fichiers modifiés :**
  * [stat_card.dart](file:///Users/fakhreddinefarhat/Downloads/AeroServe%20/aeroservemobileahlem-main/lib/widgets/stat_card.dart) (Réduction des marges internes/padding de `AppTheme.spacingM` (16px) à `AppTheme.spacingS` (12px)).
  * [dashboard_screen.dart](file:///Users/fakhreddinefarhat/Downloads/AeroServe%20/aeroservemobileahlem-main/lib/screens/dashboard_screen.dart) (Ajustement du ratio de format `childAspectRatio` dans GridView de `1.5` à `1.2`).
* **Description :**
  * **Contexte :** Sur les appareils mobiles ayant des écrans plus étroits ou des tailles de police système agrandies, la hauteur calculée automatiquement pour les cartes d'indicateurs de performance (StatCard) via le ratio `1.5` était insuffisante. Cela provoquait une erreur d'overflow visuel (`RenderFlex overflowed by 13 pixels on the bottom`).
  * **Résolution :** L'augmentation de la hauteur de la carte (en passant le ratio à `1.2`) combinée à la réduction subtile du padding interne a libéré de l'espace vertical, résolvant complètement le débordement tout en améliorant la lisibilité des chiffres et des intitulés.






