<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

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
            'product_id' => 'required|exists:products,id',
            'message' => 'required|string|max:1000',
        ]);

        $productId = $request->input('product_id');
        $message = $request->input('message');

        // Fetch the food product
        $product = Product::with('stock')->find($productId);

        if (!$product) {
            return response()->json([
                'success' => false,
                'message' => 'Produit non trouvé.'
            ], 404);
        }

        // We only allow querying food or commercial products that have ingredients/composition details
        $ingredients = $product->description ?? 'Aucun ingrédient spécifié.';
        
        // Prepare product context for the prompt
        $productContext = "Produit: {$product->name}\n" .
                          "Type: {$product->type}\n" .
                          "Description/Ingrédients: {$ingredients}\n" .
                          "Prix: {$product->price} TND\n";

        if ($product->expiration_date) {
            $productContext .= "Date d'expiration: {$product->expiration_date}\n";
        }

        $groqKey = env('GROQ_API_KEY');
        $geminiKey = env('GEMINI_API_KEY');

        // 1. Try Groq AI (Llama 3)
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
                            'content' => "Tu es le chatbot IA assistant de nutrition et d'allergies de l'application de restauration AeroServe.\n" .
                                         "Voici les détails du produit alimentaire actuel :\n" .
                                         "{$productContext}\n\n" .
                                         "Réponds à la question de l'utilisateur de manière concise, chaleureuse et professionnelle. " .
                                         "Réponds dans la même langue que la question de l'utilisateur (généralement en français ou arabe/tunisien).\n" .
                                         "Si la question concerne les allergènes ou les ingrédients, sois très précis et vigilant pour la sécurité de l'utilisateur."
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

        // 2. Try Gemini AI
        if ($geminiKey && $geminiKey !== 'null' && !empty($geminiKey)) {
            try {
                // Call Gemini API
                $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={$geminiKey}";

                $response = Http::withHeaders([
                    'Content-Type' => 'application/json',
                ])->post($url, [
                    'contents' => [
                        [
                            'role' => 'user',
                            'parts' => [
                                [
                                    'text' => "Tu es le chatbot IA assistant de nutrition et d'allergies de l'application de restauration AeroServe.\n" .
                                              "Voici les détails du produit alimentaire actuel :\n" .
                                              "{$productContext}\n\n" .
                                              "Réponds à la question suivante de l'utilisateur de manière concise, chaleureuse et professionnelle. " .
                                              "Utilise la langue française par défaut ou la langue dans laquelle la question est posée.\n" .
                                              "Si la question concerne les allergènes ou les ingrédients, sois très précis et vigilant pour la sécurité de l'utilisateur.\n\n" .
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
        $localResponse = $this->getLocalNlpResponse($product, $message);

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

        // 1. Check for allergens
        if (str_contains($messageLower, 'allerg') || str_contains($messageLower, 'sensibl') || str_contains($messageLower, 'sensibilité') || str_contains($messageLower, 'regime') || str_contains($messageLower, 'régime')) {
            $foundAllergens = [];
            
            $commonAllergens = [
                'gluten' => ['gluten', 'farine', 'blé', 'pain', 'pâte', 'seigle', 'orge'],
                'lactose' => ['lait', 'lactose', 'fromage', 'crème', 'beurre', 'yaourt'],
                'arachide' => ['cacahuète', 'arachide', 'cacahuetes', 'peanuts'],
                'fruits à coque' => ['amande', 'noisette', 'noix', 'pistache', 'cajou'],
                'œuf' => ['œuf', 'oeuf', 'œufs', 'oeufs', 'mayonnaise'],
                'poisson' => ['poisson', 'thon', 'saumon', 'sardine', 'crevette', 'crabe', 'fruits de mer'],
                'soja' => ['soja', 'soy'],
            ];

            foreach ($commonAllergens as $allergen => $keywords) {
                foreach ($keywords as $kw) {
                    if (str_contains($ingredientsLower, $kw) || str_contains(mb_strtolower($product->name), $kw)) {
                        $foundAllergens[] = $allergen;
                        break;
                    }
                }
            }

            if (count($foundAllergens) > 0) {
                return "⚠️ **Alerte Allergènes :** D'après la composition de \"{$product->name}\", ce produit contient ou peut contenir des traces de : **" . implode(', ', $foundAllergens) . "**. S'il vous plaît, restez vigilant si vous avez des allergies connues à ces ingrédients.";
            } else {
                return "✅ Aucun allergène courant majeur (comme le gluten, le lactose ou les arachides) n'a été détecté dans les ingrédients enregistrés pour \"{$product->name}\". Ingrédients listés : _{$ingredients}_.";
            }
        }

        // 2. Check for gluten specifically
        if (str_contains($messageLower, 'gluten') || str_contains($messageLower, 'coeliaque') || str_contains($messageLower, 'cœliaque')) {
            $glutenKeywords = ['farine', 'blé', 'pain', 'pâte', 'seigle', 'orge', 'gluten'];
            $hasGluten = false;
            foreach ($glutenKeywords as $kw) {
                if (str_contains($ingredientsLower, $kw) || str_contains(mb_strtolower($product->name), $kw)) {
                    $hasGluten = true;
                    break;
                }
            }
            if ($hasGluten) {
                return "⚠️ Le produit \"{$product->name}\" **CONTIENT du gluten** (présence détectée de blé/farine/pain/pâte). Il n'est pas recommandé pour les personnes cœliaques ou intolérantes au gluten.";
            } else {
                return "🌾 D'après la fiche technique de \"{$product->name}\", aucun ingrédient contenant du gluten n'a été détecté. Il semble être **sans gluten**.";
            }
        }

        // 3. Check for lactose / dairy specifically
        if (str_contains($messageLower, 'lait') || str_contains($messageLower, 'lactose') || str_contains($messageLower, 'dairy') || str_contains($messageLower, 'fromage')) {
            $lactoseKeywords = ['lait', 'lactose', 'fromage', 'crème', 'beurre', 'yaourt', 'mozzarella'];
            $hasLactose = false;
            foreach ($lactoseKeywords as $kw) {
                if (str_contains($ingredientsLower, $kw) || str_contains(mb_strtolower($product->name), $kw)) {
                    $hasLactose = true;
                    break;
                }
            }
            if ($hasLactose) {
                return "🥛 Le produit \"{$product->name}\" **CONTIENT du lactose / des produits laitiers** (lait, fromage ou crème détecté). Attention si vous êtes intolérant au lactose.";
            } else {
                return "🌱 D'après la composition de \"{$product->name}\", il ne contient aucun produit laitier ou lactose connu. Il convient aux personnes intolérantes ou végétaliennes.";
            }
        }

        // 4. Check for ingredients/composition
        if (str_contains($messageLower, 'ingred') || str_contains($messageLower, 'ingréd') || str_contains($messageLower, 'compos') || str_contains($messageLower, 'fait de') || str_contains($messageLower, 'contient quoi')) {
            if (empty($ingredients) || $ingredients === 'Aucun ingrédient spécifié.') {
                return "🍲 Le produit \"{$product->name}\" ne dispose pas d'une liste détaillée d'ingrédients enregistrée dans la base de données pour le moment. Son prix est de {$product->price} TND.";
            }
            return "🍲 **Composition de \"{$product->name}\" :** Les ingrédients enregistrés sont : **{$ingredients}**. N'hésitez pas à me poser des questions sur un ingrédient en particulier !";
        }

        // 5. Check for calories/nutrition
        if (str_contains($messageLower, 'calor') || str_contains($messageLower, 'nutrit') || str_contains($messageLower, 'kcal') || str_contains($messageLower, 'sucre') || str_contains($messageLower, 'sel') || str_contains($messageLower, 'gras')) {
            return "📊 **Informations nutritionnelles pour \"{$product->name}\" :** La fiche nutritionnelle standard indique qu'il s'agit d'un produit de type **{$product->type}**. Ingrédients constitutifs : _{$ingredients}_. (Pour des détails précis en calories, veuillez consulter la fiche d'emballage du fabricant).";
        }

        // 6. Generic response listing product details
        return "🤖 Bonjour ! Je suis l'assistant nutritionnel d'AeroServe. " .
               "Je peux vous renseigner sur la composition, les allergènes et les ingrédients de **{$product->name}**.\n\n" .
               "• **Ingrédients :** {$ingredients}\n" .
               "• **Catégorie :** " . ($product->category?->name ?? 'Général') . "\n" .
               "• **Prix :** {$product->price} TND\n\n" .
               "Posez-moi une question sur la présence d'un ingrédient spécifique comme le *gluten*, le *lactose* ou les *arachides* !";
    }
}
