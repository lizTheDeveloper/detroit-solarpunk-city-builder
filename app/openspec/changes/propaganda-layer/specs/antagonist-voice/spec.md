## ADDED Requirements

### Requirement: Voice profile configuration
Each antagonist faction SHALL have a configurable voice profile that guides LLM frame generation. Voice profiles MUST include: tone description, key phrases, real-world references, example language, genuine argument, and dependents.

#### Scenario: Voice profile loaded
- **WHEN** the frame generation batch processes a headline tagged to energy-grid arc
- **THEN** it loads DTE Energy's voice profile and includes it in the generation prompt

### Requirement: Genuine antagonist arguments
Voice profiles MUST articulate the antagonist's genuine argument — why rational people support them. Arguments SHALL reference real stakeholders (employees, ratepayers, pension funds) who depend on the antagonist's continued operation.

#### Scenario: DTE voice profile content
- **WHEN** DTE Energy's voice profile is loaded
- **THEN** it contains their genuine argument (grid reliability, union jobs, aging infrastructure), their dependents (11,000 employees, 2.2M ratepayers), and characteristic language patterns

### Requirement: Voice profiles grounded in real language
Voice profiles SHALL be derived from real public statements, press releases, SEC filings, and public testimony. Key phrases MUST be actual phrases used by the real institution, not invented.

#### Scenario: Verifiable language
- **WHEN** a voice profile lists key phrases
- **THEN** those phrases appear in real public documents from that institution (PSC filings, earnings calls, press releases)

### Requirement: Multiple antagonists per arc
An arc MAY have multiple antagonist voice profiles. Frame generation SHALL use the primary antagonist for the establishment frame and may blend secondary antagonist language when relevant.

#### Scenario: Arc with two antagonists
- **WHEN** water-pfas arc has both "DWSD" and "3M Corporation" as antagonists
- **THEN** frame generation can produce establishment frames from either perspective depending on headline content

### Requirement: Voice profile extensibility
New voice profiles MUST be addable by editing arc template configuration. No code changes to the frame generation system SHALL be required.

#### Scenario: Adding new antagonist
- **WHEN** a new antagonist "Marathon Petroleum" is added to infrastructure-debt arc config
- **THEN** frame generation uses their voice profile for relevant headlines without code changes
