# Documentation — Workflow `n8n/workflows/niu-card-ocr-agent-ollama.json`

## 1) Objectif
Ce workflow n8n sert à:
- recevoir une image de document (ex: carte NIU/CNI/passeport),
- extraire les informations lisibles via OCR + LLM vision (Ollama),
- classifier le type de document,
- renvoyer un JSON propre et stable.

## 2) Endpoint exposé
- Méthode: `POST`
- URL: `/webhook/cardreader`
- Exemple local: `http://192.168.12.75:5678/webhook/cardreader`

## 3) Entrées attendues (multipart/form-data)
- `binary_input` (obligatoire): fichier image/PDF à analyser
- `output` (optionnel mais recommandé): schéma JSON attendu
- `prompt` (optionnel): instruction utilisateur additionnelle

### Exemple `output` valide
```json
{
  "first_name": "",
  "last_name": "",
  "date_of_birth": "",
  "document_number": "",
  "document_type": "id_card",
  "expiry_date": ""
}
```

## 4) Exemple d’appel
### cURL (bash)
```bash
curl --location 'http://192.168.12.75:5678/webhook/cardreader' \
--form 'binary_input=@"/E:/PROJET/INTERNE/FRANCOIS/GOUVGPT/wikigouv/micleaneous/test-card-ocr/NIU LEPRINCE.jpeg"' \
--form 'output={"first_name":"","last_name":"","date_of_birth":"","document_number":"","document_type":"id_card","expiry_date":""}' \
--form 'prompt=Extrais les informations de cette carte selon le schema fourni.'
```

### PowerShell
```powershell
curl.exe --location "http://192.168.12.75:5678/webhook/cardreader" `
  --form "binary_input=@E:/PROJET/INTERNE/FRANCOIS/GOUVGPT/wikigouv/micleaneous/test-card-ocr/NIU LEPRINCE.jpeg" `
  --form "output={\"first_name\":\"\",\"last_name\":\"\",\"date_of_birth\":\"\",\"document_number\":\"\",\"document_type\":\"id_card\",\"expiry_date\":\"\"}" `
  --form "prompt=Extrais les informations de cette carte selon le schema fourni."
```

## 5) Sortie API
### Succès
```json
{
  "status": true,
  "output": {
    "first_name": "LEPRINCE",
    "last_name": "MABIALA",
    "date_of_birth": "1991-05-16",
    "document_number": "123456789",
    "document_type": "niu",
    "expiry_date": "contenu illisible"
  }
}
```

### Échec
```json
{
  "status": false,
  "message": "temps depassee, probablement le fichier est trop volumineux ou illisible"
}
```

## 6) Logique interne (résumé des nœuds)
1. **Webhook**: reçoit le payload binaire.
2. **Prepare Input**:
   - lit `output` comme schéma attendu,
   - applique un schéma par défaut si absent/invalide,
   - prépare `schemaString` injecté dans le prompt.
3. **AI Agent** + **Ollama Chat Model (`qwen2.5vl:7b`)**:
   - extraction OCR + classification,
   - réponse attendue en JSON.
4. **clean_output**: enlève balises markdown éventuelles.
5. **Validate Output JSON**:
   - parse JSON,
   - garantit toutes les clés,
   - met `contenu illisible` sur les champs manquants,
   - force `document_type = other` si absent.
6. **Respond to Webhook1**: renvoie la réponse finale.
7. **Respond to Webhook**: fallback en cas d’erreur.

## 7) Types `document_type` recommandés
- `id_card`
- `passport`
- `niu`
- `driving_license`
- `residence_card`
- `student_card`
- `bank_card`
- `vehicle_registration`
- `other`

## 8) Bonnes pratiques
- Envoyer des images nettes (bien cadrées, contraste suffisant).
- Limiter la taille des fichiers pour éviter timeout.
- Toujours envoyer un `output` JSON valide pour figer la structure.
- Ne pas envoyer de “set” invalide du type `{"a","b","c"}`.

## 9) Dépannage rapide
- **`status: false`**: fichier trop lourd, illisible, ou timeout modèle.
- **JSON incomplet**: vérifier que `output` est un vrai objet JSON.
- **Mauvaise classification**: préciser un `prompt` plus directif.
- **Pas de réponse**: vérifier disponibilité n8n et serveur Ollama (credentials `Server 12.75`).

## 10) Sécurité / exploitation
- CORS du webhook restreint à:
  - `https://wikigouv.com`
  - `https://n8n.fintrax.org`
  - `http://localhost:3000`
- Éviter d’exposer ce webhook publiquement sans reverse proxy, limitation de débit, et authentification amont.
