## ADDED Requirements

### Requirement: Paper topic search
The system SHALL provide a query endpoint that returns relevant research papers for a given topic string. Results MUST be ranked by semantic similarity using the FAISS vector index.

#### Scenario: Query for phosphorus papers
- **WHEN** client requests `GET /api/papers?topic=phosphorus+peak+supply&limit=3`
- **THEN** response contains the 3 most semantically relevant papers with DOI links, titles, and abstracts

### Requirement: Paper metadata format
Each paper result SHALL include: title, authors (if available), DOI link, abstract or summary, publication year, and relevance score.

#### Scenario: Paper response shape
- **WHEN** a paper is returned from the search endpoint
- **THEN** it includes `{ title, authors, doi, abstract, year, relevanceScore }`

### Requirement: Arc-linked paper presets
Each arc template configuration SHALL include a curated list of DOI links for papers directly relevant to that arc. These MUST be returnable without a vector search query.

#### Scenario: Fetch papers for an arc
- **WHEN** client requests `GET /api/papers?arc=energy-grid`
- **THEN** response contains the curated paper list for that arc (no vector search needed)

### Requirement: Corpus from existing repository
The initial paper corpus SHALL be ported from github.com/lizTheDeveloper/ai_game_theory_simulation research directory. Existing FAISS embeddings (384-dim) SHALL be reused without re-embedding.

#### Scenario: Initial corpus load
- **WHEN** the system starts with no local corpus
- **THEN** it loads paper metadata and FAISS index from the ported data files

### Requirement: Corpus extensibility
New papers MUST be addable to the corpus by providing metadata + embedding vector. The system SHALL support incremental index updates without full re-indexing.

#### Scenario: Adding a new paper
- **WHEN** a new paper is added with title, DOI, abstract, and pre-computed embedding
- **THEN** the FAISS index is updated to include it and subsequent queries can find it
