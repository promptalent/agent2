export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

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
2. Contexte détaillé avec variables entre [CROCHETS] à personnaliser
3. La demande précise avec contraintes de format
4. Contraintes négatives — ce que l'IA NE doit PAS faire
5. Format de sortie imposé — longueur, structure, style

Réponds UNIQUEMENT en JSON valide sans aucun texte avant ou après :
{
  "prompt": "le prompt complet avec les variables entre [CROCHETS]",
  "ia_recommandee": "nom de l'IA recommandée et explication en 1-2 phrases",
  "astuce": "une astuce terrain concrète pour aller plus loin"
}`;

  const iaLabel = ia === 'recommandee'
    ? 'Choisis la meilleure IA pour cette situation et explique pourquoi dans ia_recommandee'
    : ia;

  const userMessage = `Métier : ${metier}
IA : ${iaLabel}
Situation : ${situation}${contexte ? '\nContexte : ' + contexte : ''}

Génère un prompt PrompTalent parfait.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }]
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Erreur API Anthropic');

    const text = data.content[0].text.trim();
    const result = JSON.parse(text.replace(/```json|```/g, '').trim());

    return res.status(200).json(result);

  } catch (err) {
    console.error('Erreur:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
