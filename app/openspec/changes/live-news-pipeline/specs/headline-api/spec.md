## ADDED Requirements

### Requirement: Headline listing endpoint
The system SHALL expose a REST endpoint that returns processed headlines. Clients MUST be able to filter by arc, severity, locality, and recency.

#### Scenario: Fetch recent energy headlines
- **WHEN** client requests `GET /api/headlines?arc=energy-grid&severity=2&limit=5`
- **THEN** response contains up to 5 headlines tagged energy-grid with severity >= 2, ordered by recency

#### Scenario: Fetch all recent headlines
- **WHEN** client requests `GET /api/headlines?since=2026-05-04T00:00Z`
- **THEN** response contains all processed headlines from that timestamp forward

### Requirement: Headline response format
Each headline in the API response SHALL include: id, source feed, date, headline text, source URL, arc tags, severity, locality, and classification confidence.

#### Scenario: Response shape
- **WHEN** a headline is returned from the API
- **THEN** it includes `{ id, source, date, headline, url, arcs, severity, locality, confidence, classified }`

### Requirement: Arc state endpoint
The system SHALL expose an endpoint returning current arc states for all configured arcs.

#### Scenario: Fetch arc states
- **WHEN** client requests `GET /api/arc-state`
- **THEN** response contains all arc IDs with their current stage, weekly hits, and escalation progress

### Requirement: CDN-friendly caching
API responses SHALL include appropriate cache headers. Headline listings MUST be cacheable for at least 15 minutes. Arc state MUST be cacheable for at least 5 minutes.

#### Scenario: Repeated requests within cache window
- **WHEN** two clients request the same headline listing within 15 minutes
- **THEN** the second request is served from CDN cache without hitting the origin server

### Requirement: Health check endpoint
The system SHALL expose a health endpoint reporting per-source fetch status, last successful fetch time, and LLM classification status.

#### Scenario: Monitoring check
- **WHEN** ops requests `GET /api/health/pipeline`
- **THEN** response includes per-source last fetch time, success/failure status, and count of unclassified headlines pending
