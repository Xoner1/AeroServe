<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use App\Models\User;

class ChatbotController extends Controller
{
    /**
     * Ask the AI chatbot about a specific food product.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function ask(Request $request): JsonResponse
    {
        $request->validate([
            'product_id' => 'nullable|exists:products,id',
            'message' => 'required|string|max:1000',
        ]);

        $productId = $request->input('product_id');
        $message = $request->input('message');

        // Fetch the authenticated user and role
        /** @var User|null $user */
        $user = Auth::user();
        $userRole = $user && $user->role ? $user->role->name : 'GUEST';
        $userName = $user ? "{$user->first_name} {$user->last_name}" : 'Utilisateur';

        // 1. CASHIER SPECIFIC RESTRICTIONS
        if ($userRole === 'CAISSIER') {
            if (!$productId) {
                return response()->json([
                    'success' => true,
                    'response' => "Assistant Qualite et Sante (Mode Client) : Bonjour {$userName} !\n\nEn tant que Caissier, je suis configure pour repondre exclusivement aux questions des clients concernant la composition, les allergenes et la securite de nos plats et boissons.\n\nVeuillez scanner le code QR d'un produit ou le selectionner depuis sa fiche pour poser vos questions (ex: intolerance au gluten, lactose, arachides, diabete, etc.).",
                    'source' => 'cashier_restriction_engine'
                ]);
            }

            if ($this->isForbiddenForCashier($message)) {
                return response()->json([
                    'success' => true,
                    'response' => "Acces limite : En tant que Caissier, vous pouvez uniquement poser des questions sur les allergenes, les ingredients ou la compatibilite sante de ce produit pour repondre aux clients. Les questions administratives, financieres ou logistiques (stocks, commandes, plannings, utilisateurs) ne sont pas autorisees pour ce role.",
                    'source' => 'cashier_restriction_engine'
                ]);
            }
        }

        // 2. ROLE-BASED CONTEXT RESTRICTIONS FOR SYSTEM PROMPTS
        $roleDescriptions = [
            'SUPER_ADMIN' => "Tu es le copilote global de AeroServe. Tu as acces a la gestion globale des utilisateurs, des points de vente et aux KPIs financiers. Tu peux repondre aux questions d'administration generale.",
            'RESPONSABLE_FB' => "Tu es le responsable F&B de AeroServe. Tu as acces a la planification des shifts des caissiers, a la gestion operationnelle des points de vente, et a la commande d'articles. Tu ne dois pas divulguer d'informations confidentielles sur d'autres roles.",
            'CHEF_CUISINE' => "Tu es le Chef de Cuisine. Tu t'occupes des recettes, des produits alimentaires (Food), des menus du personnel et des commandes de matieres premieres. Ne reponds jamais aux questions sur les statistiques de vente des points de vente, la comptabilite ou les salaires.",
            'CHEF_MAGASIN' => "Tu es le Chef de Magasinier. Tu t'occupes de la gestion FIFO du stock en reserve, des lots perimes, et de la validation des commandes commerciales. Tu n'as pas acces aux recettes secretes de cuisine ou aux donnees financieres.",
            'RESPONSABLE_ACHAT' => "Tu es le responsable Achat. Tu valides les produits soumis par le magasinier, configures les prix d'achat, geres les categories, et analyses les previsions d'approvisionnement IA.",
            'RESPONSABLE_HYGIENE' => "Tu es le responsable Hygiene. Tu rediges les audits de securite alimentaire, declares les allergenes et signales les non-conformites.",
            'CAISSIER' => "Tu es l'assistant nutritionnel du Caissier en contact avec les clients. Tu reponds exclusivement aux questions des clients sur la composition, les allergenes et la conformite sante du produit en te basant sur les fiches d'hygiene."
        ];

        $roleInstruction = $roleDescriptions[$userRole] ?? "Tu es l'assistant de l'application AeroServe.";

        // Retrieve user account and shift context to enforce strict data isolation
        $userContext = $user ? $this->getUserContextText($user) : "Aucun contexte utilisateur.";

        $productContext = "";
        $hygieneReportsContext = "";

        if ($productId) {
            $product = Product::with(['stock', 'hygieneReports'])->find($productId);

            if (!$product) {
                return response()->json([
                    'success' => false,
                    'message' => 'Produit non trouve.'
                ], 404);
            }

            $ingredients = $product->description ?? 'Aucun ingredient specifie.';
            
            $productContext = "Voici les details du produit alimentaire actuel :\n" .
                              "Produit: {$product->name}\n" .
                              "Type: {$product->type}\n" .
                              "Description/Ingredients: {$ingredients}\n" .
                              "Prix: {$product->price} TND\n";

            if ($product->expiration_date) {
                $productContext .= "Date d'expiration: {$product->expiration_date}\n";
            }

            // Load hygiene declarations pre-configured by Responsable Hygiene
            if ($product->hygieneReports->isNotEmpty()) {
                $hygieneReportsContext = "\nDeclarations et audits du responsable Hygiene pour ce produit :\n";
                foreach ($product->hygieneReports as $report) {
                    $statusStr = $report->status;
                    $allergensStr = $report->allergens_verified ? "Allergenes verifies et valides" : "Allergenes non verifies";
                    $expStr = $report->expiration_verified ? "Date d'expiration verifiee" : "Date d'expiration non verifiee";
                    $hygieneReportsContext .= "- Statut: {$statusStr} | {$allergensStr} | {$expStr}\n";
                    if ($report->remarks) {
                        $hygieneReportsContext .= "  Remarques de l'officier d'hygiene: \"{$report->remarks}\"\n";
                    }
                }
            } else {
                $hygieneReportsContext = "\nDeclarations du responsable Hygiene: Aucune remarque d'hygiene specifique n'a encore ete enregistree pour ce produit.\n";
            }
        }

        // Build the system instructions for the LLM
        if ($userRole === 'CAISSIER') {
            $systemRole = "Tu es l'assistant nutritionnel du Caissier de AeroServe en contact direct avec les clients.\n" .
                          "Tu dois repondre exclusivement aux questions des clients (rapportees par le caissier) concernant la composition, les allergenes et la compatibilite de ce produit avec les maladies ou regimes (ex: intolerance au gluten, au lactose, arachides, diabete, hypertension, etc.).\n" .
                          $productContext . "\n" .
                          $hygieneReportsContext . "\n" .
                          "Directives strictes de securite et de role :\n" .
                          "- Reponds de maniere concise, chaleureuse, et professionnelle dans la meme langue que la question (arabe, francais, etc.).\n" .
                          "- Base-toi STRICTEMENT sur les ingredients du produit et les remarques/declarations pre-configurees par le responsable Hygiene pour evaluer la securite du produit.\n" .
                          "- Ne reponds a AUCUNE question ne concernant pas les aspects nutritionnels, allergenes ou de sante de ce produit specifique.\n" .
                          "- TU NE DOIS JAMAIS divulguer d'informations d'autres comptes, utilisateurs, stocks generaux, commandes ou plannings.\n" .
                          "- Refuse poliment toute question en dehors de la sante et des allergenes de ce produit.\n" .
                          "- N'utilise absolument aucun emoji dans tes reponses.";
        } else {
            $systemRole = "Tu es l'assistant intelligent et le copilote de l'application de restauration AeroServe.\n" .
                          "L'utilisateur connecte s'appelle {$userName} avec le role: {$userRole}.\n" .
                          $userContext . "\n" .
                          ($productId ? $productContext . "\n" . $hygieneReportsContext . "\n" : "") .
                          "Directives strictes de securite :\n" .
                          "- {$roleInstruction}\n" .
                          "- TU NE DOIS JAMAIS divulguer de donnees, de profils, d'e-mails, d'informations de stocks, de commandes ou de plannings concernant d'autres comptes ou roles.\n" .
                          "- Reste strictement cantonne aux sujets et perimetres autorises pour ton role.\n" .
                          "- Tu dois assister l'utilisateur connecte uniquement pour les taches requises par son propre travail.\n" .
                          "- Si l'utilisateur pose une question sur un autre compte, un autre utilisateur, ou en dehors de ses responsabilites professionnelles, refuse poliment d'y repondre en mentionnant la limite de ses droits.\n" .
                          "- Reponds de maniere concise, polie et dans la meme langue que celle de la question.\n" .
                          "- N'utilise absolument aucun emoji dans tes reponses.";
        }

        $openaiKey = config('services.openai.key');
        $groqKey = config('services.groq.key');
        $geminiKey = config('services.gemini.key');

        // 1. Try OpenAI
        if ($openaiKey && $openaiKey !== 'null' && !empty($openaiKey)) {
            try {
                $url = "https://api.openai.com/v1/chat/completions";

                $response = Http::withHeaders([
                    'Authorization' => "Bearer {$openaiKey}",
                    'Content-Type' => 'application/json',
                ])->post($url, [
                    'model' => 'gpt-4o-mini',
                    'messages' => [
                        [
                            'role' => 'system',
                            'content' => $systemRole
                        ],
                        [
                            'role' => 'user',
                            'content' => $message
                        ]
                    ],
                    'temperature' => 0.5,
                    'max_tokens' => 500
                ]);

                if ($response->successful()) {
                    $data = $response->json();
                    $aiResponse = $data['choices'][0]['message']['content'] ?? null;

                    if ($aiResponse) {
                        return response()->json([
                            'success' => true,
                            'response' => trim($aiResponse),
                            'source' => 'openai'
                        ]);
                    }
                }

                Log::warning('OpenAI API call failed, falling back to Groq.', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);

            } catch (\Exception $e) {
                Log::error('Error calling OpenAI API: ' . $e->getMessage());
            }
        }

        // 2. Try Groq AI (Llama 3)
        if ($groqKey && $groqKey !== 'null' && !empty($groqKey)) {
            try {
                $url = "https://api.groq.com/openai/v1/chat/completions";

                $response = Http::withHeaders([
                    'Authorization' => "Bearer {$groqKey}",
                    'Content-Type' => 'application/json',
                ])->post($url, [
                    'model' => 'llama-3.1-8b-instant',
                    'messages' => [
                        [
                            'role' => 'system',
                            'content' => $systemRole
                        ],
                        [
                            'role' => 'user',
                            'content' => $message
                        ]
                    ],
                    'temperature' => 0.6,
                    'max_tokens' => 512
                ]);

                if ($response->successful()) {
                    $data = $response->json();
                    $aiResponse = $data['choices'][0]['message']['content'] ?? null;

                    if ($aiResponse) {
                        return response()->json([
                            'success' => true,
                            'response' => trim($aiResponse),
                            'source' => 'groq_ai'
                        ]);
                    }
                }

                Log::warning('Groq API call failed, falling back to Gemini.', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);

            } catch (\Exception $e) {
                Log::error('Error calling Groq API: ' . $e->getMessage());
            }
        }

        // 3. Try Gemini AI
        if ($geminiKey && $geminiKey !== 'null' && !empty($geminiKey)) {
            try {
                $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={$geminiKey}";

                $response = Http::withHeaders([
                    'Content-Type' => 'application/json',
                ])->post($url, [
                    'contents' => [
                        [
                            'role' => 'user',
                            'parts' => [
                                [
                                    'text' => $systemRole . "\n\n" .
                                              "Question de l'utilisateur: \"{$message}\""
                                ]
                            ]
                        ]
                    ]
                ]);

                if ($response->successful()) {
                    $data = $response->json();
                    $aiResponse = $data['candidates'][0]['content']['parts'][0]['text'] ?? null;

                    if ($aiResponse) {
                        return response()->json([
                            'success' => true,
                            'response' => trim($aiResponse),
                            'source' => 'gemini_ai'
                        ]);
                    }
                }

                Log::warning('Gemini API call failed, falling back to local NLP engine.', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);

            } catch (\Exception $e) {
                Log::error('Error calling Gemini API: ' . $e->getMessage());
            }
        }

        // Fallback local NLP engine
        if ($productId && isset($product)) {
            $localResponse = $this->getLocalNlpResponse($product, $message);
        } else {
            $localResponse = $this->getLocalGeneralResponse($message, $userRole);
        }

        return response()->json([
            'success' => true,
            'response' => $localResponse,
            'source' => 'local_nlp_engine'
        ]);
    }

    /**
     * Fallback rules-based intelligent response engine if Gemini API is unavailable.
     */
    private function getLocalNlpResponse(Product $product, string $message): string
    {
        $messageLower = mb_strtolower($message);
        $ingredients = $product->description ?? '';
        $ingredientsLower = mb_strtolower($ingredients);

        // Fetch hygiene report remarks for additional details
        $hygieneRemarks = "";
        $isNonConforme = false;
        if ($product->hygieneReports) {
            foreach ($product->hygieneReports as $report) {
                if ($report->status === 'non_conforme') {
                    $isNonConforme = true;
                }
                if ($report->remarks) {
                    $hygieneRemarks .= " " . mb_strtolower($report->remarks);
                }
            }
        }

        // Check if hygiene officer declared this product non-conforme
        if ($isNonConforme && (str_contains($messageLower, 'sain') || str_contains($messageLower, 'sécurité') || str_contains($messageLower, 'securite') || str_contains($messageLower, 'صحة') || str_contains($messageLower, 'أمان') || str_contains($messageLower, 'سليم'))) {
            return "Alerte Securite Alimentaire : Ce produit a ete signale non conforme par le responsable Hygiene. Il est recommande de ne pas le consommer.";
        }

        // 1. Check for allergens
        if (str_contains($messageLower, 'allerg') || str_contains($messageLower, 'sensibl') || str_contains($messageLower, 'sensibilité') || str_contains($messageLower, 'regime') || str_contains($messageLower, 'régime') || str_contains($messageLower, 'حساسية') || str_contains($messageLower, 'مرض') || str_contains($messageLower, 'malad')) {
            $foundAllergens = [];
            
            $commonAllergens = [
                'gluten (قمح/جلوتين)' => ['gluten', 'farine', 'blé', 'pain', 'pâte', 'seigle', 'orge', 'جلوتين', 'قمح', 'دقيق', 'خبز', 'معكرونة'],
                'lactose (حليب/لاكتوز)' => ['lait', 'lactose', 'fromage', 'crème', 'beurre', 'yaourt', 'حليب', 'جبن', 'لاكتوز', 'قشدة', 'زبادي'],
                'arachide (فول سوداني)' => ['cacahuète', 'arachide', 'cacahuetes', 'peanuts', 'فول سوداني', 'فستق'],
                'fruits à coque (مكسرات)' => ['amande', 'noisette', 'noix', 'pistache', 'cajou', 'مكسرات', 'لوز', 'بندق'],
                'œuf (بيض)' => ['œuf', 'oeuf', 'œufs', 'oeufs', 'mayonnaise', 'بيض', 'مايونيز'],
                'poisson (سمك)' => ['poisson', 'thon', 'saumon', 'sardine', 'crevette', 'crabe', 'سمك', 'تونة', 'سردين', 'جمبري'],
                'soja (صويا)' => ['soja', 'soy', 'صويا'],
            ];

            foreach ($commonAllergens as $allergen => $keywords) {
                foreach ($keywords as $kw) {
                    if (str_contains($ingredientsLower, $kw) || str_contains(mb_strtolower($product->name), $kw) || str_contains($hygieneRemarks, $kw)) {
                        $foundAllergens[] = $allergen;
                        break;
                    }
                }
            }

            if (count($foundAllergens) > 0) {
                return "Alerte Allergenes : D'apres la composition de \"" . $product->name . "\" et les rapports d'hygiene, ce produit contient ou peut contenir : " . implode(', ', $foundAllergens) . ". S'il vous plait, restez vigilant si vous avez des allergies connues.";
            } else {
                return "Aucun allergene courant majeur (comme le gluten, le lactose ou les arachides) n'a ete detecte dans les ingredients enregistres pour \"" . $product->name . "\". Ingrédients listés : " . $ingredients . ".";
            }
        }

        // 2. Check for gluten specifically
        if (str_contains($messageLower, 'gluten') || str_contains($messageLower, 'coeliaque') || str_contains($messageLower, 'cœliaque') || str_contains($messageLower, 'جلوتين') || str_contains($messageLower, 'قمح')) {
            $glutenKeywords = ['farine', 'blé', 'pain', 'pâte', 'seigle', 'orge', 'gluten', 'جلوتين', 'قمح', 'دقيق', 'خبز'];
            $hasGluten = false;
            foreach ($glutenKeywords as $kw) {
                if (str_contains($ingredientsLower, $kw) || str_contains(mb_strtolower($product->name), $kw) || str_contains($hygieneRemarks, $kw)) {
                    $hasGluten = true;
                    break;
                }
            }
            if ($hasGluten) {
                return "Le produit \"" . $product->name . "\" CONTIENT du gluten (presence detectee de ble/farine/pain/pate). Il n'est pas recommande pour les personnes coeliaques ou intolerantes au gluten.";
            } else {
                return "D'apres la fiche technique de \"" . $product->name . "\", aucun ingredient contenant du gluten n'a ete detecte. Il semble etre sans gluten.";
            }
        }

        // 3. Check for lactose / dairy specifically
        if (str_contains($messageLower, 'lait') || str_contains($messageLower, 'lactose') || str_contains($messageLower, 'dairy') || str_contains($messageLower, 'fromage') || str_contains($messageLower, 'لاكتوز') || str_contains($messageLower, 'حليب') || str_contains($messageLower, 'جبن')) {
            $lactoseKeywords = ['lait', 'lactose', 'fromage', 'crème', 'beurre', 'yaourt', 'mozzarella', 'حليب', 'لاكتوز', 'جبن', 'قشدة'];
            $hasLactose = false;
            foreach ($lactoseKeywords as $kw) {
                if (str_contains($ingredientsLower, $kw) || str_contains(mb_strtolower($product->name), $kw) || str_contains($hygieneRemarks, $kw)) {
                    $hasLactose = true;
                    break;
                }
            }
            if ($hasLactose) {
                return "Le produit \"" . $product->name . "\" CONTIENT du lactose / des produits laitiers (lait, fromage ou creme detecte). Attention si vous etes intolerant au lactose.";
            } else {
                return "D'apres la composition de \"" . $product->name . "\", il ne contient aucun produit laitier ou lactose connu. Il convient aux personnes intolerantes.";
            }
        }

        // 4. Check for diabetes / sugar
        if (str_contains($messageLower, 'diabète') || str_contains($messageLower, 'diabete') || str_contains($messageLower, 'sucre') || str_contains($messageLower, 'سكري') || str_contains($messageLower, 'سكر')) {
            $sugarKeywords = ['sucre', 'miel', 'sirop', 'sweetener', 'sugar', 'سكر', 'عسل', 'حلو'];
            $hasSugar = false;
            foreach ($sugarKeywords as $kw) {
                if (str_contains($ingredientsLower, $kw) || str_contains(mb_strtolower($product->name), $kw) || str_contains($hygieneRemarks, $kw)) {
                    $hasSugar = true;
                    break;
                }
            }
            if ($hasSugar) {
                return "Le produit \"" . $product->name . "\" contient du sucre ou des agents sucrants. Il doit etre consomme avec moderation par les personnes diabetiques.";
            } else {
                return "Le produit \"" . $product->name . "\" ne semble pas contenir de sucres ajoutes. Veuillez tout de meme verifier la fiche nutritionnelle globale.";
            }
        }

        // 5. Check for ingredients/composition
        if (str_contains($messageLower, 'ingred') || str_contains($messageLower, 'ingréd') || str_contains($messageLower, 'compos') || str_contains($messageLower, 'fait de') || str_contains($messageLower, 'contient quoi') || str_contains($messageLower, 'مكونات') || str_contains($messageLower, 'يحتوي')) {
            if (empty($ingredients) || $ingredients === 'Aucun ingrédient spécifié.') {
                return "Le produit \"" . $product->name . "\" ne dispose pas d'une liste detaillee d'ingredients enregistree dans la base de donnees pour le moment. Son prix est de " . $product->price . " TND.";
            }
            return "Composition de \"" . $product->name . "\" : Les ingredients enregistres sont : " . $ingredients . ". N'hesitez pas a me poser des questions sur un ingredient en particulier !";
        }

        // 6. Check for calories/nutrition
        if (str_contains($messageLower, 'calor') || str_contains($messageLower, 'nutrit') || str_contains($messageLower, 'kcal') || str_contains($messageLower, 'sucre') || str_contains($messageLower, 'sel') || str_contains($messageLower, 'gras')) {
            return "Informations nutritionnelles pour \"" . $product->name . "\" : La fiche nutritionnelle standard indique qu'il s'agit d'un produit de type " . $product->type . ". Ingredients constitutifs : " . $ingredients . ". (Pour des details precis en calories, veuillez consulter la fiche d'emballage du fabricant).";
        }

        // 7. Generic response listing product details
        $remarksText = "";
        if ($product->hygieneReports->isNotEmpty() && $product->hygieneReports->first()->remarks) {
            $remarksText = " Note d'hygiene : " . $product->hygieneReports->first()->remarks;
        }

        return "Bonjour ! Je suis l'assistant nutritionnel. " .
               "Je peux vous renseigner sur la composition, les allergenes et les ingredients de \"" . $product->name . "\".\n\n" .
               "Ingredients : " . $ingredients . "\n" .
               "Categorie : " . ($product->category?->name ?? 'General') . "\n" .
               "Prix : " . $product->price . " TND\n\n" .
               "Posez-moi une question sur la presence d'un ingredient specifique comme le gluten, le lactose ou les arachides !" . $remarksText;
    }

    /**
     * Check if the message contains words forbidden for a Caissier.
     */
    private function isForbiddenForCashier(string $message): bool
    {
        $msgLower = mb_strtolower($message);
        $forbiddenKeywords = [
            'commande', 'order', 'planning', 'shift', 'مناوبة', 'جدول', 'طلب',
            'stock', 'inventaire', 'magasin', 'achat', 'validation', 'user', 'utilisateur',
            'compte', 'mot de passe', 'statut', 'admin', 'fournisseur', 'coût', 'recette', 'salaire',
            'مبيعات', 'شفت', 'حساب', 'مستخدم', 'مدير', 'شراء', 'تعديل', 'حذف', 'إضافة', 'مخزن', 'لوجستيات', 'سعر', 'تكلفة'
        ];
        
        $allowedKeywords = [
            'allerg', 'allergi', 'gluten', 'lactose', 'arachide', 'œuf', 'oeuf', 'ingréd', 'compos', 'calor',
            'nutrit', 'diabète', 'diabete', 'coeliaque', 'cœliaque', 'sensibl', 'malad', 'manger', 'sain', 'ingred',
            'lait', 'fromage', 'farine', 'blé', 'sucre', 'sel', 'gras', 'hygiene', 'hygiène', 'santé', 'sante',
            'حساسية', 'جلوتين', 'لاكتوز', 'مكونات', 'صحة', 'مرض', 'سكري', 'ضغط', 'حليب', 'بيض', 'قمح', 'مريض', 'أكل', 'تناول',
            'صالح', 'تسمم', 'تاريخ', 'انتهاء', 'أمان', 'سليم', 'عنب', 'مكسرات', 'فول صويا', 'سمك'
        ];
        
        foreach ($forbiddenKeywords as $fk) {
            if (str_contains($msgLower, $fk)) {
                return true;
            }
        }

        $hasAllowed = false;
        foreach ($allowedKeywords as $ak) {
            if (str_contains($msgLower, $ak)) {
                $hasAllowed = true;
                break;
            }
        }

        return !$hasAllowed;
    }

    /**
     * Fallback general response engine for general chatbot questions if API is unavailable.
     */
    private function getLocalGeneralResponse(string $message, string $userRole): string
    {
        $messageLower = mb_strtolower($message);

        // Check permissions based on userRole
        if (str_contains($messageLower, 'command') || str_contains($messageLower, 'passer') || str_contains($messageLower, 'achat')) {
            if (!in_array($userRole, ['SUPER_ADMIN', 'RESPONSABLE_FB', 'CHEF_CUISINE', 'CHEF_MAGASIN', 'RESPONSABLE_ACHAT'])) {
                return "Acces non autorise : Votre role de {$userRole} ne vous permet pas de gerer ou consulter les commandes internes.";
            }
            return "Pour passer une commande interne : 1. Accedez a la page Commandes Internes dans le menu lateral. 2. Cliquez sur le bouton Nouvelle Commande en haut a droite. 3. Selectionnez les produits requis dans notre catalogue. 4. Confirmez la quantite et soumettez la commande.";
        }

        if (str_contains($messageLower, 'stock') || str_contains($messageLower, 'inventaire') || str_contains($messageLower, 'lots')) {
            if (!in_array($userRole, ['SUPER_ADMIN', 'CHEF_MAGASIN', 'CHEF_CUISINE', 'RESPONSABLE_ACHAT'])) {
                return "Acces non autorise : Votre role de {$userRole} ne vous permet pas de consulter les stocks ou l'inventaire en reserve.";
            }
            return "Pour consulter et gerer les stocks : Visitez la section Stocks pour voir les quantites disponibles, l'historique des mouvements FIFO et les alertes de seuil critique.";
        }

        if (str_contains($messageLower, 'valid') || str_contains($messageLower, 'approuv') || str_contains($messageLower, 'accepter')) {
            if (!in_array($userRole, ['SUPER_ADMIN', 'RESPONSABLE_ACHAT'])) {
                return "Acces non autorise : Votre role de {$userRole} ne vous permet pas d'acceder au panneau de validation des produits.";
            }
            return "Pour la validation des produits : Le Responsable Achat peut approuver ou refuser les nouveaux produits dans la section Validation Produits.";
        }

        if (str_contains($messageLower, 'planning') || str_contains($messageLower, 'calendrier') || str_contains($messageLower, 'horaire')) {
            if (!in_array($userRole, ['SUPER_ADMIN', 'RESPONSABLE_FB', 'CAISSIER'])) {
                return "Acces non autorise : Votre role de {$userRole} ne vous permet pas d'acceder aux plannings horaires.";
            }
            return "Pour les plannings et horaires : Accedez a Plannings et Horaires pour voir la repartition hebdomadaire des shifts du personnel.";
        }

        if (str_contains($messageLower, 'hygiène') || str_contains($messageLower, 'hygiene') || str_contains($messageLower, 'rapport')) {
            if (!in_array($userRole, ['SUPER_ADMIN', 'RESPONSABLE_HYGIENE'])) {
                return "Acces non autorise : Votre role de {$userRole} ne vous permet pas d'acceder aux rapports de conformite hygiene.";
            }
            return "Pour les rapports d'hygiene : Allez dans Rapports d'Hygiene pour creer des audits sanitaires de conformite et enregistrer des alertes allergenes.";
        }

        // Generic fallback greeting
        return "AeroServe Assistant : Bonjour ! Je suis votre copilote operationnel. Je peux vous aider a comprendre l'utilisation des commandes, le suivi des stocks, la validation des produits et la planification des plannings pour votre compte. Que desirez-vous savoir aujourd'hui ?";
    }

    /**
     * Helper to retrieve textual user context summary for dynamic system prompt inject.
     */
    private function getUserContextText(User $user): string
    {
        $context = "=== CONTEXTE DE L'UTILISATEUR CONNECTÉ ===\n";
        $context .= "ID: {$user->id}\n";
        $context .= "Nom complet: {$user->first_name} {$user->last_name}\n";
        $context .= "Email: {$user->email}\n";
        $context .= "Rôle: " . ($user->role?->name ?? 'Aucun') . "\n";

        if ($user->pointDeVente) {
            $context .= "Point de vente assigne: {$user->pointDeVente->name} (ID: {$user->pointDeVente->id}, Type: {$user->pointDeVente->type}, Ville: {$user->pointDeVente->location})\n";
        } else {
            $context .= "Point de vente assigne: Aucun point de vente specifique.\n";
        }

        // 5 shifts
        $plannings = \App\Models\Planning::with('pointDeVente')
            ->where('user_id', $user->id)
            ->orderBy('date', 'desc')
            ->limit(5)
            ->get();
        if ($plannings->isNotEmpty()) {
            $context .= "\nPlannings/Shifts de travail recents et futurs :\n";
            foreach ($plannings as $p) {
                $dateStr = $p->date instanceof \DateTimeInterface ? $p->date->format('Y-m-d') : $p->date;
                if ($p->is_day_off) {
                    $context .= "- Le {$dateStr} : Jour de repos (Day Off)\n";
                } else {
                    $pdvName = $p->pointDeVente ? $p->pointDeVente->name : 'N/A';
                    $context .= "- Le {$dateStr} : Shift {$p->start_time} - {$p->end_time} a {$pdvName} (Statut: {$p->day_status})\n";
                }
            }
        } else {
            $context .= "\nAucun planning ou shift de travail enregistre.\n";
        }

        // 5 internal orders
        $orders = \App\Models\InternalOrder::with('pointDeVente')
            ->where('created_by', $user->id)
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();
        if ($orders->isNotEmpty()) {
            $context .= "\nCommandes Internes creees par l'utilisateur :\n";
            foreach ($orders as $o) {
                $pdvName = $o->pointDeVente ? $o->pointDeVente->name : 'General';
                $context .= "- Commande #{$o->id} (Type: {$o->type}, Statut: {$o->status}, PDV: {$pdvName}, Date de livraison: {$o->delivery_date})\n";
            }
        } else {
            $context .= "\nAucune commande interne creee par cet utilisateur.\n";
        }

        return $context;
    }
}
