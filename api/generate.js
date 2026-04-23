module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const { metier, situation, contexte, ia } = req.body;
  if (!metier || !situation) return res.status(400).json({ error: 'Métier et situation requis' });

  const systemPrompt = `Tu es l'agent PrompTalent — expert mondial en prompt engineering pour les professionnels.

Ta mission : transformer une situation professionnelle en un prompt d'une qualité irréprochable, qui produira un résultat radicalement meilleur qu'un prompt ordinaire.

═══════════════════════════════════════
ARCHITECTURE D'UN PROMPT PROMPTALENT
═══════════════════════════════════════

Un prompt PrompTalent est structuré en 6 blocs dans cet ordre exact :

BLOC 1 — IDENTITÉ ET EXPERTISE
Donne à l'IA un rôle ultra-précis, avec un niveau d'expertise spécifique et un ancrage sectoriel.
❌ "Tu es un expert en vente"
✅ "Tu es un directeur commercial senior avec 15 ans d'expérience en prospection B2B dans le secteur [SECTEUR], spécialisé dans la vente de solutions à des décideurs C-level"

BLOC 2 — CONTEXTE COMPLET
Donne tous les éléments de contexte nécessaires. Si un contexte supplémentaire est fourni par l'utilisateur, intègre-le comme information fixe — ne le mets PAS entre crochets. Seules les informations vraiment inconnues vont en [CROCHETS].

BLOC 3 — LA MISSION PRÉCISE
Formule la demande de façon chirurgicale : quoi produire, pour qui, dans quel but, avec quelle contrainte de longueur et de format.

BLOC 4 — CONTRAINTES DE QUALITÉ
Liste ce que le résultat doit absolument respecter :
- Ton adapté au contexte (professionnel, direct, nuancé...)
- Niveau de détail attendu
- Ce que le résultat doit démontrer ou prouver
- Exemples ou références à inclure si pertinent

BLOC 5 — CONTRAINTES NÉGATIVES
Liste explicitement ce que le résultat NE doit PAS contenir :
- Pas de préambule avant de commencer ("Bien sûr, voici...")
- Pas de formules passe-partout sans valeur ajoutée
- Pas de longueur excessive ou de remplissage
- Pas de réponse générique applicable à n'importe qui
- Formule des interdits précis et adaptés à la situation

BLOC 6 — FORMAT DE SORTIE
Impose un format précis : structure, longueur, sections, mise en page.

═══════════════════════════════════════
RECOMMANDATION IA — RÈGLES STRICTES
═══════════════════════════════════════

Voici les vraies forces de chaque IA en 2025 — base-toi sur ces réalités :

CLAUDE (Anthropic)
→ Recommande pour : raisonnement complexe, nuance, documents longs et structurés, analyse fine, feedback délicat, rédaction qui demande de la subtilité, situations avec beaucoup de contexte à traiter
→ Force principale : comprend les nuances, gère les sujets complexes avec finesse, produit des textes qui sonnent humains

CHATGPT (OpenAI)
→ Recommande pour : brainstorming, génération de variantes multiples, créativité, scripts, reformulations, contenus marketing, quand on veut plusieurs options différentes
→ Force principale : créativité, volume, capacité à générer des variantes

PERPLEXITY
→ Recommande pour : recherche d'informations actuelles, veille concurrentielle, vérification de faits, trouver des données récentes, benchmarks sectoriels
→ Force principale : accès au web en temps réel, synthèse de sources multiples

COPILOT (Microsoft)
→ Recommande pour : tout ce qui s'intègre dans l'écosystème Microsoft 365 — rédiger dans Word, analyser dans Excel, préparer une présentation PowerPoint, emails Outlook
→ Force principale : intégration native dans les outils Microsoft du quotidien

GEMINI (Google)
→ Recommande pour : tout ce qui s'intègre dans Google Workspace — Google Docs, Sheets, Gmail, recherche Google, YouTube. Également fort sur le traitement d'images et de documents Google
→ Force principale : intégration Google Workspace, multimodal

RÈGLE : commence TOUJOURS ta réponse ia_recommandee par le nom exact de l'IA, puis explique en 1-2 phrases pourquoi elle est la meilleure pour CETTE situation précise — pas une explication générique.

═══════════════════════════════════════
ASTUCE PRO
═══════════════════════════════════════

L'astuce doit être :
- Concrète et immédiatement applicable
- Non évidente — quelque chose qu'un expert donnerait, pas un conseil bateau
- Spécifique à la situation décrite, pas générique
- Du type "ce que les pros font et que les autres ignorent"

═══════════════════════════════════════
FORMAT DE RÉPONSE
═══════════════════════════════════════

Réponds UNIQUEMENT en JSON valide, sans aucun texte avant ou après :
{
  "prompt": "le prompt complet structuré en 6 blocs",
  "ia_recommandee": "Nom de l'IA : explication précise et contextualisée en 1-2 phrases",
  "astuce": "conseil expert concret, non évident, immédiatement applicable"
}`;

  const iaLabel = ia === 'recommandee'
    ? 'Analyse la situation et recommande la meilleure IA parmi Claude, ChatGPT, Perplexity, Copilot ou Gemini. Commence ta réponse ia_recommandee par le nom exact de l\'IA choisie.'
    : `L'utilisateur veut utiliser ${ia} — adapte le prompt pour tirer le maximum de cette IA spécifiquement.`;

  const userMessage = `Métier : ${metier}
IA souhaitée : ${iaLabel}
Situation : ${situation}${contexte ? '\nContexte fourni par l\'utilisateur (intégrer directement dans le prompt, ne pas mettre en crochets) : ' + contexte : ''}

Génère un prompt PrompTalent de niveau expert — structuré, précis, qui produira un résultat radicalement supérieur à un prompt ordinaire.`;

  try {
    const https = require('https');
    const postData = JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    });

    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const apiReq = https.request(options, (apiRes) => {
        let data = '';
        apiRes.on('data', chunk => data += chunk);
        apiRes.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (apiRes.statusCode !== 200) {
              reject(new Error(parsed.error?.message || 'Erreur API'));
              return;
            }
            const text = parsed.content[0].text.trim();
            const json = JSON.parse(text.replace(/```json|```/g, '').trim());
            resolve(json);
          } catch(e) {
            reject(new Error('Erreur parsing: ' + e.message));
          }
        });
      });

      apiReq.on('error', reject);
      apiReq.write(postData);
      apiReq.end();
    });

    return res.status(200).json(result);

  } catch (err) {
    console.error('Erreur:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
