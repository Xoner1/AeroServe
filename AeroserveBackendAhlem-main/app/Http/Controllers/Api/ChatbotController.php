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
     * Ask the AI chatbot — supports function calling for all three AI providers.
     */
    public function ask(Request $request): JsonResponse
    {
        $request->validate([
            'product_id' => 'nullable|exists:products,id',
            'message'    => 'required|string|max:1000',
        ]);

        $productId = $request->input('product_id');
        $message   = $request->input('message');

        /** @var User|null $user */
        $user     = Auth::user();
        $userRole = $user && $user->role ? $user->role->name : 'GUEST';
        $userName = $user ? "{$user->first_name} {$user->last_name}" : 'Utilisateur';

        // ─── 1. CAISSIER RESTRICTIONS ──────────────────────────────────────────
        if ($userRole === 'CAISSIER') {
            if (!$productId) {
                return response()->json([
                    'success'  => true,
                    'response' => "Assistant Qualite et Sante (Mode Client) : Bonjour {$userName} !\n\nEn tant que Caissier, je suis configure pour repondre exclusivement aux questions des clients concernant la composition, les allergenes et la securite de nos plats et boissons.\n\nVeuillez scanner le code QR d'un produit ou le selectionner depuis sa fiche pour poser vos questions (ex: intolerance au gluten, lactose, arachides, diabete, etc.).",
                    'source'   => 'cashier_restriction_engine'
                ]);
            }

            if ($this->isForbiddenForCashier($message)) {
                return response()->json([
                    'success'  => true,
                    'response' => "Acces limite : En tant que Caissier, vous pouvez uniquement poser des questions sur les allergenes, les ingredients ou la compatibilite sante de ce produit pour repondre aux clients. Les questions administratives, financieres ou logistiques (stocks, commandes, plannings, utilisateurs) ne sont pas autorisees pour ce role.",
                    'source'   => 'cashier_restriction_engine'
                ]);
            }
        }

        // ─── 2. ROLE-BASED SYSTEM PROMPT ──────────────────────────────────────
        $roleDescriptions = [
            'SUPER_ADMIN'        => "Tu es le copilote global de AeroServe. Tu as acces a la gestion globale des utilisateurs, des points de vente et aux KPIs financiers. Tu peux repondre aux questions d'administration generale.",
            'RESPONSABLE_FB'     => "Tu es le responsable F&B de AeroServe. Tu as acces a la planification des shifts des caissiers, a la gestion operationnelle des points de vente, et a la commande d'articles. Tu ne dois pas divulguer d'informations confidentielles sur d'autres roles.",
            'CHEF_CUISINE'       => "Tu es le Chef de Cuisine. Tu t'occupes des recettes, des produits alimentaires (Food), des menus du personnel et des commandes de matieres premieres. Ne reponds jamais aux questions sur les statistiques de vente des points de vente, la comptabilite ou les salaires.",
            'CHEF_MAGASIN'       => "Tu es le Chef de Magasinier. Tu t'occupes de la gestion FIFO du stock en reserve, des lots perimes, et de la validation des commandes commerciales. Tu n'as pas acces aux recettes secretes de cuisine ou aux donnees financieres.",
            'RESPONSABLE_ACHAT'  => "Tu es le responsable Achat. Tu valides les produits soumis par le magasinier, configures les prix d'achat, geres les categories, et analyses les previsions d'approvisionnement IA.",
            'RESPONSABLE_HYGIENE'=> "Tu es le responsable Hygiene. Tu rediges les audits de securite alimentaire, declares les allergenes et signales les non-conformites.",
            'CAISSIER'           => "Tu es l'assistant nutritionnel du Caissier en contact avec les clients. Tu reponds exclusivement aux questions des clients sur la composition, les allergenes et la conformite sante du produit en te basant sur les fiches d'hygiene.",
        ];

        $roleInstruction = $roleDescriptions[$userRole] ?? "Tu es l'assistant de l'application AeroServe.";
        $userContext     = $user ? $this->getUserContextText($user) : "Aucun contexte utilisateur.";

        $productContext      = "";
        $hygieneReportsContext = "";

        if ($productId) {
            $product = Product::with(['stock', 'hygieneReports'])->find($productId);

            if (!$product) {
                return response()->json(['success' => false, 'message' => 'Produit non trouve.'], 404);
            }

            $ingredients   = $product->description ?? 'Aucun ingredient specifie.';
            $productContext = "Voici les details du produit alimentaire actuel :\n" .
                              "Produit: {$product->name}\n" .
                              "Type: {$product->type}\n" .
                              "Description/Ingredients: {$ingredients}\n" .
                              "Prix: {$product->price} TND\n";

            if ($product->expiration_date) {
                $productContext .= "Date d'expiration: {$product->expiration_date}\n";
            }

            if ($product->hygieneReports->isNotEmpty()) {
                $hygieneReportsContext = "\nDeclarations et audits du responsable Hygiene pour ce produit :\n";
                foreach ($product->hygieneReports as $report) {
                    $statusStr   = $report->status;
                    $allergensStr = $report->allergens_verified ? "Allergenes verifies et valides" : "Allergenes non verifies";
                    $expStr      = $report->expiration_verified ? "Date d'expiration verifiee" : "Date d'expiration non verifiee";
                    $hygieneReportsContext .= "- Statut: {$statusStr} | {$allergensStr} | {$expStr}\n";
                    if ($report->remarks) {
                        $hygieneReportsContext .= "  Remarques de l'officier d'hygiene: \"{$report->remarks}\"\n";
                    }
                }
            } else {
                $hygieneReportsContext = "\nDeclarations du responsable Hygiene: Aucune remarque d'hygiene specifique n'a encore ete enregistree pour ce produit.\n";
            }
        }

        // Build system role prompt
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
                          "- Tu ne dois repondre a AUCUNE question qui ne concerne pas directement l'application AeroServe (produits, stocks, commandes, plannings, menus, hygiene, utilisateurs, points de vente). Meme les salutations simples ou les questions hors-sujet doivent etre refusees poliment avec : 'Je suis desole, je suis uniquement un assistant operationnel pour l'application AeroServe.'\n" .
                          "- TU NE DOIS JAMAIS divulguer de donnees, de profils, d'e-mails, d'informations de stocks, de commandes ou de plannings concernant d'autres comptes ou roles.\n" .
                          "- Reste strictement cantonne aux sujets et perimetres autorises pour ton role.\n" .
                          "- Tu dois assister l'utilisateur connecte uniquement pour les taches requises par son propre travail.\n" .
                          "- Si l'utilisateur pose une question sur un autre compte, un autre utilisateur, ou en dehors de ses responsabilites professionnelles, refuse poliment d'y repondre en mentionnant la limite de ses droits.\n" .
                          "- Reponds de maniere concise, polie et dans la meme langue que celle de la question.\n" .
                          "- N'utilise absolument aucun emoji dans tes reponses.\n" .
                          "- Tu as acces a des outils (tools/fonctions) pour interroger la base de donnees AeroServe en temps reel. Utilise-les pour repondre avec des donnees precises plutot que d'inventer des informations.";
        }

        $openaiKey = config('services.openai.key');
        $groqKey   = config('services.groq.key');
        $geminiKey = config('services.gemini.key');

        // ─── 3. OPENAI — Function Calling ──────────────────────────────────────
        if ($openaiKey && $openaiKey !== 'null' && !empty($openaiKey)) {
            try {
                $url   = "https://api.openai.com/v1/chat/completions";
                $tools = $this->getToolDefinitions();

                $messages = [
                    ['role' => 'system', 'content' => $systemRole],
                    ['role' => 'user',   'content' => $message],
                ];

                $response = Http::withHeaders([
                    'Authorization' => "Bearer {$openaiKey}",
                    'Content-Type'  => 'application/json',
                ])->post($url, [
                    'model'       => 'gpt-4o-mini',
                    'messages'    => $messages,
                    'tools'       => $tools,
                    'tool_choice' => 'auto',
                    'temperature' => 0.5,
                    'max_tokens'  => 800,
                ]);

                if ($response->successful()) {
                    $data   = $response->json();
                    $choice = $data['choices'][0] ?? null;

                    // Tool call requested by the model
                    if ($choice && ($choice['finish_reason'] === 'tool_calls') && !empty($choice['message']['tool_calls'])) {
                        $messages[] = $choice['message'];

                        foreach ($choice['message']['tool_calls'] as $toolCall) {
                            $toolName   = $toolCall['function']['name'];
                            $toolArgs   = json_decode($toolCall['function']['arguments'], true) ?? [];
                            $toolResult = $this->executeToolCall($toolName, $toolArgs);

                            $messages[] = [
                                'role'         => 'tool',
                                'tool_call_id' => $toolCall['id'],
                                'content'      => $toolResult,
                            ];
                        }

                        // Second call with tool results
                        $finalResp = Http::withHeaders([
                            'Authorization' => "Bearer {$openaiKey}",
                            'Content-Type'  => 'application/json',
                        ])->post($url, [
                            'model'       => 'gpt-4o-mini',
                            'messages'    => $messages,
                            'temperature' => 0.5,
                            'max_tokens'  => 800,
                        ]);

                        if ($finalResp->successful()) {
                            $aiResponse = $finalResp->json()['choices'][0]['message']['content'] ?? null;
                            if ($aiResponse) {
                                return response()->json([
                                    'success'  => true,
                                    'response' => trim($aiResponse),
                                    'source'   => 'openai_function_calling',
                                ]);
                            }
                        }
                    } elseif ($choice) {
                        // Direct answer (no tool call needed)
                        $aiResponse = $choice['message']['content'] ?? null;
                        if ($aiResponse) {
                            return response()->json([
                                'success'  => true,
                                'response' => trim($aiResponse),
                                'source'   => 'openai',
                            ]);
                        }
                    }
                }

                Log::warning('OpenAI API call failed, falling back to Groq.', [
                    'status' => $response->status(),
                    'body'   => $response->body(),
                ]);

            } catch (\Exception $e) {
                Log::error('Error calling OpenAI API: ' . $e->getMessage());
            }
        }

        // ─── 4. GROQ — Function Calling (OpenAI-compatible) ───────────────────
        if ($groqKey && $groqKey !== 'null' && !empty($groqKey)) {
            try {
                $url   = "https://api.groq.com/openai/v1/chat/completions";
                $tools = $this->getToolDefinitions();

                $messages = [
                    ['role' => 'system', 'content' => $systemRole],
                    ['role' => 'user',   'content' => $message],
                ];

                $response = Http::withHeaders([
                    'Authorization' => "Bearer {$groqKey}",
                    'Content-Type'  => 'application/json',
                ])->post($url, [
                    'model'       => 'llama-3.1-8b-instant',
                    'messages'    => $messages,
                    'tools'       => $tools,
                    'tool_choice' => 'auto',
                    'temperature' => 0.6,
                    'max_tokens'  => 800,
                ]);

                if ($response->successful()) {
                    $data   = $response->json();
                    $choice = $data['choices'][0] ?? null;

                    if ($choice && ($choice['finish_reason'] === 'tool_calls') && !empty($choice['message']['tool_calls'])) {
                        $messages[] = $choice['message'];

                        foreach ($choice['message']['tool_calls'] as $toolCall) {
                            $toolName   = $toolCall['function']['name'];
                            $toolArgs   = json_decode($toolCall['function']['arguments'], true) ?? [];
                            $toolResult = $this->executeToolCall($toolName, $toolArgs);

                            $messages[] = [
                                'role'         => 'tool',
                                'tool_call_id' => $toolCall['id'],
                                'content'      => $toolResult,
                            ];
                        }

                        $finalResp = Http::withHeaders([
                            'Authorization' => "Bearer {$groqKey}",
                            'Content-Type'  => 'application/json',
                        ])->post($url, [
                            'model'       => 'llama-3.1-8b-instant',
                            'messages'    => $messages,
                            'temperature' => 0.6,
                            'max_tokens'  => 800,
                        ]);

                        if ($finalResp->successful()) {
                            $aiResponse = $finalResp->json()['choices'][0]['message']['content'] ?? null;
                            if ($aiResponse) {
                                return response()->json([
                                    'success'  => true,
                                    'response' => trim($aiResponse),
                                    'source'   => 'groq_function_calling',
                                ]);
                            }
                        }
                    } elseif ($choice) {
                        $aiResponse = $choice['message']['content'] ?? null;
                        if ($aiResponse) {
                            return response()->json([
                                'success'  => true,
                                'response' => trim($aiResponse),
                                'source'   => 'groq_ai',
                            ]);
                        }
                    }
                }

                Log::warning('Groq API call failed, falling back to Gemini.', [
                    'status' => $response->status(),
                    'body'   => $response->body(),
                ]);

            } catch (\Exception $e) {
                Log::error('Error calling Groq API: ' . $e->getMessage());
            }
        }

        // ─── 5. GEMINI — Function Declarations ────────────────────────────────
        if ($geminiKey && $geminiKey !== 'null' && !empty($geminiKey)) {
            try {
                $url                  = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={$geminiKey}";
                $functionDeclarations = $this->getGeminiFunctionDeclarations();

                $contents = [
                    [
                        'role'  => 'user',
                        'parts' => [['text' => $systemRole . "\n\nQuestion de l'utilisateur: \"{$message}\""]],
                    ],
                ];

                $response = Http::withHeaders(['Content-Type' => 'application/json'])
                    ->post($url, [
                        'contents' => $contents,
                        'tools'    => [['function_declarations' => $functionDeclarations]],
                    ]);

                if ($response->successful()) {
                    $data  = $response->json();
                    $parts = $data['candidates'][0]['content']['parts'] ?? [];

                    $functionCallPart = null;
                    $textPart         = null;

                    foreach ($parts as $part) {
                        if (isset($part['functionCall'])) {
                            $functionCallPart = $part['functionCall'];
                        } elseif (isset($part['text'])) {
                            $textPart = $part['text'];
                        }
                    }

                    if ($functionCallPart) {
                        $funcName   = $functionCallPart['name'];
                        $funcArgs   = $functionCallPart['args'] ?? [];
                        $funcResult = $this->executeToolCall($funcName, $funcArgs);

                        // Send function response back for final answer
                        $contentsWithResult = array_merge($contents, [
                            [
                                'role'  => 'model',
                                'parts' => [['functionCall' => ['name' => $funcName, 'args' => $funcArgs]]],
                            ],
                            [
                                'role'  => 'user',
                                'parts' => [['functionResponse' => [
                                    'name'     => $funcName,
                                    'response' => ['content' => $funcResult],
                                ]]],
                            ],
                        ]);

                        $finalResp = Http::withHeaders(['Content-Type' => 'application/json'])
                            ->post($url, [
                                'contents' => $contentsWithResult,
                                'tools'    => [['function_declarations' => $functionDeclarations]],
                            ]);

                        if ($finalResp->successful()) {
                            $aiResponse = $finalResp->json()['candidates'][0]['content']['parts'][0]['text'] ?? null;
                            if ($aiResponse) {
                                return response()->json([
                                    'success'  => true,
                                    'response' => trim($aiResponse),
                                    'source'   => 'gemini_function_calling',
                                ]);
                            }
                        }
                    } elseif ($textPart) {
                        return response()->json([
                            'success'  => true,
                            'response' => trim($textPart),
                            'source'   => 'gemini_ai',
                        ]);
                    }
                }

                Log::warning('Gemini API call failed, falling back to local NLP engine.', [
                    'status' => $response->status(),
                    'body'   => $response->body(),
                ]);

            } catch (\Exception $e) {
                Log::error('Error calling Gemini API: ' . $e->getMessage());
            }
        }

        // ─── 6. LOCAL FALLBACK — NLP Engine ───────────────────────────────────
        if ($productId && isset($product)) {
            $localResponse = $this->getLocalNlpResponse($product, $message);
        } else {
            // Off-topic check before generating a local response
            if (!$this->isOnTopicMessage($message)) {
                $localResponse = "Je suis desole, je suis uniquement un assistant operationnel pour l'application AeroServe. Je ne reponds pas aux questions hors-sujet ou aux salutations generales. Posez-moi une question sur les produits, les stocks, les commandes, les plannings ou la gestion AeroServe.";
            } else {
                $localResponse = $this->getLocalGeneralResponse($message, $userRole);
            }
        }

        return response()->json([
            'success'  => true,
            'response' => $localResponse,
            'source'   => 'local_nlp_engine',
        ]);
    }

    // ─── TOOL DEFINITIONS ────────────────────────────────────────────────────

    /**
     * Returns tool definitions for OpenAI / Groq (OpenAI-compatible format).
     */
    private function getToolDefinitions(): array
    {
        return [
            [
                'type'     => 'function',
                'function' => [
                    'name'        => 'chercher_produits',
                    'description' => 'Recherche des produits dans le catalogue AeroServe par nom, type (food, commercial, matiere_premiere) ou mot-cle. Utiliser pour repondre aux questions sur les produits existants.',
                    'parameters'  => [
                        'type'       => 'object',
                        'properties' => [
                            'query' => [
                                'type'        => 'string',
                                'description' => 'Terme de recherche : nom du produit, type ou mot-cle',
                            ],
                        ],
                        'required' => ['query'],
                    ],
                ],
            ],
            [
                'type'     => 'function',
                'function' => [
                    'name'        => 'obtenir_details_produit',
                    'description' => "Obtenir les details complets d'un produit specifique : stock disponible, rapports d'hygiene, ingredients de la recette, categorie, prix.",
                    'parameters'  => [
                        'type'       => 'object',
                        'properties' => [
                            'product_id' => [
                                'type'        => 'integer',
                                'description' => 'ID unique du produit dans la base de donnees AeroServe',
                            ],
                        ],
                        'required' => ['product_id'],
                    ],
                ],
            ],
            [
                'type'     => 'function',
                'function' => [
                    'name'        => 'obtenir_tous_produits',
                    'description' => 'Obtenir le catalogue complet de tous les produits actifs et approuves dans AeroServe. Utiliser quand l\'utilisateur demande une liste generale ou un apercu du catalogue.',
                    'parameters'  => [
                        'type'       => 'object',
                        'properties' => new \stdClass(),
                    ],
                ],
            ],
        ];
    }

    /**
     * Returns function declarations for Gemini format.
     */
    private function getGeminiFunctionDeclarations(): array
    {
        return [
            [
                'name'        => 'chercher_produits',
                'description' => 'Recherche des produits dans le catalogue AeroServe par nom, type ou mot-cle.',
                'parameters'  => [
                    'type'       => 'object',
                    'properties' => [
                        'query' => [
                            'type'        => 'string',
                            'description' => 'Terme de recherche',
                        ],
                    ],
                    'required' => ['query'],
                ],
            ],
            [
                'name'        => 'obtenir_details_produit',
                'description' => "Obtenir les details complets d'un produit par son ID.",
                'parameters'  => [
                    'type'       => 'object',
                    'properties' => [
                        'product_id' => [
                            'type'        => 'integer',
                            'description' => 'ID unique du produit',
                        ],
                    ],
                    'required' => ['product_id'],
                ],
            ],
            [
                'name'        => 'obtenir_tous_produits',
                'description' => 'Obtenir tous les produits actifs et approuves du catalogue AeroServe.',
                'parameters'  => [
                    'type'       => 'object',
                    'properties' => new \stdClass(),
                ],
            ],
        ];
    }

    /**
     * Executes a tool call requested by the LLM — queries real DB data.
     * Tools: chercher_produits | obtenir_details_produit | obtenir_tous_produits
     */
    private function executeToolCall(string $toolName, array $args): string
    {
        switch ($toolName) {
            case 'chercher_produits':
                $query    = $args['query'] ?? '';
                $products = Product::with('category', 'stock')
                    ->where('is_active', true)
                    ->where(function ($q) use ($query) {
                        $q->where('name', 'like', "%{$query}%")
                          ->orWhere('type', 'like', "%{$query}%")
                          ->orWhere('description', 'like', "%{$query}%");
                    })
                    ->limit(10)
                    ->get();

                return json_encode($products->map(fn($p) => [
                    'id'          => $p->id,
                    'nom'         => $p->name,
                    'type'        => $p->type,
                    'prix'        => $p->price,
                    'statut'      => $p->approval_status,
                    'stock'       => $p->stock ? $p->stock->quantity : 0,
                    'categorie'   => $p->category?->name,
                    'description' => $p->description,
                ])->values());

            case 'obtenir_details_produit':
                $productId = (int) ($args['product_id'] ?? 0);
                $product   = Product::with('stock', 'hygieneReports', 'category', 'ingredients')->find($productId);

                if (!$product) {
                    return json_encode(['erreur' => "Produit ID {$productId} non trouve."]);
                }

                return json_encode([
                    'id'                  => $product->id,
                    'nom'                 => $product->name,
                    'type'                => $product->type,
                    'description'         => $product->description,
                    'prix'                => $product->price,
                    'allergenes'          => $product->allergens,
                    'date_expiration'     => $product->expiration_date,
                    'statut_approbation'  => $product->approval_status,
                    'actif'               => $product->is_active,
                    'stock_disponible'    => $product->stock ? $product->stock->quantity : 0,
                    'categorie'           => $product->category?->name,
                    'nb_rapports_hygiene' => $product->hygieneReports?->count() ?? 0,
                    'ingredients'         => $product->ingredients?->pluck('name')->toArray(),
                ]);

            case 'obtenir_tous_produits':
                $products = Product::with('category', 'stock')
                    ->where('is_active', true)
                    ->where('approval_status', 'approved')
                    ->get();

                return json_encode($products->map(fn($p) => [
                    'id'        => $p->id,
                    'nom'       => $p->name,
                    'type'      => $p->type,
                    'prix'      => $p->price,
                    'stock'     => $p->stock ? $p->stock->quantity : 0,
                    'categorie' => $p->category?->name,
                ])->values());

            default:
                return json_encode(['erreur' => "Outil '{$toolName}' inconnu."]);
        }
    }

    // ─── EXISTING HELPER METHODS (preserved) ─────────────────────────────────

    /**
     * Fallback rules-based response — STRICTLY based on Hygiene Officer data only.
     * No injected keyword lists, no assumptions, no external knowledge.
     */
    private function getLocalNlpResponse(Product $product, string $message): string
    {
        $messageLower = mb_strtolower($message);

        // Only respond to health-related questions; reject everything else
        $healthKeywords = [
            'allergen', 'gluten', 'lactose', 'arachide', 'diabète', 'diabete',
            'santé', 'sante', 'sécurité', 'securite', 'ingréd', 'compos',
            'calor', 'nutrit', 'conforme', 'hygiène', 'hygiene', 'malad',
            'حساسية', 'جلوتين', 'لاكتوز', 'مكونات', 'صحة', 'مرض',
            'سكري', 'مريض', 'أمان', 'سليم', 'تسمم', 'انتهاء', 'تاريخ',
            'مكسرات', 'صويا', 'سمك', 'بيض', 'قمح', 'حليب',
        ];

        $isHealthRelated = false;
        foreach ($healthKeywords as $kw) {
            if (str_contains($messageLower, $kw)) {
                $isHealthRelated = true;
                break;
            }
        }

        if (!$isHealthRelated) {
            return "Je suis desole, je ne reponds qu'aux questions sur la sante, les allergenes et la composition des produits. Pour toute question administrative ou logistique, utilisez les autres sections de l'application.";
        }

        // No hygiene reports → no data to answer from
        if (!$product->hygieneReports || $product->hygieneReports->isEmpty()) {
            return "Aucune declaration sanitaire n'a encore ete enregistree par le responsable Hygiene pour le produit \"" . $product->name . "\". Mes reponses sont basees exclusivement sur les rapports officiels du responsable Hygiene. Veuillez contacter le responsable Hygiene pour obtenir ces informations.";
        }

        // Build response strictly from hygiene report data
        $parts = [];
        $parts[] = "Informations sanitaires pour \"" . $product->name . "\" (donnees declarees par le responsable Hygiene) :\n";

        foreach ($product->hygieneReports as $report) {
            // Status
            if ($report->status === 'non_conforme') {
                $parts[] = "⚠ Statut : NON CONFORME — " . ($report->remarks ?: "Aucun commentaire ajoute.");
            } elseif ($report->status === 'conforme') {
                $parts[] = "✓ Statut : CONFORME";
            } else {
                $parts[] = "Statut : En cours d'inspection";
            }

            // Allergens verification
            if ($report->allergens_verified) {
                $parts[] = "Allergenes : Verifies et valides par le responsable Hygiene.";
            } else {
                $parts[] = "Allergenes : Non encore verifies par le responsable Hygiene.";
            }

            // Expiration verification
            if ($report->expiration_verified) {
                $parts[] = "Date d'expiration : Verifiee et conforme.";
            } else {
                $parts[] = "Date d'expiration : Non encore verifiee.";
            }

            // Remarks (only if present)
            if ($report->remarks) {
                $parts[] = "Remarques du responsable Hygiene : \"" . $report->remarks . "\"";
            }
        }

        return implode("\n", $parts);
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
            'مبيعات', 'شفت', 'حساب', 'مستخدم', 'مدير', 'شراء', 'تعديل', 'حذف', 'إضافة', 'مخزن', 'لوجستيات', 'سعر', 'تكلفة',
        ];

        $allowedKeywords = [
            'allerg', 'allergi', 'gluten', 'lactose', 'arachide', 'œuf', 'oeuf', 'ingréd', 'compos', 'calor',
            'nutrit', 'diabète', 'diabete', 'coeliaque', 'cœliaque', 'sensibl', 'malad', 'manger', 'sain', 'ingred',
            'lait', 'fromage', 'farine', 'blé', 'sucre', 'sel', 'gras', 'hygiene', 'hygiène', 'santé', 'sante',
            'حساسية', 'جلوتين', 'لاكتوز', 'مكونات', 'صحة', 'مرض', 'سكري', 'ضغط', 'حليب', 'بيض', 'قمح', 'مريض', 'أكل', 'تناول',
            'صالح', 'تسمم', 'تاريخ', 'انتهاء', 'أمان', 'سليم', 'عنب', 'مكسرات', 'فول صويا', 'سمك',
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
     * Checks whether a message is on-topic for AeroServe (Fix #9).
     * Returns false for greetings/off-topic messages with no project keywords.
     */
    private function isOnTopicMessage(string $message): bool
    {
        $msgLower = mb_strtolower($message);

        $projectKeywords = [
            'produit', 'stock', 'commande', 'planning', 'menu', 'hygien',
            'allergen', 'allergi', 'ingred', 'recette', 'categori', 'fournisseur',
            'achat', 'magasin', 'cuisine', 'caissier', 'vente', 'pdv', 'livraison',
            'rapport', 'aeroserve', 'approvisionnement', 'inventaire', 'lot', 'fifo',
            'utilisateur', 'role', 'shift', 'horaire', 'validation', 'approbation',
            'commercial', 'matiere', 'notif', 'seuil', 'alerte', 'food',
            // Arabic
            'منتج', 'مخزن', 'طلب', 'تخطيط', 'قائمة', 'نظافة', 'حساسية', 'مكونات',
            'وصفة', 'فئة', 'مورد', 'شراء', 'مطبخ', 'صندوق', 'مستخدم', 'مناوبة',
            'مخزون', 'تقرير', 'فاتورة', 'اعتماد', 'تطبيق', 'نظام',
        ];

        $greetingBlacklist = [
            'bonjour', 'salut', 'bonsoir', 'coucou', 'bonne journee',
            'hello', 'hi,', ',hi', ' hi ', 'hey', 'good morning', 'good evening',
            'how are you', "what's up", 'whats up',
            'comment vas', 'comment allez', 'ca va', 'comment tu', 'tu vas bien',
            'quel temps', 'meteo', 'météo', 'blague', 'joke', 'raconte',
            'مرحبا', 'أهلا', 'صباح', 'مساء', 'كيف حالك', 'كيفك', 'السلام',
        ];

        // If greeting AND no project keyword → off-topic
        foreach ($greetingBlacklist as $greeting) {
            if (str_contains($msgLower, $greeting)) {
                foreach ($projectKeywords as $kw) {
                    if (str_contains($msgLower, $kw)) {
                        return true; // greeting with AeroServe context → allow
                    }
                }
                return false; // pure greeting → reject
            }
        }

        // At least one project keyword → on-topic
        foreach ($projectKeywords as $kw) {
            if (str_contains($msgLower, $kw)) {
                return true;
            }
        }

        // Short messages with no keyword: allow if long enough to be a real question
        return mb_strlen(trim($message)) > 20;
    }

    /**
     * Fallback general response engine for general chatbot questions if all APIs are unavailable.
     */
    private function getLocalGeneralResponse(string $message, string $userRole): string
    {
        $messageLower = mb_strtolower($message);

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

        return "AeroServe Assistant : Bonjour ! Je suis votre copilote operationnel. Je peux vous aider a comprendre l'utilisation des commandes, le suivi des stocks, la validation des produits et la planification des plannings pour votre compte. Que desirez-vous savoir aujourd'hui ?";
    }

    /**
     * Helper to retrieve textual user context summary for dynamic system prompt inject.
     */
    private function getUserContextText(User $user): string
    {
        $context  = "=== CONTEXTE DE L'UTILISATEUR CONNECTE ===\n";
        $context .= "ID: {$user->id}\n";
        $context .= "Nom complet: {$user->first_name} {$user->last_name}\n";
        $context .= "Email: {$user->email}\n";
        $context .= "Role: " . ($user->role?->name ?? 'Aucun') . "\n";

        if ($user->pointDeVente) {
            $context .= "Point de vente assigne: {$user->pointDeVente->name} (ID: {$user->pointDeVente->id}, Type: {$user->pointDeVente->type}, Ville: {$user->pointDeVente->location})\n";
        } else {
            $context .= "Point de vente assigne: Aucun point de vente specifique.\n";
        }

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
                    $pdvName  = $p->pointDeVente ? $p->pointDeVente->name : 'N/A';
                    $context .= "- Le {$dateStr} : Shift {$p->start_time} - {$p->end_time} a {$pdvName} (Statut: {$p->day_status})\n";
                }
            }
        } else {
            $context .= "\nAucun planning ou shift de travail enregistre.\n";
        }

        $orders = \App\Models\InternalOrder::with('pointDeVente')
            ->where('created_by', $user->id)
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        if ($orders->isNotEmpty()) {
            $context .= "\nCommandes Internes creees par l'utilisateur :\n";
            foreach ($orders as $o) {
                $pdvName  = $o->pointDeVente ? $o->pointDeVente->name : 'General';
                $context .= "- Commande #{$o->id} (Type: {$o->type}, Statut: {$o->status}, PDV: {$pdvName}, Date de livraison: {$o->delivery_date})\n";
            }
        } else {
            $context .= "\nAucune commande interne creee par cet utilisateur.\n";
        }

        return $context;
    }
}
