# IA Wikigouv

## Principes

- L’IA n’est pas source normative autonome.
- Réponses assistant: documents VALIDATED uniquement.
- Citer les sources utilisées.
- Si base insuffisante: répondre explicitement “information indisponible”.

## Architecture cible

- `LLMProvider` abstrait:
  - OpenAI / Azure OpenAI / Mistral / Anthropic / Ollama
- `VectorStoreProvider` abstrait:
  - pgvector ou Qdrant
- Pipeline RAG:
  - upload -> extraction -> chunk -> embedding -> index -> retrieval -> answer

## Modules IA

1. Assistant réglementaire (chat)
2. Générateur de quiz (brouillon + validation humaine)
3. Simulateur de cas (score + feedback + références)

## Sécurité IA

- Rate limiting endpoints IA
- Logs d’usage IA
- Trace prompts/réponses en mode audit interne (sans données sensibles non nécessaires)
