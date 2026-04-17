module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { metier, situation, contexte, ia } = req.body;
  if (!metier || !situation) {
    return res.status(400).json({ error: 'Métier et situation requis' });
  }

  const systemPrompt = `Tu es l'agent PrompTalent, expert en prompt engineering pour les professionnels.

Transforme la situation décrite en un prompt IA parfait avec cette structure obligatoire :
1. Rôle précis donné à l'IA adapté au métier
2. Contexte détaillé — IMPORTANT : si un contexte supplémentaire est fourni, intègre-le directement dans le prompt comme information fixe, sans en faire une variable entre crochets. Les variables entre crochets ne doivent concerner que les informations manquantes.
3. La demande précise avec contraintes de format
4. Contraintes négatives — ce que l'IA NE doit PAS faire
5. Format de sortie imposé — longueur, structure, style

Réponds UNIQUEMENT en JSON valide sans aucun texte avant ou après :
{
  "prompt": "le prompt complet — les informations du contexte supplémentaire sont intégrées directement, seules les infos manquantes sont entre [CROCHETS]",
  "ia_recommandee": "commence par le nom exact de l'IA recommandée (Claude, ChatGPT, Perplexity, Copilot ou Gemini), puis explique pourquoi en 1-2 phrases",
  "astuce": "une astuce terrain concrète pour aller plus loin"
}`;

  const iaLabel = ia === 'recommandee'
    ? 'Choisis la meilleure IA parmi Claude, ChatGPT, Perplexity, Copilot ou Gemini et commence ta réponse ia_recommandee par son nom exact'
    : ia;

  const userMessage = `Métier : ${metier}
IA : ${iaLabel}
Situation : ${situation}${contexte ? '\nContexte supplémentaire (à intégrer directement dans le prompt, pas en crochets) : ' + contexte : ''}

Génère un prompt PrompTalent parfait.`;

  try {
    const https = require('https');
    const postData = JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
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
